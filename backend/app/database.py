import os
import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import text
from app.config import DATA_DIR
from app.db_session import db_session_scope
from app.models import (
    UserDB, TeamDB, TeamMemberDB, AnnouncementDB, 
    NotificationDB, FAQEscalationDB, KnowledgeItemDB, TimerStateDB
)
from app.migration import migrate_json_to_db

# Run auto-migration check on startup
try:
    migrate_json_to_db(force_overwrite=False)
except Exception as e:
    print(f"[Database] Auto-migration notice: {e}")

# ==========================================
# PENDING REGISTRATIONS (Unverified Temp Store)
# ==========================================
PENDING_REGISTRATIONS_FILE = os.path.join(DATA_DIR, "pending_registrations.json")

def get_pending_registrations() -> dict:
    if not os.path.exists(PENDING_REGISTRATIONS_FILE):
        return {}
    try:
        with open(PENDING_REGISTRATIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def save_pending_registration(email: str, reg_data: dict):
    pending = get_pending_registrations()
    # Expire old entries (> 24 hours) to keep storage clean
    now_iso = datetime.now(timezone.utc).isoformat()
    cleaned = {}
    for k, v in pending.items():
        exp = v.get("expiry")
        if exp and exp > now_iso:
            cleaned[k] = v
    cleaned[email.lower().strip()] = reg_data
    try:
        with open(PENDING_REGISTRATIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(cleaned, f, indent=2)
    except Exception as e:
        print(f"[Database] Error saving pending registration: {e}")

def get_pending_registration(email: str) -> dict:
    pending = get_pending_registrations()
    return pending.get(email.lower().strip())

def delete_pending_registration(email: str):
    pending = get_pending_registrations()
    clean_email = email.lower().strip()
    if clean_email in pending:
        del pending[clean_email]
        try:
            with open(PENDING_REGISTRATIONS_FILE, "w", encoding="utf-8") as f:
                json.dump(pending, f, indent=2)
        except Exception as e:
            print(f"[Database] Error deleting pending registration: {e}")

# ==========================================
# USERS
# ==========================================
def get_users():
    with db_session_scope() as session:
        users = session.query(UserDB).all()
        return [u.to_dict() for u in users]

def save_users(users_list):
    with db_session_scope() as session:
        existing_ids = set()
        for u in users_list:
            u_id = u.get("id") or f"usr_{uuid.uuid4().hex[:8]}"
            existing_ids.add(u_id)
            user_obj = session.query(UserDB).filter(UserDB.id == u_id).first()
            if not user_obj:
                user_obj = UserDB(id=u_id)
                session.add(user_obj)
            
            user_obj.username = u.get("username", "")
            user_obj.name = u.get("name", "")
            user_obj.email = u.get("email", "")
            user_obj.password_hash = u.get("passwordHash", "")
            user_obj.role = u.get("role", "participant")
            user_obj.role_title = u.get("roleTitle", "Full-Stack Developer")
            user_obj.bio = u.get("bio", "")
            user_obj.skills = u.get("skills", [])
            user_obj.is_verified = bool(u.get("isVerified", False))
            user_obj.verification_code = u.get("verificationCode")
            user_obj.verification_code_expiry = u.get("verificationCodeExpiry")
            user_obj.reset_token = u.get("resetToken")
            user_obj.reset_token_expiry = u.get("resetTokenExpiry")
            user_obj.delete_token = u.get("deleteToken")
            user_obj.delete_token_expiry = u.get("deleteTokenExpiry")
            user_obj.team_id = u.get("teamId")
            user_obj.looking_for_team = bool(u.get("lookingForTeam", True))
            user_obj.created_at = u.get("createdAt")

        # Delete users removed from the list
        all_db_users = session.query(UserDB).all()
        for u_db in all_db_users:
            if u_db.id not in existing_ids:
                session.delete(u_db)

# ==========================================
# TEAMS
# ==========================================
def ensure_team_columns(session):
    for col_def in [
        "disqualification_reason TEXT"
    ]:
        try:
            session.execute(text(f"ALTER TABLE teams ADD COLUMN {col_def};"))
            session.commit()
        except Exception:
            session.rollback()

def get_teams():
    with db_session_scope() as session:
        ensure_team_columns(session)
        teams = session.query(TeamDB).all()
        return [t.to_dict() for t in teams]

def save_teams(teams_list):
    with db_session_scope() as session:
        ensure_team_columns(session)
        existing_team_ids = set()
        for t in teams_list:
            t_id = t.get("id") or f"team_{uuid.uuid4().hex[:8]}"
            existing_team_ids.add(t_id)
            team_obj = session.query(TeamDB).filter(TeamDB.id == t_id).first()
            if not team_obj:
                team_obj = TeamDB(id=t_id, invite_code=t.get("inviteCode", uuid.uuid4().hex[:6].upper()))
                session.add(team_obj)

            team_obj.name = t.get("name", "Unnamed Team")
            team_obj.track = t.get("track", "Track 1: AI & Autonomous Agents")
            team_obj.description = t.get("description", "")
            team_obj.looking_for_teammates = bool(t.get("lookingForTeammates", True))
            team_obj.needed_skills = t.get("neededSkills", [])
            team_obj.invite_code = t.get("inviteCode", team_obj.invite_code)
            team_obj.status = t.get("status", "not_submitted")
            team_obj.github_url = t.get("githubUrl") or t.get("github_url") or ""
            team_obj.submitted_at = t.get("submittedAt") or t.get("submitted_at") or ""
            team_obj.disqualification_reason = t.get("disqualificationReason") or t.get("disqualification_reason") or ""
            team_obj.created_at = t.get("createdAt")

            # Replace/sync members
            session.query(TeamMemberDB).filter(TeamMemberDB.team_id == t_id).delete()
            for m in t.get("members", []):
                mem_obj = TeamMemberDB(
                    id=f"tm_{uuid.uuid4().hex[:8]}",
                    team_id=t_id,
                    user_id=m.get("userId") or m.get("id") or f"usr_{uuid.uuid4().hex[:8]}",
                    name=m.get("name", ""),
                    email=m.get("email", ""),
                    role=m.get("role", "Member"),
                    skills=m.get("skills", []),
                    is_leader=bool(m.get("isLeader", False)),
                    joined_at=m.get("joinedAt")
                )
                session.add(mem_obj)

        # Delete removed teams
        all_db_teams = session.query(TeamDB).all()
        for t_db in all_db_teams:
            if t_db.id not in existing_team_ids:
                session.delete(t_db)

def check_and_disqualify_unsubmitted_teams() -> int:
    """
    Automatically disqualifies all teams that have not submitted a project yet (status != 'submitted').
    Returns the count of teams that were updated to disqualified.
    """
    with db_session_scope() as session:
        ensure_team_columns(session)
        unsubmitted_teams = session.query(TeamDB).filter(
            TeamDB.status != "submitted",
            TeamDB.status != "disqualified"
        ).all()
        count = len(unsubmitted_teams)
        for t in unsubmitted_teams:
            t.status = "disqualified"
            if not t.disqualification_reason:
                t.disqualification_reason = "Automatic disqualification: Hackathon submission timer concluded before project repository submission."
        return count

# ==========================================
# ESCALATIONS
# ==========================================
def ensure_escalation_columns(session):
    for col_def in [
        "urgency_score INTEGER DEFAULT 50",
        "urgency_level VARCHAR(50) DEFAULT 'medium'"
    ]:
        try:
            session.execute(text(f"ALTER TABLE faq_escalations ADD COLUMN {col_def};"))
            session.commit()
        except Exception:
            session.rollback()

def get_escalations():
    with db_session_scope() as session:
        ensure_escalation_columns(session)
        escalations = session.query(FAQEscalationDB).order_by(FAQEscalationDB.created_at.desc()).all()
        return [e.to_dict() for e in escalations]

def save_escalations(escalations_list):
    with db_session_scope() as session:
        ensure_escalation_columns(session)
        existing_ids = set()
        for e in escalations_list:
            e_id = e.get("id") or f"esc_{uuid.uuid4().hex[:8]}"
            existing_ids.add(e_id)
            esc_obj = session.query(FAQEscalationDB).filter(FAQEscalationDB.id == e_id).first()
            if not esc_obj:
                esc_obj = FAQEscalationDB(id=e_id)
                session.add(esc_obj)

            q_text = e.get("question") or e.get("query") or ""
            ans_text = e.get("proposedAnswer") or e.get("response") or e.get("answer")
            rej_text = e.get("rejectionReason") or e.get("rejection_reason")
            u_email = e.get("userEmail") or e.get("user_email") or ""
            u_name = e.get("userName") or e.get("user_name") or (u_email.split("@")[0] if u_email else "Participant")

            esc_obj.question = q_text
            esc_obj.proposed_answer = ans_text
            esc_obj.user_email = u_email
            esc_obj.user_name = u_name
            esc_obj.team_name = e.get("teamName") or e.get("team_name")
            esc_obj.status = e.get("status", "pending")
            esc_obj.urgency_score = e.get("urgencyScore", 50)
            esc_obj.urgency_level = e.get("urgencyLevel", "medium")
            esc_obj.rejection_reason = rej_text
            esc_obj.broadcasted = bool(e.get("broadcasted", False))
            esc_obj.created_at = e.get("createdAt") or e.get("timestamp") or datetime.now(timezone.utc).isoformat()
            esc_obj.resolved_at = e.get("resolvedAt") or e.get("resolved_at")
            esc_obj.resolved_by = e.get("resolvedBy") or e.get("resolved_by")

        all_db_esc = session.query(FAQEscalationDB).all()
        for e_db in all_db_esc:
            if e_db.id not in existing_ids:
                session.delete(e_db)

# ==========================================
# ANNOUNCEMENTS
# ==========================================
def ensure_announcement_columns(session):
    for col_def in [
        "type VARCHAR(50) DEFAULT 'broadcast'",
        "affected_user_ids TEXT",
        "team_id VARCHAR(64)",
        "team_name VARCHAR(150)",
        "attachment_url VARCHAR(255)",
        "attachment_name VARCHAR(255)",
        "attachment_size INTEGER"
    ]:
        col_name = col_def.split()[0]
        try:
            session.execute(text(f"ALTER TABLE announcements ADD COLUMN {col_def};"))
            session.commit()
        except Exception:
            session.rollback()

def get_announcements():
    with db_session_scope() as session:
        ensure_announcement_columns(session)
        announcements = session.query(AnnouncementDB).order_by(AnnouncementDB.created_at.desc()).all()
        return [a.to_dict() for a in announcements]

def save_announcements(announcements_list):
    with db_session_scope() as session:
        ensure_announcement_columns(session)
        existing_ids = set()
        for a in announcements_list:
            a_id = a.get("id") or f"ann_{uuid.uuid4().hex[:8]}"
            existing_ids.add(a_id)
            ann_obj = session.query(AnnouncementDB).filter(AnnouncementDB.id == a_id).first()
            if not ann_obj:
                ann_obj = AnnouncementDB(id=a_id)
                session.add(ann_obj)

            ann_obj.title = a.get("title", "")
            ann_obj.message = a.get("message", "")
            ann_obj.severity = a.get("severity", "info")
            ann_obj.author = a.get("author") or a.get("broadcastBy") or "Campus Copilot"
            ann_obj.type = a.get("type", "broadcast")
            
            aff = a.get("affectedUserIds") or a.get("affected_user_ids")
            if isinstance(aff, list):
                ann_obj.affected_user_ids = json.dumps(aff)
            elif isinstance(aff, str):
                ann_obj.affected_user_ids = aff
            else:
                ann_obj.affected_user_ids = None

            ann_obj.team_id = a.get("teamId") or a.get("team_id")
            ann_obj.team_name = a.get("teamName") or a.get("team_name")
            ann_obj.attachment_url = a.get("attachmentUrl") or a.get("attachment_url")
            ann_obj.attachment_name = a.get("attachmentName") or a.get("attachment_name")
            ann_obj.attachment_size = a.get("attachmentSize") or a.get("attachment_size")
            ann_obj.created_at = a.get("createdAt") or a.get("timestamp") or datetime.now(timezone.utc).isoformat()

        all_db_ann = session.query(AnnouncementDB).all()
        for a_db in all_db_ann:
            if a_db.id not in existing_ids:
                session.delete(a_db)

# ==========================================
# KNOWLEDGE BASE
# ==========================================
def get_knowledge_base():
    with db_session_scope() as session:
        kb_items = session.query(KnowledgeItemDB).order_by(KnowledgeItemDB.section_number.asc()).all()
        return [k.to_dict() for k in kb_items]

def save_knowledge_base(kb_list):
    with db_session_scope() as session:
        existing_ids = set()
        for k in kb_list:
            k_id = k.get("id") or f"kb_{uuid.uuid4().hex[:8]}"
            existing_ids.add(k_id)
            kb_obj = session.query(KnowledgeItemDB).filter(KnowledgeItemDB.id == k_id).first()
            if not kb_obj:
                kb_obj = KnowledgeItemDB(id=k_id)
                session.add(kb_obj)

            kb_obj.section_number = int(k.get("sectionNumber", 1))
            kb_obj.topic = k.get("topic", "")
            kb_obj.category = k.get("category", "")
            kb_obj.content = k.get("content", "")
            kb_obj.raw_section = k.get("rawSection", "")

        all_db_kb = session.query(KnowledgeItemDB).all()
        for k_db in all_db_kb:
            if k_db.id not in existing_ids:
                session.delete(k_db)

# ==========================================
# NOTIFICATIONS
# ==========================================
def ensure_notification_columns(session):
    for col_def in [
        "query TEXT",
        "answer TEXT",
        "answered_by VARCHAR(100)",
        "ticket_id VARCHAR(64)",
        "target_user VARCHAR(150)"
    ]:
        try:
            session.execute(text(f"ALTER TABLE notifications ADD COLUMN {col_def};"))
            session.commit()
        except Exception:
            session.rollback()

def get_notifications():
    with db_session_scope() as session:
        ensure_notification_columns(session)
        notifs = session.query(NotificationDB).order_by(NotificationDB.created_at.desc()).limit(5).all()
        return [n.to_dict() for n in notifs]

def save_notifications(notifications_list):
    with db_session_scope() as session:
        ensure_notification_columns(session)
        # Keep strictly top 5 recent notifications, oldest automatically pruned
        capped = notifications_list[:5]
        existing_ids = set()
        saved_dicts = []
        for n in capped:
            n_id = n.get("id") or f"notif_{uuid.uuid4().hex[:8]}"
            existing_ids.add(n_id)
            notif_obj = session.query(NotificationDB).filter(NotificationDB.id == n_id).first()
            if not notif_obj:
                notif_obj = NotificationDB(id=n_id)
                session.add(notif_obj)

            q_text = n.get("query") or n.get("question") or n.get("title") or ""
            ans_text = n.get("answer") or n.get("response") or n.get("message") or ""

            notif_obj.user_id = n.get("userId") or n.get("user_id")
            notif_obj.title = n.get("title") or (f"Answer to: \"{q_text[:60]}\"" if q_text else "Organizer Q&A Response")
            notif_obj.message = ans_text
            notif_obj.type = n.get("type", "qa_answer")
            notif_obj.query = q_text
            notif_obj.answer = ans_text
            notif_obj.answered_by = n.get("answeredBy") or n.get("answered_by") or "Campus Copilot Operations"
            notif_obj.ticket_id = n.get("ticketId") or n.get("ticket_id")
            notif_obj.target_user = n.get("targetUser") or n.get("target_user")
            notif_obj.is_read = bool(n.get("isRead", False))
            notif_obj.link = n.get("link")
            notif_obj.created_at = n.get("createdAt") or n.get("timestamp") or datetime.now(timezone.utc).isoformat()
            saved_dicts.append(notif_obj.to_dict())

        all_db_notifs = session.query(NotificationDB).all()
        for n_db in all_db_notifs:
            if n_db.id not in existing_ids:
                session.delete(n_db)

        # Sync to notifications.json
        try:
            import os
            json_path = os.path.join(DATA_DIR, "notifications.json")
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(saved_dicts, f, indent=2)
        except Exception as e:
            print(f"[Database] Error syncing notifications.json: {e}")

# ==========================================
# TIMER STATE
# ==========================================
def get_timer_state():
    default_timer = {
        "status": "idle",
        "title": "Hacking Submission Closes",
        "durationHours": 48.0,
        "durationText": "48 Hours",
        "startTime": None,
        "endTime": None,
        "remainingSeconds": 48.0 * 3600,
        "totalSeconds": 48.0 * 3600,
        "pausedAt": None,
        "lastUpdated": None,
        "updatedBy": "System",
        "handbookRef": "48 Hours continuous sprint"
    }
    with db_session_scope() as session:
        timer_obj = session.query(TimerStateDB).filter(TimerStateDB.id == "master_timer").first()
        if timer_obj:
            return timer_obj.to_dict()
        else:
            new_timer = TimerStateDB(id="master_timer")
            session.add(new_timer)
            return default_timer

def save_timer_state(timer_dict):
    with db_session_scope() as session:
        timer_obj = session.query(TimerStateDB).filter(TimerStateDB.id == "master_timer").first()
        if not timer_obj:
            timer_obj = TimerStateDB(id="master_timer")
            session.add(timer_obj)

        timer_obj.status = timer_dict.get("status", "idle")
        timer_obj.title = timer_dict.get("title", "Hacking Submission Closes")
        timer_obj.duration_hours = float(timer_dict.get("durationHours", 48.0))
        timer_obj.duration_text = timer_dict.get("durationText", "48 Hours")
        timer_obj.start_time = timer_dict.get("startTime")
        timer_obj.end_time = timer_dict.get("endTime")
        timer_obj.remaining_seconds = float(timer_dict.get("remainingSeconds", 172800.0))
        timer_obj.total_seconds = float(timer_dict.get("totalSeconds", 172800.0))
        timer_obj.paused_at = timer_dict.get("pausedAt")
        timer_obj.last_updated = timer_dict.get("lastUpdated")
        timer_obj.updated_by = timer_dict.get("updatedBy", "System")
        timer_obj.handbook_ref = timer_dict.get("handbookRef", "48 Hours continuous sprint")


# ==========================================
# CASCADE USER DELETION
# ==========================================
def delete_user_cascade(user_id: str) -> dict:
    """
    Permanently deletes a single user by user_id and cascades across all tables:
    1. Removes user from UserDB table.
    2. Removes user from TeamMemberDB.
    3. If user's team has 0 members left, deletes team from TeamDB.
    4. If user was team leader and other members remain, reassigns leadership to the next member.
    5. Deletes FAQEscalationDB tickets submitted by user.
    6. Deletes NotificationDB items targeted at this user.
    7. Cleans user_id from AnnouncementDB.affected_user_ids.
    """
    with db_session_scope() as session:
        user_obj = session.query(UserDB).filter(UserDB.id == user_id).first()
        if not user_obj:
            return {"success": False, "message": f"User with id '{user_id}' not found."}
        
        user_email = (user_obj.email or "").lower()
        user_username = (user_obj.username or "").lower()
        user_name = user_obj.name or ""
        team_id = user_obj.team_id

        # 1. Delete from users table
        session.delete(user_obj)

        # 2. Delete from team_members table
        user_memberships = session.query(TeamMemberDB).filter(
            (TeamMemberDB.user_id == user_id) | (TeamMemberDB.email.ilike(user_email))
        ).all()
        
        affected_team_ids = set()
        if team_id:
            affected_team_ids.add(team_id)
        for tm in user_memberships:
            affected_team_ids.add(tm.team_id)
            session.delete(tm)
            
        session.flush()

        # 3 & 4. Handle affected teams
        teams_disbanded = []
        leaders_promoted = []
        for t_id in affected_team_ids:
            remaining_members = session.query(TeamMemberDB).filter(TeamMemberDB.team_id == t_id).all()
            team_obj = session.query(TeamDB).filter(TeamDB.id == t_id).first()
            if not remaining_members:
                if team_obj:
                    teams_disbanded.append(team_obj.name)
                    session.delete(team_obj)
            else:
                # Check if leadership needs to be reassigned
                has_leader = any(m.is_leader for m in remaining_members)
                if not has_leader and remaining_members:
                    remaining_members[0].is_leader = True
                    leaders_promoted.append(f"{remaining_members[0].name} ({team_obj.name if team_obj else t_id})")

        # 5. Delete FAQ escalations by this user
        deleted_escalations_count = session.query(FAQEscalationDB).filter(
            (FAQEscalationDB.user_email.ilike(user_email)) | 
            (FAQEscalationDB.user_name == user_name)
        ).delete(synchronize_session=False)

        # 6. Delete notifications targeted at user
        deleted_notifications_count = session.query(NotificationDB).filter(
            (NotificationDB.user_id == user_id) |
            (NotificationDB.target_user.ilike(user_email)) |
            (NotificationDB.target_user.ilike(user_username))
        ).delete(synchronize_session=False)

        # 7. Clean up announcements affected_user_ids
        announcements = session.query(AnnouncementDB).all()
        for ann in announcements:
            if ann.affected_user_ids:
                try:
                    ids = json.loads(ann.affected_user_ids)
                    if isinstance(ids, list) and user_id in ids:
                        ids.remove(user_id)
                        ann.affected_user_ids = json.dumps(ids) if ids else None
                except Exception:
                    pass

        return {
            "success": True,
            "message": f"User '{user_name}' ({user_email}) and all associated data permanently deleted.",
            "deletedUserId": user_id,
            "deletedEmail": user_email,
            "teamsDisbanded": teams_disbanded,
            "leadersPromoted": leaders_promoted,
            "deletedEscalationsCount": deleted_escalations_count,
            "deletedNotificationsCount": deleted_notifications_count
        }


def batch_delete_users_cascade(user_ids: list) -> dict:
    """
    Permanently deletes multiple users by user_ids with full cascade in one atomic transaction.
    """
    if not user_ids:
        return {"success": False, "message": "No user IDs provided.", "deletedCount": 0}

    results = []
    deleted_count = 0
    with db_session_scope() as session:
        for uid in user_ids:
            user_obj = session.query(UserDB).filter(UserDB.id == uid).first()
            if not user_obj:
                continue

            user_id = user_obj.id
            user_email = (user_obj.email or "").lower()
            user_username = (user_obj.username or "").lower()
            user_name = user_obj.name or ""
            team_id = user_obj.team_id

            session.delete(user_obj)
            deleted_count += 1

            # Team members
            user_memberships = session.query(TeamMemberDB).filter(
                (TeamMemberDB.user_id == user_id) | (TeamMemberDB.email.ilike(user_email))
            ).all()
            
            affected_team_ids = set()
            if team_id:
                affected_team_ids.add(team_id)
            for tm in user_memberships:
                affected_team_ids.add(tm.team_id)
                session.delete(tm)
                
            session.flush()

            # Teams
            for t_id in affected_team_ids:
                remaining_members = session.query(TeamMemberDB).filter(TeamMemberDB.team_id == t_id).all()
                team_obj = session.query(TeamDB).filter(TeamDB.id == t_id).first()
                if not remaining_members and team_obj:
                    session.delete(team_obj)
                elif remaining_members:
                    if not any(m.is_leader for m in remaining_members):
                        remaining_members[0].is_leader = True

            # FAQ escalations
            session.query(FAQEscalationDB).filter(
                (FAQEscalationDB.user_email.ilike(user_email)) | 
                (FAQEscalationDB.user_name == user_name)
            ).delete(synchronize_session=False)

            # Notifications
            session.query(NotificationDB).filter(
                (NotificationDB.user_id == user_id) |
                (NotificationDB.target_user.ilike(user_email)) |
                (NotificationDB.target_user.ilike(user_username))
            ).delete(synchronize_session=False)

            # Announcements
            announcements = session.query(AnnouncementDB).all()
            for ann in announcements:
                if ann.affected_user_ids:
                    try:
                        ids = json.loads(ann.affected_user_ids)
                        if isinstance(ids, list) and user_id in ids:
                            ids.remove(user_id)
                            ann.affected_user_ids = json.dumps(ids) if ids else None
                    except Exception:
                        pass

            results.append({"id": user_id, "name": user_name, "email": user_email})

    return {
        "success": True,
        "message": f"Successfully deleted {deleted_count} participant(s) and all associated records.",
        "deletedCount": deleted_count,
        "deletedUsers": results
    }

