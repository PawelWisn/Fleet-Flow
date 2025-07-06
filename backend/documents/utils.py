import os
import uuid
from pathlib import Path
from typing import Optional, Tuple

from fastapi import UploadFile


class FileStorageError(Exception):
    """Custom exception for file storage errors"""

    pass


class DocumentFileManager:
    """
    Encapsulates all document file handling logic including validation,
    storage, deletion, and file information retrieval.
    """

    ALLOWED_EXTENSIONS = {".pdf", ".txt", ".zip", ".rar", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"}

    def __init__(self, upload_dir: str = "uploads/documents"):
        """
        Initialize the DocumentFileManager.

        Args:
            upload_dir: Directory where files will be stored
        """
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        self.max_file_size = int(os.getenv("MAX_FILE_SIZE", 10 * 1024 * 1024))

    def validate_file(self, file: UploadFile) -> None:
        """
        Validate uploaded file for security and constraints.

        Args:
            file: The uploaded file to validate

        Raises:
            FileStorageError: If validation fails
        """
        if not file.filename:
            raise FileStorageError("No filename provided")

        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in self.ALLOWED_EXTENSIONS:
            raise FileStorageError(f"File type '{file_extension}' not allowed. " f"Allowed types: {', '.join(self.ALLOWED_EXTENSIONS)}")

    def generate_unique_filename(self, original_filename: str) -> str:
        """
        Generate a unique filename while preserving the original extension.

        Args:
            original_filename: The original filename

        Returns:
            A unique filename with UUID prefix
        """
        file_extension = os.path.splitext(original_filename)[1]
        unique_id = str(uuid.uuid4())
        return f"{unique_id}{file_extension}"

    async def store_file(self, file: UploadFile) -> Tuple[str, int]:
        """
        Store an uploaded document file to the filesystem.

        Args:
            file: The uploaded file to store

        Returns:
            Tuple of (file_path, file_size)

        Raises:
            FileStorageError: If file storage fails
        """
        try:
            self.validate_file(file)

            file_content = await file.read()
            file_size = len(file_content)

            if file_size > self.max_file_size:
                raise FileStorageError(f"File size ({file_size} bytes) exceeds maximum allowed size " f"({self.max_file_size} bytes)")

            unique_filename = self.generate_unique_filename(file.filename)
            file_path = self.upload_dir / unique_filename

            with open(file_path, "wb") as f:
                f.write(file_content)

            return str(file_path), file_size

        except Exception as e:
            if isinstance(e, FileStorageError):
                raise
            raise FileStorageError(f"Failed to store file: {str(e)}")

    def delete_file(self, file_path: str) -> bool:
        """
        Delete a document file from the filesystem.

        Args:
            file_path: Path to the file to delete

        Returns:
            True if file was deleted, False if file didn't exist
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception as e:
            print(f"Warning: Failed to delete file {file_path}: {str(e)}")
            return False

    def file_exists(self, file_path: str) -> bool:
        """
        Check if a file exists at the given path.

        Args:
            file_path: Path to check

        Returns:
            True if file exists, False otherwise
        """
        return os.path.exists(file_path)
