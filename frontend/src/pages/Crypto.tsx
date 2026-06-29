import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import type { Account } from '../types';

interface CryptoRate {
  symbol: string;
  name: string;
  icon: string;
  mid_ngn: number;
  buy_ngn: number;
  sell_ngn: number;
  change_24h_pct: number;
}

interface Holding {
  symbol: string;
  name: string;
  icon: string;
  balance: string;
  mid_ngn: string;
  ngn_value: string;
  change_24h_pct: number;
}

interface CryptoTx {
  id: string;
  symbol: string;
  transaction_type: string;
  crypto_amount: string;
  ngn_amount: string;
  rate: string;
  status: string;
  created_at: string;
}

const SYMBOL_COLORS: Record<string, string> = {
  BTC: 'from-amber-500/30 to-amber-600/20 border-amber-500/30 text-amber-400',
  ETH: 'from-blue-500/30 to-blue-600/20 border-blue-500/30 text-blue-400',
  USDT: 'from-emerald-500/30 to-emerald-600/20 border-emerald-500/30 text-emerald-400',
  BNB: 'from-yellow-500/30 to-yellow-600/20 border-yellow-500/30 text-yellow-400',
  SOL: 'from-violet-500/30 to-violet-600/20 border-violet-500/30 text-violet-400',
  DOGE: 'from-orange-500/30 to-orange-600/20 border-orange-500/30 text-orange-400',
  XRP: 'from-sky-500/30 to-sky-600/20 border-sky-500/30 text-sky-400',
};

