import axios from 'axios';
import { API_BASE } from './apiBase';

const api = axios.create({
    baseURL: API_BASE ? `${API_BASE}/api/v1` : '/api/v1',
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
});

// Exported so pages with varied/ad-hoc calls (uploads, less common CRUD)
// can use the same correctly-configured client, instead of each page
// rolling its own axios instance with its own copy of API_BASE that can
// drift out of sync -- that's exactly what caused Bundle Manager and
// Products to silently point at the wrong host.
export { api };

// Track if we're already redirecting to prevent multiple redirects
let isRedirecting = false;

// Helper function to redirect to ops login page
const redirectToLogin = () => {
    if (isRedirecting) return;
    isRedirecting = true;

    // Clear all auth data
    localStorage.removeItem('ops_token');
    localStorage.removeItem('ops_user');

    // Redirect to ops login page
    window.location.href = '/login?timeout=1';
};

api.interceptors.request.use(config => {
    config.headers['X-Request-ID'] = `ops-${Date.now()}`;
    const token = localStorage.getItem('ops_token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    res => res,
    err => {
        const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message;
        if (msg && err.response) err.response.data = { ...err.response.data, message: msg };

        // Only a real 401/403 from the server means "you are not properly
        // authenticated" -- that's the one legitimate reason to force a
        // logout. A slow request, a timeout, or a 500 from some unrelated
        // business call (e.g. a vendor's balance API being down) is not an
        // authentication problem and must never end the user's session.
        // This used to also fire on any timeout or network error, which is
        // exactly why a slow eSolutions balance check was silently logging
        // people out of the whole portal.
        // 403 is a real answer (this role may not do that), never a reason to log out.
        if (err.response?.status === 401) {
            redirectToLogin();
            return Promise.reject(err);
        }

        return Promise.reject(err);
    }
);

// AUTH
export const opsLogin = (data) => api.post('/auth/ops/login', data);
export const forgotPassword = (email) => api.post('/auth/ops/forgot-password', { email });
export const resetPassword = (token, newPassword) => api.post('/auth/ops/reset-password', { token, newPassword });
export const unlockUser = (id) => api.post(`/admin/users/${id}/unlock`);
export const changeOwnPassword = (currentValue, newValue) => api.post('/account/change-password', { currentValue, newValue });

// Merchants Module (Phase 0)
export const getMerchants = (status, search) => api.get('/admin/merchants', { params: { ...(status ? { status } : {}), ...(search ? { search } : {}) } });
export const getMerchant = (id) => api.get(`/admin/merchants/${id}`);
export const approveMerchant = (id) => api.post(`/admin/merchants/${id}/approve`);
export const rejectMerchant = (id, reason) => api.post(`/admin/merchants/${id}/reject`, { reason });
export const suspendMerchant = (id) => api.post(`/admin/merchants/${id}/suspend`);
export const reactivateMerchant = (id) => api.post(`/admin/merchants/${id}/reactivate`);

// Merchants Module (Phase 4+) -- commission
export const getDefaultCommission = () => api.get('/admin/merchants/commission/default');
export const setDefaultCommission = (bps) => api.put('/admin/merchants/commission/default', { bps });
export const setMerchantCommission = (id, bps) => api.put(`/admin/merchants/${id}/commission`, { bps });
export const getMerchantDocuments = (merchantId) => api.get(`/admin/merchants/${merchantId}/documents`);
export const getMerchantDocumentUrl = (merchantId, documentId) => `${API_BASE}/api/v1/admin/merchants/${merchantId}/documents/${documentId}/download`;
export const requestMerchantInfo = (id, note) => api.post(`/admin/merchants/${id}/request-info`, { note });
export const getMerchantReviewNotes = (id) => api.get(`/admin/merchants/${id}/review-notes`);
export const startMerchantReview = (id) => api.post(`/admin/merchants/${id}/start-review`);
export const updateMerchantDetails = (id, body) => api.put(`/admin/merchants/${id}`, body);
export const resetCustomerPin = (id) => api.post(`/admin/users/${id}/reset-pin`);

// Settlements
export const getSettlements = () => api.get('/admin/settlements');
export const runSettlements = (days) => api.post('/admin/settlements/run', { days });
export const markSettlementProcessing = (id) => api.post(`/admin/settlements/${id}/processing`);
export const markSettlementPaid = (id, payoutReference) => api.post(`/admin/settlements/${id}/paid`, { payoutReference });

// Disputes
export const getDisputes = () => api.get('/admin/disputes');
export const openDispute = (checkoutSessionId, amountCents, reason, type = 'COMPLAINT') => api.post('/admin/disputes', { checkoutSessionId, amountCents, reason, type });
export const resolveDispute = (id, status, evidenceNotes) => api.post(`/admin/disputes/${id}/resolve`, { status, evidenceNotes });

export const getQueries = () => api.get('/admin/queries');
export const getQueryByReference = (referenceNumber) => api.get(`/admin/queries/by-reference/${encodeURIComponent(referenceNumber)}`);
export const respondToQuery = (id, status, opsResponse) => api.post(`/admin/queries/${id}/respond`, { status, opsResponse });
export const addQueryMessage = (id, message) => api.post(`/admin/queries/${id}/messages`, { message });
export const getQueryMessages = (id) => api.get(`/admin/queries/${id}/messages`);
export const setQueryStatus = (id, status) => api.post(`/admin/queries/${id}/status`, { status });
export const getQueryAttachments = (id) => api.get(`/admin/queries/${id}/attachments`);
export const getQueryAttachmentUrl = (id, attachmentId) => `${API_BASE}/api/v1/admin/queries/${id}/attachments/${attachmentId}/download`;
export const uploadQueryAttachment = (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/admin/queries/${id}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// Merchants Module -- dashboards, consolidated reporting
export const getMerchantDashboard = (days = 30) => api.get('/admin/merchants/dashboard', { params: { days } });
export const getConsumerDashboard = (days = 30) => api.get('/admin/consumers/dashboard', { params: { days } });
export const getConsolidatedReport = (days = 30) => api.get('/admin/reports/consolidated', { params: { days } });
export const getCommissionReport = () => api.get('/admin/reports/commission');
export const searchMerchantTransactions = (params) => api.get('/admin/merchant-transactions', { params });

// Reconciliation
export const runReconciliation = (days) => api.get('/admin/reconciliation/run', { params: { days } });
// Statement reconciliation: upload a provider's own settlement export
// and match it against Payport's transactions -- a different check
// from runReconciliation above (which only compares Payport's own
// internal records against each other, not an external source).
export const uploadReconciliationStatement = (provider, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/admin/reconciliation/statements/upload', formData, {
        params: { provider },
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};
export const listReconciliationRuns = () => api.get('/admin/reconciliation/statements/runs');
export const getReconciliationMatches = (runId, type) => api.get(`/admin/reconciliation/statements/runs/${runId}/matches`, { params: type ? { type } : {} });
export const queryNetOneTransaction = (reference) => api.get('/admin/netone/query-transaction', { params: { reference } });
export const queryEcoCashTransaction = (reference, mobile) => api.get('/admin/provider-query/ecocash', { params: { reference, mobile } });
export const queryOmariTransaction = (reference) => api.get('/admin/provider-query/omari', { params: { reference } });
export const queryZimSwitchTransaction = (checkoutId) => api.get('/admin/provider-query/zimswitch', { params: { checkoutId } });
export const queryOneMoneyTransaction = (transOrderNo) => api.get('/admin/provider-query/onemoney', { params: { transOrderNo } });
// Different base path (/econet/admin, not /admin/provider-query) and an
// unwrapped response -- matches EconetAdminController exactly as it is.
export const queryEconetTransaction = (reference, currency) => api.get('/econet/admin/transaction-status', { params: { reference, currency } });

// TRANSACTIONS
export const searchTransactions = (params) => api.get('/admin/transactions-search', { params });
export const getTransaction = (ref) => api.get(`/transactions/${ref}`);
export const getTransactionTimeline = (ref) => api.get(`/transactions/${ref}/timeline`);
export const retryFulfilment = (ref) => api.post(`/admin/transactions/${ref}/retry-fulfilment`);

// DASHBOARD
export const getDashboardKpis = () => api.get('/admin/dashboard/kpis');
export const getAttentionQueue = () => api.get('/admin/dashboard/attention-queue');

// PRODUCTS
export const getProducts = () => api.get('/products');
export const getPaymentMethods = () => api.get('/products/payment-methods');

// ADMIN CONFIG
export const getAdminProducts = () => api.get('/admin/config/products');
export const createAdminProduct = (data) => api.post('/admin/config/products', data);
export const updateAdminProduct = (id, data) => api.put(`/admin/config/products/${id}`, data);
export const getAdminPrefixes = () => api.get('/admin/config/prefixes');
export const createAdminPrefix = (data) => api.post('/admin/config/prefixes', data);
export const updateAdminPrefix = (id, data) => api.put(`/admin/config/prefixes/${id}`, data);
export const deleteAdminPrefix = (id) => api.delete(`/admin/config/prefixes/${id}`);
export const getAdminPaymentMethods = () => api.get('/admin/config/payment-methods');
export const updateAdminPaymentMethod = (id, data) => api.put(`/admin/config/payment-methods/${id}`, data);

// USERS
export const getUsers = () => api.get('/admin/users');
export const createUser = (data) => api.post('/admin/users', data);
export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const deactivateUser = (id) => api.delete(`/admin/users/${id}`);
export const activateUser = (id) => api.post(`/admin/users/${id}/activate`);

// WALLET BALANCES
// This one legitimately needs longer than the client-wide 30s default --
// it's an aggregate across five provider calls (NetOne, Econet x2,
// Telecel x2), and the backend's own per-provider ceiling is 40s. A
// shorter timeout here would give up on the frontend side before the
// backend ever got a chance to actually succeed -- same failure shape as
// the backend-side mismatch this was paired with fixing.
export const getWalletBalances = () => api.get('/admin/wallet-balances', { timeout: 45000 });
// Independent per-provider lookup -- used instead of the aggregate call
// above so a slow or hanging provider can never hold up the ones that
// already have an answer. Each has its own 40s ceiling matching the
// backend's own per-provider timeout, but they run in parallel from the
// caller's side, not sequentially.
export const getSingleWalletBalance = (providerCode, currency) =>
    api.get(`/admin/wallet-balances/${providerCode}`, { params: { currency }, timeout: 40000 });
export const getProviderHealth = () => api.get('/admin/provider-health');

// LOGS
export const getAuditLogs = (params) => api.get('/admin/logs/audit', { params });
export const getNotificationLogs = () => api.get('/admin/logs/notifications');

// CUSTOMER STATEMENT
export const getCustomerStatement = (params) => api.get('/admin/customer-statement', { params });

// ========== NEW: BUNDLE MANAGEMENT ==========
export const getBundles = (provider, currency = 'USD') =>
    api.get(`/bundles/${provider}?currency=${currency}`);

export const getBundleCategories = (provider) =>
    api.get(`/bundles/${provider}/categories`);

export const uploadBundles = (formData) =>
    api.post('/bundles/admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });

export const updateBundlePrice = (provider, bundleCode, data) =>
    api.put(`/bundles/admin/${provider}/code/${bundleCode}`, data);

export const deactivateBundle = (provider, bundleCode) =>
    api.delete(`/bundles/admin/${provider}/code/${bundleCode}`);

export const bulkUpdateBundles = (provider, data) =>
    api.post(`/bundles/admin/${provider}/bulk-status`, data);
// ============================================

// Get eSolutions vendor balance by currency
export const getVendorBalance = (currency) => {
    return api.get(`/vendors/balance?currency=${currency}`);
};

// ============================================
export const formatAmount = (cents, currency = 'USD') => {
    const value = (cents ?? 0) / 100;
    const symbol = currency === 'ZWG' ? 'ZWG ' : '$';
    return `${symbol}${value.toFixed(2)}`;
};

export const formatDate = (val) => {
    if (!val) return '—';
    try {
        if (Array.isArray(val)) {
            const [y, mo, d, h=0, m=0] = val;
            return new Date(y, mo-1, d, h, m).toLocaleString('en-ZW', { dateStyle: 'short', timeStyle: 'short' });
        }
        return new Date(val).toLocaleString('en-ZW', { dateStyle: 'short', timeStyle: 'short' });
    } catch { return '—'; }
};

export const STATUS_CONFIG = {
    INITIATED: { label: 'Initiated', badge: 'badge-gray' },
    PAYMENT_PENDING: { label: 'Payment Pending', badge: 'badge-amber' },
    PAYMENT_CONFIRMED: { label: 'Payment Confirmed', badge: 'badge-blue' },
    FULFILMENT_PENDING: { label: 'Fulfilling', badge: 'badge-blue' },
    FULFILMENT_RETRY: { label: 'Retry', badge: 'badge-amber' },
    FULFILMENT_FAILED: { label: 'Fulfilment Failed', badge: 'badge-red' },
    COMPLETED: { label: 'Completed', badge: 'badge-green' },
    PAYMENT_FAILED: { label: 'Payment Failed', badge: 'badge-red' },
    PAYMENT_TIMEOUT: { label: 'Timed Out', badge: 'badge-red' },
    REFUND_PENDING: { label: 'Refund Pending', badge: 'badge-amber' },
    REFUNDED: { label: 'Refunded', badge: 'badge-blue' },
    MANUAL_FULFILMENT: { label: 'Manual', badge: 'badge-amber' },
};


// ─── Phase 4-7: platform, finance, compliance, markets ─────────────────────────
// Thin wrappers; the backend enforces every permission and four-eyes rule.
export const platformApi = {
    workQueues: () => api.get('/admin/platform/work-queues'),
    kyb: (merchantId) => api.get(`/admin/platform/kyb/${merchantId}`),
    kybAssign: (merchantId) => api.post(`/admin/platform/kyb/${merchantId}/assign`),
    kybRecommend: (merchantId, recommendation, checklist, note) => api.post(`/admin/platform/kyb/${merchantId}/recommend`, { recommendation, checklist, note }),
    kybDecide: (merchantId, accept, note) => api.post(`/admin/platform/kyb/${merchantId}/decide`, { accept, note }),
    destinations: (status) => api.get('/admin/platform/settlement-destinations', { params: status ? { status } : {} }),
    verifyDestination: (id, approve, note) => api.post(`/admin/platform/settlement-destinations/${id}/verify`, { approve, note }),
    enable: (merchantId, country, currency, enabled) => api.post(`/admin/platform/merchants/${merchantId}/enablements`, { country, currency, enabled }),
    readiness: (merchantId) => api.get(`/admin/platform/merchants/${merchantId}/readiness`),
};

export const financeApi = {
    rerunStatement: (id) => api.post(`/admin/finance/recon/statements/${id}/run`),
    exceptions: (category) => api.get('/admin/finance/recon/exceptions', { params: category ? { category } : {} }),
    resolveException: (id, resolution, note) => api.post(`/admin/finance/recon/exceptions/${id}/resolve`, { resolution, note }),
    importStatement: (provider, format, file) => {
        const f = new FormData(); f.append('file', file);
        return api.post('/admin/finance/recon/statements', f, { params: { provider, format }, headers: { 'Content-Type': 'multipart/form-data' } });
    },
    eligible: (currency) => api.get('/admin/finance/settlement/eligible', { params: { currency } }),
    draftBatch: (currency) => api.post('/admin/finance/settlement/batches', { currency }),
    batch: (id) => api.get(`/admin/finance/settlement/batches/${id}`),
    approveBatch: (id) => api.post(`/admin/finance/settlement/batches/${id}/approve`),
    cancelBatch: (id) => api.post(`/admin/finance/settlement/batches/${id}/cancel`),
    instructBatch: (id) => api.post(`/admin/finance/settlement/batches/${id}/instruct`),
    payoutResults: (file) => {
        const f = new FormData(); f.append('file', file);
        return api.post('/admin/finance/settlement/payout-results', f, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    isoSchemas: () => api.get('/admin/finance/iso20022/schemas'),
    isoUpload: (kind, file) => {
        const f = new FormData(); f.append('file', file);
        return api.post(`/admin/finance/iso20022/${kind}`, f, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    bankStatements: () => api.get('/admin/finance/iso20022/statements'),
    bankEntries: (id) => api.get(`/admin/finance/iso20022/statements/${id}/entries`),
    isoMessages: (type) => api.get('/admin/finance/iso20022/messages', { params: type ? { type } : {} }),
};

export const integrationsApi = {
    list: () => api.get('/admin/integrations'),
    get: (code) => api.get(`/admin/integrations/${code}`),
    suspend: (code, reason) => api.post(`/admin/integrations/${code}/suspend`, { reason }),
    resume: (code, note) => api.post(`/admin/integrations/${code}/resume`, { note }),
    verification: (code, body) => api.post(`/admin/integrations/${code}/verifications`, body),
};

export const marketsApi = { list: () => api.get('/admin/markets') };

export const disputeTimelinesApi = {
    list: () => api.get('/admin/dispute-timelines'),
    settings: () => api.get('/admin/dispute-timelines/settings'),
    acknowledge: (id) => api.post(`/admin/dispute-timelines/${id}/acknowledge`),
    update: (id, kind, note) => api.post(`/admin/dispute-timelines/${id}/updates`, { kind, note }),
};

export const complianceApi = {
    alerts: (status = 'OPEN') => api.get(`/admin/compliance/alerts`, { params: { status } }),
    caseFromAlerts: (alertIds) => api.post(`/admin/compliance/cases`, { alertIds }),
    cases: (status) => api.get(`/admin/compliance/cases`, { params: status ? { status } : {} }),
    case: (id) => api.get(`/admin/compliance/cases/${id}`),
    assign: (id, assignee) => api.post(`/admin/compliance/cases/${id}/assign`, { assignee }),
    note: (id, note) => api.post(`/admin/compliance/cases/${id}/notes`, { note }),
    propose: (id, outcome, rationale) => api.post(`/admin/compliance/cases/${id}/propose`, { outcome, rationale }),
    decide: (id, accept, note) => api.post(`/admin/compliance/cases/${id}/decide`, { accept, note }),
    rules: () => api.get(`/admin/compliance/rules`),
    createRule: (body) => api.post(`/admin/compliance/rules`, body),
    ruleChange: (code, body) => api.post(`/admin/compliance/rules/${code}/change-requests`, body),
    ruleChanges: () => api.get(`/admin/compliance/rule-changes`),
    decideRuleChange: (id, approve, note) => api.post(`/admin/compliance/rule-changes/${id}/decide`, { approve, note }),
    parameters: () => api.get(`/admin/compliance/parameters`),
    parameterChange: (key, body) => api.post(`/admin/compliance/parameters/${encodeURIComponent(key)}/change-requests`, body),
    decideParameterChange: (id, approve, note) => api.post(`/admin/compliance/parameter-changes/${id}/decide`, { approve, note }),
    screeningStatus: () => api.get(`/admin/compliance/screening/status`),
    screeningLists: () => api.get(`/admin/compliance/screening/lists`),
    refreshUn: () => api.post(`/admin/compliance/screening/lists/UN-CONSOLIDATED/refresh`),
    createScreeningList: (code, name, source) => api.post(`/admin/compliance/screening/lists`, { code, name, source }),
    loadScreeningList: (code, entries) => api.post(`/admin/compliance/screening/lists/${encodeURIComponent(code)}/load`, { entries }),
    screeningRuns: (subjectKey) => api.get(`/admin/compliance/screening/runs`, { params: { subjectKey } }),
    screeningCheck: (names, identifiers) => api.post(`/admin/compliance/screening/check`, { names, identifiers }),
    reports: () => api.get(`/admin/compliance/reports`),
    report: (id) => api.get(`/admin/compliance/reports/${id}`),
    reportFields: (id, values) => api.patch(`/admin/compliance/reports/${id}/fields`, values),
    approveReport: (id) => api.post(`/admin/compliance/reports/${id}/approve`),
    reportSubmitted: (id, fiuReference) => api.post(`/admin/compliance/reports/${id}/submitted`, { fiuReference }),
    prepareCtr: (from, to) => api.post(`/admin/compliance/reports/ctr`, null, { params: { from, to } }),
    templates: () => api.get(`/admin/compliance/report-templates`),
    createTemplate: (body) => api.post(`/admin/compliance/report-templates`, body),
    activateTemplate: (id) => api.post(`/admin/compliance/report-templates/${id}/activate`),
    authorities: () => api.get(`/admin/compliance/authorities`),
    decideAuthority: (id, approve, note) => api.post(`/admin/compliance/authority-requests/${id}/decide`, { approve, note }),
    auditVerify: () => api.get(`/admin/compliance/audit/verify`),
    audit: (subject) => api.get(`/admin/compliance/audit`, { params: { subject } }),
};

export const complianceAdminApi = {
    list: () => api.get('/admin/compliance-authorities'),
    request: (holder, authority, reason) => api.post('/admin/compliance-authorities/requests', { holder, authority, reason }),
    revoke: (holder, authority, reason) => api.post('/admin/compliance-authorities/revoke', { holder, authority, reason }),
};

// ─── Platform controls: markets, currencies, channels, product lines, FX (no code changes) ──
export const platformControlsApi = {
    marketSettings: () => api.get('/admin/markets/settings'),
    marketRequests: () => api.get('/admin/markets/requests'),
    requestMarketChange: (country, changes, currencies, reason) => api.post(`/admin/markets/${country}/change-requests`, { changes, currencies, reason }),
    requestNewMarket: (market, reason) => api.post('/admin/markets', { market, reason }),
    decideMarketRequest: (id, approve, note) => api.post(`/admin/markets/requests/${id}/decide`, { approve, note }),
    suspendMarket: (country, reason) => api.post(`/admin/markets/${country}/suspend`, { reason }),
    disableCurrency: (currency, reason) => api.post(`/admin/markets/currencies/${currency}/disable`, { reason }),
    stopLiveCurrency: (currency, reason) => api.post(`/admin/markets/currencies/${currency}/live-off`, { reason }),
    channels: () => api.get('/admin/channels'),
    paymentsReadiness: () => api.get('/admin/payments/live-readiness'),
    setStorePaymentsLive: (live, reason) => api.post('/admin/payments/store-live', { live, reason }),
    setChannel: (code, enabled, reason) => api.post(`/admin/channels/${code}`, { enabled, reason }),
    serviceLines: () => api.get('/admin/service-lines'),
    setServiceLine: (code, enabled, reason) => api.post(`/admin/service-lines/${code}`, { enabled, reason }),
    fxRates: () => api.get('/admin/fx/rates'),
    proposeFxRate: (body) => api.post('/admin/fx/rates', body),
    decideFxRate: (id, approve, note) => api.post(`/admin/fx/rates/${id}/decide`, { approve, note }),
    fxQuote: (from, to, amountMinor) => api.get('/fx/quote', { params: { from, to, amountMinor } }),
};

// ===== Phase 8: wallets, agents, POS, WhatsApp, provider settlements; ledger views =====
export const walletsAdminApi = {
    search: (q) => api.get('/admin/wallets', { params: q ? { q } : {} }),
    totals: () => api.get('/admin/wallets/totals'),
    statement: (ref) => api.get(`/admin/wallets/${encodeURIComponent(ref)}/statement`),
    statementReport: (ref, from, to) => api.get(`/admin/wallets/${encodeURIComponent(ref)}/statement-report`, { params: { ...(from ? { from } : {}), ...(to ? { to } : {}) } }),
    balances: (currency, q) => api.get('/admin/wallets/balances', { params: { ...(currency ? { currency } : {}), ...(q ? { q } : {}) } }),
    setStatus: (ref, status, reason) => api.post(`/admin/wallets/${encodeURIComponent(ref)}/status`, { status, reason }),
    setTier: (ref, tier, reason) => api.post(`/admin/wallets/${encodeURIComponent(ref)}/tier`, { tier, reason }),
};

export const codesAdminApi = {
    search: (type, q) => api.get('/admin/codes', { params: { ...(type ? { type } : {}), ...(q ? { q } : {}) } }),
    ofParty: (type, id) => api.get(`/admin/codes/${type}/${id}`),
    add: (type, id, label, address) => api.post(`/admin/codes/${type}/${id}`, { label, address }),
    requests: (status) => api.get('/admin/codes/requests', { params: status ? { status } : {} }),
    decide: (id, approve, note) => api.post(`/admin/codes/requests/${id}/decide`, { approve, note }),
    setStatus: (code, status) => api.post(`/admin/codes/${code}/status`, { status }),
    report: (params) => api.get('/admin/codes/report', { params }),
};

export const rulesAdminApi = {
    list: (party) => api.get(`/admin/rules/${party}`),
    options: (party) => api.get(`/admin/rules/${party}/options`),
    save: (party, body) => api.post(`/admin/rules/${party}`, body),
    remove: (party, id) => api.delete(`/admin/rules/${party}/${id}`),
};

export const walletReportApi = {
    report: (params) => api.get('/admin/wallets/report', { params }),
    exportFile: (format, params) => api.get('/admin/wallets/report/export', { params: { ...params, format }, responseType: 'blob', timeout: 120000 }),
};

export const cardsAdminApi = {
    search: ({ q, status, scheme } = {}) => api.get('/admin/cards', { params: { ...(q ? { q } : {}), ...(status ? { status } : {}), ...(scheme ? { scheme } : {}) } }),
    setStatus: (ref, status, note) => api.post(`/admin/cards/${encodeURIComponent(ref)}/status`, { status, note }),
    refresh: (ref) => api.post(`/admin/cards/${encodeURIComponent(ref)}/refresh`),
};

export const agentsAdminApi = {
    list: () => api.get('/admin/agents'),
    decide: (id, approve, reason, commissionBps) => api.post(`/admin/agents/${id}/decide`, { approve, reason, commissionBps }),
    setStatus: (id, status, reason) => api.post(`/admin/agents/${id}/status`, { status, reason }),
    deposits: (status) => api.get('/admin/agents/float-deposits', { params: status ? { status } : {} }),
    recordDeposit: (agentId, amountMinor, currency, bankReference) => api.post('/admin/agents/float-deposits', { agentId, amountMinor, currency, bankReference }),
    decideDeposit: (id, approve, note) => api.post(`/admin/agents/float-deposits/${id}/decide`, { approve, note }),
    dashboard: () => api.get('/admin/agents/dashboard'),
    onboard: (body) => api.post('/admin/agents', body),
    detail: (id) => api.get(`/admin/agents/${id}`),
    update: (id, body) => api.put(`/admin/agents/${id}`, body),
    createLogin: (id, fullName, email) => api.post(`/admin/agents/${id}/users`, { fullName, email }),
    resetLogin: (id, userId) => api.post(`/admin/agents/${id}/users/${userId}/reset-password`),
};

export const merchantUsersApi = {
    list: (merchantId) => api.get(`/admin/merchants/${merchantId}/users`),
    resetPassword: (merchantId, userId) => api.post(`/admin/merchants/${merchantId}/users/${userId}/reset-password`),
};

export const ussdAdminApi = {
    networks: () => api.get('/admin/ussd/networks'),
    update: (code, body) => api.put(`/admin/ussd/networks/${code}`, body),
    newKey: (code) => api.post(`/admin/ussd/networks/${code}/access-key`),
};

export const posAdminApi = {
    terminals: () => api.get('/admin/pos/terminals'),
    setStatus: (terminalId, active, reason) => api.post(`/admin/pos/terminals/${encodeURIComponent(terminalId)}/status`, { active, reason }),
};

export const whatsappAdminApi = {
    status: () => api.get('/admin/whatsapp'),
    saveSettings: (body) => api.put('/admin/whatsapp/settings', body),
    test: (to) => api.post('/admin/whatsapp/test', { to }),
};

export const providerSettlementApi = {
    rules: () => api.get('/admin/provider-settlement-rules'),
    propose: (body) => api.post('/admin/provider-settlement-rules', body),
    decide: (id, approve) => api.post(`/admin/provider-settlement-rules/${id}/decide`, { approve }),
    retire: (id) => api.post(`/admin/provider-settlement-rules/${id}/retire`),
    positions: () => api.get('/admin/provider-settlement-rules/positions'),
};

export const ledgerApi = {
    trialBalance: () => api.get('/admin/ledger/trial-balance'),
    accounts: (params) => api.get('/admin/ledger/accounts', { params }),
    categories: () => api.get('/admin/ledger/categories'),
    integrity: () => api.get('/admin/ledger/integrity'),
    runIntegrity: () => api.post('/admin/ledger/integrity/run'),
    balance: (account) => api.get('/admin/ledger/balance', { params: { account } }),
    shadowComparison: (differencesOnly) => api.get('/admin/ledger/shadow/comparison', { params: { differencesOnly } }),
    shadowFailures: (openOnly = true) => api.get('/admin/ledger/shadow/failures', { params: { openOnly } }),
    resolveShadowFailure: (idempotencyKey, resolution) => api.post('/admin/ledger/shadow/failures/resolve', { idempotencyKey, resolution }),
    runShadow: () => api.post('/admin/ledger/shadow/run'),
    backfillShadow: (from) => api.post('/admin/ledger/shadow/backfill', null, { params: { from } }),
    taxRates: (entity) => api.get('/admin/ledger/tax-rates', { params: entity ? { entity } : {} }),
    proposeTaxRate: (body) => api.post('/admin/ledger/tax-rates', body),
    approveTaxRate: (id, note) => api.post(`/admin/ledger/tax-rates/${id}/approve`, { note }),
    rejectTaxRate: (id, note) => api.post(`/admin/ledger/tax-rates/${id}/reject`, { note }),
};

export const opsExtraApi = {
    floatThresholds: () => api.get('/admin/float-thresholds'),
    updateFloatThresholds: (map) => api.put('/admin/float-thresholds', map),
    exportTransactionsCsv: (params) => api.get('/admin/transactions-export/csv', { params, responseType: 'blob' }),
    resolveMerchantNote: (merchantId, noteId) => api.post(`/admin/merchants/${merchantId}/review-notes/${noteId}/resolve`),
    userHistory: (phone, page = 0, size = 20) => api.get('/admin/user-history', { params: { phone, page, size } }),
};

export const providerToolsApi = {
    econetBalance: (msisdn, currency) => api.get('/econet/admin/balance', { params: { msisdn, currency } }),
    econetValidate: (msisdn, currency) => api.get('/econet/admin/validate', { params: { msisdn, currency } }),
    netoneWallet: () => api.get('/admin/netone/wallet-balance'),
    netoneWalletUsd: () => api.get('/admin/netone/wallet-balance-usd'),
    netoneEndUser: (mobile) => api.get('/admin/netone/end-user-balance', { params: { mobile } }),
    netonePinStock: () => api.get('/admin/netone/pin-stock'),
    netoneBundles: (currency) => api.get('/admin/netone/data-bundles', { params: { currency } }),
    omariStart: (msisdn, amount, currency) => api.post('/omari/admin/test-flow', { msisdn, amount, currency }),
    omariConfirm: (reference, otp, msisdn) => api.post('/omari/admin/test-payment', { reference, otp, msisdn }),
    omariQuery: (reference) => api.get(`/omari/admin/query/${encodeURIComponent(reference)}`),
    omariVoid: (reference) => api.post('/omari/admin/void', { reference }),
};

// Customer care: complaints and the central reversal desk.
export const careApi = {
    catalog: () => api.get('/admin/complaints/catalog'),
    summary: () => api.get('/admin/complaints/summary'),
    complaints: (status, q) => api.get('/admin/complaints', { params: { status: status || undefined, q: q || undefined } }),
    complaint: (id) => api.get(`/admin/complaints/${id}`),
    open: (body) => api.post('/admin/complaints', body),
    note: (id, note) => api.post(`/admin/complaints/${id}/notes`, { note }),
    assign: (id, to) => api.post(`/admin/complaints/${id}/assign`, { to }),
    status: (id, status, resolution) => api.post(`/admin/complaints/${id}/status`, { status, resolution }),
    trace: (ref) => api.get('/admin/reversals/trace', { params: { ref } }),
    complaintTrace: (ref) => api.get('/admin/complaints/trace', { params: { ref } }),
    reversals: (status) => api.get('/admin/reversals', { params: { status: status || undefined } }),
    request: (kind, targetRef, reason, complaintRef) => api.post('/admin/reversals', { kind, targetRef, reason, complaintRef }),
    approvals: () => api.get('/admin/reversal-approvals'),
    approve: (ref, note) => api.post(`/admin/reversal-approvals/${encodeURIComponent(ref)}/approve`, { note }),
    reject: (ref, note) => api.post(`/admin/reversal-approvals/${encodeURIComponent(ref)}/reject`, { note }),
    payout: (ref, payoutReference, method) => api.post(`/admin/reversal-approvals/${encodeURIComponent(ref)}/payout`, { payoutReference, method }),
    assist: () => api.get('/admin/complaints/assist'),
    triage: (text) => api.post('/admin/complaints/triage', { text }),
    explain: (ref) => api.get('/admin/complaints/explain', { params: { ref } }),
};

export const intelligenceApi = {
    overview: () => api.get('/admin/intelligence'),
    set: (feature, enabled) => api.post(`/admin/intelligence/features/${feature}`, { enabled }),
    retrain: () => api.post('/admin/intelligence/triage/retrain'),
};
