import { Component, computed, input, output } from '@angular/core';
import { ClassificationStatus } from '../basket';

const DOUBLE_TAP_MS = 400;
const LONG_PRESS_MS = 500;

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
  /** A long press, right click or menu key: open the product details. Never also emits press. */
  readonly longPress = output<void>();

  // ponytail: own double-tap instead of dblclick, which touch browsers don't fire reliably
  private lastTap = 0;
  // ponytail: own long press, iOS Safari fires no contextmenu on touch
  private holdTimer?: ReturnType<typeof setTimeout>;
  private holding = false;
  /** The click that ends a long press is not a tap. */
  private swallowClick = false;

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
  protected pointerDown(e: PointerEvent) {
    this.swallowClick = false;
    if (e.button !== 0) return; // right click goes through contextmenu
    this.holding = true;
    this.holdTimer = setTimeout(() => this.openDetails(), LONG_PRESS_MS);
  }

  /** Released, cancelled (the browser started scrolling) or left the tile. */
  protected pointerEnd() {
    this.holding = false;
    clearTimeout(this.holdTimer);
  }

  protected contextMenu(e: Event) {
    e.preventDefault();
    this.openDetails();
  }

  /** Android also fires contextmenu on a long press, so this may run twice; opening twice is harmless. */
  private openDetails() {
    clearTimeout(this.holdTimer);
    if (this.holding) this.swallowClick = true;
    this.lastTap = 0;
    this.longPress.emit();
  }

  protected tap() {
    if (this.swallowClick) {
      this.swallowClick = false;
      return;
    }
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
