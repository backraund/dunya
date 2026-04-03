import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useI18n } from './i18n';

const slides = [
  {
    img: '/onboarding1.png',
    titleKey: 'onboarding1Title' as const,
    descKey: 'onboarding1Desc' as const,
    accent: '#3b82f6',
  },
  {
    img: '/onboarding2.png',
    titleKey: 'onboarding2Title' as const,
    descKey: 'onboarding2Desc' as const,
    accent: '#10b981',
  },
  {
    img: '/onboarding3.png',
    titleKey: 'onboarding3Title' as const,
    descKey: 'onboarding3Desc' as const,
    accent: '#ec4899',
  },
  {
    img: null,
    titleKey: 'onboarding4Title' as const,
    descKey: 'onboarding4Desc' as const,
    accent: '#f59e0b',
  },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const { t } = useI18n();
  const slide = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col"
      style={{ minHeight: '100dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Skip button */}
      <div className="absolute top-0 right-0 p-5 z-10"
        style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
        <button onClick={onComplete} className="text-slate-500 hover:text-white text-sm font-semibold uppercase tracking-wider transition-colors flex items-center gap-1">
          {t.skip} <X size={14} />
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8 relative">
        {/* Background accent */}
        <div
          className="absolute inset-0 opacity-5 transition-all duration-700"
          style={{ background: `radial-gradient(circle at center, ${slide.accent}, transparent 70%)` }}
        />

        {/* Illustration */}
        <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
          {slide.img ? (
            <img
              src={slide.img}
              alt=""
              className="w-full h-full object-contain rounded-3xl"
              style={{ filter: 'drop-shadow(0 0 40px rgba(59,130,246,0.15))' }}
            />
          ) : (
            /* Last slide: animated pin emoji */
            <div className="flex flex-col items-center gap-4">
              <div className="text-9xl animate-bounce">📍</div>
              <div className="text-6xl">🗺️</div>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="text-center max-w-xs">
          <h2 className="text-3xl font-black text-white leading-tight mb-3">
            {t[slide.titleKey]}
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            {t[slide.descKey]}
          </p>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="p-8 flex flex-col gap-5">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="transition-all duration-300 rounded-full"
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                backgroundColor: i === step ? slide.accent : '#374151',
              }}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
          className="w-full py-4 rounded-2xl text-white font-extrabold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 min-h-[56px] shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${slide.accent}, ${slide.accent}aa)`,
            boxShadow: `0 0 40px ${slide.accent}30`,
          }}
        >
          {isLast ? t.letsStart : t.next}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
