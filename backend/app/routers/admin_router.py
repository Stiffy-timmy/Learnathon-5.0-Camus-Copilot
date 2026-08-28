import os
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Response, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.auth import get_admin_user, get_current_user, send_broadcast_announcement_email
from app.database import (
    get_escalations, save_escalations,
    get_announcements, save_announcements,
    get_notifications, save_notifications,
    get_teams, save_teams, get_users, save_users,
    get_timer_state, save_timer_state, DATA_DIR,
    check_and_disqualify_unsubmitted_teams,
    delete_user_cascade, batch_delete_users_cascade
)
from app.rag_engine import (
    extract_quick_reference_from_handbook, extract_tracks_from_handbook,
    load_live_handbook_docs, extract_event_schedule_from_handbook
)
from app.db_session import get_db_status
from app.migration import migrate_json_to_db
from app.export_service import generate_excel_export, generate_pdf_export

router = APIRouter(prefix="", tags=["Admin Operations & Announcements"])

HANDBOOK_FILE_BACKEND = os.path.join(DATA_DIR, "hackathon_handbook.txt")
HANDBOOK_FILE_ROOT = os.path.join(os.path.dirname(os.path.dirname(DATA_DIR)), "hackathon_handbook.txt")
ATTACHMENTS_DIR = os.path.join(DATA_DIR, "attachments")
os.makedirs(ATTACHMENTS_DIR, exist_ok=True)

class ResolveEscalationRequest(BaseModel):
    response: str
    broadcastToAll: Optional[bool] = True

class RejectEscalationRequest(BaseModel):
    reason: Optional[str] = "Question rejected by event organizers (duplicate or out of scope)."

class BatchDeleteRequest(BaseModel):
    escalationIds: List[str]

class BatchDeleteUsersRequest(BaseModel):
    userIds: List[str]

class BroadcastAnnouncementRequest(BaseModel):
    title: str
    message: str
    severity: str = "info"  # "info", "warning", "critical"

class UpdateTeamStatusRequest(BaseModel):
    status: str  # "not_submitted", "submitted", "disqualified"

class UpdateHandbookRequest(BaseModel):
    content: str

class UpdateTimerRequest(BaseModel):
    action: Optional[str] = None  # "start", "pause", "reset", "sync_handbook", "extend", "custom"
    durationHours: Optional[float] = None
    endTime: Optional[str] = None
    title: Optional[str] = None
    extendMinutes: Optional[int] = None

def _compute_timer_payload(timer_state: dict) -> dict:
    now = datetime.now(timezone.utc)
    status = timer_state.get("status", "idle")
    total_seconds = float(timer_state.get("totalSeconds", timer_state.get("durationHours", 48.0) * 3600))
    remaining_seconds = float(timer_state.get("remainingSeconds", total_seconds))
    end_time_str = timer_state.get("endTime")

    if status == "running" and end_time_str:
        try:
            end_time = datetime.fromisoformat(end_time_str.replace("Z", "+00:00"))
            diff = (end_time - now).total_seconds()
            if diff <= 0:
                remaining_seconds = 0.0
                status = "ended"
                timer_state["status"] = "ended"
                timer_state["remainingSeconds"] = 0.0
                save_timer_state(timer_state)
                check_and_disqualify_unsubmitted_teams()
            else:
                remaining_seconds = diff
        except Exception as e:
            print(f"Error parsing endTime {end_time_str}: {e}")

    if status == "ended":
        remaining_seconds = 0.0
        check_and_disqualify_unsubmitted_teams()

    total_sec_int = int(max(0, remaining_seconds))
    days = total_sec_int // 86400
    hours = (total_sec_int % 86400) // 3600
    minutes = (total_sec_int % 3600) // 60
    seconds = total_sec_int % 60

    if days > 0:
        formatted = f"{days}d : {hours:02d}h : {minutes:02d}m : {seconds:02d}s"
    else:
        formatted = f"{hours:02d}h : {minutes:02d}m : {seconds:02d}s"

    handbook_sched = extract_event_schedule_from_handbook()

    return {
        "status": status,
        "title": timer_state.get("title", "Hacking Submission Closes"),
        "durationHours": float(timer_state.get("durationHours", 48.0)),
        "durationText": timer_state.get("durationText", "48 Hours"),
        "startTime": timer_state.get("startTime"),
        "endTime": timer_state.get("endTime"),
        "serverTime": now.isoformat(),
        "remainingSeconds": remaining_seconds,
        "totalSeconds": total_seconds,
        "formattedRemaining": formatted,
        "days": days,
        "hours": hours,
        "minutes": minutes,
        "seconds": seconds,
        "handbookSchedule": handbook_sched,
        "handbookRef": timer_state.get("handbookRef", handbook_sched.get("handbookRef")),
        "updatedBy": timer_state.get("updatedBy", "System"),
        "lastUpdated": timer_state.get("lastUpdated")
    }

