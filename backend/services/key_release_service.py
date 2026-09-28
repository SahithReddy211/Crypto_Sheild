import os
import time
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from database.db import db
from models.user import User
from models.question_paper import QuestionPaper
from models.exam_student import ExamStudent
from models.release_token import ReleaseToken
from models.encrypted_key import EncryptedKey
from services.crypto_agility_engine import crypto_engine
from services.audit_service import AuditService
from config import Config

class KeyReleaseService:
    @staticmethod
    def get_current_server_time_utc():
        """Returns authoritative server UTC datetime"""
        return datetime.now(timezone.utc)

    @classmethod
    def is_release_allowed(cls, paper, current_time_utc=None):
        """
        Server-side authoritative check whether question paper release time is reached.
        Possession of client time is ignored.
        """
        if not current_time_utc:
            current_time_utc = cls.get_current_server_time_utc()
            
        # Ensure paper.release_at is offset-aware UTC
        release_at = paper.release_at
        if release_at.tzinfo is None:
            release_at = release_at.replace(tzinfo=timezone.utc)
            
        expires_at = paper.expires_at
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
            
        if paper.status in ['CANCELLED', 'REVOKED', 'FAILED']:
            return False, f"PAPER_{paper.status}"
            
        if expires_at and current_time_utc > expires_at:
            return False, "PAPER_EXPIRED"
            
        if current_time_utc < release_at:
            return False, "PAPER_NOT_RELEASED"
            
        return True, "RELEASE_AUTHORIZED"

    @classmethod
    def authorize_student_access(cls, student_id, paper_id):
        """
        Verifies student is enrolled in the exam corresponding to the question paper.
        Enforces that only authenticated accounts with role 'student' are permitted.
        """
        user = User.query.get(student_id)
        if not user or user.role != 'student':
            return False, "ROLE_NOT_STUDENT", None

        paper = QuestionPaper.query.get(paper_id)
        if not paper:
            return False, "PAPER_NOT_FOUND", None
            
        enrollment = ExamStudent.query.filter_by(
            exam_id=paper.exam_id,
            student_id=student_id,
            status='ENROLLED'
        ).first()
        
        if not enrollment:
            from utils.criteria_utils import matches_target_criteria
            # Dynamic criteria matching (Requirement 80-86)
            if paper.exam and matches_target_criteria(user, paper.exam):
                enrollment = ExamStudent(
                    exam_id=paper.exam_id,
                    student_id=student_id,
                    status='ENROLLED'
                )
                db.session.add(enrollment)
                db.session.commit()
            else:
                return False, "UNAUTHORIZED_STUDENT", paper
            
        return True, "AUTHORIZED", paper

    @classmethod
    def issue_release_token(cls, paper_id, student_id, ip_address=None):
        """
        Issues a cryptographically signed, short-lived one-time release token
        once server-side release time and student authorization are satisfied.
        """
        now_utc = cls.get_current_server_time_utc()
        
        # 1. Authorize student
        is_auth, auth_reason, paper = cls.authorize_student_access(student_id, paper_id)
        if not is_auth:
            AuditService.log(
                action='DECRYPTION_REQUEST_DENIED',
                user_id=student_id,
                role='student',
                resource_type='QUESTION_PAPER',
                resource_id=paper_id,
                status='DENIED',
                severity='HIGH',
                metadata={'reason': auth_reason},
                ip_address=ip_address
            )
            return {'success': False, 'error': auth_reason, 'status_code': 403}
            
        # 2. Check server-side release time
        is_allowed, release_reason = cls.is_release_allowed(paper, now_utc)
        if not is_allowed:
            AuditService.log(
                action='EARLY_ACCESS_DENIED',
                user_id=student_id,
                role='student',
                resource_type='QUESTION_PAPER',
                resource_id=paper_id,
                status='DENIED',
                severity='WARNING',
                metadata={
                    'reason': release_reason,
                    'server_time_utc': now_utc.isoformat(),
                    'release_at_utc': paper.release_at.isoformat()
                },
                ip_address=ip_address
            )
            return {
                'success': False, 
                'error': release_reason, 
                'release_at': paper.release_at.isoformat(),
                'server_time': now_utc.isoformat(),
                'status_code': 403
            }
            
        # 3. Create Short-Lived Token (HMAC/Random Nonce Hash)
        raw_nonce = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(f"{paper_id}:{student_id}:{raw_nonce}:{now_utc.timestamp()}".encode('utf-8')).hexdigest()
        expires_at = now_utc + timedelta(minutes=Config.RELEASE_TOKEN_EXPIRY_MINUTES)
        
        token_entry = ReleaseToken(
            question_paper_id=paper_id,
            student_id=student_id,
            token_hash=token_hash,
            issued_at=now_utc,
            expires_at=expires_at,
            status='ACTIVE'
        )
        db.session.add(token_entry)
        db.session.commit()
        
        AuditService.log(
            action='RELEASE_TOKEN_ISSUED',
            user_id=student_id,
            role='student',
            resource_type='QUESTION_PAPER',
            resource_id=paper_id,
            status='SUCCESS',
            severity='INFO',
            metadata={'token_hash_prefix': token_hash[:12], 'expires_at': expires_at.isoformat()},
            ip_address=ip_address
        )
        
        return {
            'success': True,
            'release_token': token_hash,
            'expires_at': expires_at.isoformat(),
            'paper_id': paper_id,
            'status': 'RELEASED'
        }

    @classmethod
    def validate_release_token(cls, token_str, paper_id, student_id):
        """Validates token authenticity and expiration"""
        now_utc = cls.get_current_server_time_utc()
        token = ReleaseToken.query.filter_by(
            token_hash=token_str,
            question_paper_id=paper_id,
            student_id=student_id,
            status='ACTIVE'
        ).first()
        
        if not token:
            return False, "INVALID_TOKEN"
            
        token_exp = token.expires_at
        if token_exp.tzinfo is None:
            token_exp = token_exp.replace(tzinfo=timezone.utc)
            
        if now_utc > token_exp:
            token.status = 'EXPIRED'
            db.session.commit()
            return False, "TOKEN_EXPIRED"
            
        return True, "TOKEN_VALID"

    @classmethod
    def decrypt_and_retrieve_paper(cls, paper_id, student_id, token_str=None, ip_address=None):
        """
        Executes server-side decryption and verifies package signatures and integrity.
        Returns decrypted plaintext stream with audit log.
        """
        now_utc = cls.get_current_server_time_utc()
        
        # 1. Authorize student
        is_auth, auth_reason, paper = cls.authorize_student_access(student_id, paper_id)
        if not is_auth:
            AuditService.log(
                action='DECRYPTION_FAILED_UNAUTHORIZED',
                user_id=student_id,
                role='student',
                resource_type='QUESTION_PAPER',
                resource_id=paper_id,
                status='DENIED',
                severity='HIGH',
                metadata={'reason': auth_reason},
                ip_address=ip_address
            )
            return {'success': False, 'error': auth_reason, 'status_code': 403}
            
        # 2. Check release time
        is_allowed, release_reason = cls.is_release_allowed(paper, now_utc)
        if not is_allowed:
            AuditService.log(
                action='EARLY_ACCESS_DENIED',
                user_id=student_id,
                role='student',
                resource_type='QUESTION_PAPER',
                resource_id=paper_id,
                status='DENIED',
                severity='WARNING',
                metadata={'reason': release_reason},
                ip_address=ip_address
            )
            return {'success': False, 'error': release_reason, 'status_code': 403}
            
        # 3. Read encrypted payload from storage
        enc_file_path = os.path.join(Config.ENCRYPTED_FOLDER, paper.encrypted_filename)
        if not os.path.exists(enc_file_path):
            return {'success': False, 'error': 'ENCRYPTED_FILE_NOT_FOUND', 'status_code': 404}
            
        with open(enc_file_path, 'rb') as f:
            ciphertext = f.read()
            
        # 4. Retrieve wrapped DEK
        key_record = EncryptedKey.query.filter_by(question_paper_id=paper_id, status='ACTIVE').first()
        if not key_record:
            return {'success': False, 'error': 'ENCRYPTED_KEY_NOT_FOUND', 'status_code': 500}
            
        # 5. Perform Verified Decryption
        try:
            dec_result = crypto_engine.decrypt_question_paper(
                ciphertext_bytes=ciphertext,
                wrapped_dek_b64=key_record.encrypted_dek,
                iv_b64=paper.iv_nonce,
                auth_tag_b64=paper.auth_tag,
                expected_file_hash=paper.file_hash,
                digital_signature=paper.digital_signature,
                profile_id=paper.algorithm_profile_id,
                key_id=paper.key_id,
                hash_algo=paper.profile.hash_algorithm if paper.profile else 'SHA-256'
            )
        except ValueError as ve:
            AuditService.log(
                action='DECRYPTION_INTEGRITY_FAILURE',
                user_id=student_id,
                role='student',
                resource_type='QUESTION_PAPER',
                resource_id=paper_id,
                status='FAILED',
                severity='CRITICAL',
                metadata={'error': str(ve)},
                ip_address=ip_address
            )
            return {'success': False, 'error': str(ve), 'status_code': 400}
            
        # Log successful key release & decryption
        AuditService.log(
            action='KEY_RELEASED_AND_DECRYPTED',
            user_id=student_id,
            role='student',
            resource_type='QUESTION_PAPER',
            resource_id=paper_id,
            status='SUCCESS',
            severity='INFO',
            metadata={
                'execution_time_ms': dec_result['execution_time_ms'],
                'signature_verified': True,
                'integrity_verified': True
            },
            ip_address=ip_address
        )
        
        return {
            'success': True,
            'plaintext_bytes': dec_result['plaintext'],
            'original_filename': paper.original_filename,
            'file_hash': paper.file_hash,
            'execution_time_ms': dec_result['execution_time_ms'],
            'signature_verified': True,
            'integrity_verified': True
        }

key_release_service = KeyReleaseService()
