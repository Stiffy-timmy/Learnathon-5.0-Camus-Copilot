import sys
import os
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def run():
    print("Testing with TestClient directly...")
    
    # 1. Login Admin & Participant
    admin_login = client.post("/api/auth/login", json={"identifier": "admin@hackathon.com", "password": "admin123"}).json()
    admin_token = admin_login["token"]
    
    hacker_login = client.post("/api/auth/login", json={"identifier": "hacker@hackathon.com", "password": "hacker123"}).json()
    hacker_token = hacker_login["token"]
    hacker_headers = {"Authorization": f"Bearer {hacker_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Test Timeline Telemetry
    telemetry = client.get("/api/telemetry/timeline", headers=hacker_headers).json()
    assert "activePhase" in telemetry
    print("[OK] 1. Timeline Telemetry:", telemetry["activePhase"])

    # 3. Test Trigger Milestone
    m_trigger = client.post("/api/admin/telemetry/trigger-milestone", json={
        "milestoneId": "m2_workshop",
        "customMessage": "Workshop starting in 10 minutes in Seminar Hall!"
    }, headers=admin_headers).json()
    assert "successfully triggered" in m_trigger["message"]
    print("[OK] 2. Milestone Broadcast Triggered")

    # 4. Test Dynamic Urgency Scoring on Escalation
    crit_esc = client.post("/api/rag/escalate", json={
        "query": "CRITICAL: Our repository submission is failing and deadline is here!"
    }, headers=hacker_headers).json()
    assert crit_esc["isEscalated"] == True
    print("[OK] 3. Dynamic Urgency Scoring Passed")

    # 5. Test Submission Audit
    audit_resp = client.post("/api/teams/audit-submission", json={
        "githubUrl": "https://github.com/myteam/campus-copilot-agent",
        "demoVideoUrl": "https://youtube.com/watch?v=demo123",
        "description": "Full-stack autonomous concierge for hackathon operations"
    }, headers=hacker_headers).json()
    assert "audit" in audit_resp
    print("[OK] 4. Submission Audit Passed")

    # 6. Test Logistics: Claim Key, Book Mentor, Request Hardware
    claim = client.post("/api/logistics/claim-key", json={"keyId": "key_groq"}, headers=hacker_headers).json()
    assert claim["success"] == True
    print("[OK] 5a. Claim Key Passed")

    mentor_bk = client.post("/api/logistics/book-mentor", json={
        "track": "Track 1: AI & Autonomous Agents",
        "topic": "Debugging LangChain memory leaks"
    }, headers=hacker_headers).json()
    assert mentor_bk["success"] == True
    print("[OK] 5b. Book Mentor Passed")

    hw_req = client.post("/api/logistics/request-hardware", json={
        "itemId": "hw_esp32",
        "quantity": 1
    }, headers=hacker_headers).json()
    assert hw_req["success"] == True
    print("[OK] 5c. Request Hardware Passed")

    # 7. Test New Mentor Session Booking (Photos 2 & 4)
    mentor_session = client.post("/api/logistics/book-mentor-session", json={
        "mentorName": "Dr. Sarah Chen",
        "slot": "Slot @ 14:00",
        "topic": "LLM agent architecture review"
    }, headers=hacker_headers).json()
    assert mentor_session["success"] == True
    print("[OK] 6. New Mentor Session Booking Passed")

    # 8. Test Resource Requests (Photos 2 & 5)
    res_req = client.post("/api/logistics/resource-requests", json={
        "category": "HARDWARE",
        "item": "ESP32 Wi-Fi Module",
        "reason": "Building IoT telemetry prototype"
    }, headers=hacker_headers).json()
    assert res_req["success"] == True
    req_id = res_req["request"]["id"]
    print("[OK] 7. Resource Request Submission Passed")

    # 9. Test Admin Resource Approval (Admin Editability)
    admin_appr = client.patch(f"/api/admin/logistics/resource-requests/{req_id}", json={
        "status": "APPROVED",
        "adminNotes": "Approved by hardware desk"
    }, headers=admin_headers).json()
    assert admin_appr["success"] == True
    print("[OK] 8. Admin Resource Approval Passed")

    # 10. Test Certificate Config Retrieval & Admin Update (Admin Editability)
    cert_cfg = client.get("/api/certificates/config").json()
    assert "config" in cert_cfg
    
    # 10. Test Certificate Config & Permission Lock/Unlock
    # Lock downloads first
    client.put("/api/admin/certificates/config", json={"isUnlocked": False}, headers=admin_headers)
    
    cert_gen = client.post("/api/certificates/generate", json={}, headers=hacker_headers).json()
    assert "certificate" in cert_gen
    cert_id = cert_gen["certificate"]["id"]
    print(f"[OK] 9. Certificate Record Created: {cert_id}")

    # Attempt download while locked -> Should receive 403 Forbidden
    locked_pdf_resp = client.get(f"/api/certificates/{cert_id}/download-pdf")
    assert locked_pdf_resp.status_code == 403
    print("[OK] 10. Certificate Download While Locked correctly returned 403 Forbidden")

    # Admin grants permission & unlocks downloads
    updated_cfg = client.put("/api/admin/certificates/config", json={
        "eventName": "GIETU Smart Hackathon 2026",
        "certificateTitle": "CERTIFICATE OF EXCELLENCE",
        "isUnlocked": True,
        "signatory1Name": "Dr. A. K. Sharma",
        "signatory1Title": "Convener & Head of CSE"
    }, headers=admin_headers).json()
    assert updated_cfg["config"]["isUnlocked"] == True
    print("[OK] 11. Admin Granted Certificate Download Permission")

    # Attempt download while unlocked -> Should succeed with 200 OK and valid PDF
    unlocked_pdf_resp = client.get(f"/api/certificates/{cert_id}/download-pdf")
    assert unlocked_pdf_resp.status_code == 200
    assert len(unlocked_pdf_resp.content) > 1000
    print(f"[OK] 12. Certificate Vector PDF Download: {len(unlocked_pdf_resp.content)} bytes")

    # 12. Test Mentor Directory CRUD (Admin Editability)
    mentors_list = client.get("/api/admin/logistics/mentors", headers=admin_headers).json()
    assert "mentors" in mentors_list
    assert len(mentors_list["mentors"]) >= 4

    new_mentor = client.post("/api/admin/logistics/mentors", json={
        "name": "Prof. Alan Turing",
        "title": "Quantum & Algorithmic Architect",
        "status": "Available Now",
        "statusType": "available",
        "slotTime": "15 mins (Immediate)",
        "skills": ["Algorithms", "Cryptography", "Agents"]
    }, headers=admin_headers).json()
    assert "Prof. Alan Turing" in new_mentor["mentor"]["name"]
    print("[OK] 12. Mentor Directory Admin CRUD Passed")

    print("==================================================")
    print("ALL 12/12 EXTENDED TEST SUITE CASES PASSED PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    run()
