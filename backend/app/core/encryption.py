import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings


class EncryptionService:
    def __init__(self):
        key_bytes = base64.b64decode(settings.ENCRYPTION_KEY)
        if len(key_bytes) < 32:
            key_bytes = key_bytes.ljust(32, b'\x00')
        self.key = key_bytes[:32]
        self.aesgcm = AESGCM(self.key)

    def encrypt(self, plaintext: str) -> str:
        nonce = os.urandom(12)
        data = plaintext.encode('utf-8')
        ciphertext = self.aesgcm.encrypt(nonce, data, None)
        combined = nonce + ciphertext
        return base64.b64encode(combined).decode('utf-8')

    def decrypt(self, encrypted: str) -> str:
        combined = base64.b64decode(encrypted.encode('utf-8'))
        nonce = combined[:12]
        ciphertext = combined[12:]
        plaintext = self.aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode('utf-8')


encryption_service = EncryptionService()
