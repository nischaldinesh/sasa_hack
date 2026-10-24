// Illustrated pointing hand for the swipe tutorial (inline SVG, no image files).
export default function HandIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 80" className={className} aria-hidden>
      <defs>
        <linearGradient id="hand-skin" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="60" y2="80">
          <stop offset="0" stopColor="#ffe0c2" />
          <stop offset="1" stopColor="#f2b98c" />
        </linearGradient>
      </defs>
      {/* Index finger, pointing up */}
      <path
        d="M24 40V10a6 6 0 0 1 12 0v26"
        fill="url(#hand-skin)"
        stroke="#3f2a1d"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Folded fingers and palm */}
      <path
        d="M36 34a5.5 5.5 0 0 1 11 0v4a5.5 5.5 0 0 1 11 0v12c0 14-9 24-22 24h-4c-9 0-15-5-19-13l-6-11a5 5 0 0 1 8.5-5.2L24 50V40"
        fill="url(#hand-skin)"
        stroke="#3f2a1d"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M36 34v8M47 38v6" stroke="#3f2a1d" strokeWidth="2.5" strokeLinecap="round" />
      {/* Fingernail */}
      <path d="M27 9.5a3 3 0 0 1 6 0" fill="none" stroke="#c98d68" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
