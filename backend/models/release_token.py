from datetime import datetime, timezone
from database.db import db

class ReleaseToken(db.Model):
    __tablename__ = 'release_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    question_paper_id = db.Column(db.String(64), db.ForeignKey('question_papers.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token_hash = db.Column(db.String(128), nullable=False, unique=True)
    issued_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(32), default='ACTIVE')  # 'ACTIVE', 'USED', 'EXPIRED', 'REVOKED'
    
    student = db.relationship('User', backref=db.backref('release_tokens', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'question_paper_id': self.question_paper_id,
            'student_id': self.student_id,
            'issued_at': self.issued_at.isoformat() if self.issued_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'used_at': self.used_at.isoformat() if self.used_at else None,
            'status': self.status
        }
