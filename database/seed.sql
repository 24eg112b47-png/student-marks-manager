WITH demo_teacher AS (
    INSERT INTO teachers (name, email, password_hash)
    VALUES (
        'Professor Demo',
        'demo.teacher@example.com',
        'ef2247ed07ecefa978caddc8c9991cab:4802781fb37be87aacf953b0f0ff1281177098ccf28f6e17d7025b061b79a7aaa2286f88db1f0685a1ebfda7cc13c96af508a3360803f5f73a3e9b7e82f8791e'
    )
    ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            password_hash = EXCLUDED.password_hash
    RETURNING id
)
INSERT INTO students (
    teacher_id, roll_no, name, maths, java, dbms, attendance,
    total, percentage, grade, result, attendance_status
)
SELECT demo_teacher.id, sample.roll_no, sample.name, sample.maths, sample.java, sample.dbms,
       sample.attendance, sample.total, sample.percentage, sample.grade, sample.result,
       sample.attendance_status
FROM demo_teacher
CROSS JOIN (VALUES
    ('DEMO-1001', 'Taylor Green', 80, 90, 70, 88.00, 240, 80.00, 'B', 'PASS', 'OK'),
    ('DEMO-1002', 'Jordan Lee', 39, 80, 90, 90.00, 209, 69.67, 'D', 'FAIL', 'OK'),
    ('DEMO-1003', 'Morgan Chen', 90, 90, 90, 74.00, 270, 90.00, 'A', 'PASS', 'WARNING'),
    ('DEMO-1004', 'Alex Rivera', 66, 72, 70, 68.00, 208, 69.33, 'D', 'PASS', 'WARNING')
) AS sample(roll_no, name, maths, java, dbms, attendance, total, percentage, grade, result, attendance_status)
ON CONFLICT (teacher_id, roll_no) DO UPDATE SET
    name = EXCLUDED.name,
    maths = EXCLUDED.maths,
    java = EXCLUDED.java,
    dbms = EXCLUDED.dbms,
    attendance = EXCLUDED.attendance,
    total = EXCLUDED.total,
    percentage = EXCLUDED.percentage,
    grade = EXCLUDED.grade,
    result = EXCLUDED.result,
    attendance_status = EXCLUDED.attendance_status;
