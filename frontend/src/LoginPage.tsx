import { useState, useEffect } from 'react';
import axios from 'axios';
import { Globe, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '', resetPassword: '', resetPassword2: '' });
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { login, register } = useAuth();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const v = q.get('verify');
    const r = q.get('reset');
    if (v) {
      setLoading(true);
      axios.get('/api/auth/verify-email', { params: { token: v } })
        .then(() => {
          setInfo('E-posta doğrulandı. Giriş yapabilirsin.');
          setError('');
        })
        .catch((err: any) => {
          setError(err?.response?.data?.detail || 'Doğrulama başarısız');
        })
        .finally(() => {
          setLoading(false);
          window.history.replaceState({}, '', window.location.pathname);
        });
    }
    if (r) {
      setResetToken(r);
      setMode('reset');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.username, form.password);
      } else if (mode === 'register') {
        await register(form.username, form.email, form.password, form.displayName || form.username);
      } else if (mode === 'forgot') {
        const fd = new FormData();
        fd.append('email', form.email.trim());
        const res = await axios.post('/api/auth/forgot-password', fd);
        setInfo(res.data.message || 'İstek alındı');
      } else if (mode === 'reset') {
        if (form.resetPassword.length < 6) {
          setError('Şifre en az 6 karakter olmalı');
          setLoading(false);
          return;
        }
        if (form.resetPassword !== form.resetPassword2) {
          setError('Şifreler eşleşmiyor');
          setLoading(false);
          return;
        }
        const fd = new FormData();
        fd.append('token', resetToken);
        fd.append('password', form.resetPassword);
        const res = await axios.post('/api/auth/reset-password', fd);
        setInfo(res.data.message || 'Şifre güncellendi');
        setMode('login');
        setForm(f => ({ ...f, resetPassword: '', resetPassword2: '', password: '' }));
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden"
      style={{ minHeight: '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/50 via-black to-indigo-950/30" />
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'linear-gradient(rgba(56,189,248,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/30 rounded-3xl blur-xl" />
              <div className="relative bg-blue-500/20 p-5 rounded-3xl border border-blue-500/30">
                <Globe className="text-blue-400" size={44} />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight">Dünyam</h1>
          <p className="text-slate-500 mt-2 text-xs uppercase tracking-[0.2em] font-semibold">Kişisel Seyahat Haritası</p>
        </div>

        {/* Card */}
        <div className="bg-slate-950/80 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden">

          {/* Mode tabs */}
          {(mode === 'login' || mode === 'register') && (
          <div className="flex border-b border-white/5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setInfo(''); }}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all ${mode === 'login' ? 'text-white bg-blue-600/80' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setInfo(''); }}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all ${mode === 'register' ? 'text-white bg-blue-600/80' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Kayıt Ol
            </button>
          </div>
          )}

          <form onSubmit={handleSubmit} className="p-7 flex flex-col gap-4">

            {mode === 'forgot' && (
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">E-posta</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full pl-11 pr-4 py-3.5 bg-black/60 border border-white/10 text-white rounded-xl focus:border-blue-500 outline-none text-base placeholder:text-slate-700 transition-colors"
                    placeholder="kayıtlı e-posta"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setInfo(''); }}
                  className="mt-3 text-xs text-blue-400 font-semibold"
                >
                  Girişe dön
                </button>
              </div>
            )}

            {mode === 'reset' && resetToken && (
              <>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Yeni şifre</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full pl-11 pr-4 py-3.5 bg-black/60 border border-white/10 text-white rounded-xl focus:border-blue-500 outline-none text-base"
                      value={form.resetPassword}
                      onChange={e => setForm({ ...form, resetPassword: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Yeni şifre tekrar</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full pl-11 pr-4 py-3.5 bg-black/60 border border-white/10 text-white rounded-xl focus:border-blue-500 outline-none text-base"
                      value={form.resetPassword2}
                      onChange={e => setForm({ ...form, resetPassword2: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Display Name (register only) */}
            {mode === 'register' && (
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">İsim Soyisim</label>
                <div className="relative">
                  <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    className="w-full pl-11 pr-4 py-3.5 bg-black/60 border border-white/10 text-white rounded-xl focus:border-blue-500 outline-none text-base placeholder:text-slate-700 transition-colors"
                    placeholder="Adın Soyadın"
                    value={form.displayName}
                    onChange={e => setForm({ ...form, displayName: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Username */}
            {(mode === 'login' || mode === 'register') && <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Kullanıcı Adı</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">@</span>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full pl-10 pr-4 py-3.5 bg-black/60 border border-white/10 text-white rounded-xl focus:border-blue-500 outline-none text-base placeholder:text-slate-700 transition-colors"
                  placeholder="kullaniciadi"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9_]/g, '') })}
                />
              </div>
            </div>}

            {/* Email (register only) */}
            {mode === 'register' && (
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">E-posta</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full pl-11 pr-4 py-3.5 bg-black/60 border border-white/10 text-white rounded-xl focus:border-blue-500 outline-none text-base placeholder:text-slate-700 transition-colors"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Password */}
            {(mode === 'login' || mode === 'register') && <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Şifre</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full pl-11 pr-12 py-3.5 bg-black/60 border border-white/10 text-white rounded-xl focus:border-blue-500 outline-none text-base placeholder:text-slate-700 transition-colors"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); setInfo(''); }}
                  className="mt-2 text-xs text-slate-500 hover:text-blue-400 font-semibold"
                >
                  Şifremi unuttum
                </button>
              )}
            </div>}

            {/* Error */}
            {error && (
              <div className="bg-rose-900/30 border border-rose-500/30 text-rose-300 text-sm p-3.5 rounded-xl flex items-center gap-2">
                <span>❌</span> {error}
              </div>
            )}

            {info && (
              <div className="bg-emerald-900/30 border border-emerald-500/30 text-emerald-200 text-sm p-3.5 rounded-xl">
                {info}
              </div>
            )}

            {/* Submit */}
            {(mode === 'login' || mode === 'register' || mode === 'forgot' || mode === 'reset') && (
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-extrabold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-h-[52px] shadow-[0_0_30px_rgba(37,99,235,0.4)]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' && <>Haritama Gir <ArrowRight size={16} /></>}
                  {mode === 'register' && <>Hesap Oluştur <ArrowRight size={16} /></>}
                  {mode === 'forgot' && 'Sıfırlama bağlantısı gönder'}
                  {mode === 'reset' && 'Yeni şifreyi kaydet'}
                </>
              )}
            </button>
            )}
          </form>
        </div>

        <p className="text-center text-slate-700 text-xs mt-6 tracking-wide">
          Dünyam © 2025 — Tüm verileriniz şifreli saklanır
        </p>
      </div>
    </div>
  );
}
