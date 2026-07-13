export function HexBrainLogo({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hexg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {/* Hexagon */}
      <path
        d="M20 2.5 L34.5 11 V29 L20 37.5 L5.5 29 V11 Z"
        fill="url(#hexg)"
        stroke="#4f46e5"
        strokeWidth="1"
      />
      {/* Neural nodes */}
      <g stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" opacity="0.95">
        <line x1="13" y1="14" x2="20" y2="20" />
        <line x1="27" y1="14" x2="20" y2="20" />
        <line x1="13" y1="26" x2="20" y2="20" />
        <line x1="27" y1="26" x2="20" y2="20" />
        <line x1="20" y1="10" x2="20" y2="20" />
        <line x1="20" y1="20" x2="20" y2="30" />
      </g>
      <g fill="#ffffff">
        <circle cx="20" cy="20" r="2.2" />
        <circle cx="13" cy="14" r="1.5" />
        <circle cx="27" cy="14" r="1.5" />
        <circle cx="13" cy="26" r="1.5" />
        <circle cx="27" cy="26" r="1.5" />
        <circle cx="20" cy="10" r="1.3" />
        <circle cx="20" cy="30" r="1.3" />
      </g>
    </svg>
  );
}
