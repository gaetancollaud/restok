import { Component, input, model } from '@angular/core';
import { Shop } from '../basket';

/** Full-width shop dropdown on a native select, so phones show their own picker. */
@Component({
  selector: 'app-shop-select',
  templateUrl: './shop-select.html',
  styleUrl: './shop-select.css',
})
export class ShopSelect {
  readonly shops = input.required<Shop[]>();
  /** Selected shop id; bind with [(value)]. */
  readonly value = model('');
  readonly label = input('Shop');
  /** When set, a first option with this text and the value ''. */
  readonly emptyLabel = input<string>();
}
