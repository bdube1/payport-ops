import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useTheme } from '../lib/theme.jsx';
import { opsLogin, forgotPassword } from '../lib/api';
import { homeFor } from '../lib/permissions';

const REMEMBER_KEY = 'ops_remembered_email';

// Exact palette as given, ported 1:1. This page is deliberately self-contained
// -- it does NOT use the app's shared --bg/--blue/etc theme variables, so it
// can render pixel-exact colors regardless of what the rest of the app uses.
// `[data-page-theme]` (not `data-theme`) is the selector here specifically so
// it never collides with the app-wide theme attribute on <html>.
const LOGIN_CSS = `
.pp-login-scope {
  --bg-left-1: #C3D0F7; --bg-left-2: #E3E9FB; --bg-right: #FFFFFF;
  --ink: #171A2E; --muted: #5B5F79;
  --indigo: #3D52E8; --indigo-dark: #2A3BC7;
  --indigo-grad-1: #4257E8; --indigo-grad-2: #2A3BC7;
  --field-bg: #EEF0F6; --field-icon: #8085A0;
  --card-bg: #FFFFFF; --card-border: rgba(23,26,46,0.06);
  --badge-bg: #171A3D; --badge-text: #FFFFFF;
  --toggle-bg: #FFFFFF; --toggle-border: rgba(23,26,46,0.15);
  --deco-fill: rgba(255,255,255,0.5); --deco-border: rgba(255,255,255,0.6);
  font-family: 'Inter', sans-serif;
  color: var(--ink);
}
.pp-login-scope[data-page-theme="midnight"] {
  --bg-left-1: #0B1024; --bg-left-2: #0E1430; --bg-right: #05060F;
  --ink: #F2F3FA; --muted: #9498B8;
  --indigo: #4B5EED; --indigo-dark: #2A3BC7;
  --indigo-grad-1: #5164F2; --indigo-grad-2: #2A3BC7;
  --field-bg: #12162E; --field-icon: #6B6F93;
  --card-bg: rgba(20,24,50,0.6); --card-border: rgba(255,255,255,0.08);
  --badge-bg: #4345C7; --badge-text: #FFFFFF;
  --toggle-bg: #12162E; --toggle-border: rgba(255,255,255,0.15);
  --deco-fill: rgba(255,255,255,0.04); --deco-border: rgba(255,255,255,0.08);
}
.pp-login-scope .pp-wrap{ min-height:100vh; display:grid; grid-template-columns:1.18fr 1fr; border-top:4px solid var(--ink); transition:border-color .3s ease; }
.pp-login-scope[data-page-theme="midnight"] .pp-wrap{ border-top-color:#000; }
.pp-login-scope .pp-hero{ position:relative; background:linear-gradient(160deg, var(--bg-left-1), var(--bg-left-2)); overflow:hidden; padding:40px 48px; transition:background .3s ease; }
.pp-login-scope .pp-hero::before{ content:""; position:absolute; inset:0;
  background-image: linear-gradient(var(--deco-border) 1px, transparent 1px), linear-gradient(90deg, var(--deco-border) 1px, transparent 1px);
  background-size:60px 60px; opacity:.35; }
.pp-login-scope .pp-brand-row{ display:flex; align-items:center; gap:12px; position:relative; z-index:2; }
.pp-login-scope .pp-full-logo{ height:84px; width:auto; object-fit:contain; filter:drop-shadow(0 4px 10px rgba(20,25,60,0.18)); }
.pp-login-scope .pp-deco{ position:relative; height:420px; margin-top:20px; z-index:2; }
.pp-login-scope .pp-sq{ position:absolute; border-radius:16px; background:var(--deco-fill); border:1px solid var(--deco-border); }
.pp-login-scope .pp-sq1{ width:130px; height:110px; top:0; left:0; }
.pp-login-scope .pp-sq2{ width:150px; height:150px; top:90px; left:60px; }
.pp-login-scope .pp-sq3{ width:150px; height:190px; top:150px; left:250px; }
.pp-login-scope .pp-phone{ position:absolute; top:20px; left:135px; width:170px; height:270px; border-radius:26px; background:var(--card-bg); border:1px solid var(--card-border); box-shadow:0 20px 40px rgba(20,25,60,0.10); padding:18px; }
.pp-login-scope[data-page-theme="midnight"] .pp-phone{ background:rgba(20,24,50,0.75); }
.pp-login-scope .pp-avatar{ width:34px; height:34px; border-radius:50%; background:radial-gradient(circle at 35% 35%, #7FCBFF, #3D8FDB); flex-shrink:0; }
.pp-login-scope .pp-bar{ height:8px; border-radius:4px; background:var(--field-bg); margin-top:8px; }
.pp-login-scope .pp-dot-blue{ width:22px; height:22px; border-radius:50%; background:var(--indigo); flex-shrink:0; }
.pp-login-scope .pp-headline-card{ position:relative; z-index:3; background:var(--card-bg); border:1px solid var(--card-border); border-radius:20px; padding:30px 34px; max-width:460px; margin-top:-70px; box-shadow:0 20px 45px rgba(20,25,60,0.08); backdrop-filter:blur(10px); }
.pp-login-scope h1.pp-headline{ font-size:32px; font-weight:800; line-height:1.15; letter-spacing:-0.01em; margin:0 0 14px; color:var(--ink); }
.pp-login-scope .pp-headline-card p{ margin:0; font-size:14.5px; line-height:1.6; color:var(--muted); }
.pp-login-scope .pp-hero-foot{ position:relative; z-index:2; margin-top:36px; font-size:13px; color:var(--muted); }
.pp-login-scope .pp-panel{ background:var(--bg-right); display:flex; flex-direction:column; padding:40px 56px; transition:background .3s ease; }
.pp-login-scope .pp-panel-top{ display:flex; justify-content:flex-end; align-items:center; gap:12px; }
.pp-login-scope .pp-theme-badge{ font-size:14px; font-weight:600; color:var(--badge-text); background:var(--badge-bg); padding:12px 20px; border-radius:14px; display:flex; align-items:center; gap:10px; animation:pp-badge-fade 2.4s ease forwards; }
@keyframes pp-badge-fade{ 0%{opacity:1;transform:translateY(0);} 70%{opacity:1;transform:translateY(0);} 100%{opacity:0;transform:translateY(-6px);visibility:hidden;} }
.pp-login-scope .pp-form-wrap{ flex:1; display:flex; flex-direction:column; justify-content:center; max-width:420px; margin:0 auto; width:100%; }
.pp-login-scope .pp-form-wrap h2{ font-size:30px; font-weight:800; margin:0; color:var(--ink); }
.pp-login-scope .pp-lead{ margin:8px 0 32px; color:var(--muted); font-size:14.5px; }
.pp-login-scope .pp-toggle-btn{ font-size:13px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; display:flex; align-items:center; gap:6px; background:var(--toggle-bg); border:1px solid var(--toggle-border); color:var(--ink); padding:9px 16px; border-radius:999px; cursor:pointer; }
.pp-login-scope label{ display:block; font-size:14px; font-weight:600; color:var(--ink); margin-bottom:8px; }
.pp-login-scope .pp-field{ position:relative; margin-bottom:20px; }
.pp-login-scope .pp-field svg.pp-icon{ position:absolute; left:16px; top:50%; transform:translateY(-50%); width:18px; height:18px; color:var(--field-icon); pointer-events:none; }
.pp-login-scope .pp-field input{ width:100%; padding:15px 16px 15px 46px; background:var(--field-bg); border:1px solid transparent; border-radius:10px; color:var(--ink); font-size:14.5px; font-family:'Inter', sans-serif; outline:none; transition:border-color .2s ease; box-sizing:border-box; }
.pp-login-scope .pp-field input:focus{ border-color:var(--indigo); }
.pp-login-scope .pp-field .pp-eye{ position:absolute; right:16px; top:50%; transform:translateY(-50%); width:19px; height:19px; color:var(--field-icon); cursor:pointer; background:none; border:none; padding:0; }
.pp-login-scope .pp-signin-btn{ width:100%; padding:16px; border:none; border-radius:12px; background:linear-gradient(135deg, var(--indigo-grad-1), var(--indigo-grad-2)); color:#fff; font-weight:700; font-size:15.5px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; margin-top:8px; box-shadow:0 10px 24px rgba(42,59,199,0.35); transition:transform .15s ease, box-shadow .15s ease; }
.pp-login-scope .pp-signin-btn:hover{ transform:translateY(-1px); box-shadow:0 14px 28px rgba(42,59,199,0.4); }
.pp-login-scope .pp-remember-row{ display:flex; align-items:center; justify-content:space-between; margin-top:-4px; margin-bottom:20px; font-size:14px; }
.pp-login-scope .pp-remember-check{ display:flex; align-items:center; gap:8px; color:var(--muted); cursor:pointer; user-select:none; }
.pp-login-scope .pp-remember-check input{ width:16px; height:16px; accent-color:var(--indigo); cursor:pointer; }
.pp-login-scope .pp-links{ display:flex; justify-content:center; margin-top:18px; font-size:14px; }
.pp-login-scope a.pp-link{ color:var(--indigo); text-decoration:none; font-weight:600; }
.pp-login-scope a.pp-link:hover{ text-decoration:underline; }
.pp-login-scope .pp-error{ background:rgba(239,68,68,0.1); color:#ef4444; padding:10px 14px; border-radius:10px; font-size:13px; margin-bottom:16px; }
@media (max-width: 880px){
  .pp-login-scope .pp-wrap{ grid-template-columns:1fr; }
  .pp-login-scope .pp-hero{ min-height:340px; }
  .pp-login-scope .pp-deco{ display:none; }
  .pp-login-scope .pp-headline-card{ margin-top:20px; }
  .pp-login-scope .pp-panel{ padding:32px 24px; }
}
`;

