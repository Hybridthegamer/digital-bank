import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Account } from '../types';

interface GiftCard {
  id: string;
  code: string;
  amount: string;
  currency: string;
  denomination_label: string;
  is_redeemed: boolean;
  redeemed_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const DENOMINATIONS = [500, 1000, 2000, 5000, 10000, 20000, 50000];

const CARD_COLORS = [
  'from-blue-600 to-violet-700',
  'from-emerald-500 to-teal-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-600',
  'from-violet-600 to-purple-700',
  'from-sky-500 to-blue-700',
];

export default function GiftCards() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [myCards, setMyCards] = useState<GiftCard[]>([]);
  const [tab, setTab] = useState<'buy' | 'redeem' | 'mine'>('buy');
  const [buyForm, setBuyForm] = useState({ account_id: '', amount: '' });
  const [redeemForm, setRedeemForm] = useState({ code: '', account_id: '' });
  const [buyResult, setBuyResult] = useState<any>(null);
  const [redeemResult, setRedeemResult] = useState<any>(null);
  const [buyError, setBuyError] = useState('');
  const [redeemError, setRedeemError] = useState('');
  const [buyLoading, setBuyLoading] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [copied, setCopied] = useState('');

  const loadData = () => {
    Promise.all([api.get('/accounts/'), api.get('/giftcards/mine')]).then(([aRes, gRes]) => {
      setAccounts(aRes.data);
      setMyCards(gRes.data);
      if (aRes.data.length > 0) {
        setBuyForm(f => ({ ...f, account_id: f.account_id || aRes.data[0].id }));
        setRedeemForm(f => ({ ...f, account_id: f.account_id || aRes.data[0].id }));
      }
    });
  };

