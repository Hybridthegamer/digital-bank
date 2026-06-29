import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { Account, Transaction } from '../types';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'badge-green',
    completed: 'badge-green',
    declined: 'badge-red',
    flagged: 'badge-yellow',
    pending: 'badge-gray',
  };
  return <span className={map[status] ?? 'badge-gray'}>{status}</span>;
}

function TxIcon({ type }: { type: string }) {
  const icons: Record<string, { icon: string; color: string }> = {
    transfer: { icon: '↗', color: 'text-blue-400 bg-blue-500/20' },
    deposit: { icon: '↙', color: 'text-emerald-400 bg-emerald-500/20' },
    withdrawal: { icon: '↗', color: 'text-red-400 bg-red-500/20' },
  };
  const { icon, color } = icons[type] ?? { icon: '·', color: 'text-gray-400 bg-white/10' };
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${color}`}>
      {icon}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [funding, setFunding] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get('/accounts/'), api.get('/payments/history?page_size=5')]).then(([aRes, tRes]) => {
      setAccounts(aRes.data);
      setTransactions(tRes.data.items);
    }).finally(() => setLoading(false));
  }, []);

  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);

  const handleFund = async (id: string) => {
    setFunding(id);
    try {
      await api.post(`/accounts/${id}/fund`, { amount: 10000 });
      const res = await api.get('/accounts/');
      setAccounts(res.data);
    } finally {
      setFunding(null);
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{greeting()}, {user?.full_name?.split(' ')[0]} 👋</h1>
          <p className="text-gray-400 text-sm mt-1">Here's your financial overview</p>
        </div>
        {!user?.mfa_enabled && (
          <Link to="/mfa-setup" className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm px-4 py-2 rounded-xl hover:bg-amber-500/20 transition-colors">
            <span>⚠</span>
            Enable 2FA
          </Link>
        )}
      </div>

      {/* Balance hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700 p-8 shadow-2xl shadow-blue-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10">
          <p className="text-blue-200 text-sm font-medium mb-1">Total Balance</p>
          <p className="text-5xl font-black text-white tracking-tight">
            ₦{totalBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-blue-200 text-sm mt-2">{accounts.length} account{accounts.length !== 1 ? 's' : ''} · NGN</p>
        </div>
        <div className="relative z-10 mt-6 flex gap-3">
          <Link to="/transfer" className="bg-white text-blue-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
            Send Money
          </Link>
          <Link to="/history" className="bg-white/20 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/30 transition-colors border border-white/20">
            View History
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { to: '/transfer', label: 'Transfer', icon: '↗', color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400' },
          { to: '/crypto', label: 'Crypto', icon: '◈', color: 'from-violet-500/20 to-violet-600/20 border-violet-500/30 text-violet-400' },
          { to: '/giftcards', label: 'Gift Cards', icon: '◉', color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 text-emerald-400' },
          { to: '/cards', label: 'Cards', icon: '▣', color: 'from-amber-500/20 to-amber-600/20 border-amber-500/30 text-amber-400' },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`card bg-gradient-to-br ${item.color} border flex flex-col items-center justify-center gap-2 py-6 hover:scale-[1.02] transition-transform`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-sm font-semibold text-white">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Accounts */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Your Accounts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map(acct => (
            <div key={acct.id} className="card flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider">{acct.account_type} · {acct.currency}</p>
                <p className="font-mono text-sm text-gray-300 mt-1">{acct.account_number}</p>
                <p className="text-2xl font-bold text-white mt-1">
                  ₦{parseFloat(acct.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <button
                onClick={() => handleFund(acct.id)}
                disabled={funding === acct.id}
                className="btn-secondary text-sm"
              >
                {funding === acct.id ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                ) : '+ ₦10k'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-semibold text-white text-lg">Recent Transactions</h2>
          <Link to="/history" className="text-blue-400 text-sm hover:text-blue-300 transition-colors">View all →</Link>
        </div>
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3 opacity-30">≡</div>
            <p className="text-gray-500">No transactions yet</p>
            <Link to="/transfer" className="text-blue-400 text-sm mt-2 inline-block hover:text-blue-300">Make your first transfer →</Link>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-4 py-3 px-2 rounded-xl hover:bg-white/3 transition-colors">
                <TxIcon type={tx.transaction_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white capitalize">{tx.transaction_type}</p>
                  <p className="text-xs text-gray-500 truncate">{tx.narration || tx.nip_reference || '—'} · {new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-white text-sm">₦{parseFloat(tx.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                  <StatusBadge status={tx.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security reminder */}
      {user?.mfa_enabled && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <span className="text-emerald-400 text-lg">✓</span>
          <span className="text-emerald-400 text-sm font-medium">2-Factor Authentication is active — your account is secured</span>
        </div>
      )}
    </div>
  );
}
