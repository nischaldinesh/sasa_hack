import Image from "next/image";
import EventArt from "@/components/EventArt";
import { photoCredit } from "@/lib/photoCredits";
import type { EventSummary } from "@/lib/types";

// Event photo, or the category illustration until a photo is added. Fills its
// positioned parent.
export default function EventImage({
  event,
  className = "",
  sizes = "(min-width: 1024px) 360px, (min-width: 768px) 50vw, 100vw",
}: {
  event: Pick<EventSummary, "image_url" | "category">;
  className?: string;
  sizes?: string;
}) {
  const src = event.image_url;
  if (!src) return <EventArt category={event.category} className={className} />;
  return src.startsWith("/") ? (
    <Image src={src} alt="" fill sizes={sizes} draggable={false} className={`object-cover ${className}`} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- external organizer photo
    <img src={src} alt="" draggable={false} className={`h-full w-full object-cover ${className}`} />
  );
}

// "Photo: Author · CC BY 2.0" for openly licensed photos (plain text, for
// places where links would clash with a tap or drag).
export function creditText(imageUrl: string | null): string | null {
  const c = photoCredit(imageUrl);
  return c ? `Photo: ${c.author} · ${c.license}` : null;
}
