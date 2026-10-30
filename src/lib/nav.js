import {
    LayoutDashboard, ArrowLeftRight, Inbox, AlertTriangle, Activity, Plug, Wrench, BarChart2,
    Building2, LayoutGrid, BadgeCheck, FileText, Hash, SlidersHorizontal, MonitorSmartphone,
    HandCoins, UserCircle, WalletCards, FileSpreadsheet, CreditCard,
    Landmark, Banknote, ClipboardCheck, FileWarning, Scale, BookOpen, Wallet,
    FileBarChart, Percent, ScrollText, ShieldAlert, MessageCircleQuestion, Headset,
    Gavel, Search, Lock, KeyRound, ShieldCheck,
    Package, Grid, Timer, Network, Globe, MessagesSquare, Settings, Users, UserCog, User, Undo2,
} from 'lucide-react';

// The ops console menu. Every page appears exactly once; a group shows only the pages the user may open,
// and a group with none is hidden.
export const TOP = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { to: '/work-queues', icon: Inbox, label: 'Work Queues' },
    { to: '/attention', icon: AlertTriangle, label: 'Attention Queue' },
];

export const GROUPS = [
    { key: 'monitoring', label: 'Monitoring', icon: Activity, items: [
        { to: '/provider-status', icon: Activity, label: 'Provider Status' },
        { to: '/wallet', icon: Wallet, label: 'Float Balances' },
        { to: '/integrations', icon: Plug, label: 'Integrations' },
        { to: '/provider-tools', icon: Wrench, label: 'Provider Tools' },
        { to: '/analytics', icon: BarChart2, label: 'Analytics' },
    ] },
    { key: 'service', label: 'Customer Service', icon: Headset, items: [
        { to: '/complaints', icon: MessagesSquare, label: 'Complaints' },
        { to: '/reversals', icon: Undo2, label: 'Reversals', end: true },
        { to: '/reversals/approve', icon: ShieldCheck, label: 'Reversal Approval' },
        { to: '/statement', icon: FileText, label: 'Customer Statements' },
        { to: '/disputes', icon: ShieldAlert, label: 'Disputes' },
        { to: '/queries', icon: MessageCircleQuestion, label: 'Queries' },
    ] },
    { key: 'merchants', label: 'Merchants', icon: Building2, items: [
        { to: '/merchants/dashboard', icon: LayoutGrid, label: 'Merchants Dashboard' },
        { to: '/merchants', icon: Building2, label: 'Merchants & Applications', end: true },
        { to: '/kyb', icon: BadgeCheck, label: 'KYB Review' },
        { to: '/merchants/statement', icon: FileText, label: 'Merchant Statement' },
        { to: '/merchants/codes', icon: Hash, label: 'Merchant Codes' },
        { to: '/merchants/limits', icon: SlidersHorizontal, label: 'Limits & Charges' },
        { to: '/pos-terminals', icon: MonitorSmartphone, label: 'POS Terminals' },
    ] },
    { key: 'agents', label: 'Agents', icon: HandCoins, items: [
        { to: '/agents/dashboard', icon: LayoutGrid, label: 'Agents Dashboard' },
        { to: '/agents', icon: HandCoins, label: 'Agents & Float', end: true },
        { to: '/agents/codes', icon: Hash, label: 'Agent Codes' },
        { to: '/agents/limits', icon: SlidersHorizontal, label: 'Limits & Charges' },
    ] },
    { key: 'consumers', label: 'Consumers & Wallets', icon: UserCircle, items: [
        { to: '/consumers/dashboard', icon: LayoutGrid, label: 'Consumers Dashboard' },
        { to: '/consumers', icon: UserCircle, label: 'Consumers', end: true },
        { to: '/customer-wallets', icon: WalletCards, label: 'Customer Wallets', end: true },
        { to: '/customer-wallets/statement', icon: FileText, label: 'Wallet Statement' },
        { to: '/customer-wallets/balances', icon: Wallet, label: 'Wallet Balances' },
        { to: '/customer-wallets/report', icon: FileSpreadsheet, label: 'Wallet Report' },
        { to: '/customer-wallets/cards', icon: CreditCard, label: 'Cards' },
        { to: '/customer-wallets/limits', icon: SlidersHorizontal, label: 'Limits & Charges' },
    ] },
    { key: 'finance', label: 'Finance & Settlement', icon: Landmark, items: [
        { to: '/settlements', icon: Landmark, label: 'Settlements' },
        { to: '/settlement-batches', icon: Banknote, label: 'Settlement Batches' },
        { to: '/destinations', icon: Landmark, label: 'Payout Destinations' },
        { to: '/reconciliation', icon: ClipboardCheck, label: 'Reconciliation' },
        { to: '/statement-reconciliation', icon: FileSpreadsheet, label: 'Statement Reconciliation' },
        { to: '/recon-exceptions', icon: FileWarning, label: 'Recon Exceptions' },
        { to: '/bank-messages', icon: FileSpreadsheet, label: 'Bank Messages' },
        { to: '/provider-settlement-rules', icon: Scale, label: 'Provider Settlement Rules' },
        { to: '/ledger', icon: BookOpen, label: 'Ledger' },
    ] },
    { key: 'reports', label: 'Reports', icon: FileBarChart, items: [
        { to: '/reports', icon: FileBarChart, label: 'All Reports', end: true },
        { to: '/reports/consolidated', icon: FileBarChart, label: 'Consolidated Report' },
        { to: '/reports/commission', icon: Percent, label: 'Commission Report' },
        { to: '/logs', icon: ScrollText, label: 'System Logs' },
    ] },
    { key: 'compliance', label: 'Compliance', icon: ShieldCheck, items: [
        { to: '/compliance/cases', icon: Scale, label: 'Alerts & Cases' },
        { to: '/compliance/rules', icon: Gavel, label: 'Rules & Parameters' },
        { to: '/compliance/screening', icon: Search, label: 'Sanctions Screening' },
        { to: '/compliance/reports', icon: FileText, label: 'FIU Reports' },
        { to: '/compliance/audit', icon: Lock, label: 'Audit' },
        { to: '/compliance-authorities', icon: KeyRound, label: 'Compliance Authorities' },
    ] },
    { key: 'setup', label: 'Platform Setup', icon: Settings, items: [
        { to: '/products', icon: Package, label: 'Products & Payment Methods' },
        { to: '/bundles', icon: Grid, label: 'Bundle Manager' },
        { to: '/channels', icon: Network, label: 'Channels & Product Lines' },
        { to: '/markets', icon: Globe, label: 'Markets & Currencies' },
        { to: '/ussd-whatsapp', icon: MessagesSquare, label: 'USSD & WhatsApp' },
        { to: '/config', icon: Settings, label: 'Configuration' },
        { to: '/session-timeouts', icon: Timer, label: 'Session Timeouts' },
    ] },
    { key: 'admin', label: 'Administration', icon: UserCog, items: [
        { to: '/users', icon: Users, label: 'Staff Users' },
        { to: '/roles', icon: KeyRound, label: 'Roles & Permissions' },
        { to: '/account', icon: User, label: 'My Profile' },
    ] },
];

/** Page title for the top bar and the browser tab. */
export function titleFor(path) {
    const all = [...TOP, ...GROUPS.flatMap(g => g.items)];
    const exact = all.find(i => i.to === path);
    if (exact) return exact.label;
    const parent = all.filter(i => path.startsWith(i.to + '/')).sort((a, b) => b.to.length - a.to.length)[0];
    return parent ? parent.label : '';
}
