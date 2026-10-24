"use client";

import { useId, useState } from "react";
import { PinIcon } from "@/components/Icons";
import { AREA_LABELS, PICKUP_POINTS, searchPickups, type PickupKey } from "@/lib/places";

// Looks like a text input; typing filters the preset pickup spots (campus,
// student housing, around Norman), grouped by area.
// Submits the chosen spot's key as `name`.
export default function PickupPicker({ name, defaultValue }: { name: string; defaultValue: PickupKey | null }) {
  const listId = useId();
  const [selected, setSelected] = useState<PickupKey | null>(defaultValue);
  const [query, setQuery] = useState(defaultValue ? PICKUP_POINTS[defaultValue].name : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = searchPickups(selected && query === PICKUP_POINTS[selected].name ? "" : query);

  function choose(key: PickupKey) {
    setSelected(key);
    setQuery(PICKUP_POINTS[key].name);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected ?? ""} />
      <label className="flex h-14 items-center gap-3 rounded-2xl bg-zinc-100 px-4 focus-within:ring-2 focus-within:ring-crimson">
        <PinIcon className="shrink-0 text-xl text-zinc-400" />
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Pickup area"
          placeholder="e.g. Adams Hall, Campus Corner, Crimson Park"
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && open && matches[active]) {
              e.preventDefault();
              choose(matches[active]);
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-zinc-400"
        />
      </label>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-auto rounded-2xl bg-white p-1 shadow-xl ring-1 ring-zinc-200"
        >
          {matches.length === 0 ? (
            <li className="px-4 py-3 text-sm text-zinc-500">No pickup spot matches “{query}”.</li>
          ) : (
            matches.map((key, i) => {
              const area = PICKUP_POINTS[key].area;
              const header = i === 0 || PICKUP_POINTS[matches[i - 1]].area !== area;
              return (
                <li key={key} role="presentation">
                  {header && (
                    <p className="px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-zinc-400">{AREA_LABELS[area]}</p>
                  )}
                  <div
                    role="option"
                    aria-selected={key === selected}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(key);
                    }}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 ${i === active ? "bg-zinc-100" : ""}`}
                  >
                    <PinIcon className="text-zinc-400" />
                    {PICKUP_POINTS[key].name}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
