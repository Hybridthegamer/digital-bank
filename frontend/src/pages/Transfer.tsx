import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Account } from '../types';

export default function Transfer() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({ sender_account_id: '', receiver_account_number: '', amount: '', currency: 'NGN', narration: '' });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/accounts/').then(r => setAccounts(r.data)); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setResult(null);
    setLoading(true);
    try {
      const { data } = await api.post('/payments/transfer', {
        ...form,
        amount: parseFloat(form.amount),
      });
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  const fraudDecisionColor = (d: string) => ({ approve: 'text-green-700 bg-green-50', step_up: 'text-yellow-700 bg-yellow-50', flag: 'text-red-700 bg-red-50' })[d] ?? '';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Send Money</h1>

      <div className="card space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Account</label>
            <select name="sender_account_id" className="input-field" value={form.sender_account_id} onChange={handleChange} required>
              <option value="">Select account</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.account_number} — ₦{parseFloat(a.balance).toLocaleString()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Account Number</label>
            <input className="input-field font-mono" name="receiver_account_number" type="text" value={form.receiver_account_number} onChange={handleChange} required placeholder="10-digit account number" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
            <input className="input-field" name="amount" type="number" min="1" step="0.01" value={form.amount} onChange={handleChange} required placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Narration (optional)</label>
            <textarea className="input-field" name="narration" value={form.narration} onChange={e => setForm(f => ({ ...f, narration: e.target.value }))} placeholder="Payment for..." rows={2} />
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Send Money'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card border-l-4 border-l-blue-500 space-y-3">
          <h2 className="font-semibold text-gray-800">Transaction Result</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-500">Status</span><span className={`font-medium ${result.status === 'approved' ? 'text-green-700' : 'text-red-700'}`}>{result.status.toUpperCase()}</span>
            <span className="text-gray-500">Amount</span><span className="font-medium">₦{parseFloat(result.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            <span className="text-gray-500">NIP Reference</span><span className="font-mono text-xs">{result.nip_reference}</span>
            <span className="text-gray-500">Fraud Score</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${fraudDecisionColor(result.fraud_decision)}`}>
              {result.fraud_score.toFixed(4)} ({result.fraud_decision})
            </span>
          </div>
          <p className="text-sm text-gray-600">{result.message}</p>
        </div>
      )}
    </div>
  );
}
