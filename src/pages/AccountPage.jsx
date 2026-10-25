import { useState } from 'react';
import { Lock, Eye, EyeOff, User, ShieldCheck, Moon, Globe, ChevronRight, KeyRound } from 'lucide-react';
import { useTheme } from '../lib/theme.jsx';
import { useAuth } from '../lib/auth.jsx';
import { changeOwnPassword } from '../lib/api';
import toast from 'react-hot-toast';

function checkPolicy(pw) {
  const issues = [];
  if (pw.length < 8) issues.push('At least 8 characters');
  if (!/[A-Z]/.test(pw)) issues.push('One uppercase letter');
  if (!/[a-z]/.test(pw)) issues.push('One lowercase letter');
  if (!/\d/.test(pw)) issues.push('One digit');
  if (!/[^A-Za-z0-9]/.test(pw)) issues.push('One special character');
  return issues;
}

export default function AccountPage() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const [section, setSection] = useState('personal');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const issues = checkPolicy(next);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!current) { toast.error('Enter your current password'); return; }
    if (issues.length > 0) { toast.error('New password does not meet the requirements below'); return; }
    if (next !== confirm) { toast.error('Passwords do not match'); return; }

    setLoading(true);
    try {
      await changeOwnPassword(current, next);
      toast.success('Password changed');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not change password');
    } finally { setLoading(false); }
  };

  const input = { width: '100%', padding: '11px 14px 11px 40px', fontSize: 14 };
  const name = user?.fullName || user?.email || 'Staff';
  const role = user?.roleName || { ADMIN: 'Administrator', OPS: 'Operations', FINANCE: 'Finance', COMPLIANCE: 'Compliance' }[user?.role] || user?.role;
  const Row = ({ id, icon: Icon, label, right }) => (
    <button onClick={() => id && setSection(id)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 4px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text)', cursor: id ? 'pointer' : 'default', fontSize: 13.5, fontFamily: 'var(--font)', textAlign: 'left' }}>
      <Icon size={17} color={section === id ? 'var(--blue)' : 'var(--text-2)'} />
      <span style={{ flex: 1, fontWeight: section === id ? 600 : 500, color: section === id ? 'var(--blue)' : 'var(--text)' }}>{label}</span>
      {right || <ChevronRight size={16} color="var(--text-2)" />}
    </button>
  );

  return (
    <div className="op-page">
      <div className="op-page-head"><h1>Profile</h1></div>
      <div className="op-split">
        <div className="card" style={{ textAlign: 'center', padding: 28 }}>
          <div className="op-avatar" style={{ width: 84, height: 84, fontSize: 32, margin: '0 auto 14px' }}>{name[0]?.toUpperCase()}</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{role}</div>
          <div style={{ fontSize: 13, color: 'var(--blue)', marginTop: 8 }}>{user?.email}</div>
          <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => setSection('security')}><KeyRound size={14} /> Change Password</button>
          {Array.isArray(user?.permissions) && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-2)' }}>
              <span>Permissions</span><b style={{ color: 'var(--text)' }}>{user.permissions.length}</b>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          <div className="card" style={{ paddingTop: 8, paddingBottom: 8 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, padding: '10px 4px 6px' }}>Account Settings</h2>
            <Row id="personal" icon={User} label="Personal Information" />
            <Row id="security" icon={ShieldCheck} label="Security Settings" />
            <Row icon={Moon} label="Theme" right={<span onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'var(--text-2)', fontSize: 12.5 }}>Dark Mode <span className={`op-switch${dark ? ' on' : ''}`} style={{ background: dark ? 'var(--blue)' : 'var(--border)' }} /></span>} />
            <Row icon={Globe} label="Language" right={<span style={{ color: 'var(--text-2)', fontSize: 12.5 }}>English</span>} />
          </div>

          {section === 'personal' && (
            <div className="card">
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Personal Information</h2>
              <dl className="op-kv">
                <dt>Name</dt><dd>{name}</dd>
                <dt>Email</dt><dd>{user?.email || '—'}</dd>
                <dt>Role</dt><dd>{role}</dd>
              </dl>
            </div>
          )}

          {section === 'security' && (
            <div className="card">
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Change Password</h2>
              <form onSubmit={handleSubmit} style={{ maxWidth: 440 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Current Password</label>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)' }} />
                  <input type="password" value={current} onChange={e => setCurrent(e.target.value)} style={input} />
                </div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>New Password</label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)' }} />
                  <input type={show ? 'text' : 'password'} value={next} onChange={e => setNext(e.target.value)} style={{ ...input, paddingRight: 40 }} />
                  <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: 0 }}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Confirm New Password</label>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)' }} />
                  <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} style={input} />
                </div>
                {next && (
                  <ul style={{ fontSize: 12, margin: '0 0 18px', paddingLeft: 18 }}>
                    {['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One digit', 'One special character'].map(rule => (
                      <li key={rule} style={{ color: issues.includes(rule) ? 'var(--red)' : 'var(--green)' }}>{rule}</li>
                    ))}
                  </ul>
                )}
                <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Saving…' : 'Change Password'}</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
