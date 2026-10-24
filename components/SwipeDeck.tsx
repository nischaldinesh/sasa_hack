"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { CheckIcon, StarIcon, XIcon } from "@/components/Icons";
import HandIllustration from "@/components/HandIllustration";

// "up" is a star (super like): a right swipe with extra weight.
export type SwipeDirection = "left" | "right" | "up";

type Stamp = { label: string; className: string };

type Props<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  renderBack?: (item: T) => ReactNode; // shown when the card is tapped (flip)
  onSwipe: (item: T, direction: SwipeDirection) => void;
  empty: ReactNode;
  stamps: { left: Stamp; right: Stamp; up?: Stamp };
  allowStar?: boolean;
  showProgress?: boolean;
  paused?: boolean; // ignore keys while a sheet or modal is open
  hintKey?: string; // localStorage key: show the first time swipe demo once
  demoCaptions?: { right: string; left: string; tap?: string }; // what each move does
};

type DemoPhase = "right" | "left" | "tap" | null;

const SWIPE_DISTANCE = 120;
const SWIPE_VELOCITY = 600;
const STACK = 3; // top card plus two peeking behind it
const FAN = [
  "translate(-14px, 10px) rotate(-5deg) scale(0.97)",
  "translate(14px, 18px) rotate(5deg) scale(0.94)",
];

type Fly = (direction: SwipeDirection) => void;

function hintSeen(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markHintSeen(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Private mode or blocked storage: the hint may show again, which is fine.
  }
}

// Card stack. Drag the top card, tap the buttons, or use the arrow keys
// (Left = skip, Right = accept, Up = star). Tap a card (or Enter / Space) to
// flip it. Swiped items are hidden locally, so the parent can refresh `items`
// at any time.
export default function SwipeDeck<T>({
  items,
  getKey,
  renderCard,
  renderBack,
  onSwipe,
  empty,
  stamps,
  allowStar = false,
  showProgress = false,
  paused = false,
  hintKey,
  demoCaptions,
}: Props<T>) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [hint, setHint] = useState(false);
  const [phase, setPhase] = useState<DemoPhase>(null);
  const flyRef = useRef<Fly | null>(null);
  const flipRef = useRef<(() => void) | null>(null);
  const visible = items.filter((item) => !dismissed.has(getKey(item)));
  const top = visible[0];

  // First visit: play the swipe demo once (remembered per browser).
  useEffect(() => {
    if (!hintKey || hintSeen(hintKey)) return;
    const t = setTimeout(() => setHint(true), 0);
    return () => clearTimeout(t);
  }, [hintKey]);

  function endHint() {
    setHint(false);
    setPhase(null);
    if (hintKey) markHintSeen(hintKey);
  }

  useEffect(() => {
    if (paused) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (e.key === "Enter" || e.key === " ") {
        // Leave Enter / Space to focused buttons and links.
        if (!renderBack || target?.closest("button, a")) return;
        e.preventDefault();
        flipRef.current?.();
        return;
      }
      const dir = e.key === "ArrowLeft" ? "left" : e.key === "ArrowRight" ? "right" : e.key === "ArrowUp" && allowStar ? "up" : null;
      if (!dir) return;
      e.preventDefault();
      flyRef.current?.(dir);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, allowStar, renderBack]);

  if (!top) return <>{empty}</>;

  function handleSwipe(item: T, direction: SwipeDirection) {
    if (hint) endHint();
    setDismissed((prev) => new Set(prev).add(getKey(item)));
    onSwipe(item, direction);
  }

  const done = items.length - visible.length;
  const behind = visible.slice(1, STACK);

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="relative w-full max-w-[420px]">
        <div className="relative h-[60dvh] max-h-[620px] min-h-[440px] w-full">
          {/* Cards waiting behind the top one, fanned left and right so the
              stack and the swipe directions are visible at rest. */}
          {behind
            .map((item, i) => (
              <div
                key={getKey(item)}
                aria-hidden
                className="pointer-events-none absolute inset-0 transition-transform duration-500"
                style={{
                  transform: FAN[i],
                  opacity: 1 - (i + 1) * 0.2,
                  zIndex: STACK - i - 1,
                }}
              >
                {renderCard(item)}
              </div>
            ))
            .reverse()}
          <TopCard
            key={getKey(top)}
            item={top}
            renderCard={renderCard}
            renderBack={renderBack}
            onSwipe={handleSwipe}
            flyRef={flyRef}
            flipRef={flipRef}
            stamps={stamps}
            demo={hint}
            onDemoStop={endHint}
            onPhase={setPhase}
          />
        </div>
        {hint && phase && demoCaptions && (
          <DemoCaption phase={phase} captions={demoCaptions} />
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => flyRef.current?.("left")}
          aria-label={`${stamps.left.label} (Left arrow)`}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl text-red-500 shadow-lg shadow-zinc-300/60 transition active:scale-95"
        >
          <XIcon strokeWidth={2.5} />
        </button>
        {allowStar && (
          <button
            type="button"
            onClick={() => flyRef.current?.("up")}
            aria-label={`${stamps.up?.label ?? "Star"} (Up arrow)`}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl text-amber-500 shadow-lg shadow-zinc-300/60 transition active:scale-95"
          >
            <StarIcon fill="currentColor" />
          </button>
        )}
        <button
          type="button"
          onClick={() => flyRef.current?.("right")}
          aria-label={`${stamps.right.label} (Right arrow)`}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-crimson text-3xl text-white shadow-lg shadow-crimson/30 transition active:scale-95"
        >
          <CheckIcon strokeWidth={2.5} />
        </button>
      </div>

      {showProgress && items.length > 1 && (
        <div className="flex items-center gap-1.5" aria-label={`${done + 1} of ${items.length}`}>
          {items.slice(0, 12).map((item, i) => (
            <span key={getKey(item)} className={`h-1.5 rounded-full ${i === done ? "w-6 bg-crimson" : "w-1.5 bg-zinc-300"}`} />
          ))}
        </div>
      )}

    </div>
  );
}

