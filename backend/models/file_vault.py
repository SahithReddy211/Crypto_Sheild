from datetime import datetime, timezone
from database.db import db

class UploadedFile(db.Model):
    __tablename__ = 'uploaded_files'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    original_name = db.Column(db.String(255), nullable=False)
    stored_name = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    file_type = db.Column(db.String(64), nullable=False)
    status = db.Column(db.String(32), default='Uploaded')  # 'Uploaded', 'Encrypted', 'Decrypted'
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    def to_dict(self):
        return {
            'id': self.id,
            'original_name': self.original_name,
            'stored_name': self.stored_name,
            'file_size': self.file_size,
            'file_type': self.file_type,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class CryptoOperationHistory(db.Model):
    __tablename__ = 'crypto_operation_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    file_name = db.Column(db.String(255), nullable=False)
    operation_type = db.Column(db.String(32), nullable=False)  # 'Encrypt', 'Decrypt', 'Integrity Check'
    algorithm_used = db.Column(db.String(64), nullable=False)
    execution_time_ms = db.Column(db.Float, nullable=False)
    sha512_digest = db.Column(db.String(128), nullable=True)
    integrity_status = db.Column(db.String(32), default='Passed')
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = db.relationship('User', backref=db.backref('operations', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'file_name': self.file_name,
            'operation_type': self.operation_type,
            'algorithm_used': self.algorithm_used,
            'execution_time_ms': self.execution_time_ms,
            'sha512': self.sha512_digest,
            'integrity': self.integrity_status,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'user': self.user.username if self.user else 'Admin'
        }
