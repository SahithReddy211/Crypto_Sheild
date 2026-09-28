from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from database.db import db

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='student', nullable=False)  # admin, faculty, student
    full_name = db.Column(db.String(120), nullable=True)
    
    # Student specific fields
    student_id = db.Column(db.String(64), unique=True, nullable=True)  # e.g., 'STU001'
    department = db.Column(db.String(64), nullable=True)               # e.g., 'CSE', 'ECE'
    section = db.Column(db.String(32), nullable=True)                  # e.g., 'CSE-A', 'CSE-B'
    year = db.Column(db.String(32), nullable=True)                     # e.g., '2' or '2nd Year'
    semester = db.Column(db.String(32), nullable=True)                 # e.g., '1' or '1st Semester'
    
    # Faculty specific fields
    faculty_id = db.Column(db.String(64), unique=True, nullable=True)  # e.g., 'FAC001'
    designation = db.Column(db.String(64), nullable=True)              # e.g., 'Professor', 'Associate Professor'
    
    # Preferences
    default_security_level = db.Column(db.String(20), default='High')
    auto_delete_files = db.Column(db.Boolean, default=False)
    theme_preference = db.Column(db.String(20), default='dark')
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
        
    def is_student(self):
        return self.role == 'student'
        
    def is_faculty(self):
        return self.role == 'faculty'
        
    def is_admin(self):
        return self.role == 'admin'
        
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'full_name': self.full_name or self.username,
            'email': self.email,
            'role': self.role,
            'student_id': self.student_id,
            'faculty_id': self.faculty_id,
            'department': self.department,
            'section': self.section,
            'year': self.year,
            'semester': self.semester,
            'designation': self.designation,
            'default_security_level': self.default_security_level,
            'auto_delete_files': self.auto_delete_files,
            'theme_preference': self.theme_preference,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
