import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.payport.africa';

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
    window.location.href = '/ops/login';
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
        if (err.response?.status === 401 || err.response?.status === 403) {
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
export const openDispute = (checkoutSessionId, amountCents, reason) => api.post('/admin/disputes', { checkoutSessionId, amountCents, reason });
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
export const completeRefund = (ref, { refundReference, refundMethod, reason }) =>
    api.post(`/admin/transactions/${ref}/complete-refund`, { refundReference, refundMethod, reason });

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
