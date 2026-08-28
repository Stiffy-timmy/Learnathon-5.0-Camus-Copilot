import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Response, BackgroundTasks
from pydantic import BaseModel
from app.auth import get_current_user, get_admin_user, get_optional_current_user
from app.database import get_teams, save_teams, get_users, get_announcements, save_announcements
from app.certificate_service import (
    create_or_get_certificate, get_certificate_by_id, get_certificate_by_email,
    batch_generate_certificates_for_all_participants, generate_certificate_pdf
)
from app.audit_service import audit_project_submission
from app.telemetry_service import (
    compute_adaptive_timeline_telemetry, get_logistics_resources,
    claim_api_key, book_mentor_office_hours, request_hardware_checkout
)

router = APIRouter(prefix="", tags=["Operations, Telemetry, Audits & Certificates"])

# ==========================================
# PYDANTIC REQUEST SCHEMAS
# ==========================================
class AuditSubmissionRequest(BaseModel):
    githubUrl: str
    demoVideoUrl: Optional[str] = None
    description: Optional[str] = None

class TriggerMilestoneRequest(BaseModel):
    milestoneId: str
    customMessage: Optional[str] = None
    severity: Optional[str] = "info"

class ClaimKeyRequest(BaseModel):
    keyId: str

class BookMentorRequest(BaseModel):
    track: Optional[str] = "General"
    topic: str

class RequestHardwareRequest(BaseModel):
    itemId: str
    quantity: Optional[int] = 1

class BookMentorSessionRequest(BaseModel):
    mentorId: Optional[str] = None
    mentorName: Optional[str] = None
    slot: Optional[str] = None
    topic: str

class SubmitResourceRequest(BaseModel):
    category: str # "HARDWARE" or "API_KEY"
    item: str
    reason: str

class UpdateResourceStatusRequest(BaseModel):
    status: str # "APPROVED" or "REJECTED"
    adminNotes: Optional[str] = None

class MentorDataRequest(BaseModel):
    id: Optional[str] = None
    name: str
    title: str
    status: str
    statusType: str
    slotTime: str
    skills: List[str]

class CertificateConfigRequest(BaseModel):
    eventName: Optional[str] = None
    certificateTitle: Optional[str] = None
    organizer: Optional[str] = None
    achievementType: Optional[str] = None
    isUnlocked: Optional[bool] = None
    signatory1Name: Optional[str] = None
    signatory1Title: Optional[str] = None
    signatory2Name: Optional[str] = None
    signatory2Title: Optional[str] = None

# ==========================================
# 1. ADAPTIVE TIMELINE TELEMETRY & REMINDERS
# ==========================================
@router.get("/api/telemetry/timeline")
def get_timeline_telemetry(current_user: Optional[dict] = Depends(get_optional_current_user)):
    user_role = current_user.get("roleTitle") if current_user else None
    user_track = None
    if current_user and current_user.get("teamId"):
        teams = get_teams()
        team = next((t for t in teams if t["id"] == current_user["teamId"]), None)
        if team:
            user_track = team.get("track")
            
    return compute_adaptive_timeline_telemetry(user_role=user_role, user_track=user_track)