// Caption explaining the move the demo hand is making.
function DemoCaption({ phase, captions }: { phase: Exclude<DemoPhase, null>; captions: NonNullable<Props<unknown>["demoCaptions"]> }) {
  const text = phase === "tap" ? captions.tap : captions[phase];
  if (!text) return null;
  const tone = phase === "right" ? "bg-green-600" : phase === "left" ? "bg-red-600" : "bg-zinc-900";
  const icon = phase === "right" ? "👉" : phase === "left" ? "👈" : "👆";
  return (
    <div className="pointer-events-none absolute inset-x-0 -top-3 z-30 flex justify-center px-3">
      <motion.p
        key={phase}
        role="status"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`max-w-sm rounded-2xl px-4 py-2.5 text-center text-sm font-bold text-white shadow-xl ${tone}`}
      >
        {icon} {text}
      </motion.p>
    </div>
  );
}

function TopCard<T>({
  item,
  renderCard,
  renderBack,
  onSwipe,
  flyRef,
  flipRef,
  stamps,
  demo,
  onDemoStop,
  onPhase,
}: {
  item: T;
  renderCard: (item: T) => ReactNode;
  renderBack?: (item: T) => ReactNode;
  onSwipe: (item: T, direction: SwipeDirection) => void;
  flyRef: RefObject<Fly | null>;
  flipRef: RefObject<(() => void) | null>;
  stamps: Props<T>["stamps"];
  demo: boolean;
  onDemoStop: () => void;
  onPhase: (phase: DemoPhase) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-12, 12]);
  const rightOpacity = useTransform(x, [20, SWIPE_DISTANCE], [0, 1]);
  const leftOpacity = useTransform(x, [-SWIPE_DISTANCE, -20], [1, 0]);
  const upOpacity = useTransform(y, [-SWIPE_DISTANCE, -20], [1, 0]);
  const flying = useRef(false);
  const dragging = useRef(false);
  const [flipped, setFlipped] = useState(false);

  async function fly(direction: SwipeDirection) {
    if (flying.current) return;
    flying.current = true;
    if (direction === "up") await animate(y, -900, { duration: 0.3 });
    else await animate(x, direction === "right" ? 650 : -650, { duration: 0.25 });
    onSwipe(item, direction);
  }

  useEffect(() => {
    flyRef.current = fly;
    flipRef.current = renderBack ? () => setFlipped((f) => !f) : null;
    return () => {
      flyRef.current = null;
      flipRef.current = null;
    };
  });

  const [pressing, setPressing] = useState(false);

  // First visit demo: a hand drags the card right (GOING), then left (SKIP),
  // then taps it to flip, with a caption for each move. Ends on its own.
  useEffect(() => {
    if (!demo) return;
    let cancelled = false;
    const ease = { duration: 0.6, ease: "easeInOut" as const };
    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      await pause(500);
      const steps: [DemoPhase, number][] = [
        ["right", 115],
        ["left", -115],
      ];
      for (const [phase, to] of steps) {
        if (cancelled) break;
        onPhase(phase);
        setPressing(true);
        await animate(x, to, ease);
        if (cancelled) break;
        await pause(1500);
        if (cancelled) break;
        await animate(x, 0, ease);
        setPressing(false);
        await pause(300);
      }
      if (!cancelled && renderBack) {
        onPhase("tap");
        await pause(400);
        setPressing(true);
        await pause(250);
        setPressing(false);
        setFlipped(true);
        await pause(1800);
        if (!cancelled) setFlipped(false);
        await pause(700);
      }
      if (!cancelled) onDemoStop();
      else if (!flying.current && !dragging.current) animate(x, 0, { duration: 0.2 });
    })();
    return () => {
      cancelled = true;
      x.stop();
      setPressing(false);
    };
    // onPhase, onDemoStop and renderBack are stable for the life of this card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, x]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) fly("right");
    else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) fly("left");
    else animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
  }

  const stampBase =
    "pointer-events-none absolute top-10 z-10 rounded-xl border-[5px] px-4 py-1 text-4xl font-black uppercase tracking-wider";

  return (
    <motion.div
      className="absolute inset-0 z-10 cursor-grab touch-pan-y outline-none active:cursor-grabbing"
      style={{ x, y, rotate, perspective: 1400 }}
      drag="x"
      dragMomentum={false}
      onDragStart={() => {
        dragging.current = true;
        if (demo) onDemoStop();
      }}
      onDragEnd={(e, info) => {
        dragging.current = false;
        handleDragEnd(e, info);
      }}
      onTap={() => renderBack && setFlipped((f) => !f)}
      role={renderBack ? "button" : undefined}
      aria-pressed={renderBack ? flipped : undefined}
      aria-label={renderBack ? (flipped ? "Show the front of the card" : "Show details") : undefined}
    >
      <div
        className="relative h-full w-full transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none" }}
      >
        <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }} aria-hidden={flipped}>
          {renderCard(item)}
        </div>
        {renderBack && (
          <div
            className="absolute inset-0"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            aria-hidden={!flipped}
          >
            {renderBack(item)}
          </div>
        )}
      </div>
      {demo && (
        <motion.span
          aria-hidden
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, scale: pressing ? 0.88 : 1 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute bottom-[18%] left-1/2 z-20 -ml-10 flex w-20 flex-col items-center"
        >
          {/* Touch ripple under the fingertip while pressing */}
          <span
            className={`absolute -top-3 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full bg-white/70 transition-all duration-300 ${
              pressing ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
          />
          <HandIllustration className="relative h-24 w-20 drop-shadow-[0_8px_14px_rgba(0,0,0,0.45)]" />
        </motion.span>
      )}
      <motion.span style={{ opacity: rightOpacity }} className={`${stampBase} left-6 -rotate-12 ${stamps.right.className}`}>
        {stamps.right.label}
      </motion.span>
      <motion.span style={{ opacity: leftOpacity }} className={`${stampBase} right-6 rotate-12 ${stamps.left.className}`}>
        {stamps.left.label}
      </motion.span>
      {stamps.up && (
        <motion.span
          style={{ opacity: upOpacity }}
          className={`${stampBase} left-1/2 top-1/3 -translate-x-1/2 ${stamps.up.className}`}
        >
          {stamps.up.label}
        </motion.span>
      )}
    </motion.div>
  );
}
