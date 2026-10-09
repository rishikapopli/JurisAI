import os
import hashlib
from typing import Tuple
from backend.app.config import settings

class StorageService:
    def __init__(self):
        self.base_dir = os.path.abspath(settings.STORAGE_PATH)
        os.makedirs(os.path.join(self.base_dir, "quarantine"), exist_ok=True)
        os.makedirs(os.path.join(self.base_dir, "verified"), exist_ok=True)
        os.makedirs(os.path.join(self.base_dir, "reports"), exist_ok=True)

    def save_upload(self, file_bytes: bytes, filename: str) -> Tuple[str, str, int]:
        sha = hashlib.sha256(file_bytes).hexdigest()
        ext = os.path.splitext(filename)[1].lower().lstrip(".")
        safe_name = f"{sha}.{ext}" if ext else sha
        dest_path = os.path.join(self.base_dir, "quarantine", safe_name)
        with open(dest_path, "wb") as f:
            f.write(file_bytes)
        return dest_path, sha, len(file_bytes)

    def move_to_verified(self, quarantine_path: str) -> str:
        if not os.path.exists(quarantine_path):
            return quarantine_path
        fname = os.path.basename(quarantine_path)
        dest_path = os.path.join(self.base_dir, "verified", fname)
        if quarantine_path != dest_path:
            os.rename(quarantine_path, dest_path)
        return dest_path

    def get_file_content(self, file_path: str) -> bytes:
        if os.path.exists(file_path):
            with open(file_path, "rb") as f:
                return f.read()
        return b""

storage_service = StorageService()
