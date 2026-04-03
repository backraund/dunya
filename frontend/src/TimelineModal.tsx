import { useEffect, useState, useRef } from 'react';
import { X, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useI18n } from './i18n';

interface TimelineEvent {
  id: string;
  action: string;
  detail: string;
  country_id?: string;
  city?: string;
  color?: string;
  created_at: string;
  user_id: string;
}

interface Props {
  onClose: () => void;
  showPartner: boolean;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TimelineModal({ onClose, showPartner }: Props) {
  const { token } = useAuth();
  const { t } = useI18n();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios.get('/api/timeline', {
      headers: { Authorization: `Bearer ${token}` },
      params: { include_partner: showPartner, limit: 100 },
    }).then(r => {
      setEvents(r.data.reverse()); // oldest first for timeline
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [showPartner]);

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col justify-end" style={{ minHeight: '100dvh' }}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Timeline panel — slides up from bottom like Fusion 360 */}
      <div
        className="relative bg-slate-950 border-t border-white/10 shadow-2xl w-full"
        style={{ paddingBottom: 'max(16px,env(safe-area-inset-bottom))' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 flex justify-between items-center border-b border-white/5">
          <h2 className="text-white font-bold text-sm flex items-center gap-2">
            <Clock size={14} className="text-blue-400" />
            {t.timeline}
            {events.length > 0 && (
              <span className="text-slate-500 text-xs">({events.length} olay)</span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={scrollLeft} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={scrollRight} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
              <ChevronRight size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-1">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Horizontal scroll timeline */}
        <div className="relative">
          {/* Center line */}
          <div className="absolute top-[68px] left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

          <div
            ref={scrollRef}
            className="overflow-x-auto flex gap-1 px-5 py-4 scrollbar-none"
            style={{
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center w-full py-8 min-w-[300px]">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : events.length === 0 ? (
              <div className="flex items-center justify-center w-full py-8 min-w-[300px]">
                <p className="text-slate-500 text-sm">{t.noPlaces}</p>
              </div>
            ) : (
              events.map((ev, i) => (
                <div key={ev.id || i} className="flex flex-col items-center gap-2 min-w-[120px] relative">
                  {/* Date above */}
                  <div className="text-[10px] text-slate-500 font-bold text-center leading-tight">
                    {formatDate(ev.created_at)}
                  </div>

                  {/* Connector dot */}
                  <div
                    className="w-4 h-4 rounded-full border-2 border-slate-900 z-10 shadow-lg flex-shrink-0"
                    style={{ backgroundColor: ev.color || '#3b82f6' }}
                  />

                  {/* Card */}
                  <div
                    className="bg-slate-900 border border-white/10 rounded-xl p-3 w-full text-center shadow-xl"
                    style={{ borderTopColor: ev.color || '#3b82f6', borderTopWidth: 2 }}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <MapPin size={10} style={{ color: ev.color || '#3b82f6' }} />
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold truncate">
                        {ev.country_id}
                      </span>
                    </div>
                    <p className="text-white text-xs font-bold truncate">{ev.city || ev.detail}</p>
                    {ev.user_id && showPartner && (
                      <p className="text-slate-600 text-[9px] mt-1">@{ev.user_id}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
