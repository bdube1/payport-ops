import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { useTheme } from '../../lib/theme.jsx';
import { canAccess } from '../../lib/permissions';
import {
    LayoutDashboard, ArrowUpDown, AlertTriangle, BarChart2, Package,
    Wallet, Settings, Users, FileText, ScrollText, LogOut, Moon, Sun,
    Grid, Building2, Landmark, ShieldAlert, ClipboardCheck, MessageCircleQuestion, FileSpreadsheet,
    UserCircle, FileBarChart, LayoutGrid, Percent, ChevronDown,
    Inbox, BadgeCheck, Banknote, Plug, Globe, Scale, Gavel, Search, FileWarning, Lock, KeyRound
} from 'lucide-react';

// Always visible, never collapsed -- these aren't grouped under any of
// the four named sections, so they stay outside the accordion entirely.
const topNav = [
    { to: '/work-queues', icon: Inbox, label: 'Work Queues' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/transactions', icon: ArrowUpDown, label: 'Transactions' },
    { to: '/attention', icon: AlertTriangle, label: 'Attention Queue' },
    { to: '/statement', icon: FileText, label: 'Customer Statements' },
];

// Collapsible, accordion-style: only one open at a time, all closed on
// login, opened only by clicking the section header.
const sections = [
    {
        key: 'monitoring', label: 'MONITORING',
        items: [
            { to: '/analytics', icon: BarChart2, label: 'Analytics' },
            { to: '/reports/consolidated', icon: FileBarChart, label: 'Consolidated Report' },
            { to: '/reports/commission', icon: Percent, label: 'Commission Report' },
            { to: '/wallet', icon: Wallet, label: 'Float Balances' },
        ],
    },
    {
        key: 'merchants', label: 'MERCHANTS',
        items: [
            { to: '/merchants/dashboard', icon: LayoutGrid, label: 'Merchants Dashboard' },
            { to: '/merchants', icon: Building2, label: 'Merchant Applications', end: true },
            { to: '/merchants/statement', icon: FileText, label: 'Merchant Statement' },
            { to: '/settlements', icon: Landmark, label: 'Settlements' },
            { to: '/disputes', icon: ShieldAlert, label: 'Disputes' },
            { to: '/reconciliation', icon: ClipboardCheck, label: 'Reconciliation' },
            { to: '/statement-reconciliation', icon: FileSpreadsheet, label: 'Statement Reconciliation' },
            { to: '/queries', icon: MessageCircleQuestion, label: 'Merchant Queries' },
        ],
    },
    {
        key: 'platform', label: 'APPROVALS & FINANCE',
        items: [
            { to: '/kyb', icon: BadgeCheck, label: 'KYB Review' },
            { to: '/destinations', icon: Landmark, label: 'Payout Destinations' },
            { to: '/settlement-batches', icon: Banknote, label: 'Settlement Batches' },
            { to: '/recon-exceptions', icon: FileWarning, label: 'Recon Exceptions' },
            { to: '/bank-messages', icon: FileSpreadsheet, label: 'Bank Messages (ISO 20022)' },
            { to: '/integrations', icon: Plug, label: 'Integrations' },
            { to: '/markets', icon: Globe, label: 'Markets & Currencies' },
            { to: '/channels', icon: Plug, label: 'Channels & Product Lines' },
        ],
    },
    {
        key: 'compliance', label: 'COMPLIANCE',
        items: [
            { to: '/compliance/cases', icon: Scale, label: 'Alerts & Cases' },
            { to: '/compliance/rules', icon: Gavel, label: 'Rules & Parameters' },
            { to: '/compliance/screening', icon: Search, label: 'Sanctions Screening' },
            { to: '/compliance/reports', icon: FileText, label: 'FIU Reports' },
            { to: '/compliance/audit', icon: Lock, label: 'Audit' },
            { to: '/compliance-authorities', icon: KeyRound, label: 'Compliance Authorities' },
        ],
    },
    {
        key: 'consumers', label: 'CONSUMERS',
        items: [
            { to: '/consumers/dashboard', icon: LayoutGrid, label: 'Consumers Dashboard' },
            { to: '/consumers', icon: UserCircle, label: 'Consumers', end: true },
        ],
    },
    {
        key: 'management', label: 'MANAGEMENT',
        items: [
            { to: '/products', icon: Package, label: 'Products & Payment Methods' },
            { to: '/bundles', icon: Grid, label: 'Bundle Manager' },
            { to: '/config', icon: Settings, label: 'Configuration' },
            { to: '/users', icon: Users, label: 'Staff Users & Access' },
            { to: '/logs', icon: ScrollText, label: 'System Logs' },
        ],
    },
];

function NavItem({ item }) {
    const Icon = item.icon;
    return (
        <NavLink
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 20px', marginBottom: 2, textDecoration: 'none',
                borderRadius: 0, fontSize: 13, fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--blue)' : 'var(--text-2)',
                background: isActive ? 'var(--badge-blue)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--blue)' : '3px solid transparent',
                transition: 'all 0.15s',
            })}
        >
            <Icon size={16} />
            {item.label}
        </NavLink>
    );
}

