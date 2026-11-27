import React, { useRef } from 'react';

type BlomeoSplashScreenProps = {
  isExiting: boolean;
  onSkip: () => void;
};

/** Image-faithful Blomeo splash with a lightweight, centered wordmark reveal. */
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

      <div className="blomeo-splash__lockup" dir="ltr" aria-label="blomeo">
        <img
          className="blomeo-splash__icon"
          src="/blomeo-icon.png"
          alt="blomeo"
          decoding="async"
          fetchPriority="high"
        />
        <div className="blomeo-splash__wordmark" aria-hidden="true">
          {'blomeo'.split('').map((letter, index) => (
            <span key={`${letter}-${index}`} style={{ '--letter-index': index } as React.CSSProperties}>{letter}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
