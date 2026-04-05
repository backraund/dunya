# 🛠 Dünyam Platformu Test Senaryoları (v0.2 Tester Checklist)

Eğer sistemi test edecek bir QA uzmanı veya Geliştiriciysen bu dokümandaki adımları harfiyen kendi cihazında uygulamalı ve beklenen sonuçlara (Expected Results) ulaştığından emin olmalısın.

## Senaryo 1: Kullanıcı Kaydı & Giriş ve Prensip Algılayıcısı
*   **Adım:** Ana sayfaya gidin, yeni hesap oluştur sekmesini açın.
*   **Aksiyon:** Form boşken veya eksikken kayıt olmayı deneyin. Kayıt esnasında isim yerine sadece küçük harf, boşluk falan deneyin. E-mail hatalı format atın.
*   **Adım:** Hesabı başarıyla oluşturun ve sisteme girin.
*   **Beklenen:** Kayıt ekranında "Kullanıcı adı" otomatik küçük harfe evrilmeli, mobil cihazlarda ilk harfi büyüterek başlatmamalı (`autoCapitalize off`). Başarılı girişte doğrudan Onboarding (Kurulum) ekranı gelip LocalForage `dunya_onboarded` bayrağını tetiklemeli.

## Senaryo 2: Haritada Pin Zapt Etmek & Görseller
*   **Adım:** Haritada rastgele, gidilmemiş bir ülkeye örneğin *Brezilya* ülkesine tıklanmalı.
*   **Beklenen:** Tıklanan ülkenin hudutlarına kamera hızla zoom yapmalı (uçarak) ve ardından alt sistem o ülkenin **İllerini / Eyaletlerini** siyah çizgilerle çizmelidir.
*   **Adım:** Amazon eyaletine tıklayın. Ardından "Pini Zapt Et" sekmesine gidin, büyük formatlı, içinde net yüzler olan dikey bir fotoğraf (kendi fotonuzu) ekleyin. "Sisteme İşle" diyin.
*   **Adım:** Ardından aynı şekilde bir de yan eyalet olan "Para" eyaletine gidip oraya da kocaman bir resim atın.
*   **Beklenen:** Ayarlardan "Fotoğraf Kolaj Görünümü" tuşu aktifken sağ üst menüden **"Geri Çık"** *(Haritayı dünyadan izleme görünümüne)* geri inilmeli.
*   **Ana Test:** Brezilya ülkesi üzerinde sadece seçili resimlerden oluşan **2 sütunlu kusursuz bir kolaj** çıkmalı. Grid yüz algoritması nedeniyle resimdeki boşluk göbek ortası değil direkt **yüz hatlarınız (xMidYMin)** merkeze alınmış olmalı!

## Senaryo 3: PWA Kurulum & Ana Ekrana Ekleme Deneyimi
*   **Adım 1 (Android/Chrome Mobil):** Chrome üzerinden web uygulamanıza gidin.
*   **Beklenen:** Ekranın yukarısından aşağıya slide animasyonu ile mavi ve hoş bir **"Uygulama Olarak Yükle"** banner'ı sarkmalı. Üzerindeki "Yükle" veya Ayarlar'daki menüden basılınca sistem direkt telefonun masaüstüne bunu Android Native App gibi mühürlemeli.
*   **Adım 2 (iOS / Safari):** Uygulamayı IPhone Safari'de açıp test edin.
*   **Beklenen:** Butonda Yükle yerine **"Nasıl?"** yazmalı veya yükle komutu tıklandığında "Lütfen Safari Paylaş menüsünden -> Ana Ekrana Ekle butonunu tetikleyin" ibaresini alert ile döndürmeli. (Apple Güvence testleri bypass edilmemeli).

