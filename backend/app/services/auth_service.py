import hashlib
import secrets
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.account import Account
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    generate_totp_secret,
    verify_totp,
    get_totp_uri,
    create_temp_token,
    verify_temp_token,
)
from app.core.encryption import encryption_service
from app.schemas.auth import RegisterRequest, LoginRequest


def generate_account_number() -> str:
    """Generate a 10-digit NUBAN-style account number."""
    return "".join([str(secrets.randbelow(10)) for _ in range(10)])


class AuthService:
    def register_user(self, data: RegisterRequest, db: Session) -> User:
        # Check if email already exists by decrypting stored emails
        all_users = db.query(User).all()
        for u in all_users:
            try:
                decrypted = encryption_service.decrypt(u.email)
                if decrypted.lower() == data.email.lower():
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Email already registered",
                    )
            except HTTPException:
                raise
            except Exception:
                continue

        bvn_hash = hashlib.sha256(data.bvn_nin.encode()).hexdigest()
        encrypted_email = encryption_service.encrypt(data.email)
        encrypted_phone = encryption_service.encrypt(data.phone_number)

        user = User(
            full_name=data.full_name,
            email=encrypted_email,
            phone_number=encrypted_phone,
            bvn_nin_hash=bvn_hash,
            password_hash=hash_password(data.password),
            is_verified=True,   # Simulated KYC verification
            is_active=True,
            role="customer",
        )
        db.add(user)
        db.flush()

        # Create default savings account
        acct_number = generate_account_number()
        account = Account(
            user_id=user.id,
            account_number=encryption_service.encrypt(acct_number),
            account_type="savings",
            balance=0,
            currency="NGN",
        )
        db.add(account)
        db.commit()
        db.refresh(user)
        return user

    def login(self, data: LoginRequest, db: Session) -> dict:
        all_users = db.query(User).all()
        user = None
        for u in all_users:
            try:
                decrypted_email = encryption_service.decrypt(u.email)
                if decrypted_email.lower() == data.email.lower():
                    user = u
                    break
            except Exception:
                continue

        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is disabled")

        if user.mfa_enabled:
            temp_token = create_temp_token(str(user.id))
            return {"mfa_required": True, "temp_token": temp_token}

        access_token = create_access_token({"sub": str(user.id), "role": user.role})
        refresh_token = create_refresh_token(str(user.id))
        return {
            "mfa_required": False,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user_id": str(user.id),
            "role": user.role,
        }

    def login_mfa(self, temp_token: str, totp_code: str, db: Session) -> dict:
        user_id = verify_temp_token(temp_token)
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if not user.totp_secret:
            raise HTTPException(status_code=400, detail="MFA not configured")

        totp_secret = encryption_service.decrypt(user.totp_secret)
        if not verify_totp(totp_secret, totp_code):
            raise HTTPException(status_code=401, detail="Invalid TOTP code")

        access_token = create_access_token({"sub": str(user.id), "role": user.role})
        refresh_token = create_refresh_token(str(user.id))
        return {
            "mfa_required": False,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user_id": str(user.id),
            "role": user.role,
        }


auth_service = AuthService()
