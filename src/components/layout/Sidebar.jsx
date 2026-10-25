import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Moon } from 'lucide-react';
import { useAuth } from '../../lib/auth.jsx';
import { useTheme } from '../../lib/theme.jsx';
import { canAccess } from '../../lib/permissions';
import { TOP, GROUPS } from '../../lib/nav';

function Item({ item, onNavigate }) {
    const Icon = item.icon;
    return (
        <NavLink to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => `op-link${isActive ? ' active' : ''}`}>
            <Icon size={17} strokeWidth={1.9} />
            <span>{item.label}</span>
        </NavLink>
    );
}

const groupOf = (path) => GROUPS.find(g => g.items.some(i => path === i.to || path.startsWith(i.to + '/')))?.key || null;

export default function Sidebar({ open, onNavigate }) {
    const { user, logout } = useAuth();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [expanded, setExpanded] = useState(() => groupOf(location.pathname));

    // Opening a page from elsewhere (search, a link) opens its group.
    useEffect(() => {
        const g = groupOf(location.pathname);
        if (g && !TOP.some(t => location.pathname === t.to || location.pathname.startsWith(t.to + '/'))) setExpanded(g);
    }, [location.pathname]);

    const top = TOP.filter(i => canAccess(user, i.to));
    const groups = GROUPS.map(g => ({ ...g, items: g.items.filter(i => canAccess(user, i.to)) })).filter(g => g.items.length);

    return (
        <aside className={`op-side${open ? ' open' : ''}`}>
            <div className="op-brand">
                <img src="/images/brand/mark.png" alt="" />
                <b>Payport</b>
            </div>
            <nav className="op-nav">
                {top.map(i => <Item key={i.to} item={i} onNavigate={onNavigate} />)}
                {groups.map(g => {
                    const isOpen = expanded === g.key;
                    const Icon = g.icon;
                    return (
                        <div key={g.key}>
                            <button className={`op-group-btn${isOpen ? ' open' : ''}`} onClick={() => setExpanded(isOpen ? null : g.key)}>
                                <Icon size={17} strokeWidth={1.9} />
                                <span>{g.label}</span>
                                <ChevronDown size={15} className="op-chev" />
                            </button>
                            {isOpen && <div className="op-sub">{g.items.map(i => <Item key={i.to} item={i} onNavigate={onNavigate} />)}</div>}
                        </div>
                    );
                })}
            </nav>
            <div className="op-side-foot">
                <button className="op-link" onClick={toggle}>
                    <Moon size={17} strokeWidth={1.9} /><span>Dark Mode</span>
                    <span className={`op-switch${dark ? ' on' : ''}`} />
                </button>
                <button className="op-link" onClick={() => { logout(); navigate('/login', { replace: true }); }}>
                    <LogOut size={17} strokeWidth={1.9} /><span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
