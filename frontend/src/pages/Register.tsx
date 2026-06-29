import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

const FIELDS = [
  { name: 'full_name', label: 'Full Name', type: 'text', placeholder: 'John Doe', autoComplete: 'name' },
  { name: 'email', label: 'Email Address', type: 'email', placeholder: 'you@example.com', autoComplete: 'email' },
  { name: 'phone_number', label: 'Phone Number', type: 'tel', placeholder: '08012345678', autoComplete: 'tel' },
  { name: 'bvn_nin', label: 'BVN / NIN', type: 'text', placeholder: 'Bank Verification or National ID Number', autoComplete: 'off' },
  { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••', autoComplete: 'new-password' },
  { name: 'confirm_password', label: 'Confirm Password', type: 'password', placeholder: '••••••••', autoComplete: 'new-password' },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', phone_number: '', bvn_nin: '', password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setSuccess(`Account created! Your account number is ${data.account_number}. Redirecting to login...`);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0D1117]">
      {/* Decorative panel */}
      <div className="hidden lg:flex w-5/12 bg-gradient-to-br from-[#0F1629] via-[#1a1040] to-[#0D1117] items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-black text-2xl shadow-2xl shadow-blue-500/30 mb-6">
            S
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Join SDPS Bank</h2>
          <p className="text-gray-400 max-w-xs mx-auto">
            Open your account in minutes. Fully encrypted, secure, and compliant with CBN standards.
          </p>
          <div className="mt-8 space-y-3">
            {[
              'AES-256-GCM field-level encryption',
              'bcrypt cost-12 password hashing',
              'Real-time fraud detection',
              'TOTP-based 2-factor auth',
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-emerald-400">✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-start justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6 lg:hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold">S</div>
              <span className="font-bold text-white text-lg">SDPS Bank</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Create Account</h1>
            <p className="text-gray-400 mt-2">Fill in your details to get started</p>
          </div>

          {success ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-3">✓</div>
              <p className="text-emerald-400 font-semibold text-lg">Registration Successful!</p>
              <p className="text-gray-400 text-sm mt-2">{success}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {FIELDS.map(field => (
                <div key={field.name}>
                  <label className="label">{field.label}</label>
                  <input
                    className="input-field"
                    name={field.name}
                    type={field.type}
                    value={(form as any)[field.name]}
                    onChange={handleChange}
                    required
                    placeholder={field.placeholder}
                    autoComplete={field.autoComplete}
                  />
                </div>
              ))}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button className="btn-primary w-full py-3 text-base mt-2" type="submit" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : 'Create Account'}
              </button>

              <div className="text-center">
                <span className="text-gray-500 text-sm">Already have an account? </span>
                <Link to="/login" className="text-blue-400 hover:text-blue-300 text-sm font-medium">Sign in</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
