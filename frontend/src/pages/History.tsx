import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Transaction } from '../types';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'badge-green', completed: 'badge-green',
    declined: 'badge-red', flagged: 'badge-yellow', pending: 'badge-gray',
  };
  return <span className={map[status] ?? 'badge-gray'}>{status}</span>;
}

export default function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', transaction_type: '', min_amount: '', max_amount: '' });

  const load = (p = page) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), page_size: '15' });
    if (filters.status) params.set('status', filters.status);
    if (filters.transaction_type) params.set('transaction_type', filters.transaction_type);
    if (filters.min_amount) params.set('min_amount', filters.min_amount);
    if (filters.max_amount) params.set('max_amount', filters.max_amount);
    api.get(`/payments/history?${params}`).then(r => {
      setTransactions(r.data.items);
      setTotal(r.data.total);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(1); setPage(1); }, [filters]);
  useEffect(() => { if (page > 1) load(page); }, [page]);

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Transaction History</h1>
        <p className="text-gray-400 text-sm mt-1">{total} total transactions</p>
      </div>

      {/* Filters */}
      <div className="card grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="label text-xs">Status</label>
          <select className="input-field text-sm py-2" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All statuses</option>
            {['approved', 'declined', 'flagged', 'pending'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">Type</label>
          <select className="input-field text-sm py-2" value={filters.transaction_type} onChange={e => setFilters(f => ({ ...f, transaction_type: e.target.value }))}>
            <option value="">All types</option>
            {['transfer', 'deposit', 'withdrawal'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">Min Amount (₦)</label>
          <input className="input-field text-sm py-2" type="number" placeholder="0" value={filters.min_amount} onChange={e => setFilters(f => ({ ...f, min_amount: e.target.value }))} />
        </div>
        <div>
          <label className="label text-xs">Max Amount (₦)</label>
          <input className="input-field text-sm py-2" type="number" placeholder="∞" value={filters.max_amount} onChange={e => setFilters(f => ({ ...f, max_amount: e.target.value }))} />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-20">≡</div>
            <p className="text-gray-500">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fraud Score</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Narration</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="table-row">
                    <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <br />
                      <span className="text-gray-600">{new Date(tx.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize font-medium text-white">{tx.transaction_type}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-white whitespace-nowrap">
                      ₦{parseFloat(tx.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={tx.status} /></td>
                    <td className="px-6 py-4">
                      {tx.fraud_score != null ? (
                        <span className={`text-xs font-mono ${tx.fraud_score > 0.75 ? 'text-red-400' : tx.fraud_score > 0.4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {tx.fraud_score.toFixed(3)}
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs max-w-xs truncate">
                      {tx.narration || tx.nip_reference || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-white/8">
            <span className="text-gray-500 text-sm">Page {page} of {totalPages} · {total} total</span>
            <div className="flex gap-2">
              <button className="btn-secondary py-1.5 px-4 text-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className="btn-secondary py-1.5 px-4 text-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
