import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Pwa } from '../../pwa/pwa';
import { Item, Shop } from '../basket';
import { GroceryScreen } from './grocery-screen';

describe('GroceryScreen', () => {
  const shops: Shop[] = [
    { id: 'migros', name: 'Migros', aisles: ['Produce', 'Bakery'] },
    { id: 'coop', name: 'Coop', aisles: ['Bakery', 'Produce'] },
  ];
  const items: Item[] = [
    { id: '1', name: 'Tomatoes', aisle: 'Produce' },
    { id: '2', name: 'Bread', aisle: 'Bakery' },
    { id: '3', name: 'Coffee', bought: true, boughtAt: 1 },
  ];

  async function render() {
    const fixture = TestBed.createComponent(GroceryScreen);
    fixture.componentRef.setInput('shops', shops);
    fixture.componentRef.setInput('items', items);
    await fixture.whenStable();
    return fixture;
  }

  const tiles = (el: HTMLElement, list: string) =>
    Array.from(el.querySelectorAll(`[aria-label="${list}"] .label`)).map((l) => l.textContent);
  const heading = (el: HTMLElement) => el.querySelector('h2')!.textContent!.trim();

  it('orders To buy for the selected shop and re-sorts on switch', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    expect(heading(el)).toBe('To buy · 2');
    expect(tiles(el, 'To buy')).toEqual(['Tomatoes', 'Bread']);

    const select = el.querySelector('select')!;
    select.value = 'coop';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(tiles(el, 'To buy')).toEqual(['Bread', 'Tomatoes']);
  });

  it('keeps the selected shop when the shop list is refreshed', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const select = el.querySelector('select')!;
    select.value = 'coop';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    fixture.componentRef.setInput(
      'shops',
      shops.map((s) => ({ ...s })),
    );
    await fixture.whenStable();
    expect(select.value).toBe('coop');
    expect(tiles(el, 'To buy')).toEqual(['Bread', 'Tomatoes']);
  });

  it('needs a second tap to mark a To-buy tile bought', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>(
      '[aria-label="Tomatoes, tap twice to mark as bought"]',
    )!.click();
    await fixture.whenStable();
    expect(tiles(el, 'To buy')).toEqual(['Tomatoes', 'Bread']);
  });

  it('moves a tapped tile to the top of Bought, and back on tap', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const changes: unknown[] = [];
    fixture.componentInstance.boughtChange.subscribe((c) => changes.push(c));

    const tile = el.querySelector<HTMLButtonElement>(
      '[aria-label="Tomatoes, tap twice to mark as bought"]',
    )!;
    tile.click();
    tile.click();
    await fixture.whenStable();
    expect(tiles(el, 'To buy')).toEqual(['Bread']);
    expect(tiles(el, 'Bought')).toEqual(['Tomatoes', 'Coffee']);

    el.querySelector<HTMLButtonElement>('[aria-label="Add Coffee again"]')!.click();
    await fixture.whenStable();
    expect(tiles(el, 'To buy')).toEqual(['Bread', 'Coffee']);
    expect(changes).toEqual([
      { id: '1', bought: true },
      { id: '3', bought: false },
    ]);
  });

  it('revives a bought item instead of adding a duplicate', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const added: string[] = [];
    fixture.componentInstance.added.subscribe((n) => added.push(n));
    const input = el.querySelector<HTMLInputElement>('input')!;
    const add = el.querySelector<HTMLButtonElement>('[aria-label="Add item"]')!;
    expect(add.disabled).toBe(true);

    input.value = ' coffee ';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(tiles(el, 'To buy')).toContain('Coffee');
    expect(el.querySelector('[aria-label="Bought"]')).toBeNull();

    input.value = 'Oat milk';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(added).toEqual(['Oat milk']);
    expect(input.value).toBe('');
  });

  it("shows each tile's category state as a dot and in its label", async () => {
    const fixture = TestBed.createComponent(GroceryScreen);
    fixture.componentRef.setInput('shops', shops);
    fixture.componentRef.setInput('items', [
      { id: '1', name: 'Tomatoes', aisle: 'Produce', status: 'CLASSIFIED' },
      { id: '2', name: 'Gruyère', status: 'PENDING' },
      { id: '3', name: 'Candles', status: 'UNCLASSIFIED' },
      { id: '4', name: 'Bread', aisle: 'Bakery', status: 'CLASSIFIED', bought: true, boughtAt: 1 },
    ]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const dot = (label: string) => el.querySelector(`[aria-label="${label}"] .dot`)!;
    expect(dot('Tomatoes, Produce, tap twice to mark as bought').className).toContain('classified');
    expect(dot('Tomatoes, Produce, tap twice to mark as bought').getAttribute('title')).toBe(
      'Category: Produce',
    );
    expect(
      dot('Gruyère, sorting into a category, tap twice to mark as bought').className,
    ).toContain('pending');
    expect(dot('Candles, no category, tap twice to mark as bought').className).toContain(
      'unclassified',
    );
    expect(dot('Add Bread again, Bakery').className).toContain('classified');

    const cat = (label: string) => el.querySelector(`[aria-label="${label}"] .cat`)?.textContent;
    expect(cat('Tomatoes, Produce, tap twice to mark as bought')).toBe('Produce');
    expect(cat('Gruyère, sorting into a category, tap twice to mark as bought')).toBe('Sorting…');
    expect(cat('Candles, no category, tap twice to mark as bought')).toBe('No category');
    expect(cat('Add Bread again, Bakery')).toBeUndefined();
  });

  it('shows a new item pending, then sorts it into its aisle once classified', async () => {
    const fixture = await render();
    let answer!: (aisle: string | null) => void;
    fixture.componentRef.setInput(
      'classify',
      () => new Promise<string | null>((r) => (answer = r)),
    );
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('input')!;
    input.value = 'Apples';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(
      el.querySelector(
        '[aria-label="Apples, sorting into a category, tap twice to mark as bought"] .dot.pending',
      ),
    ).not.toBeNull();
    expect(tiles(el, 'To buy')).toEqual(['Tomatoes', 'Bread', 'Apples']);

    answer('Produce');
    await new Promise((r) => setTimeout(r)); // let the classify result land
    await fixture.whenStable();
    expect(
      el.querySelector(
        '[aria-label="Apples, Produce, tap twice to mark as bought"] .dot.classified',
      ),
    ).not.toBeNull();
    expect(tiles(el, 'To buy')).toEqual(['Apples', 'Tomatoes', 'Bread']);
  });

  it('marks a new item unclassified when there is no classify function', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('input')!;
    input.value = 'Candles';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(
      el.querySelector(
        '[aria-label="Candles, no category, tap twice to mark as bought"] .dot.unclassified',
      ),
    ).not.toBeNull();
  });

  it('says "All done" when nothing is left to buy', async () => {
    const fixture = TestBed.createComponent(GroceryScreen);
    fixture.componentRef.setInput('shops', shops);
    fixture.componentRef.setInput('items', [items[2]]);
    await fixture.whenStable();
    expect(heading(fixture.nativeElement)).toBe('All done');
  });

  describe('shop restriction', () => {
    const restricted: Item[] = [
      { id: '1', name: 'Tomatoes', aisle: 'Produce' },
      { id: '2', name: 'Parmesan', shopId: 'coop' },
    ];

    async function renderRestricted() {
      const fixture = TestBed.createComponent(GroceryScreen);
      fixture.componentRef.setInput('shops', shops);
      fixture.componentRef.setInput('items', restricted);
      await fixture.whenStable();
      return { fixture, el: fixture.nativeElement as HTMLElement };
    }
    const hiddenText = (el: HTMLElement) => el.querySelector('.hidden-count')?.textContent?.trim();
    const pickShop = async (
      fixture: { whenStable: () => Promise<unknown> },
      select: HTMLSelectElement,
      id: string,
    ) => {
      select.value = id;
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };

    it('hides items for another shop and shows them at their shop', async () => {
      const { fixture, el } = await renderRestricted();
      expect(tiles(el, 'To buy')).toEqual(['Tomatoes']);
      expect(hiddenText(el)).toBe('1 more for other shops');

      await pickShop(fixture, el.querySelector('select')!, 'coop');
      expect(tiles(el, 'To buy')).toEqual(['Tomatoes', 'Parmesan']);
      expect(hiddenText(el)).toBeUndefined();
    });

    it('shows every item under All shops, which is first but not the default', async () => {
      const { fixture, el } = await renderRestricted();
      const select = el.querySelector('select')!;
      expect(select.options[0].text.trim()).toBe('All shops');
      expect(select.value).toBe('migros');

      await pickShop(fixture, select, '');
      expect(tiles(el, 'To buy')).toEqual(['Parmesan', 'Tomatoes']);
      expect(hiddenText(el)).toBeUndefined();

      await pickShop(fixture, select, 'migros');
      expect(tiles(el, 'To buy')).toEqual(['Tomatoes']);
      expect(hiddenText(el)).toBe('1 more for other shops');
    });

    it('restricts an item from the long-press popup', async () => {
      const { fixture, el } = await renderRestricted();
      const changes: unknown[] = [];
      fixture.componentInstance.shopChange.subscribe((c) => changes.push(c));

      el.querySelector('[aria-label="Tomatoes, tap twice to mark as bought"]')!.dispatchEvent(
        new MouseEvent('contextmenu', { cancelable: true }),
      );
      await fixture.whenStable();
      const popup = el.querySelector('app-product-popup')!;
      expect(popup.querySelector('h2')!.textContent).toBe('Tomatoes');
      const shopSelect = popup.querySelector<HTMLSelectElement>(
        'select[aria-label="Buy only at"]',
      )!;
      expect(shopSelect.value).toBe('');

      await pickShop(fixture, shopSelect, 'coop');
      expect(changes).toEqual([{ id: '1', shopId: 'coop' }]);
      expect(tiles(el, 'To buy')).toEqual([]);
      expect(hiddenText(el)).toBe('2 more for other shops');

      popup.querySelector<HTMLButtonElement>('[aria-label="Close"]')!.click();
      await fixture.whenStable();
      expect(el.querySelector('app-product-popup')).toBeNull();
    });
  });

  describe('category from the popup', () => {
    const categories = [
      { id: 'bakery', name: 'Bakery' },
      { id: 'produce', name: 'Produce' },
    ];

    it('moves the tile to its new category and back to none', async () => {
      const fixture = TestBed.createComponent(GroceryScreen);
      fixture.componentRef.setInput('shops', shops);
      fixture.componentRef.setInput('categories', categories);
      fixture.componentRef.setInput('items', [
        { id: '1', name: 'Tomatoes', aisle: 'Bakery', categoryId: 'bakery', status: 'CLASSIFIED' },
        { id: '2', name: 'Bread', aisle: 'Bakery', categoryId: 'bakery', status: 'CLASSIFIED' },
      ]);
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      const changes: unknown[] = [];
      fixture.componentInstance.categoryChange.subscribe((c) => changes.push(c));
      // Migros orders [Produce, Bakery]
      expect(tiles(el, 'To buy')).toEqual(['Bread', 'Tomatoes']);

      el.querySelector(
        '[aria-label="Tomatoes, Bakery, tap twice to mark as bought"]',
      )!.dispatchEvent(new MouseEvent('contextmenu', { cancelable: true }));
      await fixture.whenStable();
      const select = el.querySelector<HTMLSelectElement>(
        'app-product-popup select[aria-label="Category"]',
      )!;
      expect(select.value).toBe('bakery');
      const pick = async (id: string) => {
        select.value = id;
        select.dispatchEvent(new Event('change'));
        await fixture.whenStable();
      };

      await pick('produce');
      expect(tiles(el, 'To buy')).toEqual(['Tomatoes', 'Bread']);
      expect(
        el.querySelector('[aria-label="Tomatoes, Produce, tap twice to mark as bought"] .cat')!
          .textContent,
      ).toBe('Produce');

      await pick('');
      expect(tiles(el, 'To buy')).toEqual(['Bread', 'Tomatoes']);
      expect(
        el.querySelector('[aria-label="Tomatoes, no category, tap twice to mark as bought"] .cat')!
          .textContent,
      ).toBe('No category');
      expect(changes).toEqual([
        { id: '1', categoryId: 'produce' },
        { id: '1', categoryId: null },
      ]);
    });
  });

  it('deletes an item from its popup, To buy or Bought', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const removed: string[] = [];
    fixture.componentInstance.productRemoved.subscribe((id) => removed.push(id));
    const deleteFrom = async (label: string) => {
      el.querySelector(`[aria-label="${label}"]`)!.dispatchEvent(
        new MouseEvent('contextmenu', { cancelable: true }),
      );
      await fixture.whenStable();
      const del = el.querySelector<HTMLButtonElement>('app-product-popup .danger')!;
      del.click();
      await fixture.whenStable();
      del.click();
      await fixture.whenStable();
    };

    await deleteFrom('Tomatoes, tap twice to mark as bought');
    expect(tiles(el, 'To buy')).toEqual(['Bread']);
    expect(el.querySelector('app-product-popup')).toBeNull();

    await deleteFrom('Add Coffee again');
    expect(el.querySelector('[aria-label="Bought"]')).toBeNull();
    expect(removed).toEqual(['1', '3']);
  });

  describe('install / update button', () => {
    const stub = {
      canInstall: signal(false),
      updateReady: signal(false),
      install: vi.fn(),
      update: vi.fn(),
    };
    beforeEach(() =>
      TestBed.configureTestingModule({ providers: [{ provide: Pwa, useValue: stub }] }),
    );

    const button = (el: HTMLElement) =>
      el.querySelector<HTMLButtonElement>('[aria-label$="Restok"]');

    it('shows nothing when installed and up to date', async () => {
      stub.canInstall.set(false);
      stub.updateReady.set(false);
      expect(button((await render()).nativeElement)).toBeNull();
    });

    it('offers install when the browser can install', async () => {
      stub.canInstall.set(true);
      stub.updateReady.set(false);
      const install = button((await render()).nativeElement)!;
      expect(install.getAttribute('aria-label')).toBe('Install Restok');
      install.click();
      expect(stub.install).toHaveBeenCalledOnce();
    });

    it('offers only update when a new version is ready', async () => {
      stub.canInstall.set(true);
      stub.updateReady.set(true);
      const el = (await render()).nativeElement as HTMLElement;
      expect(el.querySelectorAll('[aria-label$="Restok"]')).toHaveLength(1);
      button(el)!.click();
      expect(stub.update).toHaveBeenCalledOnce();
      expect(button(el)!.getAttribute('aria-label')).toBe('Update Restok');
    });
  });
});
