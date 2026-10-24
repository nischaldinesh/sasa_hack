// Attribution for event photos in public/events, keyed by image path.
// CC BY / BY-SA photos must credit the author, license and source. Our copies
// are resized and re-encoded; BY-SA copies stay under the same license.
export type PhotoCredit = {
  author: string;
  license: string;
  licenseUrl: string | null;
  source: string | null;
};

const AI = { author: "AI-generated image", license: "Fish Audio · gpt-image-2", licenseUrl: null, source: null };

export const PHOTO_CREDITS: Record<string, PhotoCredit> = {
  "/events/career.jpg": AI,
  "/events/sasegm.jpg": AI,
  "/events/diwali.jpg": AI,
  "/events/watch.jpg": {
    author: "Jeff Sandquist",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    source: "https://www.flickr.com/photos/48003527@N00/2855340814",
  },
  "/events/social.jpg": {
    author: "gfairchild",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    source: "https://www.flickr.com/photos/36770908@N08/4421257399",
  },
  "/events/tulsa.jpg": {
    author: "Tony Webster",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
    source: "https://commons.wikimedia.org/w/index.php?curid=79387960",
  },
  "/events/festival.jpg": {
    author: "waferboard",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    source: "https://www.flickr.com/photos/60944931@N00/15059789821",
  },
  "/events/concert.jpg": {
    author: "Michael Barera",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    source: "https://commons.wikimedia.org/wiki/File:University_of_Oklahoma_July_2019_80_(Catlett_Music_Center).jpg",
  },
};

export function photoCredit(imageUrl: string | null): PhotoCredit | null {
  return imageUrl ? (PHOTO_CREDITS[imageUrl] ?? null) : null;
}
