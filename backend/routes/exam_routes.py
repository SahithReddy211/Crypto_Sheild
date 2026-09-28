import os
import json
import secrets
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, send_file, Response
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from werkzeug.utils import secure_filename
import io

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
from services.audit_service import AuditService
from services.scheduler_service import release_scheduler
from config import Config

from utils.time_utils import (
    parse_to_utc,
    parse_date_and_time_to_utc,
    format_iso_utc,
    format_ist,
    get_current_server_time_utc,
    ensure_utc
)
from utils.criteria_utils import (
    normalize_department,
    normalize_section,
    normalize_year,
    normalize_semester,
    matches_target_criteria
)

exam_bp = Blueprint('exam', __name__, url_prefix='/api')

# ==================== SYSTEM TIME (AUTHORITATIVE) ====================
@exam_bp.route('/system/time', methods=['GET'])
def get_system_time():
    """Returns authoritative server UTC time and formatted IST time"""
    now_utc = get_current_server_time_utc()
    return jsonify({
        'server_time_utc': format_iso_utc(now_utc),
        'server_time_ist': format_ist(now_utc),
        'timestamp': now_utc.timestamp(),
        'timezone': 'UTC'
    }), 200

# ==================== FACULTY: CREATE & MANAGE EXAMS ====================
@exam_bp.route('/faculty/eligible-students', methods=['GET'])
@jwt_required()
def get_eligible_students():
    """Preview eligible students dynamically based on target Department, Section, Year, Semester"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role not in ['faculty', 'admin']:
        return jsonify({'error': 'Unauthorized: Faculty or Admin role required'}), 403
        
    raw_dept = request.args.get('department', '').strip()
    raw_sec = request.args.get('section', '').strip()
    raw_year = request.args.get('year', '').strip()
    raw_sem = request.args.get('semester', '').strip()
    
    dept = normalize_department(raw_dept) if raw_dept else ''
    sec = normalize_section(raw_sec, dept) if raw_sec else ''
    year = normalize_year(raw_year) if raw_year else ''
    sem = normalize_semester(raw_sem) if raw_sem else ''
    
    query = User.query.filter_by(role='student')
    if dept:
        query = query.filter_by(department=dept)
    if sec:
        query = query.filter_by(section=sec)
    if year:
        query = query.filter_by(year=year)
    if sem:
        query = query.filter_by(semester=sem)
        
    students = query.order_by(User.student_id.asc()).all()
    return jsonify({
        'count': len(students),
        'students': [s.to_dict() for s in students]
    }), 200

@exam_bp.route('/exams', methods=['POST'])
@jwt_required()
def create_exam():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role not in ['faculty', 'admin']:
        return jsonify({'error': 'Unauthorized: Faculty or Admin role required'}), 403
        
    data = request.get_json() or {}
    course_id = data.get('course_id', '').strip()
    course_name = data.get('course_name', '').strip()
    subject = data.get('subject', '').strip()
    department = normalize_department(data.get('department', 'CSE'))
    section = normalize_section(data.get('section', 'CSE-A'), department)
    year = normalize_year(data.get('year', '3'))
    semester = normalize_semester(data.get('semester', '1'))
    exam_date = data.get('exam_date', '').strip()
    duration_minutes = int(data.get('duration_minutes', 90))
    student_ids = data.get('student_ids', [])
    
    # Parse Start and End Datetimes into UTC (Requirement 73 & 76)
    exam_start_str = data.get('exam_start_at')
    exam_start_time = data.get('exam_start_time')
    if exam_start_str:
        start_dt = parse_to_utc(exam_start_str)
    elif exam_date and exam_start_time:
        start_dt = parse_date_and_time_to_utc(exam_date, exam_start_time)
    else:
        start_dt = None
        
    exam_end_str = data.get('exam_end_at')
    exam_end_time = data.get('exam_end_time')
    if exam_end_str:
        end_dt = parse_to_utc(exam_end_str)
    elif exam_date and exam_end_time:
        end_dt = parse_date_and_time_to_utc(exam_date, exam_end_time)
    elif start_dt:
        end_dt = start_dt + timedelta(minutes=duration_minutes)
    else:
        end_dt = None
    
    if not course_name or not exam_date or not start_dt or not end_dt:
        return jsonify({'error': 'Missing required examination fields: course_name, exam_date, and valid start time.'}), 400
        
    # Validation: Exam Start Time < Exam End Time (Requirement 77)
    if start_dt >= end_dt:
        return jsonify({
            'error': f'Invalid schedule: Examination start time ({format_ist(start_dt)}) must be strictly before examination end time ({format_ist(end_dt)}).'
        }), 400
        
    exam_id = f"EXAM-{secrets.token_hex(4).upper()}"
    exam = Exam(
        id=exam_id,
        course_id=course_id or 'CS-702',
        course_name=course_name,
        subject=subject or course_name,
        department=department,
        section=section,
        year=year,
        semester=semester,
        exam_date=exam_date,
        exam_start_at=start_dt,
        exam_end_at=end_dt,
        duration_minutes=duration_minutes,
        created_by=user_id,
        status='ACTIVE'
    )
    db.session.add(exam)
    
    # Assign Target Students based on normalized criteria
    target_students = User.query.filter_by(
        role='student',
        department=department,
        section=section,
        year=year,
        semester=semester
    ).all()
    
    for s in target_students:
        enrollment = ExamStudent(exam_id=exam_id, student_id=s.id, status='ENROLLED')
        db.session.add(enrollment)
        
    db.session.commit()
    
    AuditService.log(
        action='EXAM_CREATED',
        user_id=user_id,
        role=user.role,
        resource_type='EXAM',
        resource_id=exam_id,
        status='SUCCESS',
        metadata={
            'course_name': course_name,
            'department': department,
            'section': section,
            'year': year,
            'semester': semester,
            'exam_start_at_utc': format_iso_utc(start_dt),
            'exam_start_at_ist': format_ist(start_dt),
            'enrolled_students': len(target_students)
        },
        ip_address=request.remote_addr
    )
    
    return jsonify({
        'message': 'Examination created successfully',
        'exam': exam.to_dict(),
        'enrolled_students_count': len(target_students)
    }), 201

@exam_bp.route('/exams/<exam_id>', methods=['PUT'])
@jwt_required()
def update_exam(exam_id):
    """Update existing exam details, times, and target criteria"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role not in ['faculty', 'admin']:
        return jsonify({'error': 'Unauthorized: Faculty or Admin role required'}), 403
        
    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify({'error': 'Examination not found'}), 404
        
    if user.role != 'admin' and exam.created_by != user_id:
        return jsonify({'error': 'Unauthorized to modify this examination'}), 403
        
    data = request.get_json() or {}
    if 'course_id' in data:
        exam.course_id = data['course_id'].strip()
    if 'course_name' in data:
        exam.course_name = data['course_name'].strip()
    if 'subject' in data:
        exam.subject = data['subject'].strip()
    if 'department' in data:
        exam.department = normalize_department(data['department'])
    if 'section' in data:
        exam.section = normalize_section(data['section'], exam.department)
    if 'year' in data:
        exam.year = normalize_year(data['year'])
    if 'semester' in data:
        exam.semester = normalize_semester(data['semester'])
    if 'exam_date' in data:
        exam.exam_date = data['exam_date'].strip()
    if 'duration_minutes' in data:
        exam.duration_minutes = int(data['duration_minutes'])
        
    if 'exam_start_at' in data:
        exam.exam_start_at = parse_to_utc(data['exam_start_at'])
    elif 'exam_start_time' in data and exam.exam_date:
        exam.exam_start_at = parse_date_and_time_to_utc(exam.exam_date, data['exam_start_time'])
        
    if 'exam_end_at' in data:
        exam.exam_end_at = parse_to_utc(data['exam_end_at'])
    elif 'exam_end_time' in data and exam.exam_date:
        exam.exam_end_at = parse_date_and_time_to_utc(exam.exam_date, data['exam_end_time'])
    elif exam.exam_start_at and exam.duration_minutes:
        exam.exam_end_at = exam.exam_start_at + timedelta(minutes=exam.duration_minutes)
        
    if exam.exam_start_at and exam.exam_end_at and exam.exam_start_at >= exam.exam_end_at:
        return jsonify({
            'error': f'Invalid schedule: Start time ({format_ist(exam.exam_start_at)}) must be before end time ({format_ist(exam.exam_end_at)}).'
        }), 400
        
    # Re-sync matching students for updated criteria
    matching_students = User.query.filter_by(
        role='student',
        department=exam.department,
        section=exam.section,
        year=exam.year,
        semester=exam.semester
    ).all()
    
    for s in matching_students:
        if not ExamStudent.query.filter_by(exam_id=exam.id, student_id=s.id).first():
            db.session.add(ExamStudent(exam_id=exam.id, student_id=s.id, status='ENROLLED'))
            
    db.session.commit()
    return jsonify({
        'message': 'Examination updated successfully',
        'exam': exam.to_dict()
    }), 200

