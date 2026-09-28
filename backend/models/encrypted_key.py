from datetime import datetime, timezone
from database.db import db

class EncryptedKey(db.Model):
    __tablename__ = 'encrypted_keys'
    
    id = db.Column(db.Integer, primary_key=True)
    question_paper_id = db.Column(db.String(64), db.ForeignKey('question_papers.id'), nullable=False)
    key_id = db.Column(db.String(64), nullable=False)  # Unique Key Reference
    encrypted_dek = db.Column(db.Text, nullable=False)  # Base64/Hex wrapped DEK
    key_encryption_algorithm = db.Column(db.String(64), nullable=False)  # 'RSA-OAEP-3072', 'ECDH-P384'
    status = db.Column(db.String(32), default='ACTIVE')  # 'ACTIVE', 'REVOKED', 'ROTATED'
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    rotated_at = db.Column(db.DateTime, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'question_paper_id': self.question_paper_id,
            'key_id': self.key_id,
            'key_encryption_algorithm': self.key_encryption_algorithm,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
