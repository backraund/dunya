import { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import localforage from 'localforage';
import { MapPin, Image as ImageIcon, X, Map as MapIcon, Globe, ChevronDown, ChevronRight, EyeOff, Eye, UserCircle, Bell, BarChart2, Clock, Bookmark, Settings } from 'lucide-react';
import { useAuth } from './AuthContext';
import ProfileModal from './ProfileModal';
import OnboardingModal from './OnboardingModal';
import StatsModal from './StatsModal';
import BucketListModal from './BucketListModal';
import TimelineModal from './TimelineModal';
import SettingsModal from './SettingsModal';
import NotificationsModal from './NotificationsModal';
import { useI18n } from './i18n';

localforage.config({
  name: 'Dunya DB',
  storeName: 'places'
});

const PASTEL_COLORS = ['#AEC6CF', '#FFB7B2', '#77DD77', '#FDFD96', '#CBAACB', '#FFB347'];

// Global GeoBoundaries datasetindeki Türkçe bozulmalarını aşmak için katı sözlük
const TURKEY_PROVINCES: Record<string, string> = {
  "TR-01": "Adana", "TR-02": "Adıyaman", "TR-03": "Afyonkarahisar", "TR-04": "Ağrı", "TR-05": "Amasya", "TR-06": "Ankara", "TR-07": "Antalya", "TR-08": "Artvin", "TR-09": "Aydın", "TR-10": "Balıkesir", "TR-11": "Bilecik", "TR-12": "Bingöl", "TR-13": "Bitlis", "TR-14": "Bolu", "TR-15": "Burdur", "TR-16": "Bursa", "TR-17": "Çanakkale", "TR-18": "Çankırı", "TR-19": "Çorum", "TR-20": "Denizli", "TR-21": "Diyarbakır", "TR-22": "Edirne", "TR-23": "Elazığ", "TR-24": "Erzincan", "TR-25": "Erzurum", "TR-26": "Eskişehir", "TR-27": "Gaziantep", "TR-28": "Giresun", "TR-29": "Gümüşhane", "TR-30": "Hakkari", "TR-31": "Hatay", "TR-32": "Isparta", "TR-33": "Mersin", "TR-34": "İstanbul", "TR-35": "İzmir", "TR-36": "Kars", "TR-37": "Kastamonu", "TR-38": "Kayseri", "TR-39": "Kırklareli", "TR-40": "Kırşehir", "TR-41": "Kocaeli", "TR-42": "Konya", "TR-43": "Kütahya", "TR-44": "Malatya", "TR-45": "Manisa", "TR-46": "Kahramanmaraş", "TR-47": "Mardin", "TR-48": "Muğla", "TR-49": "Muş", "TR-50": "Nevşehir", "TR-51": "Niğde", "TR-52": "Ordu", "TR-53": "Rize", "TR-54": "Sakarya", "TR-55": "Samsun", "TR-56": "Siirt", "TR-57": "Sinop", "TR-58": "Sivas", "TR-59": "Tekirdağ", "TR-60": "Tokat", "TR-61": "Trabzon", "TR-62": "Tunceli", "TR-63": "Şanlıurfa", "TR-64": "Uşak", "TR-65": "Van", "TR-66": "Yozgat", "TR-67": "Zonguldak", "TR-68": "Aksaray", "TR-69": "Bayburt", "TR-70": "Karaman", "TR-71": "Kırıkkale", "TR-72": "Batman", "TR-73": "Şırnak", "TR-74": "Bartın", "TR-75": "Ardahan", "TR-76": "Iğdır", "TR-77": "Yalova", "TR-78": "Karabük", "TR-79": "Kilis", "TR-80": "Osmaniye", "TR-81": "Düzce"
};

type Place = {
  id: string;
  country_id: string;
  country_name: string;
  city: string;
  color: string;
  imageUrl?: string;
  note?: string;
  from_partner?: boolean;
};

// Harita içi kontrolcüsü (Zoom to element)
function MapController({ selectedBounds }: { selectedBounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedBounds) {
      map.flyToBounds(selectedBounds, { padding: [50, 50], duration: 1.5 });
    } else {
      // Mobile'da daha geniş görünüm
      const isMobile = window.innerWidth < 768;
      map.flyTo([39.0, 35.0], isMobile ? 2 : 4, { duration: 1.5 });
    }
  }, [selectedBounds, map]);
  return null;
}

