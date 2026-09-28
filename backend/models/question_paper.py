from datetime import datetime, timezone
from database.db import db
from utils.time_utils import format_iso_utc, format_ist

class QuestionPaper(db.Model):
    __tablename__ = 'question_papers'
    
    id = db.Column(db.String(64), primary_key=True)  # e.g., 'QP-2026-00125'
    exam_id = db.Column(db.String(64), db.ForeignKey('exams.id'), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # File & crypto metadata
    original_filename = db.Column(db.String(255), nullable=False)
    encrypted_filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    file_hash = db.Column(db.String(128), nullable=False)  # SHA-256 / SHA-384 of plaintext
    
    algorithm_profile_id = db.Column(db.String(64), db.ForeignKey('algorithm_profiles.id'), nullable=False)
    key_id = db.Column(db.String(64), nullable=False)  # Reference to protected DEK
    
    # Distribution Mode: 'MODE_A' (Server Decryption & Stream) or 'MODE_B' (Advance Encrypted Package Download)
    distribution_mode = db.Column(db.String(32), default='MODE_A', nullable=False)
    
    # Lifecycle Status: DRAFT, UPLOADED, ENCRYPTED, SCHEDULED, WAITING_FOR_RELEASE, RELEASED, AVAILABLE, EXPIRED, CANCELLED, REVOKED, FAILED
    status = db.Column(db.String(32), default='SCHEDULED', nullable=False)
    
    # Authoritative Timestamps (Stored in UTC)
    release_at = db.Column(db.DateTime, nullable=False)   # UTC
    released_at = db.Column(db.DateTime, nullable=True)   # UTC
    expires_at = db.Column(db.DateTime, nullable=False)    # UTC
    
    digital_signature = db.Column(db.Text, nullable=True)  # Hex/Base64 digital signature
    iv_nonce = db.Column(db.String(128), nullable=True)
    auth_tag = db.Column(db.String(128), nullable=True)
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    faculty = db.relationship('User', backref=db.backref('uploaded_papers', lazy=True))
    profile = db.relationship('AlgorithmProfile', backref=db.backref('question_papers', lazy=True))
    encrypted_keys = db.relationship('EncryptedKey', backref='question_paper', lazy=True, cascade='all, delete-orphan')
    release_tokens = db.relationship('ReleaseToken', backref='question_paper', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self, include_sensitive=False):
        release_utc = format_iso_utc(self.release_at)
        released_utc = format_iso_utc(self.released_at)
        expires_utc = format_iso_utc(self.expires_at)
        created_utc = format_iso_utc(self.created_at)
        updated_utc = format_iso_utc(self.updated_at)
        
        exam_start_utc = format_iso_utc(self.exam.exam_start_at) if (self.exam and self.exam.exam_start_at) else None
        exam_end_utc = format_iso_utc(self.exam.exam_end_at) if (self.exam and self.exam.exam_end_at) else None
        
        release_ist = format_ist(self.release_at)
        released_ist = format_ist(self.released_at)
        exam_start_ist = format_ist(self.exam.exam_start_at) if (self.exam and self.exam.exam_start_at) else None
        exam_end_ist = format_ist(self.exam.exam_end_at) if (self.exam and self.exam.exam_end_at) else None
        exam_date_ist = format_ist(self.exam.exam_start_at, '%d/%m/%Y') if (self.exam and self.exam.exam_start_at) else (self.exam.exam_date if self.exam else None)
        
        if self.exam and self.exam.exam_start_at and self.exam.exam_end_at:
            exam_window_ist = f"{format_ist(self.exam.exam_start_at, '%I:%M %p')} - {format_ist(self.exam.exam_end_at, '%I:%M %p IST')}"
        else:
            exam_window_ist = exam_start_ist or '—'
            
        # Dynamically compute eligible student count matching target criteria
        eligible_count = self.exam.get_eligible_students_count() if self.exam else 0
        
        data = {
            'id': self.id,
            'exam_id': self.exam_id,
            'exam_name': self.exam.course_name if self.exam else None,
            'subject': self.exam.subject if self.exam else None,
            'course_id': self.exam.course_id if self.exam else None,
            'department': self.exam.department if self.exam else 'CSE',
            'section': self.exam.section if self.exam else 'CSE-A',
            'year': self.exam.year if self.exam else '3',
            'semester': self.exam.semester if self.exam else '1',
            'eligible_students_count': eligible_count,
            'faculty_id': self.faculty_id,
            'faculty_name': (self.faculty.full_name or self.faculty.username) if self.faculty else None,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'file_hash': self.file_hash,
            'algorithm_profile_id': self.algorithm_profile_id,
            'algorithm_profile_name': self.profile.name if self.profile else self.algorithm_profile_id,
            'encryption_algorithm': self.profile.encryption_algorithm if self.profile else 'AES-256-GCM',
            'key_management_algorithm': self.profile.key_management_algorithm if self.profile else 'RSA-OAEP-3072',
            'hash_algorithm': self.profile.hash_algorithm if self.profile else 'SHA-256',
            'signature_algorithm': self.profile.signature_algorithm if self.profile else 'RSA-PSS',
            'security_level': self.profile.security_level if self.profile else 'HIGH',
            'distribution_mode': self.distribution_mode,
            'status': self.status,
            
            # Explicit separate UTC timestamps (Requirement 74)
            'release_at_utc': release_utc,
            'released_at_utc': released_utc,
            'expires_at_utc': expires_utc,
            'exam_start_at_utc': exam_start_utc,
            'exam_end_at_utc': exam_end_utc,
            'created_at_utc': created_utc,
            'updated_at_utc': updated_utc,
            # Aliases for backward compatibility
            'release_at': release_utc,
            'released_at': released_utc,
            'expires_at': expires_utc,
            'exam_start_at': exam_start_utc,
            'exam_end_at': exam_end_utc,
            'created_at': created_utc,
            
            # Formatted Asia/Kolkata (IST) display values (Requirement 73 & 76)
            'release_at_ist': release_ist,
            'released_at_ist': released_ist,
            'exam_start_at_ist': exam_start_ist,
            'exam_end_at_ist': exam_end_ist,
            'exam_window_ist': exam_window_ist,
            'exam_date_ist': exam_date_ist,
            
            'has_signature': bool(self.digital_signature),
            'has_encrypted_key': len(self.encrypted_keys) > 0
        }
        if include_sensitive:
            data['encrypted_filename'] = self.encrypted_filename
            data['key_id'] = self.key_id
            data['iv_nonce'] = self.iv_nonce
            data['auth_tag'] = self.auth_tag
            data['digital_signature'] = self.digital_signature
        return data
