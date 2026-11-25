import React from 'react';
import { FlagSpec } from '../types/game';

interface FlagBannerProps {
  flag: FlagSpec;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-5 h-3.5',
  sm: 'w-7 h-5',
  md: 'w-9 h-6',
  lg: 'w-12 h-8',
};

export const FlagBanner: React.FC<FlagBannerProps> = ({
  flag,
  name,
  size = 'sm',
  className = '',
}) => {
  const [c1, c2, c3] = flag.colors;
  const third = c3 ?? c1;
  const accent = flag.accent ?? c2;

  return (
    <svg
      viewBox="0 0 36 24"
      role="img"
      aria-label={`Bandiera ${name}`}
      className={`${SIZE_MAP[size]} shrink-0 rounded-[2px] ring-1 ring-white/15 overflow-hidden ${className}`}
    >
      {flag.pattern === 'vertical3' && (
        <>
          <rect x="0" y="0" width="12" height="24" fill={c1} />
          <rect x="12" y="0" width="12" height="24" fill={c2} />
          <rect x="24" y="0" width="12" height="24" fill={third} />
          {flag.accent && <circle cx="18" cy="12" r="3" fill={flag.accent} />}
        </>
      )}

      {flag.pattern === 'horizontal3' && (
        <>
          <rect x="0" y="0" width="36" height="8" fill={c1} />
          <rect x="0" y="8" width="36" height="8" fill={c2} />
          <rect x="0" y="16" width="36" height="8" fill={third} />
          {flag.accent && <circle cx="18" cy="12" r="2.6" fill={flag.accent} />}
        </>
      )}

      {flag.pattern === 'horizontal2' && (
        <>
          <rect x="0" y="0" width="36" height="12" fill={c1} />
          <rect x="0" y="12" width="36" height="12" fill={c2} />
          {flag.accent && <polygon points="0,0 13,12 0,24" fill={flag.accent} />}
        </>
      )}

      {flag.pattern === 'nordic' && (
        <>
          <rect x="0" y="0" width="36" height="24" fill={c1} />
          {c3 && (
            <>
              <rect x="10" y="0" width="6" height="24" fill={c3} />
              <rect x="0" y="9" width="36" height="6" fill={c3} />
            </>
          )}
          <rect x="11.5" y="0" width="3" height="24" fill={c2} />
          <rect x="0" y="10.5" width="36" height="3" fill={c2} />
        </>
      )}

      {flag.pattern === 'canton' && (
        <>
          <rect x="0" y="0" width="36" height="24" fill={c2} />
          <rect x="0" y="3.5" width="36" height="2.8" fill={third} opacity="0.9" />
          <rect x="0" y="9.5" width="36" height="2.8" fill={third} opacity="0.9" />
          <rect x="0" y="15.5" width="36" height="2.8" fill={third} opacity="0.9" />
          <rect x="0" y="21" width="36" height="3" fill={third} opacity="0.9" />
          <rect x="0" y="0" width="16" height="12.5" fill={c1} />
          <circle cx="8" cy="6.25" r="2.6" fill={flag.accent ?? '#F8FAFC'} />
        </>
      )}

      {flag.pattern === 'circle' && (
        <>
          <rect x="0" y="0" width="36" height="24" fill={c1} />
          <circle cx="18" cy="12" r="5.5" fill={c2} />
          {flag.accent && <circle cx="19.5" cy="12" r="4" fill={flag.accent} opacity="0.85" />}
        </>
      )}

      {flag.pattern === 'cross' && (
        <>
          <rect x="0" y="0" width="36" height="24" fill={c1} />
          <rect x="14.5" y="0" width="7" height="24" fill={third} />
          <rect x="0" y="8.5" width="36" height="7" fill={third} />
          <rect x="16" y="0" width="4" height="24" fill={c2} />
          <rect x="0" y="10" width="36" height="4" fill={c2} />
        </>
      )}

      {flag.pattern === 'diagonal' && (
        <>
          <rect x="0" y="0" width="36" height="24" fill={c1} />
          <polygon points="18,3 32,12 18,21 4,12" fill={c2} />
          <circle cx="18" cy="12" r="4.2" fill={third} />
          {flag.accent && <circle cx="18" cy="12" r="1.6" fill={flag.accent} />}
        </>
      )}

      {flag.pattern === 'solid_emblem' && (
        <>
          <rect x="0" y="0" width="36" height="24" fill={c1} />
          <polygon points="18,6 20,10.5 25,10.5 21,13.5 22.5,18 18,15.2 13.5,18 15,13.5 11,10.5 16,10.5" fill={accent} />
        </>
      )}
    </svg>
  );
};
