import { Table, Badge, minor, show } from './kit';

/** What PayPort recorded for a reference, and the reversals it allows (each with a button supplied by the page). */
export default function TracePanel({ trace, onReverse }) {
    if (!trace) return null;
    if (!trace.found) return <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Nothing found for {trace.reference}.</p>;
    const txs = trace.transactions || [];
    const dups = txs.flatMap(t => (t.possibleDuplicates || []).map(d => ({ ...d, of: t.reference })));
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            {txs.length > 0 && <Table noExport rows={txs} columns={[
                { key: 'reference', label: 'Reference' },
                { key: 'product', label: 'Trxn Type' },
                { key: 'amount_cents', label: 'Amount', render: r => minor(r.amount_cents, r.currency) },
                { key: 'payment_method_name', label: 'Paid with', render: r => r.paidFromWallet ? 'PayPort wallet' : show(r.payment_method_name) },
                { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
                { key: 'outcome', label: 'Customer was told', render: r => r.outcome ? <span title={r.outcomeMessage}>{r.outcome.replace(/_/g, ' ').toLowerCase()}</span> : '—' },
                { key: 'merchant', label: 'To', render: r => show(r.merchant || r.recipient_identifier) },
                { key: 'created_at', label: 'When', render: r => show(r.created_at) },
            ]} />}
            {dups.length > 0 && (
                <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--pill-red)', marginBottom: 6 }}>Possible duplicates</div>
                    <Table noExport rows={dups} columns={[{ key: 'reference', label: 'Reference' }, { key: 'of', label: 'Same as' }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'created_at', label: 'When', render: r => show(r.created_at) }]} />
                </div>
            )}
            {(trace.walletLines || []).length > 0 && <Table noExport rows={trace.walletLines} columns={[
                { key: 'wallet_ref', label: 'Wallet' }, { key: 'kind', label: 'Line', render: r => <Badge value={r.kind} /> },
                { key: 'amount_minor', label: 'Amount', render: r => `${r.direction === 'DR' ? '−' : '+'}${minor(r.amount_minor, r.currency)}` },
                { key: 'counterparty', label: 'Other side' }, { key: 'op_ref', label: 'Operation' }, { key: 'created_at', label: 'When', render: r => show(r.created_at) },
            ]} />}
            {(trace.reversals || []).length > 0 && <Table noExport rows={trace.reversals} columns={[
                { key: 'reversal_ref', label: 'Reversal' }, { key: 'kind', label: 'Type', render: r => <Badge value={r.kind} /> },
                { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'requested_by', label: 'Requested by' }, { key: 'requested_at', label: 'When', render: r => show(r.requested_at) },
            ]} />}
            {onReverse && (trace.options || []).map(o => (
                <div key={o.kind + o.targetRef} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 12 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{o.label}</span>
                    {onReverse(o)}
                </div>
            ))}
        </div>
    );
}
