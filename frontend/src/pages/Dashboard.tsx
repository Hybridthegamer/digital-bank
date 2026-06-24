import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { Account, Transaction } from '../types';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { approved: 'badge-green', declined: 'badge-red', flagged: 'badge-yellow', pending: 'badge-gray' };
  return <span className={map[status] ?? 'badge-gray'}>{status}</span>;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/accounts/'), api.get('/payments/history?page_size=5')]).then(([aRes, tRes]) => {
      setAccounts(aRes.data);
      setTransactions(tRes.data.items);
    }).finally(() => setLoading(false));
  }, []);

  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.full_name}</h1>
        <p className="text-gray-500 text-sm">Your financial dashboard</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card bg-gradient-to-br from-blue-600 to-blue-800 text-white">
              <p className="text-blue-200 text-sm font-medium">Total Balance</p>
              <p className="text-3xl font-bold mt-2">₦{totalBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
              <p className="text-blue-200 text-xs mt-1">{accounts.length} account(s)</p>
            </div>
            <div className="card">
              <p className="text-gray-500 text-sm font-medium">Total Transactions</p>
              <p className="text-3xl font-bold mt-2 text-gray-800">{transactions.length}</p>
              <p className="text-gray-400 text-xs mt-1">Last 5 shown below</p>
            </div>
            <div className="card">
              <p className="text-gray-500 text-sm font-medium">Security</p>
              <p className="text-xl font-bold mt-2 text-gray-800">{user?.mfa_enabled ? '2FA Active' : '2FA Inactive'}</p>
              {!user?.mfa_enabled && (
                <Link to="/mfa-setup" className="text-blue-600 text-xs mt-1 hover:underline">Enable 2FA →</Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map(acct => (
              <div key={acct.id} className="card flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">{acct.account_type} · {acct.currency}</p>
                  <p className="font-mono font-medium text-gray-800 mt-1">{acct.account_number}</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">₦{parseFloat(acct.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Link to="/transfer" className="btn-primary text-sm py-1 text-center">Transfer</Link>
                  <button className="btn-secondary text-sm py-1" onClick={() => api.post(`/accounts/${acct.id}/fund`, { amount: 10000 }).then(() => window.location.reload())}>
                    Fund ₦10k
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-800">Recent Transactions</h2>
              <Link to="/history" className="text-blue-600 text-sm hover:underline">View all</Link>
            </div>
            {transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No transactions yet</p>
            ) : (
              <div className="divide-y">
                {transactions.map(tx => (
                  <div key={tx.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1)}</p>
                      <p className="text-xs text-gray-400">{tx.narration || tx.nip_reference} · {new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">₦{parseFloat(tx.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                      <StatusBadge status={tx.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
