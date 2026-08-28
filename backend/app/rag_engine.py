import os
import re
import uuid
import json
import urllib.request
from datetime import datetime, timezone
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.config import (
    RAG_CONFIDENCE_THRESHOLD, GROQ_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, LLM_MODEL, DATA_DIR
)
from app.database import get_escalations, save_escalations

EXPLICIT_ESCALATION_KEYWORDS = [
    "escalate", "human", "organizer", "admin", "contact desk", "speak to host",
    "help desk", "staff", "urgent assistance", "call someone", "ticket", "complaint"
]

STOP_WORDS = {
    "what", "is", "the", "a", "an", "for", "and", "or", "in", "on", "to", "of",
    "are", "can", "we", "how", "do", "i", "you", "my", "our", "tell", "me", "about",
    "please", "give", "know", "want", "there", "any", "which", "when", "where", "who", "why"
}

# Cache for dynamic handbook content
_handbook_cache = {
    "mtime": 0,
    "docs": [],
    "raw_text": ""
}

def get_handbook_filepath() -> str:
    """Finds the active handbook file path."""
    backend_path = os.path.join(DATA_DIR, "hackathon_handbook.txt")
    root_path = os.path.join(os.path.dirname(os.path.dirname(DATA_DIR)), "hackathon_handbook.txt")
    
    # Prioritize root if exists and newer, or backend
    if os.path.exists(root_path) and os.path.exists(backend_path):
        if os.path.getmtime(root_path) >= os.path.getmtime(backend_path):
            return root_path
        return backend_path
    elif os.path.exists(root_path):
        return root_path
    elif os.path.exists(backend_path):
        return backend_path
    return backend_path

def load_live_handbook_docs() -> list:
    """Dynamically parses hackathon_handbook.txt into structured knowledge base documents."""
    global _handbook_cache
    filepath = get_handbook_filepath()
    
    current_mtime = os.path.getmtime(filepath) if os.path.exists(filepath) else 0
    if _handbook_cache["docs"] and current_mtime == _handbook_cache["mtime"] and current_mtime > 0:
        return _handbook_cache["docs"]

    raw_text = ""
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                raw_text = f.read()
        except Exception as e:
            print(f"Error reading handbook: {e}")

    if not raw_text.strip():
        # Fallback default
        raw_text = "Hackathon 2026: Official Handbook\n\n1. Event Overview & Schedule\nLocation: RDB Block, GIETU"

    # Parse sections like "1. Event Overview & Schedule", "2. Eligibility & Team Formation Rules"
    sections = re.split(r'\n(?=\d+\.\s+)', raw_text)
    docs = []
    
    # If title header is first section
    first_sec = sections[0]
    if not re.match(r'^\d+\.\s+', first_sec.strip()):
        sections = sections[1:]

    idx = 1
    for sec in sections:
        sec = sec.strip()
        if not sec:
            continue
        
        lines = [l.strip() for l in sec.split('\n') if l.strip()]
        header = lines[0] if lines else f"Section {idx}"
        body = "\n".join(lines[1:]) if len(lines) > 1 else ""

        # Extract title without leading number
        title = re.sub(r'^\d+\.\s*', '', header).strip()
        doc_id = f"kb_{idx:02d}"

        docs.append({
            "id": doc_id,
            "sectionNumber": idx,
            "topic": title,
            "category": title,
            "content": body,
            "rawSection": sec
        })
        idx += 1

    # Extract dedicated sub-documents for fast meal and mentorship retrieval
    raw_lower = raw_text.lower()
    
    # 1. Meal times sub-doc
    meal_lines = [l for l in raw_text.split('\n') if any(m in l.lower() for m in ["lunch", "dinner", "midnight snack", "cafeteria", "canteen"])]
    if meal_lines:
        docs.append({
            "id": "kb_meal_sub",
            "sectionNumber": 99,
            "topic": "Meal & Catering Schedule",
            "category": "Catering",
            "content": "\n".join(meal_lines),
            "rawSection": "\n".join(meal_lines)
        })

    _handbook_cache = {
        "mtime": current_mtime,
        "docs": docs,
        "raw_text": raw_text
    }
    return docs

