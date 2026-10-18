import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Category, Chain, chainName, ChainProduct, CHAINS, Item, Shop } from '../basket';
import { ShopSelect } from '../shop-select/shop-select';

/**
 * A product's details in a modal: its category, the shop it may be bought at, and its prices at the chains it is
 * linked to. Shown on render; emits closed when dismissed.
 */
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
  /** A chain's products matching a query; rejects when the chain fails. No search without it. */
  readonly searchChain = input<(chain: Chain, query: string) => Promise<ChainProduct[]>>();
  /** The category picked by hand, or null for none. */
  readonly categoryChange = output<string | null>();
  /** The only shop to buy it at, or null for any shop. */
  readonly shopChange = output<string | null>();
  /** A chain product picked from the search, or null to unlink that chain. */
  readonly linkChange = output<{ chain: Chain; product: ChainProduct | null }>();
  /** Closed by the button, Escape or the backdrop. */
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** Not saved yet: a just-added item keeps its local id until the list is refetched. */
  protected readonly local = computed(() => this.item().id.startsWith('n'));

  protected readonly CHAINS = CHAINS;
  protected readonly chainName = chainName;
  /** The chain to search: the first one not linked yet. */
  protected readonly chain = linkedSignal<Chain>(
    () => CHAINS.find((c) => !this.item().links?.some((l) => l.chain === c.id))?.id ?? 'MIGROS',
  );
  /** Null until searched. */
  protected readonly results = signal<ChainProduct[] | null>(null);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);

  constructor() {
    // Native modal: focus trap, Escape and backdrop for free
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected async search(query: string): Promise<void> {
    const search = this.searchChain();
    const chain = this.chain();
    if (!search || !query.trim()) return;
    this.results.set(null);
    this.searchError.set(null);
    this.searching.set(true);
    try {
      this.results.set(await search(chain, query.trim()));
    } catch {
      this.searchError.set(`${chainName(chain)} is unavailable`);
    } finally {
      this.searching.set(false);
    }
  }

  protected pick(product: ChainProduct): void {
    this.results.set(null);
    this.linkChange.emit({ chain: product.chain, product });
  }

  protected unlink(chain: Chain): void {
    this.linkChange.emit({ chain, product: null });
  }

  protected chf(price: number): string {
    return price.toFixed(2);
  }

  /** "2026-10-21" → "21.10.". */
  protected day(iso: string): string {
    const [, month, day] = iso.split('-');
    return `${day}.${month}.`;
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  /** A click on the backdrop lands on the dialog itself, outside its content box. */
  protected backdrop(e: MouseEvent): void {
    if (e.target === this.dialog().nativeElement) this.close();
  }
}
