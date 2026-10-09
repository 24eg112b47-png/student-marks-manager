const {
  createHmac,
  createHash,
  randomBytes,
  scrypt: scryptCallback,
  timingSafeEqual,
} = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(scryptCallback);
const sessionCookieName = 'smm_session';
const sessionDurationSeconds = 60 * 60 * 24 * 7;

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  const [saltHex, keyHex] = String(storedHash).split(':');
  if (!/^[a-f0-9]{32}$/.test(saltHex || '') || !/^[a-f0-9]{128}$/.test(keyHex || '')) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

function createSessionToken(teacherId, secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    teacherId,
    sessionId: randomBytes(16).toString('base64url'),
    expiresAt: Math.floor(now / 1000) + sessionDurationSeconds,
  })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function sessionExpiryDate(now = Date.now()) {
  return new Date(now + sessionDurationSeconds * 1000);
}

function readSessionTeacherId(token, secret, now = Date.now()) {
  if (typeof token !== 'string') return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !safeEqual(
    signature,
    createHmac('sha256', secret).update(payload).digest('base64url'),
  )) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isSafeInteger(session.teacherId) || session.teacherId < 1
        || typeof session.sessionId !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(session.sessionId)
        || !Number.isInteger(session.expiresAt) || session.expiresAt <= Math.floor(now / 1000)) return null;
    return session.teacherId;
  } catch {
    return null;
  }
}

function getCookie(request, name) {
  const cookies = String(request.headers.cookie || '').split(';');
  for (const cookie of cookies) {
    const separator = cookie.indexOf('=');
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(cookie.slice(separator + 1).trim());
  }
  return null;
}

function sessionCookie(token, secure) {
  return `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionDurationSeconds}${secure ? '; Secure' : ''}`;
}

function clearSessionCookie(secure) {
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

function isUniversityEmail(email) {
  return /^[^\s@]+@anurag\.edu\.in$/i.test(email);
}

module.exports = {
  clearSessionCookie,
  createSessionToken,
  getCookie,
  hashSessionToken,
  hashPassword,
  isUniversityEmail,
  readSessionTeacherId,
  safeEqual,
  sessionCookie,
  sessionCookieName,
  sessionExpiryDate,
  verifyPassword,
};
