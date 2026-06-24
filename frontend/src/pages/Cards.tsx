import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Account, Card } from '../types';

export default function Cards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({ account_id: '', pan: '', card_type: 'visa', expiry_month: '', expiry_year: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    api.get('/cards/').then(r => setCards(r.data));
    api.get('/accounts/').then(r => setAccounts(r.data));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const { data } = await api.post('/cards/', { ...form, expiry_month: parseInt(form.expiry_month), expiry_year: parseInt(form.expiry_year) });
      setSuccess(`Card added! Token: ${data.token} | Masked: ${data.masked_pan}`);
      setForm({ account_id: '', pan: '', card_type: 'visa', expiry_month: '', expiry_year: '' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add card');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this card?')) return;
    await api.delete(`/cards/${id}`);
    load();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Payment Cards</h1>

      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Add New Card (Tokenisation)</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
            <select className="input-field" value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} required>
              <option value="">Select account</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Card Number (PAN)</label>
            <input className="input-field font-mono" type="text" value={form.pan} onChange={e => setForm(f => ({ ...f, pan: e.target.value.replace(/\s/g, '') }))} required placeholder="1234567890123456" maxLength={19} />
            <p className="text-xs text-gray-400 mt-1">Your PAN will be tokenised — never stored in plaintext</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select className="input-field" value={form.card_type} onChange={e => setForm(f => ({ ...f, card_type: e.target.value }))}>
                {['visa', 'mastercard', 'verve'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exp Month</label>
              <input className="input-field" type="number" min={1} max={12} value={form.expiry_month} onChange={e => setForm(f => ({ ...f, expiry_month: e.target.value }))} required placeholder="MM" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exp Year</label>
              <input className="input-field" type="number" min={2024} max={2040} value={form.expiry_year} onChange={e => setForm(f => ({ ...f, expiry_year: e.target.value }))} required placeholder="YYYY" />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
          {success && <p className="text-green-700 text-sm bg-green-50 p-3 rounded-lg break-all">{success}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Processing...' : 'Tokenise Card'}</button>
        </form>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Your Cards ({cards.length})</h2>
        {cards.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No cards added yet</p>
        ) : (
          <div className="space-y-3">
            {cards.map(c => (
              <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-mono font-medium">{c.masked_pan}</p>
                  <p className="text-xs text-gray-500 uppercase">{c.card_type} · {String(c.expiry_month).padStart(2, '0')}/{c.expiry_year}</p>
                </div>
                <button className="btn-danger text-xs py-1 px-3" onClick={() => handleDeactivate(c.id)}>Deactivate</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
