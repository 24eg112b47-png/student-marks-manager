import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  BookOpenCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Eye,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Plus,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';

const subjectKeys = ['maths', 'java', 'dbms'];
const blankForm = {
  roll_no: '',
  name: '',
  maths: '',
  java: '',
  dbms: '',
  attendance: '',
};

const terms = ['Autumn term · Semester 1', 'Spring term · Semester 2', 'Summer term'];
const pageSize = 8;

function formatNumber(value, digits = 1) {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function resultLabel(result) {
  return result === 'PASS' ? 'Passed' : 'Needs review';
}

async function request(path, options) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Could not complete that request.');
  }
  return response.status === 204 ? null : response.json();
}

function StatCard({ icon: Icon, label, value, note, tone, subValue }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={18} strokeWidth={1.8} /></div>
      <span className="stat-label">{label}</span>
      <div className="stat-value-line">
        <strong className="stat-value">{value}</strong>
        {subValue && <span className="stat-subvalue">{subValue}</span>}
      </div>
      <span className="stat-note">{note}</span>
    </article>
  );
}

function ScoreMeter({ value }) {
  const fill = value < 40 ? 'meter-fill meter-danger' : value >= 80 ? 'meter-fill meter-strong' : 'meter-fill';
  return (
    <span className="score-cell">
      <span className="score-track"><span className={fill} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></span>
      <span className="score-number">{value}</span>
    </span>
  );
}