export default function Crypto() {
  const [rates, setRates] = useState<Record<string, CryptoRate>>({});
  const [portfolio, setPortfolio] = useState<{ holdings: Holding[]; total_ngn_value: string }>({ holdings: [], total_ngn_value: '0' });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txHistory, setTxHistory] = useState<CryptoTx[]>([]);
  const [tab, setTab] = useState<'market' | 'portfolio' | 'history'>('market');
  const [tradeSymbol, setTradeSymbol] = useState('BTC');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tradeForm, setTradeForm] = useState({ account_id: '', ngn_amount: '', crypto_amount: '' });
  const [tradeResult, setTradeResult] = useState<any>(null);
  const [tradeError, setTradeError] = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);

  const loadData = useCallback(() => {
    Promise.all([
      api.get('/crypto/rates'),
      api.get('/crypto/portfolio'),
      api.get('/accounts/'),
      api.get('/crypto/transactions'),
    ]).then(([rRes, pRes, aRes, txRes]) => {
      setRates(rRes.data.rates);
      setPortfolio(pRes.data);
      setAccounts(aRes.data);
      if (aRes.data.length > 0) setTradeForm(f => ({ ...f, account_id: f.account_id || aRes.data[0].id }));
      setTxHistory(txRes.data);
    });
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000); // refresh rates every 20s
    return () => clearInterval(interval);
  }, [loadData]);

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setTradeError(''); setTradeResult(null); setTradeLoading(true);
    try {
      let res;
      if (tradeType === 'buy') {
        res = await api.post('/crypto/buy', {
          account_id: tradeForm.account_id,
          symbol: tradeSymbol,
          ngn_amount: parseFloat(tradeForm.ngn_amount),
        });
      } else {
        res = await api.post('/crypto/sell', {
          account_id: tradeForm.account_id,
          symbol: tradeSymbol,
          crypto_amount: parseFloat(tradeForm.crypto_amount),
        });
      }
      setTradeResult(res.data);
      setTradeForm(f => ({ ...f, ngn_amount: '', crypto_amount: '' }));
      loadData();
    } catch (err: any) {
      setTradeError(err.response?.data?.detail || 'Trade failed');
    } finally {
      setTradeLoading(false);
    }
  };

  const rateList = Object.values(rates);
  const selectedRate = rates[tradeSymbol];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Crypto Exchange</h1>
          <p className="text-gray-400 text-sm mt-1">Buy and sell cryptocurrency with your NGN wallet</p>
        </div>
        <div className="badge-blue text-xs px-3 py-1.5">Live Rates · 20s refresh</div>
      </div>

      {/* Portfolio summary */}
      {parseFloat(portfolio.total_ngn_value) > 0 && (
        <div className="bg-gradient-to-r from-violet-600/20 to-blue-600/20 border border-violet-500/30 rounded-2xl p-6">
          <p className="text-gray-400 text-sm mb-1">Total Portfolio Value</p>
          <p className="text-4xl font-black text-white">
            ₦{parseFloat(portfolio.total_ngn_value).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        {(['market', 'portfolio', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t ? 'bg-gradient-to-r from-blue-500/30 to-violet-500/30 text-white border border-blue-500/30' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: content */}
        <div className="lg:col-span-3 space-y-4">
          {tab === 'market' && (
            <>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/3">
                      <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Asset</th>
                      <th className="px-5 py-4 text-right text-xs text-gray-500 uppercase tracking-wider">Buy (NGN)</th>
                      <th className="px-5 py-4 text-right text-xs text-gray-500 uppercase tracking-wider">Sell (NGN)</th>
                      <th className="px-5 py-4 text-right text-xs text-gray-500 uppercase tracking-wider">24h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateList.map(r => (
                      <tr
                        key={r.symbol}
                        className={`table-row cursor-pointer ${tradeSymbol === r.symbol ? 'bg-blue-500/10' : ''}`}
                        onClick={() => setTradeSymbol(r.symbol)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br border flex items-center justify-center font-bold text-sm ${SYMBOL_COLORS[r.symbol] ?? 'from-gray-500/20 to-gray-600/20 border-gray-500/30 text-gray-400'}`}>
                              {r.icon}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{r.symbol}</div>
                              <div className="text-xs text-gray-500">{r.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right text-white font-medium">
                          ₦{r.buy_ngn.toLocaleString('en-NG', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-5 py-4 text-right text-gray-400">
                          ₦{r.sell_ngn.toLocaleString('en-NG', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className={r.change_24h_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {r.change_24h_pct >= 0 ? '+' : ''}{r.change_24h_pct.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'portfolio' && (
            <div className="space-y-3">
              {portfolio.holdings.length === 0 ? (
                <div className="card text-center py-12">
                  <div className="text-4xl mb-3 opacity-20">◈</div>
                  <p className="text-gray-500">No crypto holdings yet</p>
                  <button onClick={() => setTab('market')} className="text-blue-400 text-sm mt-2 hover:text-blue-300">
                    Buy your first crypto →
                  </button>
                </div>
              ) : (
                portfolio.holdings.map(h => (
                  <div key={h.symbol} className="card flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br border flex items-center justify-center font-bold text-lg ${SYMBOL_COLORS[h.symbol] ?? 'from-gray-500/20 to-gray-600/20 border-gray-500/30 text-gray-400'}`}>
                        {h.icon}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{h.symbol}</div>
                        <div className="text-gray-400 text-sm">{parseFloat(h.balance).toFixed(8)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-white">₦{parseFloat(h.ngn_value).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
                      <div className={`text-xs ${h.change_24h_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {h.change_24h_pct >= 0 ? '+' : ''}{h.change_24h_pct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="card p-0 overflow-hidden">
              {txHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No crypto transactions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {txHistory.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${tx.transaction_type === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {tx.transaction_type === 'buy' ? '↓' : '↑'}
                        </div>
                        <div>
                          <div className="text-white font-medium capitalize">{tx.transaction_type} {tx.symbol}</div>
                          <div className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold text-sm">{parseFloat(tx.crypto_amount).toFixed(6)} {tx.symbol}</div>
                        <div className="text-gray-500 text-xs">₦{parseFloat(tx.ngn_amount).toLocaleString('en-NG')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: trade panel */}
        <div className="lg:col-span-2">
          <div className="card sticky top-24 space-y-5">
            <div>
              <h3 className="font-semibold text-white mb-1">Trade {tradeSymbol}</h3>
              {selectedRate && (
                <p className="text-xs text-gray-500">
                  Buy: ₦{selectedRate.buy_ngn.toLocaleString('en-NG', { maximumFractionDigits: 0 })} · Sell: ₦{selectedRate.sell_ngn.toLocaleString('en-NG', { maximumFractionDigits: 0 })}
                </p>
              )}
            </div>

            {/* Buy/Sell toggle */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setTradeType('buy')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tradeType === 'buy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                Buy
              </button>
              <button
                onClick={() => setTradeType('sell')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tradeType === 'sell' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                Sell
              </button>
            </div>

            <form onSubmit={handleTrade} className="space-y-4">
              <div>
                <label className="label text-xs">Crypto</label>
                <select
                  className="input-field py-2 text-sm"
                  value={tradeSymbol}
                  onChange={e => setTradeSymbol(e.target.value)}
                >
                  {rateList.map(r => (
                    <option key={r.symbol} value={r.symbol}>{r.symbol} — {r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs">Account</label>
                <select
                  className="input-field py-2 text-sm"
                  value={tradeForm.account_id}
                  onChange={e => setTradeForm(f => ({ ...f, account_id: e.target.value }))}
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.account_number} — ₦{parseFloat(a.balance).toLocaleString('en-NG')}</option>
                  ))}
                </select>
              </div>

              {tradeType === 'buy' ? (
                <div>
                  <label className="label text-xs">Amount to spend (₦)</label>
                  <input
                    className="input-field py-2 text-sm"
                    type="number"
                    min="500"
                    step="100"
                    value={tradeForm.ngn_amount}
                    onChange={e => setTradeForm(f => ({ ...f, ngn_amount: e.target.value }))}
                    required
                    placeholder="Min ₦500"
                  />
                  {tradeForm.ngn_amount && selectedRate && (
                    <p className="text-xs text-gray-500 mt-1">
                      ≈ {(parseFloat(tradeForm.ngn_amount) / selectedRate.buy_ngn).toFixed(8)} {tradeSymbol}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="label text-xs">Amount to sell ({tradeSymbol})</label>
                  <input
                    className="input-field py-2 text-sm"
                    type="number"
                    min="0.00000001"
                    step="0.00000001"
                    value={tradeForm.crypto_amount}
                    onChange={e => setTradeForm(f => ({ ...f, crypto_amount: e.target.value }))}
                    required
                    placeholder="0.00000000"
                  />
                  {tradeForm.crypto_amount && selectedRate && (
                    <p className="text-xs text-gray-500 mt-1">
                      ≈ ₦{(parseFloat(tradeForm.crypto_amount) * selectedRate.sell_ngn).toLocaleString('en-NG', { maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              )}

              {tradeError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs">
                  {tradeError}
                </div>
              )}

              <button
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  tradeType === 'buy'
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                } disabled:opacity-50`}
                type="submit"
                disabled={tradeLoading}
              >
                {tradeLoading ? 'Processing...' : `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${tradeSymbol}`}
              </button>
            </form>

            {tradeResult && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm space-y-1">
                <p className="text-emerald-400 font-semibold">✓ {tradeResult.message}</p>
                <p className="text-gray-400">NGN Balance: ₦{parseFloat(tradeResult.new_ngn_balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
