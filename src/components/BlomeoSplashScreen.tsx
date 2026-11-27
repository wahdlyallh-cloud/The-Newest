import React, { useRef } from 'react';

type BlomeoSplashScreenProps = {
  isExiting: boolean;
  onSkip: () => void;
};

/** Lightweight, CSS-timed brand animation; all artwork is inline SVG. */
export default function BlomeoSplashScreen({ isExiting, onSkip }: BlomeoSplashScreenProps) {
  const skipRequested = useRef(false);

  const requestSkip = () => {
    if (skipRequested.current) return;
    skipRequested.current = true;
    onSkip();
  };

  return (
    <div
      className={`blomeo-splash${isExiting ? ' blomeo-splash--exiting' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Skip Blomeo introduction"
      onClick={requestSkip}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          requestSkip();
        }
      }}
    >
      <svg className="blomeo-splash__contours" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="1.15">
          <path d="M-80 133C64 41 127 194 267 127S476 37 597 119s214 62 326-6 212-77 365 3" />
          <path d="M-74 161C68 68 136 218 278 153s207-83 321-3 211 67 325 1 220-73 362 4" />
          <path d="M-64 190C83 98 145 246 290 181s200-83 314-5 207 68 322 2 222-67 354 8" />
          <path d="M-82 570c145-88 211 65 352 1s209-84 324-5 208 67 323 1 217-67 364 8" />
          <path d="M-75 600c146-88 213 66 355 1s208-83 324-4 207 67 322 1 218-67 365 8" />
          <path d="M-66 630c146-87 215 67 358 2s207-82 323-3 205 66 321 0 219-66 366 9" />
          <path d="M95-70c79 142-44 229 24 358s58 213-1 328 12 199 79 260" />
          <path d="M124-70c77 142-43 230 26 360s59 211 0 326 13 199 79 260" />
          <path d="M1070-60c-75 145 46 226-22 359s-59 211 0 326-14 197-80 257" />
          <path d="M1098-60c-75 144 46 227-22 360s-58 210 1 325-13 198-79 257" />
        </g>
      </svg>
      <div className="blomeo-splash__mist" aria-hidden="true" />
      <div className="blomeo-splash__corner-glow blomeo-splash__corner-glow--top" aria-hidden="true" />
      <div className="blomeo-splash__corner-glow blomeo-splash__corner-glow--bottom" aria-hidden="true" />

      <div className="blomeo-splash__lockup" dir="ltr" aria-label="blomeo">
        <div className="blomeo-splash__icon" aria-hidden="true">
          <svg className="blomeo-splash__art" viewBox="0 0 180 190" fill="none">
            <defs>
              <radialGradient id="blomeo-brain-glow"><stop stopColor="#FFE7A5" /><stop offset=".48" stopColor="#F4B860" /><stop offset="1" stopColor="#D99843" stopOpacity=".12" /></radialGradient>
              <linearGradient id="blomeo-head" x1="52" y1="58" x2="124" y2="150" gradientUnits="userSpaceOnUse"><stop stopColor="#173426" /><stop offset="1" stopColor="#0C2017" /></linearGradient>
            </defs>
            <g className="blomeo-splash__waves" stroke="#F4B860" strokeWidth="2" strokeLinecap="round">
              <path d="M28 74c-8 8-8 21 0 29" /><path d="M17 65c-14 14-14 34 0 48" />
              <path d="M152 74c8 8 8 21 0 29" /><path d="M163 65c14 14 14 34 0 48" />
            </g>
            <circle className="blomeo-splash__seed" cx="90" cy="94" r="5" fill="#F4B860" />
            <g className="blomeo-splash__head">
              <path d="M91 35c-28 0-49 21-49 49v14c0 8 4 16 11 21l9 7 5 27c1 5 5 8 10 8h43c6 0 10-4 10-10v-16c11-8 18-22 18-38V84c0-28-22-49-49-49H91Z" fill="url(#blomeo-head)" />
              <path d="M120 134c9-7 15-18 15-31" stroke="#B9C9B6" strokeOpacity=".65" strokeWidth="2" strokeLinecap="round" />
              <path className="blomeo-splash__brain" d="M83 60c-9 0-15 7-15 15-7 2-10 12-5 18-3 8 2 16 10 17 4 8 14 8 18 2V68c-2-4-4-8-8-8Zm14 0c9 0 15 7 15 15 7 2 10 12 5 18 3 8-2 16-10 17-4 8-14 8-18 2V68c2-4 4-8 8-8Z" fill="url(#blomeo-brain-glow)" />
              <path d="M90 65v45M77 72c5 1 7 4 7 9m-13 8c5-1 8 1 10 5m22-22c-5 1-7 4-7 9m13 8c-5-1-8 1-10 5" stroke="#FFE7A5" strokeOpacity=".7" strokeWidth="1.4" strokeLinecap="round" />
            </g>
            <g className="blomeo-splash__botanical" stroke="#E3B45F" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M91 165c-3 8-4 15-2 22m0-8c-9-4-15-3-21 1m22-6c8-6 15-7 23-4m-24 13c-5 3-9 7-12 12m15-12c6 2 11 6 14 11" />
              <path d="M70 180c-8-2-12 1-13 6 7 2 11 0 13-6Zm19-7c-1-7 2-11 8-12 2 6-1 10-8 12Zm12-2c4-7 9-8 14-5-3 6-7 8-14 5Zm-24 16c-7 0-10 4-10 9 7 0 10-3 10-9Zm28 0c7-1 11 2 13 7-7 2-11 0-13-7Z" fill="#E3B45F" fillOpacity=".22" />
              <path d="M54 171c10 4 22 5 35 4 15-1 26-4 37-10" strokeOpacity=".6" />
            </g>
            <g className="blomeo-splash__rays" stroke="#F4B860" strokeWidth="1.5" strokeLinecap="round">
              <path d="M90 19v-8M49 38l-6-6M131 38l6-6M39 93h-9M141 93h9" />
            </g>
          </svg>
        </div>
        <div className="blomeo-splash__wordmark" aria-hidden="true">
          {'blomeo'.split('').map((letter, index) => <span key={`${letter}-${index}`} style={{ '--letter-index': index } as React.CSSProperties}>{letter}</span>)}
        </div>
      </div>
      <span className="blomeo-splash__skip-hint" aria-hidden="true">Tap to continue</span>
    </div>
  );
}