export default function App() {
  // Auth is guaranteed by RootApp in main.tsx — no need to check here
  const { user, token } = useAuth();
  const { t } = useI18n();

  const authHeaders = { Authorization: `Bearer ${token}` };
  const cacheKey = `places_db_${user?.username || 'guest'}`;
  const hiddenKey = `hidden_ids_${user?.username || 'guest'}`;
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dunya_dark') !== 'false');
  const [showPhotoMap, setShowPhotoMap] = useState(() => localStorage.getItem('dunya_photo_map') !== 'false');

  const [places, setPlaces] = useState<Place[]>([]);
  const [worldData, setWorldData] = useState<any>(null);
  const [provinceData, setProvinceData] = useState<any>(null);
  const [globalStates, setGlobalStates] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<{id: string, name: string, iso2?: string} | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedBounds, setSelectedBounds] = useState<L.LatLngBounds | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view');
  const [expandedCart, setExpandedCart] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPartnerMap, setShowPartnerMap] = useState(() => localStorage.getItem(`dunya_partner_${user?.username}`) === '1');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showBucketModal, setShowBucketModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(() => !!localStorage.getItem(`dunya_onboarded_${user?.username}`));
  const [formData, setFormData] = useState({
    color: PASTEL_COLORS[0],
    note: '',
    file: null as File | null
  });
  const geoJsonWorldRef = useRef<any>(null);
  const geoJsonProvinceRef = useRef<any>(null);
  const placesRef = useRef<Place[]>(places);

  useEffect(() => {
    localStorage.setItem('dunya_dark', String(darkMode));
    localStorage.setItem('dunya_photo_map', String(showPhotoMap));
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode, showPhotoMap]);

  useEffect(() => {
    if (user?.username) {
      localStorage.setItem(`dunya_partner_${user?.username}`, showPartnerMap ? '1' : '0');
    }
  }, [showPartnerMap, user?.username]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    localforage.getItem<string[]>(hiddenKey).then(ids => {
      if (ids) setHiddenIds(new Set(ids));
    });
  }, [hiddenKey]);

  const toggleHide = (placeId: string) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId); else next.add(placeId);
      localforage.setItem(hiddenKey, Array.from(next));
      showToast(next.has(placeId) ? 'Görsel gizlendi' : 'Görsel gösterildi');
      return next;
    });
  };

  useEffect(() => {
    placesRef.current = places;
    if (geoJsonWorldRef.current) {
        geoJsonWorldRef.current.options.style = getWorldStyle;
        geoJsonWorldRef.current.setStyle(getWorldStyle);
    }
    if (geoJsonProvinceRef.current) {
        geoJsonProvinceRef.current.options.style = getProvinceStyle;
        geoJsonProvinceRef.current.setStyle(getProvinceStyle);
    }
  }, [places, showPhotoMap, darkMode, hiddenIds, selectedCountry, provinceData]);

  useEffect(() => {
    if (!token) return;
    // 1. ÖNCE localforage'dan anlık yükle
    localforage.getItem<Place[]>(cacheKey).then(cached => {
      if (cached && cached.length > 0) setPlaces(cached);
    });
    // 2. Backend sync (JWT ile)
    axios.get('/api/places', {
      headers: authHeaders,
      params: { include_partner: showPartnerMap }
    })
      .then(res => {
        if (res.data && res.data.length > 0) {
          setPlaces(res.data);
          localforage.setItem(cacheKey, res.data);
        }
      })
      .catch(() => { /* localforage fallback yeterli */ });

    axios.get('/geo/world.geojson')
      .then(res => setWorldData(res.data))
      .catch(err => console.error('world.geojson missing', err));

    axios.get('/geo/states.json')
      .then(res => setGlobalStates(res.data))
      .catch(err => console.error('states.json missing', err));
  }, [token, showPartnerMap]);

  const handleCountryClick = async (feature: any, layer: any) => {
    let isoA3 = feature.properties['ISO3166-1-Alpha-3'];
    
    // Kuzey Kıbrıs Türk Cumhuriyeti (KKTC) için uluslararası -99 kodunu özel TRNC koduna çeviriyoruz
    if (feature.properties.name === "Northern Cyprus") {
      isoA3 = "TRNC";
    }
    
    // Diğer tanınmayan (-99) ufak kara parçaları reddedilir
    if (!isoA3 || isoA3 === "-99") return;

    setSelectedCountry({
      id: isoA3,
      iso2: feature.properties['ISO3166-1-Alpha-2'],
      name: feature.properties.name === "Northern Cyprus" ? "Kuzey Kıbrıs Türk Cumhuriyeti" : feature.properties.name
    });
    
    // Zoom in animation - Güvenli getBounds kontrolü
    const boundsLayer = layer as any;
    if (boundsLayer.getBounds) {
      setSelectedBounds(boundsLayer.getBounds());
    }

    // Ülkeye ait il (provinces) GeoJSON verisini Local'den Çek
    setIsLoading(true);
    setProvinceData(null);
    try {
      // Artık sadece kendi bilgisayarından/sunucundan okuyor (Sıfır gecikme ve CORS yok!)
      const localUrl = `/geo/${isoA3}.geojson`;
      const res = await axios.get(localUrl);
      setProvinceData(res.data);
    } catch (e) {
      console.warn("Local province data error, falling back to official CDN:", e);
      try {
        const cdnUrl = `https://geoboundaries.org/data/geoBoundaries-3_0_0/${isoA3}/ADM1/geoBoundaries-3_0_0-${isoA3}-ADM1.geojson`;
        const fallbackRes = await axios.get(cdnUrl);
        setProvinceData(fallbackRes.data);
      } catch (fallbackErr) {
        alert("Bu ülkenin detaylı il haritası bulunamadı.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getProvinceName = (feature: any) => {
    const iso = feature.properties?.shapeISO;
    if (iso && TURKEY_PROVINCES[iso]) {
      return TURKEY_PROVINCES[iso];
    }
    const rawName = feature.properties.shapeName || feature.properties.name || "Bilinmeyen İl";

    // Tüm DÜNYA genelindeki `geoBoundaries` "??" bozuk karakterlerini Regex ile otomatik maskeleme ve tespitte bulunma
    if (rawName.includes('?') && selectedCountry?.iso2 && globalStates.length > 0) {
      const countryStates = globalStates.filter(s => s.country_code === selectedCountry.iso2);
      // İl sınırları adlarındaki fazla kelimeleri siliyoruz (örn: Municipality) eşleşmeyi zorlamasın
      const cleanRawName = rawName.replace(/ (Municipality|Province|Region|District|County|City|Governorate|Prefecture|State|Department)/gi, '').trim();
      // İçindeki ? işaretlerini her karaktere açık bir regex noktasına çeviriyoruz: "Nik?i?" -> "^Nik.i..*"
      const regexStr = "^" + cleanRawName.replace(/\?/g, '.') + ".*$";
      try {
        const regex = new RegExp(regexStr, 'i');
        const match = countryStates.find(s => regex.test(s.name) || (s.native && regex.test(s.native)));
        if (match) return match.name; // Kusursuz orijinal dilde ismini geri döndür!
      } catch (e) {
        console.warn("Regex correction failed for:", rawName);
      }
    }

    return rawName;
  };

  const handleProvinceClick = (feature: any) => {
    const provinceName = getProvinceName(feature);
    setSelectedProvince(provinceName);
    
    const alreadyVisited = placesRef.current.find(p => p.country_id === selectedCountry?.id && p.city === provinceName);
    setActiveTab(alreadyVisited ? 'view' : 'add');
    setIsModalOpen(true);
  };

  const handleZoomOut = () => {
    setSelectedCountry(null);
    setSelectedProvince('');
    setProvinceData(null);
    setSelectedBounds(null);
    setIsModalOpen(false);
  };

  const handleTimelineFocus = (countryId: string, city?: string) => {
    if (!worldData || !geoJsonWorldRef.current) return;
    const layers = geoJsonWorldRef.current.getLayers();
    const layer = layers.find((l: any) => {
      let iso = l.feature.properties['ISO3166-1-Alpha-3'];
      if (l.feature.properties.name === 'Northern Cyprus') iso = 'TRNC';
      return iso === countryId;
    });
    if (layer) {
      handleCountryClick(layer.feature, layer);
    }
  };

  const handleExportMap = () => {
    setShowSettingsModal(false);
    setIsExporting(true);
    if (placesRef.current.length > 0 && geoJsonWorldRef.current) {
      const layers = geoJsonWorldRef.current.getLayers();
      const boundsList = layers
         .filter((l: any) => {
           let iso = l.feature.properties['ISO3166-1-Alpha-3'];
           if (l.feature.properties.name === "Northern Cyprus") iso = "TRNC";
           return placesRef.current.some(p => p.country_id === iso);
         })
         .map((l: any) => l.getBounds && l.getBounds())
         .filter(Boolean);
      
      if (boundsList.length > 0) {
         let allBounds = boundsList[0];
         for(let i=1; i<boundsList.length; i++) allBounds.extend(boundsList[i]);
         setSelectedBounds(allBounds);
      }
    }
    setTimeout(() => {
       setIsExporting(false);
       setTimeout(() => window.print(), 100);
    }, 2000);
  };

  const getPlaceColor = (countryId: string, shapeName: string) => {
    // hiddenIds ref'e erişemiyoruz, ama snapshot alabiliyoruz
    const place = placesRef.current.find(p => p.country_id === countryId && p.city === shapeName);
    return place ? place.color : null;
  };

  const getCountryColor = (countryId: string) => {
    const place = placesRef.current.find(p => p.country_id === countryId);
    return place ? place.color : null;
  };

  const onEachWorldFeature = (feature: any, layer: any) => {
    layer.on({
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({ fillOpacity: 0.6 });
      },
      mouseout: (e: any) => {
        if (geoJsonWorldRef.current) {
          geoJsonWorldRef.current.resetStyle(e.target);
        }
      },
      click: (e: any) => {
        handleCountryClick(feature, layer);
      }
    });
  };

  const onEachProvinceFeature = (feature: any, layer: any) => {
    layer.on({
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({ fillOpacity: 0.6 });
        const name = getProvinceName(feature);
        l.bindPopup(`<div class="font-bold">${name}</div>`).openPopup();
      },
      mouseout: (e: any) => {
        if (geoJsonProvinceRef.current) geoJsonProvinceRef.current.resetStyle(e.target);
        e.target.closePopup();
      },
      click: () => {
        handleProvinceClick(feature);
      }
    });
  };

  const getWorldStyle = (feature: any) => {
    let iso = feature.properties['ISO3166-1-Alpha-3'];
    if (feature.properties.name === 'Northern Cyprus') iso = 'TRNC';

    if (selectedCountry?.id === iso && provinceData) {
      // Hide country base layer if we are rendering its provinces natively on top
      return { fillColor: 'transparent', fillOpacity: 0, color: 'transparent', weight: 0 };
    }

    const collage = showPhotoMap ? countryCollages.find(c => c.country_id === iso) : null;
    const cColor = getCountryColor(iso);
    const hasImage = !!collage && collage.items.length > 0;

    return {
      fillColor: hasImage ? `url(#collage-${iso})` : (cColor || (darkMode ? "#0a0a0c" : "#f1f5f9")), 
      fillOpacity: hasImage ? 1 : (cColor ? 0.6 : 0.8), // Gezilen ülkeler hafif parlar
      color: darkMode ? "#27272a" : "#cbd5e1", // İnce ülke detayları
      weight: cColor ? 2 : 0.5
    };
  };

  const getProvinceStyle = (feature: any) => {
    const pName = getProvinceName(feature);
    const place = placesRef.current.find(p => p.country_id === selectedCountry?.id && p.city === pName);
    const hasImage = showPhotoMap && place && place.imageUrl && !hiddenIds.has(place.id);

    return {
      fillColor: hasImage ? `url(#pattern-${place.id})` : (place?.color || (darkMode ? "#000" : "#fff")),
      fillOpacity: hasImage ? 1 : (place ? 0.8 : 0.2), // Boyanmamış iller transparan
      color: darkMode ? "#38bdf8" : "#0284c7", // Neon mavi il çizgileri
      weight: 1.5
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCountry || !selectedProvince) return;

    try {
      // Resmi Base64'e kodla
      let b64Image: string | undefined = undefined;
      if (formData.file) {
        const reader = new FileReader();
        b64Image = await new Promise<string>((resolve, reject) => {
          reader.readAsDataURL(formData.file as File);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      }

      const newPlace: Place = {
        id: Date.now().toString(),
        country_id: selectedCountry.id,
        country_name: selectedCountry.name,
        city: selectedProvince,
        color: formData.color,
        note: formData.note,
        imageUrl: b64Image
      };

      // Backend API'ye gönder (JWT authentication)
      try {
        const fd = new FormData();
        fd.append('country_id', newPlace.country_id);
        fd.append('country_name', newPlace.country_name);
        fd.append('city', newPlace.city);
        fd.append('color', newPlace.color);
        if (formData.note) fd.append('note', formData.note);
        if (b64Image) fd.append('imageUrl', b64Image);
        const res = await axios.post('/api/places', fd, { headers: authHeaders });
        const savedPlace = { ...newPlace, ...res.data };
        const updatedPlaces = [...places, savedPlace];
        setPlaces(updatedPlaces);
        localforage.setItem(cacheKey, updatedPlaces);
      } catch (apiErr: any) {
        // Backend çalışmıyorsa yerel kaydet
        const updatedPlaces = [...places, newPlace];
        setPlaces(updatedPlaces);
        localforage.setItem(cacheKey, updatedPlaces);
      }

      showToast(`${selectedProvince} haritaya işlendi! ✓`);
      setActiveTab('view');
      setFormData(prev => ({...prev, note: '', file: null}));
    } catch (err) {
      console.error("DB Error", err);
      showToast("Bir hata oluştu.", 'error');
    }
  };

  const countryPlaces = places.filter(p => p.country_id === selectedCountry?.id);
  const visibleCountryPlaces = countryPlaces.filter(p => !hiddenIds.has(p.id));
  const countryImages = visibleCountryPlaces.filter(p => p.imageUrl).map(p => ({ url: p.imageUrl!, city: p.city, id: p.id }));
  const hiddenImagesCount = countryPlaces.filter(p => p.imageUrl && hiddenIds.has(p.id)).length;

  const countryCollages = useMemo(() => {
    if (!showPhotoMap) return [];
    const map = new Map<string, string[]>();
    places.filter(p => !hiddenIds.has(p.id) && p.imageUrl).forEach(p => {
       if (!map.has(p.country_id)) map.set(p.country_id, []);
       map.get(p.country_id)!.push(p.imageUrl!);
    });
    return Array.from(map.entries()).map(([country_id, urls]) => {
        return { country_id, items: urls.slice(0, 4) }; // max 4 items per country collage
    });
  }, [places, hiddenIds, showPhotoMap]);

  const visitedCountries = useMemo(() => {
    const map = new Map<string, { country_id: string, country_name: string, cities: string[] }>();
    places.filter(p => !hiddenIds.has(p.id)).forEach(p => {
      if (!map.has(p.country_id)) {
        map.set(p.country_id, { country_id: p.country_id, country_name: p.country_name, cities: [] });
      }
      const ct = map.get(p.country_id)!;
      if (!ct.cities.includes(p.city)) {
        ct.cities.push(p.city);
      }
    });
    return Array.from(map.values()).sort((a,b) => b.cities.length - a.cities.length);
  }, [places, hiddenIds]);

  return (
    <div className="relative w-full bg-black text-slate-200 font-sans overflow-hidden" style={{ height: '100dvh' }}>

      {/* ===== TOAST NOTIFICATION ===== */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-[fadeInUp_0.3s_ease-out] backdrop-blur-xl transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-900/90 border-emerald-500/40 text-emerald-100'
            : 'bg-rose-900/90 border-rose-500/40 text-rose-100'
        }`}
          style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <span className="text-lg">{toast.type === 'success' ? '✅' : '❌'}</span>
          <span className="font-semibold text-sm whitespace-nowrap">{toast.msg}</span>
        </div>
      )}

      {/* ===== MOBILE TOP BAR ===== */}
      <div className="md:hidden absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 py-3 bg-black/70 backdrop-blur-xl border-b border-white/10"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2">
          <Globe className="text-blue-400" size={22} />
          <span className="text-white font-extrabold text-lg">Dünyam</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedCountry && (
            <button
              onClick={handleZoomOut}
              className="flex items-center gap-1.5 bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold border border-slate-600"
            >
              <MapIcon size={14} /> Geri
            </button>
          )}
          {visitedCountries.length > 0 && !selectedCountry && (
            <button
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="relative bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold border border-slate-600 flex items-center gap-1.5"
            >
              <MapPin size={14} className="text-blue-400" />
              {visitedCountries.length} Ülke
            </button>
          )}
          <button
            onClick={() => setShowProfileModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-xl border border-slate-600 flex items-center justify-center min-w-[36px] min-h-[36px] transition-colors"
            title="Profil"
          >
            <UserCircle size={18} className="text-blue-400" />
          </button>
        </div>
      </div>

      {/* ===== DESKTOP LEFT PANEL ===== */}
      <div className="hidden md:flex absolute top-6 left-6 z-[1000] w-[320px] max-h-[calc(100vh-48px)] flex-col gap-4 pointer-events-none">
        {/* Üst Başlık & Kontroller */}
        <div className="bg-black/60 backdrop-blur-xl p-5 rounded-2xl shadow-2xl border border-white/10 flex flex-col gap-4 pointer-events-auto shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold flex items-center gap-3 text-white">
                <Globe className="text-blue-400" size={32} />
                Dünyam
              </h1>
              <p className="text-slate-400 mt-1 text-xs uppercase tracking-widest font-bold">Low-Poly Siyasi Harita</p>
            </div>
            <button
              onClick={() => setShowProfileModal(true)}
              className="bg-slate-800 hover:bg-blue-600/30 text-white p-2.5 rounded-xl border border-slate-600 hover:border-blue-500/50 transition-colors flex items-center justify-center"
              title={`@${user?.username}`}
            >
              <UserCircle size={22} className="text-blue-400" />
            </button>
          </div>
          {selectedCountry && (
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 flex flex-col gap-2">
              <div className="text-white font-bold text-lg flex items-center gap-2">
                <MapPin className="text-green-400" size={18} /> {selectedCountry.name}
              </div>
              {isLoading ? (
                <span className="text-xs text-blue-400 animate-pulse">İl projeksiyonu yükleniyor...</span>
              ) : provinceData ? (
                <span className="text-xs text-slate-400">Detaylar için bir il'e tıkla.</span>
              ) : null}
            </div>
          )}
          {selectedCountry && (
            <button
              onClick={handleZoomOut}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white p-3 rounded-xl text-sm font-semibold transition-all border border-slate-600 shadow-lg"
            >
              <MapIcon size={18} /> Küresel Görünüme Dön
            </button>
          )}
        </div>

        {/* Desktop Travel Cart */}
        {visitedCountries.length > 0 && !selectedCountry && (
          <div className="bg-black/60 backdrop-blur-xl p-5 rounded-2xl shadow-2xl border border-white/10 pointer-events-auto flex flex-col gap-3 overflow-hidden flex-1 min-h-0">
            <h2 className="text-white font-bold tracking-widest text-xs uppercase border-b border-white/10 pb-3 flex justify-between items-center shrink-0">
              Seyahat Rehberi
              <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md">{visitedCountries.length} ÜLKE</span>
            </h2>
            <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 pr-2 flex flex-col gap-2">
              {visitedCountries.map(vc => (
                <div key={vc.country_id} className="bg-white/5 rounded-xl border border-white/5 overflow-hidden transition-all">
                  <button
                    onClick={() => setExpandedCart(expandedCart === vc.country_id ? null : vc.country_id)}
                    className="w-full text-left p-3 flex justify-between items-center hover:bg-white/10 transition-colors"
                  >
                    <span className="text-sm font-bold text-white flex gap-2 items-center">
                      {expandedCart === vc.country_id ? <ChevronDown size={14} className="text-blue-400" /> : <ChevronRight size={14} className="text-slate-500" />}
                      {vc.country_name}
                    </span>
                    <span className="text-xs font-bold text-slate-300 bg-black/50 px-2 py-1 rounded-lg">{vc.cities.length} İl</span>
                  </button>
                  {expandedCart === vc.country_id && (
                    <div className="px-4 pb-3 pt-1 flex flex-col gap-1.5 border-t border-white/5 bg-black/30">
                      {vc.cities.map(city => (
                        <div key={city} className="text-xs text-slate-400 pl-2 border-l-2 border-blue-400/50 py-1 font-semibold">{city}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== MOBILE CART BOTTOM SHEET ===== */}
      {isCartOpen && visitedCountries.length > 0 && !selectedCountry && (
        <div className="md:hidden fixed inset-0 z-[1500] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative bg-slate-900 rounded-t-3xl border-t border-white/10 max-h-[70vh] flex flex-col"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
            <div className="flex justify-between items-center px-6 pb-4 border-b border-white/10">
              <h2 className="text-white font-bold text-base">Seyahat Rehberi</h2>
              <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-md font-bold">{visitedCountries.length} Ülke</span>
            </div>
            <div className="overflow-y-auto flex flex-col gap-2 p-4 pb-32">
              {visitedCountries.map(vc => (
                <div key={vc.country_id} className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                  <button
                    onClick={() => setExpandedCart(expandedCart === vc.country_id ? null : vc.country_id)}
                    className="w-full text-left p-4 flex justify-between items-center"
                  >
                    <span className="text-sm font-bold text-white flex gap-2 items-center">
                      {expandedCart === vc.country_id ? <ChevronDown size={14} className="text-blue-400" /> : <ChevronRight size={14} className="text-slate-500" />}
                      {vc.country_name}
                    </span>
                    <span className="text-xs font-bold text-slate-300 bg-black/50 px-2 py-1 rounded-lg">{vc.cities.length} İl</span>
                  </button>
                  {expandedCart === vc.country_id && (
                    <div className="px-5 pb-4 pt-1 flex flex-col gap-2 border-t border-white/5 bg-black/30">
                      {vc.cities.map(city => (
                        <div key={city} className="text-sm text-slate-400 pl-2 border-l-2 border-blue-400/50 py-1 font-semibold">{city}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== MAP ===== */}
      <div className={`w-full h-full z-0 ${darkMode ? 'bg-black' : 'bg-[#e5e7eb]'}`}>
        <svg width="0" height="0" className="absolute pointer-events-none">
          <defs>
            {showPhotoMap && places.filter(p => !hiddenIds.has(p.id) && p.imageUrl).map(p => (
              <pattern key={`pattern-${p.id}`} id={`pattern-${p.id}`} patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1">
                <image href={p.imageUrl} x="0" y="0" width="1" height="1" preserveAspectRatio="xMidYMin slice" />
              </pattern>
            ))}
            {countryCollages.map(collage => {
               const w = 1 / collage.items.length;
               return (
                  <pattern key={`collage-${collage.country_id}`} id={`collage-${collage.country_id}`} patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1">
                     {collage.items.map((url, i) => (
                        <image key={`img-${i}`} href={url} x={i * w} y="0" width={w} height="1" preserveAspectRatio="xMidYMin slice" />
                     ))}
                  </pattern>
               );
            })}
          </defs>
        </svg>
        <MapContainer
          center={[39.0, 35.0]}
          zoom={window.innerWidth < 768 ? 2 : 4}
          zoomControl={false}
          className={`w-full h-full outline-none ${darkMode ? 'bg-black' : 'bg-slate-100'}`}
          style={{ background: darkMode ? '#000000' : '#f8fafc' }}
        >
          <TileLayer
            key={darkMode ? 'dark' : 'light'}
            url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"}
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />
          <MapController selectedBounds={selectedBounds} />
          {worldData && (
            <GeoJSON
              key="world-layer"
              ref={geoJsonWorldRef}
              data={worldData}
              style={getWorldStyle}
              onEachFeature={onEachWorldFeature}
            />
          )}
          {provinceData && (
            <GeoJSON
              key={`province-${selectedCountry?.id}`}
              ref={geoJsonProvinceRef}
              data={provinceData}
              style={getProvinceStyle}
              onEachFeature={onEachProvinceFeature}
            />
          )}
        </MapContainer>
      </div>

      {/* ===== MODAL (Desktop: right panel, Mobile: bottom sheet) ===== */}
      {isModalOpen && selectedCountry && selectedProvince && (
        <div className="fixed inset-0 z-[2000] flex flex-col sm:flex-row sm:justify-end">
          {/* Backdrop - mobile only */}
          <div className="absolute inset-0 bg-black/40 sm:hidden" onClick={() => setIsModalOpen(false)} />

          {/* Panel */}
          <div className="relative mt-auto sm:mt-0 w-full sm:w-[450px] sm:h-full bg-slate-900 border-t sm:border-t-0 sm:border-l border-white/10 shadow-2xl flex flex-col rounded-t-3xl sm:rounded-none"
            style={{ maxHeight: '90dvh', paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}>

            {/* Drag handle - mobile only */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="p-5 sm:p-6 flex justify-between items-center border-b border-white/5 bg-black/40">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex flex-col">
                <span className="text-xs font-semibold text-blue-400 mb-1 uppercase tracking-wider">{selectedCountry.name}</span>
                <span className="flex items-center gap-2 drop-shadow-md"><MapPin className="text-emerald-400" size={18} /> {selectedProvince}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2.5 rounded-full border border-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-5 sm:px-6 pt-4 gap-4 bg-black/20">
              <button
                className={`pb-3 border-b-2 transition-colors font-semibold uppercase tracking-wider text-xs min-h-[44px] ${activeTab === 'view' ? 'text-blue-400 border-blue-400' : 'text-slate-500 border-transparent'}`}
                onClick={() => setActiveTab('view')}
              >
                Gezilen Yerler
              </button>
              <button
                className={`pb-3 border-b-2 transition-colors font-semibold uppercase tracking-wider text-xs min-h-[44px] ${activeTab === 'add' ? 'text-green-400 border-green-400' : 'text-slate-500 border-transparent'}`}
                onClick={() => setActiveTab('add')}
              >
                <span className="flex items-center gap-2">Pini Zapt Et ✦</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 scrollbar-thin scrollbar-thumb-slate-700">
              {activeTab === 'view' && (
                <div className="flex flex-col gap-6">
                       {countryImages.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-slate-400 text-xs font-bold mb-3 uppercase tracking-widest flex justify-between items-center border-b border-white/10 pb-2">
                        <span>Bu Ülke Albümü</span>
                        <div className="flex items-center gap-2">
                          {hiddenImagesCount > 0 && (
                            <button
                              onClick={() => setShowHidden(s => !s)}
                              className="flex items-center gap-1 text-[10px] py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            >
                              {showHidden ? <Eye size={10}/> : <EyeOff size={10}/>}
                              {showHidden ? 'Gizlileri Şakla' : `${hiddenImagesCount} Gizli`}
                            </button>
                          )}
                          <span className="bg-white/10 text-[10px] py-1 px-2 rounded-lg">{countryImages.length} FOTO</span>
                        </div>
                      </h3>
                      {countryImages.length === 1 ? (
                        <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl relative group">
                          <img src={countryImages[0].url} className="w-full h-60 object-cover" alt="Anı" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end p-5">
                            <span className="text-white font-bold text-lg">{countryImages[0].city}</span>
                          </div>
                          <button
                            onClick={() => toggleHide(countryImages[0].id)}
                            className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 p-2 rounded-full border border-white/10 transition-all opacity-0 group-hover:opacity-100"
                            title="Gizle"
                          >
                            <EyeOff size={14} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {countryImages.map((img, idx) => (
                            <div key={idx} className={`rounded-xl overflow-hidden border border-white/10 shadow-xl relative group ${idx === 0 && countryImages.length % 2 !== 0 ? 'col-span-2 h-44' : 'h-36'}`}>
                              <img src={img.url} className="w-full h-full object-cover" alt="Anı" />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                                <span className="text-white text-xs font-bold">{img.city}</span>
                              </div>
                              <button
                                onClick={() => toggleHide(img.id)}
                                className="absolute top-2 right-2 bg-black/60 hover:bg-rose-900/80 p-1.5 rounded-full border border-white/10 transition-all opacity-0 group-hover:opacity-100"
                                title="Gizle"
                              >
                                <EyeOff size={12} className="text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-2">
                    <h3 className="text-slate-400 text-xs font-bold mb-3 uppercase tracking-widest border-b border-white/10 pb-2">{selectedProvince} Log Kaydı</h3>
                    {visibleCountryPlaces.filter(p => p.city === selectedProvince).length === 0 ? (
                      <div className="bg-black/40 rounded-xl p-8 text-center border border-white/5">
                        <p className="text-slate-500 text-sm mb-4">Bu koordinat için aktif bir veri bulunamadı.</p>
                        <button onClick={() => setActiveTab('add')} className="text-blue-400 font-bold text-xs uppercase tracking-wider border border-blue-500/30 px-4 py-3 rounded-lg bg-blue-500/10 min-h-[44px]">Sisteme Giriş Yap</button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {visibleCountryPlaces.filter(p => p.city === selectedProvince).map((place, idx) => (
                          <div key={idx} className="bg-gradient-to-br from-slate-800 to-black rounded-xl border border-white/10 p-5 flex flex-col gap-3 relative shadow-2xl">
                            <div className="absolute top-5 right-5 w-4 h-4 rounded-full border-2 border-slate-900" style={{ backgroundColor: place.color }}></div>
                            <div className="flex items-center justify-between pr-8">
                              <h3 className="text-lg font-bold text-white">{place.city}</h3>
                              <button
                                onClick={() => toggleHide(place.id)}
                                className="text-slate-500 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-500/10"
                                title="Bu kaydı gizle"
                              >
                                <EyeOff size={15} />
                              </button>
                            </div>
                            {place.note && (
                              <p className="text-slate-300 text-sm mt-1 bg-black/60 p-4 rounded-xl border border-white/5 leading-relaxed">{place.note}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'add' && (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {/* JWT auth ile giriş yapıldığı için şifre
                      alanına gerek yok — kullanıcı kimliği token’dan geliyor */}
                  <hr className="border-white/5" />
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Durum Notu</label>
                    <textarea
                      rows={4}
                      className="w-full p-4 bg-black/50 border border-white/10 text-white rounded-xl focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 resize-none text-base"
                      value={formData.note}
                      onChange={(e) => setFormData({...formData, note: e.target.value})}
                      placeholder="Görev/Gezi detayları..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">Harita Boyama Rengi <span className="text-rose-500">*</span></label>
                    <div className="flex gap-4 bg-black/40 p-4 rounded-xl border border-white/5 justify-center">
                      {PASTEL_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          className={`w-11 h-11 rounded-full transition-all ${formData.color === color ? 'ring-4 ring-white/50 scale-125 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'ring-2 ring-transparent opacity-60'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setFormData({...formData, color})}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Saha Görseli (Opsiyonel)</label>
                    <div className="border border-dashed border-white/20 bg-black/30 rounded-xl p-8 flex flex-col items-center justify-center">
                      <input type="file" accept="image/*" className="hidden" id="imageUpload" onChange={(e) => setFormData({...formData, file: e.target.files?.[0] || null})} />
                      <label htmlFor="imageUpload" className="cursor-pointer flex flex-col items-center w-full">
                        <div className="bg-white/5 p-4 rounded-full mb-3">
                          <ImageIcon className="text-slate-500" size={28} />
                        </div>
                        <span className="text-xs font-bold text-slate-500 text-center uppercase tracking-wide">
                          {formData.file ? formData.file.name : 'Dosya Seç'}
                        </span>
                      </label>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full mt-2 p-4 rounded-xl bg-blue-600 text-white font-extrabold text-sm uppercase tracking-widest hover:bg-blue-500 transition-all min-h-[52px]"
                  >
                    Sisteme İşle
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== DESKTOP FLOATING TOOLBAR (RIGHT) ===== */}
      <div className="hidden md:flex absolute top-6 right-6 z-[1000] flex-col gap-3">
        <button onClick={() => setShowStatsModal(true)} className="bg-black/60 backdrop-blur-xl hover:bg-blue-600/20 text-white p-3.5 rounded-2xl border border-white/10 hover:border-blue-500/50 shadow-2xl transition-all group relative flex items-center justify-center">
          <BarChart2 size={24} className="text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="absolute right-[calc(100%+16px)] top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 whitespace-nowrap border border-white/10 pointer-events-none shadow-xl">{t.stats}</span>
        </button>
        <button onClick={() => setShowBucketModal(true)} className="bg-black/60 backdrop-blur-xl hover:bg-amber-600/20 text-white p-3.5 rounded-2xl border border-white/10 hover:border-amber-500/50 shadow-2xl transition-all group relative flex items-center justify-center">
          <Bookmark size={24} className="text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="absolute right-[calc(100%+16px)] top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 whitespace-nowrap border border-white/10 pointer-events-none shadow-xl">{t.bucketList}</span>
        </button>
        <button onClick={() => setShowTimelineModal(true)} className="bg-black/60 backdrop-blur-xl hover:bg-emerald-600/20 text-white p-3.5 rounded-2xl border border-white/10 hover:border-emerald-500/50 shadow-2xl transition-all group relative flex items-center justify-center">
          <Clock size={24} className="text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="absolute right-[calc(100%+16px)] top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 whitespace-nowrap border border-white/10 pointer-events-none shadow-xl">{t.timeline}</span>
        </button>
        <button onClick={() => setShowNotifModal(true)} className="bg-black/60 backdrop-blur-xl hover:bg-violet-600/20 text-white p-3.5 rounded-2xl border border-white/10 hover:border-violet-500/50 shadow-2xl transition-all group relative flex items-center justify-center">
          <Bell size={24} className="text-violet-400 group-hover:scale-110 transition-transform" />
          <span className="absolute right-[calc(100%+16px)] top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 whitespace-nowrap border border-white/10 pointer-events-none shadow-xl">{t.notifications}</span>
        </button>
        <div className="w-full h-px bg-white/10 my-1 rounded-full" />
        <button onClick={() => setShowSettingsModal(true)} className="bg-black/60 backdrop-blur-xl hover:bg-slate-600/40 text-white p-3.5 rounded-2xl border border-white/10 hover:border-slate-400/50 shadow-2xl transition-all group relative flex items-center justify-center">
          <Settings size={24} className="text-slate-400 group-hover:scale-110 transition-transform hover:rotate-90" />
          <span className="absolute right-[calc(100%+16px)] top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 whitespace-nowrap border border-white/10 pointer-events-none shadow-xl">{t.settings}</span>
        </button>
      </div>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[1500] bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-around"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))', paddingTop: '8px' }}>
        <button onClick={() => setShowStatsModal(true)} className="flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-blue-400 transition-colors min-w-[52px]">
          <BarChart2 size={20} />
          <span className="text-[9px] uppercase tracking-wide font-bold">{t.stats}</span>
        </button>
        <button onClick={() => setShowBucketModal(true)} className="flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-amber-400 transition-colors min-w-[52px]">
          <Bookmark size={20} />
          <span className="text-[9px] uppercase tracking-wide font-bold">{t.bucketList}</span>
        </button>
        <button onClick={() => setShowTimelineModal(true)} className="flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-emerald-400 transition-colors min-w-[52px]">
          <Clock size={20} />
          <span className="text-[9px] uppercase tracking-wide font-bold">{t.timeline}</span>
        </button>
        <button onClick={() => setShowNotifModal(true)} className="relative flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-violet-400 transition-colors min-w-[52px]">
          <Bell size={20} />
          <span className="text-[9px] uppercase tracking-wide font-bold">{t.notifications}</span>
        </button>
        <button onClick={() => setShowSettingsModal(true)} className="flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-slate-200 transition-colors min-w-[52px]">
          <Settings size={20} />
          <span className="text-[9px] uppercase tracking-wide font-bold">{t.settings}</span>
        </button>
      </div>

      {/* ===== ALL MODALS ===== */}
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} showPartnerMap={showPartnerMap} onTogglePartnerMap={setShowPartnerMap} />
      )}
      {showStatsModal && <StatsModal onClose={() => setShowStatsModal(false)} />}
      {showBucketModal && (
        <BucketListModal
          onClose={() => setShowBucketModal(false)}
          selectedCountry={selectedCountry}
          selectedCity={selectedProvince}
        />
      )}
      {showTimelineModal && (
        <TimelineModal onClose={() => setShowTimelineModal(false)} showPartner={showPartnerMap} onFocus={handleTimelineFocus} />
      )}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
          showPhotoMap={showPhotoMap}
          onTogglePhotoMap={() => setShowPhotoMap(d => !d)}
          onExport={handleExportMap}
        />
      )}
      {showNotifModal && <NotificationsModal onClose={() => setShowNotifModal(false)} />}
      {isExporting && (
        <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center text-white p-5 text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6" />
          <h2 className="text-2xl font-bold mb-2">Harita Hazırlanıyor...</h2>
          <p className="text-slate-400 text-sm">Gezdiğin tüm yerler kadraja alınıyor, lütfen bekle.</p>
        </div>
      )}
      {!isOnboarded && token && (
        <OnboardingModal onComplete={() => {
          localStorage.setItem(`dunya_onboarded_${user?.username}`, '1');
          setIsOnboarded(true);
        }} />
      )}
    </div>
  );
}
