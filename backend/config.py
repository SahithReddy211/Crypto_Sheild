import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Detect serverless environment (e.g. Vercel, AWS Lambda)
IS_SERVERLESS = bool(
    os.environ.get('VERCEL') or 
    os.environ.get('AWS_LAMBDA_FUNCTION_NAME') or 
    os.environ.get('SERVERLESS')
)

if IS_SERVERLESS:
    STORAGE_BASE = '/tmp/storage'
    DEFAULT_DB_PATH = '/tmp/crypto_agility.db'
else:
    STORAGE_BASE = os.path.join(BASE_DIR, 'storage')
    DEFAULT_DB_PATH = os.path.join(BASE_DIR, 'crypto_agility.db')

def get_database_uri():
    raw_url = (
        os.environ.get('DATABASE_URL') or
        os.environ.get('POSTGRES_URL') or
        os.environ.get('POSTGRES_PRISMA_URL') or
        os.environ.get('POSTGRES_URL_NON_POOLING')
    )
    if raw_url:
        # SQLAlchemy requires 'postgresql://' instead of 'postgres://'
        if raw_url.startswith('postgres://'):
            raw_url = raw_url.replace('postgres://', 'postgresql://', 1)
        return raw_url
    return f"sqlite:///{DEFAULT_DB_PATH}"

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'crypto-agility-secure-secret-key-2026')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'crypto-agility-jwt-key-2026')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    
    SQLALCHEMY_DATABASE_URI = get_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    } if 'postgresql' in get_database_uri() else {}
    
    UPLOAD_FOLDER = os.path.join(STORAGE_BASE, 'uploads')
    ENCRYPTED_FOLDER = os.path.join(STORAGE_BASE, 'encrypted')
    TEMP_FOLDER = os.path.join(STORAGE_BASE, 'temp')
    KEY_STORE_FOLDER = os.path.join(STORAGE_BASE, 'keys')
    
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB max file size
    
    # Release token expiration in minutes
    RELEASE_TOKEN_EXPIRY_MINUTES = 15
