// Who may open each page. Staff roles are configurable (Administration → Roles & permissions): the login and
// /admin/roles/me return the pages the user's role may open (`user.routes`), and that list decides both the
// menu and the route guard. ROUTE_ROLES is only the fallback for a session that has no list yet.

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
    '/roles':         ['ADMIN'],
    '/intelligence':  ['ADMIN'],
    '/session-timeouts': ['ADMIN'],
    '/merchants':     ['ADMIN', 'OPS'],
    '/merchants/dashboard': ['ADMIN', 'OPS'],
    '/merchants/statement': ['ADMIN', 'OPS', 'FINANCE'],
    '/merchants/limits': ['ADMIN', 'OPS', 'FINANCE', 'COMPLIANCE'],
    '/merchants/codes': ['ADMIN', 'OPS', 'FINANCE', 'COMPLIANCE'],
    '/consumers':     ['ADMIN', 'OPS'],
    '/consumers/dashboard': ['ADMIN', 'OPS'],
    '/reports':       ['ADMIN', 'OPS', 'FINANCE'],
    '/reports/consolidated': ['ADMIN', 'OPS'],
    '/reports/commission': ['ADMIN', 'OPS', 'FINANCE'],
    '/settlements':   ['ADMIN', 'OPS'],
    '/disputes':      ['ADMIN', 'OPS'],
    '/reconciliation':['ADMIN', 'OPS'],
    '/statement-reconciliation': ['ADMIN', 'OPS'],
    '/queries':       ['ADMIN', 'OPS'],
    '/complaints':    ['ADMIN', 'OPS', 'FINANCE', 'COMPLIANCE'],
    '/reversals/approve': ['ADMIN', 'FINANCE'],
    '/reversals':     ['ADMIN', 'OPS'],
    '/logs':          ['ADMIN', 'OPS'],
    '/work-queues':   ['ADMIN', 'OPS', 'FINANCE'],
    '/kyb':           ['ADMIN', 'OPS'],
    '/destinations':  ['ADMIN', 'OPS', 'FINANCE'],
    '/settlement-batches': ['ADMIN', 'FINANCE'],
    '/recon-exceptions':   ['ADMIN', 'FINANCE'],
    '/bank-messages': ['ADMIN', 'FINANCE'],
    '/provider-status': ['ADMIN', 'OPS'],
    '/integrations':  ['ADMIN', 'OPS'],
    '/provider-tools': ['ADMIN', 'OPS', 'FINANCE'],
    '/markets':       ['ADMIN', 'OPS', 'FINANCE', 'COMPLIANCE'],
    '/channels':      ['ADMIN', 'OPS', 'FINANCE', 'COMPLIANCE'],
    '/customer-wallets': ['ADMIN', 'OPS', 'FINANCE', 'COMPLIANCE'],
    '/agents':        ['ADMIN', 'OPS', 'FINANCE', 'COMPLIANCE'],
    '/pos-terminals': ['ADMIN', 'OPS', 'COMPLIANCE'],
    '/ussd-whatsapp': ['ADMIN', 'OPS', 'COMPLIANCE'],
    '/provider-settlement-rules': ['ADMIN', 'FINANCE', 'COMPLIANCE'],
    '/ledger':        ['ADMIN', 'FINANCE', 'COMPLIANCE'],
    '/compliance-authorities': ['ADMIN'],
    // Compliance console: COMPLIANCE only (ADMIN deliberately excluded, as on the backend).
    '/compliance':    ['COMPLIANCE'],
};

const ALWAYS = ['/account'];

/** The page entry a path falls under (exact, else the longest parent: /transactions/PP-1 → /transactions). */
function entryFor(path, keys) {
    if (keys.includes(path)) return path;
    return keys.filter(p => path.startsWith(p + '/')).sort((a, b) => b.length - a.length)[0] || null;
}

/** Accepts the signed-in user (preferred) or, for older callers, just a role name. */
export function canAccess(userOrRole, path) {
    if (ALWAYS.some(p => path === p || path.startsWith(p + '/'))) return true;
    const user = typeof userOrRole === 'string' ? { role: userOrRole } : (userOrRole || {});
    if (Array.isArray(user.routes)) {
        const hit = entryFor(path, user.routes);
        if (hit) return true;
        // a page the catalogue does not list (e.g. /login) is never blocked here
        return !entryFor(path, Object.keys(ROUTE_ROLES));
    }
    const key = entryFor(path, Object.keys(ROUTE_ROLES));
    if (!key) return true;
    if (!user.role) return true; // never lock everyone out over a missing role
    return ROUTE_ROLES[key].includes(user.role);
}

const PREFERRED_HOME = ['/dashboard', '/work-queues', '/compliance/cases', '/transactions'];

/** Where a user lands after login: the first page they may open. */
export function homeFor(userOrRole) {
    const user = typeof userOrRole === 'string' ? { role: userOrRole } : (userOrRole || {});
    if (!Array.isArray(user.routes)) {
        if (user.role === 'COMPLIANCE') return '/compliance/cases';
        if (user.role === 'OPS' || user.role === 'FINANCE') return '/work-queues';
        return '/dashboard';
    }
    const first = PREFERRED_HOME.find(p => canAccess(user, p));
    if (first) return first;
    const any = user.routes.find(r => r !== '/account');
    return any === '/compliance' ? '/compliance/cases' : (any || '/account');
}
