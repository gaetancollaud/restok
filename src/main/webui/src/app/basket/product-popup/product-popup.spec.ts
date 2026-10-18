import { TestBed } from '@angular/core/testing';
import { Category, ChainProduct, Item, Shop } from '../basket';
import { ProductPopup } from './product-popup';

describe('ProductPopup', () => {
  const shops: Shop[] = [
    { id: 'coop', name: 'Coop' },
    { id: 'lidl', name: 'Lidl' },
  ];
  const categories: Category[] = [
    { id: 'fromage', name: 'Fromage' },
    { id: 'fruits', name: 'Fruits' },
  ];

  async function render(item: Item) {
    const fixture = TestBed.createComponent(ProductPopup);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('shops', shops);
    fixture.componentRef.setInput('categories', categories);
    await fixture.whenStable();
    const changes: (string | null)[] = [];
    const categoryChanges: (string | null)[] = [];
    fixture.componentInstance.shopChange.subscribe((v) => changes.push(v));
    fixture.componentInstance.categoryChange.subscribe((v) => categoryChanges.push(v));
    const el = fixture.nativeElement as HTMLElement;
    const shopSelect = () => el.querySelector<HTMLSelectElement>('select[aria-label="Buy only at"]')!;
    const categorySelect = () => el.querySelector<HTMLSelectElement>('select[aria-label="Category"]')!;
    const pick = (select: HTMLSelectElement, value: string) => {
      select.value = value;
      select.dispatchEvent(new Event('change'));
    };
    return { el, changes, categoryChanges, shopSelect, categorySelect, pick };
  }

  const options = (select: HTMLSelectElement) => Array.from(select.options).map((o) => o.text.trim());

  it('shows the product and "Any shop" when it has no shop', async () => {
    const { el, shopSelect } = await render({ id: '1', name: 'Parmesan', aisle: 'Fromage', categoryId: 'fromage', status: 'CLASSIFIED' });
    expect(el.querySelector('dialog')!.open).toBe(true);
    expect(el.querySelector('h2')!.textContent).toBe('Parmesan');
    expect(options(shopSelect())).toEqual(['Any shop', 'Coop', 'Lidl']);
    expect(shopSelect().value).toBe('');
  });

  it('emits the picked shop, and null for "Any shop"', async () => {
    const { changes, shopSelect, pick } = await render({ id: '1', name: 'Parmesan', shopId: 'lidl' });
    expect(shopSelect().value).toBe('lidl');
    pick(shopSelect(), 'coop');
    pick(shopSelect(), '');
    expect(changes).toEqual(['coop', null]);
  });

  it('shows the current category, "No category" first', async () => {
    const { el, categorySelect } = await render({ id: '1', name: 'Parmesan', aisle: 'Fromage', categoryId: 'fromage', status: 'CLASSIFIED' });
    expect(options(categorySelect())).toEqual(['No category', 'Fromage', 'Fruits']);
    expect(categorySelect().value).toBe('fromage');
    expect(el.querySelector('.cat')).toBeNull();
  });

  it('shows "No category" for an unclassified product', async () => {
    const { categorySelect } = await render({ id: '1', name: 'Bougies', status: 'UNCLASSIFIED' });
    expect(categorySelect().value).toBe('');
  });

  it('emits the picked category, and null for "No category"', async () => {
    const { categoryChanges, categorySelect, pick } = await render({ id: '1', name: 'Tomato', categoryId: 'fruits', status: 'CLASSIFIED' });
    pick(categorySelect(), 'fromage');
    pick(categorySelect(), '');
    expect(categoryChanges).toEqual(['fromage', null]);
  });

  it('says it is sorting while pending, and still offers the dropdown', async () => {
    const { el, categorySelect } = await render({ id: '1', name: 'Gruyère', status: 'PENDING' });
    expect(el.querySelector('.cat')!.textContent).toBe('Sorting into a category…');
    expect(categorySelect().value).toBe('');
  });

  it('has no dropdown before a new product is saved', async () => {
    const { el } = await render({ id: 'n123', name: 'Parmesan', status: 'PENDING' });
    expect(el.querySelector('select')).toBeNull();
  });

  describe('prices', () => {
    const salad: ChainProduct = { chain: 'MIGROS' as const, code: '100068039', name: 'Kopfsalat', description: 'Laitue pommée · XL', quantity: '350g', price: 2.95, url: 'https://www.migros.ch/fr/product/131043300000', sale: { label: 'Hit', price: 2.95, endDate: '2026-10-21' } };
    const milk: ChainProduct = {
      chain: 'COOP', code: '4446520', name: 'Lait UHT', description: null, quantity: '1 l', price: 2,
      url: null, sale: null,
    };

    async function renderPrices(item: Item, search?: (chain: string, q: string) => Promise<ChainProduct[]>) {
      const fixture = TestBed.createComponent(ProductPopup);
      fixture.componentRef.setInput('item', item);
      fixture.componentRef.setInput('shops', shops);
      if (search) fixture.componentRef.setInput('searchChain', search);
      await fixture.whenStable();
      const links: { chain: string; product: ChainProduct | null }[] = [];
      fixture.componentInstance.linkChange.subscribe((v) => links.push(v));
      const el = fixture.nativeElement as HTMLElement;
      const text = (selector: string) => el.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
      const searchFor = async (chain: string, q: string) => {
        const select = el.querySelector<HTMLSelectElement>('select[aria-label="Chain"]')!;
        select.value = chain;
        select.dispatchEvent(new Event('change'));
        el.querySelector<HTMLInputElement>('input[aria-label="Search products"]')!.value = q;
        el.querySelector<HTMLFormElement>('form.search')!.dispatchEvent(new Event('submit'));
        await fixture.whenStable();
      };
      return { el, links, text, searchFor };
    }

    it('shows a linked product on sale: label, sale price, until its last day', async () => {
      const { el, text } = await renderPrices({
        id: '1', name: 'salade', links: [{ chain: 'MIGROS', code: '100068039', product: salad }],
      });
      expect(text('.link .chain')).toBe('Migros');
      expect(text('.link .pname')).toBe('Kopfsalat · 350g');
      expect(text('.link .desc')).toBe('Laitue pommée · XL');
      expect(text('.link .price')).toBe('Hit 2.95 until 21.10.');
      // Regular price only struck through when it differs
      expect(el.querySelector('.link s')).toBeNull();
      expect(el.querySelector<HTMLAnchorElement>('.link a')!.href).toBe(salad.url);
      expect(el.querySelector<HTMLAnchorElement>('.link a')!.target).toBe('_blank');
    });

    it('strikes the regular price through when the sale price differs', async () => {
      const { text } = await renderPrices({
        id: '1', name: 'lait',
        links: [{ chain: 'COOP', code: '1', product: { ...milk, price: 3.8, sale: { label: '22%', price: 2.95, endDate: null } } }],
      });
      expect(text('.link .price')).toBe('22% 2.95 3.80');
      expect(text('.link s')).toBe('3.80');
    });

    it('says when a linked product is not available, and still unlinks it', async () => {
      const { el, links, text } = await renderPrices({
        id: '1', name: 'chips', links: [{ chain: 'LIDL', code: '999', product: null }],
      });
      expect(text('.link .hint')).toBe('Not available right now');
      el.querySelector<HTMLButtonElement>('button[aria-label="Unlink Lidl"]')!.click();
      expect(links).toEqual([{ chain: 'LIDL', product: null }]);
    });

    it('searches the picked chain and links the tapped result', async () => {
      const calls: string[] = [];
      const { el, links, searchFor } = await renderPrices({ id: '1', name: 'lait' }, async (chain, q) => {
        calls.push(`${chain}:${q}`);
        return [milk];
      });
      await searchFor('COOP', ' lait ');
      expect(calls).toEqual(['COOP:lait']);
      const result = el.querySelector<HTMLButtonElement>('.results .result')!;
      expect(Array.from(result.children).map((c) => c.textContent!.trim())).toEqual(['Lait UHT', '1 l · 2.00']);
      result.click();
      expect(links).toEqual([{ chain: 'COOP', product: milk }]);
    });

    it('says the chain is unavailable when its search fails', async () => {
      const { el, text, searchFor } = await renderPrices({ id: '1', name: 'lait' }, () => Promise.reject(new Error('down')));
      await searchFor('MIGROS', 'lait');
      expect(text('[role="alert"]')).toBe('Migros is unavailable');
      expect(el.querySelector('.results')).toBeNull();
    });

    it('offers the first chain not linked yet', async () => {
      const { el } = await renderPrices(
        { id: '1', name: 'salade', links: [{ chain: 'MIGROS', code: '100068039', product: salad }] },
        async () => [],
      );
      expect(el.querySelector<HTMLSelectElement>('select[aria-label="Chain"]')!.value).toBe('COOP');
    });
  });
});
