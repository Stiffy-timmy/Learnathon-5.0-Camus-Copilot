import os
import io
import json
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Group
from app.config import DATA_DIR
from app.database import get_users, get_teams

CERTIFICATES_FILE = os.path.join(DATA_DIR, "certificates.json")
CERT_CONFIG_FILE = os.path.join(DATA_DIR, "certificate_config.json")

DEFAULT_CERT_CONFIG = {
    "eventName": "GIETU Smart Hackathon 2026",
    "certificateTitle": "CERTIFICATE OF PARTICIPATION",
    "organizer": "GIET University & CampusCopilot Agentic Operations",
    "achievementType": "Official Hackathon Competitor",
    "isUnlocked": False,
    "signatory1Name": "Dr. A. K. Sharma",
    "signatory1Title": "Convener & Head of CSE",
    "signatory2Name": "Prof. S. R. Patnaik",
    "signatory2Title": "Lead Hackathon Organizer"
}

def get_certificate_config() -> Dict[str, Any]:
    if not os.path.exists(CERT_CONFIG_FILE):
        return DEFAULT_CERT_CONFIG
    try:
        with open(CERT_CONFIG_FILE, "r", encoding="utf-8") as f:
            cfg = json.load(f)
            for k, v in DEFAULT_CERT_CONFIG.items():
                if k not in cfg:
                    cfg[k] = v
            return cfg
    except Exception:
        return DEFAULT_CERT_CONFIG

def update_certificate_config(new_config: Dict[str, Any]) -> Dict[str, Any]:
    current = get_certificate_config()
    current.update(new_config)
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        with open(CERT_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2)
    except Exception as e:
        print(f"[CertificateService] Error saving certificate config: {e}")
    return current

def _load_certificates() -> Dict[str, Any]:
    if not os.path.exists(CERTIFICATES_FILE):
        return {}
    try:
        with open(CERTIFICATES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _save_certificates(certs: Dict[str, Any]):
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        with open(CERTIFICATES_FILE, "w", encoding="utf-8") as f:
            json.dump(certs, f, indent=2)
    except Exception as e:
        print(f"[CertificateService] Error saving certificates: {e}")

def generate_verification_hash(cert_id: str, recipient_email: str, recipient_name: str, issue_date: str) -> str:
    payload = f"{cert_id}:{recipient_email.lower().strip()}:{recipient_name.strip()}:{issue_date}:HACKATHON_2026_SECRET"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16].upper()

def create_or_get_certificate(user_id: str, user_email: str, user_name: str, team_name: Optional[str] = None, track: Optional[str] = None, role_title: Optional[str] = None, achievement_type: Optional[str] = None) -> Dict[str, Any]:
    """
    Creates or returns an existing verifiable certificate for a hackathon participant.
    """
    certs = _load_certificates()
    cfg = get_certificate_config()
    
    clean_email = user_email.lower().strip()
    for cid, cdata in certs.items():
        if cdata.get("recipientEmail", "").lower() == clean_email:
            # Update fields dynamically from latest config & profile
            if team_name and not cdata.get("teamName"):
                cdata["teamName"] = team_name
            if track and not cdata.get("track"):
                cdata["track"] = track
            cdata["eventName"] = cfg.get("eventName", cdata.get("eventName", "GIETU Smart Hackathon 2026"))
            cdata["certificateTitle"] = cfg.get("certificateTitle", "CERTIFICATE OF PARTICIPATION")
            _save_certificates(certs)
            return cdata
            
    # Generate new certificate
    cert_id = f"CERT-2026-{uuid.uuid4().hex[:8].upper()}"
    issue_date = datetime.now(timezone.utc).strftime("%B %d, %Y")
    issue_iso = datetime.now(timezone.utc).isoformat()
    verification_hash = generate_verification_hash(cert_id, clean_email, user_name, issue_date)
    
    role = role_title or "Full-Stack Developer (React / FastAPI / Node)"
    track_title = track or "Open Innovation & Smart Campus"
    t_name = team_name or "Solo Hacker"
    
    cert_data = {
        "id": cert_id,
        "recipientId": user_id,
        "recipientName": user_name,
        "recipientEmail": clean_email,
        "roleTitle": role,
        "teamName": t_name,
        "track": track_title,
        "eventName": cfg.get("eventName", "GIETU Smart Hackathon 2026"),
        "certificateTitle": cfg.get("certificateTitle", "CERTIFICATE OF PARTICIPATION"),
        "organizer": cfg.get("organizer", "GIET University & CampusCopilot Agentic Operations"),
        "achievementType": achievement_type or cfg.get("achievementType", "Participant of Excellence"),
        "issueDate": issue_date,
        "createdAt": issue_iso,
        "verificationHash": verification_hash,
        "verificationUrl": f"/api/certificates/verify/{cert_id}",
        "status": "verified",
        "signatures": [
            {"name": cfg.get("signatory1Name", "Dr. A. K. Sharma"), "title": cfg.get("signatory1Title", "Convener & Head of CSE")},
            {"name": cfg.get("signatory2Name", "Prof. S. R. Patnaik"), "title": cfg.get("signatory2Title", "Lead Hackathon Organizer")}
        ]
    }
    
    certs[cert_id] = cert_data
    _save_certificates(certs)
    return cert_data
    
    cert_data = {
        "id": cert_id,
        "recipientId": user_id,
        "recipientName": user_name,
        "recipientEmail": clean_email,
        "roleTitle": role,
        "teamName": t_name,
        "track": track_title,
        "eventName": "Campus Copilot Hackathon 2026",
        "organizer": "GIETU Dept. of Computer Science & Engineering",
        "achievementType": achievement_type,
        "issueDate": issue_date,
        "createdAt": issue_iso,
        "verificationHash": verification_hash,
        "verificationUrl": f"/api/certificates/verify/{cert_id}",
        "status": "verified",
        "signatures": [
            {"name": "Dr. A. K. Sharma", "title": "Convener & Head of CSE"},
            {"name": "Prof. S. R. Patnaik", "title": "Lead Hackathon Organizer"}
        ]
    }
    
    certs[cert_id] = cert_data
    _save_certificates(certs)
    return cert_data

