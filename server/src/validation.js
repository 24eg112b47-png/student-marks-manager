const subjects = ['maths', 'java', 'dbms'];

function validateStudent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Provide student details as an object.');
  }

  const rollNo = typeof input.roll_no === 'string' ? input.roll_no.trim().toUpperCase() : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!rollNo || rollNo.length > 20) {
    throw new Error('Roll number is required and must be 20 characters or fewer.');
  }
  if (!name || name.length > 100) {
    throw new Error('Name is required and must be 100 characters or fewer.');
  }

  const values = { roll_no: rollNo, name };
  for (const subject of subjects) {
    const mark = input[subject];
    if (!Number.isInteger(mark) || mark < 0 || mark > 100) {
      throw new Error(`${subject.toUpperCase()} marks must be a whole number from 0 to 100.`);
    }
    values[subject] = mark;
  }

  const attendance = input.attendance;
  if (typeof attendance !== 'number' || !Number.isFinite(attendance) || attendance < 0 || attendance > 100
      || Math.abs(attendance * 100 - Math.round(attendance * 100)) > 0.000001) {
    throw new Error('Attendance must be a number from 0 to 100 with up to two decimal places.');
  }
  values.attendance = attendance;
  return values;
}

module.exports = { validateStudent };