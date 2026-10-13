import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "aquaguard-ai-hackathon-secret-2026")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'database.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads", "report_images")
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB limit per validation rules
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
    SIMULATION_MODE = True
