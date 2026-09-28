import os
import sys
import unittest
import json
from datetime import datetime, timezone, timedelta

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import app
from database.db import db
from models.user import User
from models.exam import Exam
from models.question_paper import QuestionPaper
from models.algorithm_profile import AlgorithmProfile
from utils.time_utils import (
    parse_to_utc, 
    parse_date_and_time_to_utc,
    format_iso_utc, 
    format_ist, 
    IST
)
from utils.criteria_utils import (
    normalize_department,
    normalize_section,
    normalize_year,
    normalize_semester,
    matches_target_criteria
)

def run_tests():
    print("=" * 70)
    print("COMPREHENSIVE TEST: TIME CONVERSION & CRITERIA-BASED STUDENT TARGETING")
    print("=" * 70)

    # ── TEST 1: TIME CONVERSION PRECISION ────────────────────────────────────
    print("\n[TEST 1] Verifying IST -> UTC and UTC -> IST time conversions...")
    # Faculty inputs 09:50 AM IST on 2026-09-03
    release_utc = parse_date_and_time_to_utc('2026-09-03', '09:50')
    start_utc = parse_date_and_time_to_utc('2026-09-03', '09:55')
    end_utc = parse_date_and_time_to_utc('2026-09-03', '11:00')

    assert release_utc == datetime(2026, 9, 3, 4, 20, 0, tzinfo=timezone.utc), f"Expected 04:20:00 UTC, got {release_utc}"
    assert start_utc == datetime(2026, 9, 3, 4, 25, 0, tzinfo=timezone.utc), f"Expected 04:25:00 UTC, got {start_utc}"
    assert end_utc == datetime(2026, 9, 3, 5, 30, 0, tzinfo=timezone.utc), f"Expected 05:30:00 UTC, got {end_utc}"

    print(f"  Release Time: 09:50 AM IST  -> Stored UTC: {format_iso_utc(release_utc)}")
    print(f"  Exam Start:   09:55 AM IST  -> Stored UTC: {format_iso_utc(start_utc)}")
    print(f"  Exam End:     11:00 AM IST  -> Stored UTC: {format_iso_utc(end_utc)}")
    print(f"  Display Back to IST: {format_ist(release_utc)} and {format_ist(start_utc)}")
    assert format_ist(release_utc) == '09:50 AM IST'
    assert format_ist(start_utc) == '09:55 AM IST'
    print("  [PASS] TEST 1 PASSED: Exact match with Section 78 specifications!")

    # ── TEST 2: CRITERIA NORMALIZATION ───────────────────────────────────────
    print("\n[TEST 2] Verifying criteria normalization...")
    assert normalize_department('cse') == 'CSE'
    assert normalize_department('Computer Science') == 'CSE'
    assert normalize_department('ece') == 'ECE'
    assert normalize_section('cse-a') == 'CSE-A'
    assert normalize_section('CSE--A') == 'CSE-A'
    assert normalize_section('CSE A') == 'CSE-A'
    assert normalize_section('A', 'CSE') == 'CSE-A'
    assert normalize_year('3rd Year') == '3'
    assert normalize_year('Year 3') == '3'
    assert normalize_year('3') == '3'
    assert normalize_semester('1st Semester') == '1'
    assert normalize_semester('Sem 1') == '1'
    assert normalize_semester('1') == '1'
    print("  [PASS] TEST 2 PASSED: Normalization handles variations seamlessly!")

    # ── TEST 3: CRITERIA MATCHING ISOLATION ──────────────────────────────────
    print("\n[TEST 3] Verifying Section 87 target matching isolation...")
    class MockTarget:
        def __init__(self, dept, sec, yr, sem):
            self.department = dept
            self.section = sec
            self.year = yr
            self.semester = sem

    class MockStudent:
        def __init__(self, dept, sec, yr, sem, role='student'):
            self.department = dept
            self.section = sec
            self.year = yr
            self.semester = sem
            self.role = role

    exam_target = MockTarget('CSE', 'CSE-A', '3', '1')

    stu_match = MockStudent('CSE', 'CSE-A', '3', '1')
    stu_ece = MockStudent('ECE', 'ECE-A', '3', '1')
    stu_cseb = MockStudent('CSE', 'CSE-B', '3', '1')
    stu_yr2 = MockStudent('CSE', 'CSE-A', '2', '1')
    stu_sem2 = MockStudent('CSE', 'CSE-A', '3', '2')

    assert matches_target_criteria(stu_match, exam_target) is True, "Target student must match"
    assert matches_target_criteria(stu_ece, exam_target) is False, "ECE student must NOT match"
    assert matches_target_criteria(stu_cseb, exam_target) is False, "CSE-B student must NOT match"
    assert matches_target_criteria(stu_yr2, exam_target) is False, "Year 2 student must NOT match"
    assert matches_target_criteria(stu_sem2, exam_target) is False, "Semester 2 student must NOT match"
    print("  [PASS] TEST 3 PASSED: Exactly matches Section 87 negative tests!")

    # ── TEST 4: FLASK API END-TO-END WORKFLOW ────────────────────────────────
    print("\n[TEST 4] End-to-end API test with Flask test client...")
    client = app.test_client()

    with app.app_context():
        # Get or create Faculty FAC001
        faculty = User.query.filter_by(faculty_id='FAC001').first()
        assert faculty is not None, "Faculty FAC001 must exist"
        
        # 1. Login Faculty
        fac_login = client.post('/api/auth/login', json={
            'email': 'faculty@university.edu',
            'password': 'Faculty123!'
        })
        assert fac_login.status_code == 200, f"Faculty login failed: {fac_login.data}"
        fac_token = fac_login.get_json()['token']
        fac_headers = {'Authorization': f'Bearer {fac_token}'}

        # 2. Register Student STU-CSE-301
        # Delete if exists from previous run - must delete exam enrollments first
        from models.exam_student import ExamStudent as ExamStudentModel
        existing_stu = User.query.filter_by(email='stu301@university.edu').first()
        if existing_stu:
            ExamStudentModel.query.filter_by(student_id=existing_stu.id).delete()
            db.session.delete(existing_stu)
            db.session.commit()

        stu_reg = client.post('/api/auth/register', json={
            'student_id': 'STU-CSE-301',
            'full_name': 'Test Student 301',
            'email': 'stu301@university.edu',
            'password': 'Student123!',
            'role': 'student',
            'department': 'CSE',
            'section': 'CSE-A',
            'year': '3',
            'semester': '1'
        })
        assert stu_reg.status_code in (200, 201), f"Student register failed: {stu_reg.data}"
        stu_id = stu_reg.get_json()['user']['id']
        print("  Registered Student STU-CSE-301 (CSE, CSE-A, Year 3, Semester 1)")

        # Login STU-CSE-301
        stu_login = client.post('/api/auth/login', json={
            'email': 'stu301@university.edu',
            'password': 'Student123!'
        })
        stu_token = stu_login.get_json()['token']
        stu_headers = {'Authorization': f'Bearer {stu_token}'}

        # 3. Create Exam CS-702 (Final Semester Examination) - fresh each run
        exam_res = client.post('/api/exams', headers=fac_headers, json={
            'course_id': 'CS-702',
            'course_name': 'Advanced Computer Networks',
            'subject': 'Final Semester Examination',
            'department': 'CSE',
            'section': 'CSE-A',
            'year': '3',
            'semester': '1',
            'exam_date': '2026-09-03',
            'exam_start_at': '2026-09-03T09:55:00+05:30',
            'exam_end_at': '2026-09-03T11:00:00+05:30',
            'duration_minutes': 65
        })
        assert exam_res.status_code == 201, f"Create exam failed: {exam_res.data}"
        exam_data = exam_res.get_json()['exam']
        created_exam_id = exam_data['id']
        print(f"  Created Examination {created_exam_id}")
        assert exam_data['exam_start_at_ist'] == '09:55 AM IST', f"Expected 09:55 AM IST, got {exam_data['exam_start_at_ist']}"
        assert exam_data['exam_start_at_utc'] == '2026-09-03T04:25:00Z', f"Expected 04:25:00Z, got {exam_data['exam_start_at_utc']}"
        assert exam_data['eligible_students_count'] >= 1, "Must find at least STU-CSE-301"

        # 4. Upload draft file for paper
        from io import BytesIO
        pdf_content = b"%PDF-1.4\nAIML_PROJECT_DOCUMENTATION_1 Final Semester Exam Content\n"
        upload_res = client.post('/api/question-papers', headers=fac_headers, data={
            'file': (BytesIO(pdf_content), 'AIML_PROJECT_DOCUMENTATION_1.pdf'),
            'exam_id': created_exam_id
        }, content_type='multipart/form-data')
        assert upload_res.status_code == 200, f"Upload draft failed: {upload_res.data}"
        draft_data = upload_res.get_json()
        temp_token = draft_data['temp_token']

        # 5. VALIDATION TEST: Attempt to schedule Release Time (10:00 IST) > Exam Start Time (09:55 IST)
        invalid_sched = client.post('/api/question-papers/encrypt-and-schedule', headers=fac_headers, json={
            'temp_token': temp_token,
            'exam_id': created_exam_id,
            'original_filename': 'AIML_PROJECT_DOCUMENTATION_1.pdf',
            'algorithm_profile_id': 'AES256-GCM-RSA3072-SHA256',
            'distribution_mode': 'MODE_A',
            'release_at': '2026-09-03T10:00:00+05:30'  # 10:00 AM IST is AFTER 09:55 AM IST!
        })
        assert invalid_sched.status_code == 400, f"Expected 400 rejection for release > start, got {invalid_sched.status_code}"
        print(f"  [PASS] Validation correctly rejected: {invalid_sched.get_json()['error']}")

        # 6. Valid Schedule: Release 09:50 AM IST, Start 09:55 AM IST
        valid_sched = client.post('/api/question-papers/encrypt-and-schedule', headers=fac_headers, json={
            'temp_token': temp_token,
            'exam_id': created_exam_id,
            'original_filename': 'AIML_PROJECT_DOCUMENTATION_1.pdf',
            'algorithm_profile_id': 'AES256-GCM-RSA3072-SHA256',
            'distribution_mode': 'MODE_A',
            'release_at': '2026-09-03T09:50:00+05:30'  # 09:50 AM IST
        })
        assert valid_sched.status_code == 201, f"Valid schedule failed: {valid_sched.data}"
        paper_data = valid_sched.get_json()['paper']
        paper_id = paper_data['id']
        print(f"  Successfully encrypted & scheduled paper {paper_id}")
        assert paper_data['release_at_ist'] == '09:50 AM IST'
        assert paper_data['exam_start_at_ist'] == '09:55 AM IST'
        assert paper_data['release_at_utc'] == '2026-09-03T04:20:00Z'
        assert paper_data['exam_start_at_utc'] == '2026-09-03T04:25:00Z'
        print(f"  Faculty Paper Vault Values Verified:")
        print(f"    Exam Window:       {paper_data['exam_window_ist']}")
        print(f"    Scheduled Release: {paper_data['release_at_ist']} ({paper_data['release_at_utc']})")
        print(f"    Eligible Students: {paper_data['eligible_students_count']}")

        # 7. Student STU-CSE-301 retrieves dashboard
        stu_papers_res = client.get('/api/student/question-papers', headers=stu_headers)
        assert stu_papers_res.status_code == 200
        stu_papers = stu_papers_res.get_json()
        matching_p = [p for p in stu_papers if p['id'] == paper_id]
        assert len(matching_p) == 1, f"Student STU-CSE-301 must see paper {paper_id} on dashboard!"
        assert matching_p[0]['status'] in ['LOCKED', 'RELEASED']
        print(f"  [PASS] Student STU-CSE-301 sees paper {paper_id} on dashboard (Status: {matching_p[0]['status']})")

        # 8. Student STU002 (ECE-A Year 2 Sem 1) retrieves dashboard
        ece_login = client.post('/api/auth/login', json={
            'email': 'student2@university.edu',
            'password': 'Student123!'
        })
        ece_token = ece_login.get_json()['token']
        ece_headers = {'Authorization': f'Bearer {ece_token}'}

        ece_papers_res = client.get('/api/student/question-papers', headers=ece_headers)
        assert ece_papers_res.status_code == 200
        ece_papers = ece_papers_res.get_json()
        assert not any(p['id'] == paper_id for p in ece_papers), "ECE-A Student must NOT see CSE-A Year 3 paper!"
        print(f"  [PASS] ECE-A Student STU002 does NOT see paper {paper_id}")

        # 9. Direct ID Tampering / Access test: ECE student attempts to decrypt or request token
        unauth_token_req = client.post(f'/api/student/question-papers/{paper_id}/release-request', headers=ece_headers)
        assert unauth_token_req.status_code == 403, f"Expected 403 Forbidden for unauthorized student, got {unauth_token_req.status_code}"
        print(f"  [PASS] Unauthorized direct access by ECE student correctly rejected with HTTP 403 Forbidden!")

        # 10. Student STU001 (CSE-A Year 2 Sem 1) retrieves dashboard
        cse_yr2_login = client.post('/api/auth/login', json={
            'email': 'student@university.edu',
            'password': 'Student123!'
        })
        cse_yr2_token = cse_yr2_login.get_json()['token']
        cse_yr2_headers = {'Authorization': f'Bearer {cse_yr2_token}'}
        cse_yr2_papers_res = client.get('/api/student/question-papers', headers=cse_yr2_headers)
        assert not any(p['id'] == paper_id for p in cse_yr2_papers_res.get_json()), "CSE-A Year 2 Student must NOT see Year 3 paper!"
        print(f"  [PASS] CSE-A Year 2 Student STU001 does NOT see Year 3 paper {paper_id}")

    print("\n" + "=" * 70)
    print("ALL TIME & TARGETING VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == '__main__':
    run_tests()
