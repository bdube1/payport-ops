import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { careApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { canAccess } from '../../lib/permissions';
import { Page, Section, Table, Badge, Notice, FormModal, useLoad, errorText, show } from '../../components/kit';
import TracePanel from '../../components/TracePanel';
import NewComplaint, { Explain } from './NewComplaint';

const STATUS_FILTERS = [['ACTIVE', 'Open'], ['', 'All'], ['RESOLVED', 'Resolved'], ['CLOSED', 'Closed'], ['REJECTED', 'Rejected']];
const AREAS = { MERCHANT: 'Merchant', AGENT: 'Agent', GENERAL: 'Wallet & general' };
const CHANNEL_LABELS = { PHONE: 'Phone call', WALK_IN: 'Walk-in', EMAIL: 'Email', WHATSAPP: 'WhatsApp', SOCIAL: 'Social media', MERCHANT: 'From a merchant', AGENT: 'From an agent', OTHER: 'Other' };
const due = (r) => r.due_at ? new Date(String(r.due_at).replace(' ', 'T')) : null;

function Chip({ label, value, tone }) {
    return (
        <div className="card" style={{ padding: '12px 16px', minWidth: 130 }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: tone || 'var(--text)' }}>{value ?? '—'}</div>
        </div>
    );
}

export default function ComplaintsPage() {
    const { user } = useAuth();
    const [status, setStatus] = useState('ACTIVE');
    const [q, setQ] = useState('');
    const [openId, setOpenId] = useState(null);
    const [creating, setCreating] = useState(false);
    const assist = useLoad(() => careApi.assist(), []);
    const catalog = useLoad(() => careApi.catalog(), []);
    const summary = useLoad(() => careApi.summary(), []);
    const list = useLoad(() => careApi.complaints(status, q), [status, q]);
    const cats = catalog.value?.categories || [];
    const reload = () => { list.reload(); summary.reload(); };

    const categoryOptions = useMemo(() => cats.map(c => ({ value: c.code, label: `${AREAS[c.area]}: ${c.title}` })), [cats]);
    const s = summary.value || {};

    return (
        <Page title="Complaints" actions={
            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => setCreating(true)}>New complaint</button>
        }>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                <Chip label="Open" value={s.open} />
                <Chip label="Overdue" value={s.overdue} tone={s.overdue ? 'var(--pill-red)' : undefined} />
                <Chip label="High priority" value={s.high} tone={s.high ? 'var(--pill-red)' : undefined} />
                <Chip label="Reversals waiting" value={s.pendingReversals} tone={s.pendingReversals ? 'var(--amber)' : undefined} />
            </div>
            <Section title="Complaints" right={<>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Reference, phone or name" style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13, width: 220 }} />
                <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13 }}>
                    {STATUS_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
            </>}>
                {list.error && <Notice kind="error">{list.error}</Notice>}
                {list.value && <Table rows={list.value} exportName="Complaints" onRow={r => setOpenId(r.id)} columns={[
                    { key: 'complaint_ref', label: 'Reference' },
                    { key: 'created_at', label: 'Received', render: r => show(r.created_at) },
                    { key: 'customer_phone', label: 'Customer', render: r => [r.customer_name, r.customer_phone].filter(Boolean).join(' · ') || '—' },
                    { key: 'categoryTitle', label: 'Type' },
                    { key: 'priority', label: 'Priority', render: r => <Badge value={r.priority} /> },
                    { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
                    { key: 'assigned_to', label: 'Owner', render: r => show(r.assigned_to) },
                    { key: 'due_at', label: 'Due', render: r => <span style={{ color: r.overdue ? 'var(--pill-red)' : undefined, fontWeight: r.overdue ? 700 : 400 }}>{due(r)?.toLocaleString() || '—'}</span> },
                ]} />}
            </Section>
            {openId && <ComplaintDrawer id={openId} canReverse={canAccess(user, '/reversals')} helper={!!assist.value?.helper} onClose={() => setOpenId(null)} onChange={reload} />}
            {creating && <NewComplaint categoryOptions={categoryOptions} channels={catalog.value?.channels || []} channelLabels={CHANNEL_LABELS}
                triage={!!assist.value?.triage} onClose={() => setCreating(false)} onDone={d => { reload(); if (d?.id) setOpenId(d.id); }} />}
        </Page>
    );
}

