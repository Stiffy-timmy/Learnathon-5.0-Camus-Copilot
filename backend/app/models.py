from sqlalchemy import Column, String, Text, Boolean, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class UserDB(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="participant", nullable=False)
    role_title = Column(String(150), default="Full-Stack Developer")
    bio = Column(Text, nullable=True)
    skills = Column(JSON, nullable=True)
    is_verified = Column(Boolean, default=False)
    verification_code = Column(String(64), nullable=True)
    verification_code_expiry = Column(String(64), nullable=True)
    reset_token = Column(String(64), nullable=True)
    reset_token_expiry = Column(String(64), nullable=True)
    delete_token = Column(String(64), nullable=True)
    delete_token_expiry = Column(String(64), nullable=True)
    team_id = Column(String(64), nullable=True, index=True)
    looking_for_team = Column(Boolean, default=True)
    created_at = Column(String(64), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "name": self.name,
            "email": self.email,
            "passwordHash": self.password_hash,
            "role": self.role,
            "roleTitle": self.role_title or "Full-Stack Developer",
            "bio": self.bio or "",
            "skills": self.skills or [],
            "isVerified": bool(self.is_verified),
            "verificationCode": self.verification_code,
            "verificationCodeExpiry": self.verification_code_expiry,
            "resetToken": self.reset_token,
            "resetTokenExpiry": self.reset_token_expiry,
            "deleteToken": self.delete_token,
            "deleteTokenExpiry": self.delete_token_expiry,
            "teamId": self.team_id,
            "lookingForTeam": bool(self.looking_for_team),
            "createdAt": self.created_at
        }


class TeamDB(Base):
    __tablename__ = "teams"

    id = Column(String(64), primary_key=True)
    name = Column(String(150), nullable=False)
    track = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    looking_for_teammates = Column(Boolean, default=True)
    needed_skills = Column(JSON, nullable=True)
    invite_code = Column(String(20), unique=True, index=True, nullable=False)
    status = Column(String(50), default="not_submitted")
    github_url = Column(String(500), nullable=True)
    submitted_at = Column(String(100), nullable=True)
    disqualification_reason = Column(Text, nullable=True)
    created_at = Column(String(64), nullable=True)

    members = relationship("TeamMemberDB", back_populates="team", cascade="all, delete-orphan", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "track": self.track,
            "description": self.description or "",
            "lookingForTeammates": bool(self.looking_for_teammates),
            "neededSkills": self.needed_skills or [],
            "inviteCode": self.invite_code,
            "status": self.status or "not_submitted",
            "githubUrl": self.github_url or "",
            "submittedAt": self.submitted_at or "",
            "disqualificationReason": self.disqualification_reason or "",
            "createdAt": self.created_at,
            "members": [m.to_dict() for m in self.members] if self.members else []
        }


class TeamMemberDB(Base):
    __tablename__ = "team_members"

    id = Column(String(64), primary_key=True)
    team_id = Column(String(64), ForeignKey("teams.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(String(64), index=True, nullable=False)
    name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False)
    role = Column(String(100), default="Member")
    skills = Column(JSON, nullable=True)
    is_leader = Column(Boolean, default=False)
    joined_at = Column(String(64), nullable=True)

    team = relationship("TeamDB", back_populates="members")

    def to_dict(self):
        return {
            "userId": self.user_id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "skills": self.skills or [],
            "isLeader": bool(self.is_leader)
        }


class AnnouncementDB(Base):
    __tablename__ = "announcements"

    id = Column(String(64), primary_key=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(50), default="info")
    author = Column(String(100), default="Campus Copilot")
    type = Column(String(50), default="broadcast")
    affected_user_ids = Column(Text, nullable=True)
    team_id = Column(String(64), nullable=True)
    team_name = Column(String(150), nullable=True)
    attachment_url = Column(String(255), nullable=True)
    attachment_name = Column(String(255), nullable=True)
    attachment_size = Column(Integer, nullable=True)
    created_at = Column(String(64), nullable=False)

    def to_dict(self):
        import json
        affected_ids = []
        if self.affected_user_ids:
            try:
                affected_ids = json.loads(self.affected_user_ids)
            except Exception:
                affected_ids = []
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "severity": self.severity or "info",
            "author": self.author or "Campus Copilot",
            "broadcastBy": self.author or "Campus Copilot",
            "type": self.type or "broadcast",
            "affectedUserIds": affected_ids,
            "teamId": self.team_id,
            "teamName": self.team_name,
            "attachmentUrl": self.attachment_url,
            "attachmentName": self.attachment_name,
            "attachmentSize": self.attachment_size,
            "createdAt": self.created_at,
            "timestamp": self.created_at
        }