def get_certificate_by_id(cert_id: str) -> Optional[Dict[str, Any]]:
    certs = _load_certificates()
    return certs.get(cert_id)

def get_certificate_by_email(email: str) -> Optional[Dict[str, Any]]:
    certs = _load_certificates()
    clean_email = email.lower().strip()
    for c in certs.values():
        if c.get("recipientEmail", "").lower() == clean_email:
            return c
    return None

def batch_generate_certificates_for_all_participants() -> List[Dict[str, Any]]:
    """
    Generates verifiable certificates for all registered users and teams.
    """
    users = get_users()
    teams = get_teams()
    team_map = {t["id"]: t for t in teams}
    
    generated = []
    for u in users:
        if u.get("role") != "participant":
            continue
        t_id = u.get("teamId")
        t_name = None
        t_track = None
        if t_id and t_id in team_map:
            t = team_map[t_id]
            t_name = t.get("name")
            t_track = t.get("track")
            
        cert = create_or_get_certificate(
            user_id=u["id"],
            user_email=u["email"],
            user_name=u.get("name", "Participant"),
            team_name=t_name,
            track=t_track,
            role_title=u.get("roleTitle", "Developer"),
            achievement_type="Participant of Excellence"
        )
        generated.append(cert)
        
    return generated

def generate_certificate_pdf(cert_data: Dict[str, Any]) -> io.BytesIO:
    """
    Renders an official vector PDF certificate in landscape letter format.
    """
    buffer = io.BytesIO()
    # Landscape Letter: 11 x 8.5 inches (792 x 612 pt)
    c = canvas.Canvas(buffer, pagesize=landscape(letter))
    width, height = landscape(letter)
    
    # Outer Background: Dark theme gradient simulation with deep slate
    c.setFillColor(colors.HexColor("#090d16"))
    c.rect(0, 0, width, height, fill=1, stroke=0)
    
    # Ornamental Double Gold Border
    c.setStrokeColor(colors.HexColor("#d97706")) # Rich Amber/Gold
    c.setLineWidth(4)
    c.rect(20, 20, width - 40, height - 40, fill=0, stroke=1)
    
    c.setStrokeColor(colors.HexColor("#f59e0b"))
    c.setLineWidth(1)
    c.rect(26, 26, width - 52, height - 52, fill=0, stroke=1)
    
    # Inner Tech Accent Lines
    c.setStrokeColor(colors.HexColor("#6366f1")) # Indigo
    c.setLineWidth(1)
    c.line(40, height - 40, 100, height - 40)
    c.line(40, height - 40, 40, height - 100)
    c.line(width - 40, height - 40, width - 100, height - 40)
    c.line(width - 40, height - 40, width - 40, height - 100)
    c.line(40, 40, 100, 40)
    c.line(40, 40, 40, 100)
    c.line(width - 40, 40, width - 100, 40)
    c.line(width - 40, 40, width - 40, 100)
    
    # Header: Event Organization
    c.setFillColor(colors.HexColor("#06b6d4")) # Cyan
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(width / 2.0, height - 70, "CAMPUS COPILOT • GIET UNIVERSITY • HACKATHON 2026")
    
    # Title: Certificate of Participation / Excellence
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width / 2.0, height - 110, "CERTIFICATE OF ACHIEVEMENT")
    
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.setFont("Helvetica-Oblique", 11)
    c.drawCentredString(width / 2.0, height - 132, "This certificate is proudly awarded to")
    
    # Recipient Name in Bold Gold
    c.setFillColor(colors.HexColor("#fbbf24")) # Vibrant Gold
    c.setFont("Helvetica-Bold", 26)
    name_str = cert_data.get("recipientName", "Distinguished Hacker")
    c.drawCentredString(width / 2.0, height - 175, name_str)
    
    # Subtle underline under name
    c.setStrokeColor(colors.HexColor("#d97706"))
    c.setLineWidth(1.5)
    name_w = c.stringWidth(name_str, "Helvetica-Bold", 26)
    c.line((width - name_w) / 2.0 - 20, height - 185, (width + name_w) / 2.0 + 20, height - 185)
    
    # Body text
    team_name = cert_data.get("teamName") or "Solo Pioneer"
    track_name = cert_data.get("track") or "Artificial Intelligence & Autonomous Agents"
    role_title = cert_data.get("roleTitle") or "Developer"
    
    c.setFillColor(colors.HexColor("#cbd5e1"))
    c.setFont("Helvetica", 11)
    line1 = f"for demonstrating technical innovation and outstanding engineering excellence in the role of"
    line2 = f"'{role_title}' as an active member of Team '{team_name}'"
    line3 = f"in {track_name} during the 48-Hour Continuous Sprint."
    
    c.drawCentredString(width / 2.0, height - 220, line1)
    c.drawCentredString(width / 2.0, height - 238, line2)
    c.drawCentredString(width / 2.0, height - 256, line3)
    
    # Verification Badge Box
    c.setFillColor(colors.HexColor("#1e293b"))
    c.setStrokeColor(colors.HexColor("#334155"))
    c.setLineWidth(1)
    c.roundRect(width / 2.0 - 180, height - 330, 360, 50, 6, fill=1, stroke=1)
    
    c.setFillColor(colors.HexColor("#10b981")) # Emerald
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(width / 2.0, height - 296, f"✓ VERIFIED CREDENTIAL • ID: {cert_data.get('id')}")
    
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.setFont("Courier-Bold", 8)
    c.drawCentredString(width / 2.0, height - 314, f"HASH: {cert_data.get('verificationHash')} • ISSUED: {cert_data.get('issueDate')}")
    
    # Signatures
    # Left Signature
    c.setStrokeColor(colors.HexColor("#64748b"))
    c.setLineWidth(1)
    c.line(80, 85, 260, 85)
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(80, 70, "Dr. A. K. Sharma")
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.setFont("Helvetica", 8)
    c.drawString(80, 56, "Head of Department, CSE")
    c.drawString(80, 44, "GIET University")
    
    # Right Signature
    c.setStrokeColor(colors.HexColor("#64748b"))
    c.setLineWidth(1)
    c.line(width - 260, 85, width - 80, 85)
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(width - 260, 70, "Prof. S. R. Patnaik")
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.setFont("Helvetica", 8)
    c.drawString(width - 260, 56, "Convener & Hackathon Chair")
    c.drawString(width - 260, 44, "Campus Copilot AI Operations")
    
    # Official Seal / Medal in the bottom center
    c.setFillColor(colors.HexColor("#d97706"))
    c.circle(width / 2.0, 75, 22, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#fbbf24"))
    c.circle(width / 2.0, 75, 18, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#090d16"))
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(width / 2.0, 72, "2026")
    
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer
