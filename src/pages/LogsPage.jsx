import { ExportArea } from '../components/kit';
import { useState, useEffect, useMemo } from 'react';
import { ScrollText, RefreshCw, Search, X } from 'lucide-react';
import { getAuditLogs, getNotificationLogs, formatDate } from '../lib/api';

const TABS = ['Audit Trail', 'Notifications'];

export default function LogsPage() {
  const [tab, setTab] = useState('Audit Trail');
  const [auditLogs, setAuditLogs] = useState([]);
  const [notifLogs, setNotifLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchRef, setSearchRef] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);

  const loadAudit = async (ref = '') => {
    setLoading(true);
    try {
      const r = await getAuditLogs(ref ? { reference: ref } : { size: 100 });
      setAuditLogs(r.data?.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  const loadNotif = async () => {
    setLoading(true);
    try {
      const r = await getNotificationLogs();
      setNotifLogs(r.data?.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    setSearch('');
    if (tab === 'Audit Trail') loadAudit();
    else loadNotif();
  }, [tab]);

  const STATUS_COLOR = { COMPLETED: 'badge-green', PENDING: 'badge-amber', FAILED: 'badge-red', SENT: 'badge-green' };

  // Client-side search across every field currently loaded — not just
  // reference. Backend doesn't support broader filtering for notifications
  // at all yet, so this is what makes "search the logs" actually possible
  // today without waiting on a backend change.
  const filteredAudit = useMemo(() => {
    if (!search.trim()) return auditLogs;
    const q = search.toLowerCase();
    return auditLogs.filter(log =>
      [log.transactionReference, log.actor, log.notes, log.fromStatus, log.toStatus]
        .some(v => v && String(v).toLowerCase().includes(q))
    );
  }, [auditLogs, search]);

  const filteredNotif = useMemo(() => {
    if (!search.trim()) return notifLogs;
    const q = search.toLowerCase();
    return notifLogs.filter(n =>
      [n.recipientPhone, n.messageType, n.messageBody, n.status]
        .some(v => v && String(v).toLowerCase().includes(q))
    );
  }, [notifLogs, search]);

  return (
    <div className="op-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ScrollText size={22} /> System Logs
          </h1>
        </div>
        <button onClick={() => tab === 'Audit Trail' ? loadAudit(searchRef) : loadNotif()} className="btn btn-ghost">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-2)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            background: tab === t ? 'var(--bg-card)' : 'transparent',
            color: tab === t ? 'var(--blue)' : 'var(--text-2)',
          }}>{t}</button>
        ))}
      </div>

      {/* Search — filters whatever is currently loaded, across every field */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'Audit Trail' ? 'Search actor, notes, status...' : 'Search recipient, message, status...'}
            style={{ width: '100%', paddingLeft: 36 }}
          />
        </div>
        {tab === 'Audit Trail' && (
          <>
            <input value={searchRef} onChange={e => setSearchRef(e.target.value)}
              placeholder="Filter by transaction reference (server-side)..."
              style={{ flex: 1, maxWidth: 320 }}
              onKeyDown={e => e.key === 'Enter' && loadAudit(searchRef)}
            />
            <button onClick={() => loadAudit(searchRef)} className="btn btn-primary"><Search size={14} /></button>
            {searchRef && <button onClick={() => { setSearchRef(''); loadAudit(''); }} className="btn btn-ghost">Clear</button>}
          </>
        )}
      </div>

      {/* Audit tab */}
      {tab === 'Audit Trail' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <ExportArea name="Logs"><table>
                <thead><tr><th>Time</th><th>Reference</th><th>Transition</th><th>Actor</th><th>Notes</th></tr></thead>
                <tbody>
                  {filteredAudit.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)' }}>No logs found</td></tr>
                  ) : filteredAudit.map((log, i) => (
                    <tr key={i} onClick={() => setDetail({ type: 'audit', data: log })} style={{ cursor: 'pointer' }}>
                      <td style={{ fontSize: 11, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{log.transactionReference}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {log.fromStatus && <span className="badge badge-gray" style={{ fontSize: 10 }}>{log.fromStatus}</span>}
                          {log.fromStatus && <span style={{ color: 'var(--text-2)', fontSize: 12 }}>→</span>}
                          <span className={`badge ${log.toStatus?.includes('COMPLETED') ? 'badge-green' : log.toStatus?.includes('FAIL') ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: 10 }}>{log.toStatus}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{log.actor}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></ExportArea>
            </div>
          )}
        </div>
      )}

      {/* Notifications tab */}
      {tab === 'Notifications' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
          ) : (
            <ExportArea name="Logs"><table>
              <thead><tr><th>Time</th><th>Recipient</th><th>Type</th><th>Message</th><th>Status</th></tr></thead>
              <tbody>
                {filteredNotif.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)' }}>No notification logs</td></tr>
                ) : filteredNotif.map((n, i) => (
                  <tr key={i} onClick={() => setDetail({ type: 'notif', data: n })} style={{ cursor: 'pointer' }}>
                    <td style={{ fontSize: 11, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{formatDate(n.createdAt)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{n.recipientPhone}</td>
                    <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{n.messageType}</span></td>
                    <td style={{ fontSize: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.messageBody}</td>
                    <td><span className={`badge ${STATUS_COLOR[n.status] || 'badge-gray'}`} style={{ fontSize: 10 }}>{n.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table></ExportArea>
          )}
        </div>
      )}

      {/* Drill-down modal — every field, in full, no truncation */}
      {detail && (
        <div onClick={() => setDetail(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{
            maxWidth: 640, width: '100%', maxHeight: '80vh', overflowY: 'auto', position: 'relative',
          }}>
            <button onClick={() => setDetail(null)} style={{
              position: 'absolute', top: 16, right: 16, background: 'var(--bg-2)', border: 'none',
              borderRadius: 8, padding: 6, cursor: 'pointer',
            }}><X size={16} /></button>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>
              {detail.type === 'audit' ? 'Audit Log Entry' : 'Notification Log Entry'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(detail.data).map(([key, value]) => (
                <div key={key} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    {key}
                  </div>
                  <div style={{ fontSize: 13, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {value === null || value === undefined || value === '' ? '—' : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
