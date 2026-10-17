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
}

/** The shop with this id, or the first shop when it is gone. */
export function findShop(shops: Shop[], id: string): Shop | undefined {
  return shops.find((s) => s.id === id) ?? shops[0];
}

/** The items still to buy, in the shop's aisle order; unknown aisles last, then by name. */
export function orderFor(items: Item[], shop?: Shop): Item[] {
  const order = shop?.aisles ?? [];
  const rank = (item: Item) => {
    const i = item.aisle === undefined ? -1 : order.indexOf(item.aisle);
    return i < 0 ? order.length : i;
  };
  return items
    .filter((i) => !i.bought)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/** The bought items, most recently bought first. */
export function boughtList(items: Item[]): Item[] {
  return items.filter((i) => i.bought).sort((a, b) => (b.boughtAt ?? 0) - (a.boughtAt ?? 0));
}
