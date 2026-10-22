import { useState, useEffect } from 'react';
import { MessageCircleQuestion, RefreshCw, Send, Paperclip, Search, RotateCcw, X } from 'lucide-react';
import { getQueries, getQueryByReference, addQueryMessage, getQueryMessages, setQueryStatus, getQueryAttachments, getQueryAttachmentUrl, uploadQueryAttachment, formatDate } from '../lib/api';
import toast from 'react-hot-toast';

const STATUS_BADGE = { OPEN: 'badge-amber', IN_PROGRESS: 'badge-blue', RESOLVED: 'badge-green' };

function Attachments({ queryId }) {
    const [attachments, setAttachments] = useState(null);

    useEffect(() => {
        getQueryAttachments(queryId).then(res => setAttachments(res.data?.data || res.data || []));
    }, [queryId]);

    if (!attachments || attachments.length === 0) return null;

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {attachments.map(a => (
                <a
                    key={a.id} href={getQueryAttachmentUrl(queryId, a.id)} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 10px', background: 'var(--bg-2)', borderRadius: 8, color: 'var(--blue)', textDecoration: 'none' }}
                >
                    <Paperclip size={12} /> {a.originalFilename}
                </a>
            ))}
        </div>
    );
}

function QueryThread({ query, onChanged }) {
    const [messages, setMessages] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [attachFile, setAttachFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(query.status);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [attachmentRefreshKey, setAttachmentRefreshKey] = useState(0);

    const load = () => {
        getQueryMessages(query.id).then(res => setMessages(res.data?.data || res.data || []));
    };

    useEffect(load, [query.id]);

    const send = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !attachFile) return;
        setSending(true);
        try {
            if (newMessage.trim()) {
                await addQueryMessage(query.id, newMessage.trim());
            }
            if (attachFile) {
                try {
                    await uploadQueryAttachment(query.id, attachFile);
                    setAttachmentRefreshKey(k => k + 1);
                } catch {
                    toast.error("Message sent, but the file didn't upload — try attaching it again.");
                }
            }
            setNewMessage('');
            setAttachFile(null);
            load();
            onChanged();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not send message');
        } finally {
            setSending(false);
        }
    };

    const changeStatus = async (newStatus) => {
        setUpdatingStatus(true);
        try {
            await setQueryStatus(query.id, newStatus);
            setStatus(newStatus);
            toast.success(`Marked ${newStatus.replace('_', ' ').toLowerCase()}`);
            onChanged();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    return (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            {messages === null ? (
                <p style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Loading…</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                    {messages.map(m => (
                        m.eventType === 'REOPENED' ? (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--amber)', fontWeight: 700, padding: '4px 0' }}>
                                <RotateCcw size={12} /> Reopened by {m.senderName || 'merchant'} · {formatDate(m.createdAt)}
                                {m.message && <span style={{ fontWeight: 400, color: 'var(--text-2)' }}> — {m.message}</span>}
                            </div>
                        ) : (
                            <div key={m.id} style={{
                                alignSelf: m.senderType === 'STAFF' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                background: m.senderType === 'STAFF' ? 'rgba(6,163,218,0.10)' : 'var(--bg-2)',
                                borderRadius: 10, padding: '10px 12px',
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: m.senderType === 'STAFF' ? 'var(--blue)' : 'var(--text-2)', marginBottom: 3 }}>
                                    {m.senderType === 'STAFF' ? `You${m.senderName ? ' — ' + m.senderName : ''}` : (m.senderName || 'Merchant')}
                                </div>
                                <div style={{ fontSize: 13.5 }}>{m.message}</div>
                                <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 4 }}>{formatDate(m.createdAt)}</div>
                            </div>
                        )
                    ))}
                </div>
            )}

            <Attachments key={attachmentRefreshKey} queryId={query.id} />

            <form onSubmit={send} style={{ marginBottom: 10 }}>
                {attachFile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 8, color: 'var(--text-2)' }}>
                        <Paperclip size={12} /> {attachFile.name}
                        <button type="button" onClick={() => setAttachFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={12} /></button>
                    </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                    <textarea
                        value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Respond to the merchant…"
                        rows={2} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'flex-end' }}>
                        <label className="btn btn-ghost" style={{ cursor: 'pointer', fontSize: 12.5, padding: '9px 12px' }} title="Attach a document">
                            <Paperclip size={13} />
                            <input type="file" onChange={e => setAttachFile(e.target.files?.[0] || null)} accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} />
                        </label>
                        <button type="submit" disabled={sending || (!newMessage.trim() && !attachFile)} className="btn btn-primary" style={{ fontSize: 12.5 }}>
                            <Send size={13} /> Send
                        </button>
                    </div>
                </div>
            </form>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-2)', fontWeight: 700 }}>Status:</span>
                <select value={status} onChange={e => changeStatus(e.target.value)} disabled={updatingStatus} style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 12.5 }}>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                </select>
            </div>
        </div>
    );
}