export default function LoginPage() {
  const { login } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [badgeKey, setBadgeKey] = useState(0);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) { setEmail(saved); setRemember(true); }
  }, []);

  // Re-trigger the fade-out badge animation whenever the theme changes,
  // exactly like the reference: clicking toggle shows "Applied theme: X"
  // again, restarting the animation via a fresh key.
  useEffect(() => { setBadgeKey(k => k + 1); }, [dark]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await opsLogin({ email: email.trim().toLowerCase(), password });
      const data = res.data?.data || res.data;
      const authUser = data.user || data;
      if (remember) localStorage.setItem(REMEMBER_KEY, email.trim().toLowerCase());
      else localStorage.removeItem(REMEMBER_KEY);
      const signedIn = { email, fullName: authUser.fullName || authUser.name || email, role: authUser.role, roleName: authUser.roleName,
        customRole: authUser.customRole, permissions: authUser.permissions, routes: authUser.routes };
      login(signedIn, data.token || data.accessToken);
      navigate(data.mustChangePassword ? '/reset-password?forced=1' : homeFor(signedIn), { replace: true });
    } catch (e) {
      setError(e.response?.data?.message || 'Invalid credentials or insufficient privileges');
    } finally { setLoading(false); }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setForgotSent(true);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not send reset link. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="pp-login-scope" data-page-theme={dark ? 'midnight' : 'light'}>
      <style>{LOGIN_CSS}</style>
      <div className="pp-wrap">

        {/* LEFT -- hero */}
        <aside className="pp-hero">
          <div className="pp-brand-row">
            <img src="/images/brand/signin-logo.png" alt="Payport" className="pp-full-logo" />
          </div>

          <div className="pp-deco">
            <div className="pp-sq pp-sq1" />
            <div className="pp-sq pp-sq2" />
            <div className="pp-sq pp-sq3" />
            <div className="pp-phone">
              <svg viewBox="0 0 140 70" fill="none" style={{ width: '100%', height: 60 }}>
                <path d="M4 50 C 30 55, 40 15, 65 22 S 100 45, 136 12" stroke="var(--indigo)" strokeWidth="3" strokeLinecap="round" fill="none" />
              </svg>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
                <div className="pp-avatar" />
                <div className="pp-bar" style={{ flex: 1, width: '70%' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                <div className="pp-dot-blue" />
                <div style={{ flex: 1 }}>
                  <div className="pp-bar" style={{ height: 6, marginTop: 6 }} />
                </div>
              </div>
              <div className="pp-bar" style={{ height: 6, marginTop: 8, marginLeft: 32, width: '65%' }} />
              <div className="pp-bar" style={{ height: 6, marginTop: 8, marginLeft: 32, width: '45%' }} />
            </div>
          </div>

          <div className="pp-headline-card">
            <h1 className="pp-headline">Manage payments.<br />Monitor transactions.<br />Grow your business.</h1>
            <p>Securely manage payments, settlements, refunds, and reporting from one powerful dashboard.</p>
          </div>

          <div className="pp-hero-foot">© {new Date().getFullYear()} Payport</div>
        </aside>

        {/* RIGHT -- form */}
        <main className="pp-panel">
          <div className="pp-panel-top">
            <div key={badgeKey} className="pp-theme-badge">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <span>Applied theme: {dark ? 'CORPORATE MIDNIGHT' : 'SLATE LIGHT'}</span>
            </div>
            <button className="pp-toggle-btn" type="button" onClick={toggle}>
              <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
              {dark ? 'Light' : 'Dark'}
            </button>
          </div>

          {forgotMode ? (
            <form className="pp-form-wrap" onSubmit={handleForgot}>
              <h2>Reset Password</h2>
              <p className="pp-lead">{forgotSent ? 'Check your email for a reset link.' : "Enter your email and we'll send you a reset link."}</p>
              {error && <div className="pp-error">{error}</div>}
              {!forgotSent && (
                <>
                  <label>Email</label>
                  <div className="pp-field">
                    <svg className="pp-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="m3 7 9 6 9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
                  </div>
                  <button className="pp-signin-btn" type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send Reset Link'}</button>
                </>
              )}
              <div className="pp-links">
                <a href="#" className="pp-link" onClick={e => { e.preventDefault(); setForgotMode(false); setForgotSent(false); setError(''); }}>Back to Sign In</a>
              </div>
            </form>
          ) : (
            <form className="pp-form-wrap" onSubmit={handleSubmit}>
              <h2>Sign In</h2>
              <p className="pp-lead">Use your account credentials to continue.</p>
              {error && <div className="pp-error">{error}</div>}

              <label htmlFor="pp-email">Email</label>
              <div className="pp-field">
                <svg className="pp-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="m3 7 9 6 9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                <input id="pp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              </div>

              <label htmlFor="pp-password">Password</label>
              <div className="pp-field">
                <svg className="pp-icon" viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="9" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8"/></svg>
                <input id="pp-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" className="pp-eye" onClick={() => setShowPassword(s => !s)} aria-label="Show password">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                </button>
              </div>

              <div className="pp-remember-row">
                <label className="pp-remember-check">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                  Remember me
                </label>
              </div>

              <button className="pp-signin-btn" type="submit" disabled={loading}>
                <svg viewBox="0 0 24 24" fill="none" width="17" height="17"><path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 3 5 6v6c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6l-7-3Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

              <div className="pp-links">
                <a href="#" className="pp-link" onClick={e => { e.preventDefault(); setForgotMode(true); setError(''); }}>Forgot password?</a>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
