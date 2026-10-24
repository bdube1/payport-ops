import { useState } from 'react';
import { rulesAdminApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton, Act, minor, CurrencySelect } from '../../components/kit';

const CHANNEL_LABELS = { ALL: 'All channels', MOB: 'Mobile app', WEB: 'Consumer web', USD: 'USSD', POS: 'POS', WHATSAPP: 'WhatsApp', API: 'API', AGENT: 'Agent' };
const major = (m) => (m === null || m === undefined ? '' : (Number(m) / 100).toFixed(2));
const pct = (bps) => (bps ? (Number(bps) / 100).toString() : '');
const limit = (v, ccy) => (v === null || v === undefined ? '—' : minor(v, ccy));
const cnt = (v) => (v === null || v === undefined ? '—' : v);

function chargeText(r) {
    const parts = [];
    if (Number(r.charge_flat_minor)) parts.push(minor(r.charge_flat_minor, r.currency));
    if (Number(r.charge_percent_bps)) parts.push(`${pct(r.charge_percent_bps)}%`);
    if (!parts.length) return '—';
    const clamp = [r.charge_min_minor != null && `min ${minor(r.charge_min_minor)}`, r.charge_max_minor != null && `max ${minor(r.charge_max_minor)}`].filter(Boolean).join(', ');
    return parts.join(' + ') + (clamp ? ` (${clamp})` : '');
}

function fields(options, r) {
    const products = [...(options?.groups || []).map(g => ({ value: g, label: g === 'ALL' ? 'All products' : g.replace(/_/g, ' ') })),
        ...(options?.products || []).map(p => ({ value: p.code, label: `${p.name} (${p.code})` }))];
    const channels = (options?.channels || Object.keys(CHANNEL_LABELS)).map(c => ({ value: c, label: CHANNEL_LABELS[c] || c }));
    return [
        { name: 'product', label: 'Product', type: 'select', required: true, options: products, initial: r?.product || 'ALL' },
        { name: 'currency', label: 'Currency', type: 'currency', required: true, initial: r?.currency || '' },
        { name: 'channel', label: 'Channel', type: 'select', required: true, options: channels, initial: r?.channel || 'ALL' },
        { name: 'minAmount', label: 'Minimum per transaction', type: 'number', step: '0.01', initial: major(r?.min_amount_minor) },
        { name: 'maxAmount', label: 'Maximum per transaction', type: 'number', step: '0.01', initial: major(r?.max_amount_minor) },
        { name: 'dailyMax', label: 'Daily value limit', type: 'number', step: '0.01', initial: major(r?.daily_max_minor) },
        { name: 'weeklyMax', label: 'Weekly value limit', type: 'number', step: '0.01', initial: major(r?.weekly_max_minor) },
        { name: 'monthlyMax', label: 'Monthly value limit', type: 'number', step: '0.01', initial: major(r?.monthly_max_minor) },
        { name: 'dailyCount', label: 'Daily number of transactions', type: 'number', initial: r?.daily_max_count ?? '' },
        { name: 'weeklyCount', label: 'Weekly number of transactions', type: 'number', initial: r?.weekly_max_count ?? '' },
        { name: 'monthlyCount', label: 'Monthly number of transactions', type: 'number', initial: r?.monthly_max_count ?? '' },
        { name: 'chargeFlat', label: 'Charge, fixed amount', type: 'number', step: '0.01', initial: major(r?.charge_flat_minor) },
        { name: 'chargePercent', label: 'Charge, percent of amount', type: 'number', step: '0.01', initial: pct(r?.charge_percent_bps) },
        { name: 'chargeMin', label: 'Minimum charge', type: 'number', step: '0.01', initial: major(r?.charge_min_minor) },
        { name: 'chargeMax', label: 'Maximum charge', type: 'number', step: '0.01', initial: major(r?.charge_max_minor) },
        { name: 'taxChargeable', label: 'Tax chargeable', type: 'checkbox', initial: !!r?.tax_chargeable },
        { name: 'taxPercent', label: 'Tax percent', type: 'number', step: '0.01', initial: pct(r?.tax_percent_bps) },
        { name: 'taxBase', label: 'Tax on', type: 'select', required: true, options: [{ value: 'CHARGE', label: 'The charge' }, { value: 'AMOUNT', label: 'The transaction amount' }], initial: r?.tax_base || 'CHARGE' },
        { name: 'active', label: 'Active', type: 'checkbox', initial: r ? !!r.active : true },
    ];
}

