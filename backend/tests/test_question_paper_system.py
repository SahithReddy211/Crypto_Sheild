import os
import sys
import json
import secrets
import pytest
from datetime import datetime, timezone, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from database.db import db
from models.user import User
from models.exam import Exam
from models.exam_student import ExamStudent
from models.question_paper import QuestionPaper
from models.encrypted_key import EncryptedKey
from models.algorithm_profile import AlgorithmProfile
from models.audit_log import AuditLog
from services.crypto_agility_engine import crypto_engine
from services.key_release_service import key_release_service, KeyReleaseService

@pytest.fixture
def test_client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        with app.app_context():
            yield client

def get_auth_token(client, email, password):
    resp = client.post('/api/auth/login', json={'email': email, 'password': password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.get_json()}"
    return resp.get_json()['token']

# ==================== TEST 1: NORMAL HYBRID ENCRYPTION & STORAGE ====================
def test_1_normal_encryption_and_hybrid_protection(test_client):
    """
    Test 1: Upload paper -> Hybrid Encrypt -> Verify Encrypted Package, wrapped DEK & Signature
    """
    faculty_token = get_auth_token(test_client, 'faculty@university.edu', 'Faculty123!')
    
    # 1. Get Exam
    exam_resp = test_client.get('/api/faculty/exams', headers={'Authorization': f'Bearer {faculty_token}'})
    exams = exam_resp.get_json()
    assert len(exams) > 0
    exam_id = exams[0]['id']
    
    # 2. Upload Draft
    sample_content = b"%PDF-1.4\n1 0 obj\n<< /Title (Test Exam Paper) >>\nendobj\nCrypto Midterm Question 1..."
    from io import BytesIO
    upload_resp = test_client.post(
        '/api/question-papers',
        headers={'Authorization': f'Bearer {faculty_token}'},
        data={
            'exam_id': exam_id,
            'file': (BytesIO(sample_content), 'test_paper.pdf')
        },
        content_type='multipart/form-data'
    )
    assert upload_resp.status_code == 200
    upload_data = upload_resp.get_json()
    assert 'temp_token' in upload_data
    assert upload_data['file_hash'] == crypto_engine.calculate_hash(sample_content, 'SHA-256')
    
    # 3. Encrypt & Schedule
    now_utc = datetime.now(timezone.utc)
    rel_time = now_utc + timedelta(minutes=5)
    start_time = now_utc + timedelta(minutes=15)
    enc_resp = test_client.post(
        '/api/question-papers/encrypt-and-schedule',
        headers={'Authorization': f'Bearer {faculty_token}'},
        json={
            'temp_token': upload_data['temp_token'],
            'exam_id': exam_id,
            'original_filename': 'test_paper.pdf',
            'algorithm_profile_id': 'AES256-GCM-RSA3072-SHA256',
            'distribution_mode': 'MODE_A',
            'release_at': rel_time.isoformat(),
            'exam_start_at': start_time.isoformat()
        }
    )
    assert enc_resp.status_code == 201
    enc_data = enc_resp.get_json()
    paper_id = enc_data['paper']['id']
    
    # Verify paper is stored encrypted at rest with protected key
    paper = QuestionPaper.query.get(paper_id)
    assert paper is not None
    assert paper.status == 'SCHEDULED'
    assert paper.digital_signature is not None
    assert paper.iv_nonce is not None
    assert paper.auth_tag is not None
    
    # Verify key is wrapped (never stored in plaintext)
    enc_key = EncryptedKey.query.filter_by(question_paper_id=paper_id).first()
    assert enc_key is not None
    assert enc_key.encrypted_dek is not None

# ==================== TEST 2: EARLY ACCESS DENIAL ====================
def test_2_early_access_denial(test_client):
    """
    Test 2: Student attempts early decryption before scheduled release time.
    Must be rejected with 403 and logged as EARLY_ACCESS_DENIED.
    """
    student_token = get_auth_token(test_client, 'student@university.edu', 'Student123!')
    
    # QP-2026-00101 is scheduled in the future
    paper_id = 'QP-2026-00101'
    
    # Attempt release token request
    token_resp = test_client.post(
        f'/api/student/question-papers/{paper_id}/release-request',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert token_resp.status_code == 403
    token_data = token_resp.get_json()
    assert token_data['error'] == 'PAPER_NOT_RELEASED'
    assert 'release_at' in token_data
    
    # Attempt direct decryption bypass
    dec_resp = test_client.post(
        f'/api/student/question-papers/{paper_id}/decrypt',
        headers={'Authorization': f'Bearer {student_token}'},
        json={'release_token': 'fake-bypass-token'}
    )
    assert dec_resp.status_code == 403
    assert dec_resp.get_json()['error'] == 'PAPER_NOT_RELEASED'
    
    # Verify audit log was recorded
    log = AuditLog.query.filter_by(action='EARLY_ACCESS_DENIED', resource_id=paper_id).order_by(AuditLog.timestamp.desc()).first()
    assert log is not None
    assert log.severity == 'WARNING'

# ==================== TEST 3: SCHEDULED RELEASE AUTHORIZATION ====================
def test_3_scheduled_release_authorization(test_client):
    """
    Test 3: At or after release time, authorized student can decrypt and access paper.
    Signature and integrity hashes must be verified.
    """
    student_token = get_auth_token(test_client, 'student@university.edu', 'Student123!')
    
    # QP-2026-00102 was scheduled in the past (already released)
    paper_id = 'QP-2026-00102'
    
    # 1. Request release token
    token_resp = test_client.post(
        f'/api/student/question-papers/{paper_id}/release-request',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert token_resp.status_code == 200
    token_data = token_resp.get_json()
    assert token_data['success'] is True
    assert 'release_token' in token_data
    
    # 2. Request Decryption / Release Verification
    dec_resp = test_client.post(
        f'/api/student/question-papers/{paper_id}/decrypt',
        headers={'Authorization': f'Bearer {student_token}'},
        json={'release_token': token_data['release_token']}
    )
    assert dec_resp.status_code == 200
    dec_data = dec_resp.get_json()
    assert dec_data['success'] is True
    assert dec_data['signature_verified'] is True
    assert dec_data['integrity_verified'] is True
    assert 'total_pages' in dec_data
    # ARCHITECTURAL SECURITY: Original PDF bytes are never sent to the browser
    assert 'content_base64' not in dec_data
    assert 'watermark' in dec_data
    assert dec_data['watermark']['student_name'] in ['Alex Mercer', 'Alex_Mercer']
    
    # 3. Retrieve Page 1 via secure rasterizer
    page_resp = test_client.get(
        f'/api/student/question-papers/{paper_id}/pages/1',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert page_resp.status_code == 200
    assert page_resp.mimetype == 'image/png'
    assert len(page_resp.data) > 0
    assert page_resp.headers.get('Cache-Control') == 'no-store, no-cache, must-revalidate, max-age=0, private'
    assert page_resp.headers.get('X-Total-Pages') is not None

# ==================== TEST 4: CLIENT CLOCK MANIPULATION RESISTANCE ====================
def test_4_client_clock_manipulation_resistance(test_client):
    """
    Test 4: Client cannot trick server into releasing paper by manipulating timestamps in request.
    Server evaluates current time exclusively via authoritative UTC backend clock.
    """
    student_token = get_auth_token(test_client, 'student@university.edu', 'Student123!')
    paper_id = 'QP-2026-00101'
    
    # Send request with spoofed future client headers / payload
    fake_future_time = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
    resp = test_client.post(
        f'/api/student/question-papers/{paper_id}/release-request',
        headers={
            'Authorization': f'Bearer {student_token}',
            'X-Client-Time': fake_future_time,
            'Date': fake_future_time
        },
        json={'client_timestamp': fake_future_time}
    )
    assert resp.status_code == 403
    assert resp.get_json()['error'] == 'PAPER_NOT_RELEASED'

# ==================== TEST 5: UNAUTHORIZED STUDENT REJECTION ====================
def test_5_unauthorized_student_rejection(test_client):
    """
    Test 5: Student not assigned / enrolled in the examination is denied access.
    """
    student2_token = get_auth_token(test_client, 'student2@university.edu', 'Student123!')
    
    # QP-2026-00102 belongs to EXAM-2026-002, where student2 is NOT enrolled
    paper_id = 'QP-2026-00102'
    
    resp = test_client.post(
        f'/api/student/question-papers/{paper_id}/release-request',
        headers={'Authorization': f'Bearer {student2_token}'}
    )
    assert resp.status_code == 403
    assert resp.get_json()['error'] == 'UNAUTHORIZED_STUDENT'

# ==================== TEST 6: TAMPERED PACKAGE / SIGNATURE FAILURE ====================
def test_6_tampered_package_detection(test_client):
    """
    Test 6: If ciphertext or signature is modified, cryptographic verification fails.
    """
    # Create test encrypted payload and tamper with auth tag / signature
    raw_payload = b"Tamper detection test content"
    profile = AlgorithmProfile.query.get('AES256-GCM-RSA3072-SHA256')
    enc = crypto_engine.encrypt_question_paper(raw_payload, profile)
    
    # 1. Tampered Signature
    bad_signature = enc['digital_signature'][:-4] + "AAAA"
    with pytest.raises(ValueError) as excinfo:
        crypto_engine.decrypt_question_paper(
            ciphertext_bytes=enc['ciphertext'],
            wrapped_dek_b64=enc['encrypted_dek_b64'],
            iv_b64=enc['iv_b64'],
            auth_tag_b64=enc['auth_tag_b64'],
            expected_file_hash=enc['file_hash'],
            digital_signature=bad_signature,
            profile_id=profile.id,
            key_id=enc['key_id']
        )
    assert "SIGNATURE_VERIFICATION_FAILED" in str(excinfo.value)
    
    # 2. Tampered Ciphertext
    tampered_ct = bytearray(enc['ciphertext'])
    tampered_ct[0] ^= 0xFF
    with pytest.raises(ValueError) as excinfo2:
        crypto_engine.decrypt_question_paper(
            ciphertext_bytes=bytes(tampered_ct),
            wrapped_dek_b64=enc['encrypted_dek_b64'],
            iv_b64=enc['iv_b64'],
            auth_tag_b64=enc['auth_tag_b64'],
            expected_file_hash=enc['file_hash'],
            digital_signature=enc['digital_signature'],
            profile_id=profile.id,
            key_id=enc['key_id']
        )
    assert "CIPHERTEXT_CORRUPTED" in str(excinfo2.value)

# ==================== TEST 7: WRONG KEY / UNWRAPPING FAILURE ====================
def test_7_wrong_key_protection(test_client):
    """
    Test 7: Decryption with corrupted / unauthorized wrapped DEK fails.
    """
    raw_payload = b"Wrong key test content"
    profile = AlgorithmProfile.query.get('AES256-GCM-RSA3072-SHA256')
    enc = crypto_engine.encrypt_question_paper(raw_payload, profile)
    
    # Corrupt the wrapped DEK
    bad_wrapped_dek = "A" * len(enc['encrypted_dek_b64'])
    
    with pytest.raises(ValueError) as excinfo:
        crypto_engine.decrypt_question_paper(
            ciphertext_bytes=enc['ciphertext'],
            wrapped_dek_b64=bad_wrapped_dek,
            iv_b64=enc['iv_b64'],
            auth_tag_b64=enc['auth_tag_b64'],
            expected_file_hash=enc['file_hash'],
            digital_signature=enc['digital_signature'],
            profile_id=profile.id,
            key_id=enc['key_id']
        )
    # Signature or key unwrap failure
    assert "SIGNATURE_VERIFICATION_FAILED" in str(excinfo.value) or "KEY_UNWRAP_FAILED" in str(excinfo.value)

# ==================== TEST 8: EXPIRED PAPER REJECTION ====================
def test_8_expired_paper_handling(test_client):
    """
    Test 8: Access attempt after paper expires_at timestamp is denied with PAPER_EXPIRED.
    """
    student_token = get_auth_token(test_client, 'student@university.edu', 'Student123!')
    
    # Create an expired paper with unique ID
    now_utc = datetime.now(timezone.utc)
    expired_id = f"QP-EXP-{secrets.token_hex(4)}"
    expired_paper = QuestionPaper(
        id=expired_id,
        exam_id='EXAM-2026-001',
        faculty_id=1,
        original_filename='expired.pdf',
        encrypted_filename='qp_cs804_midterm.enc',
        file_size=1024,
        file_hash='fakehash',
        algorithm_profile_id='AES256-GCM-RSA3072-SHA256',
        key_id='KEY-EXP',
        status='EXPIRED',
        release_at=now_utc - timedelta(hours=5),
        expires_at=now_utc - timedelta(hours=1)
    )
    db.session.add(expired_paper)
    db.session.commit()
    
    resp = test_client.post(
        f'/api/student/question-papers/{expired_paper.id}/release-request',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert resp.status_code == 403
    assert resp.get_json()['error'] == 'PAPER_EXPIRED'

# ==================== TEST 9: CRYPTO-AGILITY ALGORITHM MIGRATION ====================
def test_9_crypto_agility_algorithm_migration(test_client):
    """
    Test 9: Change default algorithm profile in admin policy -> New papers use the new profile
    without modifying question paper module code.
    """
    admin_token = get_auth_token(test_client, 'admin@cybersecurity.com', 'Admin123!')
    
    # 1. Update Default Profile to ECC Profile
    mig_resp = test_client.put(
        '/api/admin/crypto-profiles/default',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'profile_id': 'AES256-GCM-ECC-SHA384'}
    )
    assert mig_resp.status_code == 200
    assert mig_resp.get_json()['profile']['id'] == 'AES256-GCM-ECC-SHA384'
    assert mig_resp.get_json()['profile']['is_default'] is True
    
    # 2. Check that active profiles and metrics reflect migration readiness
    metrics_resp = test_client.get(
        '/api/admin/security-metrics',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert metrics_resp.status_code == 200
    m = metrics_resp.get_json()
    assert m['migration_ready'] is True
    assert m['active_crypto_profiles'] >= 2
    
    # 3. Restore Default to RSA-3072
    test_client.put(
        '/api/admin/crypto-profiles/default',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'profile_id': 'AES256-GCM-RSA3072-SHA256'}
    )

# ==================== TEST 10: SECURE DOCUMENT VIEWER (REQUIREMENTS A-J) ====================
def test_10_secure_document_viewer_requirements_a_through_j(test_client):
    """
    Requirement 17 Comprehensive Verification:
    A. Before scheduled release: Student cannot retrieve any page.
    B. After scheduled release: Authorized student can view pages.
    C. Unauthorized student: Cannot view pages.
    D. Direct request to original PDF: Must fail with 401/403/404.
    E. Guessing PDF URLs: Must not expose the file.
    F. Browser: No native PDF viewer should appear (verified via API returning image/png not application/pdf).
    G. No Download/Open in New Tab/Print controls (verified in SecurePaperViewer component code).
    H. Refresh: Authorization and release-time checks still happen.
    I. Expired session: Page requests without valid token fail with 401.
    J. Attempt to manipulate paperId/studentId in the API: Must fail authorization.
    """
    student_token = get_auth_token(test_client, 'student@university.edu', 'Student123!')
    student2_token = get_auth_token(test_client, 'student2@university.edu', 'Student123!')

    # A. BEFORE SCHEDULED RELEASE: Student cannot retrieve any page
    unreleased_paper_id = 'QP-2026-00101'
    resp_a = test_client.get(
        f'/api/student/question-papers/{unreleased_paper_id}/pages/1',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert resp_a.status_code == 403
    assert resp_a.get_json()['error'] == 'PAPER_NOT_RELEASED'

    # Also test via exam-scoped endpoint
    resp_a_exam = test_client.get(
        '/api/exams/EXAM-2026-001/paper/pages/1',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert resp_a_exam.status_code == 403
    assert resp_a_exam.get_json()['error'] == 'PAPER_NOT_RELEASED'

    # B. AFTER SCHEDULED RELEASE: Authorized student can view pages
    released_paper_id = 'QP-2026-00102'
    resp_b = test_client.get(
        f'/api/student/question-papers/{released_paper_id}/pages/1',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert resp_b.status_code == 200
    assert resp_b.mimetype == 'image/png'
    assert resp_b.headers.get('Cache-Control') == 'no-store, no-cache, must-revalidate, max-age=0, private'
    assert int(resp_b.headers.get('X-Total-Pages', 0)) >= 1
    assert resp_b.headers.get('X-Current-Page') == '1'

    # C. UNAUTHORIZED STUDENT: Cannot view pages
    # student2 is NOT enrolled in EXAM-2026-002
    resp_c = test_client.get(
        f'/api/student/question-papers/{released_paper_id}/pages/1',
        headers={'Authorization': f'Bearer {student2_token}'}
    )
    assert resp_c.status_code == 403
    assert resp_c.get_json()['error'] == 'UNAUTHORIZED_STUDENT'

    # D. DIRECT REQUEST TO ORIGINAL PDF: Must fail with 401/403/404
    resp_d1 = test_client.get('/api/download/CS702_Networks_Final.pdf')
    assert resp_d1.status_code in [401, 403, 404]

    resp_d2 = test_client.get('/api/download/any_exam_paper.pdf')
    assert resp_d2.status_code in [401, 403, 404]

    # E. GUESSING PDF URLS: Must not expose the file
    resp_e1 = test_client.get('/api/download/qp_cs804_midterm.enc')
    assert resp_e1.status_code in [401, 403, 404]

    resp_e2 = test_client.get('/api/download/draft_test.pdf')
    assert resp_e2.status_code in [401, 403, 404]

    # F. NEVER RETURN APPLICATION/PDF ON PAGE ENDPOINT
    assert resp_b.mimetype != 'application/pdf'
    assert not resp_b.data.startswith(b'%PDF')

    # G. CHECK FRONTEND COMPONENT DOES NOT EXPOSE NATIVE PDF VIEWER
    viewer_file_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'pages', 'question-papers', 'SecurePaperViewer.jsx')
    )
    if os.path.exists(viewer_file_path):
        with open(viewer_file_path, 'r', encoding='utf-8') as f:
            viewer_source = f.read()
        assert '<iframe' not in viewer_source
        assert '<embed' not in viewer_source
        assert '<object' not in viewer_source
        assert 'pdfBlobUrl' not in viewer_source
        assert 'application/pdf' not in viewer_source

    # H. REFRESH: Authorization and release-time checks still happen
    resp_h = test_client.get(
        f'/api/student/question-papers/{released_paper_id}/pages/1',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert resp_h.status_code == 200

    # I. EXPIRED SESSION: Missing or invalid token fails with 401
    resp_i1 = test_client.get(f'/api/student/question-papers/{released_paper_id}/pages/1')
    assert resp_i1.status_code == 401

    resp_i2 = test_client.get(
        f'/api/student/question-papers/{released_paper_id}/pages/1',
        headers={'Authorization': 'Bearer invalid-expired-token'}
    )
    assert resp_i2.status_code in [401, 422]

    # J. ATTEMPT TO MANIPULATE PAPER ID / INVALID PAGE: Fails properly
    resp_j1 = test_client.get(
        '/api/student/question-papers/NON-EXISTENT-PAPER/pages/1',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert resp_j1.status_code in [403, 404]

    resp_j2 = test_client.get(
        f'/api/student/question-papers/{released_paper_id}/pages/999',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert resp_j2.status_code == 400
    assert resp_j2.get_json()['error'] == 'INVALID_PAGE_NUMBER'
