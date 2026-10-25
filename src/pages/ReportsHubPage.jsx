import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Activity, AlertTriangle, Landmark, Building2, ScrollText, Percent, WalletCards, Hash, HandCoins, BookOpen, FileSpreadsheet, UserCircle, BarChart2 } from 'lucide-react';
import { Page } from '../components/kit';
import { useAuth } from '../lib/auth.jsx';
import { canAccess } from '../lib/permissions';

const STANDARD = [
    { icon: FileText, color: '#1D6FE8', title: 'Transaction Summary', sub: 'All transactions for a period', to: '/transactions' },
    { icon: Activity, color: '#0EA5E9', title: 'Provider Performance', sub: 'Uptime, volumes and success rates', to: '/analytics' },
    { icon: AlertTriangle, color: '#E5484D', title: 'Failed Transactions', sub: 'Failures with their reasons', to: '/transactions?status=FULFILMENT_FAILED' },
    { icon: Landmark, color: '#16A34A', title: 'Financial Report', sub: 'Revenue, fees and settlement', to: '/reports/consolidated' },
    { icon: Building2, color: '#7C5CFA', title: 'Merchant Report', sub: 'Merchant activity and volume', to: '/merchants/statement' },
    { icon: ScrollText, color: '#E8930C', title: 'Audit Log', sub: 'Staff actions and system events', to: '/logs' },
];
const MORE = [
    { icon: Percent, color: '#16A34A', title: 'Commission Report', sub: 'Commission earned by merchant', to: '/reports/commission' },
    { icon: WalletCards, color: '#1D6FE8', title: 'Wallet Statement', sub: 'One wallet with its running balance', to: '/customer-wallets/statement' },
    { icon: WalletCards, color: '#16A34A', title: 'Wallet Balances', sub: 'Every wallet holder by balance', to: '/customer-wallets/balances' },
    { icon: WalletCards, color: '#7C5CFA', title: 'Wallet Report', sub: 'Wallet operations by customer', to: '/customer-wallets/report' },
    { icon: UserCircle, color: '#0EA5E9', title: 'Customer Statement', sub: 'One customer’s transactions', to: '/statement' },
    { icon: Hash, color: '#7C5CFA', title: 'Merchant Code Report', sub: 'Payments by merchant code', to: '/merchants/codes' },
    { icon: HandCoins, color: '#E8930C', title: 'Agent Code Report', sub: 'Cash-in and cash-out by agent code', to: '/agents/codes' },
    { icon: BookOpen, color: '#16A34A', title: 'Trial Balance', sub: 'Ledger balances', to: '/ledger' },
    { icon: FileSpreadsheet, color: '#E5484D', title: 'Reconciliation', sub: 'Matched and unmatched items', to: '/reconciliation' },
    { icon: BarChart2, color: '#1D6FE8', title: 'Consumers Dashboard', sub: 'Customer growth and activity', to: '/consumers/dashboard' },
];

function Cards({ items }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const list = items.filter(i => canAccess(user, i.to.split('?')[0]));
    if (!list.length) return <div className="card" style={{ color: 'var(--text-2)' }}>No reports for your role.</div>;
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {list.map(r => (
                <div key={r.title} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <span style={{ width: 40, height: 40, borderRadius: 11, background: `${r.color}18`, color: r.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <r.icon size={19} />
                        </span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3 }}>{r.sub}</div>
                        </div>
                    </div>
                    <button className="btn btn-outline" style={{ alignSelf: 'center', minWidth: 120, marginTop: 'auto' }} onClick={() => navigate(r.to)}>Generate</button>
                </div>
            ))}
        </div>
    );
}

export default function ReportsHubPage() {
    const [tab, setTab] = useState('standard');
    return (
        <Page title="Reports">
            <div className="op-tabs">
                <button className={tab === 'standard' ? 'on' : ''} onClick={() => setTab('standard')}>Standard Reports</button>
                <button className={tab === 'more' ? 'on' : ''} onClick={() => setTab('more')}>More Reports</button>
            </div>
            <Cards items={tab === 'standard' ? STANDARD : MORE} />
        </Page>
    );
}
