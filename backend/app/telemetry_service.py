import os
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from app.config import DATA_DIR
from app.database import get_timer_state, get_teams, get_users, get_escalations

LOGISTICS_FILE = os.path.join(DATA_DIR, "logistics.json")

DEFAULT_LOGISTICS = {
    "mentors": [
        {
            "id": "mentor_1",
            "name": "Dr. Sarah Chen",
            "title": "AI / ML Architect • DeepMind Alum",
            "status": "Available Now",
            "statusType": "available",
            "slotTime": "15 mins (Immediate)",
            "skills": ["PyTorch", "RAG", "LangChain", "FastAPI"]
        },
        {
            "id": "mentor_2",
            "name": "Alex Rivera",
            "title": "Full-Stack Tech Lead • Vercel Ecosystem",
            "status": "Slot @ 14:00",
            "statusType": "slot",
            "slotTime": "Slot @ 14:00",
            "skills": ["React 19", "Next.js", "Solidity", "Tailwind"]
        },
        {
            "id": "mentor_3",
            "name": "Elena Rostova",
            "title": "Hardware & IoT Specialist • Robotics Lab Lead",
            "status": "Available Now",
            "statusType": "available",
            "slotTime": "15 mins (Immediate)",
            "skills": ["Raspberry Pi", "Arduino", "Sensors", "MQTT"]
        },
        {
            "id": "mentor_4",
            "name": "Marcus Vance",
            "title": "Cloud & DevOps Architect • AWS Community Hero",
            "status": "Slot @ 15:30",
            "statusType": "slot",
            "slotTime": "Slot @ 15:30",
            "skills": ["Docker", "Kubernetes", "AWS", "CI/CD"]
        }
    ],
    "apiKeys": [
        {
            "id": "key_groq",
            "provider": "Groq Llama 3.3 (Fast Inference)",
            "description": "Ultra-fast LLM inference API key for live concierge and autonomous agents.",
            "accessKey": "mock_groq_hackathon_sandbox_key_2026",
            "quota": "100,000 tokens/min",
            "claimedCount": 42
        },
        {
            "id": "key_gemini",
            "provider": "Google Gemini 2.0 Flash / Pro",
            "description": "Multimodal AI API sandbox for code generation, image analysis, and agents.",
            "accessKey": "mock_gemini_campus_sandbox_key_2026",
            "quota": "15 RPM Free Tier",
            "claimedCount": 68
        },
        {
            "id": "key_openai",
            "provider": "OpenAI GPT-4o-mini Sponsor Sandbox",
            "description": "General reasoning API credits for hackathon track prototypes.",
            "accessKey": "mock_openai_sponsor_sandbox_key_2026",
            "quota": "$20 Credit Grant",
            "claimedCount": 55
        },
        {
            "id": "key_cloud",
            "provider": "Cloud Sandbox & Postgres DB Access",
            "description": "Direct hosted database and reverse-proxy deployment tunnel.",
            "accessKey": "postgres://hack_user:sprint2026@cluster.gietu.edu:5432/hackathon",
            "quota": "2GB RAM Sandbox",
            "claimedCount": 31
        }
    ],
    "hardwareInventory": [
        {"id": "hw_esp32", "name": "ESP32 Wi-Fi & Bluetooth Microcontrollers", "category": "IoT & Embedded", "total": 20, "available": 14, "location": "Hardware Desk A"},
        {"id": "hw_arduino", "name": "Arduino Uno R4 Starter Kits with Sensors", "category": "Robotics", "total": 15, "available": 9, "location": "Hardware Desk A"},
        {"id": "hw_rpi", "name": "Raspberry Pi 5 (8GB) AI Edge Kits", "category": "Edge AI", "total": 10, "available": 4, "location": "Hardware Desk B"},
        {"id": "hw_vr", "name": "Meta Quest 3 VR Development Headset", "category": "Spatial / AR", "total": 4, "available": 2, "location": "Hardware Desk B"},
        {"id": "hw_health", "name": "Pulse Oximeter & ECG Sensor Modules", "category": "MedTech", "total": 12, "available": 8, "location": "Hardware Desk A"}
    ],
    "mentorBookings": [],
    "resourceRequests": [
        {
            "id": "req_demo1",
            "category": "HARDWARE",
            "item": "esp32",
            "reason": "for project",
            "userEmail": "hacker@hackathon.com",
            "userName": "Alex",
            "status": "PENDING",
            "createdAt": "2026-08-28T03:00:00Z"
        },
        {
            "id": "req_demo2",
            "category": "API_KEY",
            "item": "rasberry pi",
            "reason": "for projecct",
            "userEmail": "hacker@hackathon.com",
            "userName": "Alex",
            "status": "PENDING",
            "createdAt": "2026-08-28T03:05:00Z"
        }
    ],
    "hardwareRequests": [],
    "claimedKeys": []
}