  useEffect(() => { loadData(); }, []);

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuyError(''); setBuyResult(null); setBuyLoading(true);
    try {
      const { data } = await api.post('/giftcards/purchase', {
        account_id: buyForm.account_id,
        amount: parseFloat(buyForm.amount),
      });
      setBuyResult(data);
      loadData();
    } catch (err: any) {
      setBuyError(err.response?.data?.detail || 'Purchase failed');
    } finally {
      setBuyLoading(false);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemError(''); setRedeemResult(null); setRedeemLoading(true);
    try {
      const { data } = await api.post('/giftcards/redeem', {
        code: redeemForm.code.toUpperCase().trim(),
        account_id: redeemForm.account_id,
      });
      setRedeemResult(data);
      setRedeemForm(f => ({ ...f, code: '' }));
      loadData();
    } catch (err: any) {
      setRedeemError(err.response?.data?.detail || 'Redemption failed');
    } finally {
      setRedeemLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Gift Cards</h1>
        <p className="text-gray-400 text-sm mt-1">Buy and send gift cards, or redeem ones you've received</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        {([
          { key: 'buy', label: 'Buy Gift Card' },
          { key: 'redeem', label: 'Redeem Code' },
          { key: 'mine', label: `My Cards (${myCards.length})` },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-gradient-to-r from-blue-500/30 to-violet-500/30 text-white border border-blue-500/30' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'buy' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card space-y-5">
            <h3 className="font-semibold text-white">Purchase a Gift Card</h3>
            <form onSubmit={handleBuy} className="space-y-5">
              <div>
                <label className="label">From Account</label>
                <select
                  className="input-field"
                  value={buyForm.account_id}
                  onChange={e => setBuyForm(f => ({ ...f, account_id: e.target.value }))}
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.account_number} — ₦{parseFloat(a.balance).toLocaleString('en-NG')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Select Amount</label>
                <div className="grid grid-cols-3 gap-2">
                  {DENOMINATIONS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setBuyForm(f => ({ ...f, amount: String(d) }))}
                      className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                        buyForm.amount === String(d)
                          ? 'bg-gradient-to-r from-blue-500/30 to-violet-500/30 text-white border-blue-500/50'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      ₦{d.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {buyError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                  {buyError}
                </div>
              )}

              <button className="btn-primary w-full py-3" type="submit" disabled={buyLoading || !buyForm.amount}>
                {buyLoading ? 'Processing...' : `Buy ₦${buyForm.amount ? parseInt(buyForm.amount).toLocaleString() : '—'} Gift Card`}
              </button>
            </form>

            {buyResult && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
                <p className="text-emerald-400 font-semibold">Gift card created!</p>
                <div className="bg-black/30 rounded-xl p-4 flex items-center justify-between gap-3">
                  <span className="font-mono text-xl font-bold text-white tracking-widest">{buyResult.code}</span>
                  <button
                    onClick={() => copyCode(buyResult.code)}
                    className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {copied === buyResult.code ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-gray-400 text-sm">Share this code to gift ₦{parseInt(buyResult.amount).toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Preview card */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white text-sm">Preview</h3>
            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]} p-8 shadow-2xl aspect-video flex flex-col justify-between`}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />
              <div className="relative">
                <div className="text-white/70 text-sm font-medium">SDPS Bank</div>
                <div className="text-white/50 text-xs mt-0.5">Gift Card</div>
              </div>
              <div className="relative">
                <div className="text-4xl font-black text-white">
                  {buyForm.amount ? `₦${parseInt(buyForm.amount).toLocaleString()}` : 'Select amount'}
                </div>
                <div className="font-mono text-white/50 text-sm mt-2 tracking-widest">
                  {buyResult?.code || '---- ---- ---- ----'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'redeem' && (
        <div className="max-w-md space-y-5">
          <div className="card space-y-5">
            <h3 className="font-semibold text-white">Redeem a Gift Card</h3>
            <form onSubmit={handleRedeem} className="space-y-5">
              <div>
                <label className="label">Gift Card Code</label>
                <input
                  className="input-field font-mono text-lg tracking-widest uppercase text-center"
                  type="text"
                  value={redeemForm.code}
                  onChange={e => setRedeemForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  required
                  maxLength={20}
                  placeholder="XXXX XXXX XXXX XXXX"
                />
              </div>
              <div>
                <label className="label">Credit to Account</label>
                <select
                  className="input-field"
                  value={redeemForm.account_id}
                  onChange={e => setRedeemForm(f => ({ ...f, account_id: e.target.value }))}
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.account_number} — ₦{parseFloat(a.balance).toLocaleString('en-NG')}</option>
                  ))}
                </select>
              </div>

              {redeemError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                  {redeemError}
                </div>
              )}

              <button className="btn-primary w-full py-3" type="submit" disabled={redeemLoading || redeemForm.code.length < 10}>
                {redeemLoading ? 'Redeeming...' : 'Redeem Card'}
              </button>
            </form>

            {redeemResult && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-1">
                <p className="text-emerald-400 font-semibold">✓ {redeemResult.message}</p>
                <p className="text-gray-400 text-sm">₦{parseFloat(redeemResult.amount_credited).toLocaleString('en-NG')} added to your account</p>
                <p className="text-gray-500 text-xs">New balance: ₦{parseFloat(redeemResult.new_balance).toLocaleString('en-NG')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'mine' && (
        <div className="space-y-4">
          {myCards.length === 0 ? (
            <div className="card text-center py-16">
              <div className="text-5xl mb-4 opacity-20">◉</div>
              <p className="text-gray-500 text-lg">No gift cards yet</p>
              <button onClick={() => setTab('buy')} className="text-blue-400 text-sm mt-2 hover:text-blue-300">
                Buy your first gift card →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myCards.map((gc, idx) => (
                <div key={gc.id} className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${CARD_COLORS[idx % CARD_COLORS.length]} p-6 shadow-xl ${gc.is_redeemed ? 'opacity-50' : ''}`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
                  {gc.is_redeemed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-3xl">
                      <span className="text-white font-bold text-lg bg-black/50 px-4 py-2 rounded-full">REDEEMED</span>
                    </div>
                  )}
                  <div className="relative flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-white/70 text-xs">SDPS Bank Gift Card</div>
                        <div className="text-3xl font-black text-white mt-1">{gc.denomination_label}</div>
                      </div>
                      {!gc.is_redeemed && (
                        <button
                          onClick={() => copyCode(gc.code)}
                          className="text-xs text-white/70 hover:text-white border border-white/20 rounded-lg px-2 py-1 transition-colors"
                        >
                          {copied === gc.code ? '✓' : 'Copy'}
                        </button>
                      )}
                    </div>
                    <div className="font-mono text-white/70 text-sm tracking-widest">{gc.code}</div>
                    <div className="text-white/50 text-xs">
                      {gc.is_redeemed
                        ? `Redeemed ${gc.redeemed_at ? new Date(gc.redeemed_at).toLocaleDateString() : ''}`
                        : `Expires ${gc.expires_at ? new Date(gc.expires_at).toLocaleDateString() : 'Never'}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
