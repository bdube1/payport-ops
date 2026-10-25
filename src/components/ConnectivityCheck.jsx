import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { Section, Notice, Table, Badge, data, errorText } from './kit';

const label = (s) => ({ REACHABLE: 'Reachable', NOT_CONFIGURED: 'Not set', TIMED_OUT: 'Timed out', REFUSED: 'Refused', DNS_FAILED: 'DNS failed', ERROR: 'Error' }[s] || s);

/** Checks, from the gateway's own server, every provider connection and the public callback addresses. */
export default function ConnectivityCheck() {
    const [res, setRes] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const run = async () => {
        setBusy(true); setError('');
        try { setRes(data(await api.get('/admin/integrations/connectivity'))); }
        catch (e) { setError(errorText(e)); }
        finally { setBusy(false); }
    };
    const pill = (s) => <span className={`badge ${s === 'REACHABLE' ? 'badge-green' : s === 'NOT_CONFIGURED' ? 'badge-gray' : 'badge-red'}`}>{label(s)}</span>;
    return (
        <Section title="Connectivity" right={<button className="btn btn-primary btn-sm" onClick={run} disabled={busy}><RefreshCw size={13} style={busy ? { animation: 'spin 1s linear infinite' } : undefined} /> {busy ? 'Checking…' : 'Run check'}</button>}>
            {error && <Notice kind="error">{error}</Notice>}
            {!res && !busy && <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Run the check to test every provider connection and callback address from the gateway server.</p>}
            {res && (
                <>
                    <h3 style={{ fontSize: 13.5, fontWeight: 700, margin: '4px 0 8px' }}>Providers</h3>
                    <Table rows={res.providers} exportName="Provider connectivity" columns={[
                        { key: 'name', label: 'Provider' }, { key: 'target', label: 'Address' }, { key: 'ip', label: 'IP' },
                        { key: 'status', label: 'Status', render: r => pill(r.status) }, { key: 'ms', label: 'ms' }, { key: 'detail', label: 'Detail' },
                    ]} />
                    <h3 style={{ fontSize: 13.5, fontWeight: 700, margin: '18px 0 8px' }}>Callbacks</h3>
                    <Table rows={res.callbacks} noExport columns={[
                        { key: 'name', label: 'Callback' }, { key: 'url', label: 'Address given to the provider' },
                        { key: 'status', label: 'Status', render: r => pill(r.status) }, { key: 'httpStatus', label: 'HTTP' }, { key: 'detail', label: 'Detail' },
                    ]} />
                    <h3 style={{ fontSize: 13.5, fontWeight: 700, margin: '18px 0 8px' }}>Addresses in use <Badge value={String(res.environment || '').toUpperCase()} /></h3>
                    <Table rows={Object.entries(res.addresses || {}).map(([k, v]) => ({ k, v }))} noExport columns={[{ key: 'k', label: 'What' }, { key: 'v', label: 'Address', render: r => <span className="mono">{r.v}</span> }]} />
                </>
            )}
        </Section>
    );
}