class NotificationDB(Base):
    __tablename__ = "notifications"

    id = Column(String(64), primary_key=True)
    user_id = Column(String(64), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    type = Column(String(50), default="info")
    query = Column(Text, nullable=True)
    answer = Column(Text, nullable=True)
    answered_by = Column(String(100), nullable=True)
    ticket_id = Column(String(64), nullable=True)
    target_user = Column(String(150), nullable=True)
    is_read = Column(Boolean, default=False)
    link = Column(String(255), nullable=True)
    created_at = Column(String(64), nullable=False)

    def to_dict(self):
        created_time = self.created_at or datetime.now(timezone.utc).isoformat()
        return {
            "id": self.id,
            "userId": self.user_id,
            "title": self.title,
            "message": self.message or self.answer or "",
            "type": self.type or "info",
            "query": self.query or self.title or "",
            "answer": self.answer or self.message or "",
            "answeredBy": self.answered_by or "Campus Copilot",
            "ticketId": self.ticket_id,
            "targetUser": self.target_user,
            "isRead": bool(self.is_read),
            "link": self.link,
            "createdAt": created_time,
            "timestamp": created_time
        }


class FAQEscalationDB(Base):
    __tablename__ = "faq_escalations"

    id = Column(String(64), primary_key=True)
    question = Column(Text, nullable=False)
    proposed_answer = Column(Text, nullable=True)
    user_email = Column(String(150), nullable=False)
    user_name = Column(String(150), nullable=False)
    team_name = Column(String(150), nullable=True)
    status = Column(String(50), default="pending", index=True)
    urgency_score = Column(Integer, default=50)
    urgency_level = Column(String(50), default="medium")
    rejection_reason = Column(Text, nullable=True)
    broadcasted = Column(Boolean, default=False)
    created_at = Column(String(64), nullable=False)
    resolved_at = Column(String(64), nullable=True)
    resolved_by = Column(String(100), nullable=True)

    def to_dict(self):
        created_time = self.created_at or datetime.now(timezone.utc).isoformat()
        
        # Calculate fallback urgency score if not present
        score = self.urgency_score if self.urgency_score is not None else 50
        level = self.urgency_level if self.urgency_level else "medium"
        if not self.urgency_score and self.question:
            q_lower = self.question.lower()
            if any(k in q_lower for k in ["emergency", "medical", "disqualified", "submission error", "cannot submit", "submission failed", "fire", "deadline", "urgent"]):
                score, level = 95, "critical"
            elif any(k in q_lower for k in ["api key", "hardware", "mentor", "wifi down", "login failed"]):
                score, level = 78, "high"
            elif any(k in q_lower for k in ["schedule", "catering", "workshop", "lunch", "dinner"]):
                score, level = 52, "medium"

        return {
            "id": self.id,
            "question": self.question or "",
            "query": self.question or "",
            "proposedAnswer": self.proposed_answer,
            "response": self.proposed_answer or self.rejection_reason or "",
            "answer": self.proposed_answer or "",
            "userEmail": self.user_email or "",
            "userName": self.user_name or (self.user_email.split('@')[0] if self.user_email else "Participant"),
            "teamName": self.team_name,
            "status": self.status or "pending",
            "urgencyScore": score,
            "urgencyLevel": level,
            "priority": level,
            "rejectionReason": self.rejection_reason,
            "broadcasted": bool(self.broadcasted),
            "createdAt": created_time,
            "timestamp": created_time,
            "resolvedAt": self.resolved_at,
            "resolvedBy": self.resolved_by
        }


class KnowledgeItemDB(Base):
    __tablename__ = "knowledge_items"

    id = Column(String(64), primary_key=True)
    section_number = Column(Integer, default=1)
    topic = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    raw_section = Column(Text, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "sectionNumber": self.section_number,
            "topic": self.topic,
            "category": self.category,
            "content": self.content,
            "rawSection": self.raw_section
        }


class TimerStateDB(Base):
    __tablename__ = "timer_state"

    id = Column(String(64), primary_key=True, default="master_timer")
    status = Column(String(50), default="idle")
    title = Column(String(255), default="Hacking Submission Closes")
    duration_hours = Column(Float, default=48.0)
    duration_text = Column(String(100), default="48 Hours")
    start_time = Column(String(64), nullable=True)
    end_time = Column(String(64), nullable=True)
    remaining_seconds = Column(Float, default=172800.0)
    total_seconds = Column(Float, default=172800.0)
    paused_at = Column(String(64), nullable=True)
    last_updated = Column(String(64), nullable=True)
    updated_by = Column(String(100), default="System")
    handbook_ref = Column(String(255), default="48 Hours continuous sprint")

    def to_dict(self):
        return {
            "status": self.status,
            "title": self.title,
            "durationHours": self.duration_hours,
            "durationText": self.duration_text,
            "startTime": self.start_time,
            "endTime": self.end_time,
            "remainingSeconds": self.remaining_seconds,
            "totalSeconds": self.total_seconds,
            "pausedAt": self.paused_at,
            "lastUpdated": self.last_updated,
            "updatedBy": self.updated_by,
            "handbookRef": self.handbook_ref
        }
