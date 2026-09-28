import re

def normalize_department(dept):
    """
    Normalizes department codes to standard canonical strings.
    Examples:
    'CSE', 'cse', 'Computer Science' -> 'CSE'
    'ECE', 'ece', 'Electronics' -> 'ECE'
    """
    if not dept:
        return 'CSE'
    d = str(dept).strip().upper()
    if 'CSE' in d or 'COMPUTER' in d:
        return 'CSE'
    if 'ECE' in d or 'ELECTRONIC' in d:
        return 'ECE'
    if 'EEE' in d or 'ELECTRICAL' in d:
        return 'EEE'
    if 'ME' in d or 'MECHANICAL' in d:
        return 'ME'
    if 'CIVIL' in d:
        return 'CIVIL'
    return d

def normalize_section(sec, dept=None):
    """
    Normalizes section representation.
    Examples:
    'CSE-A', 'CSE--A', 'CSE A', 'cse-a' -> 'CSE-A'
    'A' (with dept 'CSE') -> 'CSE-A'
    """
    if not sec:
        dept_norm = normalize_department(dept) if dept else 'CSE'
        return f"{dept_norm}-A"
        
    s = str(sec).strip().upper()
    # Replace spaces, underscores, double hyphens
    s = re.sub(r'[\s_]+', '-', s)
    s = re.sub(r'-+', '-', s)
    
    # If section is just single letter like 'A' or 'B'
    if s in ['A', 'B', 'C', 'D'] and dept:
        dept_norm = normalize_department(dept)
        return f"{dept_norm}-{s}"
        
    return s

def normalize_year(year):
    """
    Normalizes academic year representation to a single integer string.
    Examples:
    '3', '3rd Year', 'Year 3', 'Third Year' -> '3'
    '2', '2nd Year', 'Year 2' -> '2'
    """
    if not year:
        return '1'
    y = str(year).strip()
    match = re.search(r'\d+', y)
    if match:
        return match.group(0)
    
    word_map = {'FIRST': '1', 'SECOND': '2', 'THIRD': '3', 'FOURTH': '4', 'FINAL': '4'}
    for word, digit in word_map.items():
        if word in y.upper():
            return digit
    return '1'

def normalize_semester(sem):
    """
    Normalizes semester representation to a single integer string.
    Examples:
    '1', '1st Semester', 'Sem 1', 'Semester 1' -> '1'
    '2', '2nd Semester', 'Sem 2', 'Semester 2' -> '2'
    """
    if not sem:
        return '1'
    s = str(sem).strip()
    match = re.search(r'\d+', s)
    if match:
        return match.group(0)
        
    word_map = {'FIRST': '1', 'SECOND': '2'}
    for word, digit in word_map.items():
        if word in s.upper():
            return digit
    return '1'

def matches_target_criteria(student, exam_or_target):
    """
    Authoritatively checks if a student's profile matches an examination's target criteria.
    Derives student eligibility dynamically using normalized comparisons.
    """
    if not student:
        return False
        
    role = getattr(student, 'role', '')
    if role != 'student':
        return False
        
    s_dept = normalize_department(getattr(student, 'department', ''))
    s_sec = normalize_section(getattr(student, 'section', ''), s_dept)
    s_yr = normalize_year(getattr(student, 'year', ''))
    s_sem = normalize_semester(getattr(student, 'semester', ''))
    
    t_dept = normalize_department(getattr(exam_or_target, 'department', ''))
    t_sec = normalize_section(getattr(exam_or_target, 'section', ''), t_dept)
    t_yr = normalize_year(getattr(exam_or_target, 'year', ''))
    t_sem = normalize_semester(getattr(exam_or_target, 'semester', ''))
    
    return (s_dept == t_dept and 
            s_sec == t_sec and 
            s_yr == t_yr and 
            s_sem == t_sem)
