from datetime import datetime, timezone
from database.db import db
import json

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    role = db.Column(db.String(32), nullable=True)
    action = db.Column(db.String(64), nullable=False)
    resource_type = db.Column(db.String(64), nullable=True)  # 'QUESTION_PAPER', 'EXAM', 'KEY', 'PROFILE', 'AUTH'
    resource_id = db.Column(db.String(64), nullable=True)
    ip_address = db.Column(db.String(64), nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    status = db.Column(db.String(32), default='SUCCESS', nullable=False)  # 'SUCCESS', 'DENIED', 'FAILED', 'BLOCKED'
    severity = db.Column(db.String(32), default='INFO', nullable=False)  # 'INFO', 'WARNING', 'HIGH', 'CRITICAL'
    metadata_json = db.Column(db.Text, nullable=True)
    
    user = db.relationship('User', backref=db.backref('audit_events', lazy=True))
    
    def get_metadata(self):
        if not self.metadata_json:
            return {}
        try:
            return json.loads(self.metadata_json)
        except Exception:
            return {'raw': self.metadata_json}
            
    def set_metadata(self, data):
        self.metadata_json = json.dumps(data)
        
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else 'SYSTEM/ANONYMOUS',
            'role': self.role or (self.user.role if self.user else 'SYSTEM'),
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'ip_address': self.ip_address,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'status': self.status,
            'severity': self.severity,
            'metadata': self.get_metadata()
        }
