import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.auth import get_current_user
from app.database import (
    get_teams, save_teams, get_users, save_users,
    get_timer_state, save_timer_state, check_and_disqualify_unsubmitted_teams
)

router = APIRouter(prefix="/api/teams", tags=["Teams & Matchmaking"])

class CreateTeamRequest(BaseModel):
    name: str
    track: str
    description: str
    neededSkills: List[str] = []

class SubmitProjectRequest(BaseModel):
    githubUrl: str

class JoinTeamRequest(BaseModel):
    inviteCodeOrId: str

class UpdateMatchmakingStatusRequest(BaseModel):
    lookingForTeam: bool
    skills: Optional[List[str]] = None
    roleTitle: Optional[str] = None
    neededSkills: Optional[List[str]] = None

def _sync_timer_disqualifications():
    timer_state = get_timer_state()
    now = datetime.now(timezone.utc)
    status = timer_state.get("status", "idle")
    if status == "running" and timer_state.get("endTime"):
        try:
            end_dt = datetime.fromisoformat(timer_state["endTime"].replace("Z", "+00:00"))
            if (end_dt - now).total_seconds() <= 0:
                timer_state["status"] = "ended"
                timer_state["remainingSeconds"] = 0.0
                save_timer_state(timer_state)
                check_and_disqualify_unsubmitted_teams()
                return True
        except Exception:
            pass
    elif status == "ended":
        check_and_disqualify_unsubmitted_teams()
        return True
    return False

@router.get("/my-team")
def get_my_team(current_user: dict = Depends(get_current_user)):
    _sync_timer_disqualifications()
    team_id = current_user.get("teamId")
    if not team_id:
        return {"team": None, "message": "You are currently a solo hacker not assigned to any team."}
        
    teams = get_teams()
    team = next((t for t in teams if t.get("id") == team_id), None)
    if not team:
        return {"team": None, "message": "Team record not found."}
    return {"team": team}

@router.get("")
def list_teams():
    _sync_timer_disqualifications()
    teams = get_teams()
    return {"teams": teams, "total": len(teams)}

