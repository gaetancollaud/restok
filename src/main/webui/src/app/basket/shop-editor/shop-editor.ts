import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  input,
  linkedSignal,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AddBar } from '../add-bar/add-bar';
import { findShop, Shop } from '../basket';
import { CategoryList } from '../category-list/category-list';

/**
 * The Shops panel: pick a shop, rename it, add or delete shops, and set its category order.
 * Edits show at once on a local copy; each output is one change for the parent to save.
 */
@Component({
  selector: 'app-shop-editor',
  imports: [AddBar, CategoryList],
  templateUrl: './shop-editor.html',
  styleUrl: './shop-editor.css',
})
export class ShopEditor {
  readonly shops = input.required<Shop[]>();
  /** Selected shop id, shared with the list; the first shop when unset or gone. */
  readonly shopId = model('');

  readonly back = output<void>();
  /** Create a "New shop" with this order (a copy of the selected shop's), then select it via shopId. */
  readonly addShop = output<string[]>();
  readonly rename = output<{ id: string; name: string }>();
  readonly remove = output<string>();
  /** The shop's whole new category order, as names. */
  readonly orderChange = output<{ id: string; aisles: string[] }>();

  // Local copy, reset whenever the parent passes new shops
  protected readonly state = linkedSignal(() => this.shops());
  protected readonly shop = computed(() => findShop(this.state(), this.shopId()));
  /** Delete asks for a second tap within 4 s. */
  protected readonly confirming = signal(false);
  private confirmTimer?: ReturnType<typeof setTimeout>;

  private readonly nameField = viewChild<ElementRef<HTMLInputElement>>('name');
  /** Set by "New shop": focus the Name field once a different shop is selected. */
  private focusAfter?: string;

  constructor() {
    afterRenderEffect(() => {
      const id = this.shop()?.id;
      const field = this.nameField()?.nativeElement;
      if (this.focusAfter !== undefined && id !== this.focusAfter && field) {
        this.focusAfter = undefined;
        field.focus();
        field.select();
      }
    });
  }

  protected select(id: string): void {
    this.shopId.set(id);
    this.confirm(false);
  }

  protected newShop(): void {
    this.focusAfter = this.shop()?.id ?? '';
    this.addShop.emit([...(this.shop()?.aisles ?? [])]);
  }

  /** Updates the field as you type; saved on change (blur or Enter). */
  protected typeName(name: string): void {
    this.patch({ name });
  }

  protected saveName(): void {
    const shop = this.shop();
    if (shop) this.rename.emit({ id: shop.id, name: shop.name });
  }

  protected setOrder(aisles: string[]): void {
    const shop = this.shop();
    if (!shop) return;
    this.patch({ aisles });
    this.orderChange.emit({ id: shop.id, aisles });
  }

  /** Appends a category; a name already in the order (ignoring case) is ignored. */
  protected addCategory(name: string): void {
    const aisles = this.shop()?.aisles ?? [];
    if (!aisles.some((c) => c.toLowerCase() === name.toLowerCase())) {
      this.setOrder([...aisles, name]);
    }
  }

  protected deleteShop(): void {
    const shop = this.shop();
    if (!shop) return;
    if (!this.confirming()) {
      this.confirm(true);
      return;
    }
    this.confirm(false);
    this.state.update((shops) => shops.filter((s) => s.id !== shop.id));
    this.shopId.set(this.state()[0]?.id ?? '');
    this.remove.emit(shop.id);
  }

  private patch(change: Partial<Shop>): void {
    const id = this.shop()?.id;
    this.state.update((shops) => shops.map((s) => (s.id === id ? { ...s, ...change } : s)));
  }

  private confirm(on: boolean): void {
    clearTimeout(this.confirmTimer);
    this.confirming.set(on);
    if (on) this.confirmTimer = setTimeout(() => this.confirming.set(false), 4000);
  }
}
