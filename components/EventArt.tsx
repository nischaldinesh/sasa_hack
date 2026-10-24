import { useId } from "react";

// Generated illustrated backgrounds per event category (inline SVG, no images).
// Fills its parent; the bottom stays dark so white card text reads well.

type Palette = { sky: [string, string, string] };

const PALETTES: Record<string, Palette> = {
  Career: { sky: ["#3b2a63", "#6b3a5c", "#b25a3c"] },
  Conference: { sky: ["#1e3a6e", "#3a4f8f", "#7b6fb0"] },
  Culture: { sky: ["#2a1846", "#5a2050", "#c0533a"] },
  Sports: { sky: ["#0f2b2a", "#1d4d3c", "#3f7a3a"] },
  Music: { sky: ["#2b0f3a", "#6a1f63", "#c23a7a"] },
  Social: { sky: ["#0f3442", "#1c5a6b", "#3a8f8f"] },
  Meeting: { sky: ["#1f2a44", "#2f4a6d", "#4f7a9a"] },
};

const DEFAULT: Palette = { sky: ["#2a2440", "#4a3a5c", "#7a4a4a"] };

function Skyline({ windows }: { windows: string }) {
  const buildings = [
    [30, 240, 70, 360],
    [115, 200, 90, 400],
    [215, 250, 60, 350],
    [285, 180, 85, 420],
  ];
  return (
    <g>
      {buildings.map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} fill="#2a2347" />
          {Array.from({ length: 6 }).map((_, r) =>
            [0, 1].map((c) =>
              (r + c + i) % 3 === 0 ? null : (
                <rect key={`${r}-${c}`} x={x + 14 + c * (w / 2 - 6)} y={y + 22 + r * 36} width="12" height="16" fill={windows} opacity="0.85" />
              ),
            ),
          )}
        </g>
      ))}
    </g>
  );
}

function Crowd() {
  return (
    <g fill="#120f1f">
      {[20, 70, 125, 180, 235, 290, 345, 390].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={470 + (i % 2) * 8} r="17" />
          <rect x={x - 22} y={486 + (i % 2) * 8} width="44" height="120" rx="20" />
        </g>
      ))}
    </g>
  );
}

function Lanterns() {
  return (
    <g>
      {[60, 150, 250, 340].map((x, i) => (
        <g key={x}>
          <line x1={x} y1="0" x2={x} y2={90 + i * 25} stroke="#f5c26b" strokeWidth="2" opacity="0.6" />
          <rect x={x - 18} y={90 + i * 25} width="36" height="48" rx="12" fill="#f59e3b" opacity="0.9" />
          <circle cx={x} cy={114 + i * 25} r="30" fill="#fbbf24" opacity="0.15" />
        </g>
      ))}
      {[40, 110, 180, 250, 320, 380].map((x, i) => (
        <g key={x} transform={`translate(${x} ${420 + (i % 2) * 14})`}>
          <path d="M-14 0 h28 l-6 10 h-16 z" fill="#c2692c" />
          <path d="M0 -18 c6 8 6 12 0 16 c-6 -4 -6 -8 0 -16z" fill="#fde68a" />
        </g>
      ))}
    </g>
  );
}

function Stadium() {
  return (
    <g>
      {[50, 350].map((x) => (
        <g key={x}>
          <rect x={x - 4} y="120" width="8" height="260" fill="#0b1f1d" />
          <rect x={x - 30} y="100" width="60" height="26" rx="4" fill="#e5f3d6" />
          <path d={`M${x - 30} 126 L${x - 140} 420 L${x + 140} 420 L${x + 30} 126Z`} fill="#fff" opacity="0.06" />
        </g>
      ))}
      <ellipse cx="200" cy="470" rx="260" ry="90" fill="#2d6a35" />
      <ellipse cx="200" cy="470" rx="160" ry="50" fill="none" stroke="#e5f3d6" strokeWidth="3" opacity="0.5" />
    </g>
  );
}

function Stage() {
  return (
    <g>
      {[80, 200, 320].map((x, i) => (
        <path key={x} d={`M${x} 0 L${x - 90} 460 L${x + 90} 460Z`} fill="#fde68a" opacity={0.08 + i * 0.03} />
      ))}
      <rect x="0" y="380" width="400" height="40" fill="#1a0a22" />
      {[[90, 200], [300, 150], [220, 260]].map(([x, y]) => (
        <g key={x} fill="#f9a8d4" opacity="0.8">
          <circle cx={x} cy={y} r="10" />
          <rect x={x + 8} y={y - 44} width="4" height="44" />
        </g>
      ))}
    </g>
  );
}

function Bubbles() {
  return (
    <g>
      {[[70, 140, 46], [300, 110, 60], [200, 260, 34], [90, 330, 26], [330, 300, 40]].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#fff" opacity="0.08" />
      ))}
      {Array.from({ length: 18 }).map((_, i) => (
        <rect
          key={i}
          x={(i * 53) % 380}
          y={60 + ((i * 97) % 320)}
          width="8"
          height="14"
          rx="2"
          transform={`rotate(${(i * 37) % 90} ${(i * 53) % 380} ${60 + ((i * 97) % 320)})`}
          fill={["#fbbf24", "#f472b6", "#60a5fa", "#34d399"][i % 4]}
          opacity="0.7"
        />
      ))}
    </g>
  );
}

export default function EventArt({ category, className = "" }: { category: string | null; className?: string }) {
  const id = useId().replace(/:/g, "");
  const palette = PALETTES[category ?? ""] ?? DEFAULT;
  const [top, mid, low] = palette.sky;

  let scene;
  switch (category) {
    case "Career":
    case "Conference":
      scene = (
        <>
          <Skyline windows="#e8c88a" />
          <Crowd />
        </>
      );
      break;
    case "Culture":
      scene = <Lanterns />;
      break;
    case "Sports":
      scene = <Stadium />;
      break;
    case "Music":
      scene = (
        <>
          <Stage />
          <Crowd />
        </>
      );
      break;
    default:
      scene = <Bubbles />;
  }

  return (
    <svg viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" className={`h-full w-full ${className}`} aria-hidden>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="0.55" stopColor={mid} />
          <stop offset="1" stopColor={low} />
        </linearGradient>
        <linearGradient id={`fade-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor="#0b0a14" stopOpacity="0" />
          <stop offset="1" stopColor="#0b0a14" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect width="400" height="600" fill={`url(#sky-${id})`} />
      {scene}
      <rect width="400" height="600" fill={`url(#fade-${id})`} />
    </svg>
  );
}