@router.post("/api/admin/telemetry/trigger-milestone")
def trigger_milestone_broadcast(
    req: TriggerMilestoneRequest,
    admin: dict = Depends(get_admin_user)
):
    milestone_names = {
        "m1_checkin": "Opening Ceremony & Team Formation Lock",
        "m2_workshop": "Workshop: Building Autonomous Agents with LLMs",
        "m3_mentor": "Mentor Office Hours Open in Lounge B",
        "m4_checkpoint": "Mid-Sprint Checkpoint & Midnight Catering",
        "m5_preaudit": "Pre-Submission Compliance Audit Window",
        "m6_freeze": "Final Project Submission Deadline Freeze"
    }
    m_name = milestone_names.get(req.milestoneId, req.milestoneId)
    title = f"📢 MILESTONE ALERT: {m_name}"
    msg = req.customMessage or f"The hackathon timeline has advanced to **{m_name}**. Please check your telemetry board for active instructions."
    
    announcements = get_announcements()
    new_ann = {
        "id": f"ann_m_{uuid.uuid4().hex[:6]}",
        "title": title,
        "message": msg,
        "severity": req.severity or "info",
        "author": admin.get("name", "Hackathon Operations"),
        "broadcastBy": admin.get("name", "Hackathon Operations"),
        "type": "milestone_alert",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    announcements.insert(0, new_ann)
    save_announcements(announcements)
    
    return {"message": f"Milestone alert '{m_name}' successfully triggered and broadcasted!", "announcement": new_ann}

# ==========================================
# 2. OPERATIONAL LOGISTICS (KEYS, MENTORS, HARDWARE)
# ==========================================
@router.get("/api/logistics/resources")
def get_logistics(current_user: Optional[dict] = Depends(get_optional_current_user)):
    user_email = current_user.get("email") if current_user else None
    return get_logistics_resources(user_email=user_email)

@router.post("/api/logistics/claim-key")
def claim_key_endpoint(req: ClaimKeyRequest, current_user: dict = Depends(get_current_user)):
    res = claim_api_key(
        key_id=req.keyId,
        user_email=current_user["email"],
        user_name=current_user.get("name", "Participant")
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res

@router.post("/api/logistics/book-mentor")
def book_mentor_endpoint(req: BookMentorRequest, current_user: dict = Depends(get_current_user)):
    teams = get_teams()
    team_name = None
    if current_user.get("teamId"):
        team = next((t for t in teams if t["id"] == current_user["teamId"]), None)
        if team:
            team_name = team.get("name")
            
    res = book_mentor_office_hours(
        track=req.track,
        topic=req.topic,
        user_email=current_user["email"],
        user_name=current_user.get("name", "Participant"),
        team_name=team_name
    )
    return res

@router.post("/api/logistics/book-mentor-session")
def book_mentor_session_endpoint(req: BookMentorSessionRequest, current_user: dict = Depends(get_current_user)):
    teams = get_teams()
    team_name = None
    if current_user.get("teamId"):
        team = next((t for t in teams if t["id"] == current_user["teamId"]), None)
        if team:
            team_name = team.get("name")
            
    from app.telemetry_service import book_mentor_session
    res = book_mentor_session(
        mentor_id=req.mentorId,
        mentor_name=req.mentorName,
        slot=req.slot,
        topic=req.topic,
        user_email=current_user["email"],
        user_name=current_user.get("name", "Participant"),
        team_name=team_name
    )
    return res

@router.post("/api/logistics/resource-requests")
def submit_resource_request_endpoint(req: SubmitResourceRequest, current_user: dict = Depends(get_current_user)):
    teams = get_teams()
    team_name = None
    if current_user.get("teamId"):
        team = next((t for t in teams if t["id"] == current_user["teamId"]), None)
        if team:
            team_name = team.get("name")
            
    from app.telemetry_service import submit_resource_request
    res = submit_resource_request(
        category=req.category,
        item=req.item,
        reason=req.reason,
        user_email=current_user["email"],
        user_name=current_user.get("name", "Participant"),
        team_name=team_name
    )
    return res

@router.get("/api/admin/logistics/resource-requests")
def get_admin_resource_requests(admin: dict = Depends(get_admin_user)):
    from app.telemetry_service import _load_logistics
    data = _load_logistics()
    return {"requests": data.get("resourceRequests", [])}

@router.patch("/api/admin/logistics/resource-requests/{req_id}")
def update_resource_request_admin(req_id: str, req: UpdateResourceStatusRequest, admin: dict = Depends(get_admin_user)):
    from app.telemetry_service import update_resource_request_status
    res = update_resource_request_status(req_id, req.status, req.adminNotes)
    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("message"))
    return res

@router.get("/api/admin/logistics/mentors")
def get_admin_mentors(admin: dict = Depends(get_admin_user)):
    from app.telemetry_service import get_mentors
    return {"mentors": get_mentors()}

@router.post("/api/admin/logistics/mentors")
def save_admin_mentor(req: MentorDataRequest, admin: dict = Depends(get_admin_user)):
    from app.telemetry_service import add_or_update_mentor
    saved = add_or_update_mentor(req.model_dump())
    return {"message": "Mentor details saved successfully.", "mentor": saved}

@router.delete("/api/admin/logistics/mentors/{mentor_id}")
def delete_admin_mentor(mentor_id: str, admin: dict = Depends(get_admin_user)):
    from app.telemetry_service import delete_mentor
    delete_mentor(mentor_id)
    return {"message": f"Mentor {mentor_id} deleted."}

@router.get("/api/certificates/config")
def get_certificate_config_endpoint():
    from app.certificate_service import get_certificate_config
    return {"config": get_certificate_config()}

@router.put("/api/admin/certificates/config")
def update_certificate_config_admin(req: CertificateConfigRequest, admin: dict = Depends(get_admin_user)):
    from app.certificate_service import update_certificate_config
    cfg = update_certificate_config(req.model_dump(exclude_unset=True))
    return {"message": "Certificate template configuration updated successfully.", "config": cfg}

@router.post("/api/logistics/request-hardware")
def request_hardware_endpoint(req: RequestHardwareRequest, current_user: dict = Depends(get_current_user)):
    teams = get_teams()
    team_name = None
    if current_user.get("teamId"):
        team = next((t for t in teams if t["id"] == current_user["teamId"]), None)
        if team:
            team_name = team.get("name")
            
    from app.telemetry_service import request_hardware_checkout
    res = request_hardware_checkout(
        item_id=req.itemId,
        quantity=req.quantity,
        user_email=current_user["email"],
        user_name=current_user.get("name", "Participant"),
        team_name=team_name
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res

# ==========================================
# 3. SUBMISSION COMPLIANCE AUDIT ENGINE
# ==========================================
@router.post("/api/teams/audit-submission")
def run_submission_audit(req: AuditSubmissionRequest, current_user: dict = Depends(get_current_user)):
    team_id = current_user.get("teamId")
    team = None
    if team_id:
        teams = get_teams()
        team = next((t for t in teams if t["id"] == team_id), None)
        
    track = team.get("track") if team else "Track 1: AI & Autonomous Agents"
    desc = req.description or (team.get("description") if team else "")
    members_count = len(team.get("members", [])) if team else 1
    
    audit_res = audit_project_submission(
        github_url=req.githubUrl,
        demo_video_url=req.demoVideoUrl,
        track=track,
        description=desc,
        team_members_count=members_count
    )
    
    return {
        "audit": audit_res,
        "teamName": team.get("name") if team else "Solo Hacker",
        "track": track
    }

@router.get("/api/teams/audit-status")
def get_team_audit_status(current_user: dict = Depends(get_current_user)):
    team_id = current_user.get("teamId")
    if not team_id:
        return {"audit": None, "message": "Join or create a team to run project compliance audits."}
        
    teams = get_teams()
    team = next((t for t in teams if t["id"] == team_id), None)
    if not team:
        return {"audit": None, "message": "Team not found."}
        
    gh_url = team.get("githubUrl", "")
    audit_res = audit_project_submission(
        github_url=gh_url,
        demo_video_url=None,
        track=team.get("track"),
        description=team.get("description"),
        team_members_count=len(team.get("members", []))
    )
    
    return {
        "audit": audit_res,
        "team": team
    }

@router.get("/api/admin/submissions/audits")
def get_all_submission_audits(admin: dict = Depends(get_admin_user)):
    teams = get_teams()
    audits = []
    
    for t in teams:
        gh_url = t.get("githubUrl", "")
        members = t.get("members", [])
        audit_res = audit_project_submission(
            github_url=gh_url,
            demo_video_url=None,
            track=t.get("track"),
            description=t.get("description"),
            team_members_count=len(members)
        )
        
        audits.append({
            "teamId": t["id"],
            "teamName": t["name"],
            "track": t["track"],
            "status": t.get("status", "not_submitted"),
            "githubUrl": gh_url,
            "submittedAt": t.get("submittedAt"),
            "memberCount": len(members),
            "leaderName": next((m.get("name") for m in members if m.get("isLeader")), "Unknown"),
            "leaderEmail": next((m.get("email") for m in members if m.get("isLeader")), ""),
            "auditScore": audit_res["score"],
            "complianceStatus": audit_res["complianceStatus"],
            "errors": audit_res["errors"],
            "warnings": audit_res["warnings"]
        })
        
    return {"audits": audits, "total": len(audits)}

# ==========================================
# 4. POST-EVENT CERTIFICATE CREATION & VERIFY
# ==========================================
@router.get("/api/certificates/my-certificate")
def get_my_certificate(current_user: dict = Depends(get_current_user)):
    team_name = None
    track_name = None
    if current_user.get("teamId"):
        teams = get_teams()
        team = next((t for t in teams if t["id"] == current_user["teamId"]), None)
        if team:
            team_name = team.get("name")
            track_name = team.get("track")
            
    cert = create_or_get_certificate(
        user_id=current_user["id"],
        user_email=current_user["email"],
        user_name=current_user.get("name", "Participant"),
        team_name=team_name,
        track=track_name,
        role_title=current_user.get("roleTitle", "Full-Stack Developer"),
        achievement_type="Participant of Excellence"
    )
    return {"certificate": cert}

@router.post("/api/certificates/generate")
def generate_certificate_on_demand(current_user: dict = Depends(get_current_user)):
    team_name = None
    track_name = None
    if current_user.get("teamId"):
        teams = get_teams()
        team = next((t for t in teams if t["id"] == current_user["teamId"]), None)
        if team:
            team_name = team.get("name")
            track_name = team.get("track")
            
    cert = create_or_get_certificate(
        user_id=current_user["id"],
        user_email=current_user["email"],
        user_name=current_user.get("name", "Participant"),
        team_name=team_name,
        track=track_name,
        role_title=current_user.get("roleTitle", "Full-Stack Developer"),
        achievement_type="Participant of Excellence"
    )
    return {
        "message": "Official verifiable certificate created successfully!",
        "certificate": cert
    }

@router.get("/api/certificates/verify/{cert_id}")
def verify_certificate_public(cert_id: str):
    cert = get_certificate_by_id(cert_id.upper().strip())
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate record not found or invalid Certificate ID.")
    return {
        "isValid": True,
        "status": "Authentic & Verified",
        "certificate": cert
    }

@router.get("/api/certificates/download/{cert_id}")
@router.get("/api/certificates/{cert_id}/download-pdf")
def download_certificate_pdf_endpoint(cert_id: str):
    from app.certificate_service import get_certificate_config
    cfg = get_certificate_config()
    if not cfg.get("isUnlocked", False):
        raise HTTPException(
            status_code=403,
            detail="Certificate downloads are currently locked by event organizers. Please wait until certificates are officially released."
        )

    cert = get_certificate_by_id(cert_id.upper().strip())
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate record not found.")
        
    pdf_buffer = generate_certificate_pdf(cert)
    clean_name = "".join(c for c in cert.get("recipientName", "Participant") if c.isalnum() or c == "_")
    filename = f"Certificate_{clean_name}_{cert['id']}.pdf"
    
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.post("/api/admin/certificates/batch-generate")
def batch_generate_certificates_admin(admin: dict = Depends(get_admin_user)):
    certs = batch_generate_certificates_for_all_participants()
    return {
        "message": f"Successfully generated and verified {len(certs)} certificates for all participants.",
        "certificatesCount": len(certs)
    }
