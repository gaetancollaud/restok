import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  output,
  signal,
} from '@angular/core';

/** Row height (size-touch, 56px) plus the gap between rows (space-2, 8px). */
const ROW = 64;

/** A shop's categories in walking order: drag a grip (or press ↑/↓ on it) to reorder, edit a name to rename, × twice to delete. */
@Component({
  selector: 'app-category-list',
  templateUrl: './category-list.html',
  styleUrl: './category-list.css',
})
export class CategoryList {
  /** Unique names in order; bind with [(categories)]. */
  readonly categories = model.required<string[]>();
  readonly label = input('Category order');
  readonly emptyText = input('No categories yet. Add one below.');
  /** Delete this category, confirmed by a second tap on ×. */
  readonly remove = output<string>();
  readonly rename = output<{ from: string; to: string }>();

  /** The category whose × waits for its second tap. */
  protected readonly confirming = signal<string | null>(null);
  private confirmTimer?: ReturnType<typeof setTimeout>;

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly injector = inject(Injector);

  /** The row being dragged and how far the pointer moved from where it started. */
  protected readonly drag = signal<{ from: number; dy: number } | null>(null);
  private startY = 0;
  /** Where the dragged row would land. */
  private readonly over = computed(() => {
    const d = this.drag();
    return d ? this.clamp(d.from + Math.round(d.dy / ROW)) : -1;
  });

  /** The dragged row follows the pointer; the rows it passes slide one row the other way. */
  protected offset(i: number): number {
    const d = this.drag();
    if (!d) return 0;
    if (i === d.from) return d.dy;
    const over = this.over();
    if (d.from < over && i > d.from && i <= over) return -ROW;
    if (d.from > over && i >= over && i < d.from) return ROW;
    return 0;
  }

  /** The number a row will have once dropped. */
  protected position(i: number): number {
    const d = this.drag();
    if (d && i === d.from) return this.over() + 1;
    return i + 1 + Math.sign(this.offset(i));
  }

  protected down(i: number, e: PointerEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    this.startY = e.clientY;
    this.drag.set({ from: i, dy: 0 });
  }

  protected movePointer(e: PointerEvent): void {
    const d = this.drag();
    if (d) this.drag.set({ from: d.from, dy: e.clientY - this.startY });
  }

  protected up(): void {
    const d = this.drag();
    if (!d) return;
    const to = this.over();
    this.drag.set(null);
    this.move(d.from, to);
  }

  protected cancel(): void {
    this.drag.set(null);
  }

  protected key(i: number, e: KeyboardEvent): void {
    const to = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : -1;
    if (to < 0 || to >= this.categories().length) return;
    e.preventDefault();
    this.move(i, to);
    // Moving the row re-inserts it, which drops focus: put it back on the moved grip
    afterNextRender(() => this.host.nativeElement.querySelectorAll<HTMLElement>('.handle')[to]?.focus(), {
      injector: this.injector,
    });
  }

  /** × asks for a second tap within 4 s, then emits remove. */
  protected tapRemove(name: string): void {
    clearTimeout(this.confirmTimer);
    if (this.confirming() === name) {
      this.confirming.set(null);
      this.remove.emit(name);
      return;
    }
    this.confirming.set(name);
    this.confirmTimer = setTimeout(() => this.confirming.set(null), 4000);
  }

  /** Emits the new name and puts the bound one back: the parent's refetch shows what was saved. */
  protected changeName(from: string, field: HTMLInputElement): void {
    const to = field.value.trim();
    field.value = from;
    if (to !== from) this.rename.emit({ from, to });
  }

  private move(from: number, to: number): void {
    if (from === to) return;
    const next = [...this.categories()];
    next.splice(to, 0, ...next.splice(from, 1));
    this.categories.set(next);
  }

  private clamp(i: number): number {
    return Math.max(0, Math.min(this.categories().length - 1, i));
  }
}
