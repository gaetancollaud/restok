import { Component, computed, input, output } from '@angular/core';
import { ClassificationStatus } from '../basket';

const DOUBLE_TAP_MS = 400;

/** A square, tappable grocery item. Place it inside an ItemGrid. */
@Component({
  selector: 'app-item-tile',
  templateUrl: './item-tile.html',
  styleUrl: './item-tile.css',
  host: { role: 'listitem' },
})
export class ItemTile {
  readonly name = input.required<string>();
  /** Quantity such as "2 ×" or "500 g". Shown on To-buy tiles only. */
  readonly meta = input<string>();
  /** "tobuy": tapping marks it bought. "bought": tapping adds it back to the list. */
  readonly variant = input<'tobuy' | 'bought'>('tobuy');
  /** Category state, shown as the dot in the top-right corner. No dot when unset. */
  readonly status = input<ClassificationStatus>();
  /** The category name, for the dot's tooltip and the accessible label when classified. */
  readonly category = input<string>();
  /** To-buy tiles emit on a second tap within DOUBLE_TAP_MS, so a stray tap doesn't buy; Bought tiles on every tap. */
  readonly press = output<void>();

  // ponytail: own double-tap instead of dblclick, which touch browsers don't fire reliably
  private lastTap = 0;

  protected readonly bought = computed(() => this.variant() === 'bought');
  /** The dot is never the only cue: the label names the state too. */
  private readonly state = computed(() => {
    switch (this.status()) {
      case 'CLASSIFIED':
        return this.category() ?? 'category';
      case 'PENDING':
        return 'sorting into a category';
      case 'UNCLASSIFIED':
        return 'no category';
      default:
        return undefined;
    }
  });
  /** The light text left of the dot: the category, or what is happening instead. Not on Bought tiles. */
  protected readonly categoryText = computed(() => {
    if (this.bought()) return '';
    switch (this.status()) {
      case 'PENDING':
        return 'Sorting…';
      case 'UNCLASSIFIED':
        return 'No category';
      default:
        return this.category() ?? '';
    }
  });
  protected readonly hasTop = computed(() => !!(this.categoryText() || this.status() || this.bought()));
  protected readonly dotTitle = computed(() => {
    switch (this.status()) {
      case 'CLASSIFIED':
        return this.category() ? `Category: ${this.category()}` : 'Has a category';
      case 'PENDING':
        return 'Sorting into a category…';
      default:
        return 'No category';
    }
  });
  protected tap() {
    const now = Date.now();
    if (this.bought() || now - this.lastTap < DOUBLE_TAP_MS) {
      this.lastTap = 0;
      this.press.emit();
    } else {
      this.lastTap = now;
    }
  }

  protected readonly ariaLabel = computed(() => {
    const state = this.state() ? ', ' + this.state() : '';
    return this.bought()
      ? `Add ${this.name()} again${state}`
      : `${this.name()}${this.meta() ? ', ' + this.meta() : ''}${state}, tap twice to mark as bought`;
  });
}