## Senaryo 4: Zaman Çizelgesi ve Harita Korelasyonu
*   **Adım:** PWA Toolbardan (Pc'deyseniz sağ üstteki dikey menüden, mobildeyseniz dip navigasyondan) **Saat** işaretine (Timeline/Zaman Çizelgesi) tıklayın.
*   **Adım:** Panel alttan kayarak açılır. Birden fazla gittiğiniz yerlerin okları vardır. Klavyedeki Sağ ok tık tuşuna veya paneldeki **( > ) Next Step** butonuna tıklayın.
*   **Beklenen:** Sistem panelde yandaki hücreyi "Mavi baloncuk" efektiyle patlatıp büyütür. Otomatik olarak da arkadaki şeffaf dünyadan o konuma (örneğin Fransa) uçar.

## Senaryo 5: Gidilecekler (Bucket List) Çakışma Testleri
*   **Adım:** Dünyada Türkiye'de Eskişehir iline tıklayın. Tam il datasını görürken zoom-out yapıp geri çekilin çıkın.
*   **Adım:** Avusturya diyarına, daha il/provinces yüklenmemişken basar basmaz veya hiç basmadan üstüne **Bucket List** modülüne tıklayın.
*   **Beklenen:** İl bilgisi "Eskişehir" olarak takılı KATMADIĞI test edilmelidir. Kullanıcı dilerse bomboş bir kutucuğa serbest elle "Hollanda", "Utrecht" yazayıp sisteme "Harita referansı olmadan da" planı atabilmelidir.

## Senaryo 6: PDF / Haritayı Görüntü Olarak Alma (Export Engine)
*   **Adım:** Menü -> Ayarlar veya Ayarlar alt menüsünden -> **Dışa Aktar** basın.
*   **Beklenen:** Kapkaranlık bir ekran çıkıp `Harita Hazırlanıyor...` animasyonu dönmelidir. Arka planda siz Rusya'da da, Avustralya'da da, İngiltere'de de pini zaptetseniz sistem bunların en uç koordinatlarını **Kuşbakışı Kadraj Alarak** kendi içindeki Bounds formulüyle sınırlandırır ve zoom'lar. `1.5 - 2` saniyelik bu loading'in hemen bitiminde tarayıcının yerli Print Screen (A4 mode PDF exporter) sekmesi haritayı kesik vermeksizin önüze sunar.

## Senaryo 7: E-posta doğrulama ve şifre sıfırlama
*   **SMTP yapılandırması:** Backend `SMTP_HOST` vb. ayarlı değilse yeni kayıtlar otomatik doğrulanır; SMTP açıkken kayıt sonrası e-postadaki bağlantı veya giriş sonrası üst banttaki «Yeniden gönder» ile doğrulama test edilmelidir.
*   **Doğrulanmamış:** Üst bantta uyarı görünmeli; pin / bucket ekleme gibi yazma API’leri 403 dönmeli (doğrulama sonrası açılır).
*   **Şifremi unuttum:** Giriş ekranında akış, e-postaya düşen (veya SMTP yoksa konsol logundaki) reset linki + yeni şifre formu ile tamamlanmalıdır.

## Senaryo 8: Şehir modalı — Kazı / Gidilecekler
*   **Adım:** Gezilmemiş bir ile tıklayın.
*   **Beklenen:** Önce «Kazı!» ve «Buraya gitmek istiyorum» seçimi çıkmalı. Kazı’da «Sadece boya» / «Fotoğraf ekle», duygu çubuğu ve not alanı kullanılabilmeli; fotoğraf dosyası multipart olarak MinIO’ya gidebilmeli. Gidilecekler’de referans fotoğraf (isteğe bağlı), not ve duygu ile liste API’sine eklenmeli; referans haritada görünmemeli, bucket listesinde görünmeli.

## Senaryo 9: Herkese açık harita
*   **Adım:** Profil modalında «Haritamı herkese aç» açıkken verilen `/public/{kullanıcıadı}` adresini gizli pencerede açın (giriş yapmadan).
*   **Beklenen:** Meta ve yerler API’si 200; ziyaret edilen ülkeler haritada renklensin. Toggle kapalıyken 404 veya «gizli» mesajı.

## Senaryo 10: Partner canlı bildirim (SSE)
*   **Önkoşul:** İki hesap partner olmalı.
*   **Adım:** Biri haritaya yeni pin eklerken diğeri bildirim panelini açık tutsun.
*   **Beklenen:** Kısa gecikmeyle (yaklaşık 2 sn döngü) partnerin timeline olayı listeye düşebilmeli (`/api/events/partner-stream` + token).
