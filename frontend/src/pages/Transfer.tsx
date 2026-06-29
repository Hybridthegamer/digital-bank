import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Account } from '../types';

export default function Transfer() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({ sender_account_id: '', receiver_account_number: '', amount: '', currency: 'NGN', narration: '' });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/accounts/').then(r => {
      setAccounts(r.data);
      if (r.data.length > 0) setForm(f => ({ ...f, sender_account_id: r.data[0].id }));
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setResult(null);
    setLoading(true);
    try {
      const { data } = await api.post('/payments/transfer', { ...form, amount: parseFloat(form.amount) });
      setResult(data);
      // Reset form but keep account
      setForm(f => ({ ...f, receiver_account_number: '', amount: '', narration: '' }));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id === form.sender_account_id);

  const fraudColor = (d: string) => {
    if (d === 'approve') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (d === 'step_up') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Send Money</h1>
        <p className="text-gray-400 text-sm mt-1">Instant bank-to-bank transfers</p>
      </div>

      {/* Account balance */}
      {selectedAccount && (
        <div className="bg-gradient-to-r from-blue-500/20 to-violet-500/20 border border-blue-500/30 rounded-2xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Available Balance</p>
          <p className="text-3xl font-bold text-white">
            ₦{parseFloat(selectedAccount.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-gray-500 text-xs mt-1 font-mono">{selectedAccount.account_number}</p>
        </div>
      )}

      <div className="card space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">From Account</label>
            <select
              name="sender_account_id"
              className="input-field"
              value={form.sender_account_id}
              onChange={handleChange}
              required
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.account_number} — ₦{parseFloat(a.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Recipient Account Number</label>
            <input
              className="input-field font-mono tracking-widest text-lg"
              name="receiver_account_number"
              type="text"
              value={form.receiver_account_number}
              onChange={handleChange}
              required
              placeholder="0000000000"
              maxLength={10}
            />
            <p className="text-xs text-gray-600 mt-1">Enter 10-digit NUBAN account number</p>
          </div>

          <div>
            <label className="label">Amount (₦)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₦</span>
              <input
                className="input-field pl-8"
                name="amount"
                type="number"
                min="1"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                required
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="label">Narration <span className="text-gray-600">(optional)</span></label>
            <input
              className="input-field"
              name="narration"
              type="text"
              value={form.narration}
              onChange={handleChange}
              placeholder="Payment for services..."
              maxLength={100}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button className="btn-primary w-full py-3 text-base" type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : 'Send Money →'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card border border-emerald-500/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg">✓</div>
            <div>
              <p className="font-semibold text-white">Transfer {result.status}</p>
              <p className="text-xs text-gray-500">Ref: {result.nip_reference}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-gray-500">Amount</span>
            <span className="font-semibold text-white">₦{parseFloat(result.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            <span className="text-gray-500">Status</span>
            <span className={result.status === 'approved' ? 'badge-green' : 'badge-yellow'}>{result.status}</span>
            <span className="text-gray-500">Fraud Score</span>
            <span className={`text-xs px-2 py-0.5 rounded-lg font-medium border ${fraudColor(result.fraud_decision)}`}>
              {result.fraud_score?.toFixed(4)} ({result.fraud_decision})
            </span>
          </div>
          <p className="text-sm text-gray-400">{result.message}</p>
        </div>
      )}
    </div>
  );
}
