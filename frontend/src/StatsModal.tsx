import { useEffect, useState } from 'react';
import { X, Globe, MapPin, Image, BarChart2, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useI18n } from './i18n';

interface Stats {
  countries_count: number;
  cities_count: number;
  photos_count: number;
  places_count: number;
  world_pct: number;
  most_visited_country: string | null;
}

interface Props {
  onClose: () => void;
}

function Ring({ pct, color, size = 120 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 14;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2937" strokeWidth={10} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 1s ease-out' }}
      />
    </svg>
  );
}

export default function StatsModal({ onClose }: Props) {
  const { token } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    axios.get('/api/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setStats(r.data))
      .catch(console.error);
  }, []);

  const cards = stats ? [
    { icon: Globe, label: t.countries, value: stats.countries_count, color: '#3b82f6', sub: '/195' },
    { icon: MapPin, label: t.cities, value: stats.cities_count, color: '#10b981', sub: '' },
    { icon: Image, label: t.photos, value: stats.photos_count, color: '#f59e0b', sub: '' },
    { icon: BarChart2, label: 'Toplam Pin', value: stats.places_count, color: '#8b5cf6', sub: '' },
  ] : [];

  return (
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-slate-950 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl w-full sm:max-w-md overflow-hidden"
        style={{ maxHeight: '90dvh', paddingBottom: 'max(0px,env(safe-area-inset-bottom))' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-5 flex justify-between items-center border-b border-white/5">
          <h2 className="text-white font-bold flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-400" /> {t.stats}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 flex flex-col gap-6">
          {!stats ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Big ring - World % */}
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="relative">
                  <Ring pct={stats.world_pct} color="#3b82f6" size={160} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-white">%{stats.world_pct}</span>
                    <span className="text-slate-500 text-xs uppercase tracking-wider mt-1">{t.worldPct}</span>
                  </div>
                </div>
                <p className="text-slate-400 text-sm text-center">
                  Dünyadaki 195 ülkeden <span className="text-blue-400 font-bold">{stats.countries_count}</span> tanesini gezdин
                </p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-3">
                {cards.map((card, i) => (
                  <div key={i} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <card.icon size={16} style={{ color: card.color }} />
                      <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">{card.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">{card.value}</span>
                      {card.sub && <span className="text-slate-500 text-sm">{card.sub}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress bars */}
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                <h3 className="text-xs text-slate-400 uppercase tracking-widest font-bold">Dünya İlerleme</h3>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Ülkeler</span>
                    <span className="text-white font-bold">{stats.countries_count}/195</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                      style={{ width: `${(stats.countries_count / 195) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