def _load_logistics() -> Dict[str, Any]:
    if not os.path.exists(LOGISTICS_FILE):
        return DEFAULT_LOGISTICS
    try:
        with open(LOGISTICS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Ensure all keys exist
            for k, v in DEFAULT_LOGISTICS.items():
                if k not in data:
                    data[k] = v
            return data
    except Exception:
        return DEFAULT_LOGISTICS

def _save_logistics(data: Dict[str, Any]):
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        with open(LOGISTICS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[TelemetryService] Error saving logistics: {e}")

def get_mentors() -> List[Dict[str, Any]]:
    data = _load_logistics()
    return data.get("mentors", DEFAULT_LOGISTICS["mentors"])

def add_or_update_mentor(mentor_data: Dict[str, Any]) -> Dict[str, Any]:
    data = _load_logistics()
    mentors = data.get("mentors", DEFAULT_LOGISTICS["mentors"])
    m_id = mentor_data.get("id") or f"mentor_{uuid.uuid4().hex[:6]}"
    
    existing_idx = next((i for i, m in enumerate(mentors) if m["id"] == m_id), -1)
    new_obj = {
        "id": m_id,
        "name": mentor_data.get("name", "Senior Tech Mentor"),
        "title": mentor_data.get("title", "Technical Architect"),
        "status": mentor_data.get("status", "Available Now"),
        "statusType": mentor_data.get("statusType", "available"),
        "slotTime": mentor_data.get("slotTime", "15 mins (Immediate)"),
        "skills": mentor_data.get("skills", ["Full-Stack", "AI"])
    }
    
    if existing_idx >= 0:
        mentors[existing_idx] = new_obj
    else:
        mentors.append(new_obj)
        
    data["mentors"] = mentors
    _save_logistics(data)
    return new_obj

def delete_mentor(mentor_id: str) -> bool:
    data = _load_logistics()
    mentors = data.get("mentors", DEFAULT_LOGISTICS["mentors"])
    data["mentors"] = [m for m in mentors if m["id"] != mentor_id]
    _save_logistics(data)
    return True

def get_logistics_resources(user_email: Optional[str] = None) -> Dict[str, Any]:
    data = _load_logistics()
    claimed_ids = set()
    if user_email:
        clean_email = user_email.lower().strip()
        claimed_ids = set(c["keyId"] for c in data.get("claimedKeys", []) if c.get("userEmail", "").lower() == clean_email)
        
    keys_view = []
    for k in data.get("apiKeys", []):
        k_copy = dict(k)
        k_copy["isClaimedByYou"] = k["id"] in claimed_ids
        keys_view.append(k_copy)
        
    user_mentor_bookings = []
    if user_email:
        clean_email = user_email.lower().strip()
        user_mentor_bookings = [b for b in data.get("mentorBookings", []) if b.get("userEmail", "").lower() == clean_email]

    user_resource_requests = []
    if user_email:
        clean_email = user_email.lower().strip()
        user_resource_requests = [r for r in data.get("resourceRequests", []) if r.get("userEmail", "").lower() == clean_email]

    return {
        "mentors": data.get("mentors", DEFAULT_LOGISTICS["mentors"]),
        "apiKeys": keys_view,
        "hardwareInventory": data.get("hardwareInventory", []),
        "myMentorBookings": user_mentor_bookings,
        "myResourceRequests": user_resource_requests,
        "allResourceRequests": data.get("resourceRequests", []),
        "totalMentorsAvailable": len([m for m in data.get("mentors", []) if m.get("statusType") == "available"]),
        "mentorQueueLength": len([b for b in data.get("mentorBookings", []) if b.get("status") == "pending"])
    }

def claim_api_key(key_id: str, user_email: str, user_name: str) -> Dict[str, Any]:
    data = _load_logistics()
    key_obj = next((k for k in data.get("apiKeys", []) if k["id"] == key_id), None)
    if not key_obj:
        return {"success": False, "message": "API key resource not found."}
        
    clean_email = user_email.lower().strip()
    existing = next((c for c in data.get("claimedKeys", []) if c.get("keyId") == key_id and c.get("userEmail", "").lower() == clean_email), None)
    if not existing:
        data["claimedKeys"].append({
            "keyId": key_id,
            "userEmail": clean_email,
            "userName": user_name,
            "claimedAt": datetime.now(timezone.utc).isoformat()
        })
        key_obj["claimedCount"] = key_obj.get("claimedCount", 0) + 1
        _save_logistics(data)
        
    return {
        "success": True,
        "message": f"Successfully claimed {key_obj['provider']} API access credentials!",
        "accessKey": key_obj["accessKey"],
        "provider": key_obj["provider"]
    }

def book_mentor_session(mentor_id: Optional[str], mentor_name: Optional[str], slot: Optional[str], topic: str, user_email: str, user_name: str, team_name: Optional[str] = None) -> Dict[str, Any]:
    data = _load_logistics()
    booking_id = f"MB_{datetime.now(timezone.utc).strftime('%H%M%S')}"
    
    assigned_mentor = mentor_name or "Dr. Sarah Chen"
    slot_label = slot or "15 mins (Immediate)"
    
    new_booking = {
        "id": booking_id,
        "mentorId": mentor_id,
        "mentorName": assigned_mentor,
        "slot": slot_label,
        "topic": topic.strip() or "General architecture and code debugging",
        "userEmail": user_email.lower().strip(),
        "userName": user_name,
        "teamName": team_name or "Solo Developer",
        "status": "CONFIRMED", # CONFIRMED, COMPLETED, CANCELLED
        "location": "Lounge B / Mentor Desk",
        "displayText": f"{assigned_mentor} ({slot_label}) — {topic.strip() or 'Architecture review'}",
        "requestedAt": datetime.now(timezone.utc).isoformat()
    }
    
    if "mentorBookings" not in data:
        data["mentorBookings"] = []
    data["mentorBookings"].insert(0, new_booking)
    _save_logistics(data)
    
    return {
        "success": True,
        "message": f"Mentor session confirmed with {assigned_mentor}!",
        "booking": new_booking
    }

def book_mentor_office_hours(track: str, topic: str, user_email: str, user_name: str, team_name: Optional[str] = None) -> Dict[str, Any]:
    return book_mentor_session(None, "Senior Track Mentor", "15 mins (Immediate)", topic, user_email, user_name, team_name)

def submit_resource_request(category: str, item: str, reason: str, user_email: str, user_name: str, team_name: Optional[str] = None) -> Dict[str, Any]:
    data = _load_logistics()
    req_id = f"REQ_{datetime.now(timezone.utc).strftime('%H%M%S')}_{uuid.uuid4().hex[:4]}"
    
    clean_cat = "HARDWARE" if "hard" in category.lower() else "API_KEY"
    
    req_obj = {
        "id": req_id,
        "category": clean_cat,
        "item": item.strip(),
        "reason": reason.strip(),
        "userEmail": user_email.lower().strip(),
        "userName": user_name,
        "teamName": team_name or "Solo Developer",
        "status": "PENDING", # PENDING, APPROVED, REJECTED
        "displayText": f"[{clean_cat}] {item.strip()} — {reason.strip()}",
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    if "resourceRequests" not in data:
        data["resourceRequests"] = []
    data["resourceRequests"].insert(0, req_obj)
    _save_logistics(data)
    
    return {
        "success": True,
        "message": f"Resource request submitted to organizers!",
        "request": req_obj
    }

def update_resource_request_status(req_id: str, status: str, admin_notes: Optional[str] = None) -> Dict[str, Any]:
    data = _load_logistics()
    requests = data.get("resourceRequests", [])
    req_obj = next((r for r in requests if r["id"] == req_id), None)
    if not req_obj:
        return {"success": False, "message": "Request not found."}
        
    req_obj["status"] = status.upper()
    if admin_notes:
        req_obj["adminNotes"] = admin_notes
    _save_logistics(data)
    return {"success": True, "message": f"Request status updated to {status.upper()}", "request": req_obj}

def request_hardware_checkout(item_id: str, quantity: Optional[int] = 1, user_email: str = "", user_name: str = "", team_name: Optional[str] = None) -> Dict[str, Any]:
    qty = quantity or 1
    data = _load_logistics()
    item = next((h for h in data.get("hardwareInventory", []) if h["id"] == item_id), None)
    item_name = item["name"] if item else item_id
    res = submit_resource_request("HARDWARE", f"{qty}x {item_name}", f"Requested {qty} units for prototype development", user_email, user_name, team_name)
    return {
        "success": True,
        "message": f"Hardware checkout request for {qty}x {item_name} submitted to logistics desk.",
        "request": res.get("request")
    }

def compute_adaptive_timeline_telemetry(user_role: Optional[str] = None, user_track: Optional[str] = None) -> Dict[str, Any]:
    """
    Computes adaptive telemetry, upcoming milestones, catering timetable, and personalized reminders.
    """
    timer_state = get_timer_state()
    status = timer_state.get("status", "idle")
    total_sec = float(timer_state.get("totalSeconds", 48.0 * 3600))
    rem_sec = float(timer_state.get("remainingSeconds", total_sec))
    elapsed_sec = max(0.0, total_sec - rem_sec)
    
    # 6 Standard Hackathon Milestones based on 48h sprint timeline
    milestones = [
        {
            "id": "m1_checkin",
            "name": "Phase 1: Opening Ceremony & Team Formation",
            "offsetHours": 2,
            "targetTime": "Hour 0 - 2",
            "description": "Check-in at CSE Block, team matchmaking lock, and Git repo setup.",
            "category": "logistics"
        },
        {
            "id": "m2_workshop",
            "name": "Phase 2: Workshop - Autonomous Agents & LLMs",
            "offsetHours": 6,
            "targetTime": "Hour 6",
            "description": "Technical deep dive into LangChain, Groq speed inference & RAG pipelines in Seminar Hall.",
            "category": "workshop"
        },
        {
            "id": "m3_mentor",
            "name": "Phase 3: Mentor Office Hours (Track 1 & 2)",
            "offsetHours": 14,
            "targetTime": "Hour 14",
            "description": "1-on-1 architecture feedback with senior engineers in Lounge B.",
            "category": "mentorship"
        },
        {
            "id": "m4_checkpoint",
            "name": "Phase 4: Mid-Sprint Checkpoint & Midnight Catering",
            "offsetHours": 24,
            "targetTime": "Hour 24",
            "description": "Midnight snacks call & mandatory intermediate codebase audit.",
            "category": "catering"
        },
        {
            "id": "m5_preaudit",
            "name": "Phase 5: Pre-Submission Compliance Audit Window",
            "offsetHours": 44,
            "targetTime": "Hour 44 (4h before deadline)",
            "description": "Automated repository & demo video compliance check before judging freeze.",
            "category": "submission"
        },
        {
            "id": "m6_freeze",
            "name": "Phase 6: Final Submission Freeze & Pitch Presentations",
            "offsetHours": 48,
            "targetTime": "Hour 48 (Sprint Close)",
            "description": "Submissions locked, jury evaluation starts in Audi 1.",
            "category": "deadline"
        }
    ]

    # Calculate status for each milestone
    elapsed_hrs = elapsed_sec / 3600.0
    active_phase_name = "Phase 1: Opening & Team Formation"
    next_milestone = None
    
    enriched_milestones = []
    for m in milestones:
        m_copy = dict(m)
        hrs = m["offsetHours"]
        if elapsed_hrs >= hrs:
            m_copy["status"] = "completed"
        elif elapsed_hrs >= (hrs - 4) and elapsed_hrs < hrs:
            m_copy["status"] = "active"
            active_phase_name = m["name"]
            if not next_milestone:
                next_milestone = m_copy
        else:
            m_copy["status"] = "upcoming"
            if not next_milestone and elapsed_hrs < hrs:
                next_milestone = m_copy
        enriched_milestones.append(m_copy)

    if not next_milestone and enriched_milestones:
        next_milestone = enriched_milestones[-1]

    # Adaptive Alerts / Personalized Telemetry
    personalized_alerts = []
    
    if rem_sec < 4 * 3600 and rem_sec > 0:
        personalized_alerts.append({
            "id": "alert_sub_soon",
            "type": "warning",
            "title": "Pre-Submission Audit Recommended",
            "message": "Only 4 hours left in sprint! Run your automated repository compliance audit now to avoid last-minute disqualifications."
        })
    elif rem_sec <= 0 and status == "ended":
        personalized_alerts.append({
            "id": "alert_ended",
            "type": "info",
            "title": "Hacking Sprint Concluded",
            "message": "Submissions are locked. You can now generate and claim your official Certificate of Achievement!"
        })
    else:
        personalized_alerts.append({
            "id": "alert_normal",
            "type": "info",
            "title": "Live Sprint Telemetry Active",
            "message": f"Currently in {active_phase_name}. Mentor office hours and API key dispenser are online."
        })

    if user_track:
        personalized_alerts.append({
            "id": "alert_track",
            "type": "info",
            "title": f"Domain Track Context: {user_track}",
            "message": f"Review Section 3 of the live handbook for track-specific judging criteria and problem statements."
        })

    return {
        "activePhase": active_phase_name,
        "elapsedHours": round(elapsed_hrs, 1),
        "totalHours": 48.0,
        "progressPercent": min(100, max(0, int((elapsed_sec / total_sec) * 100))) if total_sec > 0 else 0,
        "nextMilestone": next_milestone,
        "milestones": enriched_milestones,
        "personalizedAlerts": personalized_alerts,
        "serverTime": datetime.now(timezone.utc).isoformat()
    }
