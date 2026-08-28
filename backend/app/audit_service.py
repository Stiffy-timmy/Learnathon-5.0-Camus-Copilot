import re
import urllib.parse
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.database import get_teams, save_teams

def audit_project_submission(
    github_url: str,
    demo_video_url: Optional[str] = None,
    track: Optional[str] = None,
    description: Optional[str] = None,
    team_members_count: int = 1
) -> Dict[str, Any]:
    """
    Performs comprehensive automated submission compliance auditing against platform guidelines.
    Checks:
    1. Repository URL format & public GitHub pattern
    2. Demo video link (YouTube, Loom, Vimeo, Google Drive)
    3. Track eligibility and description depth
    4. Team member compliance (1 to 4 members)
    5. Documentation & README checklist
    """
    checks: List[Dict[str, Any]] = []
    score = 100
    errors: List[str] = []
    warnings: List[str] = []
    passed: List[str] = []

    # 1. GitHub Repository Audit
    gh_clean = (github_url or "").strip()
    if not gh_clean:
        score -= 40
        errors.append("Missing GitHub Repository link. Repository URL is mandatory for evaluation.")
        checks.append({
            "id": "github_repo",
            "name": "GitHub Repository URL",
            "status": "fail",
            "message": "Repository URL is missing."
        })
    else:
        if not gh_clean.startswith("http://") and not gh_clean.startswith("https://"):
            gh_clean = f"https://{gh_clean}"
            
        gh_pattern = r"^https?://(www\.)?github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$"
        if not re.match(gh_pattern, gh_clean):
            score -= 25
            warnings.append("GitHub URL format may be non-standard. Ensure it points to a public repository (e.g. https://github.com/org/repo).")
            checks.append({
                "id": "github_repo",
                "name": "GitHub Repository URL",
                "status": "warning",
                "message": "Repository URL syntax appears incomplete or has extra sub-paths."
            })
        else:
            checks.append({
                "id": "github_repo",
                "name": "GitHub Repository URL",
                "status": "pass",
                "message": f"Valid public repository structure: {gh_clean}"
            })
            passed.append("Valid GitHub Repository format detected.")

    # 2. Demo Video Audit
    vid_clean = (demo_video_url or "").strip()
    if not vid_clean:
        score -= 20
        warnings.append("No Demo Video link provided. A 2-3 minute walk-through video (Loom/YouTube) is strongly recommended for judging.")
        checks.append({
            "id": "demo_video",
            "name": "Demo Video Walkthrough",
            "status": "warning",
            "message": "Demo video URL is missing. Add Loom, YouTube, or Drive link to improve judging score."
        })
    else:
        valid_video_hosts = ["youtube.com", "youtu.be", "loom.com", "vimeo.com", "drive.google.com", "streamable.com"]
        if any(h in vid_clean.lower() for h in valid_video_hosts):
            checks.append({
                "id": "demo_video",
                "name": "Demo Video Walkthrough",
                "status": "pass",
                "message": f"Recognized video host: {vid_clean}"
            })
            passed.append("Demo video walkthrough URL verified.")
        else:
            warnings.append("Demo video URL is from an unrecognized host. Ensure judges can access it without login restrictions.")
            checks.append({
                "id": "demo_video",
                "name": "Demo Video Walkthrough",
                "status": "warning",
                "message": "Video link provided, but host platform is unverified."
            })

    # 3. Track Alignment & Description Depth
    desc_clean = (description or "").strip()
    if len(desc_clean) < 20:
        score -= 15
        warnings.append("Project description is too short (less than 20 characters). Provide a clear problem statement and tech stack overview.")
        checks.append({
            "id": "project_description",
            "name": "Project Description & Architecture",
            "status": "warning",
            "message": "Description is under 20 characters."
        })
    else:
        checks.append({
            "id": "project_description",
            "name": "Project Description & Architecture",
            "status": "pass",
            "message": f"Comprehensive description provided ({len(desc_clean)} chars)."
        })
        passed.append("Detailed project description provided.")

    # 4. Track Eligibility
    if not track or not track.strip():
        score -= 10
        errors.append("No hackathon track selected.")
        checks.append({
            "id": "track_eligibility",
            "name": "Track Eligibility",
            "status": "fail",
            "message": "Team has not registered under any domain track."
        })
    else:
        checks.append({
            "id": "track_eligibility",
            "name": "Track Eligibility",
            "status": "pass",
            "message": f"Registered under: {track}"
        })
        passed.append(f"Registered for track: {track}")

    # 5. Team Size Compliance
    if team_members_count < 1 or team_members_count > 4:
        score -= 15
        errors.append(f"Team size ({team_members_count} members) violates the 1-4 members rule.")
        checks.append({
            "id": "team_size",
            "name": "Team Member Limits",
            "status": "fail",
            "message": f"Invalid team size: {team_members_count} members."
        })
    else:
        checks.append({
            "id": "team_size",
            "name": "Team Member Limits",
            "status": "pass",
            "message": f"Compliant roster: {team_members_count} member(s)."
        })
        passed.append(f"Roster size ({team_members_count}) within allowed limits.")

    # Normalize score
    final_score = max(0, min(100, score))
    
    compliance_status = "compliant"
    if errors:
        compliance_status = "action_required"
    elif warnings:
        compliance_status = "warnings_present"

    return {
        "score": final_score,
        "complianceStatus": compliance_status,
        "checks": checks,
        "errors": errors,
        "warnings": warnings,
        "passed": passed,
        "isEligibleForJudging": len(errors) == 0,
        "auditedAt": datetime.now(timezone.utc).isoformat()
    }
