import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Transaction } from '../types';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { approved: 'badge-green', declined: 'badge-red', flagged: 'badge-yellow', pending: 'badge-gray' };
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
  useEffect(() => { load(page); }, [page]);

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>

      <div className="card grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select className="input-field text-sm" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All</option>
            {['approved', 'declined', 'flagged', 'pending'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select className="input-field text-sm" value={filters.transaction_type} onChange={e => setFilters(f => ({ ...f, transaction_type: e.target.value }))}>
            <option value="">All</option>
            {['transfer', 'deposit', 'withdrawal'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Min Amount (₦)</label>
          <input className="input-field text-sm" type="number" placeholder="0" value={filters.min_amount} onChange={e => setFilters(f => ({ ...f, min_amount: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Max Amount (₦)</label>
          <input className="input-field text-sm" type="number" placeholder="unlimited" value={filters.max_amount} onChange={e => setFilters(f => ({ ...f, max_amount: e.target.value }))} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No transactions found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Fraud Score</th>
                <th className="pb-3">Narration</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 text-gray-500 text-xs">{new Date(tx.created_at).toLocaleString()}</td>
                  <td className="py-3 pr-4 capitalize font-medium">{tx.transaction_type}</td>
                  <td className="py-3 pr-4 font-semibold">₦{parseFloat(tx.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 pr-4"><StatusBadge status={tx.status} /></td>
                  <td className="py-3 pr-4 text-xs text-gray-500">{tx.fraud_score != null ? tx.fraud_score.toFixed(3) : '—'}</td>
                  <td className="py-3 text-gray-600 text-xs max-w-xs truncate">{tx.narration || tx.nip_reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t text-sm">
            <span className="text-gray-500">Page {page} of {totalPages} — {total} total</span>
            <div className="flex gap-2">
              <button className="btn-secondary py-1 px-3 text-xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <button className="btn-secondary py-1 px-3 text-xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