def invalidate_handbook_cache():
    """Invalidates the in-memory handbook cache to force fresh file read and parsing."""
    global _handbook_cache
    _handbook_cache = {"mtime": 0, "docs": [], "raw_text": ""}

def extract_field_from_handbook(field_name: str, default: str = "") -> str:
    """Extracts a specific key-value from the live handbook (e.g. Location, Wi-Fi password)."""
    docs = load_live_handbook_docs()
    raw = _handbook_cache.get("raw_text", "")
    if field_name.lower() in ["location", "venue", "venue room"]:
        pattern = re.compile(r'(?:Location|Venue\s*Room|Venue)\s*:\s*([^\n|]+)', re.IGNORECASE)
    else:
        pattern = re.compile(rf"{field_name}\s*:\s*([^\n]+)", re.IGNORECASE)
    match = pattern.search(raw)
    if match:
        return match.group(1).strip()
    return default

def extract_tracks_from_handbook(raw_text: str = None) -> list:
    """Extracts live structured tracks and problem domains directly from hackathon_handbook.txt Section 3."""
    if raw_text is None:
        load_live_handbook_docs()
        raw_text = _handbook_cache.get("raw_text", "")
        
    tracks = []
    track_section = ""
    t_match = re.search(r'3\.\s*Tracks.*?(?=\n\d+\.|\Z)', raw_text, re.DOTALL | re.IGNORECASE)
    if t_match:
        track_section = t_match.group(0)
    else:
        track_section = raw_text
        
    for line in track_section.split('\n'):
        line = line.strip()
        if not line or line.lower().startswith('3.') or 'tracks, themes' in line.lower():
            continue
        
        # Format: "Track 1: AI & Autonomous Agents: Building LLM systems..."
        track_num_match = re.match(r'^(Track\s*\d+)\s*[:\-]\s*([^:\n]+)(?:\s*:\s*(.*))?$', line, re.IGNORECASE)
        if track_num_match:
            track_prefix = track_num_match.group(1).strip()
            track_name = track_num_match.group(2).strip()
            desc = track_num_match.group(3).strip() if track_num_match.group(3) else ""
            full_name = f"{track_prefix}: {track_name}"
            tracks.append({
                "id": track_prefix.lower().replace(" ", "_"),
                "name": track_name,
                "fullName": full_name,
                "description": desc
            })
        elif (line.startswith('-') or line.startswith('•') or line.startswith('*')) and "track" in track_section.lower():
            clean_line = line.lstrip('-•* ').strip()
            parts = clean_line.split(':', 1)
            t_name = parts[0].strip()
            desc = parts[1].strip() if len(parts) > 1 else ""
            tracks.append({
                "id": f"track_{len(tracks)+1}",
                "name": t_name,
                "fullName": t_name,
                "description": desc
            })

    if not tracks:
        tracks = [
            {"id": "track_1", "name": "AI & Autonomous Agents", "fullName": "Track 1: AI & Autonomous Agents", "description": "Building LLM systems, multi-agent frameworks, RAG workflows, or task automation tooling."},
            {"id": "track_2", "name": "Web3, Fintech & Decentralized Apps", "fullName": "Track 2: Web3, Fintech & Decentralized Apps", "description": "Smart contracts, decentralized identity, payments, and blockchain security."},
            {"id": "track_3", "name": "Healthcare & MedTech", "fullName": "Track 3: Healthcare & MedTech", "description": "Diagnostics tooling, patient management, accessible health tech, and AI medical triage."},
            {"id": "track_4", "name": "Open Innovation & Smart Campus", "fullName": "Track 4: Open Innovation & Smart Campus", "description": "Logistics, smart city solutions, IoT, sustainability, and open-source public goods."}
        ]
        
    return tracks

