import { ExportArea } from '../components/kit';
import { useState, useEffect } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, XCircle, HelpCircle, History } from 'lucide-react';
import { uploadReconciliationStatement, listReconciliationRuns, getReconciliationMatches } from '../lib/api';
import toast from 'react-hot-toast';

const PROVIDERS = [
    { value: 'ECOCASH', label: 'EcoCash' },
    { value: 'ONEMONEY', label: 'OneMoney' },
    { value: 'OMARI', label: 'Omari' },
    { value: 'NETONE', label: 'NetOne' },
    { value: 'TELECEL', label: 'Telecel' },
    { value: 'INNBUCKS', label: 'Innbucks' },
];

const TABS = [
    { key: 'MATCHED', label: 'Matched', icon: CheckCircle2, color: 'var(--green)' },
    { key: 'AMOUNT_MISMATCH', label: 'Amount Mismatch', icon: AlertTriangle, color: 'var(--amber)' },
    { key: 'PROVIDER_ONLY', label: 'Provider Only', icon: HelpCircle, color: 'var(--amber)' },
    { key: 'PAYPORT_ONLY', label: 'Payport Only', icon: XCircle, color: 'var(--red)' },
];

function centsToDisplay(cents) {
    if (cents === null || cents === undefined) return '—';
    return `$${(cents / 100).toFixed(2)}`;
}

