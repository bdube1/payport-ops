import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Building2, CheckCircle, XCircle, PauseCircle, PlayCircle, Copy, RefreshCw, Percent, FileText, MessageSquarePlus, Edit3, Eye, Search } from 'lucide-react';
import {
    getMerchants, rejectMerchant, suspendMerchant, reactivateMerchant,
    getDefaultCommission, setDefaultCommission, setMerchantCommission, formatDate,
    getMerchantDocuments, getMerchantDocumentUrl, requestMerchantInfo, getMerchantReviewNotes, opsExtraApi,
    startMerchantReview, updateMerchantDetails, api, merchantUsersApi,
} from '../lib/api';
import { ShowOnce } from '../components/kit';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  PENDING: 'badge-amber',
  UNDER_REVIEW: 'badge-blue',
  UPDATE_REQUIRED: 'badge-red',
  ACTIVE: 'badge-green',
  SUSPENDED: 'badge-red',
  CLOSED: 'badge-gray',
  REJECTED: 'badge-red',
};

function RejectModal({ merchant, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 440, border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Reject {merchant.businessName}</h2>
        <textarea
          value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Why is this application being rejected?"
          style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-danger" disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())} style={{ flex: 1 }}>Reject</button>
        </div>
      </div>
    </div>
  );
}

function ApprovalKeyModal({ result, onClose }) {
  const key = result.testApiKey;
  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied'); };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 520, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <CheckCircle size={20} color="var(--green)" />
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>{result.businessName} approved</h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 700, marginBottom: 16 }}>{key.warning}</p>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase' }}>Public key</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <code style={{ flex: 1, padding: 10, background: 'var(--bg-2)', borderRadius: 8, fontSize: 12.5, overflowX: 'auto' }}>{key.publicKey}</code>
          <button className="btn btn-ghost" onClick={() => copy(key.publicKey)}><Copy size={14} /></button>
        </div>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase' }}>Secret key</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <code style={{ flex: 1, padding: 10, background: 'var(--bg-2)', borderRadius: 8, fontSize: 12.5, overflowX: 'auto' }}>{key.secretKey}</code>
          <button className="btn btn-ghost" onClick={() => copy(key.secretKey)}><Copy size={14} /></button>
        </div>
        <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>I've saved this — close</button>
      </div>
    </div>
  );
}

function CommissionModal({ merchant, onClose, onSaved }) {
  const [bps, setBps] = useState(merchant.commissionRateBps != null ? (merchant.commissionRateBps / 100).toString() : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const value = bps.trim() === '' ? null : Math.round(parseFloat(bps) * 100);
      await setMerchantCommission(merchant.id, value);
      toast.success('Commission rate updated');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update commission rate');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400, border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{merchant.businessName}'s commission rate</h2>
        <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 18 }}>
          Leave blank to use the platform default ({merchant.effectiveCommissionBps != null ? (merchant.effectiveCommissionBps / 100).toFixed(2) : '—'}% currently applies).
        </p>
        {error && <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Override rate (%)</label>
        <input type="number" step="0.01" min="0" max="100" value={bps} onChange={e => setBps(e.target.value)} placeholder="e.g. 2.5"
          style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', marginBottom: 20, boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>{submitting ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

function DefaultCommissionCard() {
  const [defaultBps, setDefaultBps] = useState(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    getDefaultCommission().then(res => {
      const bps = (res.data?.data || res.data)?.defaultBps;
      setDefaultBps(bps);
      setValue(bps != null ? (bps / 100).toString() : '');
    });
  };

  useEffect(load, []);

  const save = async () => {
    setSubmitting(true);
    try {
      await setDefaultCommission(Math.round(parseFloat(value) * 100));
      toast.success('Platform default commission updated');
      setEditing(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update default rate');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Percent size={18} color="var(--text-2)" />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Platform default commission rate</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Applies to every merchant without an individual override</div>
        </div>
      </div>
      {editing ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="number" step="0.01" min="0" max="100" value={value} onChange={e => setValue(e.target.value)}
            style={{ width: 90, padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }} />
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>%</span>
          <button onClick={save} disabled={submitting} className="btn btn-primary" style={{ fontSize: 12.5 }}>{submitting ? 'Saving…' : 'Save'}</button>
          <button onClick={() => setEditing(false)} className="btn btn-ghost" style={{ fontSize: 12.5 }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 800 }}>{defaultBps != null ? (defaultBps / 100).toFixed(2) : '—'}%</span>
          <button onClick={() => setEditing(true)} className="btn btn-ghost" style={{ fontSize: 12.5 }}>Edit</button>
        </div>
      )}
    </div>
  );
}

function MerchantDetailModal({ merchant, onClose, onChanged, onApprove, onReject }) {
  const [docs, setDocs] = useState(null);
  const [notes, setNotes] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    businessName: merchant.businessName,
    businessCategory: merchant.businessCategory || '',
    contactEmail: merchant.contactEmail,
    contactPhone: merchant.contactPhone,
  });
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [infoNote, setInfoNote] = useState('');
  const [busy, setBusy] = useState(false);

  const [logins, setLogins] = useState(null);
  const [secret, setSecret] = useState(null);

  const load = () => {
    getMerchantDocuments(merchant.id).then(res => setDocs(res.data?.data || res.data || []));
    getMerchantReviewNotes(merchant.id).then(res => setNotes(res.data?.data || res.data || []));
    merchantUsersApi.list(merchant.id).then(res => setLogins(res.data?.data || [])).catch(() => setLogins([]));
  };

  const resetLogin = async (u) => {
    if (!window.confirm(`Reset the password for ${u.email}?`)) return;
    try {
      const r = await merchantUsersApi.resetPassword(merchant.id, u.id);
      const d = r.data?.data || {};
      setSecret({
        title: 'Temporary password',
        note: d.emailed ? 'This was also emailed to the user. It is shown only once.' : 'Email could not be sent. Give this to the user; it is shown only once.',
        items: [{ label: 'Sign-in email', value: d.email }, { label: 'Temporary password', value: d.temporaryPassword }],
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reset the password');
    }
  };

  useEffect(load, [merchant.id]);

  const saveEdit = async () => {
    setBusy(true);
    try {
      await updateMerchantDetails(merchant.id, editForm);
      toast.success('Merchant details updated');
      setEditing(false);
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save changes');
    } finally {
      setBusy(false);
    }
  };

  const startReview = async () => {
    setBusy(true);
    try {
      await startMerchantReview(merchant.id);
      toast.success('Marked as under review');
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start review');
    } finally {
      setBusy(false);
    }
  };

  const sendRequestInfo = async () => {
    if (!infoNote.trim()) return;
    setBusy(true);
    try {
      await requestMerchantInfo(merchant.id, infoNote.trim());
      toast.success('Request sent — an email has gone to the applicant');
      setShowRequestInfo(false);
      setInfoNote('');
      load();
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send request');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 4 }}>{merchant.businessName}</h2>
            {merchant.applicationReference && <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>Application {merchant.applicationReference}</div>}
            <span className={`badge ${STATUS_BADGE[merchant.status] || 'badge-gray'}`}>{merchant.status}</span>
            {merchant.riskScore > 0 && (
              <span className="badge badge-amber" style={{ marginLeft: 8 }}>Risk score: {merchant.riskScore}</span>
            )}
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn btn-ghost" style={{ fontSize: 12.5 }}>
              <Edit3 size={13} /> Edit details
            </button>
          )}
        </div>

        {editing ? (
          <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: 18, marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Business name</label>
            <input value={editForm.businessName} onChange={e => setEditForm(f => ({ ...f, businessName: e.target.value }))} style={{ width: '100%', marginBottom: 12 }} />
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Category</label>
            <input value={editForm.businessCategory} onChange={e => setEditForm(f => ({ ...f, businessCategory: e.target.value }))} style={{ width: '100%', marginBottom: 12 }} />
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Contact email</label>
            <input value={editForm.contactEmail} onChange={e => setEditForm(f => ({ ...f, contactEmail: e.target.value }))} style={{ width: '100%', marginBottom: 12 }} />
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Contact phone</label>
            <input value={editForm.contactPhone} onChange={e => setEditForm(f => ({ ...f, contactPhone: e.target.value }))} style={{ width: '100%', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditing(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={saveEdit} disabled={busy} className="btn btn-primary" style={{ flex: 1 }}>{busy ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, marginBottom: 20 }}>
            <div><span style={{ color: 'var(--text-2)' }}>Registration #</span><br />{merchant.registrationNumber}</div>
            <div><span style={{ color: 'var(--text-2)' }}>Category</span><br />{merchant.businessCategory || '—'}</div>
            <div><span style={{ color: 'var(--text-2)' }}>Email</span><br />{merchant.contactEmail}</div>
            <div><span style={{ color: 'var(--text-2)' }}>Phone</span><br />{merchant.contactPhone}</div>
            <div><span style={{ color: 'var(--text-2)' }}>Applied</span><br />{formatDate(merchant.createdAt)}</div>
            <div><span style={{ color: 'var(--text-2)' }}>Currency</span><br />{merchant.defaultCurrency}</div>
          </div>
        )}

        {merchant.riskFlags && (
          <div style={{ background: 'var(--badge-amber)', color: '#92600A', padding: '10px 14px', borderRadius: 10, fontSize: 12.5, marginBottom: 20 }}>
            <strong>Risk flags:</strong> {merchant.riskFlags}
          </div>
        )}

        <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={14} /> KYC Documents
        </h3>
        {docs === null ? (
          <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 20 }}>Loading…</p>
        ) : docs.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 20 }}>No documents submitted yet.</p>
        ) : (
          <div style={{ marginBottom: 20 }}>
            {docs.map(d => (
              <a key={d.id} href={getMerchantDocumentUrl(merchant.id, d.id)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '8px 0', borderBottom: '1px solid var(--border)', color: 'var(--blue)', textDecoration: 'none' }}>
                <FileText size={13} />
                <span style={{ fontWeight: 600 }}>{d.documentType?.replace(/_/g, ' ')}</span>
                <span style={{ color: 'var(--text-faint)' }}>— {d.originalFilename}</span>
              </a>
            ))}
          </div>
        )}

        <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 10 }}>Portal logins</h3>
        {logins === null ? (
          <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 20 }}>Loading…</p>
        ) : logins.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 20 }}>No logins.</p>
        ) : (
          <div style={{ marginBottom: 20 }}>
            {logins.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600 }}>{u.fullName}</span>
                <span style={{ color: 'var(--text-2)', flex: 1 }}>{u.email} · {u.role}</span>
                {u.accountLocked && <span className="badge badge-red">LOCKED</span>}
                {u.mustChangePassword && <span className="badge badge-amber">TEMPORARY PASSWORD</span>}
                <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11.5 }} onClick={() => resetLogin(u)}>Reset password</button>
              </div>
            ))}
          </div>
        )}

        <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 10 }}>Review Notes</h3>
        {notes === null ? (
          <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 20 }}>Loading…</p>
        ) : notes.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 20 }}>None yet.</p>
        ) : (
          <div style={{ marginBottom: 20 }}>
            {notes.map(n => (
              <div key={n.id} style={{ fontSize: 12.5, marginBottom: 8, display: 'flex', gap: 8 }}>
                <span className={`badge ${n.status === 'OPEN' ? 'badge-amber' : 'badge-green'}`} style={{ flexShrink: 0 }}>{n.status}</span>
                <span style={{ flex: 1 }}>{n.note}</span>
                {n.status === 'OPEN' && (
                  <button className="btn btn-ghost" style={{ padding: '2px 10px', fontSize: 11.5 }}
                    onClick={() => opsExtraApi.resolveMerchantNote(merchant.id, n.id)
                      .then(() => getMerchantReviewNotes(merchant.id).then(res => setNotes(res.data?.data || res.data || [])))
                      .catch(e => toast.error(e?.response?.data?.message || 'Could not resolve the note'))}>Mark resolved</button>
                )}
              </div>
            ))}
          </div>
        )}

        {showRequestInfo && (
          <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>What do you need from the applicant?</label>
            <textarea
              value={infoNote} onChange={e => setInfoNote(e.target.value)} rows={3}
              placeholder="e.g. Your Business Registration Certificate is missing — please upload it."
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }}
            />
            <p style={{ fontSize: 11.5, color: 'var(--text-2)', marginBottom: 12 }}>
              This emails the applicant directly and moves their status to Update Required.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowRequestInfo(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={sendRequestInfo} disabled={busy || !infoNote.trim()} className="btn btn-primary" style={{ flex: 1 }}>Send request</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          {merchant.status === 'PENDING' && (
            <button onClick={startReview} disabled={busy} className="btn btn-ghost" style={{ fontSize: 12.5 }}>Start review</button>
          )}
          {(merchant.status === 'PENDING' || merchant.status === 'UNDER_REVIEW' || merchant.status === 'UPDATE_REQUIRED') && !showRequestInfo && (
            <button onClick={() => setShowRequestInfo(true)} className="btn btn-ghost" style={{ fontSize: 12.5 }}>
              <MessageSquarePlus size={13} /> Request more info
            </button>
          )}
          {(merchant.status === 'PENDING' || merchant.status === 'UNDER_REVIEW' || merchant.status === 'UPDATE_REQUIRED') && (
            <>
              <button onClick={() => onApprove(merchant)} className="btn btn-primary" style={{ fontSize: 12.5 }}>
                <CheckCircle size={13} /> Review (KYB)
              </button>
              <button onClick={() => onReject(merchant)} className="btn btn-danger" style={{ fontSize: 12.5 }}>
                <XCircle size={13} /> Reject
              </button>
            </>
          )}
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 12.5, marginLeft: 'auto' }}>Close</button>
        </div>
      </div>
      {secret && <ShowOnce {...secret} onClose={() => setSecret(null)} />}
    </div>
  );
}

