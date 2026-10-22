import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { resetPassword, changeOwnPassword } from '../lib/api';
import { useAuth } from '../lib/auth.jsx';

// Mirrors the backend policy exactly (AuthService.validatePasswordPolicy) so
// the user gets the real reason before submitting, not just a rejected
// request.
function checkPolicy(pw) {
  const issues = [];
  if (pw.length < 8) issues.push('At least 8 characters');
  if (!/[A-Z]/.test(pw)) issues.push('One uppercase letter');
  if (!/[a-z]/.test(pw)) issues.push('One lowercase letter');
  if (!/\d/.test(pw)) issues.push('One digit');
  if (!/[^A-Za-z0-9]/.test(pw)) issues.push('One special character');
  return issues;
}

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const token = params.get('token');
  const forced = params.get('forced') === '1';
  // Forced change right after login (no email link): the signed-in user proves the current password
  // and changes it through /account/change-password, which also clears mustChangePassword.
  const signedInChange = forced && !token;
  const [current, setCurrent] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const issues = checkPolicy(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (issues.length > 0) { setError('Password does not meet the requirements below.'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    if (signedInChange && !current) { setError('Enter your current password.'); return; }
    if (!signedInChange && !token) { setError('Missing reset token. Use the link from your email.'); return; }

    setLoading(true);
    try {
      if (signedInChange) await changeOwnPassword(current, newPassword);
      else await resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => { logout(); navigate('/login', { replace: true }); }, 2000);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.response?.data?.message
        || (signedInChange ? 'Could not change the password.' : 'Could not reset password. The link may have expired.'));
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 420, width: '100%', padding: '40px 32px' }}>
        <img src="/images/brand/lockup.png" alt="Payport" style={{ height: 50, width: 'auto', display: 'block', margin: '0 auto 24px' }} />

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={40} color="var(--green)" style={{ marginBottom: 12 }} />
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>{signedInChange ? 'Password Changed' : 'Password Reset'}</h2>
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Redirecting you to sign in with your new password…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 6px', textAlign: 'center' }}>
              {forced ? 'Set a New Password' : 'Reset Your Password'}
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: 13.5, textAlign: 'center', margin: '0 0 24px' }}>
              {forced
                ? 'Your account requires a password change before continuing.'
                : 'Choose a new password for your account.'}
            </p>

            {error && (
              <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            {signedInChange && (
              <>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Current Password</label>
                <input
                  type={show ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)}
                  autoFocus autoComplete="current-password"
                  style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
                />
              </>
            )}

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>New Password</label>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)' }} />
              <input
                type={show ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                autoFocus={!signedInChange} autoComplete="new-password"
                style={{ width: '100%', padding: '12px 42px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: 0 }}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Confirm Password</label>
            <input
              type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />

            {newPassword && (
              <ul style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 20px', paddingLeft: 18 }}>
                {['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One digit', 'One special character'].map(rule => (
                  <li key={rule} style={{ color: issues.includes(rule) ? 'var(--red)' : 'var(--green)' }}>{rule}</li>
                ))}
              </ul>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', border: 'none', borderRadius: 10,
              background: `linear-gradient(135deg, var(--blue), var(--blue-dark))`, color: '#fff',
              fontWeight: 700, fontSize: 14, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Saving…' : 'Set New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
