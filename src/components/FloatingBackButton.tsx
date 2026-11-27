import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';

interface FloatingBackButtonProps {
  appLanguage?: AppLanguage;
  stepCount: number;
  onClick: () => void;
  visible?: boolean;
}

export default function FloatingBackButton({
  appLanguage = 'ar',
  stepCount,
  onClick,
  visible = true,
}: FloatingBackButtonProps) {
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  const isRtl = langInfo.dir === 'rtl';

  // Persistent position
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('yawmiyati_back_btn_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (_) {}
    return { x: 16, y: 70 };
  });

  const isDraggingRef = useRef(false);
  const startPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startElementPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedSignificantlyRef = useRef(false);

  const clampPosition = (x: number, y: number) => {
    const btnW = 56;
    const btnH = 50;
    const winW = typeof window !== 'undefined' ? window.innerWidth : 360;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 640;
    const clampedX = Math.min(Math.max(8, x), winW - btnW - 8);
    const clampedY = Math.min(Math.max(16, y), winH - btnH - 16);
    return { x: clampedX, y: clampedY };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    hasMovedSignificantlyRef.current = false;
    startPointerPos.current = { x: e.clientX, y: e.clientY };
    startElementPos.current = { ...position };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startPointerPos.current.x;
    const dy = e.clientY - startPointerPos.current.y;
    if (Math.hypot(dx, dy) > 6) {
      hasMovedSignificantlyRef.current = true;
    }
    const newPos = clampPosition(startElementPos.current.x + dx, startElementPos.current.y + dy);
    setPosition(newPos);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    try {
      localStorage.setItem('yawmiyati_back_btn_pos', JSON.stringify(position));
    } catch (_) {}

    if (!hasMovedSignificantlyRef.current) {
      onClick();
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => clampPosition(prev.x, prev.y));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999, // Highest portal/root z-index layer
        touchAction: 'none',
      }}
      dir={langInfo.dir}
      className="select-none"
    >
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex items-center space-x-1.5 space-x-reverse px-3 py-2 bg-[#4E685B] text-white hover:bg-[#3F5449] border-2 border-[#E5E1D4] rounded-full shadow-2xl transition-all active:scale-95 cursor-grab active:cursor-grabbing group min-h-[44px]"
        title={t('nav.back_mobile_title') || (isRtl ? 'رجوع' : 'Back')}
        aria-label={t('nav.back_mobile_title') || (isRtl ? 'رجوع' : 'Back')}
      >
        <ArrowRight className={`w-5 h-5 text-[#FEFAE0] group-hover:-translate-x-0.5 transition-transform shrink-0 ${isRtl ? '' : 'rotate-180'}`} />
        {stepCount > 0 && (
          <span className="text-[11px] bg-white text-[#4E685B] px-2 py-0.5 rounded-full font-black leading-none shadow-xs">
            {stepCount}
          </span>
        )}
      </button>
    </div>
  );
}
