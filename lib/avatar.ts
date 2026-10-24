import { createAvatar } from "@dicebear/core";
import * as notionists from "@dicebear/notionists";

// Illustrated profile pictures: DiceBear "Notionists" by Zoish (CC0 1.0),
// generated locally from a seed so each person keeps the same face.
const BACKGROUNDS = ["dbeafe", "ede9fe", "d1fae5", "fce7f3", "fef3c7", "e0f2fe"];

const cache = new Map<string, string>();

export function avatarUri(seed: string): string {
  let uri = cache.get(seed);
  if (!uri) {
    uri = createAvatar(notionists, { seed, backgroundColor: BACKGROUNDS, backgroundType: ["solid"] }).toDataUri();
    cache.set(seed, uri);
  }
  return uri;
}
