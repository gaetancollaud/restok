import { afterNextRender, Component, computed, ElementRef, input, output, viewChild } from '@angular/core';
import { Item, Shop } from '../basket';
import { ShopSelect } from '../shop-select/shop-select';

/** A product's details in a modal, with the shop it may be bought at. Shown on render; emits closed when dismissed. */
@Component({
  selector: 'app-product-popup',
  imports: [ShopSelect],
  templateUrl: './product-popup.html',
  styleUrl: './product-popup.css',
})
export class ProductPopup {
  readonly item = input.required<Item>();
  readonly shops = input.required<Shop[]>();
  /** The only shop to buy it at, or null for any shop. */
  readonly shopChange = output<string | null>();
  /** Closed by the button, Escape or the backdrop. */
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** Not saved yet: a just-added item keeps its local id until the list is refetched. */
  protected readonly local = computed(() => this.item().id.startsWith('n'));
  protected readonly categoryText = computed(() => {
    switch (this.item().status) {
      case 'CLASSIFIED':
        return this.item().aisle ?? 'Has a category';
      case 'PENDING':
        return 'Sorting into a category…';
      default:
        return 'No category';
    }
  });

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