function StudentDialog({ student, onClose, onSaved }) {
  const editing = Boolean(student);
  const [form, setForm] = useState(student ? {
    roll_no: student.roll_no,
    name: student.name,
    maths: String(student.maths),
    java: String(student.java),
    dbms: String(student.dbms),
    attendance: String(student.attendance),
  } : blankForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        roll_no: form.roll_no,
        name: form.name,
        maths: Number(form.maths),
        java: Number(form.java),
        dbms: Number(form.dbms),
        attendance: Number(form.attendance),
      };
      const saved = await request(editing ? `/api/students/${student.id}` : '/api/students', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      onSaved(saved, editing);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <header className="dialog-head">
          <div>
            <p className="eyebrow">STUDENT RECORD</p>
            <h2 id="dialog-title">{editing ? 'Edit student' : 'Add a student'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </header>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field field-wide">
              <span>Full name</span>
              <input autoFocus required maxLength="100" value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Amina Rahman" />
            </label>
            <label className="field">
              <span>Roll number</span>
              <input required maxLength="20" value={form.roll_no} onChange={(event) => update('roll_no', event.target.value)} placeholder="e.g. ST-1042" />
            </label>
            <label className="field">
              <span>Attendance <small>%</small></span>
              <input required type="number" min="0" max="100" step="0.01" value={form.attendance} onChange={(event) => update('attendance', event.target.value)} placeholder="0–100" />
            </label>
            <div className="form-divider"><span>SUBJECT MARKS</span><span>OUT OF 100</span></div>
            {subjectKeys.map((subject) => (
              <label className="field" key={subject}>
                <span>{subject.toUpperCase()}</span>
                <input required type="number" min="0" max="100" step="1" value={form[subject]} onChange={(event) => update(subject, event.target.value)} placeholder="0–100" />
              </label>
            ))}
          </div>
          {error && <p className="form-error" role="alert"><AlertTriangle size={15} />{error}</p>}
          <footer className="dialog-actions">
            <button type="button" className="button button-quiet" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : <><Plus size={16} />Add student</>}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', invite_code: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const registering = mode === 'register';

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await request(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onAuthenticated(result.teacher);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setForm({ name: '', email: '', password: '', invite_code: '' });
    setError('');
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="brand-mark auth-brand"><BookOpenCheck size={21} /></span>
        <p className="eyebrow">ANURAG UNIVERSITY · TEACHER WORKSPACE</p>
        <h1>{registering ? 'Create your teacher account.' : 'Welcome back.'}</h1>
        <p className="auth-description">Sign in to manage your own student class records.</p>
        <form onSubmit={submit} className="auth-form">
          {registering && <label className="field"><span>Full name</span><input required maxLength="100" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
          <label className="field"><span>University email</span><input required type="email" autoComplete="username" pattern=".+@anurag\.edu\.in" title="Use your @anurag.edu.in address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@anurag.edu.in" /></label>
          <label className="field"><span>Password {registering && <small>(12 characters minimum)</small>}</span><input required type="password" minLength="12" maxLength="128" autoComplete={registering ? 'new-password' : 'current-password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
          {registering && <label className="field"><span>Teacher invite code</span><input required autoComplete="off" value={form.invite_code} onChange={(event) => setForm({ ...form, invite_code: event.target.value })} /></label>}
          {error && <p className="form-error" role="alert"><AlertTriangle size={15} />{error}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={saving}>{saving ? 'Please wait…' : registering ? 'Create teacher account' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">{registering ? 'Already have an account?' : 'New teacher?'} <button type="button" onClick={() => changeMode(registering ? 'login' : 'register')}>{registering ? 'Sign in' : 'Register with invite code'}</button></p>
        <p className="auth-note">Registration requires an @anurag.edu.in email address and a teacher invite code.</p>
      </section>
    </main>
  );
}

function StudentResultDialog({ student, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dialog result-dialog" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <header className="dialog-head"><div><p className="eyebrow">CALCULATED RESULT · {student.roll_no}</p><h2 id="result-title">{student.name}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close result"><X size={18} /></button></header>
        <div className="result-grid">
          <div><span>Total</span><strong>{student.total} / 300</strong></div>
          <div><span>Percentage</span><strong>{formatNumber(student.percentage, 2)}%</strong></div>
          <div><span>Grade</span><strong>{student.grade}</strong></div>
          <div><span>Result</span><strong>{resultLabel(student.result)}</strong></div>
          <div><span>Attendance</span><strong>{formatNumber(student.attendance, 2)}% · {student.attendance_status}</strong></div>
        </div>
        <footer className="dialog-actions"><button className="button button-primary" onClick={onClose}>Done</button></footer>
      </section>
    </div>
  );
}

function HelpDialog({ onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dialog help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <header className="dialog-head"><div><p className="eyebrow">QUICK GUIDE</p><h2 id="help-title">Using the class register</h2></div><button className="icon-button" onClick={onClose} aria-label="Close help"><X size={18} /></button></header>
        <ul className="help-list">
          <li><strong>Add a student</strong><span>Enter a unique roll number, marks from 0–100, and attendance. Results are calculated automatically.</span></li>
          <li><strong>Find and review records</strong><span>Search by name or roll number, filter by result, and use the eye icon to view a full result.</span></li>
          <li><strong>Manage your class</strong><span>Edit or remove records with the row actions. CSV export downloads all records matching your search and result filter.</span></li>
          <li><strong>Teacher accounts</strong><span>Each signed-in teacher can access only the records created in their account. The selected term changes the dashboard label; records are not yet grouped by semester.</span></li>
        </ul>
        <footer className="dialog-actions"><button className="button button-primary" onClick={onClose}>Got it</button></footer>
      </section>
    </div>
  );
}

export default function App() {
  const [teacher, setTeacher] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ student_count: 0, average_percentage: 0, average_attendance: 0 });
  const [storage, setStorage] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [dialogStudent, setDialogStudent] = useState(undefined);
  const [resultStudent, setResultStudent] = useState(null);
  const [deleteStudent, setDeleteStudent] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [term, setTerm] = useState(() => {
    const savedTerm = window.localStorage.getItem('student-marks-term');
    return terms.includes(savedTerm) ? savedTerm : terms[0];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const today = new Date();
  const dateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: '2-digit' }).format(today);
  const dateEyebrow = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(today).toUpperCase();

  useEffect(() => {
    request('/api/auth/me')
      .then((result) => setTeacher(result.teacher))
      .catch((authError) => setError(authError.message))
      .finally(() => setAuthChecking(false));
  }, []);

  async function loadData(query = search) {
    if (!teacher) return;
    try {
      const [records, summary, health] = await Promise.all([
        request(`/api/students?search=${encodeURIComponent(query)}`),
        request('/api/stats'),
        request('/api/health'),
      ]);
      setStudents(records);
      setStats(summary);
      setStorage(health.storage);
      setError('');
    } catch (loadError) {
      if (loadError.message.includes('sign in')) {
        setTeacher(null);
      } else {
        setError(loadError.message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!teacher) return undefined;
    const timer = window.setTimeout(() => { loadData(search); }, 180);
    return () => window.clearTimeout(timer);
  }, [search, teacher]);

  useEffect(() => {
    if (!teacher) return undefined;
    const onFocus = () => loadData(search);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [search, teacher]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const visibleStudents = students.filter((student) => filter === 'ALL' || student.result === filter);
  const pageCount = Math.max(1, Math.ceil(visibleStudents.length / pageSize));
  const pageStudents = visibleStudents.slice((page - 1) * pageSize, page * pageSize);
  const passedCount = Number(stats.pass_count || 0);
  const attendanceWarnings = Number(stats.warning_count || 0);
  const passRate = stats.student_count ? Math.round((passedCount / stats.student_count) * 100) : 0;
  const sortedSubjects = subjectKeys.map((subject) => ({
    subject: subject.toUpperCase(),
    average: Number(stats.subject_averages?.[subject] || 0),
  }));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  function saveStudent(saved, editing) {
    setStudents((current) => editing
      ? current.map((student) => student.id === saved.id ? saved : student)
      : [saved, ...current]);
    setDialogStudent(undefined);
    setNotice(editing ? 'Student record updated.' : 'Student added to the register.');
    loadData(search);
  }

  async function logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
      setTeacher(null);
      setStudents([]);
      setStats({ student_count: 0, average_percentage: 0, average_attendance: 0 });
      setPage(1);
    } catch (logoutError) {
      setError(logoutError.message);
    }
  }

  function selectTerm(value) {
    setTerm(value);
    window.localStorage.setItem('student-marks-term', value);
  }

  async function removeStudent() {
    try {
      await request(`/api/students/${deleteStudent.id}`, { method: 'DELETE' });
      setDeleteStudent(null);
      setNotice(`${deleteStudent.name} was removed.`);
      await loadData(search);
    } catch (removeError) {
      setError(removeError.message);
      setDeleteStudent(null);
    }
  }

  function exportCsv() {
    const columns = ['roll_no', 'name', ...subjectKeys, 'attendance', 'total', 'percentage', 'grade', 'result', 'attendance_status'];
    const rows = [columns.join(','), ...visibleStudents.map((student) => columns.map((column) => {
      let value = String(student[column] ?? '');
      if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`;
      return `"${value.replaceAll('"', '""')}"`;
    }).join(','))];
    const url = URL.createObjectURL(new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'student-marks.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(`${visibleStudents.length} records exported.`);
  }

  if (authChecking) {
    return <main className="auth-page"><p className="auth-loading">Checking your teacher session…</p></main>;
  }
  if (!teacher) return <AuthScreen onAuthenticated={setTeacher} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Fieldnotes home">
          <span className="brand-mark"><BookOpenCheck size={20} strokeWidth={1.8} /></span>
          <span className="brand-copy"><strong>fieldnotes</strong><small>ACADEMIC OFFICE</small></span>
        </a>
        <div className="sidebar-group-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-link nav-active" href="#overview"><LayoutDashboard size={17} />Overview<span className="nav-indicator" /></a>
          <a className="nav-link" href="#student-records"><UsersRound size={17} />Students<span className="nav-count">{stats.student_count}</span></a>
        </nav>
        <div className="sidebar-bottom">
          <label className="term-card">
            <span className="term-mark"><Sparkles size={16} /></span>
            <select value={term} onChange={(event) => selectTerm(event.target.value)} aria-label="Select displayed academic term">
              {terms.map((item) => <option key={item}>{item}</option>)}
            </select>
            <ChevronDown size={15} />
          </label>
          <div className="profile-row">
            <span className="profile-avatar">{teacher.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
            <span className="profile-copy"><strong>{teacher.name}</strong><small>{teacher.email}</small></span>
            <button className="icon-button profile-action" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <main className="main-panel" id="overview">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>Overview</strong></div>
          <div className="topbar-right">
            <span className={`storage-tag ${storage === 'neon-postgres' ? 'storage-live' : ''}`}><span className="status-dot" />{storage === 'neon-postgres' ? 'NEON CONNECTED' : storage === 'demo-memory' ? 'DEMO MODE' : 'CONNECTING'}</span>
            <button className="icon-button topbar-help" onClick={() => setShowHelp(true)} aria-label="Open help" title="Help"><CircleHelp size={16} /></button>
            <span className="topbar-date"><Clock3 size={14} />{dateLabel}</span>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">{dateEyebrow} <span className="eyebrow-dot">/</span> {term.toUpperCase()}</p>
              <h1>Student overview<span className="title-period">.</span></h1>
              <p className="welcome-subtitle">A clear view of class progress, one record at a time.</p>
            </div>
            <button className="button button-primary add-main" onClick={() => setDialogStudent(null)}><Plus size={17} />New student</button>
          </section>

          {error && <div className="error-banner" role="alert"><AlertTriangle size={16} /><span>{error}</span><button onClick={() => loadData(search)}>Retry</button></div>}

          <section className="stats-grid" aria-label="Class summary">
            <StatCard icon={UsersRound} label="ENROLLED STUDENTS" value={stats.student_count} note="Across the current class" tone="stat-lime" />
            <StatCard icon={BookOpenCheck} label="CLASS AVERAGE" value={`${formatNumber(stats.average_percentage)}%`} note="Mean of overall percentage" tone="stat-coral" />
            <StatCard icon={Check} label="PASS RATE" value={`${passRate}%`} note={`${passedCount} students passing`} tone="stat-sky" />
            <StatCard icon={AlertTriangle} label="ATTENDANCE WATCH" value={attendanceWarnings} note="Below the 75% threshold" tone="stat-yellow" />
          </section>

          <section className="content-grid">
            <section className="records-panel" id="student-records">
              <div className="section-heading">
                <div><p className="eyebrow">CLASS REGISTER</p><h2>Student records <span className="heading-count">{visibleStudents.length}</span></h2></div>
                <button className="button button-outline export-button" onClick={exportCsv} disabled={!visibleStudents.length}><ArrowDownToLine size={16} />Export CSV</button>
              </div>
              <div className="table-toolbar">
                <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search name or roll no." aria-label="Search students" />{search && <button onClick={() => { setPage(1); setSearch(''); }} aria-label="Clear search"><X size={14} /></button>}</label>
                <div className="filter-group" role="group" aria-label="Filter by result">
                  {[['ALL', 'All'], ['PASS', 'Passed'], ['FAIL', 'Review']].map(([key, label]) => <button key={key} className={filter === key ? 'filter-chip filter-selected' : 'filter-chip'} onClick={() => { setPage(1); setFilter(key); }}>{label}</button>)}
                </div>
              </div>
              <div className="table-scroll">
                <table className="student-table">
                  <thead><tr><th>STUDENT</th><th>MATHS</th><th>JAVA</th><th>DBMS</th><th>ATTEND.</th><th>OVERALL</th><th>RESULT</th><th aria-label="Actions" /></tr></thead>
                  <tbody>
                    {loading ? <tr><td colSpan="8" className="empty-state">Loading student records…</td></tr> : visibleStudents.length ? pageStudents.map((student) => (
                      <tr key={student.id}>
                        <td><div className="student-identity"><span className={`student-avatar avatar-${student.id % 5}`}>{student.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span><strong>{student.name}</strong><small>{student.roll_no}</small></span></div></td>
                        <td><ScoreMeter value={student.maths} /></td>
                        <td><ScoreMeter value={student.java} /></td>
                        <td><ScoreMeter value={student.dbms} /></td>
                        <td><span className={student.attendance_status === 'WARNING' ? 'attendance-value attendance-low' : 'attendance-value'}>{formatNumber(student.attendance, 0)}%{student.attendance_status === 'WARNING' && <AlertTriangle size={12} />}</span></td>
                        <td><span className="overall-value">{formatNumber(student.percentage)}%</span><span className={`grade-badge grade-${student.grade.toLowerCase()}`}>{student.grade}</span></td>
                        <td><span className={student.result === 'PASS' ? 'result-pill result-pass' : 'result-pill result-review'}><span />{resultLabel(student.result)}</span></td>
                        <td><div className="row-actions"><button className="icon-button row-result" onClick={() => setResultStudent(student)} aria-label={`View result for ${student.name}`} title="View result"><Eye size={15} /></button><button className="icon-button row-edit" onClick={() => setDialogStudent(student)} aria-label={`Edit ${student.name}`} title="Edit student"><Pencil size={15} /></button><button className="icon-button row-delete" onClick={() => setDeleteStudent(student)} aria-label={`Delete ${student.name}`} title="Delete student"><Trash2 size={15} /></button></div></td>
                      </tr>
                    )) : <tr><td colSpan="8" className="empty-state">{search ? 'No students match this search.' : 'No students in this view yet.'}</td></tr>}
                  </tbody>
                </table>
              </div>
              <footer className="table-footer"><span>Showing <strong>{visibleStudents.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, visibleStudents.length)}</strong> of <strong>{visibleStudents.length}</strong> matching records</span><div className="pagination"><button className="icon-button" aria-label="Previous page" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}><ChevronLeft size={16} /></button><span>Page {page} of {pageCount}</span><button className="icon-button" aria-label="Next page" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount}><ChevronRight size={16} /></button></div></footer>
            </section>

            <aside className="insights-panel">
              <div className="insights-head"><div><p className="eyebrow">AT A GLANCE</p><h2>Class pulse</h2></div><span className="pulse-icon"><Sparkles size={16} /></span></div>
              <div className="pulse-stat"><div><span>Average attendance</span><strong>{formatNumber(stats.average_attendance)}<small>%</small></strong></div><div className="attendance-ring" style={{ '--progress': `${Math.max(0, Math.min(100, Number(stats.average_attendance)))}%` }}><span>{Math.round(Number(stats.average_attendance || 0))}</span></div></div>
              <div className="attendance-scale"><span>0%</span><span>75% target</span><span>100%</span></div>
              <div className="insight-divider" />
              <div className="subject-heading"><span>SUBJECT AVERAGES</span><ArrowUpRight size={15} /></div>
              <div className="subject-list">
                {sortedSubjects.map(({ subject, average }, index) => <div className="subject-row" key={subject}><div className="subject-label"><span className={`subject-dot subject-dot-${index}`} />{subject}<strong>{formatNumber(average)}%</strong></div><div className="subject-track"><span className={`subject-fill subject-fill-${index}`} style={{ width: `${Math.max(0, Math.min(100, average))}%` }} /></div></div>)}
              </div>
              <div className="insight-callout"><span className="callout-icon"><GraduationCap size={16} /></span><span>{attendanceWarnings ? <><strong>{attendanceWarnings} student{attendanceWarnings === 1 ? '' : 's'}</strong> below the attendance target.</> : <>Attendance is <strong>on track</strong> across the class.</>}</span></div>
            </aside>
          </section>

          <footer className="page-footer"><span>FIELDNOTES <span className="footer-separator">/</span> ACADEMIC OFFICE</span><span>Marks out of 100 per subject <span className="footer-separator">·</span> Pass mark 40</span></footer>
        </div>
      </main>

      {dialogStudent !== undefined && <StudentDialog student={dialogStudent} onClose={() => setDialogStudent(undefined)} onSaved={saveStudent} />}
      {resultStudent && <StudentResultDialog student={resultStudent} onClose={() => setResultStudent(null)} />}
      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
      {deleteStudent && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteStudent(null); }}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><span className="confirm-icon"><Trash2 size={19} /></span><h2 id="delete-title">Remove this record?</h2><p><strong>{deleteStudent.name}</strong> ({deleteStudent.roll_no}) will be removed from the class register.</p><div className="dialog-actions"><button className="button button-quiet" onClick={() => setDeleteStudent(null)}>Keep record</button><button className="button button-danger" onClick={removeStudent}><Trash2 size={15} />Remove student</button></div></section></div>}
      {notice && <div className="toast" role="status"><span className="toast-check"><Check size={14} /></span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
    </div>
  );
}