def extract_quick_reference_from_handbook(raw_text: str = None) -> dict:
    """Extracts live structured Quick Reference data (Wi-Fi, Judging Rubric, Catering, Tracks) directly from hackathon_handbook.txt."""
    if raw_text is None:
        load_live_handbook_docs()
        raw_text = _handbook_cache.get("raw_text", "")
        
    # 1. Wi-Fi Credentials
    wifi_ssid = "Hackathon_5G"
    wifi_password = "innovate_together_2026"
    
    ssid_match = re.search(r'(?:Network\s+SSID|SSID)\s*:\s*([^\n|]+)', raw_text, re.IGNORECASE)
    if ssid_match:
        wifi_ssid = ssid_match.group(1).strip()
        
    pass_match = re.search(r'Password\s*:\s*([^\n|]+)', raw_text, re.IGNORECASE)
    if pass_match:
        wifi_password = pass_match.group(1).strip()
        
    # 2. Judging Rubric Weights
    rubric_items = []
    judging_section = ""
    j_match = re.search(r'7\.\s*Judging Rubric.*?(?=\n\d+\.|\Z)', raw_text, re.DOTALL | re.IGNORECASE)
    if j_match:
        judging_section = j_match.group(0)
    else:
        judging_section = raw_text
        
    for line in judging_section.split('\n'):
        line = line.strip()
        if line.startswith('-') or line.startswith('•') or line.startswith('*'):
            clean_line = line.lstrip('-•* ').strip()
            item_match = re.match(r'^(.*?)\s*:\s*(.*)$', clean_line)
            if item_match:
                criterion = item_match.group(1).strip()
                weight = item_match.group(2).strip()
                rubric_items.append({"criterion": criterion, "weight": weight})
            else:
                paren_match = re.match(r'^(.*?)\s*\((.*?)\)$', clean_line)
                if paren_match:
                    rubric_items.append({"criterion": paren_match.group(1).strip(), "weight": paren_match.group(2).strip()})

    if not rubric_items:
        rubric_items = [
            {"criterion": "Innovation & Uniqueness", "weight": "30%"},
            {"criterion": "Technical Execution", "weight": "30%"},
            {"criterion": "UX & Polish", "weight": "20%"},
            {"criterion": "Pitch & Impact", "weight": "20%"}
        ]

    # 3. Catering Schedule
    catering_schedule = ""
    cat_match = re.search(r'Catering Schedule\s*:\s*([^\n]+)', raw_text, re.IGNORECASE)
    if cat_match:
        catering_schedule = cat_match.group(1).strip()
    else:
        meal_lines = [l.strip() for l in raw_text.split('\n') if any(k in l.lower() for k in ["lunch breaks", "dinner breaks", "breakfast"])]
        if meal_lines:
            catering_schedule = " | ".join(meal_lines[:2])
        else:
            catering_schedule = "Breakfast: 8:00 AM | Lunch: 1:00 PM | Dinner: 7:00 PM (Lounge C)"
            
    # 4. Location / Venue & Duration
    location = extract_field_from_handbook("Location", "CSE Block, GIETU Gunupur")
    duration = extract_field_from_handbook("Event Duration", "36 Hours continuous sprint")

    # 5. Live Tracks & Problem Domains
    tracks = extract_tracks_from_handbook(raw_text)

    return {
        "wifi": {
            "ssid": wifi_ssid,
            "password": wifi_password
        },
        "rubric": rubric_items,
        "catering": {
            "schedule": catering_schedule
        },
        "location": location,
        "duration": duration,
        "tracks": tracks,
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }

def extract_event_schedule_from_handbook(raw_text: str = None) -> dict:
    """Extracts live hackathon duration and schedule references from hackathon_handbook.txt."""
    if raw_text is None:
        load_live_handbook_docs()
        raw_text = _handbook_cache.get("raw_text", "")
        
    duration_text = "36 Hours continuous sprint"
    duration_hours = 36.0
    start_time_text = "Day 1 at 10:00 AM IST"
    submission_deadline_text = "Day 2 strictly at 06:00 PM IST"
    
    # 1. Parse Event Duration
    dur_match = re.search(r'(?:Event\s+Duration|Duration)\s*:\s*([^\n]+)', raw_text, re.IGNORECASE)
    if dur_match:
        raw_dur = dur_match.group(1).strip()
        # Clean anything inside parens or after pipe for duration_text
        cleaned_dur = re.split(r'[|\(]', raw_dur)[0].strip()
        if cleaned_dur:
            duration_text = cleaned_dur
        else:
            duration_text = raw_dur

        num_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:Hours?|Hrs?|h)\b', raw_dur, re.IGNORECASE)
        if num_match:
            try:
                duration_hours = float(num_match.group(1))
            except ValueError:
                pass
        else:
            num_match2 = re.search(r'\b(\d+(?:\.\d+)?)\b', raw_dur)
            if num_match2:
                try:
                    duration_hours = float(num_match2.group(1))
                except ValueError:
                    pass

    # 2. Parse Start Time
    start_match = re.search(r'(?:Hacking\s+Begins|Opening\s+Ceremony|Starts)\s*:\s*([^\n|.)]+)', raw_text, re.IGNORECASE)
    if start_match:
        start_time_text = start_match.group(1).strip()

    # 3. Parse Submission Deadline
    sub_match = re.search(r'(?:Submission\s+Deadline|Submissions\s+Close|Ends)\s*:\s*([^\n|.)]+)', raw_text, re.IGNORECASE)
    if sub_match:
        submission_deadline_text = sub_match.group(1).strip()

    return {
        "durationHours": duration_hours,
        "durationText": duration_text,
        "startTimeText": start_time_text,
        "submissionDeadlineText": submission_deadline_text,
        "handbookRef": f"{duration_text} (Deadline: {submission_deadline_text})"
    }

# Rich concept dictionaries for natural queries and synonyms
CONCEPT_MAP = {
    "kb_01": [
        "schedule", "timetable", "timeline", "agenda", "ceremony", "opening ceremony",
        "closing ceremony", "award ceremony", "start time", "end time", "duration",
        "36 hours", "36 hr", "when does hacking start", "when does hacking end",
        "pitching time", "event timeline", "event schedule", "location", "venue",
        "where is the hackathon", "where is the event", "where is hacking", "where to go",
        "campus", "building", "hall", "room", "address"
    ],
    "kb_02": [
        "team", "teams", "team size", "solo", "alone", "individual", "single",
        "member", "members", "teammate", "teammates", "partner", "min 2", "max 4",
        "student id", "qr badge", "badge", "cross track", "matchmaking", "find team",
        "team formation", "can i participate solo", "solo hacker", "can i work alone",
        "team limit", "group size"
    ],
    "kb_03": [
        "track", "tracks", "theme", "themes", "ai", "autonomous agents", "agents", "llm",
        "web3", "fintech", "smart contracts", "blockchain", "crypto", "healthcare",
        "medtech", "medical", "health", "diagnostics", "open innovation", "smart campus",
        "iot", "categories", "problem domains", "domain", "domains", "which track"
    ],
    "kb_04": [
        "conduct", "code of conduct", "originality", "pre-existing", "github copilot",
        "copilot", "chatgpt", "claude", "genai", "generative ai", "ai assistance",
        "disclosure", "readme", "plagiarism", "harassment", "ip rights", "academic integrity",
        "rules", "cheat", "cheating", "allowed libraries", "can we use chatgpt", "ai tool"
    ],
    "kb_05": [
        "wifi", "wi-fi", "internet", "ssid", "password", "network", "connect",
        "hackthefuture2026", "hackathon_2026_5g", "groq", "gemini", "api key", "api keys",
        "hardware", "esp32", "raspberry pi", "rpi", "arduino", "sensor", "sensors",
        "hardware lab", "room 104", "checkout", "help desk a", "devices", "microcontroller"
    ],
    "kb_06": [
        "submit", "submission", "submitting", "deadline", "deliverable", "deliverables",
        "github repo", "gitlab", "demo video", "3 minutes", "youtube", "loom",
        "live deployment", "apk", "presentation deck", "slides", "7 slides", "due date",
        "6:00 pm", "6 pm", "upload", "requirements", "submission requirements", "due time"
    ],
    "kb_07": [
        "judge", "judging", "rubric", "score", "scoring", "criteria", "points",
        "25 pts", "technical complexity", "innovation", "functionality", "ui/ux",
        "pitch", "evaluation", "100 points", "how are projects evaluated", "how will we be judged",
        "marks", "grading", "point system"
    ],
    "kb_08": [
        "emergency", "medical", "security", "room 101", "+91-9876543210", "9876543210",
        "phone", "contact", "doctor", "first aid", "help desk b", "ask-organizers",
        "mentor-support", "ticket", "organizer", "escalate", "urgent", "police", "helpdesk"
    ],
    "kb_meal_sub": [
        "meal", "meals", "meal time", "meal times", "food", "lunch", "dinner",
        "breakfast", "midnight snack", "red bull", "cafeteria", "canteen", "buffet",
        "diet", "vegetarian", "vegan", "halal", "gluten", "eat", "eating", "hungry",
        "refreshment", "refreshments", "drinks", "water", "beverage", "beverages",
        "when is food", "where to eat", "lunch time", "dinner time", "snack time"
    ]
}

