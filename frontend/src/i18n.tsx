import { createContext, useContext, useState } from 'react';

type Lang = 'tr' | 'en';

const translations = {
  tr: {
    appName: 'Dünyam',
    appSubtitle: 'Kişisel Seyahat Haritası',
    login: 'Giriş Yap',
    register: 'Kayıt Ol',
    logout: 'Çıkış Yap',
    username: 'Kullanıcı Adı',
    email: 'E-posta',
    password: 'Şifre',
    displayName: 'İsim Soyisim',
    enterMap: 'Haritama Gir',
    createAccount: 'Hesap Oluştur',
    profile: 'Profil',
    settings: 'Ayarlar',
    stats: 'İstatistikler',
    timeline: 'Zaman Çizelgesi',
    bucketList: 'Gidilecekler',
    notifications: 'Bildirimler',
    partner: 'Partner',
    countries: 'Ülke',
    cities: 'Şehir',
    photos: 'Fotoğraf',
    worldPct: 'Dünyayı Keşfettin',
    addToMap: 'Haritaya İşle',
    visitedPlaces: 'Gezilen Yerler',
    pinIt: 'Pini Zapt Et',
    close: 'Kapat',
    back: 'Geri',
    save: 'Kaydet',
    delete: 'Sil',
    cancel: 'İptal',
    darkMode: 'Karanlık Mod',
    lightMode: 'Aydınlık Mod',
    language: 'Dil',
    note: 'Not',
    visitDate: 'Ziyaret Tarihi',
    export: 'Dışa Aktar',
    exportMap: 'Haritayı Kaydet',
    shareMap: 'Haritayı Paylaş',
    addBucket: 'Listeye Ekle',
    markVisited: 'Ziyaret Ettim',
    noBucketItems: 'Henüz gidilecek yer eklemedin',
    noPlaces: 'Henüz hiç yer işaretlemedin',
    noNotifications: 'Yeni bildirim yok',
    welcomeBack: 'Tekrar Hoş Geldin',
    partnerMerge: 'Haritaları Birleştir',
    sendRequest: 'İstek Gönder',
    acceptRequest: 'Kabul Et',
    unmatch: 'Eşleşmeyi Kaldır',
    onboarding1Title: 'Dünyana Hoş Geldin',
    onboarding1Desc: 'Ziyaret ettiğin her şehri, her ülkeyi harita üzerinde işaretle ve takip et.',
    onboarding2Title: 'Anılarını Kaydet',
    onboarding2Desc: 'Fotoğraf ekle, notlar yaz. Her ziyaret için kendi arşivini oluştur.',
    onboarding3Title: 'Birlikte Keşfet',
    onboarding3Desc: 'Partner veya arkadaşınla haritaları birleştir. Ortak seyahat geçmişinizi görün.',
    onboarding4Title: 'İlk Pinini Ekle',
    onboarding4Desc: 'Şu an nerede yaşıyorsun? Haritada şehrine tıkla ve ilk pinini kaydet!',
    letsStart: 'Başlayalım!',
    skip: 'Geç',
    next: 'İleri',
    totalPins: 'Toplam Pin',
    worldProgress: 'Dünya İlerleme',
    visitedSummary: 'Dünyadaki 195 ülkeden {count} tanesini gezdin',
    account: 'Hesap',
    appearance: 'Görünüm',
    mapTheme: 'Harita ve arayüz teması',
    appLang: 'Uygulama dili',
    dataPrivacy: 'Veri & Gizlilik',
    exportToPng: 'Haritanı PNG olarak indir',
  },
  en: {
    appName: 'Dünyam',
    appSubtitle: 'Personal Travel Map',
    login: 'Log In',
    register: 'Sign Up',
    logout: 'Log Out',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    displayName: 'Full Name',
    enterMap: 'Open My Map',
    createAccount: 'Create Account',
    profile: 'Profile',
    settings: 'Settings',
    stats: 'Statistics',
    timeline: 'Timeline',
    bucketList: 'Bucket List',
    notifications: 'Notifications',
    partner: 'Partner',
    countries: 'Countries',
    cities: 'Cities',
    photos: 'Photos',
    worldPct: 'World Explored',
    addToMap: 'Pin to Map',
    visitedPlaces: 'Visited Places',
    pinIt: 'Pin It',
    close: 'Close',
    back: 'Back',
    save: 'Save',
    delete: 'Delete',
    cancel: 'Cancel',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    language: 'Language',
    note: 'Note',
    visitDate: 'Visit Date',
    export: 'Export',
    exportMap: 'Save Map',
    shareMap: 'Share Map',
    addBucket: 'Add to List',
    markVisited: 'Mark as Visited',
    noBucketItems: "No bucket list items yet",
    noPlaces: "You haven't pinned any places yet",
    noNotifications: 'No new notifications',
    welcomeBack: 'Welcome Back',
    partnerMerge: 'Merge Maps',
    sendRequest: 'Send Request',
    acceptRequest: 'Accept',
    unmatch: 'Remove Match',
    onboarding1Title: 'Welcome to Your World',
    onboarding1Desc: 'Pin every city and country you visit on your personal map.',
    onboarding2Title: 'Save Your Memories',
    onboarding2Desc: 'Add photos and notes. Create your own archive for every visit.',
    onboarding3Title: 'Explore Together',
    onboarding3Desc: 'Merge maps with your partner or friends. See your shared travel history.',
    onboarding4Title: 'Add Your First Pin',
    onboarding4Desc: 'Where do you live right now? Click your city on the map and save your first pin!',
    letsStart: "Let's Start!",
    skip: 'Skip',
    next: 'Next',
    totalPins: 'Total Pins',
    worldProgress: 'World Progress',
    visitedSummary: 'You have visited {count} out of 195 countries in the world',
    account: 'Account',
    appearance: 'Appearance',
    mapTheme: 'Map and interface theme',
    appLang: 'App language',
    dataPrivacy: 'Data & Privacy',
    exportToPng: 'Download your map as PNG',
  },
};

interface I18nContextType {
  lang: Lang;
  t: typeof translations.tr;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nContextType>(null!);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem('dunya_lang') as Lang) || 'tr'
  );

  const setLang = (l: Lang) => {
    localStorage.setItem('dunya_lang', l);
    setLangState(l);
  };

  return (
    <I18nContext.Provider value={{ lang, t: translations[lang], setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
