import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider as MuiThemeProvider } from '@mui/material';
import { useTheme } from './lib/theme.jsx';
import { useAuth } from './lib/auth.jsx';
import { canAccess, homeFor } from './lib/permissions';
import { buildMuiTheme } from './lib/muiTheme';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import { titleFor } from './lib/nav';
import RolesPage from './pages/RolesPage';
import ReportsHubPage from './pages/ReportsHubPage';
import ProviderStatusPage from './pages/ProviderStatusPage';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import TransactionDetailPage from './pages/TransactionDetailPage';
import AttentionQueuePage from './pages/AttentionQueuePage';
import ProductsPage from './pages/ProductsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import WalletBalancePage from './pages/WalletBalancePage';
import ConfigPage from './pages/ConfigPage';
import UsersPage from './pages/UsersPage';
import MerchantsPage from './pages/MerchantsPage';
import SettlementsPage from './pages/SettlementsPage';
import DisputesPage from './pages/DisputesPage';
import ReconciliationPage from './pages/ReconciliationPage';
import StatementReconciliationPage from './pages/StatementReconciliationPage';
import QueriesPage from './pages/QueriesPage';
import MerchantsDashboardPage from './pages/MerchantsDashboardPage';
import ConsumersDashboardPage from './pages/ConsumersDashboardPage';
import ConsumersPage from './pages/ConsumersPage';
import MerchantStatementPage from './pages/MerchantStatementPage';
import ConsolidatedReportPage from './pages/ConsolidatedReportPage';
import CommissionReportPage from './pages/CommissionReportPage';
import AccountPage from './pages/AccountPage';
import LogsPage from './pages/LogsPage';
import StatementPage from './pages/StatementPage';
// NEW: Import Bundle Manager Page
import BundleManagerPage from './pages/BundleManagerPage';
import WorkQueuesPage from './pages/platform/WorkQueuesPage';
import KybPage from './pages/platform/KybPage';
import DestinationsPage from './pages/platform/DestinationsPage';
import SettlementBatchesPage from './pages/platform/SettlementBatchesPage';
import ReconExceptionsPage from './pages/platform/ReconExceptionsPage';
import BankMessagesPage from './pages/platform/BankMessagesPage';
import IntegrationsPage from './pages/platform/IntegrationsPage';
import ProviderToolsPage from './pages/platform/ProviderToolsPage';
import MarketsPage from './pages/platform/MarketsPage';
import CustomerWalletsPage from './pages/platform/CustomerWalletsPage';
import AgentsPage from './pages/platform/AgentsPage';
import PosTerminalsPage from './pages/platform/PosTerminalsPage';
import UssdWhatsAppPage from './pages/platform/UssdWhatsAppPage';
import ProviderSettlementRulesPage from './pages/platform/ProviderSettlementRulesPage';
import LedgerPage from './pages/platform/LedgerPage';
import ChannelsProductsPage from './pages/platform/ChannelsProductsPage';
import PartyRulesPage from './pages/platform/PartyRulesPage';
import WalletReportPage from './pages/platform/WalletReportPage';
import CardsPage from './pages/platform/CardsPage';
import CodesPage from './pages/platform/CodesPage';
import CasesPage from './pages/compliance/CasesPage';
import RulesPage from './pages/compliance/RulesPage';
import ScreeningPage from './pages/compliance/ScreeningPage';
import ReportsPage from './pages/compliance/ReportsPage';
import AuditPage from './pages/compliance/AuditPage';
import AuthoritiesAdminPage from './pages/compliance/AuthoritiesAdminPage';

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
    const { dark } = useTheme();
    const muiTheme = React.useMemo(() => buildMuiTheme(dark), [dark]);

    return (
        <MuiThemeProvider theme={muiTheme}>
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
                                    <Route path="/customer-wallets" element={<CustomerWalletsPage />} />
                                    <Route path="/customer-wallets/report" element={<WalletReportPage />} />
                                    <Route path="/customer-wallets/cards" element={<CardsPage />} />
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
                                    <Route path="/reports" element={<ReportsHubPage />} />
                                    <Route path="/provider-status" element={<ProviderStatusPage />} />
                                    <Route path="*" element={<HomeRedirect />} />
                                </Routes>
                        </Shell>
                    </PrivateRoute>
                } />
            </Routes>
        </>
        </MuiThemeProvider>
    );
}