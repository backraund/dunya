import { useEffect, useState } from 'react';
import { X, Bell, MapPin } from 'lucide-react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useI18n } from './i18n';

interface NotifEvent {
  id: string;
  action: string;
  detail: string;
  city?: string;
  country_id?: string;
  color?: string;
  created_at: string;
  user_id: string;
}

interface Props {
  onClose: () => void;
}

function timeAgo(iso: string, lang: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return lang === 'tr' ? 'Az önce' : 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} ${lang === 'tr' ? 'dk önce' : 'min ago'}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${lang === 'tr' ? 'sa önce' : 'h ago'}`;
  return `${Math.floor(diff / 86400)} ${lang === 'tr' ? 'gün önce' : 'd ago'}`;
}

export default function NotificationsModal({ onClose }: Props) {
  const { token, user } = useAuth();
  const { t, lang } = useI18n();
  const [events, setEvents] = useState<NotifEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setEvents(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-slate-950 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl w-full sm:max-w-md flex flex-col overflow-hidden"
        style={{ maxHeight: '85dvh', paddingBottom: 'max(0px,env(safe-area-inset-bottom))' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-5 flex justify-between items-center border-b border-white/5">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Bell size={16} className="text-violet-400" />
            {t.notifications}
            {events.length > 0 && (
              <span className="bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {events.length}
              </span>
            )}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Partner context */}
        {user?.partner && (
          <div className="px-5 py-3 bg-violet-900/10 border-b border-violet-500/10">
            <p className="text-xs text-violet-300">
              @<strong>{user.partner}</strong> son girişinden beri yaptıkları:
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : !user?.partner ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="text-5xl">💑</div>
              <p className="text-slate-500 text-sm text-center">Partner eşleşmesi olmadan bildirim yok</p>
              <p className="text-slate-600 text-xs text-center">Profil → Eşleşme bölümünden partner ekleyebilirsin</p>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="text-5xl">🔔</div>
              <p className="text-white font-semibold">Her şey güncel!</p>
              <p className="text-slate-500 text-sm text-center">{t.noNotifications}</p>
            </div>
          ) : (
            events.map((ev, i) => (
              <div key={ev.id || i} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (ev.color || '#8b5cf6') + '33', border: `1px solid ${ev.color || '#8b5cf6'}44` }}
                >
                  <MapPin size={16} style={{ color: ev.color || '#8b5cf6' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">
                    <span className="text-violet-400">@{ev.user_id}</span> {ev.detail}
                  </p>
                  {ev.city && (
                    <p className="text-slate-500 text-xs mt-0.5">{ev.city}</p>
                  )}
                  <p className="text-slate-600 text-[11px] mt-1">{timeAgo(ev.created_at, lang)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
