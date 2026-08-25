import { useState, useEffect, useRef } from 'react';
import { Search, Building2, X, ChevronDown } from 'lucide-react';
import { getMerchants } from '../lib/api';

export default function MerchantPicker({ value, onSelect, status = 'ACTIVE', includeAllOption = false, placeholder = 'Search merchants…' }) {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        setLoading(true);
        getMerchants(status, debouncedQuery)
            .then(res => setResults(res.data?.data || res.data || []))
            .finally(() => setLoading(false));
    }, [debouncedQuery, status]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const select = (merchant) => {
        onSelect(merchant);
        setQuery('');
        setOpen(false);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <button
                type="button" onClick={() => setOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}
            >
                <Building2 size={14} color="var(--text-2)" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {value ? value.businessName : (includeAllOption ? 'All merchants' : 'Select a merchant…')}
                </span>
                <ChevronDown size={14} color="var(--text-faint)" style={{ flexShrink: 0 }} />
            </button>

            {open && (
                <div style={{ position: 'absolute', top: '105%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.25)', maxHeight: 320, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: 8, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Search size={13} color="var(--text-faint)" />
                        <input
                            autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder}
                            style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 13, color: 'var(--text)' }}
                        />
                        {query && (
                            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <div style={{ overflowY: 'auto' }}>
                        {includeAllOption && (
                            <button
                                onClick={() => select(null)}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: !value ? 'var(--bg-2)' : 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}
                            >
                                All merchants
                            </button>
                        )}
                        {loading ? (
                            <div style={{ padding: 16, textAlign: 'center', fontSize: 12.5, color: 'var(--text-2)' }}>Searching…</div>
                        ) : results.length === 0 ? (
                            <div style={{ padding: 16, textAlign: 'center', fontSize: 12.5, color: 'var(--text-2)' }}>No merchants match.</div>
                        ) : (
                            results.map(m => (
                                <button
                                    key={m.id} onClick={() => select(m)}
                                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: value?.id === m.id ? 'var(--bg-2)' : 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, color: 'var(--text)' }}
                                >
                                    {m.businessName}
                                    <span style={{ color: 'var(--text-faint)', fontSize: 11.5 }}> · {m.registrationNumber}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
