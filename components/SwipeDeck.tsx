"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";

export type SwipeDirection = "left" | "right";

type Props<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  onSwipe: (item: T, direction: SwipeDirection) => void;
  empty: ReactNode;
  leftLabel?: string;
  rightLabel?: string;
};

const SWIPE_DISTANCE = 120;
const SWIPE_VELOCITY = 600;

// Generic card stack. Drag the top card, or use the buttons below it.
// Swiped items are hidden locally, so the parent can refresh `items` at any time.
export default function SwipeDeck<T>({
  items,
  getKey,
  renderCard,
  onSwipe,
  empty,
  leftLabel = "Skip",
  rightLabel = "Interested",
}: Props<T>) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const flyRef = useRef<((direction: SwipeDirection) => void) | null>(null);
  const visible = items.filter((item) => !dismissed.has(getKey(item)));
  const [top, next] = visible;

  if (!top) return <>{empty}</>;

  function handleSwipe(item: T, direction: SwipeDirection) {
    setDismissed((prev) => new Set(prev).add(getKey(item)));
    onSwipe(item, direction);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[70dvh] min-h-[420px]">
        {next && (
          <div className="absolute inset-0 scale-95 opacity-70" aria-hidden>
            {renderCard(next)}
          </div>
        )}
        <TopCard
          key={getKey(top)}
          item={top}
          renderCard={renderCard}
          onSwipe={handleSwipe}
          flyRef={flyRef}
          leftLabel={leftLabel}
          rightLabel={rightLabel}
        />
      </div>
      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => flyRef.current?.("left")}
          aria-label={leftLabel}
          className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-300 bg-white text-2xl shadow-md dark:border-zinc-700 dark:bg-zinc-900"
        >
          ✕
        </button>
        <span className="w-12 text-center text-xs text-zinc-500">{visible.length} left</span>
        <button
          type="button"
          onClick={() => flyRef.current?.("right")}
          aria-label={rightLabel}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-800 text-2xl text-white shadow-md"
        >
          ♥
        </button>
      </div>
    </div>
  );
}

function TopCard<T>({
  item,
  renderCard,
  onSwipe,
  flyRef,
  leftLabel,
  rightLabel,
}: {
  item: T;
  renderCard: (item: T) => ReactNode;
  onSwipe: (item: T, direction: SwipeDirection) => void;
  flyRef: RefObject<((direction: SwipeDirection) => void) | null>;
  leftLabel: string;
  rightLabel: string;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-14, 14]);
  const rightOpacity = useTransform(x, [20, SWIPE_DISTANCE], [0, 1]);
  const leftOpacity = useTransform(x, [-SWIPE_DISTANCE, -20], [1, 0]);
  const flying = useRef(false);

  async function fly(direction: SwipeDirection) {
    if (flying.current) return;
    flying.current = true;
    await animate(x, direction === "right" ? 600 : -600, { duration: 0.25 });
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

  return (
    <motion.div
      className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragMomentum={false}
      onDragEnd={handleDragEnd}
    >
      {renderCard(item)}
      <motion.span
        style={{ opacity: rightOpacity }}
        className="pointer-events-none absolute left-5 top-5 -rotate-12 rounded-lg border-4 border-green-600 px-3 py-1 text-2xl font-black text-green-600"
      >
        {rightLabel.toUpperCase()}
      </motion.span>
      <motion.span
        style={{ opacity: leftOpacity }}
        className="pointer-events-none absolute right-5 top-5 rotate-12 rounded-lg border-4 border-zinc-500 px-3 py-1 text-2xl font-black text-zinc-500"
      >
        {leftLabel.toUpperCase()}
      </motion.span>
    </motion.div>
  );
}
