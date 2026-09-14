// Icone SVG dei giochi (nessuna dipendenza da font emoji).
export default function GameIcon({ id, size = 40 }) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', fill: 'none', 'aria-hidden': true }
  switch (id) {
    case 'dama':
      return (
        <svg {...common}>
          <ellipse cx="24" cy="31" rx="15" ry="7" fill="#1a1a1a" />
          <ellipse cx="24" cy="27" rx="15" ry="7" fill="#3a3a3a" />
          <ellipse cx="24" cy="21" rx="15" ry="7" fill="#f6f0e4" />
          <ellipse cx="24" cy="17" rx="15" ry="7" fill="#fffaf0" />
          <path d="M18 19l2-6 4 4 4-4 2 6z" fill="#d4a24c" />
        </svg>
      )
    case 'scacchi':
      return (
        <svg {...common}>
          <path d="M14 40h20l-2-5H16z" fill="#fffaf0" />
          <path d="M18 35c-2-8 2-13 6-17-2-1-3-3-2-5 3 0 5 1 7 3 4 1 8 5 8 11l-2 2-4-4c-1 3-2 6-2 10z" fill="#fffaf0" />
          <circle cx="27" cy="16" r="1.4" fill="#1a1a1a" />
        </svg>
      )
    case 'battaglia':
      return (
        <svg {...common}>
          <path d="M6 30h36l-5 8H11z" fill="#4b5563" />
          <rect x="16" y="22" width="16" height="8" fill="#6b7280" />
          <rect x="21" y="14" width="6" height="8" fill="#9ca3af" />
          <path d="M4 40c4 3 8 3 12 0s8-3 12 0 8 3 12 0" stroke="#4cc9f0" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )
    case 'othello':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="16" fill="#fffaf0" />
          <path d="M24 8a16 16 0 0 1 0 32z" fill="#1a1a1a" />
        </svg>
      )
    case 'forza4':
      return (
        <svg {...common}>
          <rect x="6" y="8" width="36" height="32" rx="6" fill="#1d4ed8" />
          {[[15, 17], [24, 17], [33, 17], [15, 31], [24, 31], [33, 31]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="4.5" fill={i % 2 ? '#f4c542' : '#e5484d'} />
          ))}
        </svg>
      )
    case 'tris':
      return (
        <svg {...common}>
          <path d="M10 10l12 12M22 10L10 22" stroke="#e5484d" strokeWidth="4" strokeLinecap="round" />
          <circle cx="32" cy="32" r="6.5" stroke="#4cc9f0" strokeWidth="4" />
          <path d="M20 28v0M28 20v0" />
        </svg>
      )
    default:
      return null
  }
}
