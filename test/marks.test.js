const assert = require('node:assert/strict');
const { test } = require('node:test');
const { calculateMarks } = require('../server/src/javaRunner');
const { validateStudent } = require('../server/src/validation');

const validStudent = {
  roll_no: 'st-1001',
  name: 'Taylor Student',
  maths: 40,
  java: 40,
  dbms: 40,
  attendance: 75,
};

test('normalizes roll numbers and accepts inclusive score boundaries', () => {
  const student = validateStudent({ ...validStudent, maths: 0, java: 100, attendance: 100 });
  assert.equal(student.roll_no, 'ST-1001');
  assert.equal(student.maths, 0);
  assert.equal(student.java, 100);
  assert.equal(student.attendance, 100);
});

test('rejects missing names, out-of-range marks and excess attendance precision', () => {
  assert.throws(() => validateStudent({ ...validStudent, name: '  ' }), /Name is required/);
  assert.throws(() => validateStudent({ ...validStudent, maths: 101 }), /whole number from 0 to 100/);
  assert.throws(() => validateStudent({ ...validStudent, attendance: 75.123 }), /up to two decimal places/);
});

test('matches the documented sample calculation', async () => {
  const result = await calculateMarks({ maths: 80, java: 90, dbms: 70, attendance: 88 });
  assert.deepEqual(result, {
    total: 240,
    percentage: 80,
    grade: 'B',
    result: 'PASS',
    attendance_status: 'OK',
  });
});

test('applies grade boundaries to the rounded percentage', async () => {
  const cases = [
    [270, 'A'],
    [269, 'B'],
    [240, 'B'],
    [239, 'C'],
    [210, 'C'],
    [209, 'D'],
    [180, 'D'],
    [179, 'F'],
  ];

  for (const [total, grade] of cases) {
    const maths = Math.floor(total / 3);
    const result = await calculateMarks({ maths, java: maths, dbms: total - (maths * 2), attendance: 90 });
    assert.equal(result.grade, grade, `total ${total}`);
  }
});

test('requires every subject to reach 40 and flags attendance below 75', async () => {
  const failed = await calculateMarks({ maths: 39, java: 100, dbms: 100, attendance: 90 });
  const warning = await calculateMarks({ maths: 40, java: 40, dbms: 40, attendance: 74.99 });
  const atThreshold = await calculateMarks({ maths: 40, java: 40, dbms: 40, attendance: 75 });
  assert.equal(failed.result, 'FAIL');
  assert.equal(warning.result, 'PASS');
  assert.equal(warning.attendance_status, 'WARNING');
  assert.equal(atThreshold.attendance_status, 'OK');
});