import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, Search, User, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../lib/auth.jsx';
import { useTheme } from '../../lib/theme.jsx';
import { canAccess } from '../../lib/permissions';
import { getAttentionQueue } from '../../lib/api';

const ROLE_NAMES = { ADMIN: 'Administrator', OPS: 'Operations', FINANCE: 'Finance', COMPLIANCE: 'Compliance' };

export default function Topbar({ onMenu }) {
    const { user, logout } = useAuth();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [menu, setMenu] = useState(false);
    const [attention, setAttention] = useState(0);
    const ref = useRef(null);
    const canAttention = canAccess(user, '/attention');

    useEffect(() => {
        if (!canAttention) return undefined;
        let live = true;
        const load = () => getAttentionQueue().then(r => {
            const d = r.data?.data ?? r.data;
            if (live) setAttention(Array.isArray(d) ? d.length : 0);
        }).catch(() => {});
        load();
        const t = setInterval(load, 60000);
        return () => { live = false; clearInterval(t); };
    }, [canAttention]);

    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const search = (e) => {
        e.preventDefault();
        const v = q.trim();
        if (!v) return;
        if (/^(PP|TXN|CS|WAL|AG)[-A-Z0-9]{4,}$/i.test(v) && canAccess(user, '/transactions')) navigate(`/transactions/${encodeURIComponent(v.toUpperCase())}`);
        else navigate(`/transactions?q=${encodeURIComponent(v)}`);
        setQ('');
    };

    const name = user?.fullName || user?.email || 'Staff';
    const role = user?.roleName || ROLE_NAMES[user?.role] || user?.role || '';

    return (
        <header className="op-top">
            <button className="op-icon-btn op-burger" onClick={onMenu} aria-label="Menu"><Menu size={18} /></button>
            <form className="op-search" onSubmit={search}>
                <Search size={16} />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by reference, transaction ID, customer..." />
            </form>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="op-icon-btn" title="Attention queue" onClick={() => canAttention && navigate('/attention')}>
                    <Bell size={18} />
                    {attention > 0 && <span className="op-ping" />}
                </button>
                <div ref={ref} style={{ position: 'relative' }}>
                    <button className="op-user" onClick={() => setMenu(m => !m)}>
                        <span className="op-avatar">{name[0]?.toUpperCase()}</span>
                        <span className="op-user-meta">
                            <div className="op-user-name">{name}</div>
                            <div className="op-user-role">{role}</div>
                        </span>
                        <ChevronDown size={15} color="var(--text-2)" />
                    </button>
                    {menu && (
                        <div className="op-menu">
                            <button onClick={() => { setMenu(false); navigate('/account'); }}><User size={15} /> My Profile</button>
                            <button onClick={toggle}>{dark ? <Sun size={15} /> : <Moon size={15} />} {dark ? 'Light Mode' : 'Dark Mode'}</button>
                            <button onClick={() => { logout(); navigate('/login', { replace: true }); }} style={{ color: 'var(--red)' }}><LogOut size={15} /> Sign Out</button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
