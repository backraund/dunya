# 🚀 Gelecek Planlar ve Geliştirmeler (v0.3 ve Sonrası - Yapılacaklar)

Bu belge, v0.2 sürümü sonrasında projeye eklenecek, iş değeri yüksek, teknik donanımlı ve "nice to have" statüsünde olan görevleri barındırır.

### Temel Güvenlik ve Kimlik
- [ ] **E-Posta Doğrulaması:** Register (kayıt) olunduktan sonra spam/bot kullanıcıları engellemek için sisteme SendGrid veya SMTP relay entegre edilerek `Verify Email` logic kurulması. Doğrulanmamış hesapların pasife çekilmesi.
- [ ] **Şifremi Unuttum:** Kullanıcıların e-posta adreslerine Password Reset (JWT token bazlı expiring link) yollanması ve kurtarma mekanizması hazırlanması.

### Veritabanı ve Optimizasyon
- [ ] **S3 / R2 Resim Deposu Entegrasyonu:** Şu an fotoğraflar Base64 olarak DB'de tutulup CDN/cache kullanılmadan aktarılıyor. Bunun bir Object Storage (AWS S3, Cloudflare R2 vb.) üzerine URL olarak çıkartılıp sistemin çok daha hafif (lightweight) tutulmasının sağlanması.

### UI/UX ve Etkileşim İyileştirmeleri (Planlanan Modüller)
- [ ] **Dinamik Şehir Aksiyon Modalı:** Bir şehre tıklandığında eski "Pini Zapt Et" sekmesi yerine bir yol ayrımı (Popup) çıkmalı:
  - 👉 **Kazı! (Burayı Kaz / Ziyaret Edildi)**
  - 🎯 **Buraya Gitmek İstiyorum (Gidilecekler Listesine Ekle)**
- [ ] **"Kazı!" Seçeneği Mantığı:**
  - "Resim ekler misin? Yoksa sadece haritayı renkle mi boyarsın?" paneli belirecek.
  - Anı veya durumu anlatan bir "Not" alanı çıkacak.
- [ ] **"Buraya Gitmek İstiyorum" Seçeneği Mantığı:**
  - "Aklında burada çekilmek için pozlar var mı? Varsa ekle" (Referans fotoğraf ekleme alanı - Ancak haritada veya kolajda görünmeyecek, sadece liste detayında referans olarak saklanacak).
  - Hedef/Planlar için "Not" ekleme kısmı belirecek.
- [ ] **Duygu/Durum Emoji Barı:** Kazı veya Gitmek İstiyorum fark etmeksizin; her iki ekranın "Not" yazma alanlarına basit 6 seçenekli zorunlu olmayan bir Emoji Seçici (Mood) barı eklenecek:
  - 😍 (Kalpli göz), 😂 (Gülmekten ağlayan), 😡 (Kızgın yüz), ✅ (Tik işareti), ❌ (Çarpı işareti), 😐 (Meeh / Nötr yüz)

### Sosyal ve Yeni Fonksiyonlar
- [ ] **Public Profil:** Belirli bir Link formatında (`/public/{username}`) insanların siteye girmeden ve giriş yapmadan doğrudan sadece haritayla izleyebileceği bir paylaşım paneli oluşturulması! (Oluşturduğum haritayı arkadaşıma veya Instagram biyografime asmalıyım).
- [ ] **Bildirim Sistemi (Gerçek Mimaride):** Yüzeysel duran Notifications barının WebSockets veya SSE (Server-sent events) ile partner hesaba konum atıldığında eşe `PING` yollaması.
- [ ] **Premium Limitler:** Uygulamayı ürüne dökme ihtimalindeki abonelik modelleri için free tier user'a "30 Fotoğraf, 50 pin limiti" konulması.

### Teknik ve Lint Borçları (Technical Debt)
- [ ] Frontend React uygulaması içerisindeki uyarıların (kullanılmayan değişkenler) refactoring ile toparlanması (`App.tsx` içerisindeki city null errorları vb).
- [ ] Backend tarafında tam manasıyla `PyTest` ile test logic'in bağlanması ve Continuous Integration süreçlerine oturtulması.
- [ ] Tüm dünya genelinde Türkçe dil eşleşmesi bulunmayan bazı küçük Afrika/Asya il sınır eşleşmelerindeki "undefined" adlarının veritabaından manuel Map'lenmesi. 
