import hashlib
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core import security
from app.core.audit import audit_logger
from app.core.encryption import encryption_service
from app.models.user import User
from app.models.account import Account
from app.schemas.auth import (
    RegisterRequest, LoginRequest, MFALoginRequest,
    RefreshRequest, LogoutRequest, LoginResponse,
    TOTPSetupResponse, TOTPVerifyRequest, TokenResponse,
)
from app.api.deps import get_current_user, get_request_ip
from app.services.notification_service import notification_service
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _generate_account_number() -> str:
    import random
    return "".join([str(random.randint(0, 9)) for _ in range(10)])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    # Check duplicate email (search by encrypted value)
    all_users = db.query(User).all()
    for u in all_users:
        try:
            if encryption_service.decrypt(u.email) == payload.email.lower():
                raise HTTPException(status_code=409, detail="Email already registered")
        except HTTPException:
            raise
        except Exception:
            pass

    bvn_hash = hashlib.sha256(payload.bvn_nin.encode()).hexdigest()

    user = User(
        full_name=payload.full_name,
        email=encryption_service.encrypt(payload.email.lower()),
        phone_number=encryption_service.encrypt(payload.phone_number),
        bvn_nin_hash=bvn_hash,
        password_hash=security.hash_password(payload.password),
        is_verified=True,
        is_active=True,
        role="customer",
    )
    db.add(user)
    db.flush()

    acct_number = _generate_account_number()
    account = Account(
        user_id=user.id,
        account_number=encryption_service.encrypt(acct_number),
        account_type="savings",
        balance=0,
        currency="NGN",
        is_active=True,
    )
    db.add(account)
    db.commit()

    audit_logger.log(
        "USER_REGISTERED",
        {"full_name": payload.full_name, "email": payload.email},
        db, user_id=str(user.id), ip=get_request_ip(request),
    )
    notification_service.send_registration_notification(payload.email, payload.full_name)

    return {
        "message": "Registration successful",
        "user_id": str(user.id),
        "account_number": acct_number,
    }


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    all_users = db.query(User).all()
    user = None
    for u in all_users:
        try:
            if encryption_service.decrypt(u.email) == payload.email.lower():
                user = u
                break
        except Exception:
            pass

    if not user or not security.verify_password(payload.password, user.password_hash):
        audit_logger.log(
            "LOGIN_FAILED",
            {"email": payload.email, "reason": "invalid_credentials"},
            db, ip=get_request_ip(request),
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    if user.mfa_enabled:
        temp_token = security.create_temp_token(str(user.id))
        audit_logger.log("LOGIN_MFA_REQUIRED", {"email": payload.email}, db,
                         user_id=str(user.id), ip=get_request_ip(request))
        return LoginResponse(mfa_required=True, temp_token=temp_token)

    access_token = security.create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = security.create_refresh_token(str(user.id))
    audit_logger.log("LOGIN_SUCCESS", {"email": payload.email}, db,
                     user_id=str(user.id), ip=get_request_ip(request))
    return LoginResponse(
        mfa_required=False,
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=str(user.id),
        role=user.role,
    )


@router.post("/login/mfa", response_model=LoginResponse)
def login_mfa(payload: MFALoginRequest, request: Request, db: Session = Depends(get_db)):
    try:
        user_id = security.verify_temp_token(payload.temp_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.mfa_enabled or not user.totp_secret:
        raise HTTPException(status_code=400, detail="MFA not configured")

    totp_secret = encryption_service.decrypt(user.totp_secret)
    if not security.verify_totp(totp_secret, payload.totp_code):
        audit_logger.log("MFA_FAILED", {}, db, user_id=str(user.id), ip=get_request_ip(request))
        raise HTTPException(status_code=401, detail="Invalid TOTP code")

    access_token = security.create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = security.create_refresh_token(str(user.id))
    audit_logger.log("LOGIN_MFA_SUCCESS", {}, db, user_id=str(user.id), ip=get_request_ip(request))
    return LoginResponse(
        mfa_required=False,
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=str(user.id),
        role=user.role,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        user_id = security.verify_refresh_token(payload.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    security.revoke_refresh_token(payload.refresh_token)
    access_token = security.create_access_token({"sub": str(user.id), "role": user.role})
    new_refresh = security.create_refresh_token(str(user.id))
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        user_id=str(user.id),
        role=user.role,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: LogoutRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    security.revoke_refresh_token(payload.refresh_token)
    audit_logger.log("LOGOUT", {}, db, user_id=str(current_user.id))


@router.post("/totp/setup", response_model=TOTPSetupResponse)
def totp_setup(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    secret = security.generate_totp_secret()
    email = encryption_service.decrypt(current_user.email)
    uri = security.get_totp_uri(secret, email)

    current_user.totp_secret = encryption_service.encrypt(secret)
    db.commit()

    audit_logger.log("TOTP_SETUP_INITIATED", {}, db, user_id=str(current_user.id))
    return TOTPSetupResponse(secret=secret, otpauth_uri=uri)


@router.post("/totp/verify", status_code=status.HTTP_200_OK)
def totp_verify(
    payload: TOTPVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="Run /auth/totp/setup first")

    totp_secret = encryption_service.decrypt(current_user.totp_secret)
    if not security.verify_totp(totp_secret, payload.totp_code):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")

    current_user.mfa_enabled = True
    db.commit()
    audit_logger.log("TOTP_ENABLED", {}, db, user_id=str(current_user.id))
    notification_service.send_mfa_setup_notification(encryption_service.decrypt(current_user.email))
    return {"message": "MFA enabled successfully"}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "full_name": current_user.full_name,
        "email": encryption_service.decrypt(current_user.email),
        "role": current_user.role,
        "mfa_enabled": current_user.mfa_enabled,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at.isoformat(),
    }
