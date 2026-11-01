import { useState } from 'react';
import { Page, Section, Table, Notice, Badge, Act, useLoad, show } from '../../components/kit';
import { storeAdminApi } from '../../lib/api';

export default function StoresPage() {
    const [q, setQ] = useState('');
    const { value, error, reload } = useLoad(() => storeAdminApi.stores(q), [q]);
    const stores = value?.stores || [];
    const flagged = value?.flagged || [];
    return (
        <Page title="Payport Store: Stores">
            {error && <Notice kind="error">{error}</Notice>}
            <Section title="Stores" right={<input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }} />}>
                <Table rows={stores} exportName="Stores" empty="No stores." columns={[
                    { key: 'name', label: 'Store', render: s => <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a> },
                    { key: 'business', label: 'Merchant', render: s => <>{s.business} ({s.merchantId})</> },
                    { key: 'products', label: 'Products' },
                    { key: 'rating', label: 'Rating', render: s => s.rating ? <span style={{ color: '#E6A019', letterSpacing: 2 }}>{s.rating}</span> : '—' },
                    { key: 'reports', label: 'Reports' },
                    { key: 'flags', label: 'Flags' },
                    { key: 'state', label: 'State', render: s => <><Badge value={s.disabled ? 'DISABLED' : 'ACTIVE'} />{s.disabled && <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 3 }}>{s.disabledReason}</div>}</> },
                    { key: 'act', label: '', render: s => s.disabled
                        ? <Act label="Enable" confirm="Are you sure?" run={() => storeAdminApi.enable(s.id)} done={reload} />
                        : <Act label="Disable" kind="ghost" confirm="Are you sure?" run={() => storeAdminApi.disable(s.id)} done={reload} /> },
                ]} />
            </Section>
            <Section title="Found by the automatic checks">
                <Table rows={flagged} exportName="Store flags" empty="Nothing found." columns={[
                    { key: 'createdAt', label: 'When', render: f => show(f.createdAt) },
                    { key: 'store', label: 'Store' },
                    { key: 'kind', label: 'Where' },
                    { key: 'reason', label: 'Reason' },
                    { key: 'action', label: 'Done' },
                ]} />
            </Section>
        </Page>
    );
}
