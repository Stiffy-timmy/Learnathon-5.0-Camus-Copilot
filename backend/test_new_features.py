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
    print("RUNNING EXTENDED FEATURES VERIFICATION TEST SUITE")
    print("==================================================")

    # 1. Login Admin & Participant
    admin_login = post("/api/auth/login", {"identifier": "admin@hackathon.com", "password": "admin123"})
    admin_token = admin_login["token"]
    
    hacker_login = post("/api/auth/login", {"identifier": "hacker@hackathon.com", "password": "hacker123"})
    hacker_token = hacker_login["token"]

    # 2. Test Timeline Telemetry
    telemetry = get("/api/telemetry/timeline", hacker_token)
    assert "activePhase" in telemetry
    assert "milestones" in telemetry
    assert len(telemetry["milestones"]) >= 5
    print("[OK] 1. Timeline Telemetry Active:", telemetry["activePhase"], f"({telemetry['progressPercent']}% progress)")

    # 3. Test Trigger Milestone
    m_trigger = post("/api/admin/telemetry/trigger-milestone", {
        "milestoneId": "m2_workshop",
        "customMessage": "Workshop starting in 10 minutes in Seminar Hall!"
    }, admin_token)
    assert "successfully triggered" in m_trigger["message"]
    print("[OK] 2. Milestone Broadcast Triggered Successfully")

    # 4. Test Dynamic Urgency Scoring on Escalation
    crit_esc = post("/api/rag/escalate", {
        "query": "CRITICAL: Our repository submission is failing and deadline is here!"
    }, hacker_token)
    assert crit_esc["isEscalated"] == True
    
    # Verify ticket has urgencyScore in Admin escalations
    escs = get("/api/admin/escalations", admin_token)
    crit_ticket = next((e for e in escs["escalations"] if e["id"] == crit_esc["escalationId"]), None)
    assert crit_ticket is not None
    assert crit_ticket.get("urgencyScore", 0) >= 90
    assert crit_ticket.get("urgencyLevel") == "critical"
    print(f"[OK] 3. Dynamic Urgency Scoring Verified: Score={crit_ticket['urgencyScore']}, Level={crit_ticket['urgencyLevel']}")

    # 5. Test Submission Compliance Audit Engine
    audit_res = post("/api/teams/audit-submission", {
        "githubUrl": "https://github.com/myteam/hackathon-ai-agent",
        "demoVideoUrl": "https://loom.com/share/123456",
        "description": "An autonomous AI agent for hackathon operations and concierge."
    }, hacker_token)
    assert "audit" in audit_res
    assert audit_res["audit"]["score"] >= 80
    assert audit_res["audit"]["isEligibleForJudging"] == True
    print(f"[OK] 4. Submission Compliance Audit Passed (Audit Score: {audit_res['audit']['score']}%, Status: {audit_res['audit']['complianceStatus']})")

    # 6. Test Operational Logistics (API Keys, Mentor Booking, Hardware)
    logistics = get("/api/logistics/resources", hacker_token)
    assert len(logistics["apiKeys"]) >= 3
    assert len(logistics["hardwareInventory"]) >= 4
    
    # Claim key
    claim = post("/api/logistics/claim-key", {"keyId": "key_groq"}, hacker_token)
    assert claim["success"] == True
    assert "accessKey" in claim
    
    # Book mentor
    mentor_bk = post("/api/logistics/book-mentor", {
        "track": "Track 1: AI & Autonomous Agents",
        "topic": "Debugging LangChain memory leaks"
    }, hacker_token)
    assert mentor_bk["success"] == True
    assert "booking" in mentor_bk
    
    # Request hardware
    hw_req = post("/api/logistics/request-hardware", {
        "itemId": "hw_esp32",
        "quantity": 1
    }, hacker_token)
    assert hw_req["success"] == True
    print("[OK] 5. Operational Logistics (Key Claims, Mentor Booking, Hardware Checkout) Verified Successfully")

    # 7. Test Verifiable Certificate Creation & Verification
    cert_res = post("/api/certificates/generate", {}, hacker_token)
    assert "certificate" in cert_res
    cert = cert_res["certificate"]
    assert "HACK26-CERT-" in cert["id"]
    assert len(cert["verificationHash"]) == 16
    print(f"[OK] 6. Verifiable Certificate Generated: ID={cert['id']}, Hash={cert['verificationHash']}")

    # Verify certificate publicly
    pub_verify = get(f"/api/certificates/verify/{cert['id']}")
    assert pub_verify["isValid"] == True
    assert pub_verify["certificate"]["recipientName"] == hacker_login["user"]["name"]
    print(f"[OK] 7. Public Certificate Verification Verified: Authenticity Confirmed")

    # Download PDF certificate
    req_pdf = urllib.request.Request(f"{BASE_URL}/api/certificates/download/{cert['id']}")
    with urllib.request.urlopen(req_pdf) as resp:
        pdf_bytes = resp.read()
        assert len(pdf_bytes) > 1000
        assert pdf_bytes.startswith(b"%PDF")
    print(f"[OK] 8. Certificate Vector PDF Generation Verified ({len(pdf_bytes)} bytes)")

    # 8. Admin Submissions Audits Overview
    admin_audits = get("/api/admin/submissions/audits", admin_token)
    assert "audits" in admin_audits
    print(f"[OK] 9. Admin Submission Audits Overview Verified (Audited Teams Count: {admin_audits['total']})")

    # 9. Admin Batch Certificates Generation
    batch_certs = post("/api/admin/certificates/batch-generate", {}, admin_token)
    assert batch_certs["certificatesCount"] >= 1
    print(f"[OK] 10. Admin Batch Certificate Issuance Verified ({batch_certs['certificatesCount']} certificates created)")

    print("==================================================")
    print("ALL 10 EXTENDED FEATURE VERIFICATION TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
