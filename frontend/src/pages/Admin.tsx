import { useEffect, useState } from 'react';
import api from '../api/client';

type Tab = 'dashboard' | 'users' | 'alerts' | 'logs';

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="card text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color ?? 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setStats(r.data));
    api.get('/admin/users?page_size=50').then(r => setUsers(r.data.items));
    api.get('/admin/fraud-alerts?page_size=50').then(r => setAlerts(r.data.items));
    api.get('/admin/audit-logs?page_size=50').then(r => setLogs(r.data.items));
  }, []);

  const resolveAlert = async (id: string, s: string) => {
    await api.patch(`/admin/fraud-alerts/${id}`, { status: s });
    api.get('/admin/fraud-alerts?page_size=50').then(r => setAlerts(r.data.items));
  };

  const toggleUser = async (id: string, isActive: boolean) => {
    await api.patch(`/admin/users/${id}`, { is_active: !isActive });
    api.get('/admin/users?page_size=50').then(r => setUsers(r.data.items));
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'Users' },
    { id: 'alerts', label: 'Fraud Alerts' },
    { id: 'logs', label: 'Audit Logs' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Console</h1>

      <div className="flex gap-2 border-b">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Users" value={stats.total_users} color="text-blue-700" />
          <StatCard label="Transactions" value={stats.total_transactions} color="text-green-700" />
          <StatCard label="Fraud Alerts" value={stats.total_fraud_alerts} color="text-red-700" />
          <StatCard label="Pending Alerts" value={stats.pending_alerts} color="text-yellow-700" />
          <StatCard label="Total Volume (₦)" value={`₦${(stats.total_volume ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`} />
        </div>
      )}

      {tab === 'users' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="pb-3 pr-4">Name</th><th className="pb-3 pr-4">Email</th>
              <th className="pb-3 pr-4">Role</th><th className="pb-3 pr-4">MFA</th>
              <th className="pb-3 pr-4">Status</th><th className="pb-3">Action</th>
            </tr></thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium">{u.full_name}</td>
                  <td className="py-3 pr-4 text-gray-600 text-xs">{u.email}</td>
                  <td className="py-3 pr-4 capitalize">{u.role}</td>
                  <td className="py-3 pr-4">{u.mfa_enabled ? <span className="badge-green">On</span> : <span className="badge-gray">Off</span>}</td>
                  <td className="py-3 pr-4">{u.is_active ? <span className="badge-green">Active</span> : <span className="badge-red">Disabled</span>}</td>
                  <td className="py-3"><button className={u.is_active ? 'btn-danger text-xs py-1 px-2' : 'btn-primary text-xs py-1 px-2'} onClick={() => toggleUser(u.id, u.is_active)}>{u.is_active ? 'Disable' : 'Enable'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'alerts' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="pb-3 pr-4">Alert Type</th><th className="pb-3 pr-4">Risk Score</th>
              <th className="pb-3 pr-4">Status</th><th className="pb-3 pr-4">Created</th><th className="pb-3">Action</th>
            </tr></thead>
            <tbody className="divide-y">
              {alerts.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium">{a.alert_type}</td>
                  <td className="py-3 pr-4">
                    <span className={`font-mono text-xs px-2 py-0.5 rounded ${a.risk_score > 0.75 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{a.risk_score.toFixed(3)}</span>
                  </td>
                  <td className="py-3 pr-4 capitalize">{a.status}</td>
                  <td className="py-3 pr-4 text-gray-400 text-xs">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="py-3">
                    {a.status === 'pending' && (
                      <div className="flex gap-1">
                        <button className="btn-secondary text-xs py-0.5 px-2" onClick={() => resolveAlert(a.id, 'resolved')}>Resolve</button>
                        <button className="btn-danger text-xs py-0.5 px-2" onClick={() => resolveAlert(a.id, 'dismissed')}>Dismiss</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'logs' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="pb-3 pr-4">Timestamp</th><th className="pb-3 pr-4">Event</th>
              <th className="pb-3 pr-4">IP</th><th className="pb-3">HMAC (truncated)</th>
            </tr></thead>
            <tbody className="divide-y">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 text-gray-400 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4 font-medium text-xs">{l.event_type}</td>
                  <td className="py-2 pr-4 text-gray-500 text-xs">{l.ip_address ?? '—'}</td>
                  <td className="py-2 font-mono text-xs text-gray-400">{l.hmac_signature.slice(0, 20)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
