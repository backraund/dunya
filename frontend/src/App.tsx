import { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import localforage from 'localforage';
import { MapPin, Image as ImageIcon, Plus, Lock, X, Map as MapIcon, Globe, ChevronDown, ChevronRight } from 'lucide-react';

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
  country_id: string; // ISO A3
  country_name: string;
  city: string; // Province Name
  color: string;
  imageUrl?: string;
  note?: string;
};

// Harita içi kontrolcüsü (Zoom to element)
function MapController({ selectedBounds }: { selectedBounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedBounds) {
      // Ekran boyutuna göre sağ-sol/üst-alt şeklinde uyarla
      // NOT: maxZoom'u tamamen kaldırdık. Küçük ülkeler için otomatik tam orantılı hesaplayacak!
      map.flyToBounds(selectedBounds, { padding: [40, 40], duration: 1.5 });
    } else {
      // Küresel görünüme dönerken direkt Türkiye & Avrupa merkezli daha yakın bir görünüm
      map.flyTo([39.0, 35.0], 4, { duration: 1.5 });
    }
  }, [selectedBounds, map]);
  return null;
}

export default function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  
  // Harita Verileri
  const [worldData, setWorldData] = useState<any>(null);
  const [provinceData, setProvinceData] = useState<any>(null);
  const [globalStates, setGlobalStates] = useState<any[]>([]); // Sadece isim restorasyonu için dev dizin
  
  const [selectedCountry, setSelectedCountry] = useState<{id: string, name: string, iso2?: string} | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedBounds, setSelectedBounds] = useState<L.LatLngBounds | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view');
  const [expandedCart, setExpandedCart] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    color: PASTEL_COLORS[0],
    note: '',
    password: '',
    file: null as File | null
  });

  const geoJsonWorldRef = useRef<any>(null);
  const geoJsonProvinceRef = useRef<any>(null);
  const placesRef = useRef<Place[]>(places);

  // State'i Ref içinde de güncel tutarak Leaflet eventlerinde taze veriye ulaşalım
  useEffect(() => {
    placesRef.current = places;
    if (geoJsonWorldRef.current) geoJsonWorldRef.current.setStyle(getWorldStyle);
    if (geoJsonProvinceRef.current) geoJsonProvinceRef.current.setStyle(getProvinceStyle);
  }, [places]);

  useEffect(() => {
    // Veritabanından eski kayıtları çek
    localforage.getItem<Place[]>('places_db').then(data => {
      if (data && data.length > 0) {
        setPlaces(data);
      }
    }).catch(err => console.error("DB Load Error:", err));

    // Localden tüm dünyanın ülke haritasını çekelim (Kendi sunucumuzdan 0ms gecikme)
    axios.get('/geo/world.geojson')
      .then(res => {
        setWorldData(res.data);
      }).catch(err => {
        console.error("Local world data missing! Start the download script.", err);
      });

    // Harf bozulmaları olan dünya geneli illeri onarmak için Global Sözlüğü yükle
    axios.get('/geo/states.json')
      .then(res => setGlobalStates(res.data))
      .catch(err => console.error("Global states mappings missing.", err));
  }, []);

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
    setProvinceData(null);
    setSelectedBounds(null);
    setIsModalOpen(false);
  };

  const getPlaceColor = (countryId: string, shapeName: string) => {
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

    const cColor = getCountryColor(iso);
    return {
      fillColor: cColor || "#0a0a0c", 
      fillOpacity: cColor ? 0.3 : 0.8, // Gezilen ülkeler hafif parlar
      color: "#27272a", // İnce ülke detayları
      weight: cColor ? 2 : 0.5
    };
  };

  const getProvinceStyle = (feature: any) => {
    const pColor = getPlaceColor(selectedCountry?.id || "", getProvinceName(feature));
    return {
      fillColor: pColor || "#000",
      fillOpacity: pColor ? 0.8 : 0.2, // Boyanmamış iller transparan
      color: "#38bdf8", // Neon mavi il çizgileri
      weight: 1.5
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCountry || !selectedProvince) return;

    if (formData.password !== "test") {
      alert("Hatalı Şifre! Yetkili şifresi 'test' olarak tanımlanmıştır.");
      return;
    }

    try {
      // Resmi Base64 string'ine kodla (Veritabanında sonsuza dek kalması için)
      let b64Image = undefined;
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
      
      const updatedPlaces = [...places, newPlace];
      setPlaces(updatedPlaces);
      
      // IndexedDB (NoSQL) sistemine yaz!
      await localforage.setItem('places_db', updatedPlaces);
      
      alert("Dunya DB'ye Mühürlendi! Artık sayfayı yenilesen de silinmeyecek.");
      setActiveTab('view');
      setFormData(prev => ({...prev, note: '', file: null}));
    } catch (err) {
      console.error("DB Error", err);
      alert("Veritabanına işlenirken bir hata oluştu.");
    }
  };

  const countryPlaces = places.filter(p => p.country_id === selectedCountry?.id);
  const countryImages = countryPlaces.filter(p => p.imageUrl).map(p => ({ url: p.imageUrl!, city: p.city }));

  const visitedCountries = useMemo(() => {
    const map = new Map<string, { country_id: string, country_name: string, cities: string[] }>();
    places.forEach(p => {
      if (!map.has(p.country_id)) {
        map.set(p.country_id, { country_id: p.country_id, country_name: p.country_name, cities: [] });
      }
      const ct = map.get(p.country_id)!;
      if (!ct.cities.includes(p.city)) {
        ct.cities.push(p.city);
      }
    });
    return Array.from(map.values()).sort((a,b) => b.cities.length - a.cities.length);
  }, [places]);

  return (
    <div className="relative w-full h-screen bg-black text-slate-200 font-sans overflow-hidden">
      
      {/* Sol Panel Bölgesi (Başlık + Dinamik Cart) */}
      <div className="absolute top-6 left-6 z-[1000] w-[320px] max-h-[calc(100vh-48px)] flex flex-col gap-4 pointer-events-none">
        
        {/* Üst Başlık & Kontroller */}
        <div className="bg-black/60 backdrop-blur-xl p-5 rounded-2xl shadow-2xl border border-white/10 flex flex-col gap-4 pointer-events-auto shrink-0">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3 text-white">
              <Globe className="text-blue-400" size={32} />
              Dünyam
            </h1>
            <p className="text-slate-400 mt-1 text-xs uppercase tracking-widest font-bold">Low-Poly Siyasi Harita</p>
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
              <MapIcon size={18} />
              Küresel Görünüme Dön
            </button>
          )}
        </div>

        {/* Ziyaret Edilenler Cartı (Sadece Küresel Görünümde) */}
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300 bg-black/50 px-2 py-1 rounded-lg">{vc.cities.length} İl</span>
                    </div>
                  </button>
                  {expandedCart === vc.country_id && (
                     <div className="px-4 pb-3 pt-1 flex flex-col gap-1.5 border-t border-white/5 bg-black/30">
                       {vc.cities.map(city => (
                         <div key={city} className="text-xs text-slate-400 pl-2 border-l-2 border-blue-400/50 py-1 font-semibold">
                           {city}
                         </div>
                       ))}
                     </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Leaflet Haritası */}
      <div className="w-full h-full z-0 bg-black">
        <MapContainer 
          center={[39.0, 35.0]} 
          zoom={4} 
          zoomControl={false}
          className="w-full h-full outline-none bg-black"
          style={{ background: '#000000' }}
        >
          {/* CartoDB Dark Matter No Labels - Sadece simisyah sular ve teknik kara */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />
          
          <MapController selectedBounds={selectedBounds} />

          {/* Dünya GeoJSON Katmanı (Daima Arka Planda) */}
          {worldData && (
            <GeoJSON 
              key="world-layer"
              ref={geoJsonWorldRef}
              data={worldData}
              style={getWorldStyle}
              onEachFeature={onEachWorldFeature}
            />
          )}

          {/* İl (Province) GeoJSON Katmanı (Sadece Ülke Seçilince Üste Biner) */}
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

      {/* Sağ Yan Panel Modal */}
      {isModalOpen && selectedCountry && selectedProvince && (
        <div className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-slate-900 border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-[2000] flex flex-col animate-[slideIn_0.3s_ease-out]">
          <div className="p-6 flex justify-between items-center border-b border-white/5 bg-black/40">
            <h2 className="text-2xl font-bold text-white flex flex-col">
              <span className="text-xs font-semibold text-blue-400 mb-1 uppercase tracking-wider">{selectedCountry.name}</span>
              <span className="flex items-center gap-2 drop-shadow-md"><MapPin className="text-emerald-400" /> {selectedProvince}</span>
            </h2>
            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full border border-white/10">
              <X size={20} />
            </button>
          </div>

          <div className="flex px-6 pt-4 gap-4 bg-black/20">
            <button 
              className={`pb-3 border-b-2 transition-colors font-semibold uppercase tracking-wider text-xs ${activeTab === 'view' ? 'text-blue-400 border-blue-400' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
              onClick={() => setActiveTab('view')}
            >
              Gezilen Yerler & Kolaj
            </button>
            <button 
              className={`pb-3 border-b-2 transition-colors font-semibold uppercase tracking-wider text-xs ${activeTab === 'add' ? 'text-green-400 border-green-400' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
              onClick={() => setActiveTab('add')}
            >
              <span className="flex items-center gap-2">Pini Zapt Et <Lock size={12}/></span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
            {/* VIEW MODE */}
            {activeTab === 'view' && (
              <div className="flex flex-col gap-6">
                
                {/* Tüm Ülkenin Fotoğraf Kolajı */}
                {countryImages.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-slate-400 text-xs font-bold mb-3 uppercase tracking-widest flex justify-between items-center border-b border-white/10 pb-2">
                      <span>Bu Ülke Albümü</span>
                      <span className="bg-white/10 text-[10px] py-1 px-2 rounded-lg">{countryImages.length} FOTO</span>
                    </h3>
                    
                    {countryImages.length === 1 ? (
                      <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl relative group">
                        <img src={countryImages[0].url} className="w-full h-72 object-cover transition-transform group-hover:scale-105" alt="Anı" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end p-5">
                          <span className="text-white font-bold tracking-wide text-lg drop-shadow-md">{countryImages[0].city}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {countryImages.map((img, idx) => (
                          <div key={idx} className={`rounded-xl overflow-hidden border border-white/10 shadow-xl relative group ${idx === 0 && countryImages.length % 2 !== 0 ? 'col-span-2 h-48' : 'h-36'}`}>
                            <img src={img.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Anı" />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pointer-events-none">
                              <span className="text-white text-xs font-bold drop-shadow-lg">{img.city}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sadece Tıklanan İlin Bilgisi */}
                <div className="mt-2">
                  <h3 className="text-slate-400 text-xs font-bold mb-3 uppercase tracking-widest border-b border-white/10 pb-2">{selectedProvince} Log Kaydı</h3>
                  {countryPlaces.filter(p => p.city === selectedProvince).length === 0 ? (
                    <div className="bg-black/40 rounded-xl p-8 text-center border border-white/5 shadow-inner">
                      <p className="text-slate-500 text-sm mb-4">Bu koordinat için aktif bir veri bulunamadı.</p>
                      <button onClick={() => setActiveTab('add')} className="text-blue-400 font-bold text-xs uppercase tracking-wider hover:text-blue-300 transition-colors border border-blue-500/30 px-4 py-2 rounded-lg bg-blue-500/10">Sisteme Giriş Yap</button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {countryPlaces.filter(p => p.city === selectedProvince).map((place, idx) => (
                        <div key={idx} className="bg-gradient-to-br from-slate-800 to-black rounded-xl border border-white/10 p-5 flex flex-col gap-3 relative shadow-2xl">
                          <div className="absolute top-5 right-5 w-4 h-4 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.2)] border-2 border-slate-900" style={{ backgroundColor: place.color }}></div>
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            {place.city}
                          </h3>
                          {place.note && (
                            <p className="text-slate-300 text-sm mt-1 bg-black/60 p-4 rounded-xl border border-white/5 shadow-inner leading-relaxed">{place.note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ADD MODE */}
            {activeTab === 'add' && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-xl flex items-start gap-4 shadow-inner">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <Lock className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <h4 className="text-blue-400 font-bold text-xs uppercase tracking-wider">Geliştirici Şifresi ("test")</h4>
                    <p className="text-xs text-blue-200 mt-1 leading-relaxed opacity-80">Bu lokasyonu sisteme işlemek ve renklendirmek kod korumalıdır.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Erişim Şifresi <span className="text-rose-500">*</span></label>
                  <input 
                    type="password" 
                    required
                    className="w-full p-4 bg-black/50 border border-white/10 text-white rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Şifre (test)"
                  />
                </div>

                <hr className="border-white/5 my-1" />

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Durum Notu</label>
                  <textarea 
                    rows={4}
                    className="w-full p-4 bg-black/50 border border-white/10 text-white rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 resize-none"
                    value={formData.note}
                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                    placeholder="Görev/Gezi detayları..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">Harita Boyama Rengi <span className="text-rose-500">*</span></label>
                  <div className="flex gap-4 bg-black/40 p-4 rounded-xl border border-white/5 justify-center shadow-inner">
                    {PASTEL_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${formData.color === color ? 'ring-4 ring-white/50 scale-125 shadow-[0_0_20px_rgba(255,255,255,0.2)] z-10' : 'ring-2 ring-transparent opacity-60 hover:opacity-100 hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({...formData, color})}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Saha Görseli (Opsiyonel)</label>
                  <div className="border border-dashed border-white/20 bg-black/30 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-black/50 hover:border-blue-500/50 transition-all group">
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden" 
                      id="imageUpload"
                      onChange={(e) => setFormData({...formData, file: e.target.files?.[0] || null})}
                    />
                    <label htmlFor="imageUpload" className="cursor-pointer flex flex-col items-center w-full">
                      <div className="bg-white/5 p-4 rounded-full mb-3 group-hover:bg-blue-500/10 transition-colors">
                        <ImageIcon className="text-slate-500 group-hover:text-blue-400" size={28} />
                      </div>
                      <span className="text-xs font-bold text-slate-500 group-hover:text-slate-300 text-center uppercase tracking-wide">
                        {formData.file ? formData.file.name : 'Dosya Seç (Kolaj İçin Gerekli)'}
                      </span>
                    </label>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full mt-4 p-4 rounded-xl bg-blue-600 text-white font-extrabold text-sm uppercase tracking-widest hover:bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all flex justify-center items-center gap-3"
                >
                  Sisteme İşle
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
