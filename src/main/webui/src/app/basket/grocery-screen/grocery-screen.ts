import { Component, computed, input, linkedSignal, model, output, signal } from '@angular/core';
import { AddBar } from '../add-bar/add-bar';
import { ALL_SHOPS, boughtList, findShop, hiddenFor, Item, orderFor, Shop } from '../basket';
import { ItemGrid } from '../item-grid/item-grid';
import { ItemTile } from '../item-tile/item-tile';
import { ProductPopup } from '../product-popup/product-popup';
import { ShopSelect } from '../shop-select/shop-select';

/**
 * The whole list on one screen: shop dropdown, To-buy grid, Bought grid, add bar.
 * Holds the bought state itself; the outputs let a parent persist the changes. Bind [(shopId)] to share the
 * selected shop.
 */
@Component({
  selector: 'app-grocery-screen',
  imports: [ShopSelect, ItemGrid, ItemTile, AddBar, ProductPopup],
  templateUrl: './grocery-screen.html',
  styleUrl: './grocery-screen.css',
})
export class GroceryScreen {
  readonly shops = input.required<Shop[]>();
  readonly items = input.required<Item[]>();
  /** Selected shop id, or ALL_SHOPS; the first shop when unset or gone. */
  readonly shopId = model('');
  /**
   * Picks a category (one of the aisles) for a new item, or null. New items show PENDING until it settles;
   * without it they start UNCLASSIFIED.
   */
  readonly classify = input<(name: string) => Promise<string | null>>();

  /** The edit button beside the dropdown: open the Shops panel. */
  readonly editShops = output<void>();
  /** An item marked bought (true) or put back on the list (false). */
  readonly boughtChange = output<{ id: string; bought: boolean }>();
  /** A new item name; a name already in the list is revived instead. */
  readonly added = output<string>();
  /** An item restricted to a shop, or to any shop (null). */
  readonly shopChange = output<{ id: string; shopId: string | null }>();

  /** Undefined for All shops. */
  protected readonly shop = computed(() =>
    this.shopId() === ALL_SHOPS ? undefined : findShop(this.shops(), this.shopId()),
  );
  protected readonly ALL_SHOPS = ALL_SHOPS;
  // Local copy, reset whenever the parent passes new items
  private readonly state = linkedSignal(() => this.items());

  protected readonly toBuy = computed(() =>
    orderFor(this.state(), this.shop()),
  );
  protected readonly bought = computed(() => boughtList(this.state()));
  protected readonly hidden = computed(() => hiddenFor(this.state(), this.shop()));

  /** The item shown in the popup, by id so it follows the local state. */
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => this.state().find((x) => x.id === this.selectedId()));

  protected setShop(id: string, shopId: string | null): void {
    this.state.update((items) => items.map((x) => (x.id === id ? { ...x, shopId: shopId ?? undefined } : x)));
    this.shopChange.emit({ id, shopId });
  }

  protected setBought(id: string, bought: boolean): void {
    this.state.update((items) =>
      items.map((x) => (x.id === id ? { ...x, bought, boughtAt: bought ? Date.now() : undefined } : x)),
    );
    this.boughtChange.emit({ id, bought });
  }

  protected add(name: string): void {
    const existing = this.state().find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (existing.bought) {
        this.setBought(existing.id, false);
      }
      return;
    }
    const id = 'n' + Date.now();
    const classify = this.classify();
    this.state.update((items) => [
      ...items,
      { id, name, status: classify ? 'PENDING' : 'UNCLASSIFIED' },
    ]);
    this.added.emit(name);
    if (classify) {
      const done = (aisle: string | null) =>
        this.state.update((items) =>
          items.map((x) =>
            x.id === id
              ? { ...x, aisle: aisle ?? undefined, status: aisle ? 'CLASSIFIED' : 'UNCLASSIFIED' }
              : x,
          ),
        );
      Promise.resolve()
        .then(() => classify(name))
        .then(done, () => done(null));
    }
  }
}
