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
      <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>

      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-2">Two-Factor Authentication (TOTP)</h2>
        <p className="text-sm text-gray-600 mb-4">
          Add an extra layer of security using a TOTP authenticator app (Google Authenticator, Authy, etc.).
          This uses RFC 6238 time-based one-time passwords.
        </p>

        {step === 'idle' && (
          <div>
            {user?.mfa_enabled ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">MFA is enabled on your account</p>
                <p className="text-green-600 text-sm mt-1">Your account is protected with TOTP-based 2FA</p>
              </div>
            ) : (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 font-medium">MFA is not enabled</p>
                  <p className="text-yellow-600 text-sm mt-1">We recommend enabling 2FA for enhanced security</p>
                </div>
                <button className="btn-primary" onClick={handleSetup} disabled={loading}>{loading ? 'Generating...' : 'Set Up 2FA'}</button>
              </>
            )}
          </div>
        )}

        {step === 'scan' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-medium text-blue-800 mb-2">Step 1: Scan QR Code</p>
              <p className="text-sm text-blue-700">Use Google Authenticator or Authy to scan:</p>
            </div>
            <div className="flex justify-center p-4 bg-white border rounded-xl">
              <QRCodeSVG value={otpauthUri} size={200} />
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Manual entry key:</p>
              <p className="font-mono text-sm break-all text-gray-800">{secret}</p>
            </div>
            <form onSubmit={handleVerify} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Step 2: Enter code to confirm</label>
                <input className="input-field text-center text-2xl tracking-widest" type="text" value={code} onChange={e => setCode(e.target.value)} required maxLength={6} placeholder="000000" />
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
              <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Enable 2FA'}</button>
            </form>
          </div>
        )}

        {step === 'done' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">✓</div>
            <p className="text-green-800 font-bold text-lg">2FA Enabled Successfully!</p>
            <p className="text-green-600 text-sm mt-1">Your account is now protected with two-factor authentication</p>
          </div>
        )}
      </div>
    </div>
  );
}
