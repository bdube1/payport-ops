import { useState, useEffect } from 'react';
import { Users, Plus, Edit, UserX, RefreshCw, Lock, Unlock } from 'lucide-react';
import { getUsers, createUser, updateUser, deactivateUser, unlockUser, formatDate } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/auth.jsx';

const ROLES = ['OPS', 'FINANCE', 'COMPLIANCE', 'ADMIN'];

function UserModal({ user, onSave, onClose }) {
  const editing = !!user?.id;
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    role: user?.role || 'OPS',
    pin: '',
    isActive: user?.isActive !== false,
  });
  // Every account created here is staff -- CUSTOMER was removed from the
  // selectable ROLES above, since consumer accounts have their own page
  // now and self-register through the mobile app anyway.
  const isStaff = true;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.fullName.trim()) { toast.error('Full name is required'); return; }
    if (!editing && !form.phone) { toast.error('Phone is required for new users'); return; }
    if (isStaff && !form.email.trim()) { toast.error('Email is required for OPS/FINANCE/ADMIN accounts'); return; }
    if (!editing && !form.pin) { toast.error(isStaff ? 'Password is required for new users' : 'PIN is required for new users'); return; }
    if (!editing && !isStaff && form.pin.length !== 4) { toast.error('PIN must be 4 digits'); return; }
    onSave(form);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', borderRadius: 20, padding: '36px', width: '100%', maxWidth: 480,
        border: '1px solid var(--border)',
      }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, marginBottom: 24 }}>
          {editing ? <><Edit size={17} /> Edit User</> : <><Plus size={17} /> Create New User</>}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Full Name *</label>
            <input value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="e.g. John Doe" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Role *</label>
            <select value={form.role} onChange={e => set('role', e.target.value)} style={{ width: '100%' }}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {!editing && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Phone Number *</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="07X XXX XXXX" style={{ width: '100%' }} />
            </div>
          )}
          {isStaff && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                Email * <span style={{ fontWeight: 400 }}>— used to sign in and for password resets</span>
              </label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@payport.africa" style={{ width: '100%' }} />
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              {isStaff ? 'Password' : '4-Digit PIN'} {editing ? '(leave blank to keep current)' : '*'}
            </label>
            {isStaff ? (
              <input type="password" value={form.pin} onChange={e => set('pin', e.target.value)} placeholder="At least 8 characters" style={{ width: '100%' }} />
            ) : (
              <input type="password" value={form.pin} onChange={e => set('pin', e.target.value.slice(0,4))} placeholder="••••" maxLength={4} style={{ width: '100%', letterSpacing: 4, fontSize: 20 }} />
            )}
            {isStaff && (
              <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>
                Must be 8+ characters with an uppercase letter, lowercase letter, digit, and special character.
              </p>
            )}
          </div>
          {editing && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Account Active</span>
            </label>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleSave} className="btn btn-primary" style={{ flex: 2 }}>
            {editing ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { user }

  const load = async () => {
    setLoading(true);
    try {
      const r = await getUsers();
      // Staff only -- consumer accounts have their own dedicated page now (ConsumersPage).
      setUsers((r.data?.data || []).filter(u => u.role !== 'CUSTOMER'));
    } catch (e) { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    try {
      if (modal.user?.id) {
        await updateUser(modal.user.id, form);
        toast.success('User updated');
      } else {
        await createUser(form);
        toast.success('User created');
      }
      setModal(null);
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save user'); }
  };

  const handleDeactivate = async (u) => {
    if (!confirm(`Deactivate ${u.fullName}?`)) return;
    try {
      await deactivateUser(u.id);
      toast.success('User deactivated');
      load();
    } catch { toast.error('Failed to deactivate'); }
  };

  const handleUnlock = async (u) => {
    if (!confirm(`Unlock ${u.fullName}'s account?`)) return;
    try {
      await unlockUser(u.id);
      toast.success('Account unlocked');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to unlock'); }
  };

  const ROLE_BADGE = { ADMIN: 'badge-red', OPS: 'badge-blue', FINANCE: 'badge-green', CUSTOMER: 'badge-gray' };

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={22} /> Staff Users & Access
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{users.length} staff accounts</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} className="btn btn-ghost"><RefreshCw size={14} /></button>
          <button onClick={() => setModal({ user: null })} className="btn btn-primary">
            <Plus size={14} /> Create User
          </button>
        </div>
      </div>

      {/* Role explanation */}
      <div style={{ background: 'var(--badge-blue)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', marginBottom: 24, fontSize: 13, color: 'var(--text-2)' }}>
        <strong style={{ color: 'var(--blue)' }}>Access levels:</strong> &nbsp;
        <span className="badge badge-red">ADMIN</span> Full system access &nbsp;·&nbsp;
        <span className="badge badge-blue">OPS</span> Operations console &nbsp;·&nbsp;
        <span className="badge badge-green">FINANCE</span> Read-only reports
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Phone</th><th>Role</th><th>Status</th><th>Last Login</th><th>Registered</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--blue), var(--green))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0,
                      }}>{u.fullName?.[0]?.toUpperCase()}</div>
                      <span style={{ fontWeight: 600 }}>{u.fullName}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.phone}</td>
                  <td><span className={`badge ${ROLE_BADGE[u.role] || 'badge-gray'}`}>{u.role}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {u.accountLocked && (
                        <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Lock size={10} /> Locked
                        </span>
                      )}
                      {u.mustChangePassword && !u.accountLocked && (
                        <span className="badge badge-amber">Password reset required</span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{u.registeredAt ? formatDate(u.registeredAt) : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setModal({ user: u })} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
                        <Edit size={12} /> Edit
                      </button>
                      {u.accountLocked && currentUser?.role === 'ADMIN' && (
                        <button onClick={() => handleUnlock(u)} className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }}>
                          <Unlock size={12} /> Unlock
                        </button>
                      )}
                      {u.isActive && (
                        <button onClick={() => handleDeactivate(u)} className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 12 }}>
                          <UserX size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <UserModal user={modal.user} onSave={handleSave} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
