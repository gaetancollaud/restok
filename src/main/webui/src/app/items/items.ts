import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AddItemGQL, ItemsGQL } from '../graphql/generated';

@Component({
  selector: 'app-items',
  template: `
    <form (submit)="$event.preventDefault(); add(name)">
      <input #name aria-label="Item name" placeholder="Item name" required />
      <button type="submit">Add</button>
    </form>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    <ul>
      @for (item of items(); track item.id) {
        <li>{{ item.name }}</li>
      }
    </ul>
  `,
})
export class Items {
  private readonly addItemGql = inject(AddItemGQL);

  protected readonly items = toSignal(
    inject(ItemsGQL)
      .watch()
      .valueChanges.pipe(map((r) => r.data?.items ?? [])),
    { initialValue: [] },
  );
  protected readonly error = signal<string | null>(null);

  protected add(input: HTMLInputElement): void {
    this.addItemGql
      .mutate({
        variables: { name: input.value },
        refetchQueries: ['Items'],
        awaitRefetchQueries: true,
      })
      .subscribe({
        next: () => {
          input.value = '';
          this.error.set(null);
        },
        error: (e: Error) => this.error.set(e.message),
      });
  }
}
