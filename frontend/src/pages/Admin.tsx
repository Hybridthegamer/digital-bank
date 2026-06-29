import { useEffect, useState } from 'react';
import api from '../api/client';

type Tab = 'dashboard' | 'users' | 'alerts' | 'logs';

export default function Admin() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const reload = () => {
    api.get('/admin/dashboard').then(r => setStats(r.data));
    api.get('/admin/users?page_size=50').then(r => setUsers(r.data.items));
    api.get('/admin/fraud-alerts?page_size=50').then(r => setAlerts(r.data.items));
    api.get('/admin/audit-logs?page_size=50').then(r => setLogs(r.data.items));
  };

  useEffect(() => { reload(); }, []);

  const resolveAlert = async (id: string, s: string) => {
    await api.patch(`/admin/fraud-alerts/${id}`, { status: s });
    api.get('/admin/fraud-alerts?page_size=50').then(r => setAlerts(r.data.items));
  };

  const toggleUser = async (id: string, isActive: boolean) => {
    await api.patch(`/admin/users/${id}`, { is_active: !isActive });
    api.get('/admin/users?page_size=50').then(r => setUsers(r.data.items));
  };

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'Users', count: users.length },
    { id: 'alerts', label: 'Fraud Alerts', count: alerts.filter(a => a.status === 'pending').length },
    { id: 'logs', label: 'Audit Logs', count: logs.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Console</h1>
        <p className="text-gray-400 text-sm mt-1">System management and monitoring</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tab === t.id
                ? 'bg-gradient-to-r from-blue-500/30 to-violet-500/30 text-white border border-blue-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center ${
                t.id === 'alerts' && alerts.filter(a => a.status === 'pending').length > 0
                  ? 'bg-red-500/30 text-red-400'
                  : 'bg-white/10 text-gray-400'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Users', value: stats.total_users, color: 'text-blue-400', icon: '👤' },
              { label: 'Transactions', value: stats.total_transactions, color: 'text-emerald-400', icon: '↔' },
              { label: 'Fraud Alerts', value: stats.total_fraud_alerts, color: 'text-red-400', icon: '⚠' },
              { label: 'Pending Alerts', value: stats.pending_alerts, color: 'text-amber-400', icon: '⏳' },
              { label: 'Volume (₦)', value: `${(stats.total_volume ?? 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`, color: 'text-violet-400', icon: '₦' },
            ].map(s => (
              <div key={s.label} className="card text-center">
                <div className="text-2xl mb-2">{s.icon}</div>
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">MFA</th>
                  <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="table-row">
                    <td className="px-5 py-4 font-medium text-white">{u.full_name}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{u.email}</td>
                    <td className="px-5 py-4">
                      <span className={u.role === 'admin' ? 'badge-blue' : 'badge-gray'}>{u.role}</span>
                    </td>
                    <td className="px-5 py-4">{u.mfa_enabled ? <span className="badge-green">On</span> : <span className="badge-gray">Off</span>}</td>
                    <td className="px-5 py-4">{u.is_active ? <span className="badge-green">Active</span> : <span className="badge-red">Disabled</span>}</td>
                    <td className="px-5 py-4">
                      <button
                        className={u.is_active ? 'btn-danger text-xs py-1 px-3' : 'btn-success text-xs py-1 px-3'}
                        onClick={() => toggleUser(u.id, u.is_active)}
                      >
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'alerts' && (
        <div className="card overflow-hidden p-0">
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-20">⚠</div>
              <p className="text-gray-500">No fraud alerts</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Alert Type</th>
                    <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Risk Score</th>
                    <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(a => (
                    <tr key={a.id} className="table-row">
                      <td className="px-5 py-4 font-medium text-white">{a.alert_type}</td>
                      <td className="px-5 py-4">
                        <span className={`font-mono text-xs px-2 py-1 rounded-lg ${a.risk_score > 0.75 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {a.risk_score.toFixed(3)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={a.status === 'pending' ? 'badge-yellow' : a.status === 'resolved' ? 'badge-green' : 'badge-gray'}>{a.status}</span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs">{new Date(a.created_at).toLocaleString()}</td>
                      <td className="px-5 py-4">
                        {a.status === 'pending' && (
                          <div className="flex gap-2">
                            <button className="btn-success text-xs py-1 px-3" onClick={() => resolveAlert(a.id, 'resolved')}>Resolve</button>
                            <button className="btn-danger text-xs py-1 px-3" onClick={() => resolveAlert(a.id, 'dismissed')}>Dismiss</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">IP Address</th>
                  <th className="px-5 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">HMAC (truncated)</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="table-row">
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                        l.event_type.includes('FAIL') || l.event_type.includes('FRAUD') ? 'bg-red-500/20 text-red-400' :
                        l.event_type.includes('SUCCESS') || l.event_type.includes('COMPLETE') ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>{l.event_type}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{l.ip_address ?? '—'}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{l.hmac_signature.slice(0, 24)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
