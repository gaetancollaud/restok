import { afterNextRender, Component, computed, ElementRef, input, output, viewChild } from '@angular/core';
import { Category, Item, Shop } from '../basket';
import { ShopSelect } from '../shop-select/shop-select';

/** A product's details in a modal, with its category and the shop it may be bought at. Shown on render; emits closed when dismissed. */
@Component({
  selector: 'app-product-popup',
  imports: [ShopSelect],
  templateUrl: './product-popup.html',
  styleUrl: './product-popup.css',
})
export class ProductPopup {
  readonly item = input.required<Item>();
  readonly shops = input.required<Shop[]>();
  readonly categories = input<Category[]>([]);
  /** The category picked by hand, or null for none. */
  readonly categoryChange = output<string | null>();
  /** The only shop to buy it at, or null for any shop. */
  readonly shopChange = output<string | null>();
  /** Closed by the button, Escape or the backdrop. */
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** Not saved yet: a just-added item keeps its local id until the list is refetched. */
  protected readonly local = computed(() => this.item().id.startsWith('n'));
  constructor() {
    // Native modal: focus trap, Escape and backdrop for free
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  /** A click on the backdrop lands on the dialog itself, outside its content box. */
  protected backdrop(e: MouseEvent): void {
    if (e.target === this.dialog().nativeElement) this.close();
  }
}
