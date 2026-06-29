import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function MFASetup() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();
  const [secret, setSecret] = useState('');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'idle' | 'scan' | 'done'>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/totp/setup');
      setSecret(data.secret);
      setOtpauthUri(data.otpauth_uri);
      setStep('scan');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/totp/verify', { totp_code: code });
      const me = await api.get('/auth/me');
      if (user && accessToken && refreshToken) setAuth(me.data, accessToken, refreshToken);
      setStep('done');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Security Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Protect your account with two-factor authentication</p>
      </div>

      <div className="card space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl flex-shrink-0">
            ⊕
          </div>
          <div>
            <h3 className="font-semibold text-white">Time-based OTP (RFC 6238)</h3>
            <p className="text-gray-400 text-sm mt-1">
              Use Google Authenticator, Authy, or any TOTP-compatible app.
              Generates a new 6-digit code every 30 seconds.
            </p>
          </div>
        </div>

        {step === 'idle' && (
          <div>
            {user?.mfa_enabled ? (
              <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg">✓</div>
                <div>
                  <p className="text-emerald-400 font-semibold">2FA is enabled</p>
                  <p className="text-gray-400 text-sm">Your account is protected with TOTP authentication</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-lg">⚠</div>
                  <div>
                    <p className="text-amber-400 font-semibold">2FA is not enabled</p>
                    <p className="text-gray-400 text-sm">Enable 2FA to secure your account against unauthorized access</p>
                  </div>
                </div>
                {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>}
                <button className="btn-primary" onClick={handleSetup} disabled={loading}>
                  {loading ? 'Generating...' : 'Set Up 2FA Now'}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'scan' && (
          <div className="space-y-5">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
              <p className="font-semibold text-blue-400 mb-1">Step 1: Scan the QR Code</p>
              <p className="text-gray-400 text-sm">Open your authenticator app and scan:</p>
            </div>

            <div className="flex justify-center p-6 bg-white rounded-2xl">
              <QRCodeSVG value={otpauthUri} size={200} level="M" />
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs text-gray-500 mb-2">Manual entry key (if you can't scan):</p>
              <p className="font-mono text-sm break-all text-white">{secret}</p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="label">Step 2: Enter the code to confirm</label>
                <input
                  className="input-field text-center text-3xl tracking-[0.5em] font-mono"
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  placeholder="000000"
                  autoFocus
                />
              </div>
              {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>}
              <button className="btn-primary w-full py-3" type="submit" disabled={loading || code.length !== 6}>
                {loading ? 'Verifying...' : 'Enable 2FA'}
              </button>
            </form>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-3xl">✓</div>
            <p className="text-white font-bold text-xl">2FA Enabled!</p>
            <p className="text-gray-400 text-sm">Your account is now protected with two-factor authentication. You'll need your authenticator app on every login.</p>
          </div>
        )}
      </div>

      <div className="card bg-white/3 border-white/5">
        <h3 className="font-semibold text-white mb-3 text-sm">Security Features</h3>
        <div className="space-y-2">
          {[
            ['AES-256-GCM', 'All sensitive data encrypted at rest'],
            ['RS256 JWT', 'Asymmetric token signing, 15-min expiry'],
            ['bcrypt-12', 'NIST SP 800-63B compliant password hashing'],
            ['HMAC audit log', 'Tamper-evident event log for all actions'],
          ].map(([title, desc]) => (
            <div key={title} className="flex items-start gap-3 py-2">
              <span className="text-blue-400 text-xs mt-0.5">◆</span>
              <div>
                <span className="text-white text-sm font-medium">{title}</span>
                <span className="text-gray-500 text-sm"> — {desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
