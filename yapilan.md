# 🎉 Tamamlanan Özellikler ve Modüller (v0.2 İtibariyle)

*Bu doküman, projenin en başından v0.2 sürümünün yayınlandığı ana kadar yapılmış, çalışan ve sunucuya deploy edilmiş tüm modülleri içerir.*

### Sistem Altyapısı
- [x] Docker + Docker Compose ortamının (Backend uvicorn + Frontend nginx) kurulması.
- [x] FastAPI tabanlı backend sisteminin yapılandırılması.
- [x] Vite ile Frontend react typescript projesinin temellerinin atılması.
- [x] JWT standartlarına göre güvenli kimlik doğrulamanın (AuthContext, Login, Register) oluşturulması.

### Veri ve Güvenlik Altyapısı
- [x] SlowAPI ile sunucuya Rate Limit koruması getirilmesi.
- [x] Kullanıcıların Base64 formatında büyük boyutlu fotoğraflarını sunucuya kaydedebileceği endpoint optimizasyonları.
- [x] LocalForage entegre edilerek `places` (gezilen yerler db'si) local tarayıcı belleğinde cache'lenerek sunucuya hiç düşmeden açılış hızının `0ms` civarına tasarlanması.

### UX (Kullanıcı Deneyimi) & UI Geliştirmeleri
- [x] **Light / Dark Mode:** Komple tüm işletim sisteminin ve bizzat harita paftalarının (TileLayer) bu metoda duyarlı olması ve geçişi.
- [x] **Türkçe/İngilizce i18n:** "I" ve "İ" harfi bug'ını bile CSS standardında bypass eden dilli (dynamic lang) dil sistemi entegrasyonu.
- [x] **Glassmorphism Tasarım:** Lüks ve şeffaf geçişli arka plan blurlu yapıların her yere adapte edilmesi.
- [x] **Ana Ekrana Ekle (PWA):** Ziyaretçileri yakalayan akıllı Prompt banner'ları. Desteklenmeyen iOS'larda bilgi verilmesi, desteklenen cihazlarda tek tıkla cihaz içine "Natif" uygulama olarak web uygulamasının yüklenmesi. Ayrı yeten Ayarlar menüsüne indirme butonunun eklenmesi.
- [x] Masaüstüne özel, telefonlarda çıkmayan, sağ üstte yüzen şık navigasyon barları eklenmesi.

### Harita ve Fonksiyonlar
- [x] Dünya / Ülke / İl ağaçlandırılmasının yapılması (`/geo` CDN'leri kullanılarak detaylı `geoJson` poligon eşleştirmesi).
- [x] Haritada serbest PİN atma, renk belirleme, fotoğraf yükleme özellikleri.
- [x] **Kolaj (Pattern) Görünümü:** Gezilen ülkelerde, o ülkeye ait fotoğrafların CSS grid metodu (xMidYMin zeka kırpması) ile SVG kütüphanesinden haritanın o illeri ve ülkelerine kaplama (texture) olarak basılması.
- [x] Gezilen "İllerin" ülke katmanının karanlık silüetini kapatıp aydınlanması.
- [x] **Haritanın Çıktısının Alınması (Print Export):** Basıldığı anda kullanıcının gittiği tüm verileri hesaplayıp harita kadrajını harika bir sınır içine sıkıştırıp (flyToBounds) loading süresi vererek A4 uyumlu çıktı için window.print API'yi açması. 
- [x] **Zaman Çizelgesi:** Eklenen noktaların tarihli fusion benzeri yatay timeline üzerinde okunması, sol/sağ step by step butonlarıyla tıklandığında hem baloncuk oluşumu hem de otomatik olarak o lokasyona haritanın odaklanması (Zoom focus triggering).

### Ek Özellikler
- [x] **Gidilecekler Listesi (Bucket List):** Herhangi bir serbest yeri haritadan dahi seçmeden kutucuklara Manuel (Elle) adıyla yazıp ekleyebilme.
- [x] **İstatistik Çizelgesi:** Kullanıcının dünyada kaç ilke, kaç şehir veya % kaçlık dünyayı fethettiğini anlatan oran tabloları.
- [x] **Hesap Menüsü:** Onboarding, Profile (Ortak/Partner map mantığı - İki eşin aynı anda haritalarını üst üste bindirmesi).
