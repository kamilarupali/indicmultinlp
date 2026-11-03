interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function IndicLogo({ size = 38, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="IndicMultiNLP Multilingual Platform Emblem"
    >
      <defs>
        <linearGradient id="indicGrad1" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#72d9b9" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="indicGrad2" x1="10" y1="38" x2="38" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#72d9b9" />
        </linearGradient>
        <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Rounded Hexagonal / Shield Frame */}
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="12"
        fill="#0b131e"
        stroke="url(#indicGrad1)"
        strokeWidth="2.2"
      />

      {/* Neural Confluence Nodes & Interlocking Indic Script Arc */}
      {/* Node 1: Devanagari horizontal shirorekha + loop bridge */}
      <path
        d="M 12 16 L 36 16"
        stroke="url(#indicGrad1)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Dravidian fluid curve intertwining through center */}
      <path
        d="M 16 16 C 16 28 22 34 29 34 C 35 34 37 29 35 24 C 33 19 24 20 23 26 C 22 31 27 34 33 34"
        stroke="url(#indicGrad2)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Neural Synapse Points */}
      <circle cx="12" cy="16" r="2.5" fill="#72d9b9" filter="url(#logoGlow)" />
      <circle cx="36" cy="16" r="2.5" fill="#f59e0b" filter="url(#logoGlow)" />
      <circle cx="23" cy="26" r="2.2" fill="#60a5fa" />
      <circle cx="33" cy="34" r="2.2" fill="#72d9b9" />

      {/* Center Intelligence Core Pulse */}
      <circle cx="24" cy="24" r="1.5" fill="#ffffff" />
    </svg>
  );
}

export default function BrandLogo({ size = 36, showText = true }: LogoProps) {
  return (
    <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <IndicLogo size={size} />
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Indic<span style={{ color: 'var(--accent-teal)' }}>Multi</span>NLP
          </span>
          <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Indic & Multilingual AI
          </span>
        </div>
      )}
    </div>
  );
}