function UploadCard({ onRunComplete }) {
    const [provider, setProvider] = useState('ECOCASH');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) { setError('Choose a statement file first'); return; }
        setError('');
        setUploading(true);
        try {
            const res = await uploadReconciliationStatement(provider, file);
            const summary = res.data?.data || res.data;
            toast.success(`Reconciled ${summary.totalProviderLines} lines: ${summary.matchedCount} matched, ${summary.providerOnlyCount} provider-only, ${summary.payportOnlyCount} Payport-only`);
            setFile(null);
            onRunComplete(summary.runId);
        } catch (err) {
            setError(err.response?.data?.error?.message || err.response?.data?.message || 'Could not process that statement');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="card" style={{ padding: 24, marginBottom: 28, maxWidth: 680 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={16} /> Upload a Provider Statement
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 16 }}>
                Upload the settlement/statement export you get directly from a provider (Excel, or PDF for Omari).
                It's matched against Payport's own completed transactions for that provider and period.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                    value={provider}
                    onChange={e => setProvider(e.target.value)}
                    style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }}
                >
                    {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <input
                    type="file"
                    accept=".xlsx,.xls,.pdf"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    style={{ flex: 1, minWidth: 200, padding: 8, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }}
                />
                <button type="submit" disabled={uploading} className="btn btn-primary">
                    <Upload size={14} /> {uploading ? 'Processing…' : 'Upload & Reconcile'}
                </button>
            </form>
            {error && <div style={{ marginTop: 12, background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>{error}</div>}
        </div>
    );
}

function RunSummary({ run, active, onSelect }) {
    return (
        <button
            onClick={() => onSelect(run.id)}
            className="card"
            style={{
                padding: 14, marginBottom: 8, width: '100%', textAlign: 'left', cursor: 'pointer',
                border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                <span>{run.provider}</span>
                <span style={{ color: 'var(--text-2)', fontWeight: 400 }}>{new Date(run.uploadedAt).toLocaleString()}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                {run.uploadedFileName} — {run.totalProviderLines} lines by {run.uploadedBy}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--green)' }}>{run.matchedCount} matched</span>
                <span style={{ color: 'var(--amber)' }}>{run.amountMismatchCount} mismatch</span>
                <span style={{ color: 'var(--amber)' }}>{run.providerOnlyCount} provider-only</span>
                <span style={{ color: 'var(--red)' }}>{run.payportOnlyCount} payport-only</span>
            </div>
        </button>
    );
}

function MatchesTable({ matches, tab }) {
    if (!matches.length) {
        return <p style={{ fontSize: 13, color: 'var(--text-2)', padding: 16 }}>No lines in this bucket for this run.</p>;
    }
    return (
        <div style={{ overflowX: 'auto' }}>
            <ExportArea name="Statement reconciliation"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--text-2)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '8px 10px' }}>Payport Reference</th>
                        <th style={{ padding: '8px 10px' }}>Provider Reference</th>
                        <th style={{ padding: '8px 10px' }}>Confidence</th>
                        <th style={{ padding: '8px 10px' }}>Provider Amount</th>
                        <th style={{ padding: '8px 10px' }}>Payport Amount</th>
                        <th style={{ padding: '8px 10px' }}>Phone</th>
                        <th style={{ padding: '8px 10px' }}>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    {matches.map(m => (
                        <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '8px 10px' }}>{m.transactionReference || '—'}</td>
                            <td style={{ padding: '8px 10px' }}>{m.providerReference || '—'}</td>
                            <td style={{ padding: '8px 10px' }}>{m.matchConfidence || '—'}</td>
                            <td style={{ padding: '8px 10px' }}>{centsToDisplay(m.providerAmountCents)}</td>
                            <td style={{ padding: '8px 10px' }}>{centsToDisplay(m.payportAmountCents)}</td>
                            <td style={{ padding: '8px 10px' }}>{m.providerPhone || '—'}</td>
                            <td style={{ padding: '8px 10px' }}>{m.providerTimestamp ? new Date(m.providerTimestamp).toLocaleString() : '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table></ExportArea>
        </div>
    );
}

export default function StatementReconciliationPage() {
    const [runs, setRuns] = useState([]);
    const [selectedRunId, setSelectedRunId] = useState(null);
    const [activeTab, setActiveTab] = useState('MATCHED');
    const [matches, setMatches] = useState([]);
    const [loadingMatches, setLoadingMatches] = useState(false);

    const loadRuns = async () => {
        try {
            const res = await listReconciliationRuns();
            const list = res.data?.data || res.data || [];
            setRuns(list);
            if (list.length && !selectedRunId) setSelectedRunId(list[0].id);
        } catch {
            toast.error('Could not load past reconciliation runs');
        }
    };

    useEffect(() => { loadRuns(); }, []);

    useEffect(() => {
        if (!selectedRunId) return;
        setLoadingMatches(true);
        getReconciliationMatches(selectedRunId, activeTab)
            .then(res => setMatches(res.data?.data || res.data || []))
            .catch(() => toast.error('Could not load reconciliation results'))
            .finally(() => setLoadingMatches(false));
    }, [selectedRunId, activeTab]);

    const handleRunComplete = (runId) => {
        loadRuns();
        setSelectedRunId(runId);
        setActiveTab('PROVIDER_ONLY'); // the bucket most worth a person's attention first
    };

    return (
        <div style={{ padding: 28 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Statement Reconciliation</h1>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24 }}>
                Upload a provider's own statement and see exactly where it agrees or disagrees with Payport's records.
            </p>

            <UploadCard onRunComplete={handleRunComplete} />

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
                <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <History size={14} /> Past Runs
                    </h3>
                    {runs.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--text-2)' }}>No statements uploaded yet.</p>}
                    {runs.map(run => (
                        <RunSummary key={run.id} run={run} active={run.id === selectedRunId} onSelect={setSelectedRunId} />
                    ))}
                </div>

                <div className="card" style={{ padding: 20 }}>
                    {selectedRunId ? (
                        <>
                            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                                {TABS.map(tab => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className="btn"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5,
                                                background: activeTab === tab.key ? 'var(--bg-2)' : 'transparent',
                                                border: activeTab === tab.key ? `1px solid ${tab.color}` : '1px solid var(--border)',
                                                color: activeTab === tab.key ? tab.color : 'var(--text-2)',
                                            }}
                                        >
                                            <Icon size={13} /> {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {loadingMatches ? (
                                <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Loading…</p>
                            ) : (
                                <MatchesTable matches={matches} tab={activeTab} />
                            )}
                        </>
                    ) : (
                        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Upload a statement, or select a past run, to see results here.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
