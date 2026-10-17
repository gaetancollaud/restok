import { TestBed } from '@angular/core/testing';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import {
  AddCategoryDocument,
  AddProductDocument,
  AddShopDocument,
  GroceryDocument,
  SetProductBoughtDocument,
  SetShopCategoryOrderDocument,
  UpdateShopDocument,
} from '../graphql/generated';
import { Grocery } from './grocery';

describe('Grocery', () => {
  let controller: ApolloTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Grocery, ApolloTestingModule] });
    controller = TestBed.inject(ApolloTestingController);
  });

  afterEach(() => controller.verify());

  const category = (name: string) => ({ __typename: 'ProductCategory', id: name, name });
  const product = (id: string, name: string, cat: string | null, classification = 'CLASSIFIED') => ({
    __typename: 'Product',
    id,
    name,
    bought: false,
    boughtAt: null,
    classification,
    category: cat ? category(cat) : null,
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

  async function render(products: unknown[] = [apple, baguette]) {
    const fixture = TestBed.createComponent(Grocery);
    fixture.detectChanges();
    controller.expectOne(GroceryDocument).flush({ data: { shops: [coop], categories, products } });
    await fixture.whenStable();
    return fixture;
  }

  const toBuy = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('[aria-label="To buy"] .label')).map((l) => l.textContent);

  it("sorts To buy in the shop's category order", async () => {
    const el = (await render()).nativeElement as HTMLElement;
    expect(el.querySelector('select')!.value).toBe('coop');
    expect(toBuy(el)).toEqual(['baguette', 'apple']);
  });

  it('marks a tapped product bought', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const tile = el.querySelector<HTMLButtonElement>('[aria-label="apple, Fruits, tap twice to mark as bought"]')!;
    tile.click();
    tile.click();
    const op = controller.expectOne(SetProductBoughtDocument);
    expect(op.operation.variables).toEqual({ id: '1', bought: true });
    op.flush({
      data: {
        setProductBought: { __typename: 'Product', id: '1', bought: true, boughtAt: '2026-10-17T10:00:00Z' },
      },
    });
    await fixture.whenStable();
    expect(toBuy(el)).toEqual(['baguette']);
    expect(el.querySelector('[aria-label="Add apple again, Fruits"]')).not.toBeNull();
  });

  it('adds a new product and refetches', async () => {
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
      data: { shops: [coop], categories, products: [apple, baguette, product('3', 'pomme', null, 'PENDING')] },
    });
    await fixture.whenStable();
    expect(toBuy(el)).toEqual(['baguette', 'apple', 'pomme']);
    expect(el.querySelector('[aria-label="pomme, sorting into a category, tap twice to mark as bought"] .dot.pending')).not.toBeNull();
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
      .flush({ data: { shops: [coop], categories, products: [product('3', 'pomme', null, 'PENDING')] } });
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
      controller.expectOne(GroceryDocument).flush({ data: { shops, categories, products: [apple, baguette] } });
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
      el.querySelector('[aria-label^="Move Fruits,"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
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
      expect(order.operation.variables).toEqual({ shopId: 'coop', categoryIds: ['Pain', 'Fruits', 'epices'] });
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
      expect(op.operation.variables).toEqual({ id: 'coop', name: 'Coop Pronto', latitude: 46.5, longitude: 6.6 });
      op.flush({ data: { updateShop: { __typename: 'Shop', id: 'coop' } } });
      await refetch([{ ...coop, name: 'Coop Pronto' }]);
      await fixture.whenStable();
    });

    it('adds a shop with a copy of the order and selects it', async () => {
      const { fixture, el } = await openShops();
      Array.from(el.querySelectorAll<HTMLButtonElement>('.chip')).find((b) => b.textContent!.includes('New shop'))!.click();
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
});