export default function Sidebar() {
    const { user, logout } = useAuth();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();
    // null = nothing expanded -- the required state on login/mount.
    const [expandedSection, setExpandedSection] = useState(null);

    const visibleTopNav = topNav.filter(item => canAccess(user?.role, item.to));

    // Sections with every item filtered out entirely disappear rather
    // than showing an empty, clickable header over nothing.
    const visibleSections = sections
        .map(section => ({ ...section, items: section.items.filter(item => canAccess(user?.role, item.to)) }))
        .filter(section => section.items.length > 0);

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <aside style={{
            width: 240, position: 'fixed', top: 0, left: 0, height: '100vh',
            background: 'var(--sidebar-bg)',
            borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            zIndex: 100, overflowY: 'auto',
            transition: 'background 0.25s',
        }}>
            {/* Logo — same lockup image used on the website and consumer app */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <img src="/images/brand/lockup.png" alt="Payport" style={{ height: 70, width: 'auto', objectFit: 'contain', display: 'block', marginBottom: 6 }} />
                <p style={{ fontSize: 9.5, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Operations Console</p>
            </div>

            {/* User */}
            {user && (
                <div
                    onClick={() => navigate('/account')}
                    role="button"
                    tabIndex={0}
                    style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                    title="Account settings"
                >
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--blue), var(--blue-dark))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0,
                    }}>{user.fullName?.[0]?.toUpperCase() || 'O'}</div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.fullName || user.phone}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 600, textTransform: 'uppercase' }}>{user.role || 'OPS'}</div>
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
                {visibleTopNav.map(item => <NavItem key={item.to} item={item} />)}

                {visibleSections.map(section => {
                    const isOpen = expandedSection === section.key;
                    return (
                        <div key={section.key}>
                            <button
                                onClick={() => setExpandedSection(isOpen ? null : section.key)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    width: '100%', padding: '16px 20px 8px', marginTop: 0,
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: 10, fontWeight: 700, color: 'var(--text-2)',
                                    textTransform: 'uppercase', letterSpacing: '0.08em',
                                }}
                            >
                                {section.label}
                                <ChevronDown size={13} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                            </button>
                            {isOpen && section.items.map(item => <NavItem key={item.to} item={item} />)}
                        </div>
                    );
                })}
            </nav>

            {/* Bottom */}
            <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={toggle} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
                    background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, width: '100%',
                }}>
                    {dark ? <Sun size={14} /> : <Moon size={14} />}
                    {dark ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button onClick={handleLogout} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    color: 'var(--red)', cursor: 'pointer', fontSize: 12, fontWeight: 600, width: '100%',
                }}>
                    <LogOut size={14} /> Sign Out
                </button>
            </div>
        </aside>
    );
}
