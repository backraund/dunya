import { X, Sun, Moon, LogOut, User, Camera, Shield, Languages } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useI18n } from './i18n';

interface Props {
  onClose: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

export default function SettingsModal({ onClose, darkMode, onToggleDark }: Props) {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();

  const handleExport = () => {
    onClose();
    setTimeout(() => window.print(), 300);
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-slate-950 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl w-full sm:max-w-md flex flex-col overflow-hidden"
        style={{ maxHeight: '90dvh', paddingBottom: 'max(0px,env(safe-area-inset-bottom))' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-5 flex justify-between items-center border-b border-white/5">
          <h2 className="text-white font-bold">{t.settings}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Account Section */}
          <div className="p-5 border-b border-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
              <User size={11} /> {t.account}
            </p>
            <div className="bg-gradient-to-br from-blue-900/30 to-slate-900/50 rounded-2xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black">
                  {user?.display_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-bold">{user?.display_name}</p>
                  <p className="text-slate-400 text-sm">@{user?.username}</p>
                  <p className="text-slate-600 text-xs">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="p-5 border-b border-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
              {darkMode ? <Moon size={11} /> : <Sun size={11} />} {t.appearance}
            </p>

            {/* Dark/Light Mode */}
            <button
              onClick={onToggleDark}
              className="w-full flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:bg-white/5 transition-colors mb-3"
            >
              <div className="flex items-center gap-3">
                {darkMode ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-amber-400" />}
                <div className="text-left">
                  <p className="text-white text-sm font-semibold">{darkMode ? t.darkMode : t.lightMode}</p>
                  <p className="text-slate-500 text-xs">{t.mapTheme}</p>
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${darkMode ? 'bg-blue-600' : 'bg-amber-500'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </button>

            {/* Language */}
            <div className="w-full flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <Languages size={18} className="text-emerald-400" />
                <div>
                  <p className="text-white text-sm font-semibold">{t.language}</p>
                  <p className="text-slate-500 text-xs">{t.appLang}</p>
                </div>
              </div>
              <div className="flex gap-1 bg-black/50 rounded-xl p-1">
                {(['tr', 'en'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${lang === l ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Data Section */}
          <div className="p-5 border-b border-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
              <Shield size={11} /> {t.dataPrivacy}
            </p>
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 p-4 bg-black/40 border border-white/5 rounded-2xl hover:bg-white/5 transition-colors text-left"
            >
              <Camera size={18} className="text-purple-400" />
              <div>
                <p className="text-white text-sm font-semibold">{t.exportMap}</p>
                <p className="text-slate-500 text-xs">{t.exportToPng}</p>
              </div>
            </button>
          </div>

          {/* Danger Zone */}
          <div className="p-5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors text-sm font-bold uppercase tracking-widest min-h-[52px]"
            >
              <LogOut size={16} /> {t.logout}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