# Public / Participant Polling Endpoint for Synchronized Live Hackathon Timer
@router.get("/api/timer")
def get_live_timer():
    timer_state = get_timer_state()
    return _compute_timer_payload(timer_state)

@router.post("/api/admin/timer/start")
def start_live_timer(admin: dict = Depends(get_admin_user)):
    timer_state = get_timer_state()
    now = datetime.now(timezone.utc)
    status = timer_state.get("status", "idle")
    
    if status == "paused":
        rem = float(timer_state.get("remainingSeconds", timer_state.get("durationHours", 48.0) * 3600))
        end_time = now + timedelta(seconds=rem)
        timer_state["status"] = "running"
        timer_state["endTime"] = end_time.isoformat()
        timer_state["pausedAt"] = None
    else:
        dur_hrs = float(timer_state.get("durationHours", 48.0))
        end_time = now + timedelta(hours=dur_hrs)
        timer_state["status"] = "running"
        timer_state["startTime"] = now.isoformat()
        timer_state["endTime"] = end_time.isoformat()
        timer_state["totalSeconds"] = dur_hrs * 3600
        timer_state["remainingSeconds"] = dur_hrs * 3600
        timer_state["pausedAt"] = None
        
    timer_state["lastUpdated"] = now.isoformat()
    timer_state["updatedBy"] = admin.get("email")
    save_timer_state(timer_state)
    return {"message": "Hackathon timer started and synced across all participant views!", "timer": _compute_timer_payload(timer_state)}

@router.post("/api/admin/timer/pause")
def pause_live_timer(admin: dict = Depends(get_admin_user)):
    timer_state = get_timer_state()
    now = datetime.now(timezone.utc)
    
    if timer_state.get("status") == "running" and timer_state.get("endTime"):
        try:
            end_time = datetime.fromisoformat(timer_state["endTime"].replace("Z", "+00:00"))
            rem = max(0.0, (end_time - now).total_seconds())
            timer_state["remainingSeconds"] = rem
        except Exception as e:
            print(f"Error calculating remaining seconds on pause: {e}")
            
    timer_state["status"] = "paused"
    timer_state["pausedAt"] = now.isoformat()
    timer_state["lastUpdated"] = now.isoformat()
    timer_state["updatedBy"] = admin.get("email")
    save_timer_state(timer_state)
    return {"message": "Hackathon timer paused.", "timer": _compute_timer_payload(timer_state)}

@router.post("/api/admin/timer/stop")
def stop_live_timer(admin: dict = Depends(get_admin_user)):
    timer_state = get_timer_state()
    now = datetime.now(timezone.utc)
    timer_state["status"] = "ended"
    timer_state["remainingSeconds"] = 0.0
    timer_state["pausedAt"] = None
    timer_state["lastUpdated"] = now.isoformat()
    timer_state["updatedBy"] = admin.get("email")
    save_timer_state(timer_state)
    
    # Automatically disqualify all teams that have not submitted yet
    disqualified_count = check_and_disqualify_unsubmitted_teams()
    
    return {
        "message": f"Hackathon timer stopped and concluded. {disqualified_count} unsubmitted team(s) have been automatically disqualified.",
        "timer": _compute_timer_payload(timer_state)
    }

@router.post("/api/admin/timer/reset")
def reset_live_timer(admin: dict = Depends(get_admin_user)):
    sched = extract_event_schedule_from_handbook()
    dur_hrs = sched.get("durationHours", 48.0)
    
    timer_state = {
        "status": "idle",
        "title": "Hacking Submission Closes",
        "durationHours": dur_hrs,
        "durationText": sched.get("durationText", f"{dur_hrs} Hours"),
        "startTime": None,
        "endTime": None,
        "remainingSeconds": dur_hrs * 3600,
        "totalSeconds": dur_hrs * 3600,
        "pausedAt": None,
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
        "updatedBy": admin.get("email"),
        "handbookRef": sched.get("handbookRef")
    }
    save_timer_state(timer_state)
    return {"message": f"Hackathon timer reset to initial handbook duration ({sched.get('durationText')})!", "timer": _compute_timer_payload(timer_state)}

