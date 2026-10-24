import { useState } from 'react';
import { cardsAdminApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton, Act, show } from '../../components/kit';

const box = { padding: '7px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13 };

export default function CardsPage() {
    const { user } = useAuth();
    const canChange = ['ADMIN', 'OPS', 'COMPLIANCE'].includes(user?.role);
    const [q, setQ] = useState('');
    const [filters, setFilters] = useState({ q: '', status: '', scheme: '' });
    const cards = useLoad(() => cardsAdminApi.search(filters), [JSON.stringify(filters)]);
    const reload = () => cards.reload();
    return (
        <Page title="Cards">
            {cards.error && <Notice kind="error">{cards.error}</Notice>}
            <Section title="Cards linked to wallets" right={<form onSubmit={e => { e.preventDefault(); setFilters(f => ({ ...f, q })); }} style={{ display: 'flex', gap: 6 }}>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Card, wallet, phone, name, last 4" style={{ ...box, minWidth: 220 }} />
                <select value={filters.scheme} onChange={e => setFilters(f => ({ ...f, scheme: e.target.value }))} style={box}>
                    <option value="">VISA and ZimSwitch</option><option value="VISA">VISA</option><option value="ZIMSWITCH">ZimSwitch</option></select>
                <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={box}>
                    <option value="">All statuses</option>{['REQUESTED', 'ACTIVE', 'FROZEN', 'BLOCKED', 'CANCELLED', 'REFUSED'].map(s => <option key={s}>{s}</option>)}</select>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }}>Search</button></form>}>
                <Table rows={cards.value} empty="No cards." columns={[
                    { key: 'cardRef', label: 'Card' }, { key: 'scheme', label: 'Scheme', render: r => r.scheme === 'ZIMSWITCH' ? 'ZimSwitch' : r.scheme },
                    { key: 'form', label: 'Type', render: r => r.form === 'VIRTUAL' ? 'Virtual' : 'Physical' },
                    { key: 'maskedPan', label: 'Number', render: r => r.maskedPan || (r.last4 ? `•••• ${r.last4}` : '—') }, { key: 'expiry', label: 'Expiry' },
                    { key: 'nameOnCard', label: 'Name on card' }, { key: 'holder', label: 'Holder' }, { key: 'phone', label: 'Phone' },
                    { key: 'walletRef', label: 'Wallet' }, { key: 'currency', label: 'Ccy' },
                    { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'note', label: 'Note' },
                    { key: 'createdAt', label: 'Requested', render: r => show(r.createdAt) },
                    { key: 'actions', label: '', render: r => canChange && !['CANCELLED', 'REFUSED'].includes(r.status) && <div style={{ display: 'flex', gap: 6 }}>
                        {r.issuerConnected && <Act label="Refresh" kind="ghost" run={() => cardsAdminApi.refresh(r.cardRef)} done={reload} />}
                        <FormButton label="Status" kind="ghost" title={`Card ${r.cardRef}`} submitLabel="Save"
                            fields={[{ name: 'status', label: 'Status', type: 'select', required: true,
                                options: (r.status === 'REQUESTED' ? ['REFUSED', 'CANCELLED'] : ['ACTIVE', 'FROZEN', 'BLOCKED', 'CANCELLED']).filter(s => s !== r.status) },
                                { name: 'note', label: 'Note', type: 'textarea' }]}
                            onSubmit={v => cardsAdminApi.setStatus(r.cardRef, v.status, v.note || null)} onDone={reload} />
                    </div> },
                ]} />
            </Section>
        </Page>
    );
}
