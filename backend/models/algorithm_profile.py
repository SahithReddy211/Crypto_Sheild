from datetime import datetime, timezone
from database.db import db

class AlgorithmProfile(db.Model):
    __tablename__ = 'algorithm_profiles'
    
    id = db.Column(db.String(64), primary_key=True)  # e.g., 'AES256-GCM-RSA3072-SHA256'
    name = db.Column(db.String(128), nullable=False)
    encryption_algorithm = db.Column(db.String(64), nullable=False)  # 'AES-256-GCM', 'ChaCha20-Poly1305'
    key_management_algorithm = db.Column(db.String(64), nullable=False)  # 'RSA-OAEP-3072', 'ECDH-P384'
    hash_algorithm = db.Column(db.String(32), nullable=False)  # 'SHA-256', 'SHA-384', 'SHA-512'
    signature_algorithm = db.Column(db.String(64), nullable=False)  # 'RSA-PSS', 'ECDSA-SHA384'
    security_level = db.Column(db.String(32), default='HIGH')  # 'STANDARD', 'HIGH', 'MAXIMUM'
    is_default = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(32), default='ACTIVE')  # 'ACTIVE', 'LEGACY', 'DEPRECATED'
    reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'encryption_algorithm': self.encryption_algorithm,
            'key_management_algorithm': self.key_management_algorithm,
            'hash_algorithm': self.hash_algorithm,
            'signature_algorithm': self.signature_algorithm,
            'security_level': self.security_level,
            'is_default': self.is_default,
            'status': self.status,
            'reason': self.reason,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
