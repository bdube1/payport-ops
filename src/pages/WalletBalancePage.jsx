import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Settings, Wallet, Zap, X, Clock } from 'lucide-react';
import { getSingleWalletBalance, getVendorBalance } from '../lib/api';

const PROVIDERS = [
    { code: 'NETONE_USD', name: 'NetOne', currency: 'USD', symbol: '$', color: '#e53e3e', endpoint: 'Airtime Providers' },
    { code: 'ECONET_USD', name: 'Econet Wireless (USD)', currency: 'USD', symbol: '$', color: '#34AD54', endpoint: 'Airtime Providers' },
    { code: 'ECONET_ZWG', name: 'Econet Wireless (ZWG)', currency: 'ZWG', symbol: 'ZWG', color: '#34AD54', endpoint: 'Airtime Providers' },
    { code: 'TELECEL_USD', name: 'Telecel Zimbabwe (USD)', currency: 'USD', symbol: '$', color: '#f59e0b', endpoint: 'Airtime Providers' },
    { code: 'TELECEL_ZWG', name: 'Telecel Zimbabwe (ZWG)', currency: 'ZWG', symbol: 'ZWG', color: '#f59e0b', endpoint: 'Airtime Providers' },
];

// eSolutions Bill Payment Wallets
const ESOLUTIONS_WALLETS = [
    { code: 'ESOLUTIONS_USD', name: 'eSolutions USD Wallet', currency: 'USD', symbol: '$', color: '#3B82F6' },
    { code: 'ESOLUTIONS_ZWG', name: 'eSolutions ZWG Wallet', currency: 'ZWG', symbol: 'ZWG', color: '#f59e0b' },
];

