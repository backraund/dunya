import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider, useAuth } from './AuthContext.tsx'
import { I18nProvider } from './i18n.tsx'
import LoginPage from './LoginPage.tsx'
import SplashScreen from './SplashScreen.tsx'
import PublicMapPage from './PublicMapPage.tsx'

// Auth kontrolünü burada yapıyoruz — App hiçbir zaman conditional render etmez
// Böylece Leaflet her zaman fresh mount olur, siyah ekran problemi olmaz
function RootApp() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const pub = path.match(/^\/public\/([^/]+)$/);
  if (pub) return <PublicMapPage username={decodeURIComponent(pub[1])} />;

  const { loading, token } = useAuth();
  if (loading) return <SplashScreen />;
  if (!token) return <LoginPage />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <AuthProvider>
        <RootApp />
      </AuthProvider>
    </I18nProvider>
  </React.StrictMode>,
)
