import { useState } from 'react';
import toast from 'react-hot-toast';
import { walletReportApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, minor, show, CurrencySelect, errorText } from '../../components/kit';

const KINDS = ['TOPUP', 'PAYMENT', 'P2P_OUT', 'P2P_IN', 'CASH_IN', 'CASH_OUT', 'FX_OUT', 'FX_IN', 'REFUND'];
const CHANNELS = [['MOB', 'Mobile app'], ['WEB', 'Consumer web'], ['USD', 'USSD'], ['POS', 'POS'], ['WHATSAPP', 'WhatsApp'], ['AGENT', 'Agent'], ['API', 'API']];
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => today().slice(0, 8) + '01';
const box = { padding: '7px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13 };
const PAGE = 200;

export default function WalletReportPage() {
    const blank = { from: monthStart(), to: today(), currency: '', kind: '', direction: '', channel: '', status: '', q: '', minAmount: '', maxAmount: '' };
    const [form, setForm] = useState(blank);
    const [filters, setFilters] = useState(blank);
    const [offset, setOffset] = useState(0);
    const [busy, setBusy] = useState('');
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    const report = useLoad(() => walletReportApi.report({ ...params, limit: PAGE, offset }), [JSON.stringify(params), offset]);
    const r = report.value || {};
    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e?.target ? e.target.value : e }));
    const apply = (e) => { e.preventDefault(); setOffset(0); setFilters(form); };

    const download = async (format) => {
        setBusy(format);
        try {
            const res = await walletReportApi.exportFile(format, params);
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `wallet-report-${filters.from || 'start'}-to-${filters.to || today()}.${format}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            let msg = errorText(err);
            try { msg = JSON.parse(await err.response.data.text()).message || msg; } catch { /* keep */ }
            toast.error(msg);
        } finally { setBusy(''); }
    };

    return (
        <Page title="Wallet report" actions={<>
            <button className="btn btn-ghost" disabled={!!busy} onClick={() => download('xlsx')} style={{ padding: '6px 12px', fontSize: 12.5 }}>{busy === 'xlsx' ? '…' : 'Export Excel'}</button>
            <button className="btn btn-ghost" disabled={!!busy} onClick={() => download('pdf')} style={{ padding: '6px 12px', fontSize: 12.5 }}>{busy === 'pdf' ? '…' : 'Export PDF'}</button>
        </>}>
            <Section title="Filters">
                <form onSubmit={apply} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <label style={{ fontSize: 12 }}>From<br /><input type="date" value={form.from} onChange={set('from')} style={box} /></label>
                    <label style={{ fontSize: 12 }}>To<br /><input type="date" value={form.to} onChange={set('to')} style={box} /></label>
                    <CurrencySelect value={form.currency} onChange={set('currency')} allLabel="All currencies" />
                    <select value={form.kind} onChange={set('kind')} style={box}><option value="">All types</option>{KINDS.map(k => <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>)}</select>
                    <select value={form.direction} onChange={set('direction')} style={box}><option value="">Debits and credits</option><option value="DR">Debits</option><option value="CR">Credits</option></select>
                    <select value={form.channel} onChange={set('channel')} style={box}><option value="">All channels</option>{CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                    <select value={form.status} onChange={set('status')} style={box}><option value="">All wallet statuses</option>{['ACTIVE', 'FROZEN', 'CLOSED'].map(s => <option key={s}>{s}</option>)}</select>
                    <input type="number" step="0.01" placeholder="Min amount" value={form.minAmount} onChange={set('minAmount')} style={{ ...box, width: 110 }} />
                    <input type="number" step="0.01" placeholder="Max amount" value={form.maxAmount} onChange={set('maxAmount')} style={{ ...box, width: 110 }} />
                    <input placeholder="Wallet, phone, name or reference" value={form.q} onChange={set('q')} style={{ ...box, minWidth: 230 }} />
                    <button className="btn btn-primary" style={{ padding: '7px 14px', fontSize: 12.5 }}>Apply</button>
                    <button type="button" className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: 12.5 }} onClick={() => { setForm(blank); setFilters(blank); setOffset(0); }}>Reset</button>
                </form>
            </Section>
            {report.error && <Notice kind="error">{report.error}</Notice>}
            {(r.summary || []).length > 0 && <Section title="Summary">
                <Table rows={r.summary} columns={[
                    { key: 'currency', label: 'Currency' }, { key: 'kind', label: 'Type', render: x => <Badge value={x.kind} /> }, { key: 'direction', label: 'Dr/Cr' },
                    { key: 'count', label: 'Count' }, { key: 'amount_minor', label: 'Amount', render: x => minor(x.amount_minor, x.currency) },
                    { key: 'charge_minor', label: 'Charges', render: x => minor(x.charge_minor, x.currency) }, { key: 'tax_minor', label: 'Tax', render: x => minor(x.tax_minor, x.currency) },
                ]} />
            </Section>}
            <Section title={`Operations${r.total != null ? ` (${r.total})` : ''}`} right={r.total > PAGE && <>
                <button className="btn btn-ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))} style={{ padding: '6px 12px', fontSize: 12.5 }}>Previous</button>
                <span style={{ fontSize: 12.5, alignSelf: 'center' }}>{offset + 1}–{Math.min(offset + PAGE, r.total)}</span>
                <button className="btn btn-ghost" disabled={offset + PAGE >= r.total} onClick={() => setOffset(offset + PAGE)} style={{ padding: '6px 12px', fontSize: 12.5 }}>Next</button>
            </>}>
                <Table rows={r.rows} empty={report.loading ? 'Loading…' : 'No operations match.'} columns={[
                    { key: 'created_at', label: 'Date', render: x => show(x.created_at) }, { key: 'op_ref', label: 'Operation' }, { key: 'wallet_ref', label: 'Wallet' },
                    { key: 'holder', label: 'Holder' }, { key: 'phone', label: 'Phone' }, { key: 'kind', label: 'Type', render: x => <Badge value={x.kind} /> },
                    { key: 'direction', label: 'Dr/Cr' }, { key: 'amount_minor', label: 'Amount', render: x => minor(x.amount_minor, x.currency) },
                    { key: 'charge_minor', label: 'Charge', render: x => minor(x.charge_minor, x.currency) }, { key: 'tax_minor', label: 'Tax', render: x => minor(x.tax_minor, x.currency) },
                    { key: 'channel', label: 'Channel' }, { key: 'counterparty', label: 'Counterparty' }, { key: 'reference', label: 'Reference' },
                    { key: 'wallet_status', label: 'Wallet', render: x => <Badge value={x.wallet_status} /> }, { key: 'entry_ref', label: 'Ledger entry' },
                ]} />
            </Section>
        </Page>
    );
}
