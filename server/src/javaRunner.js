const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../..');
const sourcePath = path.join(projectRoot, 'java/src/StudentCalculator.java');
const buildPath = path.join(projectRoot, 'java/build');
const classPath = path.join(buildPath, 'StudentCalculator.class');

function ensureCompiled() {
  const sourceTime = fs.statSync(sourcePath).mtimeMs;
  if (fs.existsSync(classPath) && fs.statSync(classPath).mtimeMs >= sourceTime) return;

  fs.mkdirSync(buildPath, { recursive: true });
  const result = spawnSync('javac', ['-d', buildPath, sourcePath], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || 'Could not compile the Java marks calculator.');
  }
}

function calculateMarks(values) {
  ensureCompiled();
  return new Promise((resolve, reject) => {
    const process = spawn('java', ['-cp', buildPath, 'StudentCalculator']);
    let output = '';
    let errorOutput = '';
    const timeout = setTimeout(() => process.kill(), 5000);
    process.stdout.setEncoding('utf8');
    process.stderr.setEncoding('utf8');
    process.stdout.on('data', (chunk) => { output += chunk; });
    process.stderr.on('data', (chunk) => { errorOutput += chunk; });
    process.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    process.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(errorOutput.trim() || 'The Java marks calculator failed.'));
        return;
      }
      try {
        resolve(JSON.parse(output));
      } catch {
        reject(new Error('The Java marks calculator returned invalid JSON.'));
      }
    });
    process.stdin.end(JSON.stringify({
      maths: values.maths,
      java: values.java,
      dbms: values.dbms,
      attendance: values.attendance,
    }));
  });
}

module.exports = { calculateMarks };