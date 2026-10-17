import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';
import {
  AddProductGQL,
  CategoriesGQL,
  DeleteProductGQL,
  ProductClassification,
  ProductsGQL,
  ProductsQuery,
  SetProductBoughtGQL,
  SetProductCategoryGQL,
  ShopsGQL,
} from '../graphql/generated';

type Product = ProductsQuery['products'][number];
type Named = { id: string; name: string };

const REFETCH = { refetchQueries: ['Products'], awaitRefetchQueries: true };

@Component({
  selector: 'app-list',
  templateUrl: './list.html',
  styleUrl: './list.css',
})
export class List {
  private readonly addGql = inject(AddProductGQL);
  private readonly boughtGql = inject(SetProductBoughtGQL);
  private readonly categoryGql = inject(SetProductCategoryGQL);
  private readonly deleteGql = inject(DeleteProductGQL);
  private readonly productsRef = inject(ProductsGQL).watch();

  protected readonly pending: ProductClassification = 'PENDING';
  protected readonly products = toSignal(
    this.productsRef.valueChanges.pipe(map((r) => (r.data?.products ?? []) as Product[])),
    { initialValue: [] },
  );
  protected readonly shops = toSignal(
    inject(ShopsGQL)
      .watch()
      .valueChanges.pipe(map((r) => (r.data?.shops ?? []) as Named[])),
    { initialValue: [] },
  );
  protected readonly categories = toSignal(
    inject(CategoriesGQL)
      .watch()
      .valueChanges.pipe(map((r) => (r.data?.categories ?? []) as Named[])),
    { initialValue: [] },
  );
  protected readonly error = signal<string | null>(null);

  /** Re-fetch while the AI is still classifying, so categories appear without a reload. */
  private readonly pollWhilePending = effect(() =>
    this.products().some((p) => p.classification === this.pending)
      ? this.productsRef.startPolling(2000)
      : this.productsRef.stopPolling(),
  );

  protected selectShop(shopId: string): void {
    this.productsRef.refetch({ shopId: shopId || null });
  }

  protected add(input: HTMLInputElement): void {
    this.run(
      this.addGql.mutate({ variables: { name: input.value }, ...REFETCH }),
      () => (input.value = ''),
    );
  }

  protected setBought(product: Product, bought: boolean): void {
    this.run(this.boughtGql.mutate({ variables: { id: product.id, bought } }));
  }

  protected setCategory(product: Product, categoryId: string): void {
    // refetch: the product may move in the shop's order
    this.run(
      this.categoryGql.mutate({
        variables: { id: product.id, categoryId: categoryId || null },
        ...REFETCH,
      }),
    );
  }

  protected remove(product: Product): void {
    this.run(this.deleteGql.mutate({ variables: { id: product.id }, ...REFETCH }));
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
