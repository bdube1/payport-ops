import { useState } from 'react';
import { codesAdminApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, Act, minor, show } from '../../components/kit';

const box = { padding: '7px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13 };
const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); };

/** Agent or merchant codes: every code (main and branch), applications for more codes, and the report per code. */
export default function CodesPage({ type }) {
    const { user } = useAuth();
    const canDecide = ['ADMIN', 'OPS', 'COMPLIANCE'].includes(user?.role);
    const word = type === 'AGENT' ? 'Agent' : 'Merchant';
    const [q, setQ] = useState('');
    const [query, setQuery] = useState('');
    const codes = useLoad(() => codesAdminApi.search(type, query), [type, query]);
    const requests = useLoad(() => codesAdminApi.requests(), [type]);
    const pending = (requests.value || []).filter(r => r.party_type === type);
    const reload = () => { codes.reload(); requests.reload(); };

    const [rep, setRep] = useState({ code: '', from: monthAgo(), to: today() });
    const [run, setRun] = useState(null);
    const report = useLoad(() => (run ? codesAdminApi.report({ type, code: run.code, from: run.from, to: run.to }) : Promise.resolve({ data: { data: null } })), [JSON.stringify(run)]);
    const r = report.value;

    return (
        <Page title={`${word} codes`}>
            {(codes.error || requests.error) && <Notice kind="error">{codes.error || requests.error}</Notice>}
            {pending.length > 0 && <Section title="Applications for more codes">
                <Table rows={pending} columns={[
                    { key: 'requested_at', label: 'Applied', render: x => show(x.requested_at) }, { key: 'party_name', label: word },
                    { key: 'label', label: 'Branch / name' }, { key: 'address', label: 'Address' }, { key: 'status', label: 'Status', render: x => <Badge value={x.status} /> },
                    { key: 'code', label: 'Code' }, { key: 'decided_by', label: 'Decided by' },
                    { key: 'actions', label: '', render: x => canDecide && x.status === 'PENDING' && <div style={{ display: 'flex', gap: 6 }}>
                        <Act label="Approve" kind="success" confirm="Are you sure?" run={() => codesAdminApi.decide(x.id, true, null)} done={reload} />
                        <Act label="Reject" kind="danger" confirm="Are you sure?" run={() => codesAdminApi.decide(x.id, false, null)} done={reload} />
                    </div> },
                ]} />
            </Section>}

            <Section title={`All ${word.toLowerCase()} codes`} right={<form onSubmit={e => { e.preventDefault(); setQuery(q); }} style={{ display: 'flex', gap: 6 }}>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Code, ${word.toLowerCase()} or branch`} style={{ ...box, minWidth: 220 }} />
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }}>Search</button></form>}>
                <Table rows={codes.value} empty="No codes." columns={[
                    { key: 'code', label: 'Code', render: x => <strong style={{ fontFamily: 'monospace', fontSize: 14 }}>{x.code}</strong> },
                    { key: 'partyName', label: word }, { key: 'label', label: 'Branch / name' }, { key: 'address', label: 'Address' },
                    { key: 'primary', label: 'Main', render: x => (x.primary ? 'Yes' : '') }, { key: 'status', label: 'Status', render: x => <Badge value={x.status} /> },
                    { key: 'createdAt', label: 'Issued', render: x => show(x.createdAt) },
                    { key: 'actions', label: '', render: x => <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => { setRep(v => ({ ...v, code: x.code })); setRun({ ...rep, code: x.code }); }}>Report</button>
                        {canDecide && !x.primary && x.status === 'ACTIVE' && <Act label="Suspend" kind="danger" confirm="Are you sure?" run={() => codesAdminApi.setStatus(x.code, 'SUSPENDED')} done={reload} />}
                        {canDecide && x.status === 'SUSPENDED' && <Act label="Activate" kind="success" confirm="Are you sure?" run={() => codesAdminApi.setStatus(x.code, 'ACTIVE')} done={reload} />}
                    </div> },
                ]} />
            </Section>

            <Section title="Report by code" right={<form onSubmit={e => { e.preventDefault(); setRun({ ...rep }); }} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <input value={rep.code} onChange={e => setRep(v => ({ ...v, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="Code" style={{ ...box, width: 100 }} required />
                <input type="date" value={rep.from} onChange={e => setRep(v => ({ ...v, from: e.target.value }))} style={box} />
                <input type="date" value={rep.to} onChange={e => setRep(v => ({ ...v, to: e.target.value }))} style={box} />
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }}>Run</button></form>}>
                {report.error && <Notice kind="error">{report.error}</Notice>}
                {!r && !report.error && <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>Choose a code and dates.</p>}
                {r && <>
                    <Table exportName={`${word} code ${run?.code} summary`} rows={r.summary} empty="Nothing in this period." columns={[
                        { key: 'code', label: 'Code' }, { key: 'label', label: 'Branch' }, ...(type === 'AGENT' ? [{ key: 'kind', label: 'Type' }] : []),
                        { key: 'currency', label: 'Currency' }, { key: 'count', label: 'Count' },
                        { key: 'amount_minor', label: 'Amount', render: x => minor(x.amount_minor, x.currency) },
                        type === 'AGENT' ? { key: 'commission_minor', label: 'Commission', render: x => minor(x.commission_minor, x.currency) }
                            : { key: 'fee_minor', label: 'Fees', render: x => minor(x.fee_minor, x.currency) },
                    ]} />
                    <div style={{ height: 14 }} />
                    <Table exportName={`${word} code ${run?.code} ${r.from} to ${r.to}`} rows={r.rows} empty="No transactions in this period." columns={type === 'AGENT' ? [
                        { key: 'created_at', label: 'Date', render: x => show(x.created_at) }, { key: 'code', label: 'Code' }, { key: 'kind', label: 'Type', render: x => <Badge value={x.kind} /> },
                        { key: 'wallet_ref', label: 'Wallet' }, { key: 'customer_phone', label: 'Customer' },
                        { key: 'amount_minor', label: 'Amount', render: x => minor(x.amount_minor, x.currency) },
                        { key: 'commission_minor', label: 'Commission', render: x => minor(x.commission_minor, x.currency) }, { key: 'reference', label: 'Reference' },
                    ] : [
                        { key: 'created_at', label: 'Date', render: x => show(x.created_at) }, { key: 'code', label: 'Code' }, { key: 'reference', label: 'Reference' },
                        { key: 'status', label: 'Status', render: x => <Badge value={x.status} /> }, { key: 'channel', label: 'Channel' }, { key: 'customer_phone', label: 'Customer' },
                        { key: 'amount_minor', label: 'Amount', render: x => minor(x.amount_minor, x.currency) },
                        { key: 'fee_minor', label: 'Fee', render: x => minor(x.fee_minor, x.currency) }, { key: 'net_minor', label: 'Net', render: x => minor(x.net_minor, x.currency) },
                    ]} />
                </>}
            </Section>
        </Page>
    );
}

/** The codes of one agent or merchant, for its detail screen. */
export function PartyCodesSection({ type, id, canAdd }) {
    const d = useLoad(() => codesAdminApi.ofParty(type, id), [type, id]);
    const [label, setLabel] = useState('');
    const [address, setAddress] = useState('');
    return (
        <Section title="Codes">
            {d.error && <Notice kind="error">{d.error}</Notice>}
            <Table rows={d.value?.codes} empty="No codes." columns={[
                { key: 'code', label: 'Code', render: x => <strong style={{ fontFamily: 'monospace', fontSize: 14 }}>{x.code}</strong> },
                { key: 'label', label: 'Branch / name' }, { key: 'address', label: 'Address' }, { key: 'primary', label: 'Main', render: x => (x.primary ? 'Yes' : '') },
                { key: 'status', label: 'Status', render: x => <Badge value={x.status} /> },
            ]} />
            {canAdd && <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Branch name" style={box} />
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Branch address" style={{ ...box, minWidth: 220 }} />
                <Act label="Add code" confirm="Are you sure?" disabled={!label.trim()} run={() => codesAdminApi.add(type, id, label.trim(), address.trim() || null)}
                    done={() => { setLabel(''); setAddress(''); d.reload(); }} />
            </form>}
        </Section>
    );
}
