import { useState } from 'react';
import { ShieldCheck, Play, AlertCircle, Search, Radio, Smartphone, Wallet, CreditCard, Landmark, Signal } from 'lucide-react';
import { runReconciliation, queryNetOneTransaction, queryEcoCashTransaction, queryOmariTransaction, queryZimSwitchTransaction, queryOneMoneyTransaction, queryEconetTransaction } from '../lib/api';
import toast from 'react-hot-toast';
import { CurrencySelect, ExportArea } from '../components/kit';

const TYPE_LABEL = {
    STATUS_MISMATCH: 'Status mismatch',
    AMOUNT_MISMATCH: 'Amount mismatch',
    TRANSACTION_NOT_FOUND: 'Transaction not found',
};

const NETONE_STATUS_BADGE = {
    SUCCESS: 'badge-green',
    PENDING: 'badge-amber',
    BUSY: 'badge-amber',
    FAILED_OR_NOT_FOUND: 'badge-red',
};

function NetOneLookup() {
    const [reference, setReference] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [looking, setLooking] = useState(false);

    const lookup = async (e) => {
        e.preventDefault();
        if (!reference.trim()) return;
        setError('');
        setResult(null);
        setLooking(true);
        try {
            const res = await queryNetOneTransaction(reference.trim());
            setResult(res.data?.data || res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not query NetOne for that reference');
        } finally {
            setLooking(false);
        }
    };

    return (
        <div className="card" style={{ padding: 24, marginBottom: 28, maxWidth: 680 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Radio size={16} /> Query NetOne directly
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 16 }}>
                Look up what NetOne themselves have on file for a specific transaction, covering the last 30 days.
            </p>
            <form onSubmit={lookup} style={{ display: 'flex', gap: 8, marginBottom: error || result ? 16 : 0 }}>
                <input
                    value={reference} onChange={e => setReference(e.target.value)}
                    placeholder="Payport transaction reference, e.g. PP-API-20260822-1234"
                    style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }}
                />
                <button type="submit" disabled={looking} className="btn btn-primary"><Search size={14} /> {looking ? 'Looking…' : 'Query'}</button>
            </form>

            {error && <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>{error}</div>}

            {result && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span className={`badge ${NETONE_STATUS_BADGE[result.status] || 'badge-gray'}`}>{result.status.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{result.replyMsg}</span>
                    </div>
                    {result.rawReply && (
                        <pre style={{ background: 'var(--bg-2)', padding: 14, borderRadius: 10, fontSize: 11.5, overflowX: 'auto', margin: 0 }}>
                            {(() => { try { return JSON.stringify(JSON.parse(result.rawReply), null, 2); } catch { return result.rawReply; } })()}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}

// Generic lookup card for the five providers that don't need NetOne's
// specific badge-color logic -- each just supplies its own fields,
// query function, and result renderer. NetOneLookup above is left as-is
// rather than folded into this, to avoid touching already-working code.
function ProviderLookup({ icon: Icon, title, description, fields, queryFn, renderResult }) {
    const [values, setValues] = useState(() => Object.fromEntries(fields.map(f => [f.name, f.defaultValue || ''])));
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [looking, setLooking] = useState(false);

    const lookup = async (e) => {
        e.preventDefault();
        const missing = fields.some(f => f.required !== false && !String(values[f.name] || '').trim());
        if (missing) return;
        setError('');
        setResult(null);
        setLooking(true);
        try {
            const args = fields.map(f => String(values[f.name] || '').trim());
            const res = await queryFn(...args);
            setResult(res.data?.data || res.data);
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || `Could not query ${title.replace('Query ', '')}`);
        } finally {
            setLooking(false);
        }
    };

    return (
        <div className="card" style={{ padding: 24, marginBottom: 28, maxWidth: 680 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={16} /> {title}
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 16 }}>{description}</p>
            <form onSubmit={lookup} style={{ display: 'flex', gap: 8, marginBottom: error || result ? 16 : 0, flexWrap: 'wrap' }}>
                {fields.map(f => f.type === 'currency' ? (
                    <CurrencySelect key={f.name} value={values[f.name]} onChange={v => setValues(s => ({ ...s, [f.name]: v }))} style={{ minWidth: 120, padding: 10, borderRadius: 10 }} />
                ) : (
                    <input
                        key={f.name}
                        value={values[f.name]}
                        onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
                        placeholder={f.placeholder}
                        style={{ flex: f.flex || 1, minWidth: 160, padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }}
                    />
                ))}
                <button type="submit" disabled={looking} className="btn btn-primary"><Search size={14} /> {looking ? 'Looking…' : 'Query'}</button>
            </form>

            {error && <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>{error}</div>}

            {result && renderResult(result)}
        </div>
    );
}

export default function ReconciliationPage() {
    const [days, setDays] = useState(7);
    const [report, setReport] = useState(null);
    const [running, setRunning] = useState(false);

    const run = async () => {
        setRunning(true);
        try {
            const res = await runReconciliation(days);
            setReport(res.data?.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Reconciliation run failed');
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="op-page">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800 }}>
                <ShieldCheck size={22} /> Reconciliation
            </h1>

            <NetOneLookup />

            <ProviderLookup
                icon={Smartphone}
                title="Query EcoCash directly"
                description="Look up what EcoCash themselves have on file for a specific transaction."
                fields={[
                    { name: 'reference', placeholder: 'Payport reference' },
                    { name: 'mobile', placeholder: 'Customer mobile number' },
                ]}
                queryFn={(reference, mobile) => queryEcoCashTransaction(reference, mobile)}
                renderResult={(r) => (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <span className={`badge ${r.status === 'SUCCESS' ? 'badge-green' : r.status === 'FAILED' ? 'badge-red' : 'badge-amber'}`}>{r.status}</span>
                            <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.providerStatus}</span>
                        </div>
                        <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '0 0 8px' }}>
                            {r.amount} {r.currency} — EcoCash ref: {r.ecocashReference || '—'}
                        </p>
                    </div>
                )}
            />

            <ProviderLookup
                icon={Wallet}
                title="Query Omari directly"
                description="Look up what Omari themselves have on file for a specific transaction."
                fields={[{ name: 'reference', placeholder: 'Omari reference (UUID)' }]}
                queryFn={(reference) => queryOmariTransaction(reference)}
                renderResult={(r) => (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <span className={`badge ${r.error ? 'badge-red' : 'badge-green'}`}>{r.error ? 'ERROR' : 'OK'}</span>
                            <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.message} {r.responseCode ? `(${r.responseCode})` : ''}</span>
                        </div>
                        <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '0 0 8px' }}>
                            {r.amount} {r.currency} — payment ref: {r.paymentReference || '—'}, debit ref: {r.debitReference || '—'}
                        </p>
                    </div>
                )}
            />

            <ProviderLookup
                icon={CreditCard}
                title="Query ZimSwitch directly"
                description="Look up what OPPWA/ZimSwitch themselves have on file for a specific checkout."
                fields={[{ name: 'checkoutId', placeholder: 'ZimSwitch checkout ID' }]}
                queryFn={(checkoutId) => queryZimSwitchTransaction(checkoutId)}
                renderResult={(r) => (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <span className={`badge ${r.status === 'SUCCESS' ? 'badge-green' : r.status === 'FAILED' ? 'badge-red' : 'badge-amber'}`}>{r.status}</span>
                            <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.message}</span>
                        </div>
                        <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '0 0 8px' }}>
                            {r.amountCents != null ? (r.amountCents / 100).toFixed(2) : '—'} — provider ref: {r.providerReference || '—'}
                        </p>
                    </div>
                )}
            />

            <ProviderLookup
                icon={Landmark}
                title="Query OneMoney directly"
                description="Look up what OneMoney themselves have on file for a specific transaction."
                fields={[{ name: 'transOrderNo', placeholder: 'Payport reference' }]}
                queryFn={(transOrderNo) => queryOneMoneyTransaction(transOrderNo)}
                renderResult={(r) => (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <span className={`badge ${r.orderStatus === '30' ? 'badge-green' : r.orderStatus === '40' || r.orderStatus === '50' ? 'badge-red' : 'badge-amber'}`}>
                                Status {r.orderStatus}
                            </span>
                            <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Order: {r.orderNo || '—'}</span>
                        </div>
                        <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '0 0 8px' }}>
                            Ordered {r.orderAmt} {r.currency} — actually charged {r.actAmt ?? '—'}
                        </p>
                    </div>
                )}
            />

            <ProviderLookup
                icon={Signal}
                title="Query Econet directly"
                description="Look up what Econet themselves have on file for a specific airtime/bundle delivery, for the case where a request timed out and the final outcome is unknown."
                fields={[
                    { name: 'reference', placeholder: 'Payport reference' },
                    { name: 'currency', placeholder: 'Currency', defaultValue: 'USD', required: false, type: 'currency' },
                ]}
                queryFn={(reference, currency) => queryEconetTransaction(reference, currency)}
                renderResult={(r) => (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <span className={`badge ${r.success ? 'badge-green' : 'badge-red'}`}>{r.success ? 'SUCCESS' : 'FAILED'}</span>
                            <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.description} {r.statusCode ? `(${r.statusCode})` : ''}</span>
                        </div>
                        <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '0 0 8px' }}>Serial: {r.serial || '—'}</p>
                    </div>
                )}
            />

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 700 }}>Look back</label>
                <select value={days} onChange={e => setDays(Number(e.target.value))}
                    style={{ padding: 8, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }}>
                    <option value={1}>1 day</option>
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                </select>
                <button className="btn btn-primary" onClick={run} disabled={running}>
                    <Play size={14} /> {running ? 'Running…' : 'Run check'}
                </button>
            </div>

            {report && (
                <>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                        <div className="card" style={{ padding: 18, flex: 1 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700, marginBottom: 6 }}>SESSIONS CHECKED</div>
                            <div style={{ fontSize: 24, fontWeight: 800 }}>{report.sessionsChecked}</div>
                        </div>
                        <div className="card" style={{ padding: 18, flex: 1 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700, marginBottom: 6 }}>DISCREPANCIES</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: report.discrepanciesFound > 0 ? 'var(--red)' : 'var(--green)' }}>
                                {report.discrepanciesFound}
                            </div>
                        </div>
                    </div>

                    {report.discrepanciesFound === 0 ? (
                        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--green)' }}>
                            Everything checked out — no discrepancies found over the last {days} day{days === 1 ? '' : 's'}.
                        </div>
                    ) : (
                        <div className="card" style={{ padding: 0 }}>
                            <ExportArea name="Reconciliation"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', fontSize: 11.5, textTransform: 'uppercase', color: 'var(--text-2)' }}>
                                        <th style={{ padding: '12px 16px' }}>Session</th>
                                        <th style={{ padding: '12px 16px' }}>Type</th>
                                        <th style={{ padding: '12px 16px' }}>Session status</th>
                                        <th style={{ padding: '12px 16px' }}>Transaction status</th>
                                        <th style={{ padding: '12px 16px' }}>Detail</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.discrepancies.map((d, i) => (
                                        <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12.5 }}>{d.sessionReference}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <AlertCircle size={11} /> {TYPE_LABEL[d.type] || d.type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{d.sessionStatus}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{d.transactionStatus || '—'}</td>
                                            <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--text-2)' }}>{d.detail}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table></ExportArea>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
