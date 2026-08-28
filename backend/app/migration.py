import os
import json
import uuid
from app.config import DATA_DIR
from app.db_session import db_session_scope
from app.models import (
    UserDB, TeamDB, TeamMemberDB, AnnouncementDB, 
    NotificationDB, FAQEscalationDB, KnowledgeItemDB, TimerStateDB
)

def _read_json_file(filename, default_val=None):
    if default_val is None:
        default_val = []
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return default_val
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[Migration] Warning reading {filename}: {e}")
        return default_val

from sqlalchemy import text

def _ensure_all_columns(session):
    alterations = [
        ("announcements", "type VARCHAR(50) DEFAULT 'broadcast'"),
        ("announcements", "affected_user_ids TEXT"),
        ("announcements", "team_id VARCHAR(64)"),
        ("announcements", "team_name VARCHAR(150)"),
        ("announcements", "attachment_url VARCHAR(255)"),
        ("announcements", "attachment_name VARCHAR(255)"),
        ("announcements", "attachment_size INTEGER"),
        ("notifications", "query TEXT"),
        ("notifications", "answer TEXT"),
        ("notifications", "answered_by VARCHAR(100)"),
        ("notifications", "ticket_id VARCHAR(64)"),
        ("notifications", "target_user VARCHAR(150)"),
        ("teams", "status VARCHAR(50) DEFAULT 'not_submitted'"),
        ("teams", "github_url VARCHAR(500)"),
        ("teams", "submitted_at VARCHAR(100)"),
    ]
    for tbl, col_def in alterations:
        try:
            session.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col_def};"))
            session.commit()
        except Exception:
            session.rollback()

