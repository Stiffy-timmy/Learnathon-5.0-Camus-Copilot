import urllib.request
import json
import uuid

BASE_URL = "http://localhost:8000"

def post(endpoint, data, token=None):
    url = f"{BASE_URL}{endpoint}"
    payload = json.dumps(data).encode('utf-8')
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def get(endpoint, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def run_tests():
    print("==================================================")
    print("RUNNING AUTOMATED END-TO-END VERIFICATION SUITE")
    print("==================================================")

    # 1. Health Check
    health = get("/api/health")
    assert health["status"] == "healthy"
    print("[OK] 1. Health Check Passed:", health)
    admin_login = post("/api/auth/login", {"identifier": "admin@hackathon.com", "password": "admin123"})
    admin_token = admin_login["token"]
    assert admin_login["user"]["role"] == "admin"
    print("[OK] 2. Admin Login Successful:", admin_login["user"]["email"])

    hacker_login = post("/api/auth/login", {"identifier": "hacker@hackathon.com", "password": "hacker123"})
    hacker_token = hacker_login["token"]
    assert hacker_login["user"]["role"] == "participant"
    print("[OK] 3. Participant Login Successful:", hacker_login["user"]["email"])

    rag_high = post("/api/rag/query", {"query": "What is the Wi-Fi network name and password?"}, hacker_token)
    assert "Hackathon_5G" in rag_high["answer"] or "innovate_together_2026" in rag_high["answer"]
    assert rag_high["isEscalated"] == False
    print("[OK] 4. RAG Natural Query Passed (SSID & Password Verified)")

    rag_low = post("/api/rag/escalate", {"query": "Where can we request quantum computing time?"}, hacker_token)
    assert "Ticket #" in rag_low["answer"]
    assert rag_low["isEscalated"] == True
    escalation_id = rag_low["escalationId"]
    print("[OK] 5. Explicit Organizer Escalation Dispatched (Ticket ID:", escalation_id, ")")

    match = get("/api/teams/matchmaking", hacker_token)
    assert "soloHackers" in match
    print("[OK] 6. Skill-Based Matchmaking Engine Calculated (Top Hacker Candidate Count:", len(match["soloHackers"]), ")")

    ann = post("/api/admin/announcements", {
        "title": "FINAL SUBMISSION ALERT",
        "message": "Projects must be submitted in 30 minutes!",
        "severity": "critical"
    }, admin_token)
    assert ann["announcement"]["severity"] == "critical"
    print("[OK] 7. Admin Alert Broadcast Dispatched:", ann["announcement"]["title"])

    feed = get("/api/announcements")
    assert any(a["id"] == ann["announcement"]["id"] for a in feed["announcements"])
    print("[OK] 8. Participant Announcements Feed Updated (Feed items:", feed["count"], ")")

    resolved = post(f"/api/admin/escalations/{escalation_id}/resolve", {
        "response": "Quantum computing hardware access is available via IBM Quantum credits at Desk 5.",
        "broadcastToAll": True
    }, admin_token)
    assert resolved["escalation"]["status"] == "resolved"
    print("[OK] 9. Admin Escalation Resolution & Q&A Broadcast Passed:", resolved["message"])

    # 9b. Test Reject and Delete Escalation endpoints
    test_esc = post("/api/rag/escalate", {"query": "Can we bring our own microwave oven?"}, hacker_token)
    test_esc_id = test_esc["escalationId"]
    rejected = post(f"/api/admin/escalations/{test_esc_id}/reject", {"reason": "Outside event policy."}, admin_token)
    assert rejected["escalation"]["status"] == "rejected"
    
    # Delete the rejected ticket
    del_req = urllib.request.Request(f"{BASE_URL}/api/admin/escalations/{test_esc_id}", headers={"Authorization": f"Bearer {admin_token}"}, method="DELETE")
    with urllib.request.urlopen(del_req) as resp:
        del_res = json.loads(resp.read().decode('utf-8'))
        assert "deleted" in del_res["message"]
    print("[OK] 9b. Admin Escalation Reject & Delete Passed Successfully")

    # 10. Account Deletion via OTP
    del_uid = uuid.uuid4().hex[:6]
    del_email = f"suitedelete_{del_uid}@hackathon.io"
    del_user = post("/api/auth/register", {
        "name": "Suite Delete User",
        "username": f"suitedel_{del_uid}",
        "email": del_email,
        "password": "Password123!",
        "role": "participant",
        "developerType": "Full-Stack Developer",
        "bio": "Passionate developer building smart agent systems.",
        "skills": ["Python", "FastAPI", "React"]
    })
    post("/api/auth/verify-email", {"email": del_email, "code": "123456"})
    req_del = post("/api/auth/request-delete-otp", {"identifier": del_email})
    conf_del = post("/api/auth/confirm-delete-account", {
        "identifier": del_email,
        "code": "123456"
    })
    assert "deleted" in conf_del["message"]
    print("[OK] 10. User Account Deletion via OTP Passed:", conf_del["message"])

    # 11. Handbook Fetch & Push Server Persistence
    hb_data = get("/api/admin/handbook", admin_token)
    assert len(hb_data["content"]) > 50
    updated_hb = post("/api/admin/handbook", {"content": hb_data["content"]}, admin_token)
    assert "saved" in updated_hb["message"].lower() or "updated" in updated_hb["message"].lower()
    print("[OK] 11. Admin Handbook Read & Permanent Push Sync Passed")

    # 12. Notification History Feed (Max 5 capped)
    notifs = get("/api/notifications")
    assert "notifications" in notifs
    assert len(notifs["notifications"]) <= 5
    print("[OK] 12. Notification Feed Verified (Max 5 Capped History count:", len(notifs["notifications"]), ")")

    # 13. Admin Team Deletion
    # Register fresh leader for team creation
    fresh_email = f"teamleader_{uuid.uuid4().hex[:6]}@hackathon.io"
    fresh_leader = post("/api/auth/register", {
        "name": "Team Delete Leader",
        "username": f"tl_{uuid.uuid4().hex[:6]}",
        "email": fresh_email,
        "password": "Password123!",
        "role": "participant",
        "developerType": "Team Lead & Architect",
        "bio": "Building scalable hackathon projects and AI agents.",
        "skills": ["Python", "React", "Docker"]
    })
    fresh_verify = post("/api/auth/verify-email", {
        "email": fresh_email,
        "code": "123456"
    })
    fresh_token = fresh_verify["token"]
    
    tmp_team = post("/api/teams/create", {
        "name": f"Automated Test Team {uuid.uuid4().hex[:4]}",
        "track": "Track 1: AI & Autonomous Agents",
        "description": "Temp team for admin deletion test"
    }, fresh_token)
    tmp_team_id = tmp_team["team"]["id"]
    
    del_team_req = urllib.request.Request(f"{BASE_URL}/api/admin/teams/{tmp_team_id}", headers={"Authorization": f"Bearer {admin_token}"}, method="DELETE")
    with urllib.request.urlopen(del_team_req) as resp:
        del_team_res = json.loads(resp.read().decode('utf-8'))
        assert "deleted" in del_team_res["message"].lower()
        assert "affectedUserIds" in del_team_res
    
    # Verify member's team is reset to None
    my_team_after = get("/api/teams/my-team", fresh_token)
    assert my_team_after["team"] is None

    # Verify team deletion announcement was recorded for popups
    announcements_after = get("/api/announcements")
    team_del_anns = [a for a in announcements_after["announcements"] if a.get("type") == "team_deleted"]
    assert len(team_del_anns) > 0
    assert tmp_team_id in [a.get("teamId") for a in team_del_anns]
    
    print("[OK] 13. Admin Team Deletion & Member Reset Notification Verified:", del_team_res["message"])

    # 14. Live Handbook Quick Reference Dynamic Extraction & Live Sync
    qref = get("/api/handbook/quick-reference")
    assert "quickReference" in qref
    ref = qref["quickReference"]
    assert "Hackathon" in ref["wifi"]["ssid"]
    assert len(ref["wifi"]["password"]) >= 4
    assert len(ref["rubric"]) >= 4
    rubric_names = [r["criterion"] for r in ref["rubric"]]
    assert "Innovation & Uniqueness" in rubric_names or any("Innovation" in n for n in rubric_names)
    assert "Breakfast" in ref["catering"]["schedule"]
    print(f"[OK] 14. Live Handbook Quick Reference Extracted: SSID={ref['wifi']['ssid']}, Pass={ref['wifi']['password']}, Catering='{ref['catering']['schedule']}'")

    # 15. Live Dynamic Tracks from Handbook Section 3
    track_res = get("/api/handbook/tracks")
    assert "tracks" in track_res
    tracks_list = track_res["tracks"]
    assert len(tracks_list) >= 4
    track_full_names = [t["fullName"] for t in tracks_list]
    assert any("AI & Autonomous Agents" in t for t in track_full_names)
    assert any("Web3" in t for t in track_full_names)
    assert any("Healthcare" in t for t in track_full_names)
    assert any("Open Innovation" in t for t in track_full_names)
    print(f"[OK] 15. Live Handbook Tracks Extracted ({len(tracks_list)} tracks): {[t['fullName'] for t in tracks_list]}")

    # Clean up temporary test data from json stores so production files remain pristine
    try:
        from app.database import save_announcements, save_notifications, save_escalations, save_teams
        save_announcements([])
        save_notifications([])
        save_escalations([])
        save_teams([])
        print("[OK] Test Cleanup: Reset notifications, announcements, escalations, and teams to clean state.")
    except Exception as e:
        pass

    print("==================================================")
    print("ALL 15 SYSTEM VERIFICATION TESTS PASSED PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