function ComplaintDrawer({ id, canReverse, helper, onClose, onChange }) {
    const c = useLoad(() => careApi.complaint(id), [id]);
    const [note, setNote] = useState('');
    const [finish, setFinish] = useState(null);
    const [reverse, setReverse] = useState(null);
    const v = c.value;
    const refresh = () => { c.reload(); onChange(); };
    const act = async (fn, msg) => {
        try { await fn(); toast.success(msg || 'Done'); refresh(); } catch (e) { toast.error(errorText(e)); }
    };
    const open = v && ['OPEN', 'INVESTIGATING', 'AWAITING_REVERSAL'].includes(v.status);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 900, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ width: 'min(760px, 100%)', height: '100%', overflow: 'auto', background: 'var(--bg)', padding: 24, borderLeft: '1px solid var(--border)' }}>
                {!v ? <div className="spinner" /> : <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0, flex: 1 }}>{v.complaint_ref}</h2>
                        <Badge value={v.priority} /> <Badge value={v.status} />
                        <button className="btn btn-ghost" onClick={onClose} style={{ padding: 6 }}><X size={16} /></button>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{v.categoryTitle}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '6px 16px', fontSize: 13, marginBottom: 16 }}>
                        <span style={{ color: 'var(--text-2)' }}>Customer</span><span>{[v.customer_name, v.customer_phone].filter(Boolean).join(' · ') || '—'}</span>
                        <span style={{ color: 'var(--text-2)' }}>Received</span><span>{show(v.created_at)} · {CHANNEL_LABELS[v.channel] || v.channel}</span>
                        <span style={{ color: 'var(--text-2)' }}>Due</span><span>{due(v)?.toLocaleString()}</span>
                        <span style={{ color: 'var(--text-2)' }}>Owner</span><span>{show(v.assigned_to)}</span>
                        <span style={{ color: 'var(--text-2)' }}>Reference</span><span>{show(v.reference)}</span>
                        <span style={{ color: 'var(--text-2)' }}>What happened</span><span style={{ whiteSpace: 'pre-wrap' }}>{v.description}</span>
                        {v.resolution && <><span style={{ color: 'var(--text-2)' }}>Outcome</span><span>{v.resolution}</span></>}
                    </div>
                    {open && <Notice kind="info">{v.howToResolve}</Notice>}
                    {open && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0' }}>
                        <button className="btn btn-outline" onClick={() => act(() => careApi.assign(id), 'Assigned to you')}>Take it</button>
                        {v.status === 'OPEN' && <button className="btn btn-outline" onClick={() => act(() => careApi.status(id, 'INVESTIGATING'))}>Investigating</button>}
                        <button className="btn btn-primary" onClick={() => setFinish('RESOLVED')}>Resolve</button>
                        <button className="btn btn-ghost" onClick={() => setFinish('REJECTED')}>Reject</button>
                    </div>}
                    {!open && v.status === 'RESOLVED' && <div style={{ margin: '14px 0' }}><button className="btn btn-outline" onClick={() => setFinish('CLOSED')}>Close</button></div>}

                    {v.trace && <Section title="What PayPort recorded">
                        {helper && v.reference && <div style={{ marginBottom: 14 }}><Explain key={v.reference} reference={v.reference} /></div>}
                        <TracePanel trace={v.trace} onReverse={open && canReverse ? (o) => <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => setReverse(o)}>Request reversal</button> : null} />
                    </Section>}
                    {(v.reversals || []).length > 0 && <Section title="Reversals">
                        <Table noExport rows={v.reversals} columns={[{ key: 'reversal_ref', label: 'Reversal' }, { key: 'kind', label: 'Type', render: r => <Badge value={r.kind} /> },
                            { key: 'amount_minor', label: 'Amount', render: r => `${r.currency} ${(r.amount_minor / 100).toFixed(2)}` }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
                            { key: 'requested_by', label: 'Requested by' }, { key: 'decided_by', label: 'Approved by', render: r => show(r.decided_by) }]} />
                    </Section>}
                    <Section title="Notes">
                        {(v.notes || []).map((n, i) => (
                            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{n.note}</div>
                                <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 2 }}>{n.created_by} · {show(n.created_at)}</div>
                            </div>
                        ))}
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <input value={note} onChange={e => setNote(e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13 }} />
                            <button className="btn btn-primary" disabled={!note.trim()} onClick={() => act(() => careApi.note(id, note.trim()), 'Note added').then(() => setNote(''))}>Add note</button>
                        </div>
                    </Section>
                    {(v.earlier || []).length > 0 && <Section title="Earlier complaints">
                        <Table noExport rows={v.earlier} columns={[{ key: 'complaint_ref', label: 'Reference' }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'created_at', label: 'Received', render: r => show(r.created_at) }]} />
                    </Section>}
                </>}
            </div>
            {finish && <FormModal title={finish === 'REJECTED' ? 'Reject complaint' : finish === 'CLOSED' ? 'Close complaint' : 'Resolve complaint'}
                fields={[{ name: 'resolution', label: 'Outcome (sent to the customer by SMS)', type: 'textarea', required: true, initial: v?.resolution || '' }]}
                onSubmit={x => careApi.status(id, finish, x.resolution)} onClose={() => setFinish(null)} onDone={refresh} />}
            {reverse && <FormModal title="Request reversal" submitLabel="Send for approval"
                fields={[{ name: 'reason', label: reverse.label, type: 'textarea', required: true }]}
                onSubmit={x => careApi.request(reverse.kind, reverse.targetRef, x.reason, v.complaint_ref)} onClose={() => setReverse(null)} onDone={refresh} />}
        </div>
    );
}

