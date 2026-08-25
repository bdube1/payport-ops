import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider as MuiThemeProvider } from '@mui/material';
import { useTheme } from './lib/theme.jsx';
import { useAuth } from './lib/auth.jsx';
import { canAccess } from './lib/permissions';
import { buildMuiTheme } from './lib/muiTheme';
import Sidebar from './components/layout/Sidebar';
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
    if (user.role && !canAccess(user.role, location.pathname) && location.pathname !== '/dashboard') {
        return <Navigate to="/dashboard" replace />;
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
                        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
                            <Sidebar />
                            <main style={{
                                flex: 1, marginLeft: 240, minHeight: '100vh',
                                background: 'var(--bg)', overflow: 'auto',
                                transition: 'margin-left 0.3s',
                            }} id="main-content">
                                <Routes>
                                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
                                </Routes>
                            </main>
                        </div>
                    </PrivateRoute>
                } />
            </Routes>
        </>
        </MuiThemeProvider>
    );
}