export default function MerchantsPage() {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [approvalResult, setApprovalResult] = useState(null);
  const [commissionTarget, setCommissionTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMerchants(statusFilter === 'ALL' ? null : statusFilter, debouncedSearch);
      setMerchants(res.data?.data || []);
    } catch {
      toast.error('Failed to load merchants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter, debouncedSearch]);

  // Approval is four-eyes (recommend, then a different person decides) with server-side sanctions
  // screening: it happens on the KYB review screen, never with one click here.
  const handleApprove = (m) => navigate(`/kyb?merchant=${m.id}`);

  const handleReject = async (reason) => {
    setBusyId(rejectTarget.id);
    try {
      await rejectMerchant(rejectTarget.id, reason);
      toast.success('Application rejected');
      setRejectTarget(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reject');
    } finally { setBusyId(null); }
  };

  const handleSuspend = async (m) => {
    if (!window.confirm(`Suspend ${m.businessName}?`)) return;
    setBusyId(m.id);
    try { await suspendMerchant(m.id); toast.success('Merchant suspended'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed to suspend'); }
    finally { setBusyId(null); }
  };

  const handleReactivate = async (m) => {
    if (!window.confirm(`Reactivate ${m.businessName}?`)) return;
    setBusyId(m.id);
    try { await reactivateMerchant(m.id); toast.success('Merchant reactivated'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed to reactivate'); }
    finally { setBusyId(null); }
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800 }}>
            <Building2 size={22} /> Merchants
          </h1>
        </div>
        <button className="btn btn-ghost" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </div>

      <DefaultCommissionCard />

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by application reference, business name, registration number, email or phone…"
        style={{ width: '100%', maxWidth: 420, marginBottom: 14 }}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['PENDING', 'UNDER_REVIEW', 'UPDATE_REQUIRED', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'ALL'].map(s => (
          <button
            key={s} onClick={() => setStatusFilter(s)}
            className={statusFilter === s ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ padding: '8px 16px', fontSize: 13 }}
          >{s}</button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div>
      ) : merchants.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} merchants.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {merchants.map(m => (
            <div key={m.id} className="card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ minWidth: 240 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{m.businessName}</span>
                  <span className={`badge ${STATUS_BADGE[m.status] || 'badge-gray'}`}>{m.status}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {m.applicationReference && <span style={{ fontFamily: 'var(--font-mono)' }}>Application {m.applicationReference}</span>}
                  <span>Reg #{m.registrationNumber} {m.businessCategory ? `· ${m.businessCategory}` : ''}</span>
                  <span>{m.contactEmail} · {m.contactPhone}</span>
                  <span>Applied {formatDate(m.createdAt)}</span>
                  {m.status === 'ACTIVE' && (
                    <span>
                      Commission: {m.effectiveCommissionBps != null ? (m.effectiveCommissionBps / 100).toFixed(2) : '—'}%
                      {m.commissionRateBps == null ? ' (platform default)' : ' (custom)'}
                    </span>
                  )}
                  {m.status === 'REJECTED' && m.rejectionReason && (
                    <span style={{ color: 'var(--red)' }}>Reason: {m.rejectionReason}</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setDetailTarget(m)} style={{ fontSize: 12.5 }}>
                  <Eye size={14} /> View
                </button>
                {m.status === 'PENDING' && (
                  <>
                    <button className="btn btn-primary" disabled={busyId === m.id} onClick={() => handleApprove(m)} style={{ fontSize: 12.5 }}>
                      <CheckCircle size={14} /> Review (KYB)
                    </button>
                    <button className="btn btn-danger" disabled={busyId === m.id} onClick={() => setRejectTarget(m)} style={{ fontSize: 12.5 }}>
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}
                {m.status === 'ACTIVE' && (
                  <>
                    <button className="btn btn-ghost" disabled={busyId === m.id} onClick={() => setCommissionTarget(m)} style={{ fontSize: 12.5 }}>
                      <Percent size={14} /> Commission
                    </button>
                    <button className="btn btn-ghost" disabled={busyId === m.id} onClick={() => handleSuspend(m)} style={{ fontSize: 12.5 }}>
                      <PauseCircle size={14} /> Suspend
                    </button>
                  </>
                )}
                {m.status === 'SUSPENDED' && (
                  <button className="btn btn-primary" disabled={busyId === m.id} onClick={() => handleReactivate(m)} style={{ fontSize: 12.5 }}>
                    <PlayCircle size={14} /> Reactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectTarget && <RejectModal merchant={rejectTarget} onConfirm={handleReject} onClose={() => setRejectTarget(null)} />}
      {approvalResult && <ApprovalKeyModal result={approvalResult} onClose={() => setApprovalResult(null)} />}
      {commissionTarget && <CommissionModal merchant={commissionTarget} onClose={() => setCommissionTarget(null)} onSaved={load} />}
      {detailTarget && (
        <MerchantDetailModal
          merchant={detailTarget}
          onClose={() => setDetailTarget(null)}
          onChanged={load}
          onApprove={(m) => { setDetailTarget(null); handleApprove(m); }}
          onReject={(m) => { setDetailTarget(null); setRejectTarget(m); }}
        />
      )}
    </div>
  );
}
