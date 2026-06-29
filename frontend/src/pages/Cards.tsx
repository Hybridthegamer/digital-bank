import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Account, Card } from '../types';

const CARD_GRADIENTS = [
  'from-blue-600 to-violet-700',
  'from-emerald-500 to-teal-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-600',
];

export default function Cards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({ account_id: '', pan: '', card_type: 'visa', expiry_month: '', expiry_year: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    api.get('/cards/').then(r => setCards(r.data));
    api.get('/accounts/').then(r => {
      setAccounts(r.data);
      if (r.data.length > 0) setForm(f => ({ ...f, account_id: f.account_id || r.data[0].id }));
    });
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const { data } = await api.post('/cards/', {
        ...form,
        expiry_month: parseInt(form.expiry_month),
        expiry_year: parseInt(form.expiry_year),
      });
      setSuccess(`Card tokenised! Token: ${data.token} · Masked: ${data.masked_pan}`);
      setForm(f => ({ ...f, pan: '', expiry_month: '', expiry_year: '' }));
      setShowForm(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Cards</h1>
          <p className="text-gray-400 text-sm mt-1">EMVCo-style PAN tokenisation — your card details are never stored</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          + Add Card
        </button>
      </div>

      {showForm && (
        <div className="card space-y-5">
          <h3 className="font-semibold text-white">Tokenise New Card</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Account</label>
              <select
                className="input-field"
                value={form.account_id}
                onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}
                required
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Card Number (PAN)</label>
              <input
                className="input-field font-mono tracking-widest text-lg"
                type="text"
                value={form.pan}
                onChange={e => setForm(f => ({ ...f, pan: e.target.value.replace(/\s/g, '') }))}
                required
                placeholder="0000000000000000"
                maxLength={19}
              />
              <p className="text-xs text-gray-600 mt-1">Your PAN is tokenised with DRBG — never stored in plaintext</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label text-xs">Card Type</label>
                <select className="input-field text-sm" value={form.card_type} onChange={e => setForm(f => ({ ...f, card_type: e.target.value }))}>
                  {['visa', 'mastercard', 'verve'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-xs">Expiry Month</label>
                <input className="input-field text-sm" type="number" min={1} max={12} value={form.expiry_month} onChange={e => setForm(f => ({ ...f, expiry_month: e.target.value }))} required placeholder="MM" />
              </div>
              <div>
                <label className="label text-xs">Expiry Year</label>
                <input className="input-field text-sm" type="number" min={2024} max={2040} value={form.expiry_year} onChange={e => setForm(f => ({ ...f, expiry_year: e.target.value }))} required placeholder="YYYY" />
              </div>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>}
            {success && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 text-sm break-all">{success}</div>}
            <div className="flex gap-3">
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Tokenising...' : 'Tokenise Card'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {cards.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4 opacity-20">▣</div>
            <p className="text-gray-500 text-lg">No cards added yet</p>
            <button onClick={() => setShowForm(true)} className="text-blue-400 text-sm mt-2 hover:text-blue-300">
              Add your first card →
            </button>
          </div>
        ) : (
          cards.map((c, idx) => (
            <div key={c.id} className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${CARD_GRADIENTS[idx % CARD_GRADIENTS.length]} p-6 shadow-xl ${!c.is_active ? 'opacity-50' : ''}`}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
              <div className="relative flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-white/60 text-xs uppercase tracking-wider">SDPS Bank</div>
                    <div className="text-white/80 text-sm mt-0.5 capitalize">{c.card_type}</div>
                  </div>
                  <div className="text-white/70">
                    <div className="w-10 h-7 rounded-md bg-white/20 flex items-center justify-center">
                      <div className="w-6 h-5 rounded-full bg-white/40" />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-bold text-white tracking-widest">{c.masked_pan}</div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-white/60 text-xs">
                      EXP {String(c.expiry_month).padStart(2, '0')}/{c.expiry_year}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={c.is_active ? 'badge-green' : 'badge-gray'}>{c.is_active ? 'Active' : 'Inactive'}</span>
                      {c.is_active && (
                        <button
                          onClick={() => handleDeactivate(c.id)}
                          className="text-xs text-white/50 hover:text-red-300 transition-colors border border-white/20 hover:border-red-400/30 rounded-lg px-2 py-1"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
