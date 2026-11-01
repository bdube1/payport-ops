import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTheme } from './lib/theme.jsx';
import { useAuth } from './lib/auth.jsx';
import { canAccess, homeFor } from './lib/permissions';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import { titleFor } from './lib/nav';
import { useIdleLogout } from './lib/idle';
const SessionTimeoutsPage = React.lazy(() => import('./pages/platform/SessionTimeoutsPage'));
const RolesPage = React.lazy(() => import('./pages/RolesPage'));
const IntelligencePage = React.lazy(() => import('./pages/IntelligencePage'));
const ReportsHubPage = React.lazy(() => import('./pages/ReportsHubPage'));
const ProviderStatusPage = React.lazy(() => import('./pages/ProviderStatusPage'));
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const TransactionsPage = React.lazy(() => import('./pages/TransactionsPage'));
const TransactionDetailPage = React.lazy(() => import('./pages/TransactionDetailPage'));
const AttentionQueuePage = React.lazy(() => import('./pages/AttentionQueuePage'));
const ProductsPage = React.lazy(() => import('./pages/ProductsPage'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'));
const WalletBalancePage = React.lazy(() => import('./pages/WalletBalancePage'));
const ConfigPage = React.lazy(() => import('./pages/ConfigPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const MerchantsPage = React.lazy(() => import('./pages/MerchantsPage'));
const SettlementsPage = React.lazy(() => import('./pages/SettlementsPage'));
const DisputesPage = React.lazy(() => import('./pages/DisputesPage'));
const ReconciliationPage = React.lazy(() => import('./pages/ReconciliationPage'));
const StatementReconciliationPage = React.lazy(() => import('./pages/StatementReconciliationPage'));
const QueriesPage = React.lazy(() => import('./pages/QueriesPage'));
const ComplaintsPage = React.lazy(() => import('./pages/care/ComplaintsPage'));
const ReversalsPage = React.lazy(() => import('./pages/care/ReversalsPage'));
const MerchantsDashboardPage = React.lazy(() => import('./pages/MerchantsDashboardPage'));
const ConsumersDashboardPage = React.lazy(() => import('./pages/ConsumersDashboardPage'));
const ConsumersPage = React.lazy(() => import('./pages/ConsumersPage'));
const MerchantStatementPage = React.lazy(() => import('./pages/MerchantStatementPage'));
const ConsolidatedReportPage = React.lazy(() => import('./pages/ConsolidatedReportPage'));
const CommissionReportPage = React.lazy(() => import('./pages/CommissionReportPage'));
const AccountPage = React.lazy(() => import('./pages/AccountPage'));
const LogsPage = React.lazy(() => import('./pages/LogsPage'));
const StatementPage = React.lazy(() => import('./pages/StatementPage'));
// NEW: Import Bundle Manager Page
const BundleManagerPage = React.lazy(() => import('./pages/BundleManagerPage'));
const WorkQueuesPage = React.lazy(() => import('./pages/platform/WorkQueuesPage'));
const KybPage = React.lazy(() => import('./pages/platform/KybPage'));
const DestinationsPage = React.lazy(() => import('./pages/platform/DestinationsPage'));
const SettlementBatchesPage = React.lazy(() => import('./pages/platform/SettlementBatchesPage'));
const ReconExceptionsPage = React.lazy(() => import('./pages/platform/ReconExceptionsPage'));
const BankMessagesPage = React.lazy(() => import('./pages/platform/BankMessagesPage'));
const IntegrationsPage = React.lazy(() => import('./pages/platform/IntegrationsPage'));
const ProviderToolsPage = React.lazy(() => import('./pages/platform/ProviderToolsPage'));
const MarketsPage = React.lazy(() => import('./pages/platform/MarketsPage'));
const CustomerWalletsPage = React.lazy(() => import('./pages/platform/CustomerWalletsPage'));
const AgentsPage = React.lazy(() => import('./pages/platform/AgentsPage'));
const PosTerminalsPage = React.lazy(() => import('./pages/platform/PosTerminalsPage'));
const UssdWhatsAppPage = React.lazy(() => import('./pages/platform/UssdWhatsAppPage'));
const ProviderSettlementRulesPage = React.lazy(() => import('./pages/platform/ProviderSettlementRulesPage'));
const LedgerPage = React.lazy(() => import('./pages/platform/LedgerPage'));
const ChannelsProductsPage = React.lazy(() => import('./pages/platform/ChannelsProductsPage'));
const StoresPage = React.lazy(() => import('./pages/platform/StoresPage'));
const ForecastsPage = React.lazy(() => import('./pages/finance/ForecastsPage'));
const PartyRulesPage = React.lazy(() => import('./pages/platform/PartyRulesPage'));
const WalletReportPage = React.lazy(() => import('./pages/platform/WalletReportPage'));
const CardsPage = React.lazy(() => import('./pages/platform/CardsPage'));
const WalletStatementPage = React.lazy(() => import('./pages/platform/WalletStatementPage'));
const WalletBalancesPage = React.lazy(() => import('./pages/platform/WalletBalancesPage'));
const CodesPage = React.lazy(() => import('./pages/platform/CodesPage'));
const CasesPage = React.lazy(() => import('./pages/compliance/CasesPage'));
const RulesPage = React.lazy(() => import('./pages/compliance/RulesPage'));
const ScreeningPage = React.lazy(() => import('./pages/compliance/ScreeningPage'));
const ReportsPage = React.lazy(() => import('./pages/compliance/ReportsPage'));
const AuditPage = React.lazy(() => import('./pages/compliance/AuditPage'));
const AuthoritiesAdminPage = React.lazy(() => import('./pages/compliance/AuthoritiesAdminPage'));

function HomeRedirect() {
    const { user } = useAuth();
    return <Navigate to={homeFor(user)} replace />;
}

function Shell({ children }) {
    const location = useLocation();
    const [open, setOpen] = React.useState(false);
    React.useEffect(() => {
        const t = titleFor(location.pathname);
        document.title = t ? `${t} · Payport Ops` : 'Payport Ops';
        setOpen(false);
        window.scrollTo(0, 0);
    }, [location.pathname]);
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Sidebar open={open} onNavigate={() => setOpen(false)} />
            {open && <div className="op-drawer-back" style={{ zIndex: 90 }} onClick={() => setOpen(false)} />}
            <main className="op-main" id="main-content">
                <Topbar onMenu={() => setOpen(o => !o)} />
                <div className="op-content" key={location.pathname}>{children}</div>
            </main>
        </div>
    );
}

function PrivateRoute({ children }) {
    const { user } = useAuth();
    const location = useLocation();
    if (!user) return <Navigate to="/login" replace />;
    // Menu hiding alone isn't access control -- someone can still type the
    // URL directly. This is what actually blocks the page, using the exact
    // same role map the sidebar uses to decide what to show.
    //
    // Two safety rules, both learned the hard way:
    // 1. Never redirect to the same path we just denied -- that's an
    //    infinite loop (a blank white screen, not an error).
    // 2. If role data is missing/unrecognized, fail OPEN, not closed. A bug
    //    in how the role got read should never mean nobody can use the app.
    const home = homeFor(user);
    if (!canAccess(user, location.pathname) && location.pathname !== home) {
        return <Navigate to={home} replace />;
    }
    return children;
}

export default function App() {
    const { user, logout } = useAuth();
    // Signed out after the ops time-out without activity (Platform Setup → Session Timeouts).
    useIdleLogout(user ? localStorage.getItem('ops_token') : null, 'ops', () => {
        logout();
        window.location.href = '/login?timeout=1';
    });

    return (
        <>
            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: 'var(--bg-card)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        fontFamily: 'var(--font)',
                        fontSize: '13px',
                        boxShadow: 'var(--shadow)',
                    },
                }}
            />
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/*" element={
                    <PrivateRoute>
                        <Shell>
                            <React.Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>}>
                                <Routes>
                                    <Route path="/" element={<HomeRedirect />} />
                                    <Route path="/dashboard" element={<DashboardPage />} />
                                    <Route path="/transactions" element={<TransactionsPage />} />
                                    <Route path="/transactions/:ref" element={<TransactionDetailPage />} />
                                    <Route path="/attention" element={<AttentionQueuePage />} />
                                    <Route path="/analytics" element={<AnalyticsPage />} />
                                    <Route path="/products" element={<ProductsPage />} />
                                    <Route path="/wallet" element={<WalletBalancePage />} />
                                    <Route path="/config" element={<ConfigPage />} />
                                    <Route path="/users" element={<UsersPage />} />
                                    <Route path="/merchants" element={<MerchantsPage />} />
                                    <Route path="/settlements" element={<SettlementsPage />} />
                                    <Route path="/disputes" element={<DisputesPage />} />
                                    <Route path="/reconciliation" element={<ReconciliationPage />} />
                                    <Route path="/statement-reconciliation" element={<StatementReconciliationPage />} />
                                    <Route path="/queries" element={<QueriesPage />} />
                                    <Route path="/complaints" element={<ComplaintsPage />} />
                                    <Route path="/reversals" element={<ReversalsPage />} />
                                    <Route path="/reversals/approve" element={<ReversalsPage />} />
                                    <Route path="/merchants/dashboard" element={<MerchantsDashboardPage />} />
                                    <Route path="/consumers/dashboard" element={<ConsumersDashboardPage />} />
                                    <Route path="/consumers" element={<ConsumersPage />} />
                                    <Route path="/merchants/statement" element={<MerchantStatementPage />} />
                                    <Route path="/reports/consolidated" element={<ConsolidatedReportPage />} />
                                    <Route path="/reports/commission" element={<CommissionReportPage />} />
                                    <Route path="/account" element={<AccountPage />} />
                                    <Route path="/logs" element={<LogsPage />} />
                                    <Route path="/statement" element={<StatementPage />} />
                                    {/* NEW: Bundle Manager Route */}
                                    <Route path="/bundles" element={<BundleManagerPage />} />
                                    <Route path="/work-queues" element={<WorkQueuesPage />} />
                                    <Route path="/kyb" element={<KybPage />} />
                                    <Route path="/destinations" element={<DestinationsPage />} />
                                    <Route path="/settlement-batches" element={<SettlementBatchesPage />} />
                                    <Route path="/recon-exceptions" element={<ReconExceptionsPage />} />
                                    <Route path="/bank-messages" element={<BankMessagesPage />} />
                                    <Route path="/integrations" element={<IntegrationsPage />} />
                                    <Route path="/provider-tools" element={<ProviderToolsPage />} />
                                    <Route path="/markets" element={<MarketsPage />} />
                                    <Route path="/channels" element={<ChannelsProductsPage />} />
                                    <Route path="/stores" element={<StoresPage />} />
                                    <Route path="/forecasts" element={<ForecastsPage />} />
                                    <Route path="/customer-wallets" element={<CustomerWalletsPage />} />
                                    <Route path="/customer-wallets/report" element={<WalletReportPage />} />
                                    <Route path="/customer-wallets/cards" element={<CardsPage />} />
                                    <Route path="/customer-wallets/statement" element={<WalletStatementPage />} />
                                    <Route path="/customer-wallets/balances" element={<WalletBalancesPage />} />
                                    <Route path="/customer-wallets/limits" element={<PartyRulesPage key="WALLET" party="WALLET" title="Wallet limits & charges" />} />
                                    <Route path="/agents/codes" element={<CodesPage key="AGENT" type="AGENT" />} />
                                    <Route path="/merchants/codes" element={<CodesPage key="MERCHANT" type="MERCHANT" />} />
                                    <Route path="/agents/limits" element={<PartyRulesPage key="AGENT" party="AGENT" title="Agent limits & charges" />} />
                                    <Route path="/merchants/limits" element={<PartyRulesPage key="MERCHANT" party="MERCHANT" title="Merchant limits & charges" />} />
                                    <Route path="/agents" element={<AgentsPage view="list" />} />
                                    <Route path="/agents/dashboard" element={<AgentsPage view="dashboard" />} />
                                    <Route path="/pos-terminals" element={<PosTerminalsPage />} />
                                    <Route path="/ussd-whatsapp" element={<UssdWhatsAppPage />} />
                                    <Route path="/provider-settlement-rules" element={<ProviderSettlementRulesPage />} />
                                    <Route path="/ledger" element={<LedgerPage />} />
                                    <Route path="/compliance-authorities" element={<AuthoritiesAdminPage />} />
                                    <Route path="/compliance/cases" element={<CasesPage />} />
                                    <Route path="/compliance/rules" element={<RulesPage />} />
                                    <Route path="/compliance/screening" element={<ScreeningPage />} />
                                    <Route path="/compliance/reports" element={<ReportsPage />} />
                                    <Route path="/compliance/audit" element={<AuditPage />} />
                                    <Route path="/roles" element={<RolesPage />} />
                                    <Route path="/intelligence" element={<IntelligencePage />} />
                                    <Route path="/session-timeouts" element={<SessionTimeoutsPage />} />
                                    <Route path="/reports" element={<ReportsHubPage />} />
                                    <Route path="/provider-status" element={<ProviderStatusPage />} />
                                    <Route path="*" element={<HomeRedirect />} />
                                </Routes>
                            </React.Suspense>
                        </Shell>
                    </PrivateRoute>
                } />
            </Routes>
        </>
    );
}