def handle_conversational_queries(query: str) -> dict:
    """Handles general conversational intents (greetings, thanks, about, help)."""
    q = query.strip().lower()
    q_clean = re.sub(r'[^\w\s]', '', q)
    words = q_clean.split()
    
    # 1. Greetings
    greeting_patterns = {"hello", "hi", "hey", "howdy", "hola", "greetings", "good morning", "good afternoon", "good evening", "yo", "sup", "heyy", "hii", "hiii"}
    if any(q_clean == g for g in greeting_patterns) or (len(words) <= 3 and any(w in greeting_patterns for w in words)):
        return {
            "answer": (
                "👋 **Hello & Welcome to Hackathon 2026!**\n\n"
                "I am your Autonomous Event Operations & Knowledge Concierge. Here are popular topics you can ask me about:\n\n"
                "* 📍 **Venue & Location:** *'Where is the event venue?'*\n"
                "* 📶 **Wi-Fi & Cloud Keys:** *'What is the Wi-Fi password?'*\n"
                "* 🍕 **Meals & Cafeteria:** *'What are the meal times?'*\n"
                "* ⏰ **Schedule & Submissions:** *'When is the submission deadline?'*\n"
                "* 🏆 **Tracks & Rubric:** *'What are the tracks?'* | *'How are projects scored?'*\n"
                "* 👥 **Team Rules:** *'What is the team size?'* | *'Can I work solo?'*\n"
                "* 🛠️ **Hardware Lab:** *'How to get ESP32 or Raspberry Pi?'*\n"
                "* 🚨 **Emergency Support:** *'What is the medical emergency number?'*\n\n"
                "How can I assist you with your hackathon sprint?"
            ),
            "canEscalate": False,
            "isEscalated": False
        }

    # 2. Who are you / About / Are you a chatbot
    if any(phrase in q for phrase in [
        "who are you", "what are you", "what can you do", "your name",
        "what is this bot", "how does this work", "are you a chatbot",
        "are you a bot", "are you ai", "are you human", "are you real",
        "are you automated", "what kind of bot", "is this a bot"
    ]):
        return {
            "answer": (
                "🤖 **Hackathon 2026 Event Concierge**\n\n"
                "I am your automated event assistant for Hackathon 2026! I can instantly answer questions about:\n\n"
                "* 📍 Venue & location details\n"
                "* 📶 Wi-Fi credentials & API keys\n"
                "* 🍕 Meal times & catering schedule\n"
                "* ⏰ Submission deadlines & schedule\n"
                "* 🏆 Tracks, judging rubric & prizes\n"
                "* 👥 Team rules & eligibility\n"
                "* 🛠️ Hardware lab checkout\n"
                "* 🚨 Emergency contacts & support desks\n\n"
                "What would you like to know?"
            ),
            "canEscalate": False,
            "isEscalated": False
        }

    # 3. Thanks / Appreciation
    if any(phrase in q for phrase in ["thank you", "thanks", "thx", "appreciate", "great thanks", "awesome thanks", "good bot"]):
        return {
            "answer": (
                "🙌 **You're very welcome!**\n\n"
                "Best of luck with your hackathon sprint! Remember that the submission deadline is **Day 3 at 9:00 AM IST**."
            ),
            "canEscalate": False,
            "isEscalated": False
        }

    # 4. Help / Commands
    if q_clean in ["help", "help me", "commands", "menu", "guide", "faq"]:
        return {
            "answer": (
                "💡 **Hackathon 2026 Quick Reference**\n\n"
                "Try asking any of these questions:\n\n"
                "1. 📍 *'Where is the event venue location?'*\n"
                "2. 📶 *'What is the Wi-Fi network and password?'*\n"
                "3. 🍕 *'What are the meal times?'*\n"
                "4. ⏰ *'When is the submission deadline?'*\n"
                "5. 🏆 *'What are the hackathon tracks?'*\n"
                "6. ⚖️ *'How are projects judged?'*\n"
                "7. 👥 *'What is the team size limit?'*\n"
                "8. 🛠️ *'How do we checkout hardware devices?'*\n"
                "9. 🚨 *'What is the emergency contact number?'*"
            ),
            "canEscalate": False,
            "isEscalated": False
        }

    return None