export default function WalletBalancePage() {
    const [balances, setBalances] = useState({});
    const [esolutionsBalances, setEsolutionsBalances] = useState({});
    // Derived from loadingCodes below (declared after PROVIDERS is used) --
    // "anything still loading" for the refresh button, while individual
    // cards check loadingCodes.has(their own code) instead.
    const [loadingEsolutions, setLoadingEsolutions] = useState(false);
    const [error, setError] = useState('');
    const [esolutionsError, setEsolutionsError] = useState('');
    const [lastRefresh, setLastRefresh] = useState(null);
    const [lastEsolutionsRefresh, setLastEsolutionsRefresh] = useState(null);
    const [thresholds, setThresholds] = useState(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('float_thresholds') || '{}');
            // One-time migration: provider codes changed from NETONE/ECONET/
            // TELECEL to NETONE_USD/ECONET_USD/TELECEL_USD (Econet also
            // split into _USD/_ZWG) when multi-currency balances shipped.
            // Anyone who'd already set a threshold under the old key would
            // otherwise see it silently vanish.
            const RENAMED = { NETONE: 'NETONE_USD', ECONET: 'ECONET_USD', TELECEL: 'TELECEL_USD' };
            let migrated = false;
            const next = { ...stored };
            for (const [oldKey, newKey] of Object.entries(RENAMED)) {
                if (stored[oldKey] !== undefined && next[newKey] === undefined) {
                    next[newKey] = stored[oldKey];
                    delete next[oldKey];
                    migrated = true;
                }
            }
            if (migrated) localStorage.setItem('float_thresholds', JSON.stringify(next));
            return next;
        } catch { return {}; }
    });
    const [esolutionsThresholds, setEsolutionsThresholds] = useState(() => {
        try { return JSON.parse(localStorage.getItem('esolutions_float_thresholds') || '{}'); }
        catch { return {}; }
    });
    const [editingThreshold, setEditingThreshold] = useState(null);
    const [thresholdInput, setThresholdInput] = useState('');

    const [loadingCodes, setLoadingCodes] = useState(() => new Set(PROVIDERS.map(p => p.code)));
    const loading = loadingCodes.size > 0;

    // Was one aggregate call that waited for all five providers before
    // showing anything at all -- NetOne and Econet routinely answer in
    // under a second (confirmed in production logs), but a slow or
    // hanging Telecel call held the whole response hostage behind it,
    // so fast answers sat unused while the UI showed a blanket spinner.
    // Each provider is now an independent request; whichever one
    // resolves first is the first one to actually update on screen, in
    // whatever order they genuinely come back in.
    const load = useCallback((silent = false) => {
        if (!silent) setLoadingCodes(new Set(PROVIDERS.map(p => p.code)));
        setError('');
        setLastRefresh(new Date());

        PROVIDERS.forEach(provider => {
            const [providerName, currency] = [provider.code.split('_')[0], provider.currency];
            getSingleWalletBalance(providerName, currency)
                .then(r => {
                    setBalances(prev => ({ ...prev, [provider.code]: r.data?.data || {} }));
                })
                .catch(e => {
                    setBalances(prev => ({
                        ...prev,
                        [provider.code]: {
                            provider: providerName,
                            currency,
                            balance: null,
                            status: 'ERROR',
                            message: e.response?.data?.message || 'Failed to fetch',
                            fetchedAt: new Date().toISOString(),
                        },
                    }));
                })
                .finally(() => {
                    setLoadingCodes(prev => {
                        const next = new Set(prev);
                        next.delete(provider.code);
                        return next;
                    });
                });
        });
    }, []);

    const loadEsolutionsBalance = useCallback(async (silent = false) => {
        if (!silent) setLoadingEsolutions(true);
        setEsolutionsError('');
        try {
            // Fetch USD balance
            const usdResponse = await getVendorBalance('USD');
            // Fetch ZWG balance
            const zwgResponse = await getVendorBalance('ZWG');

            const newBalances = {};

            if (usdResponse.data?.success) {
                newBalances.ESOLUTIONS_USD = {
                    balance: usdResponse.data.data?.balance || 0,
                    currency: 'USD',
                    status: 'OK',
                    message: 'Success',
                    fetchedAt: new Date().toISOString(),
                    accountName: usdResponse.data.data?.accountName,
                    accountNumber: usdResponse.data.data?.accountNumber,
                };
            } else {
                newBalances.ESOLUTIONS_USD = {
                    balance: null,
                    currency: 'USD',
                    status: 'ERROR',
                    message: usdResponse.data?.error || 'Failed to fetch',
                    fetchedAt: new Date().toISOString(),
                };
            }

            if (zwgResponse.data?.success) {
                newBalances.ESOLUTIONS_ZWG = {
                    balance: zwgResponse.data.data?.balance || 0,
                    currency: 'ZWG',
                    status: 'OK',
                    message: 'Success',
                    fetchedAt: new Date().toISOString(),
                    accountName: zwgResponse.data.data?.accountName,
                    accountNumber: zwgResponse.data.data?.accountNumber,
                };
            } else {
                newBalances.ESOLUTIONS_ZWG = {
                    balance: null,
                    currency: 'ZWG',
                    status: 'ERROR',
                    message: zwgResponse.data?.error || 'Failed to fetch',
                    fetchedAt: new Date().toISOString(),
                };
            }

            setEsolutionsBalances(newBalances);
            setLastEsolutionsRefresh(new Date());
        } catch (e) {
            setEsolutionsError(e.response?.data?.message || 'Failed to fetch eSolutions balances');
            console.error('eSolutions balance fetch error:', e);
        } finally {
            if (!silent) setLoadingEsolutions(false);
        }
    }, []);

    useEffect(() => {
        load();
        loadEsolutionsBalance(true);
        const iv = setInterval(() => {
            load(true);
            loadEsolutionsBalance(true);
        }, 60000); // auto-refresh every 60s
        return () => clearInterval(iv);
    }, [load, loadEsolutionsBalance]);

    const saveThreshold = (code, isEsolutions = false) => {
        const val = parseFloat(thresholdInput);
        if (isNaN(val)) return;
        if (isEsolutions) {
            const updated = { ...esolutionsThresholds, [code]: val };
            setEsolutionsThresholds(updated);
            localStorage.setItem('esolutions_float_thresholds', JSON.stringify(updated));
        } else {
            const updated = { ...thresholds, [code]: val };
            setThresholds(updated);
            localStorage.setItem('float_thresholds', JSON.stringify(updated));
        }
        setEditingThreshold(null);
    };

    const getBalance = (code) => {
        const b = balances[code];
        if (!b || b.status === 'ERROR' || b.status === 'NOT_CONFIGURED') return null;
        const v = parseFloat(b.balance);
        return isNaN(v) ? null : v;
    };

    const getEsolutionsBalance = (code) => {
        const b = esolutionsBalances[code];
        if (!b || b.status === 'ERROR') return null;
        const v = parseFloat(b.balance);
        return isNaN(v) ? null : v;
    };

    const isLow = (code) => {
        const bal = getBalance(code);
        const thr = thresholds[code];
        return bal !== null && thr && bal < thr;
    };

    const isEsolutionsLow = (code) => {
        const bal = getEsolutionsBalance(code);
        const thr = esolutionsThresholds[code];
        return bal !== null && thr && bal < thr;
    };

    const formatBalance = (balance, currency) => {
        if (balance === null) return '—';
        if (currency === 'USD') return `$${balance.toFixed(2)}`;
        return `ZWG ${balance.toFixed(2)}`;
    };

    // Check if any eSolutions wallet is low
    const anyEsolutionsLow = ESOLUTIONS_WALLETS.some(w => isEsolutionsLow(w.code));

    return (
        <div style={{ padding: 28, maxWidth: 1200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800 }}>Float Balances</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                        {lastRefresh && `Last refreshed ${lastRefresh.toLocaleTimeString()}`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => loadEsolutionsBalance()} className="btn btn-ghost" disabled={loadingEsolutions}>
                        <RefreshCw size={14} className={loadingEsolutions ? 'spinning' : ''} />
                        {loadingEsolutions ? 'Refreshing...' : 'Refresh eSolutions'}
                    </button>
                    <button onClick={() => load()} className="btn btn-ghost">
                        <RefreshCw size={14} className={loading ? 'spinning' : ''} />
                        {loading ? 'Refreshing...' : 'Refresh Airtime'}
                    </button>
                </div>
            </div>

            {/* Airtime Low balance alert */}
            {PROVIDERS.some(p => isLow(p.code)) && (
                <div style={{
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 12, padding: '16px 20px', marginBottom: 24,
                    display: 'flex', alignItems: 'center', gap: 12, color: 'var(--amber)',
                }}>
                    <AlertTriangle size={20} />
                    <div>
                        <strong>Low float alert!</strong> One or more provider balances are below the configured threshold.
                        Please top up your float immediately.
                    </div>
                </div>
            )}

            {/* eSolutions Low balance alert */}
            {anyEsolutionsLow && (
                <div style={{
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 12, padding: '16px 20px', marginBottom: 24,
                    display: 'flex', alignItems: 'center', gap: 12, color: 'var(--amber)',
                }}>
                    <AlertTriangle size={20} />
                    <div>
                        <strong>eSolutions wallet low balance alert!</strong> One or more eSolutions wallets are below the configured threshold.
                        Please top up your float immediately.
                    </div>
                </div>
            )}

            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, color: 'var(--red)', fontSize: 13 }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {error}
                </div>
            )}

            {esolutionsError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, color: 'var(--red)', fontSize: 13 }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {esolutionsError}
                </div>
            )}

            {/* Airtime Providers Section Header */}
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={20} color="var(--green)" />
                    Airtime Providers
                </h2>
            </div>

            {/* Airtime Provider Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 40 }}>
                {PROVIDERS.map(provider => {
                    const bal = balances[provider.code] || {};
                    const numBal = getBalance(provider.code);
                    const low = isLow(provider.code);
                    const threshold = thresholds[provider.code];
                    const isOk = bal.status === 'OK';
                    const isConfigured = bal.status !== 'NOT_CONFIGURED';

                    return (
                        <div key={provider.code} style={{
                            background: 'var(--bg-card)', borderRadius: 16, padding: '24px',
                            border: `1px solid ${low ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                            boxShadow: low ? '0 0 0 3px rgba(245,158,11,0.1)' : 'var(--shadow)',
                        }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${provider.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Zap size={20} color={provider.color} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: 16 }}>{provider.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Airtime Provider</div>
                                    </div>
                                </div>
                                {loadingCodes.has(provider.code) ? (
                                    <div className="spinner" style={{ width: 20, height: 20 }} />
                                ) : isOk ? (
                                    <CheckCircle size={20} color="var(--green)" />
                                ) : (
                                    <AlertTriangle size={20} color="var(--amber)" />
                                )}
                            </div>

                            {/* Balance display */}
                            <div style={{
                                background: 'var(--bg-2)', borderRadius: 12, padding: '20px',
                                textAlign: 'center', marginBottom: 16,
                                border: low ? '2px solid rgba(245,158,11,0.4)' : '1px solid var(--border)',
                            }}>
                                {loadingCodes.has(provider.code) ? (
                                    <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div className="spinner" />
                                    </div>
                                ) : !isConfigured ? (
                                    <>
                                        <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 4 }}>Not configured</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{bal.message}</div>
                                    </>
                                ) : numBal !== null ? (
                                    <>
                                        <div style={{
                                            fontSize: 36, fontWeight: 900,
                                            color: low ? 'var(--amber)' : 'var(--text)',
                                        }}>
                                            {provider.symbol === 'ZWG' ? `ZWG ${numBal.toFixed(2)}` : `$${numBal.toFixed(2)}`}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{provider.currency} · Current Balance</div>
                                        {low && (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '6px 12px', borderRadius: 100, background: 'rgba(245,158,11,0.15)', color: 'var(--amber)', fontSize: 12, fontWeight: 700 }}>
                                                <AlertTriangle size={12} /> Below threshold ({provider.symbol === 'ZWG' ? `ZWG ${threshold?.toFixed(2)}` : `$${threshold?.toFixed(2)}`})
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: 14, color: 'var(--red)', marginBottom: 4 }}>Error fetching balance</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{bal.message}</div>
                                    </>
                                )}
                            </div>

                            {/* Integration Status */}
                            <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
                                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Integration Status</div>
                                <code style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, wordBreak: 'break-all', color: isConfigured ? 'var(--green)' : 'var(--amber)' }}>
                                    {isConfigured ? <><CheckCircle size={12} /> API Connected</> : <><Clock size={12} /> Pending Integration</>}
                                </code>
                            </div>

                            {/* Threshold config */}
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>
                    <Settings size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Alert threshold
                  </span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: threshold ? 'var(--blue)' : 'var(--text-2)' }}>
                    {threshold ? (provider.symbol === 'ZWG' ? `ZWG ${threshold.toFixed(2)}` : `$${threshold.toFixed(2)}`) : 'Not set'}
                  </span>
                                </div>
                                {editingThreshold === provider.code ? (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="number" value={thresholdInput}
                                            onChange={e => setThresholdInput(e.target.value)}
                                            placeholder="e.g. 50.00" min="0"
                                            style={{ flex: 1, fontSize: 13 }}
                                        />
                                        <button onClick={() => saveThreshold(provider.code, false)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>Save</button>
                                        <button onClick={() => setEditingThreshold(null)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center' }}><X size={13} /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => { setEditingThreshold(provider.code); setThresholdInput(threshold || ''); }} className="btn btn-ghost" style={{ width: '100%', fontSize: 12 }}>
                                        {threshold ? 'Change threshold' : 'Set alert threshold'}
                                    </button>
                                )}
                            </div>

                            {/* Last fetched */}
                            {bal.fetchedAt && (
                                <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 10, textAlign: 'center' }}>
                                    Fetched: {new Date(bal.fetchedAt).toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* eSolutions Section Header - BENEATH the airtime cards */}
            <div style={{ marginBottom: 20, marginTop: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wallet size={20} color="var(--blue)" />
                    Bill Payments Wallet (eSolutions)
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                    {lastEsolutionsRefresh && `Last refreshed ${lastEsolutionsRefresh.toLocaleTimeString()}`}
                </p>
            </div>

            {/* eSolutions Wallet Cards - API Endpoint section REMOVED */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                {ESOLUTIONS_WALLETS.map(wallet => {
                    const bal = esolutionsBalances[wallet.code] || {};
                    const numBal = getEsolutionsBalance(wallet.code);
                    const low = isEsolutionsLow(wallet.code);
                    const threshold = esolutionsThresholds[wallet.code];
                    const isOk = bal.status === 'OK';

                    return (
                        <div key={wallet.code} style={{
                            background: 'var(--bg-card)', borderRadius: 16, padding: '24px',
                            border: `1px solid ${low ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                            boxShadow: low ? '0 0 0 3px rgba(245,158,11,0.1)' : 'var(--shadow)',
                        }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${wallet.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Wallet size={20} color={wallet.color} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: 16 }}>{wallet.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                            Bill Payments Wallet
                                        </div>
                                    </div>
                                </div>
                                {loadingEsolutions ? (
                                    <div className="spinner" style={{ width: 20, height: 20 }} />
                                ) : isOk ? (
                                    <CheckCircle size={20} color="var(--green)" />
                                ) : (
                                    <AlertTriangle size={20} color="var(--amber)" />
                                )}
                            </div>

                            {/* Balance display */}
                            <div style={{
                                background: 'var(--bg-2)', borderRadius: 12, padding: '20px',
                                textAlign: 'center', marginBottom: 16,
                                border: low ? '2px solid rgba(245,158,11,0.4)' : '1px solid var(--border)',
                            }}>
                                {loadingEsolutions ? (
                                    <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div className="spinner" />
                                    </div>
                                ) : numBal !== null ? (
                                    <>
                                        <div style={{
                                            fontSize: 36, fontWeight: 900,
                                            color: low ? 'var(--amber)' : wallet.currency === 'USD' ? 'var(--blue)' : 'var(--amber)',
                                        }}>
                                            {formatBalance(numBal, wallet.currency)}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                                            {wallet.currency} · Current Balance
                                        </div>
                                        {bal.accountName && (
                                            <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 8 }}>
                                                Account: {bal.accountName}
                                            </div>
                                        )}
                                        {low && (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '6px 12px', borderRadius: 100, background: 'rgba(245,158,11,0.15)', color: 'var(--amber)', fontSize: 12, fontWeight: 700 }}>
                                                <AlertTriangle size={12} /> Below threshold ({threshold ? formatBalance(threshold, wallet.currency) : 'Not set'})
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: 14, color: 'var(--red)', marginBottom: 4 }}>Error fetching balance</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{bal.message}</div>
                                    </>
                                )}
                            </div>

                            {/* Threshold config - moved up since API Endpoint is removed */}
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>
                    <Settings size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Alert threshold
                  </span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: threshold ? 'var(--blue)' : 'var(--text-2)' }}>
                    {threshold ? formatBalance(threshold, wallet.currency) : 'Not set'}
                  </span>
                                </div>
                                {editingThreshold === wallet.code ? (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="number" value={thresholdInput}
                                            onChange={e => setThresholdInput(e.target.value)}
                                            placeholder={`e.g. ${wallet.currency === 'USD' ? '50.00' : '500.00'}`}
                                            min="0" step="0.01"
                                            style={{ flex: 1, fontSize: 13 }}
                                        />
                                        <button onClick={() => saveThreshold(wallet.code, true)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>Save</button>
                                        <button onClick={() => setEditingThreshold(null)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center' }}><X size={13} /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => { setEditingThreshold(wallet.code); setThresholdInput(threshold || ''); }} className="btn btn-ghost" style={{ width: '100%', fontSize: 12 }}>
                                        {threshold ? 'Change threshold' : 'Set alert threshold'}
                                    </button>
                                )}
                            </div>

                            {/* Last fetched */}
                            {bal.fetchedAt && (
                                <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 10, textAlign: 'center' }}>
                                    Fetched: {new Date(bal.fetchedAt).toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Instructions */}
            <div style={{ marginTop: 32, background: 'var(--bg-card)', borderRadius: 14, padding: '20px 24px', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--blue)' }}>ℹ️ About Float Monitoring</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
                    This page checks your live wallet/float balance with each provider. Set minimum thresholds for each wallet — when the balance drops below that level, you'll see an orange alert. Click "Refresh" to get the latest balances, or they auto-refresh every 60 seconds.
                </p>
                <ul style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginTop: 8, paddingLeft: 20 }}>
                    <li><strong>Airtime Providers</strong> - NetOne (Connected), Econet &amp; Telecel (Pending)</li>
                    <li><strong>eSolutions USD Wallet</strong> - Bill payments in US Dollars (ZESA, DStv, TelOne, etc.)</li>
                    <li><strong>eSolutions ZWG Wallet</strong> - Bill payments in Zimbabwe Gold (ZESA only)</li>
                </ul>
            </div>
        </div>
    );
}