@router.post("/api/admin/timer/update")
def update_live_timer(req: UpdateTimerRequest, admin: dict = Depends(get_admin_user)):
    timer_state = get_timer_state()
    now = datetime.now(timezone.utc)
    
    # 0. Stop / End Timer Action
    if req.action == "stop":
        timer_state["status"] = "ended"
        timer_state["remainingSeconds"] = 0.0
        timer_state["pausedAt"] = None
        timer_state["lastUpdated"] = now.isoformat()
        timer_state["updatedBy"] = admin.get("email")
        save_timer_state(timer_state)
        disqualified_count = check_and_disqualify_unsubmitted_teams()
        return {
            "message": f"Hackathon timer stopped. {disqualified_count} unsubmitted team(s) automatically disqualified.",
            "timer": _compute_timer_payload(timer_state)
        }

    # 1. Sync directly from handbook
    if req.action == "sync_handbook":
        sched = extract_event_schedule_from_handbook()
        dur_hrs = sched.get("durationHours", 48.0)
        timer_state["durationHours"] = dur_hrs
        timer_state["durationText"] = sched.get("durationText", f"{dur_hrs} Hours")
        timer_state["handbookRef"] = sched.get("handbookRef")
        if timer_state.get("status") == "idle":
            timer_state["totalSeconds"] = dur_hrs * 3600
            timer_state["remainingSeconds"] = dur_hrs * 3600
        elif timer_state.get("status") == "running" and timer_state.get("startTime"):
            start_dt = datetime.fromisoformat(timer_state["startTime"].replace("Z", "+00:00"))
            new_end = start_dt + timedelta(hours=dur_hrs)
            timer_state["endTime"] = new_end.isoformat()
            timer_state["totalSeconds"] = dur_hrs * 3600
            timer_state["remainingSeconds"] = max(0.0, (new_end - now).total_seconds())

    # 2. Extend or shorten remaining time (e.g. +60 mins)
    if req.extendMinutes is not None and req.extendMinutes != 0:
        added_seconds = req.extendMinutes * 60
        if timer_state.get("status") == "running" and timer_state.get("endTime"):
            end_time = datetime.fromisoformat(timer_state["endTime"].replace("Z", "+00:00"))
            new_end = end_time + timedelta(minutes=req.extendMinutes)
            timer_state["endTime"] = new_end.isoformat()
            timer_state["totalSeconds"] = max(0.0, float(timer_state.get("totalSeconds", 0)) + added_seconds)
            timer_state["remainingSeconds"] = max(0.0, (new_end - now).total_seconds())
        else:
            cur_rem = float(timer_state.get("remainingSeconds", timer_state.get("durationHours", 36.0) * 3600))
            new_rem = max(0.0, cur_rem + added_seconds)
            timer_state["remainingSeconds"] = new_rem
            timer_state["totalSeconds"] = max(new_rem, float(timer_state.get("totalSeconds", new_rem)))
            timer_state["durationHours"] = round(timer_state["totalSeconds"] / 3600, 2)
            timer_state["durationText"] = f"{timer_state['durationHours']} Hours"

    # 3. Custom Duration in Hours
    if req.durationHours is not None and req.durationHours > 0:
        timer_state["durationHours"] = float(req.durationHours)
        timer_state["durationText"] = f"{req.durationHours} Hours"
        timer_state["totalSeconds"] = float(req.durationHours) * 3600
        if timer_state.get("status") == "idle":
            timer_state["remainingSeconds"] = float(req.durationHours) * 3600
        elif timer_state.get("status") == "running" and timer_state.get("startTime"):
            start_dt = datetime.fromisoformat(timer_state["startTime"].replace("Z", "+00:00"))
            new_end = start_dt + timedelta(hours=req.durationHours)
            timer_state["endTime"] = new_end.isoformat()
            timer_state["remainingSeconds"] = max(0.0, (new_end - now).total_seconds())

    # 4. Custom Specific End Date/Time ISO
    if req.endTime:
        try:
            target_end = datetime.fromisoformat(req.endTime.replace("Z", "+00:00"))
            timer_state["endTime"] = target_end.isoformat()
            if timer_state.get("status") == "running":
                timer_state["remainingSeconds"] = max(0.0, (target_end - now).total_seconds())
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid ISO timestamp for endTime: {e}")

    if req.title:
        timer_state["title"] = req.title.strip()

    timer_state["lastUpdated"] = now.isoformat()
    timer_state["updatedBy"] = admin.get("email")
    save_timer_state(timer_state)
    return {"message": "Timer configuration successfully updated!", "timer": _compute_timer_payload(timer_state)}

# Public / Participant Polling Endpoint for Announcements (Emergency / System)
@router.get("/api/announcements")
def get_announcements_feed():
    announcements = get_announcements()
    return {"announcements": announcements, "count": len(announcements)}

# Public / Participant Polling Endpoint for Answered Q&A Notifications (Max 5 history)
@router.get("/api/notifications")
def get_qa_notifications():
    notifications = get_notifications()
    return {"notifications": notifications[:5], "count": len(notifications[:5])}

