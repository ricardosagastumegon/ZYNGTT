import React from 'react';

const PRIMARY = '#4F46E5';
const WHITE = '#FFFFFF';

function LogoMark({ color = PRIMARY, size = 32 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="32,4 56,18 56,46 32,60 8,46 8,18" fill={color} />
      <polyline
        points="18,32 28,22 28,42 46,32"
        fill="none"
        stroke={WHITE}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="46" cy="32" r="3" fill={WHITE} />
    </svg>
  );
}

function LogoText({ color = PRIMARY }: { color?: string }) {
  return (
    <span style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: '1.25rem',
      letterSpacing: '-0.02em',
      color,
    }}>
      ZYN
    </span>
  );
}

interface LogoProps {
  variant?: 'full' | 'mark' | 'text';
  dark?: boolean;
  size?: number;
  className?: string;
}

export function Logo({ variant = 'full', dark = false, size = 32, className }: LogoProps) {
  const markColor = dark ? WHITE : PRIMARY;
  const textColor = dark ? WHITE : PRIMARY;

  if (variant === 'mark') return <LogoMark color={markColor} size={size} />;
  if (variant === 'text') return <LogoText color={textColor} />;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className={className}>
      <LogoMark color={markColor} size={size} />
      <LogoText color={textColor} />
    </div>
  );
}

export default Logo;