const clean = (v) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x === '' ? null : x]));

/** Limits, charges and tax for one party: WALLET (customers), AGENT or MERCHANT. */
export default function PartyRulesPage({ party, title }) {
    const { user } = useAuth();
    const canEdit = ['ADMIN', 'FINANCE'].includes(user?.role);
    const rules = useLoad(() => rulesAdminApi.list(party), [party]);
    const options = useLoad(() => rulesAdminApi.options(party), [party]);
    const [ccy, setCcy] = useState('');
    const [channel, setChannel] = useState('');
    const rows = (rules.value || []).filter(r => (!ccy || r.currency === ccy) && (!channel || r.channel === channel));
    const reload = () => rules.reload();
    const productLabel = (p) => p === 'ALL' ? 'All products' : ((options.value?.products || []).find(x => x.code === p)?.name || p.replace(/_/g, ' '));
    return (
        <Page title={title} actions={canEdit && <FormButton label="Add rule" title="New rule" submitLabel="Save"
            fields={fields(options.value)} onSubmit={v => rulesAdminApi.save(party, clean(v))} onDone={reload} />}>
            {(rules.error || options.error) && <Notice kind="error">{rules.error || options.error}</Notice>}
            <Section title="Rules" right={<>
                <CurrencySelect value={ccy} onChange={setCcy} allLabel="All currencies" />
                <select value={channel} onChange={e => setChannel(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13 }}>
                    <option value="">All channels</option>
                    {Object.entries(CHANNEL_LABELS).filter(([k]) => k !== 'ALL').map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></>}>
                <Table rows={rows} empty="No rules yet." columns={[
                    { key: 'product', label: 'Product', render: r => productLabel(r.product) },
                    { key: 'currency', label: 'Currency' },
                    { key: 'channel', label: 'Channel', render: r => CHANNEL_LABELS[r.channel] || r.channel },
                    { key: 'per', label: 'Per transaction', render: r => `${limit(r.min_amount_minor, r.currency)} – ${limit(r.max_amount_minor, r.currency)}` },
                    { key: 'value', label: 'Day / week / month value', render: r => [r.daily_max_minor, r.weekly_max_minor, r.monthly_max_minor].map(v => limit(v)).join(' / ') },
                    { key: 'count', label: 'Day / week / month count', render: r => [r.daily_max_count, r.weekly_max_count, r.monthly_max_count].map(cnt).join(' / ') },
                    { key: 'charge', label: 'Charge', render: chargeText },
                    { key: 'tax', label: 'Tax', render: r => r.tax_chargeable ? `${pct(r.tax_percent_bps) || 0}% on ${r.tax_base === 'AMOUNT' ? 'amount' : 'charge'}` : 'No' },
                    { key: 'active', label: 'Status', render: r => <Badge value={r.active ? 'ACTIVE' : 'DISABLED'} /> },
                    { key: 'actions', label: '', render: r => canEdit && <div style={{ display: 'flex', gap: 6 }}>
                        <FormButton label="Edit" kind="ghost" title="Edit rule" submitLabel="Save" fields={fields(options.value, r)}
                            onSubmit={v => rulesAdminApi.save(party, { ...clean(v), id: r.id })} onDone={reload} />
                        <Act label="Delete" kind="danger" confirm="Are you sure?" run={() => rulesAdminApi.remove(party, r.id)} done={reload} />
                    </div> },
                ]} />
            </Section>
        </Page>
    );
}
