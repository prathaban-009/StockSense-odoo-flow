import random
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from database import get_db
from models import User, OtpCode
from schemas import UserRegister, UserLogin, OtpRequest, OtpResetPassword

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("JWT_SECRET", "stocksense-super-secret-jwt-key-2026")
ALGORITHM = "HS256"

# ==============================================================
# MAIL PROVIDER DISPATCHER (PLANNED PRODUCTION INTEGRATION)
# ==============================================================
def dispatch_otp_email(recipient_email: str, otp_code: str):
    """
    In development: prints formatted OTP alert to the console.
    In production: swap this implementation with Resend / SendGrid / AWS SES.
    """
    MAIL_PROVIDER = os.getenv("MAIL_PROVIDER", "console") # 'console' | 'resend' | 'sendgrid' | 'ses'

    # Current Development Mode: Print to console
    print("\n" + "=" * 60)
    print("📬 [FASTAPI - EMAIL / OTP SERVICE SIMULATION]")
    print(f"👤 Recipient: {recipient_email}")
    print(f"🔐 OTP Code:  {otp_code}")
    print("⏱️  Validity:  10 minutes")
    print("📦 Subject:   Your StockSense IMS Password Reset OTP")
    print("💡 Status:    Printed to console for development testing.")
    print("=" * 60 + "\n")

    if MAIL_PROVIDER == "resend":
        # Example Resend integration:
        # import resend
        # resend.api_key = os.getenv("RESEND_API_KEY")
        # resend.Emails.send({
        #     "from": "StockSense <auth@stocksense.com>",
        #     "to": recipient_email,
        #     "subject": "StockSense Password Reset OTP",
        #     "html": f"<p>Your reset code is <strong>{otp_code}</strong>. Valid for 10 minutes.</p>"
        # })
        pass
    elif MAIL_PROVIDER == "sendgrid":
        # Example SendGrid integration:
        # from sendgrid import SendGridAPIClient
        # from sendgrid.helpers.mail import Mail
        # sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
        # message = Mail(from_email="auth@stocksense.com", to_emails=recipient_email, subject="...", html_content="...")
        # sg.send(message)
        pass

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = pwd_context.hash(payload.password)
    new_user = User(
        uid=f"user_{random.randint(100000, 999999)}",
        email=payload.email.lower().strip(),
        name=payload.name,
        role=payload.role or "Inventory Manager",
        password_hash=hashed_pw
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = jwt.encode({"uid": new_user.uid, "email": new_user.email, "role": new_user.role}, SECRET_KEY, algorithm=ALGORITHM)
    return {
        "user": {"id": new_user.id, "email": new_user.email, "name": new_user.name, "role": new_user.role},
        "token": token
    }

@router.post("/login")
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not user.password_hash or not pwd_context.verify(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = jwt.encode({"uid": user.uid, "email": user.email, "role": user.role}, SECRET_KEY, algorithm=ALGORITHM)
    return {
        "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role},
        "token": token
    }

@router.post("/request-otp")
def request_otp(payload: OtpRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="No registered account found with this email")

    code = f"{random.randint(100000, 999999)}"
    otp = OtpCode(
        email=payload.email.lower().strip(),
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
        used=False
    )
    db.add(otp)
    db.commit()

    # Trigger simulated or real email dispatch
    dispatch_otp_email(payload.email, code)

    return {
        "success": True,
        "message": f"OTP sent to {payload.email}. Check terminal output or email inbox.",
        "testOtpCode": code,
        "expiresInMinutes": 10
    }

@router.post("/verify-otp-reset-password")
def verify_otp_reset_password(payload: OtpResetPassword, db: Session = Depends(get_db)):
    otp = db.query(OtpCode).filter(
        OtpCode.email == payload.email.lower().strip(),
        OtpCode.code == payload.otp_code.strip(),
        OtpCode.used == False
    ).order_by(OtpCode.created_at.desc()).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")

    if datetime.utcnow() > otp.expires_at:
        raise HTTPException(status_code=400, detail="OTP code has expired")

    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = pwd_context.hash(payload.new_password)
    otp.used = True
    db.commit()

    return {"success": True, "message": "Password successfully updated."}
