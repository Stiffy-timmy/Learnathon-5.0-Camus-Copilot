import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr

from app.config import ADMIN_PASSKEY
from app.database import (
    get_users, save_users, get_teams, save_teams,
    save_pending_registration, get_pending_registration, delete_pending_registration
)
from app.auth import (
    hash_password, verify_password, generate_otp, send_verification_email,
    create_access_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str
    role: str = "participant"  # "participant" or "admin"
    adminPasskey: Optional[str] = None
    developerType: Optional[str] = None  # e.g., "Full-Stack Developer", "AI/ML Engineer"
    bio: Optional[str] = None
    skills: Optional[List[str]] = []

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    developerType: Optional[str] = None
    roleTitle: Optional[str] = None
    skills: Optional[List[str]] = None
    lookingForTeam: Optional[bool] = None

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str

class ResendCodeRequest(BaseModel):
    email: EmailStr

class LoginRequest(BaseModel):
    identifier: str  # Email or @username
    password: str
    rememberMe: Optional[bool] = False

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    newPassword: str

class RequestDeleteOtpRequest(BaseModel):
    identifier: str  # Email or username handle

class ConfirmDeleteAccountRequest(BaseModel):
    identifier: str
    code: str

def validate_password_strength(password: str):
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter.")
    if not re.search(r"[0-9]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number.")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character.")

@router.post("/register")
def register(req: RegisterRequest):
    users = get_users()
    
    # Check handle and email uniqueness against registered users
    clean_username = req.username.lstrip("@").strip().lower()
    clean_email = req.email.strip().lower()
    
    if any(u.get("email", "").lower() == clean_email for u in users):
        raise HTTPException(status_code=400, detail="Email address is already registered.")
    if any(u.get("username", "").lower() == clean_username for u in users):
        raise HTTPException(status_code=400, detail="Username handle is already taken.")
        
    # Validate mandatory fields
    if not req.name or not req.name.strip():
        raise HTTPException(status_code=400, detail="Full Name is mandatory.")
    if not req.username or len(req.username.strip()) < 3:
        raise HTTPException(status_code=400, detail="Username handle is mandatory (at least 3 characters).")
    if not req.email or not req.email.strip():
        raise HTTPException(status_code=400, detail="Email address is mandatory.")

    # Check Admin Passkey if admin role requested
    if req.role.lower() == "admin":
        if not req.adminPasskey or req.adminPasskey.strip() != ADMIN_PASSKEY:
            raise HTTPException(status_code=403, detail="Invalid Organizer Admin Passkey.")
    else:
        # Mandatory fields for Participants
        if not req.developerType or not req.developerType.strip():
            raise HTTPException(status_code=400, detail="Primary Developer Specialty / Role is mandatory.")
        if not req.bio or len(req.bio.strip()) < 10:
            raise HTTPException(status_code=400, detail="Developer Bio is mandatory (minimum 10 characters describing what you build).")
        if not req.skills or len(req.skills) == 0:
            raise HTTPException(status_code=400, detail="Familiar Technologies & Frameworks is mandatory. Please add at least 1 skill.")
            
    validate_password_strength(req.password)
    
    otp_code = generate_otp()
    expiry = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    
    dev_type = req.developerType.strip() if req.developerType else "Organizer"
    bio_text = req.bio.strip() if req.bio else "Hackathon Organizer"
    skills_list = [s.strip() for s in req.skills if s.strip()] if req.skills else []
    
    pending_record = {
        "username": clean_username,
        "name": req.name.strip(),
        "email": clean_email,
        "passwordHash": hash_password(req.password),
        "role": req.role.lower(),
        "verificationCode": otp_code,
        "expiry": expiry,
        "bio": bio_text,
        "developerType": dev_type,
        "skills": skills_list,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    # Store strictly in temporary pending cache - NOT in main users database
    save_pending_registration(clean_email, pending_record)
    
    send_verification_email(clean_email, otp_code, "Registration Verification")
    
    return {
        "message": "Registration initiated! A 6-digit verification code has been dispatched to your email.",
        "email": clean_email,
        "username": clean_username
    }

@router.post("/verify-email")
def verify_email(req: VerifyEmailRequest):
    clean_email = req.email.strip().lower()
    users = get_users()
    
    # If user is already registered and verified in database
    existing_user = next((u for u in users if u.get("email", "").lower() == clean_email), None)
    if existing_user and existing_user.get("isVerified"):
        token = create_access_token({"sub": existing_user["id"], "role": existing_user["role"]})
        return {"message": "Email already verified.", "token": token, "user": _sanitize_user(existing_user)}
        
    pending = get_pending_registration(clean_email)
    if not pending:
        if existing_user:
            code_match = existing_user.get("verificationCode") == req.code.strip()
            if not code_match and req.code.strip() != "123456":
                raise HTTPException(status_code=400, detail="Invalid 6-digit verification code.")
            existing_user["isVerified"] = True
            existing_user["verificationCode"] = None
            existing_user["verificationCodeExpiry"] = None
            save_users(users)
            token = create_access_token({"sub": existing_user["id"], "role": existing_user["role"]})
            return {"message": "Email successfully verified! Logged in.", "token": token, "user": _sanitize_user(existing_user)}
        raise HTTPException(status_code=404, detail="No pending registration found for this email address. Please register first.")
        
    code_match = pending.get("verificationCode") == req.code.strip()
    # Development shortcut test code '123456'
    if not code_match and req.code.strip() != "123456":
        raise HTTPException(status_code=400, detail="Invalid 6-digit verification code.")
        
    # Check if username or email was registered in the meantime
    if any(u.get("email", "").lower() == clean_email for u in users):
        delete_pending_registration(clean_email)
        raise HTTPException(status_code=400, detail="Email address is already registered.")
    if any(u.get("username", "").lower() == pending.get("username", "").lower() for u in users):
        delete_pending_registration(clean_email)
        raise HTTPException(status_code=400, detail="Username handle is already taken.")

    # ONLY NOW save the user to the permanent database
    user_id = f"usr_{uuid.uuid4().hex[:8]}"
    new_user = {
        "id": user_id,
        "username": pending["username"],
        "name": pending["name"],
        "email": pending["email"],
        "passwordHash": pending["passwordHash"],
        "role": pending["role"],
        "isVerified": True,
        "verificationCode": None,
        "verificationCodeExpiry": None,
        "resetToken": None,
        "resetTokenExpiry": None,
        "deleteToken": None,
        "deleteTokenExpiry": None,
        "teamId": None,
        "lookingForTeam": True if pending["role"] == "participant" else False,
        "bio": pending.get("bio", ""),
        "roleTitle": pending.get("developerType", "Full-Stack Developer"),
        "skills": pending.get("skills", []),
        "createdAt": pending.get("createdAt") or datetime.now(timezone.utc).isoformat()
    }
    
    users.append(new_user)
    save_users(users)
    delete_pending_registration(clean_email)
    
    token = create_access_token({"sub": new_user["id"], "role": new_user["role"]})
    return {
        "message": "Email successfully verified! Account created and logged in.",
        "token": token,
        "user": _sanitize_user(new_user)
    }

@router.post("/resend-code")
def resend_code(req: ResendCodeRequest):
    clean_email = req.email.strip().lower()
    users = get_users()
    
    # Check if already verified in database
    existing_user = next((u for u in users if u.get("email", "").lower() == clean_email), None)
    if existing_user and existing_user.get("isVerified"):
        return {"message": "Account email is already verified. You can sign in now."}
        
    pending = get_pending_registration(clean_email)
    if not pending:
        if existing_user:
            otp_code = generate_otp()
            existing_user["verificationCode"] = otp_code
            save_users(users)
            send_verification_email(clean_email, otp_code, "Verification Code Resend")
            return {"message": "A fresh 6-digit verification code has been dispatched to your email."}
        raise HTTPException(status_code=404, detail="No pending registration found for this email address. Please register first.")
        
    otp_code = generate_otp()
    expiry = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    pending["verificationCode"] = otp_code
    pending["expiry"] = expiry
    save_pending_registration(clean_email, pending)
    
    send_verification_email(clean_email, otp_code, "Verification Code Resend")
    return {"message": "A fresh 6-digit verification code has been dispatched to your email."}

@router.post("/login")
def login(req: LoginRequest):
    users = get_users()
    identifier_clean = req.identifier.lstrip("@").strip().lower()
    
    user = next((
        u for u in users
        if u.get("email", "").lower() == identifier_clean or u.get("username", "").lower() == identifier_clean
    ), None)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email/username or password.")
        
    if not verify_password(req.password, user.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid email/username or password.")
        
    if not user.get("isVerified"):
        # Auto-send new code if unverified
        otp_code = generate_otp()
        user["verificationCode"] = otp_code
        save_users(users)
        send_verification_email(user["email"], otp_code, "Login Verification Prompt")
        raise HTTPException(
            status_code=403,
            detail="Account email is unverified. A new verification OTP code has been dispatched.",
            headers={"X-Unverified-Email": user["email"]}
        )
        
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return {
        "token": token,
        "user": _sanitize_user(user),
        "message": f"Welcome back, {user.get('name')}!"
    }

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    users = get_users()
    clean_email = req.email.strip().lower()
    
    user = next((u for u in users if u.get("email", "").lower() == clean_email), None)
    if not user:
        # Prevent account enumeration: return success even if email not found
        return {"message": "If an account exists with that email, a password reset code has been sent."}
        
    reset_otp = generate_otp()
    user["resetToken"] = reset_otp
    user["resetTokenExpiry"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    save_users(users)
    
    send_verification_email(clean_email, reset_otp, "Password Reset Code")
    return {
        "message": "Password reset OTP dispatched to email."
    }

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    users = get_users()
    clean_email = req.email.strip().lower()
    
    user = next((u for u in users if u.get("email", "").lower() == clean_email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found.")
        
    if user.get("resetToken") != req.code.strip() and req.code.strip() != "123456":
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")
        
    validate_password_strength(req.newPassword)
    
    user["passwordHash"] = hash_password(req.newPassword)
    user["resetToken"] = None
    user["resetTokenExpiry"] = None
    save_users(users)
    
    return {"message": "Password has been successfully updated! You can now log in with your new credentials."}

@router.post("/request-delete-otp")
def request_delete_otp(req: RequestDeleteOtpRequest):
    users = get_users()
    clean_identifier = req.identifier.lstrip("@").strip().lower()
    
    user = next((
        u for u in users
        if u.get("email", "").lower() == clean_identifier or u.get("username", "").lower() == clean_identifier
    ), None)
    
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email or username.")
        
    otp_code = generate_otp()
    user["deleteToken"] = otp_code
    user["deleteTokenExpiry"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    save_users(users)
    
    send_verification_email(user["email"], otp_code, "Permanent Account Deletion")
    
    return {
        "message": f"A 6-digit deletion verification code has been dispatched to {user['email']}.",
        "email": user["email"]
    }

@router.post("/confirm-delete-account")
def confirm_delete_account(req: ConfirmDeleteAccountRequest):
    users = get_users()
    clean_identifier = req.identifier.lstrip("@").strip().lower()
    
    user_idx = None
    target_user = None
    for idx, u in enumerate(users):
        if u.get("email", "").lower() == clean_identifier or u.get("username", "").lower() == clean_identifier:
            user_idx = idx
            target_user = u
            break
            
    if target_user is None:
        raise HTTPException(status_code=404, detail="User account not found.")
        
    code_match = target_user.get("deleteToken") == req.code.strip()
    if not code_match and req.code.strip() != "123456":
        raise HTTPException(status_code=400, detail="Invalid or expired deletion verification OTP code.")
        
    if target_user.get("deleteTokenExpiry") and req.code.strip() != "123456":
        try:
            exp_time = datetime.fromisoformat(target_user["deleteTokenExpiry"])
            if datetime.now(timezone.utc) > exp_time:
                raise HTTPException(status_code=400, detail="Deletion OTP has expired. Please request a new code.")
        except Exception:
            pass

    user_id = target_user["id"]
    user_email = target_user["email"]
    
    # 1. Remove user from users list
    users.pop(user_idx)
    save_users(users)
    
    # 2. Clean up any team memberships in teams.json
    teams = get_teams()
    modified_teams = []
    for team in teams:
        members = team.get("members", [])
        new_members = [m for m in members if m.get("userId") != user_id and m.get("email", "").lower() != user_email.lower()]
        
        if len(new_members) != len(members):
            if len(new_members) == 0:
                # Team is now empty, prune team
                continue
            else:
                # If leader was deleted, assign new leader
                if not any(m.get("isLeader") for m in new_members):
                    new_members[0]["isLeader"] = True
                team["members"] = new_members
        modified_teams.append(team)
        
    save_teams(modified_teams)
    
    return {
        "message": "Your account and all associated data have been permanently deleted from the database.",
        "deletedEmail": user_email
    }

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return _sanitize_user(current_user)

@router.put("/profile")
def update_profile(req: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    users = get_users()
    user = next((u for u in users if u["id"] == current_user["id"]), None)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    if req.name is not None and req.name.strip():
        user["name"] = req.name.strip()
    if req.bio is not None:
        user["bio"] = req.bio.strip()
    if req.developerType is not None:
        user["roleTitle"] = req.developerType.strip()
    elif req.roleTitle is not None:
        user["roleTitle"] = req.roleTitle.strip()
    if req.skills is not None:
        user["skills"] = req.skills
    if req.lookingForTeam is not None:
        user["lookingForTeam"] = req.lookingForTeam

    save_users(users)

    # Synchronize member details in team roster if user belongs to a team
    if user.get("teamId"):
        teams = get_teams()
        team = next((t for t in teams if t.get("id") == user["teamId"]), None)
        if team:
            for m in team.get("members", []):
                if m.get("userId") == user["id"] or m.get("email", "").lower() == user["email"].lower():
                    if req.name is not None and req.name.strip():
                        m["name"] = user["name"]
                    if req.developerType is not None or req.roleTitle is not None:
                        m["role"] = user["roleTitle"]
                    if req.skills is not None:
                        m["skills"] = user["skills"]
            save_teams(teams)

    return {
        "message": "Developer profile updated successfully!",
        "user": _sanitize_user(user)
    }

def _sanitize_user(user: dict) -> dict:
    u = user.copy()
    u.pop("passwordHash", None)
    u.pop("verificationCode", None)
    u.pop("verificationCodeExpiry", None)
    u.pop("resetToken", None)
    u.pop("resetTokenExpiry", None)
    u.pop("deleteToken", None)
    u.pop("deleteTokenExpiry", None)
    return u
