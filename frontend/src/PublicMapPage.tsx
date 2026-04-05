import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { Globe, X } from 'lucide-react';

type PublicPlace = {
  country_id: string;
  country_name: string;
  city?: string;
  color: string;
  imageUrl?: string;
};

function MapFit({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) map.flyToBounds(bounds, { padding: [40, 40], duration: 1.2 });
  }, [bounds, map]);
  return null;
}

export default function PublicMapPage({ username, onClose }: { username: string; onClose?: () => void }) {
  const [meta, setMeta] = useState<{ display_name: string; username: string } | null>(null);
  const [places, setPlaces] = useState<PublicPlace[]>([]);
  const [worldData, setWorldData] = useState<any>(null);
  const [err, setErr] = useState('');
  const visitedIds = useMemo(() => new Set(places.map(p => p.country_id)), [places]);

  const fitBounds = useMemo(() => {
    if (!worldData?.features || !places.length) return null;
    const boxes: L.LatLngBounds[] = [];
    for (const f of worldData.features) {
      let iso = f.properties?.['ISO3166-1-Alpha-3'];
      if (f.properties?.name === 'Northern Cyprus') iso = 'TRNC';
      if (!iso || iso === '-99' || !visitedIds.has(iso)) continue;
      try {
        const layer = L.geoJSON(f as any);
        const b = layer.getBounds();
        if (b.isValid()) boxes.push(b);
      } catch { /* skip */ }
    }
    if (!boxes.length) return null;
    let all = boxes[0];
    for (let i = 1; i < boxes.length; i++) all = all.extend(boxes[i]);
    return all;
  }, [worldData, visitedIds, places.length]);

  useEffect(() => {
    axios.get(`/api/public/${encodeURIComponent(username)}/meta`)
      .then(r => setMeta(r.data))
      .catch(() => setErr('Bu harita gizli veya kullanıcı bulunamadı.'));
    axios.get(`/api/public/${encodeURIComponent(username)}/places`)
      .then(r => setPlaces(r.data))
      .catch(() => {});
    axios.get('/geo/world.geojson').then(r => setWorldData(r.data)).catch(() => {});
  }, [username]);

  const getStyle = (feature: any) => {
    let iso = feature.properties['ISO3166-1-Alpha-3'];
    if (feature.properties.name === 'Northern Cyprus') iso = 'TRNC';
    const color = places.find(p => p.country_id === iso)?.color;
    const visited = visitedIds.has(iso);
    return {
      fillColor: visited ? color || '#22c55e' : '#1e293b',
      fillOpacity: visited ? 0.65 : 0.5,
      color: '#334155',
      weight: visited ? 1.5 : 0.4,
    };
  };

  return (
    <div className="relative w-full bg-black text-white" style={{ height: '100dvh' }}>
      <div className="absolute top-0 left-0 right-0 z-[2000] flex items-center justify-between px-4 py-3 bg-black/70 backdrop-blur border-b border-white/10"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="text-blue-400 shrink-0" size={22} />
          <div className="min-w-0">
            <p className="font-black text-sm truncate">{meta?.display_name || username}</p>
            <p className="text-[10px] text-slate-500 truncate">@{username} · paylaşılan harita</p>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 shrink-0">
            <X size={18} />
          </button>
        )}
      </div>

      {err && (
        <div className="absolute inset-0 z-[3000] flex items-center justify-center bg-black p-6 text-center">
          <p className="text-rose-300">{err}</p>
        </div>
      )}

      <div className="w-full h-full pt-[52px]">
        <MapContainer center={[30, 10]} zoom={2} className="w-full h-full" style={{ background: '#000' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" attribution="CARTO" />
          <MapFit bounds={fitBounds} />
          {worldData && (
            <GeoJSON
              data={worldData}
              style={getStyle}
              onEachFeature={(f, layer) => {
                layer.on({ click: () => layer.bindPopup(f.properties?.name || '').openPopup() });
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
