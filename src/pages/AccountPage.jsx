import { useState } from 'react';
import { Lock, Eye, EyeOff, User } from 'lucide-react';
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

  return (
    <div style={{ padding: 32, maxWidth: 480 }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
        <User size={22} /> Account
      </h1>
      <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 28 }}>
        {user?.fullName} · {user?.email} · <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{user?.role}</span>
      </p>

      <div className="card" style={{ padding: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Change Password</h2>
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Current Password</label>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)' }} />
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)}
              style={{ width: '100%', padding: '11px 14px 11px 40px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>New Password</label>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)' }} />
            <input type={show ? 'text' : 'password'} value={next} onChange={e => setNext(e.target.value)}
              style={{ width: '100%', padding: '11px 40px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: 0 }}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Confirm New Password</label>
          <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
            style={{ width: '100%', padding: '11px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />

          {next && (
            <ul style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 20px', paddingLeft: 18 }}>
              {['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One digit', 'One special character'].map(rule => (
                <li key={rule} style={{ color: issues.includes(rule) ? 'var(--red)' : 'var(--green)' }}>{rule}</li>
              ))}
            </ul>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '12px' }}>
            {loading ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