export default function QueriesPage() {
    const [queries, setQueries] = useState([]);
    const [statusFilter, setStatusFilter] = useState('OPEN');
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResult, setSearchResult] = useState(null);
    const [searchError, setSearchError] = useState('');

    const load = () => {
        setLoading(true);
        getQueries()
            .then(res => setQueries(res.data?.data || []))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const runSearch = async (e) => {
        e.preventDefault();
        if (!search.trim()) { setSearchResult(null); return; }
        setSearchError('');
        setSearching(true);
        try {
            const res = await getQueryByReference(search.trim());
            const q = res.data?.data || res.data;
            setSearchResult(q);
            setExpandedId(q.id);
        } catch (err) {
            setSearchResult(null);
            setSearchError(err.response?.data?.message || 'No query found with that reference');
        } finally {
            setSearching(false);
        }
    };

    const clearSearch = () => {
        setSearch('');
        setSearchResult(null);
        setSearchError('');
    };

    const displayed = searchResult ? [searchResult] : (statusFilter === 'ALL' ? queries : queries.filter(q => q.status === statusFilter));

    return (
        <div style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800 }}>
                        <MessageCircleQuestion size={22} /> Merchant Queries
                    </h1>
                </div>
                <button className="btn btn-ghost" onClick={load}><RefreshCw size={14} /> Refresh</button>
            </div>

            <form onSubmit={runSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by query reference, e.g. QRY-20260822-4471"
                    style={{ flex: '1 1 320px', maxWidth: 420, padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }}
                />
                <button type="submit" disabled={searching} className="btn btn-ghost"><Search size={14} /> Search</button>
                {searchResult && <button type="button" onClick={clearSearch} className="btn btn-ghost">Clear</button>}
            </form>
            {searchError && <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{searchError}</div>}

            {!searchResult && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ALL'].map(s => (
                        <button
                            key={s} onClick={() => setStatusFilter(s)}
                            className={statusFilter === s ? 'btn btn-primary' : 'btn btn-ghost'}
                            style={{ padding: '8px 16px', fontSize: 13 }}
                        >{s.replace('_', ' ')}</button>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div>
            ) : displayed.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>No {statusFilter !== 'ALL' ? statusFilter.toLowerCase().replace('_', ' ') : ''} queries.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {displayed.map(q => (
                        <div key={q.id} className="card" style={{ padding: 20 }}>
                            <button
                                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                            <span style={{ fontWeight: 700, fontSize: 15 }}>{q.subject}</span>
                                            <span className={`badge ${STATUS_BADGE[q.status] || 'badge-gray'}`}>{q.status.replace('_', ' ')}</span>
                                        </div>
                                        <div style={{ fontSize: 12.5, color: 'var(--text-2)', fontFamily: 'monospace' }}>
                                            {q.referenceNumber || `#${q.id}`} · {q.merchantName} · Transaction #{q.checkoutSessionId} · {formatDate(q.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            </button>

                            {expandedId === q.id && (
                                <QueryThread query={q} onChanged={load} />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
