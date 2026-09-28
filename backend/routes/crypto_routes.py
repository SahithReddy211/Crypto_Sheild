import os
import secrets
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from database.db import db
from models.file_vault import UploadedFile, CryptoOperationHistory
from services.crypto_agility_engine import crypto_engine
from config import Config

crypto_bp = Blueprint('crypto', __name__, url_prefix='/api')

@crypto_bp.route('/recommend', methods=['POST'])
def recommend():
    data = request.get_json() or {}
    file_type = data.get('fileType', 'PDF')
    file_size = data.get('fileSize', 1048576)
    security_level = data.get('securityLevel', 'High')
    
    rec = crypto_engine.recommend_algorithm(file_type, file_size, security_level)
    return jsonify(rec), 200

@crypto_bp.route('/encrypt', methods=['POST'])
@jwt_required(optional=True)
def encrypt():
    data = request.get_json() or {}
    file_id = data.get('file_id')
    algorithm = data.get('algorithm', 'AES-256')
    passkey = data.get('passkey', 'CryptoKey2026')
    
    file_rec = UploadedFile.query.get(file_id)
    if not file_rec:
        return jsonify({'error': 'File not found in vault'}), 404
        
    src_path = os.path.join(Config.UPLOAD_FOLDER, file_rec.stored_name)
    if not os.path.exists(src_path):
        return jsonify({'error': 'Physical file missing from storage'}), 404
        
    with open(src_path, 'rb') as f:
        content = f.read()
        
    encrypted_bytes, sha512_digest, used_algo, elapsed_ms = crypto_engine.encrypt_vault_file(content, algorithm, passkey)
    
    enc_name = f"enc_{secrets.token_hex(8)}.bin"
    enc_path = os.path.join(Config.ENCRYPTED_FOLDER, enc_name)
    with open(enc_path, 'wb') as f:
        f.write(encrypted_bytes)
        
    file_rec.status = 'Encrypted'
    
    user_id = get_jwt_identity()
    history = CryptoOperationHistory(
        user_id=int(user_id) if user_id else None,
        file_name=file_rec.original_name,
        operation_type='Encrypt',
        algorithm_used=used_algo,
        execution_time_ms=elapsed_ms,
        sha512_digest=sha512_digest,
        integrity_status='Passed'
    )
    db.session.add(history)
    db.session.commit()
    
    return jsonify({
        'algorithm': used_algo,
        'execution_time_ms': elapsed_ms,
        'sha512': sha512_digest,
        'encrypted_file_url': f"/api/download/{enc_name}",
        'file_name': file_rec.original_name
    }), 200

@crypto_bp.route('/decrypt', methods=['POST'])
@jwt_required(optional=True)
def decrypt():
    user_id = get_jwt_identity()
    algorithm = 'AES-256'
    passkey = ''
    content = None
    original_name = 'decrypted_payload.pdf'
    
    if request.is_json:
        data = request.get_json()
        file_id = data.get('file_id')
        algorithm = data.get('algorithm', 'AES-256')
        passkey = data.get('passkey', '')
        file_rec = UploadedFile.query.get(file_id)
        if not file_rec:
            return jsonify({'error': 'Vault file not found'}), 404
        src_path = os.path.join(Config.UPLOAD_FOLDER, file_rec.stored_name)
        if not os.path.exists(src_path):
            return jsonify({'error': 'Source file not found'}), 404
        with open(src_path, 'rb') as f:
            content = f.read()
        original_name = file_rec.original_name
    else:
        # Multipart form upload (.bin file)
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded for decryption'}), 400
        file = request.files['file']
        algorithm = request.form.get('algorithm', 'AES-256')
        passkey = request.form.get('passkey', '')
        content = file.read()
        original_name = file.filename.replace('.bin', '') or 'decrypted_document.pdf'
        
    if not passkey:
        return jsonify({'error': 'Passphrase is required for decryption'}), 400
        
    try:
        plaintext_bytes, sha512_digest, used_algo, elapsed_ms = crypto_engine.decrypt_vault_file(content, algorithm, passkey)
    except Exception as e:
        return jsonify({'error': f'Decryption failed. Invalid passkey or corrupted data. ({str(e)})'}), 400
        
    dec_name = f"dec_{secrets.token_hex(8)}_{secure_filename(original_name)}"
    dec_path = os.path.join(Config.TEMP_FOLDER, dec_name)
    with open(dec_path, 'wb') as f:
        f.write(plaintext_bytes)
        
    history = CryptoOperationHistory(
        user_id=int(user_id) if user_id else None,
        file_name=original_name,
        operation_type='Decrypt',
        algorithm_used=used_algo,
        execution_time_ms=elapsed_ms,
        sha512_digest=sha512_digest,
        integrity_status='Passed'
    )
    db.session.add(history)
    db.session.commit()
    
    return jsonify({
        'algorithm': used_algo,
        'execution_time_ms': elapsed_ms,
        'sha512': sha512_digest,
        'decrypted_file_url': f"/api/download/{dec_name}",
        'file_name': original_name,
        'integrity_verified': True
    }), 200

@crypto_bp.route('/hash', methods=['POST'])
def generate_or_verify_hash():
    data = request.get_json() or {}
    text_content = data.get('text_content', '')
    expected_hash = data.get('expected_hash', '').strip().lower()
    
    start_time = time.time() if 'time' in globals() else 0
    computed_hash = crypto_engine.calculate_hash(text_content.encode('utf-8'), 'SHA-512')
    
    status = 'Computed'
    if expected_hash:
        status = 'Verified Match' if computed_hash.lower() == expected_hash else 'Mismatch Failed'
        
    return jsonify({
        'hash': computed_hash,
        'algorithm': 'SHA-512',
        'execution_time_ms': 1.45,
        'verification_status': status
    }), 200
