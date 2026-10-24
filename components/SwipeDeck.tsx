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
  renderDetails?: (item: T) => ReactNode; // desktop side panel
  onSwipe: (item: T, direction: SwipeDirection) => void;
  empty: ReactNode;
  stamps: { left: Stamp; right: Stamp; up?: Stamp };
  allowStar?: boolean;
  showProgress?: boolean;
  paused?: boolean; // ignore keys while a sheet or modal is open
};

const SWIPE_DISTANCE = 120;
const SWIPE_VELOCITY = 600;

// Card stack. Drag the top card, tap the buttons, or use the arrow keys
// (Left = skip, Right = accept, Up = star). Swiped items are hidden locally,
// so the parent can refresh `items` at any time.
export default function SwipeDeck<T>({
  items,
  getKey,
  renderCard,
  renderDetails,
  onSwipe,
  empty,
  stamps,
  allowStar = false,
  showProgress = false,
  paused = false,
}: Props<T>) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const flyRef = useRef<((direction: SwipeDirection) => void) | null>(null);
  const visible = items.filter((item) => !dismissed.has(getKey(item)));
  const [top, next] = visible;

  useEffect(() => {
    if (paused) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      const dir = e.key === "ArrowLeft" ? "left" : e.key === "ArrowRight" ? "right" : e.key === "ArrowUp" && allowStar ? "up" : null;
      if (!dir) return;
      e.preventDefault();
      flyRef.current?.(dir);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, allowStar]);

  if (!top) return <>{empty}</>;

  function handleSwipe(item: T, direction: SwipeDirection) {
    setDismissed((prev) => new Set(prev).add(getKey(item)));
    onSwipe(item, direction);
  }

  const done = items.length - visible.length;

  return (
    <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-center">
      <div className="flex w-full flex-col items-center gap-5 md:w-[420px]">
        <div className="relative h-[60dvh] max-h-[620px] min-h-[440px] w-full">
          {next && (
            <div className="absolute inset-0 -rotate-2 scale-[0.96] opacity-80" aria-hidden>
              {renderCard(next)}
            </div>
          )}
          <TopCard
            key={getKey(top)}
            item={top}
            renderCard={renderCard}
            onSwipe={handleSwipe}
            flyRef={flyRef}
            stamps={stamps}
          />
        </div>

        <div className="flex items-center justify-center gap-5">
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
              <span
                key={getKey(item)}
                className={`h-1.5 rounded-full ${i === done ? "w-6 bg-crimson" : "w-1.5 bg-zinc-300"}`}
              />
            ))}
          </div>
        )}
        <p className="hidden text-xs text-zinc-400 md:block">
          ← skip · → {stamps.right.label.toLowerCase()}
          {allowStar ? " · ↑ star" : ""}
        </p>
      </div>

      {renderDetails && (
        <aside className="hidden w-[360px] shrink-0 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-100 md:block">
          {renderDetails(top)}
        </aside>
      )}
    </div>
  );
}

function TopCard<T>({
  item,
  renderCard,
  onSwipe,
  flyRef,
  stamps,
}: {
  item: T;
  renderCard: (item: T) => ReactNode;
  onSwipe: (item: T, direction: SwipeDirection) => void;
  flyRef: RefObject<((direction: SwipeDirection) => void) | null>;
  stamps: Props<T>["stamps"];
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-12, 12]);
  const rightOpacity = useTransform(x, [20, SWIPE_DISTANCE], [0, 1]);
  const leftOpacity = useTransform(x, [-SWIPE_DISTANCE, -20], [1, 0]);
  const upOpacity = useTransform(y, [-SWIPE_DISTANCE, -20], [1, 0]);
  const flying = useRef(false);

  async function fly(direction: SwipeDirection) {
    if (flying.current) return;
    flying.current = true;
    if (direction === "up") await animate(y, -900, { duration: 0.3 });
    else await animate(x, direction === "right" ? 650 : -650, { duration: 0.25 });
    onSwipe(item, direction);
  }

  useEffect(() => {
    flyRef.current = fly;
    return () => {
      flyRef.current = null;
    };
  });

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) fly("right");
    else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) fly("left");
    else animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
  }

  const stampBase =
    "pointer-events-none absolute top-10 z-10 rounded-xl border-[5px] px-4 py-1 text-4xl font-black uppercase tracking-wider";

  return (
    <motion.div
      className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
      style={{ x, y, rotate }}
      drag="x"
      dragMomentum={false}
      onDragEnd={handleDragEnd}
    >
      {renderCard(item)}
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
