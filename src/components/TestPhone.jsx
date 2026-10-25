import { useEffect, useRef, useState } from 'react';
import { Send, RotateCcw, Smartphone, MessageCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Section } from './kit';

/** Staging test phone: the real WhatsApp conversation and the real *699# menus, replies shown here instead of sent. */
export default function TestPhone() {
    const [phone, setPhone] = useState('263771234567');
    const [mode, setMode] = useState('wa');
    const [log, setLog] = useState([]);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [ussd, setUssd] = useState({ session: '', path: '', end: true });
    const end = useRef(null);
    useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [log]);

    const add = (who, msg) => setLog(l => [...l, { who, msg, at: new Date() }]);
    // A reply to a PIN prompt is shown as dots.
    const shown = (msg) => {
        const last = [...log].reverse().find(m => m.who === 'pp');
        return last && /PIN/.test(last.msg) && /^\d{4}$/.test(msg) ? '••••' : msg;
    };
    const err = (e) => add('sys', e.response?.data?.error?.message || e.response?.data?.message || 'Not available');

    const sendWa = async (msg) => {
        add('me', shown(msg));
        const r = await api.post('/admin/whatsapp/simulate', { phone, text: msg });
        add('pp', r.data?.data?.reply || '');
    };
    const sendUssd = async (input, fresh) => {
        const path = fresh ? '' : (ussd.path ? `${ussd.path}*${input}` : input);
        if (fresh) add('me', 'Dial *699#'); else add('me', shown(input));
        const r = await api.post('/admin/ussd/simulate', { phone, session: fresh ? '' : ussd.session, path });
        const d = r.data?.data || {};
        setUssd({ session: d.session, path, end: d.end });
        add('pp', d.text + (d.end ? '\n\n— session ended —' : ''));
    };
    const submit = async (e) => {
        e?.preventDefault();
        if (busy) return;
        const msg = text.trim();
        if (mode === 'wa' && !msg) return;
        setBusy(true); setText('');
        try {
            if (mode === 'wa') await sendWa(msg);
            else await sendUssd(msg, ussd.end);
        } catch (x) { err(x); } finally { setBusy(false); }
    };
    const restart = () => { setLog([]); setUssd({ session: '', path: '', end: true }); };

    const bubble = (m) => ({
        alignSelf: m.who === 'me' ? 'flex-end' : m.who === 'sys' ? 'center' : 'flex-start',
        background: m.who === 'me' ? (mode === 'wa' ? '#D9FDD3' : 'var(--blue)') : m.who === 'sys' ? 'var(--badge-red)' : 'var(--bg-card)',
        color: m.who === 'me' ? (mode === 'wa' ? '#0B1F12' : '#fff') : m.who === 'sys' ? 'var(--pill-red)' : 'var(--text)',
        border: m.who === 'pp' ? '1px solid var(--border)' : 'none',
        borderRadius: 12, padding: '8px 12px', maxWidth: '85%', whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.45,
    });

    return (
        <Section title="Test phone" right={<button className="btn btn-ghost btn-sm" onClick={restart}><RotateCcw size={13} /> Clear</button>}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                <input value={phone} onChange={e => { setPhone(e.target.value); restart(); }} placeholder="Phone with country code" style={{ width: 200 }} />
                <div className="op-tabs" style={{ margin: 0, border: 'none' }}>
                    <button className={mode === 'wa' ? 'on' : ''} onClick={() => { setMode('wa'); restart(); }}><MessageCircle size={14} style={{ verticalAlign: -2 }} /> WhatsApp</button>
                    <button className={mode === 'ussd' ? 'on' : ''} onClick={() => { setMode('ussd'); restart(); }}><Smartphone size={14} style={{ verticalAlign: -2 }} /> USSD *699#</button>
                </div>
            </div>
            <div style={{ background: mode === 'wa' ? 'color-mix(in srgb, #25D366 6%, var(--bg-2))' : 'var(--bg-2)', borderRadius: 14, border: '1px solid var(--border)', height: 380, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {log.length === 0 && <div style={{ margin: 'auto', color: 'var(--text-2)', fontSize: 13 }}>{mode === 'wa' ? 'Send "hi" to start' : 'Press Dial to open *699#'}</div>}
                {log.map((m, i) => <div key={i} style={bubble(m)}>{m.msg}</div>)}
                <div ref={end} />
            </div>
            <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {mode === 'ussd' && ussd.end ? (
                    <button className="btn btn-primary" disabled={busy} style={{ flex: 1 }}>Dial *699#</button>
                ) : (
                    <>
                        <input value={text} onChange={e => setText(e.target.value)} placeholder={mode === 'wa' ? 'Message' : 'Reply'} style={{ flex: 1 }} autoFocus />
                        <button className="btn btn-primary" disabled={busy}><Send size={14} /> Send</button>
                    </>
                )}
            </form>
        </Section>
    );
}
