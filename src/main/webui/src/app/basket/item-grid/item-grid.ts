import { booleanAttribute, Component, input } from '@angular/core';

/** Responsive grid of square ItemTiles, as many columns as fit. Children come already ordered. */
@Component({
  selector: 'app-item-grid',
  templateUrl: './item-grid.html',
  styleUrl: './item-grid.css',
  host: { role: 'list', '[attr.aria-label]': 'label()', '[class.compact]': 'compact()' },
})
export class ItemGrid {
  /** Accessible name of the list, e.g. "To buy" or "Bought". */
  readonly label = input<string>();
  /** Smaller tiles and gaps, for the Bought list. */
  readonly compact = input(false, { transform: booleanAttribute });
}
