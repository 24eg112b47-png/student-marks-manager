INSERT INTO students (roll_no, name, maths, java, dbms, attendance, total, percentage, grade, result, attendance_status)
VALUES
    ('ST-1042', 'Amina Rahman', 96, 91, 94, 97, 281, 93.67, 'A', 'PASS', 'OK'),
    ('ST-1038', 'Ravi Menon', 78, 84, 80, 82, 242, 80.67, 'B', 'PASS', 'OK'),
    ('ST-1029', 'Maya Patel', 66, 72, 70, 68, 208, 69.33, 'D', 'PASS', 'WARNING'),
    ('ST-1014', 'Omar Hassan', 39, 55, 48, 91, 142, 47.33, 'F', 'FAIL', 'OK')
ON CONFLICT (roll_no) DO NOTHING;