def format_live_handbook_answer(doc: dict, user_query: str = "") -> str:
    """Formats dynamic content parsed from hackathon_handbook.txt into a clean markdown card."""
    topic = doc.get("topic", "")
    content = doc.get("content", "").strip()
    sec_num = doc.get("sectionNumber", 0)
    raw = doc.get("rawSection", "")
    
    q_lower = user_query.lower()

    # Specialized direct extraction for Location/Venue query
    if any(v in q_lower for v in ["venue", "location", "where is", "where are we", "campus", "address"]):
        loc_val = extract_field_from_handbook("Location", "RDB Block, GIETU")
        duration_val = extract_field_from_handbook("Event Duration", "36 Hours continuous sprint")
        return (
            f"📍 **Hackathon 2026: Venue & Location Guide**\n\n"
            f"* **Official Venue Location:** **{loc_val}**\n"
            f"* **Event Duration:** {duration_val}\n"
            f"* **Opening Ceremony:** Day 1 at 09:00 AM – 10:00 AM IST\n"
            f"* **Hacking Begins:** Day 1 at 10:00 AM IST"
        )

    # Clean bullet formatting
    lines = [l.strip() for l in content.split('\n') if l.strip()]
    formatted_bullets = []
    for line in lines:
        if line.startswith("-") or line.startswith("*") or re.match(r'^\d+\.', line):
            formatted_bullets.append(f"* {line.lstrip('-*0123456789. ')}")
        elif ":" in line:
            parts = line.split(":", 1)
            formatted_bullets.append(f"* **{parts[0].strip()}:** {parts[1].strip()}")
        else:
            formatted_bullets.append(f"* {line}")

    body_text = "\n".join(formatted_bullets) if formatted_bullets else content

    # Icons per topic
    icon = "📌"
    if "overview" in topic.lower() or "schedule" in topic.lower():
        icon = "⏰"
    elif "eligibility" in topic.lower() or "team" in topic.lower():
        icon = "👥"
    elif "track" in topic.lower():
        icon = "🏆"
    elif "conduct" in topic.lower() or "integrity" in topic.lower():
        icon = "📜"
    elif "hardware" in topic.lower() or "wi-fi" in topic.lower() or "wifi" in topic.lower():
        icon = "📶"
    elif "submission" in topic.lower():
        icon = "📋"
    elif "judging" in topic.lower() or "rubric" in topic.lower():
        icon = "⚖️"
    elif "escalation" in topic.lower() or "support" in topic.lower() or "emergency" in topic.lower():
        icon = "🚨"
    elif "meal" in topic.lower() or "catering" in topic.lower():
        icon = "🍕"

    return f"{icon} **{topic}**\n\n{body_text}"

def call_groq_llm_api(prompt_system: str, prompt_user: str) -> str:
    """Calls Groq API (Llama 3.3) via REST HTTP request."""
    if not GROQ_API_KEY:
        return None
    try:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive"
        }
        payload = {
            "model": LLM_MODEL or "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": prompt_system},
                {"role": "user", "content": prompt_user}
            ],
            "temperature": 0.1,
            "max_tokens": 512
        }
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return None

def call_openai_llm_api(prompt_system: str, prompt_user: str) -> str:
    if not OPENAI_API_KEY:
        return None
    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": prompt_system},
                {"role": "user", "content": prompt_user}
            ],
            "temperature": 0.1,
            "max_tokens": 512
        }
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return None

