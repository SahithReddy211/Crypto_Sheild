from datetime import datetime, timezone
from database.db import db

class ExamStudent(db.Model):
    __tablename__ = 'exam_students'
    
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.String(64), db.ForeignKey('exams.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(32), default='ENROLLED')  # 'ENROLLED', 'ATTENDED', 'REVOKED'
    assigned_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    student = db.relationship('User', backref=db.backref('enrolled_exams', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'exam_id': self.exam_id,
            'student_id': self.student_id,
            'student_name': self.student.username if self.student else None,
            'student_email': self.student.email if self.student else None,
            'status': self.status,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None
        }
