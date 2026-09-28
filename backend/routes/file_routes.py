import os
import secrets
from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from database.db import db
from models.file_vault import UploadedFile
from config import Config

file_bp = Blueprint('files', __name__, url_prefix='/api')

@file_bp.route('/upload', methods=['POST'])
@jwt_required(optional=True)
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    user_id = get_jwt_identity()
    original_name = secure_filename(file.filename) or 'unnamed_file'
    ext = original_name.rsplit('.', 1)[-1].lower() if '.' in original_name else 'bin'
    stored_name = f"vault_{secrets.token_hex(8)}.{ext}"
    
    file_path = os.path.join(Config.UPLOAD_FOLDER, stored_name)
    file.save(file_path)
    file_size = os.path.getsize(file_path)
    
    uploaded_file = UploadedFile(
        user_id=int(user_id) if user_id else None,
        original_name=original_name,
        stored_name=stored_name,
        file_size=file_size,
        file_type=ext.upper(),
        status='Uploaded'
    )
    db.session.add(uploaded_file)
    db.session.commit()
    
    return jsonify({
        'message': 'File uploaded successfully',
        'file': uploaded_file.to_dict()
    }), 201

@file_bp.route('/files', methods=['GET'])
def get_files():
    files = UploadedFile.query.order_by(UploadedFile.created_at.desc()).all()
    return jsonify([f.to_dict() for f in files]), 200

@file_bp.route('/files/<int:file_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_file(file_id):
    file_rec = UploadedFile.query.get(file_id)
    if not file_rec:
        return jsonify({'error': 'File not found'}), 404
        
    # Remove physical file if present
    file_path = os.path.join(Config.UPLOAD_FOLDER, file_rec.stored_name)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass
            
    db.session.delete(file_rec)
    db.session.commit()
    return jsonify({'message': 'File deleted from vault'}), 200

@file_bp.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    # Check encrypted, upload, or temp folders
    for folder in [Config.ENCRYPTED_FOLDER, Config.UPLOAD_FOLDER, Config.TEMP_FOLDER]:
        target = os.path.join(folder, secure_filename(filename))
        if os.path.exists(target):
            return send_from_directory(folder, secure_filename(filename), as_attachment=True)
    return jsonify({'error': 'File not found'}), 404
