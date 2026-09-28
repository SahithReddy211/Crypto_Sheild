from routes.auth_routes import auth_bp
from routes.file_routes import file_bp
from routes.crypto_routes import crypto_bp
from routes.stats_routes import stats_bp
from routes.exam_routes import exam_bp

__all__ = ['auth_bp', 'file_bp', 'crypto_bp', 'stats_bp', 'exam_bp']
