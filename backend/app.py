import os
import shutil
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config, IS_SERVERLESS, BASE_DIR
from database.db import db
from routes import auth_bp, file_bp, crypto_bp, stats_bp, exam_bp
from services.scheduler_service import release_scheduler
from seed import seed_database

def create_app():
    # If running in serverless (e.g. Vercel), copy bundled db and keys to /tmp if available
    if IS_SERVERLESS:
        bundled_db = os.path.join(BASE_DIR, 'crypto_agility.db')
        target_db = '/tmp/crypto_agility.db'
        if os.path.exists(bundled_db) and not os.path.exists(target_db):
            try:
                shutil.copy2(bundled_db, target_db)
            except Exception as e:
                print(f"[Serverless Init] Note copying bundled db: {e}")

        bundled_keys = os.path.join(BASE_DIR, 'storage', 'keys')
        target_keys = '/tmp/storage/keys'
        if os.path.exists(bundled_keys) and not os.path.exists(target_keys):
            try:
                shutil.copytree(bundled_keys, target_keys, dirs_exist_ok=True)
            except Exception as e:
                pass

    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for frontend Vite dev server & production
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    
    # Initialize JWT
    jwt = JWTManager(app)
    
    # Initialize DB
    db.init_app(app)
    
    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(file_bp)
    app.register_blueprint(crypto_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(exam_bp)
    
    # Ensure storage directories exist safely
    for key in ['UPLOAD_FOLDER', 'ENCRYPTED_FOLDER', 'TEMP_FOLDER', 'KEY_STORE_FOLDER']:
        try:
            folder = app.config.get(key)
            if folder:
                os.makedirs(folder, exist_ok=True)
        except Exception as e:
            print(f"[Server Init] Notice creating {key}: {e}")
    
    # Seed Database on initial startup
    try:
        with app.app_context():
            seed_database(app)
    except Exception as e:
        print(f"[Server Init] Database seed notice: {e}")
        
    # Start background scheduler
    try:
        release_scheduler.init_app(app)
    except Exception as e:
        print(f"[Server Init] Scheduler notice: {e}")
    
    @app.route('/', methods=['GET'])
    def root():
        return jsonify({
            'status': 'online',
            'service': 'Crypto-Agility Secure Question Paper Distribution System API',
            'version': '2.0.0',
            'environment': 'serverless' if IS_SERVERLESS else 'standard',
            'endpoints': {
                'health': '/api/health',
                'login': '/api/auth/login'
            }
        }), 200

    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({
            'status': 'healthy',
            'service': 'Crypto-Agility Secure Question Paper Distribution System',
            'version': '2.0.0',
            'serverless': IS_SERVERLESS
        }), 200

    @app.after_request
    def after_request_cors(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        return response
        
    return app

app = create_app()

if __name__ == '__main__':
    print("[Server] Starting Crypto-Agility Backend on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
