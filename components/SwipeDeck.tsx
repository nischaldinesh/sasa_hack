"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { CheckIcon, StarIcon, XIcon } from "@/components/Icons";

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
};

const SWIPE_DISTANCE = 120;
const SWIPE_VELOCITY = 600;
const STACK = 3; // top card plus two peeking behind it

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
}: Props<T>) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [hint, setHint] = useState(false);
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
          {/* Cards waiting behind the top one, offset so the stack shows. */}
          {behind
            .map((item, i) => (
              <div
                key={getKey(item)}
                aria-hidden
                className="pointer-events-none absolute inset-0 transition-transform duration-300"
                style={{
                  transform: `translateY(${(i + 1) * 14}px) scale(${1 - (i + 1) * 0.05})`,
                  opacity: 1 - (i + 1) * 0.25,
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
          />
        </div>
        {hint && <SwipeHint allowStar={allowStar} canFlip={!!renderBack} onDone={endHint} />}
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

      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <span>
          {visible.length} {visible.length === 1 ? "card" : "cards"} left
        </span>
        {hintKey && !hint && (
          <>
            <span aria-hidden>·</span>
            <button type="button" onClick={() => setHint(true)} className="font-semibold text-zinc-500 underline">
              How swiping works
            </button>
          </>
        )}
        <span className="hidden md:inline" aria-hidden>
          · ← skip · → {stamps.right.label.toLowerCase()}
          {allowStar ? " · ↑ star" : ""}
          {renderBack ? " · Enter flip" : ""}
        </span>
      </div>
    </div>
  );
}

// First time tip shown over the deck while the top card demonstrates a swipe.
function SwipeHint({ allowStar, canFlip, onDone }: { allowStar: boolean; canFlip: boolean; onDone: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-6 z-20 flex justify-center">
      <div
        role="status"
        className="pointer-events-auto flex max-w-sm flex-col gap-3 rounded-3xl bg-zinc-900/90 p-5 text-white shadow-2xl backdrop-blur"
      >
        <p className="text-lg font-black">How it works</p>
        <ul className="flex flex-col gap-1.5 text-sm text-white/85">
          <li>👉 Swipe right (or ✓) if you want to go</li>
          <li>👈 Swipe left (or ✕) to skip</li>
          {allowStar && <li>⭐ Star to go first in their deck</li>}
          {canFlip && <li>👆 Tap a card to flip it for details</li>}
          <li>🗂️ More cards are stacked underneath</li>
        </ul>
        <button type="button" onClick={onDone} className="h-11 rounded-2xl bg-white font-bold text-zinc-900">
          Got it
        </button>
      </div>
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

  // Demo: nudge right (stamp peeks), then left, then settle. Loops while the tip shows.
  useEffect(() => {
    if (!demo) return;
    let cancelled = false;
    const ease = { duration: 0.45, ease: "easeInOut" as const };
    (async () => {
      await new Promise((r) => setTimeout(r, 500));
      while (!cancelled) {
        await animate(x, 95, ease);
        if (cancelled) break;
        await animate(x, 0, ease);
        if (cancelled) break;
        await animate(x, -95, ease);
        if (cancelled) break;
        await animate(x, 0, ease);
        await new Promise((r) => setTimeout(r, 1400));
      }
      if (!flying.current && !dragging.current) animate(x, 0, { duration: 0.2 });
    })();
    return () => {
      cancelled = true;
      x.stop();
    };
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