@exam_bp.route('/faculty/exams', methods=['GET'])
@jwt_required()
def get_faculty_exams():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role not in ['faculty', 'admin']:
        return jsonify({'error': 'Unauthorized: Faculty or Admin role required'}), 403
        
    if user.role == 'admin':
        exams = Exam.query.order_by(Exam.created_at.desc()).all()
    else:
        exams = Exam.query.filter_by(created_by=user_id).order_by(Exam.created_at.desc()).all()
    return jsonify([e.to_dict() for e in exams]), 200

# ==================== FACULTY: QUESTION PAPER LIFECYCLE ====================
@exam_bp.route('/question-papers', methods=['POST'])
@jwt_required()
def upload_question_paper_draft():
    """
    Step 2: Upload question paper file (PDF/DOCX), calculate original hash.
    Does NOT store plaintext permanently once encrypted.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ['faculty', 'admin']:
        return jsonify({'error': 'Unauthorized'}), 403
        
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
        
    file = request.files['file']
    exam_id = request.form.get('exam_id')
    
    if not exam_id or not file.filename:
        return jsonify({'error': 'Examination ID and file are required'}), 400
        
    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify({'error': 'Examination not found'}), 404
        
    file_bytes = file.read()
    original_filename = secure_filename(file.filename)
    file_size = len(file_bytes)
    
    # Calculate SHA-256 integrity digest immediately
    file_hash = crypto_engine.calculate_hash(file_bytes, 'SHA-256')
    
    # Temporary staging
    temp_name = f"draft_{secrets.token_hex(8)}_{original_filename}"
    temp_path = os.path.join(Config.TEMP_FOLDER, temp_name)
    with open(temp_path, 'wb') as f:
        f.write(file_bytes)
        
    # Get recommendation
    default_profile = AlgorithmProfile.query.filter_by(is_default=True).first()
    rec = crypto_engine.recommend_algorithm('PDF', file_size, 'High')
    
    AuditService.log(
        action='QUESTION_PAPER_UPLOADED',
        user_id=user_id,
        role=user.role,
        resource_type='QUESTION_PAPER',
        status='SUCCESS',
        metadata={'original_filename': original_filename, 'file_size': file_size, 'sha256': file_hash},
        ip_address=request.remote_addr
    )
    
    return jsonify({
        'temp_token': temp_name,
        'original_filename': original_filename,
        'file_size': file_size,
        'file_hash': file_hash,
        'exam_id': exam_id,
        'recommended_profile': rec,
        'default_profile_id': default_profile.id if default_profile else 'AES256-GCM-RSA3072-SHA256'
    }), 200

@exam_bp.route('/question-papers/encrypt-and-schedule', methods=['POST'])
@jwt_required()
def encrypt_and_schedule_paper():
    """
    Steps 3, 4, 5: Hybrid encryption, digital signature generation, secure storage, and scheduling.
    Removes temporary plaintext immediately upon encryption.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ['faculty', 'admin']:
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json() or {}
    temp_token = data.get('temp_token')
    exam_id = data.get('exam_id')
    original_filename = data.get('original_filename', 'question_paper.pdf')
    profile_id = data.get('algorithm_profile_id')
    distribution_mode = data.get('distribution_mode', 'MODE_A')  # MODE_A or MODE_B
    release_at_str = data.get('release_at')  # UTC ISO timestamp
    expires_at_str = data.get('expires_at')
    
    if not temp_token or not exam_id or not release_at_str:
        return jsonify({'error': 'Missing required encryption or scheduling parameters'}), 400
        
    temp_path = os.path.join(Config.TEMP_FOLDER, secure_filename(temp_token))
    if not os.path.exists(temp_path):
        return jsonify({'error': 'Staged draft payload expired or not found. Please upload again.'}), 400
        
    with open(temp_path, 'rb') as f:
        plaintext_bytes = f.read()
        
    # Retrieve or fallback AlgorithmProfile
    profile = None
    if profile_id:
        profile = AlgorithmProfile.query.get(profile_id)
    if not profile:
        profile = AlgorithmProfile.query.filter_by(is_default=True).first()
    if not profile:
        profile = AlgorithmProfile.query.first()
        
    # Execute Hybrid Encryption & Digital Signature
    enc_output = crypto_engine.encrypt_question_paper(plaintext_bytes, profile)
    
    # Save Encrypted File to Secure Storage
    paper_id = f"QP-{datetime.now().year}-{secrets.token_hex(3).upper()}"
    enc_filename = f"qp_{secrets.token_hex(12)}.enc"
    enc_path = os.path.join(Config.ENCRYPTED_FOLDER, enc_filename)
    with open(enc_path, 'wb') as f:
        f.write(enc_output['ciphertext'])
        
    # Retrieve exam and parse release and expiration datetimes into UTC (Requirement 73-77)
    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify({'error': 'Examination not found'}), 404
        
    release_at = parse_to_utc(release_at_str)
    if not release_at:
        return jsonify({'error': 'Invalid release timestamp format'}), 400
        
    # Update exam schedule if provided in scheduling request
    if 'exam_start_at' in data:
        new_start = parse_to_utc(data['exam_start_at'])
        if new_start:
            # Store as naive UTC in SQLite (will be treated as UTC by ensure_utc everywhere)
            exam.exam_start_at = new_start.replace(tzinfo=None)
            if 'duration_minutes' in data:
                exam.duration_minutes = int(data['duration_minutes'])
            exam.exam_end_at = new_start.replace(tzinfo=None) + timedelta(minutes=exam.duration_minutes)
            
    # Use ensure_utc() to make DB-loaded naive datetimes offset-aware before comparison
    exam_start_utc = ensure_utc(exam.exam_start_at)
    exam_end_utc = ensure_utc(exam.exam_end_at)
    
    # Validation 1: Release Time < Exam Start Time (Requirement 75 & 77)
    if release_at >= exam_start_utc:
        return jsonify({
            'error': f'Invalid schedule: Question paper release time ({format_ist(release_at)}) must be strictly before examination start time ({format_ist(exam_start_utc)}).'
        }), 400
        
    # Validation 2: Exam Start Time < Exam End Time (Requirement 77)
    if exam_start_utc >= exam_end_utc:
        return jsonify({
            'error': f'Invalid schedule: Examination start time ({format_ist(exam_start_utc)}) must be strictly before examination end time ({format_ist(exam_end_utc)}).'
        }), 400
        
    if expires_at_str:
        expires_at = parse_to_utc(expires_at_str)
    else:
        expires_at = exam_end_utc
        
    # Create QuestionPaper Record
    paper = QuestionPaper(
        id=paper_id,
        exam_id=exam_id,
        faculty_id=user_id,
        original_filename=original_filename,
        encrypted_filename=enc_filename,
        file_size=len(plaintext_bytes),
        file_hash=enc_output['file_hash'],
        algorithm_profile_id=profile.id,
        key_id=enc_output['key_id'],
        distribution_mode=distribution_mode,
        status='SCHEDULED',
        release_at=release_at,
        expires_at=expires_at,
        digital_signature=enc_output['digital_signature'],
        iv_nonce=enc_output['iv_b64'],
        auth_tag=enc_output['auth_tag_b64']
    )
    db.session.add(paper)
    
    # Store Protected DEK (Wrapped DEK - Plaintext DEK is never stored)
    encrypted_key = EncryptedKey(
        question_paper_id=paper_id,
        key_id=enc_output['key_id'],
        encrypted_dek=enc_output['encrypted_dek_b64'],
        key_encryption_algorithm=profile.key_management_algorithm,
        status='ACTIVE'
    )
    db.session.add(encrypted_key)
    
    db.session.commit()
    
    # CRITICAL: Auto-purge temporary plaintext file from disk
    try:
        os.remove(temp_path)
    except Exception:
        pass
        
    AuditService.log(
        action='PAPER_ENCRYPTED_AND_SCHEDULED',
        user_id=user_id,
        role=user.role,
        resource_type='QUESTION_PAPER',
        resource_id=paper_id,
        status='SUCCESS',
        severity='INFO',
        metadata={
            'algorithm_profile': profile.id,
            'key_id': enc_output['key_id'],
            'release_at': release_at.isoformat(),
            'distribution_mode': distribution_mode,
            'execution_time_ms': enc_output['execution_time_ms']
        },
        ip_address=request.remote_addr
    )
    
    return jsonify({
        'message': 'Question paper encrypted and scheduled successfully',
        'paper': paper.to_dict(),
        'execution_time_ms': enc_output['execution_time_ms'],
        'package_metadata': {
            'paper_id': paper_id,
            'key_id': enc_output['key_id'],
            'file_hash': enc_output['file_hash'],
            'signature': enc_output['digital_signature'][:24] + '...',
            'algorithm_profile': profile.id
        }
    }), 201

