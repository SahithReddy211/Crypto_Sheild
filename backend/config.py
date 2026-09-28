import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'crypto-agility-secure-secret-key-2026')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'crypto-agility-jwt-key-2026')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', f"sqlite:///{os.path.join(BASE_DIR, 'crypto_agility.db')}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'storage', 'uploads')
    ENCRYPTED_FOLDER = os.path.join(BASE_DIR, 'storage', 'encrypted')
    TEMP_FOLDER = os.path.join(BASE_DIR, 'storage', 'temp')
    KEY_STORE_FOLDER = os.path.join(BASE_DIR, 'storage', 'keys')
    
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB max file size
    
    # Release token expiration in minutes
    RELEASE_TOKEN_EXPIRY_MINUTES = 15
