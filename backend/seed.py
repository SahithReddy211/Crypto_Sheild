import os
import secrets
from datetime import datetime, timezone, timedelta
from database.db import db
from models.user import User
from models.algorithm_profile import AlgorithmProfile
from models.exam import Exam
from models.exam_student import ExamStudent
from models.question_paper import QuestionPaper
from models.encrypted_key import EncryptedKey
from models.audit_log import AuditLog
from models.file_vault import UploadedFile, CryptoOperationHistory
from services.crypto_agility_engine import crypto_engine
from services.audit_service import AuditService

def create_sample_pdf(title, question_lines):
    """Generates a fully valid binary PDF document in pure python standard library"""
    content_stream = f'BT /F1 16 Tf 50 750 Td ({title}) Tj ET\n'
    y = 710
    for q in question_lines:
        clean_q = q.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
        content_stream += f'BT /F1 11 Tf 50 {y} Td ({clean_q}) Tj ET\n'
        y -= 25
        if y < 50:
            break
            
    stream_bytes = content_stream.encode('latin1')
    stream_len = len(stream_bytes)
    
    body = bytearray()
    offsets = []
    
    def add_obj(obj_str):
        offsets.append(len(body))
        body.extend(obj_str.encode('latin1'))
        
    body.extend(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
    add_obj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
    add_obj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
    add_obj('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n')
    add_obj(f'4 0 obj\n<< /Length {stream_len} >>\nstream\n')
    body.extend(stream_bytes)
    body.extend(b'\nendstream\nendobj\n')
    add_obj('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n')
    
    xref_offset = len(body)
    body.extend(b'xref\n0 6\n0000000000 65535 f \n')
    for off in offsets:
        body.extend(f'{off:010d} 00000 n \n'.encode('latin1'))
    body.extend(f'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n'.encode('latin1'))
    return bytes(body)

def seed_database(app):
    with app.app_context():
        db.create_all()
        
        # 1. Seed Algorithm Profiles
        if not AlgorithmProfile.query.first():
            p1 = AlgorithmProfile(
                id='AES256-GCM-RSA3072-SHA256',
                name='AES-256-GCM + RSA-OAEP-3072 + SHA-256 + RSA-PSS',
                encryption_algorithm='AES-256-GCM',
                key_management_algorithm='RSA-OAEP-3072',
                hash_algorithm='SHA-256',
                signature_algorithm='RSA-PSS',
                security_level='HIGH',
                is_default=True,
                status='ACTIVE',
                reason='Recommended NIST-compliant profile for high-stakes academic examinations requiring authenticated encryption and post-quantum resilient asymmetric key wrapping.'
            )
            p2 = AlgorithmProfile(
                id='AES256-GCM-ECC-SHA384',
                name='AES-256-GCM + ECDH-P384 + SHA-384 + ECDSA',
                encryption_algorithm='AES-256-GCM',
                key_management_algorithm='ECDH-P384',
                hash_algorithm='SHA-384',
                signature_algorithm='ECDSA-SHA384',
                security_level='MAXIMUM',
                is_default=False,
                status='ACTIVE',
                reason='Elliptic Curve profile providing lightweight key exchange with equivalent 7680-bit RSA strength and SHA-384 message authentication.'
            )
            p3 = AlgorithmProfile(
                id='PQC-HYBRID-AES256-SHA512',
                name='PQC-Hybrid Kyber/ML-KEM + AES-256-GCM + SHA-512',
                encryption_algorithm='AES-256-GCM',
                key_management_algorithm='ML-KEM-768-Hybrid',
                hash_algorithm='SHA-512',
                signature_algorithm='ML-DSA-65',
                security_level='MAXIMUM',
                is_default=False,
                status='ACTIVE',
                reason='Post-Quantum Cryptography migration candidate ready for quantum-safe deployment.'
            )
            db.session.add_all([p1, p2, p3])
            db.session.commit()
            print("[Seed] Algorithm profiles seeded.")
            
        # 2. Seed Users
        admin = User.query.filter_by(email='admin@cybersecurity.com').first()
        if not admin:
            admin = User(
                username='Admin_Security',
                full_name='Admin Security Officer',
                email='admin@cybersecurity.com',
                role='admin'
            )
            admin.set_password('Admin123!')
            db.session.add(admin)
            
        faculty = User.query.filter_by(email='faculty@university.edu').first()
        if not faculty:
            faculty = User(
                username='Prof_Alan_Turing',
                full_name='Prof. Alan Turing',
                email='faculty@university.edu',
                role='faculty',
                faculty_id='FAC001',
                department='CSE',
                designation='Professor'
            )
            faculty.set_password('Faculty123!')
            db.session.add(faculty)
            
        student1 = User.query.filter_by(email='student@university.edu').first()
        if not student1:
            student1 = User(
                username='Alex_Mercer',
                full_name='Alex Mercer',
                email='student@university.edu',
                role='student',
                student_id='STU001',
                department='CSE',
                section='CSE-A',
                year='2',
                semester='1'
            )
            student1.set_password('Student123!')
            db.session.add(student1)
            
        student2 = User.query.filter_by(email='student2@university.edu').first()
        if not student2:
            student2 = User(
                username='Bob_Ross',
                full_name='Bob Ross',
                email='student2@university.edu',
                role='student',
                student_id='STU002',
                department='ECE',
                section='ECE-A',
                year='2',
                semester='1'
            )
            student2.set_password('Student123!')
            db.session.add(student2)
            
        student3 = User.query.filter_by(email='student3@university.edu').first()
        if not student3:
            student3 = User(
                username='Carol_Danvers',
                full_name='Carol Danvers',
                email='student3@university.edu',
                role='student',
                student_id='STU003',
                department='CSE',
                section='CSE-A',
                year='2',
                semester='1'
            )
            student3.set_password('Student123!')
            db.session.add(student3)
            
        db.session.commit()
        print("[Seed] Users seeded (Admin, Faculty FAC001, Students STU001 CSE-A, STU002 ECE-A, STU003 CSE-A).")
        
        # 3. Seed Exams
        now_utc = datetime.now(timezone.utc)
        exam1 = Exam.query.get('EXAM-2026-001')
        if not exam1:
            exam1 = Exam(
                id='EXAM-2026-001',
                course_id='CS-804',
                course_name='Cryptography and Cryptanalysis',
                subject='Mid-Term Examination',
                department='CSE',
                section='CSE-A',
                year='2',
                semester='1',
                exam_date=now_utc.strftime('%Y-%m-%d'),
                exam_start_at=now_utc + timedelta(minutes=15),
                exam_end_at=now_utc + timedelta(minutes=105),
                duration_minutes=90,
                created_by=faculty.id,
                status='ACTIVE'
            )
            db.session.add(exam1)
            
            # Enroll STU001 and STU003 (both CSE-A). STU002 is ECE-A and not enrolled!
            es1 = ExamStudent(exam_id=exam1.id, student_id=student1.id, status='ENROLLED')
            es3 = ExamStudent(exam_id=exam1.id, student_id=student3.id, status='ENROLLED')
            db.session.add_all([es1, es3])
            
        exam2 = Exam.query.get('EXAM-2026-002')
        if not exam2:
            exam2 = Exam(
                id='EXAM-2026-002',
                course_id='CS-702',
                course_name='Advanced Computer Networks',
                subject='Final Semester Examination',
                department='CSE',
                section='CSE-A',
                year='2',
                semester='1',
                exam_date=now_utc.strftime('%Y-%m-%d'),
                exam_start_at=now_utc - timedelta(minutes=45),
                exam_end_at=now_utc + timedelta(minutes=45),
                duration_minutes=90,
                created_by=faculty.id,
                status='ACTIVE'
            )
            db.session.add(exam2)
            
            es2_1 = ExamStudent(exam_id=exam2.id, student_id=student1.id, status='ENROLLED')
            es2_3 = ExamStudent(exam_id=exam2.id, student_id=student3.id, status='ENROLLED')
            db.session.add_all([es2_1, es2_3])
            
        db.session.commit()
        print("[Seed] Examinations seeded.")
        
        # 4. Seed Question Papers
        sample_pdf_text = create_sample_pdf(
            "CS-804: Cryptography and Cryptanalysis - Midterm Examination",
            [
                "Instructions: Answer all questions in Section A and choose 2 from Section B.",
                "Section A: Foundations (40 Marks)",
                "1. Explain the difference between AES-GCM (AEAD) and AES-CBC with HMAC.",
                "2. Formulate the mathematical basis of RSA-OAEP vs PKCS#1 v1.5 padding attacks.",
                "3. Compare SHA-256 and SHA-384 in terms of collision and length extension resistance.",
                "Section B: Crypto-Agility & Applied Cryptanalysis (60 Marks)",
                "4. Design a crypto-agile key wrapping protocol using hybrid post-quantum KEM.",
                "5. Explain how possession of ciphertext before release time fails to yield plaintext."
            ]
        )
        sample_net_text = create_sample_pdf(
            "CS-702: Advanced Computer Networks - Final Examination",
            [
                "Instructions: Answer all technical questions below. Duration: 90 Minutes.",
                "1. Analyze BGP route flapping and mitigation via Route Flap Damping.",
                "2. Explain the cryptographic handshake protocol of TLS 1.3 0-RTT and replay resistance.",
                "3. Compare TCP BBR vs TCP Cubic congestion control under bufferbloat conditions.",
                "4. Describe DNSSEC key rollover mechanisms (KSK vs ZSK)."
            ]
        )

        qp1 = QuestionPaper.query.get('QP-2026-00101')
        if not qp1:
            profile = AlgorithmProfile.query.get('AES256-GCM-RSA3072-SHA256')
            enc_res = crypto_engine.encrypt_question_paper(sample_pdf_text, profile)
            
            enc_file_name = 'qp_cs804_midterm.enc'
            enc_path = os.path.join(app.config['ENCRYPTED_FOLDER'], enc_file_name)
            with open(enc_path, 'wb') as f:
                f.write(enc_res['ciphertext'])
                
            qp1 = QuestionPaper(
                id='QP-2026-00101',
                exam_id=exam1.id,
                faculty_id=faculty.id,
                original_filename='CS804_Cryptography_Midterm.pdf',
                encrypted_filename=enc_file_name,
                file_size=len(sample_pdf_text),
                file_hash=enc_res['file_hash'],
                algorithm_profile_id=profile.id,
                key_id=enc_res['key_id'],
                distribution_mode='MODE_A',
                status='SCHEDULED',
                release_at=now_utc + timedelta(minutes=10),
                expires_at=now_utc + timedelta(minutes=120),
                digital_signature=enc_res['digital_signature'],
                iv_nonce=enc_res['iv_b64'],
                auth_tag=enc_res['auth_tag_b64']
            )
            db.session.add(qp1)
            
            ek1 = EncryptedKey(
                question_paper_id=qp1.id,
                key_id=enc_res['key_id'],
                encrypted_dek=enc_res['encrypted_dek_b64'],
                key_encryption_algorithm=profile.key_management_algorithm,
                status='ACTIVE'
            )
            db.session.add(ek1)
        else:
            # Refresh schedule relative to current UTC so test suites always match
            qp1.release_at = now_utc + timedelta(minutes=10)
            qp1.expires_at = now_utc + timedelta(minutes=120)
            qp1.status = 'SCHEDULED'
            exam1.exam_start_at = now_utc + timedelta(minutes=15)
            exam1.exam_end_at = now_utc + timedelta(minutes=105)
            
        qp2 = QuestionPaper.query.get('QP-2026-00102')
        if not qp2:
            profile = AlgorithmProfile.query.get('AES256-GCM-RSA3072-SHA256')
            enc_res2 = crypto_engine.encrypt_question_paper(sample_net_text, profile)
            
            enc_file_name2 = 'qp_cs702_final.enc'
            enc_path2 = os.path.join(app.config['ENCRYPTED_FOLDER'], enc_file_name2)
            with open(enc_path2, 'wb') as f:
                f.write(enc_res2['ciphertext'])
                
            qp2 = QuestionPaper(
                id='QP-2026-00102',
                exam_id=exam2.id,
                faculty_id=faculty.id,
                original_filename='CS702_Networks_Final.pdf',
                encrypted_filename=enc_file_name2,
                file_size=len(sample_net_text),
                file_hash=enc_res2['file_hash'],
                algorithm_profile_id=profile.id,
                key_id=enc_res2['key_id'],
                distribution_mode='MODE_B',
                status='RELEASED',
                release_at=now_utc - timedelta(minutes=30),
                released_at=now_utc - timedelta(minutes=30),
                expires_at=now_utc + timedelta(minutes=120),
                digital_signature=enc_res2['digital_signature'],
                iv_nonce=enc_res2['iv_b64'],
                auth_tag=enc_res2['auth_tag_b64']
            )
            db.session.add(qp2)
            
            ek2 = EncryptedKey(
                question_paper_id=qp2.id,
                key_id=enc_res2['key_id'],
                encrypted_dek=enc_res2['encrypted_dek_b64'],
                key_encryption_algorithm=profile.key_management_algorithm,
                status='ACTIVE'
            )
            db.session.add(ek2)
        else:
            # Refresh schedule relative to current UTC so test suites always match
            qp2.release_at = now_utc - timedelta(minutes=30)
            qp2.released_at = now_utc - timedelta(minutes=30)
            qp2.expires_at = now_utc + timedelta(minutes=120)
            qp2.status = 'RELEASED'
            exam2.exam_start_at = now_utc - timedelta(minutes=25)
            exam2.exam_end_at = now_utc + timedelta(minutes=95)
            
        # 5. Seed Initial Audit Logs
        if not AuditLog.query.first():
            AuditService.log(
                action='SYSTEM_BOOTSTRAP',
                role='SYSTEM',
                resource_type='SYSTEM',
                status='SUCCESS',
                severity='INFO',
                metadata={'message': 'Crypto-Agility Secure Question Paper Distribution System initialized'}
            )
            AuditService.log(
                action='EARLY_ACCESS_DENIED',
                user_id=student1.id,
                role='student',
                resource_type='QUESTION_PAPER',
                resource_id='QP-2026-00101',
                status='DENIED',
                severity='WARNING',
                metadata={'reason': 'PAPER_NOT_RELEASED', 'attempted_before_release_minutes': 8}
            )
            AuditService.log(
                action='SCHEDULED_RELEASE_TRIGGERED',
                role='SYSTEM',
                resource_type='QUESTION_PAPER',
                resource_id='QP-2026-00102',
                status='SUCCESS',
                severity='INFO',
                metadata={'scheduled_release': '2026-08-27 10:00:00 UTC'}
            )
            AuditService.log(
                action='KEY_RELEASED_AND_DECRYPTED',
                user_id=student1.id,
                role='student',
                resource_type='QUESTION_PAPER',
                resource_id='QP-2026-00102',
                status='SUCCESS',
                severity='INFO',
                metadata={'execution_time_ms': 18.4, 'signature_verified': True, 'integrity_verified': True}
            )
            
        db.session.commit()
        print("[Seed] Question papers and audit logs seeded successfully.")
