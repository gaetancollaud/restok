import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { AddBar } from '../add-bar/add-bar';
import { boughtList, Item, orderFor, Shop } from '../basket';
import { ItemGrid } from '../item-grid/item-grid';
import { ItemTile } from '../item-tile/item-tile';
import { ShopSelect } from '../shop-select/shop-select';

/**
 * The whole list on one screen: shop dropdown, To-buy grid, Bought grid, add bar.
 * Holds the selected shop and bought state itself; the outputs let a parent persist the changes.
 */
@Component({
  selector: 'app-grocery-screen',
  imports: [ShopSelect, ItemGrid, ItemTile, AddBar],
  templateUrl: './grocery-screen.html',
  styleUrl: './grocery-screen.css',
})
export class GroceryScreen {
  readonly shops = input.required<Shop[]>();
  readonly items = input.required<Item[]>();
  readonly initialShop = input<string>();
  /**
   * Picks a category (one of the aisles) for a new item, or null. New items show PENDING until it settles;
   * without it they start UNCLASSIFIED.
   */
  readonly classify = input<(name: string) => Promise<string | null>>();

  readonly shopChange = output<string>();
  /** An item marked bought (true) or put back on the list (false). */
  readonly boughtChange = output<{ id: string; bought: boolean }>();
  /** A new item name; a name already in the list is revived instead. */
  readonly added = output<string>();

  // Kept across refreshed shop lists while the selected shop still exists
  protected readonly shopId = linkedSignal<Shop[], string>({
    source: () => this.shops(),
    computation: (shops, previous) =>
      previous && shops.some((s) => s.id === previous.value)
        ? previous.value
        : (this.initialShop() ?? shops[0]?.id ?? ''),
  });
  // Local copy, reset whenever the parent passes new items
  private readonly state = linkedSignal(() => this.items());

  protected readonly toBuy = computed(() =>
    orderFor(this.state(), this.shops().find((s) => s.id === this.shopId())),
  );
  protected readonly bought = computed(() => boughtList(this.state()));

  protected selectShop(id: string): void {
    this.shopId.set(id);
    this.shopChange.emit(id);
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
