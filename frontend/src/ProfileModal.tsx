import { useState, useEffect } from 'react';
import { X, UserPlus, Users, Unlink, LogOut, Mail, Map, RefreshCw } from 'lucide-react';
import { useAuth } from './AuthContext';
import axios from 'axios';

interface Props {
  onClose: () => void;
  showPartnerMap: boolean;
  onTogglePartnerMap: (val: boolean) => void;
}

export default function ProfileModal({ onClose, showPartnerMap, onTogglePartnerMap }: Props) {
  const { user, token, logout, refreshUser } = useAuth();
  const [partnerUsername, setPartnerUsername] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await axios.get('/api/partners/requests', { headers });
      setRequests(res.data);
    } catch {}
  };

  const sendRequest = async () => {
    if (!partnerUsername.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await axios.post(`/api/partners/request/${partnerUsername.trim()}`, {}, { headers });
      setMsg({ text: res.data.message, ok: true });
      setPartnerUsername('');
    } catch (err: any) {
      setMsg({ text: err?.response?.data?.detail || 'Hata oluştu', ok: false });
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (fromUsername: string) => {
    setLoading(true);
    try {
      const res = await axios.post(`/api/partners/accept/${fromUsername}`, {}, { headers });
      setMsg({ text: res.data.message, ok: true });
      await refreshUser();
      setRequests([]);
    } catch (err: any) {
      setMsg({ text: err?.response?.data?.detail || 'Hata', ok: false });
    } finally {
      setLoading(false);
    }
  };

  const removePartner = async () => {
    if (!confirm('Eşleşmeyi kaldırmak istediğinize emin misiniz?')) return;
    setLoading(true);
    try {
      const res = await axios.delete('/api/partners', { headers });
      setMsg({ text: res.data.message, ok: true });
      onTogglePartnerMap(false);
      await refreshUser();
    } catch (err: any) {
      setMsg({ text: err?.response?.data?.detail || 'Hata', ok: false });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-slate-950 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl w-full sm:max-w-md flex flex-col overflow-hidden"
        style={{ maxHeight: '90dvh', paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-5 flex justify-between items-center border-b border-white/5">
          <h2 className="text-white font-bold text-base flex items-center gap-2">
            <Map size={16} className="text-blue-400" /> Profil & Eşleşme
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

          {/* User card */}
          <div className="bg-gradient-to-br from-blue-900/30 via-slate-900/50 to-black rounded-2xl p-5 border border-blue-500/20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                {user?.display_name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-lg leading-tight truncate">{user?.display_name}</p>
                <p className="text-slate-400 text-sm">@{user?.username}</p>
                <p className="text-slate-600 text-xs flex items-center gap-1 mt-0.5">
                  <Mail size={10} /> {user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Partner section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={12} className="text-pink-400" /> Eşleşme (Partner)
            </h3>

            {user?.partner ? (
              /* Has partner */
              <div className="bg-pink-950/30 border border-pink-500/30 rounded-2xl p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-bold flex items-center gap-2">
                      🔗 <span className="text-pink-300">@{user.partner}</span>
                    </p>
                    <p className="text-slate-500 text-xs mt-1">Haritalarınız birleştirilebilir</p>
                  </div>
                  <button
                    onClick={removePartner}
                    disabled={loading}
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
                    title="Eşleşmeyi kaldır"
                  >
                    <Unlink size={18} />
                  </button>
                </div>

                {/* Merge toggle */}
                <div className="pt-3 border-t border-pink-500/20">
                  <button
                    onClick={() => onTogglePartnerMap(!showPartnerMap)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Map size={16} className={showPartnerMap ? 'text-pink-400' : 'text-slate-500'} />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-white">Haritaları Birleştir</p>
                        <p className="text-xs text-slate-500">Partner pinleri haritada göster</p>
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${showPartnerMap ? 'bg-pink-500' : 'bg-slate-700'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform ${showPartnerMap ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* No partner */
              <>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Bir kullanıcıyla eşleşerek seyahat haritalarınızı birleştirebilirsiniz. (Örn: çift hesabı)
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">@</span>
                      <input
                        type="text"
                        className="w-full pl-9 pr-3 py-3 bg-black/60 border border-white/10 text-white rounded-xl text-sm outline-none focus:border-blue-500 text-base placeholder:text-slate-700"
                        placeholder="kullaniciadi"
                        value={partnerUsername}
                        onChange={e => setPartnerUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                        onKeyDown={e => e.key === 'Enter' && sendRequest()}
                      />
                    </div>
                    <button
                      onClick={sendRequest}
                      disabled={loading || !partnerUsername.trim()}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-colors disabled:opacity-40 min-w-[52px] flex items-center justify-center"
                    >
                      {loading ? <RefreshCw size={16} className="animate-spin" /> : <UserPlus size={18} />}
                    </button>
                  </div>
                </div>

                {/* Incoming requests */}
                {requests.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] text-slate-500 uppercase font-bold tracking-widest">Gelen İstekler</p>
                    {requests.map((r, i) => (
                      <div key={i} className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 flex justify-between items-center">
                        <div>
                          <p className="text-white text-sm font-bold">@{r.from_user}</p>
                          <p className="text-slate-500 text-xs">eşleşme isteği gönderdi</p>
                        </div>
                        <button
                          onClick={() => acceptRequest(r.from_user)}
                          disabled={loading}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-xs font-bold transition-colors min-h-[36px]"
                        >
                          Kabul Et
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {msg && (
              <div className={`text-sm text-center p-3 rounded-xl border ${msg.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
                {msg.ok ? '✅' : '❌'} {msg.text}
              </div>
            )}
          </div>
        </div>

        {/* Logout */}
        <div className="p-5 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full py-3.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 min-h-[50px]"
          >
            <LogOut size={16} /> Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  );
}
