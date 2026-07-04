from cryptography.fernet import Fernet
from app.config import get_settings

_settings = get_settings()


def _get_cipher() -> Fernet:
    """Return a Fernet cipher instance using the configured encryption key."""
    key = _settings.encryption_key
    if not key:
        # Fallback for local dev without a real key — generate ephemeral key
        # WARNING: tokens won't survive restarts. Set ENCRYPTION_KEY in .env for real use.
        return Fernet(Fernet.generate_key())
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_token(plaintext: str) -> str:
    """Encrypt an OAuth token for storage. Returns a URL-safe base64 string."""
    if not plaintext:
        return ""
    cipher = _get_cipher()
    return cipher.encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a stored OAuth token. Returns the original plaintext."""
    if not ciphertext:
        return ""
    cipher = _get_cipher()
    return cipher.decrypt(ciphertext.encode()).decode()
