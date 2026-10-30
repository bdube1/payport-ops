import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { careApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { Page, Section, Table, Badge, Notice, FormModal, useLoad, data, errorText, show } from '../../components/kit';
import TracePanel from '../../components/TracePanel';

const amount = (r) => `${r.currency} ${(Number(r.amount_minor) / 100).toFixed(2)}`;
const PAYOUT_METHODS = [['ECOCASH', 'EcoCash'], ['ONEMONEY', 'OneMoney'], ['OMARI', "O'mari"], ['INNBUCKS', 'InnBucks'], ['CARD', 'Card'], ['BANK', 'Bank transfer'], ['OTHER', 'Other']];

/** /reversals: trace a reference and request a reversal. /reversals/approve: approve, reject, record payouts. */
export default function ReversalsPage() {
    const { pathname } = useLocation();
    const approving = pathname.startsWith('/reversals/approve');
    return approving ? <Approvals /> : <Requests />;
}

function Requests() {
    const { user } = useAuth();
    const [params] = useSearchParams();
    const [ref, setRef] = useState(params.get('ref') || '');
    const [trace, setTrace] = useState(null);
    const [busy, setBusy] = useState(false);
    const [asking, setAsking] = useState(null);
    const [status, setStatus] = useState('');
    const list = useLoad(() => careApi.reversals(status), [status]);

    const find = async (r = ref) => {
        if (!r.trim()) return;
        setBusy(true);
        try { setTrace(data(await careApi.trace(r.trim()))); } catch (e) { toast.error(errorText(e)); setTrace(null); } finally { setBusy(false); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (params.get('ref')) find(params.get('ref')); }, []);

    return (
        <Page title="Reversals">
            <Section title="Find what to reverse">
                <form onSubmit={e => { e.preventDefault(); find(); }} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <input value={ref} onChange={e => setRef(e.target.value)} placeholder="Transaction, provider or wallet reference"
                        style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13.5 }} />
                    <button className="btn btn-primary" disabled={busy || !ref.trim()}>{busy ? '…' : 'Find'}</button>
                </form>
                <TracePanel trace={trace} onReverse={(o) => <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => setAsking(o)}>Request</button>} />
            </Section>
            <Section title="Requests" right={
                <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13 }}>
                    {[['', 'All'], ['OPEN', 'Waiting'], ['EXECUTED', 'Done'], ['REJECTED', 'Rejected'], ['FAILED', 'Failed']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>}>
                {list.error && <Notice kind="error">{list.error}</Notice>}
                {list.value && <Table rows={list.value} exportName="Reversal requests" columns={columns(false, user)} />}
            </Section>
            {asking && <FormModal title="Request reversal" submitLabel="Send for approval"
                fields={[{ name: 'reason', label: asking.label, type: 'textarea', required: true }, { name: 'complaintRef', label: 'Complaint reference' }]}
                onSubmit={x => careApi.request(asking.kind, asking.targetRef, x.reason, x.complaintRef || undefined)}
                onClose={() => setAsking(null)} onDone={() => { list.reload(); find(); }} />}
        </Page>
    );
}

function columns(withActions, user, actions) {
    const cols = [
        { key: 'reversal_ref', label: 'Reversal' },
        { key: 'requested_at', label: 'Requested', render: r => show(r.requested_at) },
        { key: 'summary', label: 'What' },
        { key: 'amount_minor', label: 'Amount', render: amount },
        { key: 'reason', label: 'Reason' },
        { key: 'status', label: 'Status', render: r => <span title={r.error || r.decision_note || ''}><Badge value={r.status} /></span> },
        { key: 'requested_by', label: 'Requested by' },
        { key: 'decided_by', label: 'Approved by', render: r => show(r.decided_by) },
        { key: 'complaint_ref', label: 'Complaint', render: r => show(r.complaint_ref) },
    ];
    if (!withActions) return cols;
    return [...cols.filter(c => c.key !== 'decided_by'), { key: 'actions', label: '', render: actions }];
}

function Approvals() {
    const { user } = useAuth();
    const list = useLoad(() => careApi.approvals(), []);
    const [rejecting, setRejecting] = useState(null);
    const [paying, setPaying] = useState(null);
    const approve = async (r) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            const d = data(await careApi.approve(r.reversal_ref));
            if (d?.status === 'FAILED') toast.error(d.error || 'Could not be carried out'); else toast.success('Approved');
            list.reload();
        } catch (e) { toast.error(errorText(e)); }
    };
    const actions = (r) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
            {r.status === 'PENDING_APPROVAL' && <>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => approve(r)}>Approve</button>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => setRejecting(r)}>Reject</button>
            </>}
            {r.status === 'AWAITING_PAYOUT' && <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => setPaying(r)}>Record payout</button>}
        </div>
    );
    return (
        <Page title="Reversal approval">
            <Section title="Waiting">
                {list.error && <Notice kind="error">{list.error}</Notice>}
                {list.value && <Table rows={list.value} exportName="Reversals waiting" columns={columns(true, user, actions)} empty="Nothing waiting." />}
            </Section>
            {rejecting && <FormModal title="Reject reversal" fields={[{ name: 'note', label: 'Reason', type: 'textarea', required: true }]}
                onSubmit={x => careApi.reject(rejecting.reversal_ref, x.note)} onClose={() => setRejecting(null)} onDone={list.reload} />}
            {paying && <FormModal title="Record payout" submitLabel="Record"
                fields={[{ name: 'method', label: 'Paid with', type: 'select', required: true, options: PAYOUT_METHODS.map(([value, label]) => ({ value, label })) },
                    { name: 'payoutReference', label: 'Payout reference', required: true }]}
                onSubmit={x => careApi.payout(paying.reversal_ref, x.payoutReference, x.method)} onClose={() => setPaying(null)} onDone={list.reload} />}
        </Page>
    );
}