@exam_bp.route('/faculty/question-papers', methods=['GET'])
@jwt_required()
def get_faculty_question_papers():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role not in ['faculty', 'admin']:
        return jsonify({'error': 'Unauthorized: Faculty or Admin role required'}), 403
    
    # Trigger scheduler check to ensure up-to-date statuses
    release_scheduler.check_and_release_scheduled_papers()
    
    if user.role == 'admin':
        papers = QuestionPaper.query.order_by(QuestionPaper.created_at.desc()).all()
    else:
        papers = QuestionPaper.query.filter_by(faculty_id=user_id).order_by(QuestionPaper.created_at.desc()).all()
        
    return jsonify([p.to_dict() for p in papers]), 200

@exam_bp.route('/question-papers/<paper_id>', methods=['DELETE'])
@jwt_required()
def cancel_question_paper(paper_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    paper = QuestionPaper.query.get(paper_id)
    
    if not paper:
        return jsonify({'error': 'Paper not found'}), 404
    if not user or (user.role != 'admin' and paper.faculty_id != user_id):
        return jsonify({'error': 'Unauthorized'}), 403
    if paper.status == 'RELEASED':
        return jsonify({'error': 'Cannot cancel a paper that has already been released'}), 400
        
    paper.status = 'CANCELLED'
    db.session.commit()
    
    AuditService.log(
        action='PAPER_CANCELLED',
        user_id=user_id,
        role=user.role,
        resource_type='QUESTION_PAPER',
        resource_id=paper_id,
        status='SUCCESS',
        severity='WARNING',
        ip_address=request.remote_addr
    )
    
    return jsonify({'message': f'Question paper {paper_id} cancelled successfully'}), 200

# ==================== STUDENT WORKFLOW & AUTHORIZED RELEASE ====================
@exam_bp.route('/student/exams', methods=['GET'])
@jwt_required()
def get_student_exams():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'student':
        return jsonify({'error': 'Unauthorized: Student role required'}), 403
        
    release_scheduler.check_and_release_scheduled_papers()
    
    # Dynamic criteria synchronization (Requirement 80-86)
    active_exams = Exam.query.filter_by(status='ACTIVE').all()
    for ex in active_exams:
        if matches_target_criteria(user, ex):
            if not ExamStudent.query.filter_by(exam_id=ex.id, student_id=user_id).first():
                db.session.add(ExamStudent(exam_id=ex.id, student_id=user_id, status='ENROLLED'))
    db.session.commit()
    
    enrollments = ExamStudent.query.filter_by(student_id=user_id, status='ENROLLED')\
        .join(Exam, ExamStudent.exam_id == Exam.id)\
        .order_by(Exam.exam_start_at.desc(), Exam.created_at.desc())\
        .all()
        
    results = []
    now_utc = get_current_server_time_utc()
    for enroll in enrollments:
        exam = enroll.exam
        if not exam:
            continue
        papers = QuestionPaper.query.filter_by(exam_id=exam.id).order_by(QuestionPaper.release_at.desc(), QuestionPaper.created_at.desc()).all()
        papers_data = []
        for p in papers:
            rel_at = p.release_at if p.release_at.tzinfo else p.release_at.replace(tzinfo=timezone.utc)
            is_released = (now_utc >= rel_at)
            # Before release: metadata only, no plaintext, no DEK
            paper_dict = p.to_dict()
            paper_dict['can_decrypt'] = is_released and p.status != 'CANCELLED'
            paper_dict['status'] = 'RELEASED' if is_released else 'LOCKED'
            papers_data.append(paper_dict)
            
        results.append({
            'exam': exam.to_dict(),
            'papers': papers_data
        })
        
    return jsonify(results), 200

@exam_bp.route('/student/question-papers', methods=['GET'])
@jwt_required()
def get_student_question_papers():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'student':
        return jsonify({'error': 'Unauthorized: Student role required'}), 403
        
    release_scheduler.check_and_release_scheduled_papers()
    
    # Dynamic criteria matching (Requirement 80-86)
    # Check both explicit enrollments AND matching active target criteria
    active_exams = Exam.query.filter_by(status='ACTIVE').all()
    enrollments = ExamStudent.query.filter_by(student_id=user_id, status='ENROLLED').all()
    exam_ids = set([e.exam_id for e in enrollments])
    
    synced_any = False
    for ex in active_exams:
        if matches_target_criteria(user, ex):
            if ex.id not in exam_ids:
                db.session.add(ExamStudent(exam_id=ex.id, student_id=user_id, status='ENROLLED'))
                exam_ids.add(ex.id)
                synced_any = True
                
    if synced_any:
        db.session.commit()
        
    if not exam_ids:
        return jsonify([]), 200
    
    # NEWEST FIRST ordering explicitly enforced
    papers = QuestionPaper.query.filter(QuestionPaper.exam_id.in_(list(exam_ids)))\
        .order_by(QuestionPaper.release_at.desc(), QuestionPaper.created_at.desc())\
        .all()
    
    now_utc = get_current_server_time_utc()
    res = []
    for p in papers:
        rel_at = p.release_at if p.release_at.tzinfo else p.release_at.replace(tzinfo=timezone.utc)
        is_released = now_utc >= rel_at
        paper_dict = p.to_dict()
        paper_dict['can_decrypt'] = is_released and p.status != 'CANCELLED'
        if not is_released:
            paper_dict['status'] = 'LOCKED'
        else:
            paper_dict['status'] = 'RELEASED'
        res.append(paper_dict)
        
    return jsonify(res), 200

@exam_bp.route('/student/question-papers/<paper_id>', methods=['GET'])
@jwt_required()
def get_student_question_paper_status(paper_id):
    """
    Returns question paper status.
    Before release: returns metadata ONLY with locked status.
    NEVER returns plaintext, DEK, or private key.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'student':
        return jsonify({'error': 'Unauthorized: Student role required'}), 403
        
    now_utc = KeyReleaseService.get_current_server_time_utc()
    
    is_auth, auth_reason, paper = KeyReleaseService.authorize_student_access(user_id, paper_id)
    if not is_auth:
        return jsonify({'error': 'Unauthorized: You are not enrolled in this examination'}), 403
        
    rel_at = paper.release_at if paper.release_at.tzinfo else paper.release_at.replace(tzinfo=timezone.utc)
    is_released = now_utc >= rel_at
    
    response_data = {
        'paper_id': paper.id,
        'exam_id': paper.exam_id,
        'exam_name': paper.exam.course_name if paper.exam else 'Midterm',
        'subject': paper.exam.subject if paper.exam else 'Cryptography',
        'department': paper.exam.department if paper.exam else 'CSE',
        'section': paper.exam.section if paper.exam else 'CSE-A',
        'status': 'RELEASED' if is_released else 'LOCKED',
        'release_at': paper.release_at.isoformat(),
        'server_time_utc': now_utc.isoformat(),
        'can_decrypt': is_released and paper.status != 'CANCELLED',
        'distribution_mode': paper.distribution_mode,
        'algorithm_profile': paper.algorithm_profile_id,
        'file_hash': paper.file_hash,
        'digital_signature_present': bool(paper.digital_signature)
    }
    return jsonify(response_data), 200

@exam_bp.route('/student/question-papers/<paper_id>/encrypted-package', methods=['GET'])
@jwt_required()
def download_encrypted_package(paper_id):
    """
    MODE B Demonstration: Student downloads encrypted package (.enc) before examination.
    Student possesses ciphertext, IV, Hash, and Signature, but NOT the DEK.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'student':
        return jsonify({'error': 'Unauthorized: Student role required'}), 403
        
    is_auth, auth_reason, paper = KeyReleaseService.authorize_student_access(user_id, paper_id)
    if not is_auth:
        return jsonify({'error': 'Unauthorized'}), 403
        
    enc_path = os.path.join(Config.ENCRYPTED_FOLDER, paper.encrypted_filename)
    if not os.path.exists(enc_path):
        return jsonify({'error': 'Encrypted file not found'}), 404
        
    import base64
    with open(enc_path, 'rb') as f:
        ciphertext_bytes = f.read()
        
    # Get Wrapped DEK
    enc_key = EncryptedKey.query.filter_by(question_paper_id=paper_id, status='ACTIVE').first()
    
    package = {
        'version': '1.0',
        'paperId': paper.id,
        'algorithmProfile': paper.algorithm_profile_id,
        'encryptionAlgorithm': paper.profile.encryption_algorithm if paper.profile else 'AES-256-GCM',
        'keyEncryptionAlgorithm': paper.profile.key_management_algorithm if paper.profile else 'RSA-OAEP-3072',
        'hashAlgorithm': paper.profile.hash_algorithm if paper.profile else 'SHA-256',
        'signatureAlgorithm': paper.profile.signature_algorithm if paper.profile else 'RSA-PSS',
        'fileHash': paper.file_hash,
        'iv': paper.iv_nonce,
        'authTag': paper.auth_tag,
        'encryptedKey': enc_key.encrypted_dek if enc_key else None,
        'signature': paper.digital_signature,
        'encryptedPayload': base64.b64encode(ciphertext_bytes).decode('utf-8')
    }
    
    AuditService.log(
        action='ENCRYPTED_PACKAGE_DOWNLOADED',
        user_id=user_id,
        role='student',
        resource_type='QUESTION_PAPER',
        resource_id=paper_id,
        status='SUCCESS',
        metadata={'distribution_mode': 'MODE_B', 'paper_id': paper_id},
        ip_address=request.remote_addr
    )
    
    response = Response(
        json.dumps(package, indent=2),
        mimetype='application/json',
        headers={'Content-Disposition': f'attachment;filename={paper.id}.enc'}
    )
    return response

@exam_bp.route('/student/question-papers/<paper_id>/release-request', methods=['POST'])
@jwt_required()
def request_release_token(paper_id):
    """
    Authoritative Server Key Release:
    Issues short-lived token once server-side time is reached.
    If called early: returns 403 with PAPER_NOT_RELEASED and logs EARLY_ACCESS_DENIED.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'student':
        return jsonify({'error': 'Unauthorized: Student role required'}), 403
        
    result = KeyReleaseService.issue_release_token(paper_id, user_id, ip_address=request.remote_addr)
    status_code = result.pop('status_code', 200)
    return jsonify(result), status_code

@exam_bp.route('/student/question-papers/<paper_id>/decrypt', methods=['POST'])
@jwt_required()
def decrypt_and_view_paper(paper_id):
    """
    Decryption endpoint for authorized release.
    Validates release time, student enrollment, verifies digital signature & SHA-256 hash.
    Admin or faculty accounts CANNOT decrypt student papers (separation of duties).
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'student':
        return jsonify({'error': 'Forbidden: Only authenticated and enrolled students can decrypt question papers'}), 403
        
    token_str = request.get_json().get('release_token') if request.is_json else None
    
    result = KeyReleaseService.decrypt_and_retrieve_paper(
        paper_id=paper_id,
        student_id=user_id,
        token_str=token_str,
        ip_address=request.remote_addr
    )
    
    status_code = result.get('status_code', 200)
    if not result.get('success'):
        return jsonify(result), status_code
        
    # Return decrypted paper details + base64 content for client-side watermarked viewing
    import base64
    b64_content = base64.b64encode(result['plaintext_bytes']).decode('utf-8')
    orig_name = result.get('original_filename') or ''
    is_pdf = result['plaintext_bytes'].startswith(b'%PDF') or orig_name.lower().endswith('.pdf')
    
    resp = jsonify({
        'success': True,
        'paper_id': paper_id,
        'filename': result['original_filename'],
        'file_hash': result['file_hash'],
        'signature_verified': True,
        'integrity_verified': True,
        'execution_time_ms': result['execution_time_ms'],
        'is_pdf': is_pdf,
        'content_base64': b64_content,
        'watermark': {
            'student_id': user.student_id or f"STU-{user.id:04d}",
            'student_name': user.full_name or user.username,
            'student_email': user.email,
            'department': user.department or 'CSE',
            'section': user.section or 'CSE-A',
            'paper_id': paper_id,
            'timestamp': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
        }
    })
    resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    resp.headers['Pragma'] = 'no-cache'
    return resp, 200

# ==================== ADMIN: USER, EXAM & CRYPTO-AGILITY POLICY MANAGEMENT ====================
@exam_bp.route('/admin/users', methods=['GET'])
@jwt_required()
def get_admin_users():
    """Admin endpoint to view registered students and faculty"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'error': 'Unauthorized: Admin role required'}), 403
        
    students = User.query.filter_by(role='student').order_by(User.student_id.asc(), User.created_at.desc()).all()
    faculty = User.query.filter_by(role='faculty').order_by(User.faculty_id.asc(), User.created_at.desc()).all()
    
    return jsonify({
        'students': [s.to_dict() for s in students],
        'faculty': [f.to_dict() for f in faculty]
    }), 200

@exam_bp.route('/admin/examinations', methods=['GET'])
@jwt_required()
def get_admin_examinations():
    """Admin endpoint to monitor all examinations across the university"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'error': 'Unauthorized: Admin role required'}), 403
        
    exams = Exam.query.order_by(Exam.created_at.desc()).all()
    return jsonify([e.to_dict() for e in exams]), 200

@exam_bp.route('/admin/question-papers', methods=['GET'])
@jwt_required()
def get_admin_question_papers():
    """Admin metadata monitoring of question papers (no plaintext decryption)"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'error': 'Unauthorized: Admin role required'}), 403
        
    release_scheduler.check_and_release_scheduled_papers()
    papers = QuestionPaper.query.order_by(QuestionPaper.created_at.desc()).all()
    return jsonify([p.to_dict() for p in papers]), 200

@exam_bp.route('/admin/crypto-profiles', methods=['GET'])
@jwt_required()
def get_crypto_profiles():
    profiles = AlgorithmProfile.query.order_by(AlgorithmProfile.created_at.asc()).all()
    return jsonify([p.to_dict() for p in profiles]), 200

@exam_bp.route('/admin/crypto-profiles/default', methods=['PUT'])
@jwt_required()
def set_default_crypto_profile():
    """
    Demonstrates Crypto-Agility Migration:
    Admins can switch active default algorithm profile (e.g. from RSA-3072 to ECC or PQC).
    New papers automatically adopt new profile without application code modifications.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'error': 'Unauthorized: Admin role required'}), 403
        
    data = request.get_json() or {}
    profile_id = data.get('profile_id')
    
    target_profile = AlgorithmProfile.query.get(profile_id)
    if not target_profile:
        return jsonify({'error': 'Profile not found'}), 404
        
    # Reset current defaults
    AlgorithmProfile.query.update({'is_default': False})
    target_profile.is_default = True
    db.session.commit()
    
    AuditService.log(
        action='CRYPTO_POLICY_UPDATED',
        user_id=user_id,
        role='admin',
        resource_type='PROFILE',
        resource_id=profile_id,
        status='SUCCESS',
        severity='INFO',
        metadata={'new_default_profile': target_profile.name},
        ip_address=request.remote_addr
    )
    
    return jsonify({
        'message': f'Default crypto-agility profile updated to {target_profile.name}',
        'profile': target_profile.to_dict()
    }), 200

