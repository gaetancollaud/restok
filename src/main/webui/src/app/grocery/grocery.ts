import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';
import { Item, Shop } from '../basket/basket';
import { GroceryScreen } from '../basket/grocery-screen/grocery-screen';
import { AddProductGQL, GroceryGQL, GroceryQuery, SetProductBoughtGQL } from '../graphql/generated';

/** The app's only page: GroceryScreen fed from GraphQL. */
@Component({
  selector: 'app-grocery',
  imports: [GroceryScreen],
  templateUrl: './grocery.html',
  styleUrl: './grocery.css',
})
export class Grocery {
  private readonly addGql = inject(AddProductGQL);
  private readonly boughtGql = inject(SetProductBoughtGQL);
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
    })),
  );
  protected readonly items = computed<Item[]>(() =>
    (this.data()?.products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      aisle: p.category?.name,
      status: p.classification,
      bought: p.bought,
      boughtAt: p.boughtAt ? Date.parse(p.boughtAt) : undefined,
    })),
  );
  protected readonly error = signal<string | null>(null);

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

  protected add(name: string): void {
    this.run(
      this.addGql.mutate({
        variables: { name },
        refetchQueries: ['Grocery'],
        awaitRefetchQueries: true,
      }),
    );
  }

  private run(op: Observable<unknown>): void {
    op.subscribe({
      next: () => this.error.set(null),
      error: (e: Error) => this.error.set(e.message),
    });
  }
}
