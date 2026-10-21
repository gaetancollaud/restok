/**
 * PENDING: the AI is still picking a category (orange ring).
 * CLASSIFIED: has a category, chosen by the AI or by hand (green dot).
 * UNCLASSIFIED: no category; none matched, the AI failed, or it was cleared (red dot).
 */
export type ClassificationStatus = 'PENDING' | 'CLASSIFIED' | 'UNCLASSIFIED';

/** A shop and its aisle names in walking order. */
export interface Shop {
  id: string;
  name: string;
  aisles?: string[];
  latitude?: number;
  longitude?: number;
}

export type Category = { id: string; name: string };

export interface Item {
  id: string;
  /** Short noun in sentence case, e.g. "Tomatoes". */
  name: string;
  /** How many to buy; unset means 1. */
  quantity?: number;
  /** The category; matches one of a shop's aisles. */
  aisle?: string;
  categoryId?: string;
  status?: ClassificationStatus;
  bought?: boolean;
  /** When it was marked bought, in ms. */
  boughtAt?: number;
  /** The only shop to buy it at; unset means any shop. */
  shopId?: string;
}

/** A quantity word: 1 to 999, alone or with an x or × stuck to either side, e.g. "2", "2x", "x2". */
const QUANTITY_WORD = /^[x×]?(\d{1,3})[x×]?$/i;

/**
 * Splits typed text into a name and a quantity read from its first or else its last word.
 * Without one, or when nothing else would be left as the name, the quantity is 1 and the text stays whole.
 */
export function parseQuantity(text: string): { name: string; quantity: number } {
  const words = text.trim().split(/\s+/);
  if (words.length > 1) {
    for (const [word, rest] of [
      [words[0], words.slice(1)],
      [words[words.length - 1], words.slice(0, -1)],
    ] as const) {
      const quantity = Number(QUANTITY_WORD.exec(word)?.[1]);
      if (quantity >= 1) return { name: rest.join(' '), quantity };
    }
  }
  return { name: text.trim(), quantity: 1 };
}

/** The shopId value for the "All shops" view: no shop filter, sorted by name. */
export const ALL_SHOPS = '*';

/** The shop with this id, or the first shop when it is gone. */
export function findShop(shops: Shop[], id: string): Shop | undefined {
  return shops.find((s) => s.id === id) ?? shops[0];
}

/** How close the device must be to a shop for it to be selected on open. */
const NEARBY_METERS = 200;

/** Great-circle distance in meters (haversine). */
function distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

/** The nearest shop within 200 m of this position; shops without a location are ignored. */
export function nearestShop(shops: Shop[], latitude: number, longitude: number): Shop | undefined {
  let best: Shop | undefined;
  let bestDistance = NEARBY_METERS;
  for (const shop of shops) {
    if (shop.latitude === undefined || shop.longitude === undefined) continue;
    const d = distance(latitude, longitude, shop.latitude, shop.longitude);
    if (d <= bestDistance) [best, bestDistance] = [shop, d];
  }
  return best;
}

/** Still to buy, but only at another shop than this one. Never without a shop (All shops). */
const elsewhere = (item: Item, shop?: Shop) => !!shop && !item.bought && !!item.shopId && item.shopId !== shop.id;

/** How many items to buy are left out of the list because they belong to another shop. */
export function hiddenFor(items: Item[], shop?: Shop): number {
  return items.filter((i) => elsewhere(i, shop)).length;
}

/**
 * The items still to buy at this shop, in its aisle order; unknown aisles last, then by name.
 * Items for another shop are left out; without a shop, nothing is.
 */
export function orderFor(items: Item[], shop?: Shop): Item[] {
  const order = shop?.aisles ?? [];
  const rank = (item: Item) => {
    const i = item.aisle === undefined ? -1 : order.indexOf(item.aisle);
    return i < 0 ? order.length : i;
  };
  return items
    .filter((i) => !i.bought && !elsewhere(i, shop))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/** The bought items, most recently bought first. */
export function boughtList(items: Item[]): Item[] {
  return items.filter((i) => i.bought).sort((a, b) => (b.boughtAt ?? 0) - (a.boughtAt ?? 0));
}