@exam_bp.route('/admin/audit-logs', methods=['GET'])
@jwt_required()
def get_audit_logs():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role not in ['admin', 'faculty']:
        return jsonify({'error': 'Unauthorized'}), 403
        
    role_filter = request.args.get('role')
    severity_filter = request.args.get('severity')
    action_filter = request.args.get('action')
    paper_id_filter = request.args.get('paper_id')
    
    query = AuditLog.query
    if role_filter and role_filter != 'ALL':
        query = query.filter_by(role=role_filter)
    if severity_filter and severity_filter != 'ALL':
        query = query.filter_by(severity=severity_filter)
    if action_filter:
        query = query.filter(AuditLog.action.ilike(f"%{action_filter}%"))
    if paper_id_filter:
        query = query.filter(AuditLog.resource_id == paper_id_filter)
        
    logs = query.order_by(AuditLog.timestamp.desc()).limit(100).all()
    return jsonify([l.to_dict() for l in logs]), 200

@exam_bp.route('/admin/security-metrics', methods=['GET'])
@jwt_required()
def get_security_metrics():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'error': 'Unauthorized: Admin role required'}), 403
        
    total_papers = QuestionPaper.query.count()
    released_papers = QuestionPaper.query.filter_by(status='RELEASED').count()
    scheduled_papers = QuestionPaper.query.filter_by(status='SCHEDULED').count()
    
    total_students = User.query.filter_by(role='student').count()
    total_faculty = User.query.filter_by(role='faculty').count()
    total_exams = Exam.query.count()
    
    early_attempts = AuditLog.query.filter_by(action='EARLY_ACCESS_DENIED').count()
    denied_requests = AuditLog.query.filter(AuditLog.status.in_(['DENIED', 'BLOCKED', 'FAILED'])).count()
    successful_releases = AuditLog.query.filter_by(action='KEY_RELEASED_AND_DECRYPTED').count()
    integrity_failures = AuditLog.query.filter_by(action='DECRYPTION_INTEGRITY_FAILURE').count()
    active_profiles = AlgorithmProfile.query.filter_by(status='ACTIVE').count()
    
    return jsonify({
        'papers_protected': total_papers,
        'papers_released': released_papers,
        'papers_scheduled': scheduled_papers,
        'registered_students': total_students,
        'registered_faculty': total_faculty,
        'active_examinations': total_exams,
        'early_access_attempts': early_attempts,
        'blocked_requests': denied_requests,
        'successful_decryptions': successful_releases,
        'integrity_failures': integrity_failures,
        'active_crypto_profiles': active_profiles,
        'migration_ready': True
    }), 200