def call_gemini_llm_api(prompt_system: str, prompt_user: str) -> str:
    if not GEMINI_API_KEY:
        return None
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{
                "parts": [{"text": f"{prompt_system}\n\nUser Request: {prompt_user}"}]
            }]
        }
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        return None

def query_rag_engine(user_query: str, user_id: str = None, user_email: str = None) -> dict:
    if not user_query or not user_query.strip():
        return {
            "answer": "Please ask a question regarding Hackathon 2026 rules, venue location, meal times, Wi-Fi, tracks, hardware checkout, or submissions!",
            "canEscalate": False,
            "isEscalated": False
        }

    # 1. Handle conversational greetings and FAQs
    conv_response = handle_conversational_queries(user_query)
    if conv_response:
        return conv_response

    # Always fetch live handbook docs + full raw text
    kb_docs = load_live_handbook_docs()
    if not kb_docs:
        return {
            "answer": "Knowledge base is currently offline. Please contact event organizers at Help Desk B.",
            "canEscalate": True,
            "isEscalated": False
        }

    query_lower = user_query.lower()
    explicit_request = any(kw in query_lower for kw in EXPLICIT_ESCALATION_KEYWORDS)

    # 2. Check for explicit escalation request
    if explicit_request:
        escalation_id = create_escalation_ticket(user_query, user_id, user_email, 0.0)
        return {
            "answer": (
                "I have registered your request with the event organizers! 🎫\n\n"
                f"* **Ticket ID:** `#{escalation_id}`\n"
                f"* **Staff Contact:** Visit Help Desk B or reach out on Discord in `#ask-organizers`.\n"
                f"* **Emergency:** Room 101 Ground Floor (`+91-9876543210`)."
            ),
            "canEscalate": False,
            "isEscalated": True,
            "escalationId": escalation_id
        }

    # 3. PRIMARY PATH — Give LLM the FULL handbook text so it can answer any question
    full_handbook_text = _handbook_cache.get("raw_text", "")
    if not full_handbook_text:
        load_live_handbook_docs()
        full_handbook_text = _handbook_cache.get("raw_text", "")

    prompt_system = (
        "You are a helpful and friendly event assistant for Hackathon 2026. "
        "Below is the complete official event information. "
        "Read it carefully and answer the participant's question accurately, warmly, and in your own words. "
        "Use bullet points or bold text to make answers easy to read. "
        "IMPORTANT RULES:\n"
        "- Do NOT mention any 'handbook', 'manual', 'document', or 'documentation' in your answer.\n"
        "- If the answer is clearly in the event info below, answer it directly and confidently.\n"
        "- If the question is completely unrelated to the hackathon event (e.g. math problems, coding help), "
        "respond ONLY with the exact text: CANNOT_ANSWER\n"
        "- Keep answers concise but complete.\n\n"
        f"=== HACKATHON 2026 COMPLETE EVENT INFORMATION ===\n{full_handbook_text}\n"
        "=== END OF EVENT INFORMATION ==="
    )

    llm_response = (
        call_groq_llm_api(prompt_system, user_query) or
        call_openai_llm_api(prompt_system, user_query) or
        call_gemini_llm_api(prompt_system, user_query)
    )

    # LLM responded — use it
    if llm_response:
        if "CANNOT_ANSWER" in llm_response:
            return {
                "answer": (
                    "🤔 I'm only able to answer questions about Hackathon 2026.\n\n"
                    "💡 **Would you like me to connect you with an event organizer?**\n"
                    "Click the button below or type *'Escalate to organizer'* to raise a support ticket and get a direct answer from our team."
                ),
                "canEscalate": True,
                "isEscalated": False
            }
        return {
            "answer": llm_response,
            "canEscalate": False,
            "isEscalated": False
        }

    # 4. FALLBACK — All LLM APIs unavailable, use TF-IDF chunk retrieval
    corpus = [f"{doc.get('topic', '')} {doc.get('category', '')} {doc.get('content', '')}" for doc in kb_docs]
    query_tokens = set(re.findall(r'\w+', query_lower)) - STOP_WORDS
    best_match = None
    max_score = 0.0

    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(corpus + [user_query])
        similarities = cosine_similarity(tfidf_matrix[-1:], tfidf_matrix[:-1])[0]
        blended_scores = []
        for i, doc in enumerate(kb_docs):
            doc_id = doc.get("id", "")
            doc_text = f"{doc.get('topic', '')} {doc.get('category', '')} {doc.get('content', '')}".lower()
            doc_tokens = set(re.findall(r'\w+', doc_text))
            overlap_ratio = len(query_tokens.intersection(doc_tokens)) / max(len(query_tokens), 1) if query_tokens else 0.0
            concept_boost = 0.0
            for concept in CONCEPT_MAP.get(doc_id, []):
                if concept in query_lower:
                    concept_boost += 0.55 if " " in concept else 0.35
                    break
            blended_scores.append(min((similarities[i] * 0.35) + (overlap_ratio * 0.25) + min(concept_boost, 0.55), 1.0))

        max_idx = max(range(len(blended_scores)), key=lambda i: blended_scores[i])
        max_score = float(blended_scores[max_idx])
        best_match = kb_docs[max_idx]
    except Exception:
        best_match = kb_docs[0] if kb_docs else None

    if max_score >= 0.12 and best_match:
        return {
            "answer": format_live_handbook_answer(best_match, user_query),
            "canEscalate": False,
            "isEscalated": False
        }
    else:
        # Unmatched query — friendly fallback, no mention of handbook
        return {
            "answer": (
                "🤔 I don't have information on that topic right now.\n\n"
                "💡 **Would you like me to connect you with an event organizer?**\n"
                "Click the button below or type *'Escalate to organizer'* to raise a support ticket and get a direct answer from our team."
            ),
            "canEscalate": True,
            "isEscalated": False
        }

