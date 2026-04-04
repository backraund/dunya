# Dünyam - Kişisel Seyahat Haritası ve Planlayıcı (v0.2)

Dünyam, kullanıcıların ziyaret ettikleri şehirleri/ülkeleri görsel olarak harita üzerinde pinleyebildikleri, yükledikleri fotoğraflarla dinamik kolajlar yaratabildikleri ve "Gidilecekler Listesi" ile hayallerini planlayabildikleri modern, güvenli ve kişisel bir web tabanlı izleme uygulamasıdır. 

Modern teknolojilerle (React, Tailwind CSS, Leaflet) tamamen PWA (Progressive Web App) uyumlu kodlanmış olup, estetik ve premium bir his verecek şekilde tasarlanmıştır. Cihazlara "Mobil Uygulama" gibi indirilebilir.

## 🚀 Öne Çıkan Özellikler (v0.2)

- **Harita Görselleştirme (Photo Map):** Kullanıcıların seyahatlerinde çektikleri ve haritaya işledikleri fotoğrafları, doğrudan harita üstündeki ülke/il poligonlarının içinin dinamik şekilde doldurulması (grid collage pattern).
- **Ekstrem Performans ve Çevrimdışı Mod:** LocalForage IndexedDB önbellekleme mimarisi ile veri bağımlılığını sıfıra indirir, anında yüklenir ve PWA desteği ile natif his yaşatır.
- **Güvenlik & JWT:** FastAPI asenkron Python backend sunucusuyla desteklenen kimlik doğrulama, bcrypt şifrelemeyle ve Rate Limiter (SlowAPI) ile korunmuş end-point mimarisidir.
- **Kişisel Paneller:** Puan tabloları, ülke/il detaylı timeline (zaman çizelgesi), partner/çift hesap entegrasyonuna hazır mimari.
- **"Haritanı Kaydet" Özelliği:** Sistemin bütün gezilmiş noktaları algılaması, en iyi kamera/yakınlaştırma kadrajını simüle formüllerle tasarlayıp anında PDF veya PNG çıktısı verebilme yeteneği.
- **Gece/Gündüz Temaları:** Kullanıcılar sadece menülerde değil, harita fayanslarında dahi aydınlık (Carto Light) ve karanlık mod (Carto Dark) geçişlerini izlerler.
- **Akıllı Dil Entegrasyonu (i18n):** Türkçe karakter duyarlı, esnek, çift dilli global standart yapı. 

## 🛠 Kullanılan Teknolojiler

**Frontend:**
- Vite + React + TypeScript
- TailwindCSS (Gece/gündüz destekli, cam tasarımlı (glassmorphism) lüks UI)
- React Leaflet / Leaflet (CartoCDN base mapleri)
- LocalForage (Offline/cache DB)

**Backend:**
- FastAPI (Python 3) + SQLAlchemy
- SQLite / Pydantic V2 / Passlib (bcrypt)
- SlowAPI (DDoS & Brute Force Koruması)

**Deployment:**
- Docker (Front+Back nginx ile compose)
- Progressive Web Application (PWA - Service Workers manifest destekli)

---
*Proje gelişime açık olup v0.3 aşamalarına doğru evrilmektedir. Detaylar ve yol haritası için sistemdeki `yapilan.md` ve `yapilacak.md` dokümanlarına göz atın.*
