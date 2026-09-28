import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from database.db import db
from routes import auth_bp, file_bp, crypto_bp, stats_bp, exam_bp
from services.scheduler_service import release_scheduler
from seed import seed_database

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for frontend Vite dev server & production
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
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
    
    # Ensure storage directories exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['ENCRYPTED_FOLDER'], exist_ok=True)
    os.makedirs(app.config['TEMP_FOLDER'], exist_ok=True)
    os.makedirs(app.config['KEY_STORE_FOLDER'], exist_ok=True)
    
    # Seed Database on initial startup
    with app.app_context():
        seed_database(app)
        
    # Start background scheduler
    release_scheduler.init_app(app)
    
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({
            'status': 'healthy',
            'service': 'Crypto-Agility Secure Question Paper Distribution System',
            'version': '2.0.0'
        }), 200
        
    return app

app = create_app()

if __name__ == '__main__':
    print("[Server] Starting Crypto-Agility Backend on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