def compute_urgency_score(query: str) -> tuple:
    """
    Dynamically analyzes participant query to compute an Urgency Score (1-100) and Urgency Level.
    Prioritizes critical operational blockers, submission issues, hardware/API access, and emergencies.
    """
    q_lower = query.lower()
    
    # Critical keywords (Score 90-100)
    critical_keywords = [
        "emergency", "medical", "disqualified", "submission error", "cannot submit", 
        "submission failed", "locked out", "hardware broken", "power outage", "fire", 
        "deadline", "urgent", "stolen", "accident"
    ]
    # High priority keywords (Score 70-89)
    high_keywords = [
        "api key", "api credit", "hardware checkout", "arduino", "esp32", "raspberry pi", 
        "mentor", "mentor booking", "wifi down", "cannot connect", "login failed", 
        "team issue", "team leader", "disband", "remove member"
    ]
    # Medium priority keywords (Score 40-69)
    medium_keywords = [
        "schedule", "workshop", "catering", "lunch", "dinner", "midnight snack", 
        "track change", "presentation", "judging rubric", "room location", "certificate"
    ]
    
    if any(k in q_lower for k in critical_keywords):
        return 95, "critical"
    elif any(k in q_lower for k in high_keywords):
        return 78, "high"
    elif any(k in q_lower for k in medium_keywords):
        return 52, "medium"
    else:
        return 30, "low"

def create_escalation_ticket(
    query: str, 
    user_id: str = None, 
    user_email: str = None, 
    user_name: str = None,
    team_name: str = None,
    score: float = 0.0
) -> str:
    """Explicitly creates an escalation ticket in the database/escalations store with dynamic urgency scoring."""
    escalation_id = f"esc_{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    clean_query = (query or "").strip()
    
    urgency_score, urgency_level = compute_urgency_score(clean_query)
    
    escalation_entry = {
        "id": escalation_id,
        "userId": user_id or "anonymous",
        "userEmail": user_email or "participant@hackathon.com",
        "userName": user_name or (user_email.split('@')[0] if user_email else "Participant"),
        "teamName": team_name,
        "query": clean_query,
        "question": clean_query,
        "confidenceScore": round(score, 2),
        "urgencyScore": urgency_score,
        "urgencyLevel": urgency_level,
        "priority": urgency_level,
        "status": "pending",
        "response": None,
        "proposedAnswer": None,
        "resolvedBy": None,
        "timestamp": now_iso,
        "createdAt": now_iso
    }
    
    escalations = get_escalations()
    escalations.insert(0, escalation_entry)
    save_escalations(escalations)
    return escalation_id
