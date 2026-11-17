import { Location } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, from, map, Observable, of, switchMap } from 'rxjs';
import { ALL_SHOPS, findShop, Item, nearestShop, Shop } from '../basket/basket';
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

type Panel = 'list' | 'shops';

/** `/shop/{id}` is the Shops panel, `/list/{id}` the list on that shop; any other path is the list on All shops. */
function parsePath(path: string): { panel: Panel; shopId?: string } {
  const match = /^\/(list|shop)\/([^/?#]+)/.exec(path);
  return match
    ? { panel: match[1] === 'shop' ? 'shops' : 'list', shopId: decodeURIComponent(match[2]) }
    : { panel: 'list' };
}

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
  private readonly location = inject(Location);
  private readonly opened = parsePath(this.location.path());
  protected readonly panel = signal<Panel>(this.opened.panel);
  /** Shared by both panels; opens on the URL's shop, else on All shops, then the nearby shop if there is one. */
  protected readonly shopId = signal(this.opened.shopId ?? ALL_SHOPS);
  /** The device position, asked once on open; stays unset when refused, unavailable or too slow. */
  private readonly position = signal<GeolocationCoordinates | undefined>(undefined);
  private nearbyChecked = false;
  /** Set while the Shops panel sits on a history entry this page pushed, so its back button can pop it. */
  private pushedShops = false;

  constructor() {
    // Back/Forward. Going back to the list keeps the shop picked in the Shops panel; the URL then follows it
    const popstate = this.location.subscribe(({ url }) => {
      const page = parsePath(url ?? '');
      this.panel.set(page.panel);
      if (page.panel === 'shops') this.shopId.set(page.shopId!);
      else this.pushedShops = false;
    });
    inject(DestroyRef).onDestroy(() => popstate.unsubscribe());
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
   * The URL mirrors the panel and the shop shown, with gone ids corrected to the first shop once the shops load.
   * Opening the Shops panel adds a history entry so Back closes it; everything else replaces the entry.
   */
  private readonly syncUrl = effect(() => {
    if (!this.data()) return;
    const shops = this.panel() === 'shops';
    const id =
      shops || this.shopId() !== ALL_SHOPS ? findShop(this.shops(), this.shopId())?.id : undefined;
    const path = id
      ? `/${shops ? 'shop' : 'list'}/${encodeURIComponent(id)}`
      : shops
        ? '/shop'
        : '/';
    if (this.location.isCurrentPathEqualTo(path)) return;
    if (shops && parsePath(this.location.path()).panel === 'list') {
      this.location.go(path);
      this.pushedShops = true;
    } else {
      this.location.replaceState(path);
    }
  });

  /** The Shops panel's back button: pop the entry it opened with, so Back and this button don't stack. */
  protected closeShops(): void {
    if (this.pushedShops) this.location.back();
    else this.panel.set('list');
  }

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
