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
}

export interface Item {
  id: string;
  /** Short noun in sentence case, e.g. "Tomatoes". */
  name: string;
  /** Optional quantity, e.g. "2 ×" or "500 g". */
  meta?: string;
  /** The category; matches one of a shop's aisles. */
  aisle?: string;
  status?: ClassificationStatus;
  bought?: boolean;
  /** When it was marked bought, in ms. */
  boughtAt?: number;
  /** The only shop to buy it at; unset means any shop. */
  shopId?: string;
}

/** The shopId value for the "All shops" view: no shop filter, sorted by name. */
export const ALL_SHOPS = '*';

/** The shop with this id, or the first shop when it is gone. */
export function findShop(shops: Shop[], id: string): Shop | undefined {
  return shops.find((s) => s.id === id) ?? shops[0];
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