@router.post("/create")
def create_team(req: CreateTeamRequest, current_user: dict = Depends(get_current_user)):
    _sync_timer_disqualifications()
    teams = get_teams()
    users = get_users()
    
    if current_user.get("teamId"):
        raise HTTPException(status_code=400, detail="You are already a member of a team. Leave your current team first.")
        
    name_clean = req.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Team name cannot be empty.")

    # Duplicate team name verification (case-insensitive)
    for t in teams:
        if t.get("name", "").strip().lower() == name_clean.lower():
            raise HTTPException(
                status_code=400,
                detail=f'A team named "{name_clean}" already exists. Please choose a different team name.'
            )
        
    team_id = f"t_{uuid.uuid4().hex[:6]}"
    clean_code_prefix = re.sub(r'[^A-Za-z0-9]', '', name_clean).upper()[:6]
    if len(clean_code_prefix) < 3:
        clean_code_prefix = (clean_code_prefix + "TEAM")[:6]
    invite_code = clean_code_prefix + uuid.uuid4().hex[:3].upper()
    
    member_entry = {
        "userId": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user.get("roleTitle", "Team Lead"),
        "skills": current_user.get("skills", []),
        "isLeader": True
    }
    
    new_team = {
        "id": team_id,
        "name": name_clean,
        "track": req.track.strip(),
        "description": req.description.strip(),
        "lookingForTeammates": True,
        "neededSkills": req.neededSkills,
        "status": "not_submitted",
        "githubUrl": "",
        "submittedAt": "",
        "members": [member_entry],
        "inviteCode": invite_code,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    teams.append(new_team)
    save_teams(teams)
    
    # Update user teamId
    for u in users:
        if u["id"] == current_user["id"]:
            u["teamId"] = team_id
            u["lookingForTeam"] = False
            break
    save_users(users)
    
    return {"message": "Team successfully created!", "team": new_team}

@router.post("/submit")
def submit_team_project(req: SubmitProjectRequest, current_user: dict = Depends(get_current_user)):
    team_id = current_user.get("teamId")
    if not team_id:
        raise HTTPException(status_code=400, detail="You are not part of any registered team.")
        
    _sync_timer_disqualifications()
    teams = get_teams()
    team = next((t for t in teams if t["id"] == team_id), None)
    if not team:
        raise HTTPException(status_code=404, detail="Team record not found.")

    # 1. Disqualification check - strictly locked
    if team.get("status") == "disqualified":
        reason = team.get("disqualificationReason") or "Violation of hackathon rules or missing mandatory checkpoints."
        raise HTTPException(
            status_code=403, 
            detail=f"Your team has been disqualified: {reason}. Project repository submissions are permanently locked."
        )

    # 2. Once submitted, they should NOT be able to edit the link again
    if team.get("status") == "submitted" or bool(team.get("githubUrl")):
        raise HTTPException(
            status_code=400, 
            detail="Your team project has already been submitted and cannot be edited. Final submissions are locked."
        )

    # 3. Check if the timer has stopped / ended
    timer_state = get_timer_state()
    now = datetime.now(timezone.utc)
    timer_status = timer_state.get("status", "idle")
    
    if timer_status == "running" and timer_state.get("endTime"):
        try:
            end_dt = datetime.fromisoformat(timer_state["endTime"].replace("Z", "+00:00"))
            if (end_dt - now).total_seconds() <= 0:
                timer_state["status"] = "ended"
                timer_state["remainingSeconds"] = 0.0
                save_timer_state(timer_state)
                check_and_disqualify_unsubmitted_teams()
                timer_status = "ended"
        except Exception:
            pass

    if timer_status == "ended":
        check_and_disqualify_unsubmitted_teams()
        raise HTTPException(
            status_code=400,
            detail="The hackathon submission deadline has passed and the timer has ended. Submissions are closed and unsubmitted teams are disqualified."
        )

    # 4. Strictly enforce that only the Team Leader can submit the project
    members = team.get("members", [])
    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").strip().lower()
    
    is_leader = any(
        (m.get("userId") == user_id or (m.get("email") or "").strip().lower() == user_email) 
        and bool(m.get("isLeader"))
        for m in members
    )
    if not is_leader:
        raise HTTPException(
            status_code=403, 
            detail="Only the Team Leader has permission to submit the final project repository."
        )
        
    gh_url = req.githubUrl.strip()
    if not gh_url:
        raise HTTPException(status_code=400, detail="GitHub repository link is required.")
        
    # Validate GitHub URL format
    if not gh_url.startswith("http://") and not gh_url.startswith("https://"):
        gh_url = f"https://{gh_url}"
        
    if "github.com" not in gh_url.lower():
        raise HTTPException(
            status_code=400, 
            detail="Please provide a valid GitHub repository URL (e.g., https://github.com/organization/project)."
        )
        
    team["status"] = "submitted"
    team["githubUrl"] = gh_url
    team["submittedAt"] = datetime.now(timezone.utc).isoformat()
    save_teams(teams)
    
    return {
        "message": f"Project for team '{team.get('name')}' successfully submitted with GitHub repository!",
        "team": team
    }

@router.post("/join")
def join_team(req: JoinTeamRequest, current_user: dict = Depends(get_current_user)):
    teams = get_teams()
    users = get_users()
    
    if current_user.get("teamId"):
        raise HTTPException(status_code=400, detail="You are already in a team.")
        
    code_clean = req.inviteCodeOrId.strip().upper()
    team = next((
        t for t in teams
        if t.get("inviteCode", "").upper() == code_clean or t.get("id", "").upper() == code_clean
    ), None)
    
    if not team:
        raise HTTPException(status_code=404, detail="Invalid team invite code or Team ID.")
        
    if len(team.get("members", [])) >= 4:
        raise HTTPException(status_code=400, detail="This team is already full (Max 4 members).")
        
    member_entry = {
        "userId": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user.get("roleTitle", "Contributor"),
        "skills": current_user.get("skills", []),
        "isLeader": False
    }
    
    team["members"].append(member_entry)
    save_teams(teams)
    
    for u in users:
        if u["id"] == current_user["id"]:
            u["teamId"] = team["id"]
            u["lookingForTeam"] = False
            break
    save_users(users)
    
    return {"message": f"Successfully joined {team['name']}!", "team": team}

@router.put("/matchmaking-status")
def update_matchmaking_status(req: UpdateMatchmakingStatusRequest, current_user: dict = Depends(get_current_user)):
    users = get_users()
    teams = get_teams()
    
    user_entry = next((u for u in users if u["id"] == current_user["id"]), None)
    if user_entry:
        user_entry["lookingForTeam"] = req.lookingForTeam
        if req.skills is not None:
            user_entry["skills"] = req.skills
        if req.roleTitle is not None:
            user_entry["roleTitle"] = req.roleTitle
        save_users(users)
        
    if current_user.get("teamId") and req.neededSkills is not None:
        team = next((t for t in teams if t["id"] == current_user["teamId"]), None)
        if team:
            team["neededSkills"] = req.neededSkills
            team["lookingForTeammates"] = req.lookingForTeam
            save_teams(teams)
            
    return {"message": "Matchmaking status and preferences updated!"}

class RemoveMemberRequest(BaseModel):
    userId: str

@router.post("/remove-member")
def remove_team_member(req: RemoveMemberRequest, current_user: dict = Depends(get_current_user)):
    team_id = current_user.get("teamId")
    if not team_id:
        raise HTTPException(status_code=400, detail="You are not part of any team.")
        
    teams = get_teams()
    users = get_users()
    
    team = next((t for t in teams if t.get("id") == team_id), None)
    if not team:
        raise HTTPException(status_code=404, detail="Team record not found.")
        
    # Verify current user is a leader
    current_member = next((m for m in team.get("members", []) if m.get("userId") == current_user["id"] or m.get("email", "").lower() == current_user.get("email", "").lower()), None)
    if not current_member or not current_member.get("isLeader"):
        raise HTTPException(status_code=403, detail="Only the Team Leader has permission to remove members.")
        
    target_user_id = req.userId.strip()
    if target_user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Team Leader cannot remove themselves. Please pass leadership or delete the team.")
        
    target_member = next((m for m in team.get("members", []) if m.get("userId") == target_user_id), None)
    if not target_member:
        raise HTTPException(status_code=404, detail="Target member was not found in your team roster.")
        
    # Remove member from team
    team["members"] = [m for m in team.get("members", []) if m.get("userId") != target_user_id]
    save_teams(teams)
    
    # Update target user's profile to solo status
    for u in users:
        if u["id"] == target_user_id:
            u["teamId"] = None
            u["lookingForTeam"] = True
            break
    save_users(users)
    
    return {
        "message": f"Successfully removed {target_member.get('name', 'member')} from the team roster.",
        "team": team
    }

@router.post("/leave")
def leave_team(current_user: dict = Depends(get_current_user)):
    team_id = current_user.get("teamId")
    if not team_id:
        raise HTTPException(status_code=400, detail="You are not currently part of any team.")
        
    teams = get_teams()
    users = get_users()
    
    team = next((t for t in teams if t.get("id") == team_id), None)
    if not team:
        # User had a stale teamId; reset it
        for u in users:
            if u["id"] == current_user["id"]:
                u["teamId"] = None
                u["lookingForTeam"] = True
                break
        save_users(users)
        return {"message": "You have left the team and are now a Solo Hacker."}
        
    members = team.get("members", [])
    current_member = next((m for m in members if m.get("userId") == current_user["id"] or m.get("email", "").lower() == current_user.get("email", "").lower()), None)
    
    # If the user is the only member, disband the team
    if len(members) <= 1:
        teams = [t for t in teams if t.get("id") != team_id]
        save_teams(teams)
    else:
        # Remove user and reassign leadership if necessary
        remaining_members = [m for m in members if m.get("userId") != current_user["id"] and m.get("email", "").lower() != current_user.get("email", "").lower()]
        if current_member and current_member.get("isLeader") and remaining_members:
            remaining_members[0]["isLeader"] = True
        team["members"] = remaining_members
        save_teams(teams)
        
    # Update user's profile to solo status
    for u in users:
        if u["id"] == current_user["id"]:
            u["teamId"] = None
            u["lookingForTeam"] = True
            break
    save_users(users)
    
    return {"message": "You have successfully left the team and are now a Solo Hacker."}

@router.get("/matchmaking")
def get_matchmaking(current_user: dict = Depends(get_current_user)):
    users = get_users()
    teams = get_teams()
    
    my_team_id = current_user.get("teamId")
    my_team = next((t for t in teams if t["id"] == my_team_id), None) if my_team_id else None
    
    user_skills = set(s.lower() for s in current_user.get("skills", []))
    target_needed_skills = set()
    if my_team and my_team.get("neededSkills"):
        target_needed_skills = set(s.lower() for s in my_team.get("neededSkills", []))
    
    # Collect all user IDs and emails belonging to ANY team
    team_member_ids = set()
    for t in teams:
        for m in t.get("members", []):
            if m.get("userId"):
                team_member_ids.add(str(m["userId"]))
            if m.get("email"):
                team_member_ids.add(str(m["email"]).strip().lower())

    # Match candidate solo hackers (strictly non-team members)
    matched_hackers = []
    for u in users:
        # Exclude active user themselves
        if str(u.get("id")) == str(current_user.get("id")):
            continue
        # Only participants (exclude admins/organizers)
        if str(u.get("role", "")).lower() != "participant":
            continue
        # If user is already in ANY team (via teamId or in team members list), strictly exclude
        u_team_id = u.get("teamId")
        if u_team_id and str(u_team_id).strip() and str(u_team_id).strip().lower() != "none":
            continue
        if str(u.get("id")) in team_member_ids:
            continue
        if u.get("email", "").strip().lower() in team_member_ids:
            continue
            
        bio_clean = (u.get("bio") or "").strip().strip('"').strip("'")
        if not bio_clean:
            bio_clean = "Passionate developer looking to build impactful solutions."
            
        cand_skills = u.get("skills", [])
        
        # Calculate dynamic match score if team has needed skills or user has complementary skills
        match_score = None
        if target_needed_skills and cand_skills:
            cand_skill_set = set(s.lower() for s in cand_skills)
            overlap = len(target_needed_skills.intersection(cand_skill_set))
            match_score = min(100, max(60, int((overlap / len(target_needed_skills)) * 100)))
        elif user_skills and cand_skills:
            cand_skill_set = set(s.lower() for s in cand_skills)
            diff = len(cand_skill_set - user_skills)
            match_score = min(98, 65 + (diff * 8))

        matched_hackers.append({
            "id": u["id"],
            "name": u.get("name", "Anonymous Hacker"),
            "username": u.get("username", "user"),
            "email": u.get("email", ""),
            "roleTitle": u.get("roleTitle") or "Full-Stack Developer",
            "bio": bio_clean,
            "skills": cand_skills,
            "matchScore": match_score
        })
        
    matched_hackers.sort(key=lambda x: (-(x["matchScore"] or 0), x["name"].lower()))
    
    # Match open teams looking for teammates
    matched_teams = []
    for t in teams:
        if my_team_id and t["id"] == my_team_id:
            continue
        if not t.get("lookingForTeammates", False):
            continue
        if len(t.get("members", [])) >= 4:
            continue
            
        matched_teams.append({
            "id": t["id"],
            "name": t["name"],
            "track": t["track"],
            "description": t.get("description", ""),
            "neededSkills": t.get("neededSkills", []),
            "memberCount": len(t.get("members", [])),
            "inviteCode": t.get("inviteCode")
        })
        
    matched_teams.sort(key=lambda x: x["name"].lower())
    
    return {
        "soloHackers": matched_hackers,
        "candidates": matched_hackers,
        "openTeams": matched_teams,
        "targetNeededSkills": list(target_needed_skills)
    }
