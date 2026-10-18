import { TestBed } from '@angular/core/testing';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import {
  AddCategoryDocument,
  AddProductDocument,
  AddShopDocument,
  ChainSearchDocument,
  GroceryDocument,
  SetProductBoughtDocument,
  SetProductCategoryDocument,
  SetProductLinkDocument,
  SetProductShopDocument,
  SetShopCategoryOrderDocument,
  UpdateShopDocument,
} from '../graphql/generated';
import { Grocery } from './grocery';

describe('Grocery', () => {
  let controller: ApolloTestingController;

  /** Stubs the device position; the default never answers, like a pending permission prompt. */
  const geolocate = (
    getCurrentPosition: (ok: PositionCallback, fail: PositionErrorCallback) => void,
  ) =>
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
  const locateAt = (latitude: number, longitude: number) =>
    geolocate((ok) => ok({ coords: { latitude, longitude } } as GeolocationPosition));

  beforeEach(() => {
    geolocate(() => undefined);
    TestBed.configureTestingModule({ imports: [Grocery, ApolloTestingModule] });
    controller = TestBed.inject(ApolloTestingController);
  });

  afterEach(() => controller.verify());

  const category = (name: string) => ({ __typename: 'ProductCategory', id: name, name });
  const product = (
    id: string,
    name: string,
    cat: string | null,
    classification = 'CLASSIFIED',
  ) => ({
    __typename: 'Product',
    id,
    name,
    bought: false,
    boughtAt: null,
    classification,
    category: cat ? category(cat) : null,
    shop: null as unknown,
    links: [] as unknown[],
  });
  const coop = {
    __typename: 'Shop',
    id: 'coop',
    name: 'Coop',
    latitude: 46.5,
    longitude: 6.6,
    categoryOrder: [category('Pain'), category('Fruits')],
  };
  const categories = [category('Pain'), category('Fruits')];
  const apple = product('1', 'apple', 'Fruits');
  const baguette = product('2', 'baguette', 'Pain');

  async function render(products: unknown[] = [apple, baguette], shops: unknown[] = [coop]) {
    const fixture = TestBed.createComponent(Grocery);
    fixture.detectChanges();
    controller.expectOne(GroceryDocument).flush({ data: { shops, categories, products } });
    await fixture.whenStable();
    return fixture;
  }

  const toBuy = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('[aria-label="To buy"] .label')).map((l) => l.textContent);
  const shopSelect = (el: HTMLElement) =>
    el.querySelector<HTMLSelectElement>('app-shop-select select')!;

  it("sorts To buy in the shop's category order", async () => {
    locateAt(46.5, 6.6);
    const el = (await render()).nativeElement as HTMLElement;
    expect(shopSelect(el).value).toBe('coop');
    expect(toBuy(el)).toEqual(['baguette', 'apple']);
  });

  describe('shop on open', () => {
    // 0.00045° of latitude is about 50 m
    it('opens on All shops while the position is unknown', async () => {
      const el = (await render()).nativeElement as HTMLElement;
      expect(shopSelect(el).value).toBe('');
      expect(toBuy(el)).toEqual(['apple', 'baguette']);
    });

    it('selects a shop 50 m away', async () => {
      locateAt(46.5 + 0.00045, 6.6);
      const el = (await render()).nativeElement as HTMLElement;
      expect(shopSelect(el).value).toBe('coop');
    });

    it('stays on All shops 250 m away', async () => {
      locateAt(46.5 + 0.00225, 6.6);
      const el = (await render()).nativeElement as HTMLElement;
      expect(shopSelect(el).value).toBe('');
    });

    it('stays on All shops, without an error, when the location is refused', async () => {
      geolocate((_, fail) => fail({ code: 1 } as GeolocationPositionError));
      const el = (await render()).nativeElement as HTMLElement;
      expect(shopSelect(el).value).toBe('');
      expect(el.querySelector('[role="alert"]')).toBeNull();
    });

    it('keeps a shop picked by hand before the position arrives', async () => {
      let answer!: PositionCallback;
      geolocate((ok) => (answer = ok));
      const lidl = { ...coop, id: 'lidl', name: 'Lidl', latitude: null, longitude: null };
      const fixture = await render([apple, baguette], [coop, lidl]);
      const el = fixture.nativeElement as HTMLElement;
      shopSelect(el).value = 'lidl';
      shopSelect(el).dispatchEvent(new Event('change'));
      answer({ coords: { latitude: 46.5, longitude: 6.6 } } as GeolocationPosition);
      await fixture.whenStable();
      expect(shopSelect(el).value).toBe('lidl');
    });
  });

  it('marks a tapped product bought', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const tile = el.querySelector<HTMLButtonElement>(
      '[aria-label="apple, Fruits, tap twice to mark as bought"]',
    )!;
    tile.click();
    tile.click();
    const op = controller.expectOne(SetProductBoughtDocument);
    expect(op.operation.variables).toEqual({ id: '1', bought: true });
    op.flush({
      data: {
        setProductBought: {
          __typename: 'Product',
          id: '1',
          bought: true,
          boughtAt: '2026-10-17T10:00:00Z',
        },
      },
    });
    await fixture.whenStable();
    expect(toBuy(el)).toEqual(['baguette']);
    expect(el.querySelector('[aria-label="Add apple again, Fruits"]')).not.toBeNull();
  });

  it('restricts a product to a shop from its popup, and back to any shop', async () => {
    const lidl = {
      ...coop,
      id: 'lidl',
      name: 'Lidl',
      latitude: null,
      longitude: null,
      categoryOrder: [],
    };
    locateAt(46.5, 6.6);
    const fixture = TestBed.createComponent(Grocery);
    fixture.detectChanges();
    controller
      .expectOne(GroceryDocument)
      .flush({ data: { shops: [coop, lidl], categories, products: [apple, baguette] } });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('[aria-label="apple, Fruits, tap twice to mark as bought"]')!.dispatchEvent(
      new MouseEvent('contextmenu', { cancelable: true }),
    );
    await fixture.whenStable();
    const select = el.querySelector<HTMLSelectElement>(
      'app-product-popup select[aria-label="Buy only at"]',
    )!;
    const pick = async (value: string, shop: unknown) => {
      select.value = value;
      select.dispatchEvent(new Event('change'));
      const op = controller.expectOne(SetProductShopDocument);
      expect(op.operation.variables).toEqual({ id: '1', shopId: value || null });
      op.flush({ data: { setProductShop: { __typename: 'Product', id: '1', shop } } });
      await fixture.whenStable();
    };

    await pick('lidl', { __typename: 'Shop', id: 'lidl' });
    expect(toBuy(el)).toEqual(['baguette']);
    expect(el.querySelector('.hidden-count')!.textContent!.trim()).toBe('1 more for other shops');

    await pick('', null);
    expect(toBuy(el)).toEqual(['baguette', 'apple']);
  });

  it('sets a product category from its popup, and clears it', async () => {
    locateAt(46.5, 6.6);
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('[aria-label="apple, Fruits, tap twice to mark as bought"]')!.dispatchEvent(
      new MouseEvent('contextmenu', { cancelable: true }),
    );
    await fixture.whenStable();
    const select = el.querySelector<HTMLSelectElement>(
      'app-product-popup select[aria-label="Category"]',
    )!;
    expect(select.value).toBe('Fruits');
    const pick = async (value: string, cat: unknown, classification: string) => {
      select.value = value;
      select.dispatchEvent(new Event('change'));
      const op = controller.expectOne(SetProductCategoryDocument);
      expect(op.operation.variables).toEqual({ id: '1', categoryId: value || null });
      op.flush({
        data: {
          setProductCategory: { __typename: 'Product', id: '1', classification, category: cat },
        },
      });
      await fixture.whenStable();
    };

    await pick('Pain', category('Pain'), 'CLASSIFIED');
    expect(
      el.querySelector('[aria-label="apple, Pain, tap twice to mark as bought"]'),
    ).not.toBeNull();

    await pick('', null, 'UNCLASSIFIED');
    expect(toBuy(el)).toEqual(['baguette', 'apple']);
    expect(
      el.querySelector('[aria-label="apple, no category, tap twice to mark as bought"]'),
    ).not.toBeNull();
  });

  it('adds a new product and refetches', async () => {
    locateAt(46.5, 6.6);
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('input')!;
    input.value = 'pomme';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const op = controller.expectOne(AddProductDocument);
    expect(op.operation.variables).toEqual({ name: 'pomme' });
    op.flush({ data: { addProduct: { __typename: 'Product', id: '3' } } });
    controller.expectOne(GroceryDocument).flush({
      data: {
        shops: [coop],
        categories,
        products: [apple, baguette, product('3', 'pomme', null, 'PENDING')],
      },
    });
    await fixture.whenStable();
    expect(toBuy(el)).toEqual(['baguette', 'apple', 'pomme']);
    expect(
      el.querySelector(
        '[aria-label="pomme, sorting into a category, tap twice to mark as bought"] .dot.pending',
      ),
    ).not.toBeNull();
  });

  it('polls only while a product is pending', async () => {
    const fixture = TestBed.createComponent(Grocery);
    const ref = (
      fixture.componentInstance as unknown as {
        groceryRef: { startPolling: () => void; stopPolling: () => void; refetch: () => unknown };
      }
    ).groceryRef;
    const start = vi.spyOn(ref, 'startPolling');
    const stop = vi.spyOn(ref, 'stopPolling');
    fixture.detectChanges();
    controller
      .expectOne(GroceryDocument)
      .flush({
        data: { shops: [coop], categories, products: [product('3', 'pomme', null, 'PENDING')] },
      });
    await fixture.whenStable();
    expect(start).toHaveBeenCalledWith(2000);

    stop.mockClear();
    ref.refetch();
    controller
      .expectOne(GroceryDocument)
      .flush({ data: { shops: [coop], categories, products: [product('3', 'pomme', 'Fruits')] } });
    await fixture.whenStable();
    expect(stop).toHaveBeenCalled();
  });

  describe('Shops panel', () => {
    async function openShops() {
      locateAt(46.5, 6.6);
      const fixture = await render();
      const el = fixture.nativeElement as HTMLElement;
      el.querySelector<HTMLButtonElement>('[aria-label="Edit shops and aisle order"]')!.click();
      await fixture.whenStable();
      return { fixture, el };
    }
    /** Mutation results reach the next step a tick later. */
    const tick = () => new Promise((r) => setTimeout(r));
    const refetch = async (shops: unknown[]) => {
      await tick();
      controller
        .expectOne(GroceryDocument)
        .flush({ data: { shops, categories, products: [apple, baguette] } });
    };

    it('opens from the list and goes back', async () => {
      const { fixture, el } = await openShops();
      expect(el.querySelector('app-grocery-screen')!.hasAttribute('hidden')).toBe(true);
      expect(el.querySelector('app-shop-editor')!.hasAttribute('hidden')).toBe(false);
      el.querySelector<HTMLButtonElement>('[aria-label="Back to the list"]')!.click();
      await fixture.whenStable();
      expect(el.querySelector('app-shop-editor')!.hasAttribute('hidden')).toBe(true);
    });

    it('saves a reorder and the list follows it', async () => {
      const { fixture, el } = await openShops();
      el.querySelector('[aria-label^="Move Fruits,"]')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp' }),
      );
      const op = controller.expectOne(SetShopCategoryOrderDocument);
      expect(op.operation.variables).toEqual({ shopId: 'coop', categoryIds: ['Fruits', 'Pain'] });
      op.flush({ data: { setShopCategoryOrder: { __typename: 'Shop', id: 'coop' } } });
      await refetch([{ ...coop, categoryOrder: [category('Fruits'), category('Pain')] }]);
      await fixture.whenStable();
      expect(toBuy(el)).toEqual(['apple', 'baguette']);
    });

    it('creates a missing category before saving the order', async () => {
      const { fixture, el } = await openShops();
      const input = el.querySelector<HTMLInputElement>('app-shop-editor app-add-bar input')!;
      input.value = 'Épices';
      input.dispatchEvent(new Event('input'));
      el.querySelector('app-shop-editor app-add-bar form')!.dispatchEvent(new Event('submit'));
      const add = controller.expectOne(AddCategoryDocument);
      expect(add.operation.variables).toEqual({ name: 'Épices' });
      add.flush({ data: { addCategory: { __typename: 'ProductCategory', id: 'epices' } } });
      await tick();
      const order = controller.expectOne(SetShopCategoryOrderDocument);
      expect(order.operation.variables).toEqual({
        shopId: 'coop',
        categoryIds: ['Pain', 'Fruits', 'epices'],
      });
      order.flush({ data: { setShopCategoryOrder: { __typename: 'Shop', id: 'coop' } } });
      await refetch([coop]);
      await fixture.whenStable();
    });

    it('renames a shop and keeps its location', async () => {
      const { fixture, el } = await openShops();
      const name = el.querySelector<HTMLInputElement>('#shop-name')!;
      name.value = 'Coop Pronto';
      name.dispatchEvent(new Event('input'));
      name.dispatchEvent(new Event('change'));
      const op = controller.expectOne(UpdateShopDocument);
      expect(op.operation.variables).toEqual({
        id: 'coop',
        name: 'Coop Pronto',
        latitude: 46.5,
        longitude: 6.6,
      });
      op.flush({ data: { updateShop: { __typename: 'Shop', id: 'coop' } } });
      await refetch([{ ...coop, name: 'Coop Pronto' }]);
      await fixture.whenStable();
    });

    it('adds a shop with a copy of the order and selects it', async () => {
      const { fixture, el } = await openShops();
      Array.from(el.querySelectorAll<HTMLButtonElement>('.chip'))
        .find((b) => b.textContent!.includes('New shop'))!
        .click();
      const add = controller.expectOne(AddShopDocument);
      expect(add.operation.variables).toEqual({ name: 'New shop' });
      add.flush({ data: { addShop: { __typename: 'Shop', id: 'new' } } });
      await tick();
      const order = controller.expectOne(SetShopCategoryOrderDocument);
      expect(order.operation.variables).toEqual({ shopId: 'new', categoryIds: ['Pain', 'Fruits'] });
      order.flush({ data: { setShopCategoryOrder: { __typename: 'Shop', id: 'new' } } });
      const fresh = { ...coop, id: 'new', name: 'New shop', latitude: null, longitude: null };
      await refetch([fresh, coop]);
      await fixture.whenStable();
      expect(el.querySelector('.chip[aria-pressed="true"]')!.textContent!.trim()).toBe('New shop');
      expect(el.querySelector('select')!.value).toBe('new');
    });
  });

  it('searches a chain from the popup and links the picked product, then unlinks it', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('[aria-label="apple, Fruits, tap twice to mark as bought"]')!.dispatchEvent(
      new MouseEvent('contextmenu', { cancelable: true }),
    );
    await fixture.whenStable();
    el.querySelector<HTMLInputElement>('app-product-popup input[aria-label="Search products"]')!.value = 'salade';
    el.querySelector<HTMLFormElement>('app-product-popup form.search')!.dispatchEvent(new Event('submit'));
    const search = controller.expectOne(ChainSearchDocument);
    expect(search.operation.variables).toEqual({ chain: 'MIGROS', query: 'salade' });
    const salad = { __typename: 'ChainProduct', ...{ chain: 'MIGROS' as const, code: '100068039', name: 'Kopfsalat', description: 'Laitue pommée · XL', quantity: '350g', price: 2.95, url: 'https://www.migros.ch/fr/product/131043300000', sale: { label: 'Hit', price: 2.95, endDate: '2026-10-21' } }, sale: { __typename: 'Sale', ...{ label: 'Hit', price: 2.95, endDate: '2026-10-21' } } };
    search.flush({ data: { chainSearch: [salad] } });
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('app-product-popup .results .result')!.click();
    const link = controller.expectOne(SetProductLinkDocument);
    expect(link.operation.variables).toEqual({ id: '1', chain: 'MIGROS', code: '100068039' });
    const links = [{ __typename: 'ProductLink', chain: 'MIGROS', code: '100068039', product: salad }];
    link.flush({ data: { setProductLink: { __typename: 'Product', id: '1', links } } });
    await fixture.whenStable();
    expect(el.querySelector('[aria-label="apple, Fruits, on sale at Migros Hit, tap twice to mark as bought"]')).not.toBeNull();

    el.querySelector<HTMLButtonElement>('app-product-popup button[aria-label="Unlink Migros"]')!.click();
    const unlink = controller.expectOne(SetProductLinkDocument);
    expect(unlink.operation.variables).toEqual({ id: '1', chain: 'MIGROS', code: null });
    unlink.flush({ data: { setProductLink: { __typename: 'Product', id: '1', links: [] } } });
    await fixture.whenStable();
    expect(el.querySelector('app-product-popup .link')).toBeNull();
  });
});