def migrate_json_to_db(force_overwrite=False):
    """
    Migrates data from existing JSON files into the active database tables.
    Preserves all existing user records, teams, escalations, knowledge items, and timer state.
    """
    print("[Migration] Starting JSON to SQLite Database Migration...")
    results = {}

    with db_session_scope() as session:
        _ensure_all_columns(session)
        # 1. Users Migration
        existing_users_count = session.query(UserDB).count()
        if existing_users_count == 0 or force_overwrite:
            raw_users = _read_json_file("users.json", [])
            user_count = 0
            for u in raw_users:
                # Check if user already exists
                existing = session.query(UserDB).filter(UserDB.id == u.get("id")).first()
                if not existing:
                    user_obj = UserDB(
                        id=u.get("id") or f"usr_{uuid.uuid4().hex[:8]}",
                        username=u.get("username", ""),
                        name=u.get("name", ""),
                        email=u.get("email", ""),
                        password_hash=u.get("passwordHash", ""),
                        role=u.get("role", "participant"),
                        role_title=u.get("roleTitle", "Full-Stack Developer"),
                        bio=u.get("bio", ""),
                        skills=u.get("skills", []),
                        is_verified=bool(u.get("isVerified", False)),
                        verification_code=u.get("verificationCode"),
                        verification_code_expiry=u.get("verificationCodeExpiry"),
                        reset_token=u.get("resetToken"),
                        reset_token_expiry=u.get("resetTokenExpiry"),
                        delete_token=u.get("deleteToken"),
                        delete_token_expiry=u.get("deleteTokenExpiry"),
                        team_id=u.get("teamId"),
                        looking_for_team=bool(u.get("lookingForTeam", True)),
                        created_at=u.get("createdAt")
                    )
                    session.add(user_obj)
                    user_count += 1
            results["users"] = user_count
        else:
            results["users"] = f"Skipped (Already {existing_users_count} in DB)"

        # 2. Teams and Members Migration
        existing_teams_count = session.query(TeamDB).count()
        if existing_teams_count == 0 or force_overwrite:
            raw_teams = _read_json_file("teams.json", [])
            team_count = 0
            member_count = 0
            for t in raw_teams:
                existing_team = session.query(TeamDB).filter(TeamDB.id == t.get("id")).first()
                if not existing_team:
                    team_id = t.get("id") or f"team_{uuid.uuid4().hex[:8]}"
                    team_obj = TeamDB(
                        id=team_id,
                        name=t.get("name", "Unnamed Team"),
                        track=t.get("track", "Track 1: AI & Autonomous Agents"),
                        description=t.get("description", ""),
                        looking_for_teammates=bool(t.get("lookingForTeammates", True)),
                        needed_skills=t.get("neededSkills", []),
                        invite_code=t.get("inviteCode", uuid.uuid4().hex[:6].upper()),
                        status=t.get("status", "not_submitted"),
                        github_url=t.get("githubUrl", ""),
                        submitted_at=t.get("submittedAt", ""),
                        created_at=t.get("createdAt")
                    )
                    session.add(team_obj)
                    team_count += 1

                    # Add members
                    for m in t.get("members", []):
                        mem_obj = TeamMemberDB(
                            id=f"tm_{uuid.uuid4().hex[:8]}",
                            team_id=team_id,
                            user_id=m.get("userId") or m.get("id") or f"usr_{uuid.uuid4().hex[:8]}",
                            name=m.get("name", ""),
                            email=m.get("email", ""),
                            role=m.get("role", "Member"),
                            skills=m.get("skills", []),
                            is_leader=bool(m.get("isLeader", False)),
                            joined_at=m.get("joinedAt")
                        )
                        session.add(mem_obj)
                        member_count += 1
            results["teams"] = team_count
            results["team_members"] = member_count
        else:
            results["teams"] = f"Skipped (Already {existing_teams_count} in DB)"

        # 3. Announcements Migration
        existing_ann_count = session.query(AnnouncementDB).count()
        if existing_ann_count == 0 or force_overwrite:
            raw_ann = _read_json_file("announcements.json", [])
            ann_count = 0
            for a in raw_ann:
                existing = session.query(AnnouncementDB).filter(AnnouncementDB.id == a.get("id")).first()
                if not existing:
                    ann_obj = AnnouncementDB(
                        id=a.get("id") or f"ann_{uuid.uuid4().hex[:8]}",
                        title=a.get("title", ""),
                        message=a.get("message", ""),
                        severity=a.get("severity", "info"),
                        author=a.get("author", "Hackathon Organizers"),
                        created_at=a.get("createdAt", "")
                    )
                    session.add(ann_obj)
                    ann_count += 1
            results["announcements"] = ann_count
        else:
            results["announcements"] = f"Skipped (Already {existing_ann_count} in DB)"

        # 4. Notifications Migration
        existing_notif_count = session.query(NotificationDB).count()
        if existing_notif_count == 0 or force_overwrite:
            raw_notif = _read_json_file("notifications.json", [])
            notif_count = 0
            for n in raw_notif:
                existing = session.query(NotificationDB).filter(NotificationDB.id == n.get("id")).first()
                if not existing:
                    q_text = n.get("query") or n.get("question") or n.get("title") or ""
                    ans_text = n.get("answer") or n.get("response") or n.get("message") or ""
                    notif_obj = NotificationDB(
                        id=n.get("id") or f"notif_{uuid.uuid4().hex[:8]}",
                        user_id=n.get("userId"),
                        title=n.get("title") or (f"Answer to: \"{q_text[:60]}\"" if q_text else "Organizer Q&A Response"),
                        message=ans_text,
                        type=n.get("type", "qa_answer"),
                        query=q_text,
                        answer=ans_text,
                        answered_by=n.get("answeredBy") or n.get("answered_by") or "Campus Copilot Operations",
                        ticket_id=n.get("ticketId") or n.get("ticket_id"),
                        target_user=n.get("targetUser") or n.get("target_user"),
                        is_read=bool(n.get("isRead", False)),
                        link=n.get("link"),
                        created_at=n.get("createdAt") or n.get("timestamp") or datetime.now(timezone.utc).isoformat()
                    )
                    session.add(notif_obj)
                    notif_count += 1
            results["notifications"] = notif_count
        else:
            results["notifications"] = f"Skipped (Already {existing_notif_count} in DB)"

        # 5. FAQ Escalations Migration
        existing_esc_count = session.query(FAQEscalationDB).count()
        if existing_esc_count == 0 or force_overwrite:
            raw_esc = _read_json_file("faq_escalations.json", [])
            esc_count = 0
            for e in raw_esc:
                existing = session.query(FAQEscalationDB).filter(FAQEscalationDB.id == e.get("id")).first()
                if not existing:
                    q_text = e.get("question") or e.get("query") or ""
                    ans_text = e.get("proposedAnswer") or e.get("response") or e.get("answer")
                    rej_text = e.get("rejectionReason") or e.get("rejection_reason")
                    u_email = e.get("userEmail") or e.get("user_email") or ""
                    u_name = e.get("userName") or e.get("user_name") or (u_email.split("@")[0] if u_email else "Participant")
                    esc_obj = FAQEscalationDB(
                        id=e.get("id") or f"esc_{uuid.uuid4().hex[:8]}",
                        question=q_text,
                        proposed_answer=ans_text,
                        user_email=u_email,
                        user_name=u_name,
                        team_name=e.get("teamName"),
                        status=e.get("status", "pending"),
                        rejection_reason=rej_text,
                        broadcasted=bool(e.get("broadcasted", False)),
                        created_at=e.get("createdAt") or e.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                        resolved_at=e.get("resolvedAt") or e.get("resolved_at"),
                        resolved_by=e.get("resolvedBy") or e.get("resolved_by")
                    )
                    session.add(esc_obj)
                    esc_count += 1
            results["escalations"] = esc_count
        else:
            results["escalations"] = f"Skipped (Already {existing_esc_count} in DB)"

        # 6. Knowledge Base Migration
        existing_kb_count = session.query(KnowledgeItemDB).count()
        if existing_kb_count == 0 or force_overwrite:
            raw_kb = _read_json_file("knowledge_base.json", [])
            kb_count = 0
            for k in raw_kb:
                existing = session.query(KnowledgeItemDB).filter(KnowledgeItemDB.id == k.get("id")).first()
                if not existing:
                    kb_obj = KnowledgeItemDB(
                        id=k.get("id") or f"kb_{uuid.uuid4().hex[:8]}",
                        section_number=int(k.get("sectionNumber", 1)),
                        topic=k.get("topic", ""),
                        category=k.get("category", ""),
                        content=k.get("content", ""),
                        raw_section=k.get("rawSection", "")
                    )
                    session.add(kb_obj)
                    kb_count += 1
            results["knowledge_items"] = kb_count
        else:
            results["knowledge_items"] = f"Skipped (Already {existing_kb_count} in DB)"

        # 7. Timer State Migration
        existing_timer = session.query(TimerStateDB).filter(TimerStateDB.id == "master_timer").first()
        if not existing_timer or force_overwrite:
            raw_timer = _read_json_file("timer_state.json", {})
            if not existing_timer:
                timer_obj = TimerStateDB(
                    id="master_timer",
                    status=raw_timer.get("status", "idle"),
                    title=raw_timer.get("title", "Hacking Submission Closes"),
                    duration_hours=float(raw_timer.get("durationHours", 48.0)),
                    duration_text=raw_timer.get("durationText", "48 Hours"),
                    start_time=raw_timer.get("startTime"),
                    end_time=raw_timer.get("endTime"),
                    remaining_seconds=float(raw_timer.get("remainingSeconds", 172800.0)),
                    total_seconds=float(raw_timer.get("totalSeconds", 172800.0)),
                    paused_at=raw_timer.get("pausedAt"),
                    last_updated=raw_timer.get("lastUpdated"),
                    updated_by=raw_timer.get("updatedBy", "System"),
                    handbook_ref=raw_timer.get("handbookRef", "48 Hours continuous sprint")
                )
                session.add(timer_obj)
                results["timer"] = "Created"
            else:
                existing_timer.duration_hours = float(raw_timer.get("durationHours", 48.0))
                existing_timer.duration_text = raw_timer.get("durationText", "48 Hours")
                existing_timer.total_seconds = float(raw_timer.get("totalSeconds", 172800.0))
                results["timer"] = "Updated"
        else:
            results["timer"] = "Preserved"

    print(f"[Migration Complete] Results: {results}")
    return results

if __name__ == "__main__":
    migrate_json_to_db(force_overwrite=True)
