import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { to: '/transfer', label: 'Transfer', icon: '↗' },
  { to: '/history', label: 'History', icon: '≡' },
  { to: '/cards', label: 'Cards', icon: '▣' },
  { to: '/crypto', label: 'Crypto', icon: '◈' },
  { to: '/giftcards', label: 'Gift Cards', icon: '◉' },
  { to: '/mfa-setup', label: 'Security', icon: '⊕' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      try { await api.post('/auth/logout', { refresh_token: refresh }); } catch {}
    }
    clearAuth();
    navigate('/login');
  };

  const navItems = [
    ...NAV_ITEMS,
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: '⚙' }] : []),
  ];

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <div className="min-h-screen flex bg-[#0D1117]">
      {/* Sidebar */}
      <aside className="w-64 min-h-screen bg-[#0A0E1A] border-r border-white/8 flex flex-col fixed left-0 top-0 z-40">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/30">
              S
            </div>
            <div>
              <div className="font-bold text-white text-sm tracking-tight">SDPS Bank</div>
              <div className="text-xs text-gray-500">Secure Digital Payments</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={active ? 'nav-item-active' : 'nav-item'}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-white/8">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.full_name}</div>
              <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <span>⏻</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#0D1117]/80 backdrop-blur-xl border-b border-white/8 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-white capitalize">
              {location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
            </h1>
            <p className="text-xs text-gray-500">
              {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user?.mfa_enabled && (
              <span className="badge-green text-xs">MFA Active</span>
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-8 py-8 max-w-6xl mx-auto w-full">
          {children}
        </main>

        <footer className="text-center text-xs text-gray-600 py-4 border-t border-white/5">
          SDPS v1.0 — AES-256-GCM Encrypted · RS256 JWT Auth · TOTP MFA
        </footer>
      </div>
    </div>
  );
}
