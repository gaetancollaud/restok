import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';
import {
  AddCategoryGQL,
  CategoriesGQL,
  CategoriesQuery,
  DeleteCategoryGQL,
  RenameCategoryGQL,
} from '../graphql/generated';

type Category = CategoriesQuery['categories'][number];

const REFETCH = { refetchQueries: ['Categories'], awaitRefetchQueries: true };

@Component({
  selector: 'app-categories',
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories {
  private readonly addGql = inject(AddCategoryGQL);
  private readonly renameGql = inject(RenameCategoryGQL);
  private readonly deleteGql = inject(DeleteCategoryGQL);

  protected readonly categories = toSignal(
    inject(CategoriesGQL)
      .watch()
      .valueChanges.pipe(map((r) => (r.data?.categories ?? []) as Category[])),
    { initialValue: [] },
  );
  protected readonly error = signal<string | null>(null);

  protected add(input: HTMLInputElement): void {
    this.run(
      this.addGql.mutate({ variables: { name: input.value }, ...REFETCH }),
      () => (input.value = ''),
    );
  }

  protected rename(category: Category, input: HTMLInputElement): void {
    this.run(
      this.renameGql.mutate({ variables: { id: category.id, name: input.value }, ...REFETCH }),
      undefined,
      () => (input.value = category.name),
    );
  }

  protected remove(category: Category): void {
    this.run(this.deleteGql.mutate({ variables: { id: category.id }, ...REFETCH }));
  }

  private run(op: Observable<unknown>, done?: () => void, failed?: () => void): void {
    op.subscribe({
      next: () => {
        this.error.set(null);
        done?.();
      },
      error: (e: Error) => {
        this.error.set(e.message);
        failed?.();
      },
    });
  }
}