# Public / Participant Polling Endpoint for Dynamic Quick Reference (Wi-Fi, Rubrics, Catering, Tracks)
@router.get("/api/handbook/quick-reference")
def get_handbook_quick_reference():
    content = ""
    for path in [HANDBOOK_FILE_BACKEND, HANDBOOK_FILE_ROOT]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    break
            except Exception as e:
                print(f"Error reading handbook: {e}")
                
    ref_data = extract_quick_reference_from_handbook(content if content else None)
    return {
        "quickReference": ref_data,
        "contentLength": len(content)
    }

# Public Endpoint for Dynamic Tracks from Handbook Section 3
@router.get("/api/handbook/tracks")
def get_handbook_tracks():
    content = ""
    for path in [HANDBOOK_FILE_BACKEND, HANDBOOK_FILE_ROOT]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    break
            except Exception as e:
                print(f"Error reading handbook: {e}")
    tracks = extract_tracks_from_handbook(content if content else None)
    return {"tracks": tracks, "count": len(tracks)}

@router.get("/api/admin/escalations")
def list_escalations(admin: dict = Depends(get_admin_user)):
    escalations = get_escalations()
    return {"escalations": escalations, "total": len(escalations)}

@router.post("/api/admin/escalations/{escalation_id}/resolve")
def resolve_escalation(
    escalation_id: str,
    req: ResolveEscalationRequest,
    admin: dict = Depends(get_admin_user)
):
    escalations = get_escalations()
    entry = next((e for e in escalations if e["id"] == escalation_id), None)
    if not entry:
        raise HTTPException(status_code=404, detail="Escalation ticket not found.")
        
    answer_text = req.response.strip()
    entry["status"] = "resolved"
    entry["response"] = answer_text
    entry["proposedAnswer"] = answer_text
    entry["resolvedBy"] = admin.get("name") or admin.get("email") or "Organizer Admin"
    entry["resolvedAt"] = datetime.now(timezone.utc).isoformat()
    
    save_escalations(escalations)

    # Add to Notifications list (capped at max 5 items, newest first, oldest automatically pruned)
    query_text = (entry.get('query') or entry.get('question') or '').strip()
    now_iso = datetime.now(timezone.utc).isoformat()
    new_notif = {
        "id": f"notif_qa_{uuid.uuid4().hex[:6]}",
        "type": "qa_answer",
        "title": f"Answer to: \"{query_text[:60]}\"" if query_text else "Organizer Q&A Response",
        "query": query_text or "General Inquiry",
        "answer": answer_text,
        "message": answer_text,
        "answeredBy": admin.get("name") or "Organizer Admin",
        "ticketId": escalation_id,
        "targetUser": entry.get("userEmail"),
        "timestamp": now_iso,
        "createdAt": now_iso
    }
    current_notifs = get_notifications()
    updated_notifs = [new_notif] + [n for n in current_notifs if n.get("ticketId") != escalation_id]
    save_notifications(updated_notifs[:5])
    
    return {"message": "Escalation ticket answered and added to live notifications!", "escalation": entry, "notification": new_notif}

@router.post("/api/admin/escalations/{escalation_id}/reject")
def reject_escalation(
    escalation_id: str,
    req: RejectEscalationRequest,
    admin: dict = Depends(get_admin_user)
):
    escalations = get_escalations()
    entry = next((e for e in escalations if e["id"] == escalation_id), None)
    if not entry:
        raise HTTPException(status_code=404, detail="Escalation ticket not found.")
        
    rej_text = req.reason.strip() if req.reason else "Question rejected by organizers."
    entry["status"] = "rejected"
    entry["response"] = rej_text
    entry["rejectionReason"] = rej_text
    entry["resolvedBy"] = admin.get("name") or admin.get("email") or "Organizer Admin"
    entry["resolvedAt"] = datetime.now(timezone.utc).isoformat()
    
    save_escalations(escalations)
    return {"message": "Escalation ticket rejected.", "escalation": entry}

@router.delete("/api/admin/escalations/{escalation_id}")
def delete_escalation(
    escalation_id: str,
    admin: dict = Depends(get_admin_user)
):
    escalations = get_escalations()
    initial_len = len(escalations)
    escalations = [e for e in escalations if e["id"] != escalation_id]
    
    if len(escalations) == initial_len:
        raise HTTPException(status_code=404, detail="Escalation ticket not found.")
        
    save_escalations(escalations)
    return {"message": f"Escalation ticket {escalation_id} deleted successfully."}

@router.post("/api/admin/escalations/batch-delete")
def batch_delete_escalations(
    req: BatchDeleteRequest,
    admin: dict = Depends(get_admin_user)
):
    escalations = get_escalations()
    delete_set = set(req.escalationIds)
    escalations = [e for e in escalations if e["id"] not in delete_set]
    save_escalations(escalations)
    return {"message": f"Successfully deleted {len(delete_set)} escalation tickets."}

