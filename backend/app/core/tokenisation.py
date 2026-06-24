import secrets
from sqlalchemy.orm import Session
from app.core.encryption import encryption_service
from app.models.token_vault import TokenVault


class TokenisationService:
    def _generate_token(self) -> str:
        digits = [str(secrets.randbelow(10)) for _ in range(16)]
        return "".join(digits)

    def tokenise_pan(self, pan: str, db: Session) -> TokenVault:
        pan = pan.replace(" ", "").replace("-", "")
        if not pan.isdigit() or len(pan) < 13 or len(pan) > 19:
            raise ValueError("Invalid PAN format")

        # Generate a unique token
        for _ in range(10):
            token_pan = self._generate_token()
            existing = db.query(TokenVault).filter(TokenVault.token_pan == token_pan).first()
            if not existing:
                break
        else:
            raise RuntimeError("Could not generate unique token")

        encrypted_pan = encryption_service.encrypt(pan)
        vault_entry = TokenVault(token_pan=token_pan, encrypted_pan=encrypted_pan)
        db.add(vault_entry)
        db.commit()
        db.refresh(vault_entry)
        return vault_entry

    def detokenise(self, token_vault_id: str, db: Session) -> str:
        vault_entry = db.query(TokenVault).filter(TokenVault.id == token_vault_id).first()
        if not vault_entry:
            raise ValueError("Token not found")
        return encryption_service.decrypt(vault_entry.encrypted_pan)

    @staticmethod
    def mask_pan(pan: str) -> str:
        pan = pan.replace(" ", "").replace("-", "")
        if len(pan) < 10:
            return pan
        return pan[:6] + "*" * (len(pan) - 10) + pan[-4:]


tokenisation_service = TokenisationService()
