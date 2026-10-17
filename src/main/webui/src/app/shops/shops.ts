import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';
import {
  AddShopGQL,
  CategoriesGQL,
  DeleteShopGQL,
  SetShopCategoryOrderGQL,
  ShopsGQL,
  ShopsQuery,
  UpdateShopGQL,
} from '../graphql/generated';

type Shop = ShopsQuery['shops'][number];
type Category = { id: string; name: string };

const REFETCH = { refetchQueries: ['Shops'], awaitRefetchQueries: true };

@Component({
  selector: 'app-shops',
  templateUrl: './shops.html',
  styleUrl: './shops.css',
})
export class Shops {
  private readonly addGql = inject(AddShopGQL);
  private readonly updateGql = inject(UpdateShopGQL);
  private readonly deleteGql = inject(DeleteShopGQL);
  private readonly orderGql = inject(SetShopCategoryOrderGQL);

  protected readonly shops = toSignal(
    inject(ShopsGQL)
      .watch()
      .valueChanges.pipe(map((r) => (r.data?.shops ?? []) as Shop[])),
    { initialValue: [] },
  );
  private readonly categories = toSignal(
    inject(CategoriesGQL)
      .watch()
      .valueChanges.pipe(map((r) => (r.data?.categories ?? []) as Category[])),
    { initialValue: [] },
  );
  /** Unsaved category orders, by shop id. */
  private readonly drafts = signal<Record<string, Category[]>>({});
  protected readonly error = signal<string | null>(null);

  protected order(shop: Shop): Category[] {
    return this.drafts()[shop.id] ?? shop.categoryOrder;
  }

  protected unordered(shop: Shop): Category[] {
    const ordered = new Set(this.order(shop).map((c) => c.id));
    return this.categories().filter((c) => !ordered.has(c.id));
  }

  protected move(shop: Shop, i: number, delta: number): void {
    const next = [...this.order(shop)];
    [next[i], next[i + delta]] = [next[i + delta], next[i]];
    this.setDraft(shop, next);
  }

  protected drop(shop: Shop, i: number): void {
    this.setDraft(
      shop,
      this.order(shop).filter((_, j) => j !== i),
    );
  }

  protected append(shop: Shop, categoryId: string): void {
    const category = this.categories().find((c) => c.id === categoryId);
    if (category) {
      this.setDraft(shop, [...this.order(shop), category]);
    }
  }

  protected saveOrder(shop: Shop): void {
    const categoryIds = this.order(shop).map((c) => c.id);
    this.run(
      this.orderGql.mutate({ variables: { shopId: shop.id, categoryIds }, ...REFETCH }),
      () => this.drafts.update(({ [shop.id]: _, ...rest }) => rest),
    );
  }

  protected add(name: HTMLInputElement, lat: HTMLInputElement, lon: HTMLInputElement): void {
    const variables = {
      name: name.value,
      latitude: Number(lat.value),
      longitude: Number(lon.value),
    };
    this.run(this.addGql.mutate({ variables, ...REFETCH }), () => {
      name.value = lat.value = lon.value = '';
    });
  }

  protected update(
    shop: Shop,
    name: HTMLInputElement,
    lat: HTMLInputElement,
    lon: HTMLInputElement,
  ): void {
    const variables = {
      id: shop.id,
      name: name.value,
      latitude: Number(lat.value),
      longitude: Number(lon.value),
    };
    this.run(this.updateGql.mutate({ variables, ...REFETCH }));
  }

  protected remove(shop: Shop): void {
    this.run(this.deleteGql.mutate({ variables: { id: shop.id }, ...REFETCH }));
  }

  private setDraft(shop: Shop, order: Category[]): void {
    this.drafts.update((drafts) => ({ ...drafts, [shop.id]: order }));
  }

  private run(op: Observable<unknown>, done?: () => void): void {
    op.subscribe({
      next: () => {
        this.error.set(null);
        done?.();
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }
}
