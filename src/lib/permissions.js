// Single source of truth for which roles can see/reach each page.
// Used by both Sidebar.jsx (to hide menu items) and App.jsx (to actually
// block the route) -- a menu item hidden but its route left open isn't
// real access control, and a route guarded from a menu definition that
// silently drifts out of sync isn't either. Keeping both fed from this one
// place is what prevents that.

export const ROUTE_ROLES = {
    '/dashboard':     ['ADMIN', 'OPS', 'FINANCE'],
    '/transactions':  ['ADMIN', 'OPS', 'FINANCE'],
    '/attention':     ['ADMIN', 'OPS'],
    '/statement':     ['ADMIN', 'OPS', 'FINANCE'],
    '/analytics':     ['ADMIN', 'OPS', 'FINANCE'],
    '/wallet':        ['ADMIN', 'OPS', 'FINANCE'],
    '/products':      ['ADMIN', 'OPS'],
    '/bundles':       ['ADMIN', 'OPS'],
    '/config':        ['ADMIN', 'OPS'],
    '/users':         ['ADMIN'],
    '/merchants':     ['ADMIN', 'OPS'],
    '/merchants/dashboard': ['ADMIN', 'OPS'],
    '/merchants/statement': ['ADMIN', 'OPS', 'FINANCE'],
    '/consumers':     ['ADMIN', 'OPS'],
    '/consumers/dashboard': ['ADMIN', 'OPS'],
    '/reports/consolidated': ['ADMIN', 'OPS'],
    '/reports/commission': ['ADMIN', 'OPS', 'FINANCE'],
    '/settlements':   ['ADMIN', 'OPS'],
    '/disputes':      ['ADMIN', 'OPS'],
    '/reconciliation':['ADMIN', 'OPS'],
    '/queries':       ['ADMIN', 'OPS'],
    '/logs':          ['ADMIN', 'OPS'],
    // Phase 4-7
    '/work-queues':   ['ADMIN', 'OPS', 'FINANCE'],
    '/kyb':           ['ADMIN', 'OPS'],
    '/destinations':  ['ADMIN', 'OPS', 'FINANCE'],
    '/settlement-batches': ['ADMIN', 'FINANCE'],
    '/recon-exceptions':   ['ADMIN', 'FINANCE'],
    '/bank-messages': ['ADMIN', 'FINANCE'],
    '/integrations':  ['ADMIN', 'OPS'],
    '/markets':       ['ADMIN', 'OPS', 'FINANCE', 'COMPLIANCE'],
    '/channels':      ['ADMIN', 'OPS', 'FINANCE', 'COMPLIANCE'],
    // Phase 8
    '/customer-wallets': ['ADMIN', 'OPS', 'FINANCE', 'COMPLIANCE'],
    '/agents':        ['ADMIN', 'OPS', 'FINANCE', 'COMPLIANCE'],
    '/pos-terminals': ['ADMIN', 'OPS', 'COMPLIANCE'],
    '/provider-settlement-rules': ['ADMIN', 'FINANCE', 'COMPLIANCE'],
    '/ledger':        ['ADMIN', 'FINANCE', 'COMPLIANCE'],
    '/compliance-authorities': ['ADMIN'],
    // Compliance console: COMPLIANCE only (ADMIN deliberately excluded, as on the backend).
    '/compliance':    ['COMPLIANCE'],
};

/** Where each role lands after login. */
export function homeFor(role) {
    if (role === 'COMPLIANCE') return '/compliance/cases';
    if (role === 'OPS' || role === 'FINANCE') return '/work-queues';
    return '/dashboard';
}

/** Finds the ROUTE_ROLES entry for a given path, matching sub-paths too
 *  (e.g. /transactions/PP-WEB-123 matches the /transactions entry). */
export function allowedRoles(path) {
    if (ROUTE_ROLES[path]) return ROUTE_ROLES[path];
    const match = Object.keys(ROUTE_ROLES).find(p => path.startsWith(p + '/'));
    return match ? ROUTE_ROLES[match] : null; // null = no restriction defined
}

export function canAccess(role, path) {
    const roles = allowedRoles(path);
    if (!roles) return true; // routes with no entry (e.g. /login) are never blocked here
    if (!role) return true; // unknown/missing role -- fail open, never lock out the whole app over this
    return roles.includes(role);
}
