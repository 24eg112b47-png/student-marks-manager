DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM teachers WHERE email = '24eg112b47@anurag.edu.in'
    ) THEN
        RAISE EXCEPTION 'Register 24eg112b47@anurag.edu.in in the app with the private teacher invite code before loading demo students.';
    END IF;
END;
$$;

INSERT INTO students (
    teacher_id, roll_no, name, maths, java, dbms, attendance,
    total, percentage, grade, result, attendance_status
)
SELECT teacher.id, sample.roll_no, sample.name, sample.maths, sample.java, sample.dbms,
       sample.attendance, sample.total, sample.percentage, sample.grade, sample.result,
       sample.attendance_status
FROM teachers AS teacher
CROSS JOIN (VALUES
    ('DEMO-1001', 'Taylor Green', 80, 90, 70, 88.00, 240, 80.00, 'B', 'PASS', 'OK'),
    ('DEMO-1002', 'Jordan Lee', 39, 80, 90, 90.00, 209, 69.67, 'D', 'FAIL', 'OK'),
    ('DEMO-1003', 'Morgan Chen', 90, 90, 90, 74.00, 270, 90.00, 'A', 'PASS', 'WARNING'),
    ('DEMO-1004', 'Alex Rivera', 66, 72, 70, 68.00, 208, 69.33, 'D', 'PASS', 'WARNING')
) AS sample(roll_no, name, maths, java, dbms, attendance, total, percentage, grade, result, attendance_status)
WHERE teacher.email = '24eg112b47@anurag.edu.in'
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