# Handbook Management Endpoints
@router.get("/api/admin/handbook")
def get_handbook_content(admin: dict = Depends(get_admin_user)):
    content = ""
    for path in [HANDBOOK_FILE_BACKEND, HANDBOOK_FILE_ROOT]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    break
            except Exception as e:
                print(f"Error reading handbook from {path}: {e}")
                
    if not content:
        content = "Hackathon 2026: Official Handbook\n\nNo content currently loaded."
        
    return {"content": content, "length": len(content)}

@router.post("/api/admin/handbook")
def update_handbook_content(
    req: UpdateHandbookRequest,
    admin: dict = Depends(get_admin_user)
):
    text_content = req.content
    
    # Write to backend data directory
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(HANDBOOK_FILE_BACKEND, "w", encoding="utf-8") as f:
            f.write(text_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write to backend handbook file: {e}")
        
    # Write to project root if accessible
    try:
        with open(HANDBOOK_FILE_ROOT, "w", encoding="utf-8") as f:
            f.write(text_content)
    except Exception as e:
        print(f"Notice: Root handbook file write: {e}")

    # Auto-sync live timer duration reference from the new handbook content
    try:
        sched = extract_event_schedule_from_handbook(text_content)
        timer_state = get_timer_state()
        timer_state["handbookRef"] = sched.get("handbookRef")
        if timer_state.get("status") == "idle":
            timer_state["durationHours"] = sched.get("durationHours", 36.0)
            timer_state["durationText"] = sched.get("durationText", "36 Hours")
            timer_state["totalSeconds"] = sched.get("durationHours", 36.0) * 3600
            timer_state["remainingSeconds"] = sched.get("durationHours", 36.0) * 3600
        save_timer_state(timer_state)
    except Exception as e:
        print(f"Notice: Auto-updating timer state from handbook: {e}")
        
    return {
        "message": "Hackathon handbook successfully saved and permanently stored on server!",
        "length": len(text_content),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "updatedBy": admin.get("email")
    }

@router.post("/api/admin/announcements")
async def broadcast_announcement(
    request: Request,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(get_admin_user)
):
    content_type = request.headers.get("content-type", "")
    
    title = ""
    message = ""
    severity = "info"
    file_bytes = None
    file_filename = None
    file_size = None
    
    if "multipart/form-data" in content_type:
        form = await request.form()
        title = str(form.get("title", "")).strip()
        message = str(form.get("message", "")).strip()
        severity = str(form.get("severity", "info")).strip().lower()
        
        file_obj = form.get("file")
        if file_obj and hasattr(file_obj, "filename") and file_obj.filename:
            file_filename = file_obj.filename
            file_bytes = await file_obj.read()
            file_size = len(file_bytes)
    else:
        body = await request.json()
        title = str(body.get("title", "")).strip()
        message = str(body.get("message", "")).strip()
        severity = str(body.get("severity", "info")).strip().lower()

    if not title or not message:
        raise HTTPException(status_code=400, detail="Title and message are required.")

    ann_id = f"ann_{uuid.uuid4().hex[:6]}"
    attachment_url = None
    
    if file_bytes and file_filename:
        safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', file_filename)
        saved_name = f"{ann_id}_{safe_filename}"
        file_path = os.path.join(ATTACHMENTS_DIR, saved_name)
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        attachment_url = f"/api/attachments/{saved_name}"

    now_iso = datetime.now(timezone.utc).isoformat()
    new_ann = {
        "id": ann_id,
        "title": title,
        "message": message,
        "severity": severity,
        "broadcastBy": admin.get("name") or "Campus Copilot",
        "author": admin.get("name") or "Campus Copilot",
        "type": "broadcast",
        "attachmentUrl": attachment_url,
        "attachmentName": file_filename,
        "attachmentSize": file_size,
        "timestamp": now_iso,
        "createdAt": now_iso
    }
    
    announcements = get_announcements()
    announcements.insert(0, new_ann)
    save_announcements(announcements)
    
    # Collect all user email addresses from the database to send real Gmail broadcast
    users = get_users()
    recipient_emails = list(set([
        u["email"] for u in users 
        if u.get("email") and "@" in u.get("email")
    ]))
    
    if recipient_emails:
        background_tasks.add_task(
            send_broadcast_announcement_email,
            recipient_emails,
            new_ann["title"],
            new_ann["message"],
            new_ann["severity"],
            new_ann["broadcastBy"],
            file_bytes,
            file_filename
        )
    
    msg = f"Announcement successfully broadcasted and emailed to {len(recipient_emails)} user(s)"
    if file_filename:
        msg += f" with attachment '{file_filename}'"
    msg += "!"

    return {
        "message": msg,
        "announcement": new_ann,
        "recipientsCount": len(recipient_emails)
    }

@router.get("/api/attachments/{filename}")
def download_attachment(filename: str):
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(ATTACHMENTS_DIR, safe_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Attachment file not found.")
    
    original_name = safe_filename.split("_", 1)[-1] if "_" in safe_filename else safe_filename
    return FileResponse(
        file_path,
        filename=original_name,
        media_type="application/octet-stream"
    )

@router.delete("/api/admin/teams/{team_id}")
def delete_team_by_admin(
    team_id: str,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(get_admin_user)
):
    teams = get_teams()
    team = next((t for t in teams if t["id"] == team_id), None)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")
        
    team_name = team.get("name", team_id)
    
    # Collect affected member user IDs and emails
    users = get_users()
    affected_user_ids = []
    affected_emails = []
    
    if "members" in team and isinstance(team["members"], list):
        for m in team["members"]:
            if isinstance(m, dict):
                if m.get("userId"):
                    u_id_str = str(m["userId"])
                    if u_id_str not in affected_user_ids:
                        affected_user_ids.append(u_id_str)
                if m.get("email") and "@" in m.get("email"):
                    u_email = str(m["email"]).strip().lower()
                    if u_email not in affected_emails:
                        affected_emails.append(u_email)
                    if u_email not in affected_user_ids:
                        affected_user_ids.append(u_email)
                        
    for u in users:
        if u.get("teamId") == team_id:
            u_id_str = str(u["id"])
            if u_id_str not in affected_user_ids:
                affected_user_ids.append(u_id_str)
            if u.get("email") and "@" in u.get("email"):
                u_email = str(u["email"]).strip().lower()
                if u_email not in affected_emails:
                    affected_emails.append(u_email)
                if u_email not in affected_user_ids:
                    affected_user_ids.append(u_email)
            
    # Remove team from database
    teams = [t for t in teams if t["id"] != team_id]
    save_teams(teams)
    
    # Reset teamId and enable solo matchmaking for all members
    updated_users_count = 0
    for u in users:
        u_id_str = str(u.get("id"))
        u_email = str(u.get("email", "")).strip().lower()
        if u.get("teamId") == team_id or u_id_str in affected_user_ids or u_email in affected_emails:
            u["teamId"] = None
            u["lookingForTeam"] = True
            updated_users_count += 1
    save_users(users)
    
    # Record targeted Team Deletion Announcement so affected participants receive instant popup
    announcements = get_announcements()
    team_del_ann = {
        "id": f"ann_teamdel_{uuid.uuid4().hex[:6]}",
        "title": f"Team '{team_name}' Disbanded by Organizer",
        "message": f"Your team **'{team_name}'** has been deleted by Hackathon Operations.\n\nAll members have been unassigned and your status has been reset to **Solo Hacker (Looking for Team)**.",
        "severity": "critical",
        "type": "team_deleted",
        "teamId": team_id,
        "teamName": team_name,
        "affectedUserIds": affected_user_ids,
        "broadcastBy": admin.get("name", "Hackathon Operations"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    announcements.insert(0, team_del_ann)
    save_announcements(announcements)
    
    # Send targeted email alert to affected team members via Gmail
    if affected_emails:
        background_tasks.add_task(
            send_broadcast_announcement_email,
            affected_emails,
            f"Team '{team_name}' Disbanded by Organizer",
            f"Your team '{team_name}' has been disbanded by Hackathon Operations.\n\nAll members have been unassigned and your status has been reset to Solo Hacker (Looking for Team). You can now create or join a new team.",
            "critical",
            admin.get("name", "Hackathon Operations")
        )
    
    return {
        "message": f"Team '{team_name}' successfully deleted. {updated_users_count} member(s) released to solo matchmaking.",
        "teamId": team_id,
        "teamName": team_name,
        "affectedUserIds": affected_user_ids
    }

class DisqualifyTeamRequest(BaseModel):
    disqualified: bool
    reason: Optional[str] = None

@router.patch("/api/admin/teams/{team_id}/disqualify")
@router.post("/api/admin/teams/{team_id}/disqualify")
def toggle_disqualify_team(
    team_id: str,
    req: DisqualifyTeamRequest,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(get_admin_user)
):
    teams = get_teams()
    team = next((t for t in teams if t["id"] == team_id), None)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")
        
    team_name = team.get("name", team_id)
    
    # Collect affected member user IDs and emails
    users = get_users()
    affected_user_ids = []
    affected_emails = []
    
    if "members" in team and isinstance(team["members"], list):
        for m in team["members"]:
            if isinstance(m, dict):
                if m.get("userId"):
                    u_id_str = str(m["userId"])
                    if u_id_str not in affected_user_ids:
                        affected_user_ids.append(u_id_str)
                if m.get("email") and "@" in m.get("email"):
                    u_email = str(m["email"]).strip().lower()
                    if u_email not in affected_emails:
                        affected_emails.append(u_email)
                    if u_email not in affected_user_ids:
                        affected_user_ids.append(u_email)
                    
    for u in users:
        if u.get("teamId") == team_id:
            u_id_str = str(u["id"])
            if u_id_str not in affected_user_ids:
                affected_user_ids.append(u_id_str)
            if u.get("email") and "@" in u.get("email"):
                u_email = str(u["email"]).strip().lower()
                if u_email not in affected_emails:
                    affected_emails.append(u_email)
                if u_email not in affected_user_ids:
                    affected_user_ids.append(u_email)

    announcements = get_announcements()

    if req.disqualified:
        disq_reason = req.reason.strip() if req.reason and req.reason.strip() else "Violation of hackathon rules or missing mandatory checkpoints."
        team["status"] = "disqualified"
        team["disqualificationReason"] = disq_reason
        msg = f"Team '{team_name}' has been DISQUALIFIED for: {disq_reason}"
        
        # Targeted Critical Announcement ONLY for members of this team
        disq_ann = {
            "id": f"ann_disq_{uuid.uuid4().hex[:6]}",
            "title": f"Team '{team_name}' Disqualified",
            "message": f"Your team **'{team_name}'** has been **DISQUALIFIED** by Hackathon Operations.\n\n**Reason:** {disq_reason}\n\nProject repository submissions are permanently locked for this team until reinstated by an administrator.",
            "severity": "critical",
            "type": "team_disqualified",
            "teamId": team_id,
            "teamName": team_name,
            "disqualificationReason": disq_reason,
            "affectedUserIds": affected_user_ids,
            "broadcastBy": admin.get("name", "Hackathon Operations"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        announcements.insert(0, disq_ann)
        save_announcements(announcements)

        # Dispatch targeted email notification to affected members
        if affected_emails:
            background_tasks.add_task(
                send_broadcast_announcement_email,
                affected_emails,
                f"[URGENT] Team '{team_name}' Disqualified - CampusCopilot",
                f"Your team '{team_name}' has been DISQUALIFIED by Hackathon Operations.\n\nReason: {disq_reason}\n\nProject repository submissions are permanently locked until reinstated by an administrator.",
                "critical",
                admin.get("name", "Hackathon Operations")
            )
    else:
        # Restore status based on whether GitHub URL was submitted
        team["status"] = "submitted" if bool(team.get("githubUrl")) else "not_submitted"
        team["disqualificationReason"] = None
        msg = f"Team '{team_name}' status restored to '{team['status']}'."
        
        # Targeted Restoration Notice ONLY for members of this team
        restore_ann = {
            "id": f"ann_res_{uuid.uuid4().hex[:6]}",
            "title": f"Team '{team_name}' Restored",
            "message": f"Good news! Your team **'{team_name}'** has been **RESTORED** to active status by Hackathon Operations.\n\nCurrent status: **{team['status'].upper()}**.",
            "severity": "info",
            "type": "team_restored",
            "teamId": team_id,
            "teamName": team_name,
            "affectedUserIds": affected_user_ids,
            "broadcastBy": admin.get("name", "Hackathon Operations"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        announcements.insert(0, restore_ann)
        save_announcements(announcements)

    save_teams(teams)
    return {
        "message": msg,
        "team": team,
        "affectedUserIds": affected_user_ids
    }

@router.patch("/api/admin/teams/{team_id}/status")
@router.put("/api/admin/teams/{team_id}/status")
def update_team_status_by_admin(
    team_id: str,
    req: UpdateTeamStatusRequest,
    admin: dict = Depends(get_admin_user)
):
    status_clean = req.status.strip().lower()
    valid_statuses = ["not_submitted", "submitted", "disqualified"]
    if status_clean not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid team status '{status_clean}'. Allowed options: {', '.join(valid_statuses)}"
        )
        
    teams = get_teams()
    team = next((t for t in teams if t["id"] == team_id), None)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")
        
    team["status"] = status_clean
    save_teams(teams)
    
    return {
        "message": f"Team '{team.get('name')}' status successfully updated to '{status_clean}'!",
        "team": team
    }

@router.get("/api/admin/metrics")
def get_admin_metrics(admin: dict = Depends(get_admin_user)):
    teams = get_teams()
    users = get_users()
    escalations = get_escalations()
    
    participants = [u for u in users if u.get("role") == "participant"]
    solo_hackers = [u for u in participants if not u.get("teamId")]
    looking_for_team = [u for u in participants if u.get("lookingForTeam")]
    
    resolved_tickets = [e for e in escalations if e.get("status") == "resolved"]
    pending_tickets = [e for e in escalations if e.get("status") == "pending"]
    rejected_tickets = [e for e in escalations if e.get("status") == "rejected"]
    
    return {
        "totalParticipants": len(participants),
        "totalTeams": len(teams),
        "totalSoloHackers": len(solo_hackers),
        "openMatchmakingRequests": len(looking_for_team),
        "totalEscalationTickets": len(escalations),
        "resolvedTicketsCount": len(resolved_tickets),
        "pendingTicketsCount": len(pending_tickets),
        "rejectedTicketsCount": len(rejected_tickets)
    }

# ==========================================
# DATABASE TELEMETRY & MANAGEMENT
# ==========================================
@router.get("/api/admin/database/status")
def get_admin_database_status(admin: dict = Depends(get_admin_user)):
    """Returns current active SQLite database status, file metrics, and table row counts."""
    return get_db_status()

# ==========================================
# DATA EXPORT (EXCEL & PDF)
# ==========================================
@router.get("/api/admin/export/excel")
def export_hackathon_excel(admin: dict = Depends(get_admin_user)):
    """
    Generates and streams a multi-sheet formatted Excel workbook (.xlsx)
    containing Teams, Developers, Inquiries, Announcements, and Telemetry.
    """
    try:
        excel_buffer = generate_excel_export()
        filename = f"GIETU_Hackathon_2026_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return Response(
            content=excel_buffer.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Excel report: {str(e)}")

@router.get("/api/admin/export/pdf")
def export_hackathon_pdf(admin: dict = Depends(get_admin_user)):
    """
    Generates and streams a styled PDF summary report of all Hackathon event operations.
    """
    try:
        pdf_buffer = generate_pdf_export()
        filename = f"GIETU_Hackathon_2026_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(e)}")


# ==========================================
# PARTICIPANTS & USER DIRECTORY MANAGEMENT
# ==========================================
@router.get("/api/admin/users")
def get_all_users_for_admin(admin: dict = Depends(get_admin_user)):
    """
    Returns full participant and user directory with enriched team and status metadata.
    """
    users = get_users()
    teams = get_teams()
    team_map = {t["id"]: t for t in teams}
    
    enriched = []
    for u in users:
        u_copy = dict(u)
        # Remove sensitive credential hashes
        u_copy.pop("passwordHash", None)
        u_copy.pop("verificationCode", None)
        u_copy.pop("deleteToken", None)
        u_copy.pop("resetToken", None)
        
        # Attach team info
        t_id = u.get("teamId")
        if t_id and t_id in team_map:
            t = team_map[t_id]
            u_copy["teamName"] = t.get("name")
            u_copy["teamTrack"] = t.get("track")
            u_copy["teamStatus"] = t.get("status")
            members = t.get("members", [])
            u_copy["isTeamLeader"] = any(m.get("userId") == u["id"] and m.get("isLeader") for m in members)
        else:
            u_copy["teamName"] = None
            u_copy["teamTrack"] = None
            u_copy["teamStatus"] = None
            u_copy["isTeamLeader"] = False
            
        enriched.append(u_copy)
        
    return {
        "users": enriched,
        "total": len(enriched),
        "participantsCount": sum(1 for u in enriched if u.get("role") == "participant"),
        "adminsCount": sum(1 for u in enriched if u.get("role") == "admin"),
        "soloCount": sum(1 for u in enriched if u.get("role") == "participant" and not u.get("teamId")),
        "inTeamCount": sum(1 for u in enriched if u.get("teamId")),
        "verifiedCount": sum(1 for u in enriched if u.get("isVerified"))
    }


@router.delete("/api/admin/users/{user_id}")
def delete_user_by_admin(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """
    Permanently deletes a user and cascades all related records (teams, escalations, notifications).
    """
    if user_id == admin.get("id"):
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own active administrator account from the participant directory."
        )
        
    res = delete_user_cascade(user_id)
    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("message", "User not found."))
        
    return res


@router.post("/api/admin/users/batch-delete")
def batch_delete_users_by_admin(
    req: BatchDeleteUsersRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Batch deletes multiple users and cascades all related records.
    """
    # Exclude current admin ID if accidentally included in selection
    filtered_ids = [uid for uid in req.userIds if uid != admin.get("id")]
    if not filtered_ids:
        raise HTTPException(status_code=400, detail="No eligible user IDs provided for deletion.")
        
    res = batch_delete_users_cascade(filtered_ids)
    return res

