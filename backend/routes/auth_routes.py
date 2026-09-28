from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from database.db import db
from models.user import User
from services.audit_service import AuditService

auth_bp = Blueprint('auth', __name__, url_prefix='/api')

DEPARTMENTS_CONFIG = {
    'CSE': {
        'name': 'Computer Science & Engineering',
        'sections': ['CSE-A', 'CSE-B', 'CSE-C'],
        'years': ['1', '2', '3', '4'],
        'semesters': ['1', '2']
    },
    'ECE': {
        'name': 'Electronics & Communication Engineering',
        'sections': ['ECE-A', 'ECE-B'],
        'years': ['1', '2', '3', '4'],
        'semesters': ['1', '2']
    },
    'EEE': {
        'name': 'Electrical & Electronics Engineering',
        'sections': ['EEE-A', 'EEE-B'],
        'years': ['1', '2', '3', '4'],
        'semesters': ['1', '2']
    },
    'ME': {
        'name': 'Mechanical Engineering',
        'sections': ['ME-A', 'ME-B'],
        'years': ['1', '2', '3', '4'],
        'semesters': ['1', '2']
    },
    'CIVIL': {
        'name': 'Civil Engineering',
        'sections': ['CIVIL-A', 'CIVIL-B'],
        'years': ['1', '2', '3', '4'],
        'semesters': ['1', '2']
    }
}

@auth_bp.route('/departments', methods=['GET'])
def get_departments():
    """Returns official department, section, and semester metadata"""
    return jsonify({
        'departments': [
            {'code': code, 'name': meta['name'], 'sections': meta['sections'], 'years': meta['years'], 'semesters': meta['semesters']}
            for code, meta in DEPARTMENTS_CONFIG.items()
        ]
    }), 200

@auth_bp.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    role = data.get('role', 'student').strip().lower()
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    department = data.get('department', '').strip().upper()
    
    if role == 'admin':
        return jsonify({'error': 'System administrator accounts cannot be registered publicly.'}), 403
        
    if role not in ['student', 'faculty']:
        return jsonify({'error': 'Invalid role specified. Must be student or faculty.'}), 400
        
    if not email or not password or not full_name:
        return jsonify({'error': 'Full name, email, and password are required.'}), 400
        
    if department not in DEPARTMENTS_CONFIG:
        return jsonify({'error': f"Invalid department. Must be one of: {', '.join(DEPARTMENTS_CONFIG.keys())}"}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({'error': f'An account with email {email} is already registered.'}), 400

    from utils.criteria_utils import (
        normalize_department, 
        normalize_section, 
        normalize_year, 
        normalize_semester,
        matches_target_criteria
    )

    if role == 'student':
        student_id = data.get('student_id', '').strip().upper()
        raw_section = data.get('section', '').strip()
        norm_dept = normalize_department(department)
        norm_sec = normalize_section(raw_section, norm_dept)
        norm_year = normalize_year(data.get('year', '1'))
        norm_sem = normalize_semester(data.get('semester', '1'))
        
        if not student_id:
            return jsonify({'error': 'Student ID is required (e.g. STU001 or STU-CSE-301).'}), 400
            
        if not raw_section:
            return jsonify({'error': 'Section is required (e.g. CSE-A).'}), 400
            
        if User.query.filter_by(student_id=student_id).first():
            return jsonify({'error': f'A student with ID {student_id} is already registered.'}), 400
            
        username = student_id
        user = User(
            username=username,
            full_name=full_name,
            email=email,
            role='student',
            student_id=student_id,
            department=norm_dept,
            section=norm_sec,
            year=norm_year,
            semester=norm_sem
        )
    else:  # faculty
        faculty_id = data.get('faculty_id', '').strip().upper()
        designation = data.get('designation', 'Professor').strip()
        
        if not faculty_id:
            return jsonify({'error': 'Faculty ID is required (e.g. FAC001).'}), 400
            
        if User.query.filter_by(faculty_id=faculty_id).first():
            return jsonify({'error': f'A faculty member with ID {faculty_id} is already registered.'}), 400
            
        username = faculty_id
        user = User(
            username=username,
            full_name=full_name,
            email=email,
            role='faculty',
            faculty_id=faculty_id,
            department=normalize_department(department),
            designation=designation
        )
        
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    
    # Auto-enroll newly registered student into existing active matching exams (Requirement 80-86)
    if role == 'student':
        from models.exam import Exam
        from models.exam_student import ExamStudent
        active_exams = Exam.query.filter_by(status='ACTIVE').all()
        for ex in active_exams:
            if matches_target_criteria(user, ex):
                existing_enroll = ExamStudent.query.filter_by(exam_id=ex.id, student_id=user.id).first()
                if not existing_enroll:
                    db.session.add(ExamStudent(exam_id=ex.id, student_id=user.id, status='ENROLLED'))
        db.session.commit()
    
    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            'role': user.role,
            'username': user.username,
            'full_name': user.full_name,
            'student_id': user.student_id,
            'faculty_id': user.faculty_id,
            'department': user.department,
            'section': user.section
        }
    )
    
    AuditService.log(
        action='USER_REGISTERED',
        user_id=user.id,
        role=user.role,
        resource_type='AUTH',
        status='SUCCESS',
        metadata={
            'role': user.role,
            'student_id': user.student_id,
            'faculty_id': user.faculty_id,
            'department': user.department,
            'section': user.section
        },
        ip_address=request.remote_addr
    )
    
    return jsonify({
        'token': token,
        'user': user.to_dict()
    }), 201

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        AuditService.log(
            action='LOGIN_FAILED',
            role='ANONYMOUS',
            resource_type='AUTH',
            status='DENIED',
            severity='WARNING',
            metadata={'attempted_email': email},
            ip_address=request.remote_addr
        )
        return jsonify({'error': 'Invalid email or password'}), 401
        
    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            'role': user.role,
            'username': user.username,
            'full_name': user.full_name or user.username,
            'student_id': user.student_id,
            'faculty_id': user.faculty_id,
            'department': user.department,
            'section': user.section
        }
    )
    
    AuditService.log(
        action='LOGIN_SUCCESS',
        user_id=user.id,
        role=user.role,
        resource_type='AUTH',
        status='SUCCESS',
        ip_address=request.remote_addr
    )
    
    return jsonify({
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict()), 200

@auth_bp.route('/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.get_json() or {}
    if 'default_security_level' in data:
        user.default_security_level = data['default_security_level']
    if 'auto_delete_files' in data:
        user.auto_delete_files = bool(data['auto_delete_files'])
    if 'theme_preference' in data:
        user.theme_preference = data['theme_preference']
        
    db.session.commit()
    return jsonify({'message': 'Settings updated successfully', 'user': user.to_dict()}), 200
