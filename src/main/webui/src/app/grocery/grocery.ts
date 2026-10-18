import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, from, map, Observable, of, switchMap } from 'rxjs';
import { ALL_SHOPS, Item, nearestShop, Shop } from '../basket/basket';
import { GroceryScreen } from '../basket/grocery-screen/grocery-screen';
import { ShopEditor } from '../basket/shop-editor/shop-editor';
import {
  AddCategoryGQL,
  AddProductGQL,
  AddShopGQL,
  DeleteProductGQL,
  DeleteShopGQL,
  GroceryGQL,
  GroceryQuery,
  SetProductBoughtGQL,
  SetProductCategoryGQL,
  SetProductShopGQL,
  SetShopCategoryOrderGQL,
  UpdateShopGQL,
} from '../graphql/generated';

/** The app's only page: the list (GroceryScreen) and the Shops panel (ShopEditor), fed from GraphQL. */
@Component({
  selector: 'app-grocery',
  imports: [GroceryScreen, ShopEditor],
  templateUrl: './grocery.html',
  styleUrl: './grocery.css',
})
export class Grocery {
  private readonly addGql = inject(AddProductGQL);
  private readonly boughtGql = inject(SetProductBoughtGQL);
  private readonly productShopGql = inject(SetProductShopGQL);
  private readonly productCategoryGql = inject(SetProductCategoryGQL);
  private readonly deleteProductGql = inject(DeleteProductGQL);
  private readonly addShopGql = inject(AddShopGQL);
  private readonly updateShopGql = inject(UpdateShopGQL);
  private readonly deleteShopGql = inject(DeleteShopGQL);
  private readonly orderGql = inject(SetShopCategoryOrderGQL);
  private readonly addCategoryGql = inject(AddCategoryGQL);
  private readonly groceryRef = inject(GroceryGQL).watch();

  private readonly data = toSignal(
    this.groceryRef.valueChanges.pipe(map((r) => r.data as GroceryQuery | undefined)),
  );

  /** A shop's aisles are its category names, in its order. */
  protected readonly shops = computed<Shop[]>(() =>
    (this.data()?.shops ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      aisles: s.categoryOrder.map((c) => c.name),
      latitude: s.latitude ?? undefined,
      longitude: s.longitude ?? undefined,
    })),
  );
  protected readonly items = computed<Item[]>(() =>
    (this.data()?.products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      aisle: p.category?.name,
      categoryId: p.category?.id,
      status: p.classification,
      bought: p.bought,
      boughtAt: p.boughtAt ? Date.parse(p.boughtAt) : undefined,
      shopId: p.shop?.id,
    })),
  );
  protected readonly categories = computed(() => this.data()?.categories ?? []);
  protected readonly error = signal<string | null>(null);
  protected readonly panel = signal<'list' | 'shops'>('list');
  /** Shared by both panels; opens on All shops, then the nearby shop if there is one. */
  protected readonly shopId = signal(ALL_SHOPS);
  /** The device position, asked once on open; stays unset when refused, unavailable or too slow. */
  private readonly position = signal<GeolocationCoordinates | undefined>(undefined);
  private nearbyChecked = false;

  constructor() {
    navigator.geolocation?.getCurrentPosition(
      (p) => this.position.set(p.coords),
      () => undefined,
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }

  /** Once the position and the shops are both known, select the nearest shop, unless one was picked by hand. */
  private readonly selectNearby = effect(() => {
    const position = this.position();
    if (this.nearbyChecked || !position || !this.data()) return;
    this.nearbyChecked = true;
    const shop = nearestShop(this.shops(), position.latitude, position.longitude);
    if (shop && untracked(this.shopId) === ALL_SHOPS) this.shopId.set(shop.id);
  });

  /**
   * Classification runs on the server and arrives with the polled data, so this never settles:
   * it only makes a new tile start PENDING instead of UNCLASSIFIED until the refetch.
   */
  protected readonly serverClassifies = () => new Promise<string | null>(() => undefined);

  /** Re-fetch while the AI is still classifying, so new tiles move to their aisle without a reload. */
  private readonly pollWhilePending = effect(() =>
    (this.data()?.products ?? []).some((p) => p.classification === 'PENDING')
      ? this.groceryRef.startPolling(2000)
      : this.groceryRef.stopPolling(),
  );

  protected setBought(change: { id: string; bought: boolean }): void {
    // The response updates the cached product, which re-renders the screen
    this.run(this.boughtGql.mutate({ variables: change }));
  }

  protected setProductShop(change: { id: string; shopId: string | null }): void {
    this.run(this.productShopGql.mutate({ variables: change }));
  }

  protected setProductCategory(change: { id: string; categoryId: string | null }): void {
    this.run(this.productCategoryGql.mutate({ variables: change }));
  }

  protected removeProduct(id: string): void {
    this.save(this.deleteProductGql.mutate({ variables: { id } }));
  }

  protected add(name: string): void {
    this.run(
      this.addGql.mutate({
        variables: { name },
        refetchQueries: ['Grocery'],
        awaitRefetchQueries: true,
      }),
    );
  }

  /** A new shop with a copy of the selected shop's order, then selected. */
  protected addShop(aisles: string[]): void {
    this.save(
      this.addShopGql.mutate({ variables: { name: 'New shop' } }).pipe(
        map((r) => r.data!.addShop.id),
        switchMap((id) => (aisles.length ? this.order(id, aisles) : of(null)).pipe(map(() => id))),
      ),
      (id) => this.shopId.set(id),
    );
  }

  /** Keeps the shop's location, which the panel doesn't edit. */
  protected rename({ id, name }: { id: string; name: string }): void {
    const shop = this.data()?.shops.find((s) => s.id === id);
    this.save(
      this.updateShopGql.mutate({
        variables: { id, name, latitude: shop?.latitude, longitude: shop?.longitude },
      }),
    );
  }

  protected removeShop(id: string): void {
    this.save(this.deleteShopGql.mutate({ variables: { id } }));
  }

  protected setOrder({ id, aisles }: { id: string; aisles: string[] }): void {
    this.save(this.order(id, aisles));
  }

  /** Saves an order of category names, creating the ones that don't exist yet (names match ignoring case). */
  private order(shopId: string, names: string[]): Observable<unknown> {
    const ids = new Map((this.data()?.categories ?? []).map((c) => [c.name.toLowerCase(), c.id]));
    const missing = names.filter((n) => !ids.has(n.toLowerCase()));
    const created = missing.map((name) =>
      this.addCategoryGql
        .mutate({ variables: { name } })
        .pipe(map((r) => ids.set(name.toLowerCase(), r.data!.addCategory.id))),
    );
    const ready: Observable<unknown> = created.length ? forkJoin(created) : of(null);
    return ready.pipe(
      switchMap(() =>
        this.orderGql.mutate({
          variables: { shopId, categoryIds: names.map((n) => ids.get(n.toLowerCase())!) },
        }),
      ),
    );
  }

  /** Runs a shop edit, then reloads everything so both panels show the saved state. */
  private save<T>(op: Observable<T>, done?: (result: T) => void): void {
    this.run(
      op.pipe(
        switchMap((result) => from(this.groceryRef.refetch()).pipe(map(() => done?.(result)))),
      ),
    );
  }

  private run(op: Observable<unknown>): void {
    op.subscribe({
      next: () => this.error.set(null),
      error: (e: Error) => this.error.set(e.message),
    });
  }
}
