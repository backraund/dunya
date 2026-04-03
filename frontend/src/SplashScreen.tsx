import { Globe } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999]"
      style={{ minHeight: '100dvh' }}
    >
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: 'linear-gradient(rgba(56,189,248,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.5) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 bg-blue-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-6 animate-pulse">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 rounded-3xl blur-2xl" />
          <div className="relative bg-blue-500/10 border border-blue-500/30 p-6 rounded-3xl">
            <Globe size={56} className="text-blue-400" />
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-black text-white tracking-tight">Dünyam</h1>
          <p className="text-slate-500 text-xs uppercase tracking-[0.3em] mt-2">Yükleniyor...</p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 bg-blue-500 rounded-full"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-10px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
