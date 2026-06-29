import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.mfa_required) {
        setTempToken(data.temp_token);
        setMfaRequired(true);
      } else {
        const me = await api.get('/auth/me', { headers: { Authorization: `Bearer ${data.access_token}` } });
        setAuth(me.data, data.access_token, data.refresh_token);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login/mfa', { temp_token: tempToken, totp_code: totpCode });
      const me = await api.get('/auth/me', { headers: { Authorization: `Bearer ${data.access_token}` } });
      setAuth(me.data, data.access_token, data.refresh_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'MFA verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0D1117]">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#0F1629] via-[#1a1040] to-[#0D1117] items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-blue-500/30 mb-8">
            S
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Secure Digital<br />Payment System
          </h2>
          <p className="text-gray-400 text-lg max-w-sm mx-auto">
            Bank-grade security with AES-256 encryption, biometric MFA, and real-time fraud detection.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: 'AES-256', sub: 'Encryption' },
              { label: 'RS256', sub: 'JWT Auth' },
              { label: 'TOTP', sub: 'MFA' },
            ].map(f => (
              <div key={f.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-blue-400 font-bold text-sm">{f.label}</div>
                <div className="text-gray-500 text-xs mt-0.5">{f.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6 lg:hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold">S</div>
              <span className="font-bold text-white text-lg">SDPS Bank</span>
            </div>
            <h1 className="text-3xl font-bold text-white">
              {mfaRequired ? 'Verify Identity' : 'Welcome back'}
            </h1>
            <p className="text-gray-400 mt-2">
              {mfaRequired ? 'Enter your authenticator code to continue' : 'Sign in to your account'}
            </p>
          </div>

          {!mfaRequired ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="label">Email address</label>
                <input
                  className="input-field"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  className="input-field"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
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
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>

              <div className="text-center">
                <span className="text-gray-500 text-sm">Don't have an account? </span>
                <Link to="/register" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                  Create account
                </Link>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-gray-600 text-center mb-3">Demo credentials</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setEmail('alice@example.com'); setPassword('Alice@123456'); }}
                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-gray-400 transition-colors text-left"
                  >
                    <div className="font-medium text-gray-300">Customer</div>
                    <div>alice@example.com</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('admin@sdps.ng'); setPassword('Admin@123456'); }}
                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-gray-400 transition-colors text-left"
                  >
                    <div className="font-medium text-gray-300">Admin</div>
                    <div>admin@sdps.ng</div>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleMFA} className="space-y-5">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="text-blue-400 font-semibold mb-1">2-Factor Authentication</div>
                <p className="text-gray-400 text-sm">Open your authenticator app and enter the 6-digit code</p>
              </div>
              <div>
                <label className="label">Authentication Code</label>
                <input
                  className="input-field text-center text-3xl tracking-[0.5em] font-mono"
                  type="text"
                  inputMode="numeric"
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  placeholder="000000"
                  autoFocus
                />
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <button className="btn-primary w-full py-3 text-base" type="submit" disabled={loading || totpCode.length !== 6}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
              <button type="button" onClick={() => setMfaRequired(false)} className="w-full text-sm text-gray-500 hover:text-gray-400 transition-colors">
                ← Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
