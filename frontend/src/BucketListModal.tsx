import { useEffect, useState } from 'react';
import { X, Bookmark, Trash2, MapPin, Plus } from 'lucide-react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useI18n } from './i18n';

interface BucketItem {
  id: string;
  country_id: string;
  country_name: string;
  city?: string;
  note?: string;
  created_at: string;
}

interface Props {
  onClose: () => void;
  selectedCountry?: { id: string; name: string } | null;
  selectedCity?: string;
}

export default function BucketListModal({ onClose, selectedCountry, selectedCity }: Props) {
  const { token } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState<BucketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState(false);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get('/api/bucket', { headers })
      .then(r => setItems(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addItem = async () => {
    if (!selectedCountry) { setMsg('Önce haritadan bir ülke/şehir seç'); return; }
    try {
      const fd = new FormData();
      fd.append('country_id', selectedCountry.id);
      fd.append('country_name', selectedCountry.name);
      if (selectedCity) fd.append('city', selectedCity);
      if (note) fd.append('note', note);
      const res = await axios.post('/api/bucket', fd, { headers });
      setItems(prev => [...prev, res.data]);
      setNote('');
      setAddMode(false);
      setMsg('Listeye eklendi! ✓');
      setTimeout(() => setMsg(''), 2000);
    } catch (err: any) {
      setMsg(err?.response?.data?.detail || 'Hata oluştu');
    }
  };

  const removeItem = async (id: string) => {
    try {
      await axios.delete(`/api/bucket/${id}`, { headers });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {}
  };

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
            <Bookmark size={16} className="text-amber-400" />
            {t.bucketList}
            <span className="text-slate-500 text-sm font-normal">({items.length})</span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setAddMode(m => !m)}
              className="p-2 text-amber-400 hover:bg-amber-400/10 rounded-xl transition-colors"
              title="Ekle"
            >
              <Plus size={18} />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Add form */}
        {addMode && (
          <div className="p-4 border-b border-white/5 bg-amber-900/10 flex flex-col gap-3">
            {selectedCountry ? (
              <p className="text-amber-300 text-sm font-semibold flex items-center gap-2">
                <MapPin size={14} /> {selectedCity || selectedCountry.name}
              </p>
            ) : (
              <p className="text-slate-500 text-sm">Haritadan bir yer seç, sonra buraya ekle</p>
            )}
            <textarea
              rows={2}
              className="w-full p-3 bg-black/50 border border-white/10 text-white rounded-xl text-sm outline-none focus:border-amber-500 resize-none placeholder:text-slate-600"
              placeholder="Not ekle (isteğe bağlı)..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <button
              onClick={addItem}
              disabled={!selectedCountry}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-40 min-h-[44px]"
            >
              {t.addBucket}
            </button>
          </div>
        )}

        {/* Message */}
        {msg && (
          <div className="mx-4 mt-3 text-center text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2">
            {msg}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 pb-24">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="text-6xl">🗺️</div>
              <p className="text-slate-500 text-sm text-center">{t.noBucketItems}</p>
              <p className="text-slate-600 text-xs text-center">Haritada bir yere tıkla ve "Listeye Ekle" butonuna bas</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={12} className="text-amber-400 flex-shrink-0" />
                    <span className="text-white font-bold text-sm truncate">
                      {item.city || item.country_name}
                    </span>
                    {item.city && (
                      <span className="text-slate-500 text-xs">{item.country_name}</span>
                    )}
                  </div>
                  {item.note && (
                    <p className="text-slate-400 text-xs leading-relaxed ml-5">{item.note}</p>
                  )}
                  <p className="text-slate-600 text-[10px] ml-5 mt-1">
                    {new Date(item.created_at).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
