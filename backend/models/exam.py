from datetime import datetime, timezone
from database.db import db
from utils.time_utils import format_iso_utc, format_ist
from utils.criteria_utils import (
    normalize_department, 
    normalize_section, 
    normalize_year, 
    normalize_semester
)

class Exam(db.Model):
    __tablename__ = 'exams'
    
    id = db.Column(db.String(64), primary_key=True)  # e.g., 'EXAM-2026-001'
    course_id = db.Column(db.String(64), nullable=False)  # 'CS-702'
    course_name = db.Column(db.String(255), nullable=False)  # 'Advanced Computer Networks'
    subject = db.Column(db.String(255), nullable=False)  # 'Final Semester Examination'
    department = db.Column(db.String(64), default='CSE') # Normalized: 'CSE', 'ECE', etc.
    section = db.Column(db.String(64), default='CSE-A')  # Normalized: 'CSE-A'
    year = db.Column(db.String(32), default='3')         # Normalized: '1', '2', '3', '4'
    semester = db.Column(db.String(64), default='1')     # Normalized: '1', '2'
    exam_date = db.Column(db.String(32), nullable=False) # '2026-09-03'
    exam_start_at = db.Column(db.DateTime, nullable=False)  # Authoritative UTC datetime
    exam_end_at = db.Column(db.DateTime, nullable=False)    # Authoritative UTC datetime
    duration_minutes = db.Column(db.Integer, default=90)
    status = db.Column(db.String(32), default='ACTIVE')  # 'ACTIVE', 'COMPLETED', 'CANCELLED'
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    creator = db.relationship('User', backref=db.backref('created_exams', lazy=True))
    question_papers = db.relationship('QuestionPaper', backref='exam', lazy=True, cascade='all, delete-orphan')
    students = db.relationship('ExamStudent', backref='exam', lazy=True, cascade='all, delete-orphan')
    
    def get_eligible_students_count(self):
        """Computes count of currently registered students matching this examination's target criteria"""
        from models.user import User
        norm_dept = normalize_department(self.department)
        norm_sec = normalize_section(self.section, norm_dept)
        norm_yr = normalize_year(self.year)
        norm_sem = normalize_semester(self.semester)
        
        return User.query.filter_by(
            role='student',
            department=norm_dept,
            section=norm_sec,
            year=norm_yr,
            semester=norm_sem
        ).count()
        
    def to_dict(self):
        start_utc = format_iso_utc(self.exam_start_at)
        end_utc = format_iso_utc(self.exam_end_at)
        created_utc = format_iso_utc(self.created_at)
        updated_utc = format_iso_utc(self.updated_at)
        
        start_ist = format_ist(self.exam_start_at)
        end_ist = format_ist(self.exam_end_at)
        date_ist = format_ist(self.exam_start_at, '%d/%m/%Y') if self.exam_start_at else self.exam_date
        
        if self.exam_start_at and self.exam_end_at:
            window_ist = f"{format_ist(self.exam_start_at, '%I:%M %p')} - {format_ist(self.exam_end_at, '%I:%M %p IST')}"
        else:
            window_ist = start_ist or '—'
            
        eligible_count = self.get_eligible_students_count()
        
        return {
            'id': self.id,
            'course_id': self.course_id,
            'course_name': self.course_name,
            'subject': self.subject,
            'department': self.department,
            'section': self.section,
            'year': self.year,
            'semester': self.semester,
            'exam_date': self.exam_date,
            'exam_date_ist': date_ist,
            'duration_minutes': self.duration_minutes,
            'status': self.status,
            'created_by': self.created_by,
            'creator_name': self.creator.username if self.creator else None,
            
            # Explicit separate UTC timestamps (Requirement 74)
            'exam_start_at_utc': start_utc,
            'exam_end_at_utc': end_utc,
            'created_at_utc': created_utc,
            'updated_at_utc': updated_utc,
            # Aliases for backward compatibility
            'exam_start_at': start_utc,
            'exam_end_at': end_utc,
            'created_at': created_utc,
            
            # Formatted Asia/Kolkata (IST) display values (Requirement 73 & 76)
            'exam_start_at_ist': start_ist,
            'exam_end_at_ist': end_ist,
            'exam_window_ist': window_ist,
            
            'eligible_students_count': eligible_count,
            'papers_count': len(self.question_papers) if self.question_papers else 0,
            'students_count': len(self.students) if self.students else 0
        }
