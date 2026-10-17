import { TestBed } from '@angular/core/testing';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import { AddProductDocument, GroceryDocument, SetProductBoughtDocument } from '../graphql/generated';
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
    categoryOrder: [category('Pain'), category('Fruits')],
  };
  const apple = product('1', 'apple', 'Fruits');
  const baguette = product('2', 'baguette', 'Pain');

  async function render(products: unknown[] = [apple, baguette]) {
    const fixture = TestBed.createComponent(Grocery);
    fixture.detectChanges();
    controller.expectOne(GroceryDocument).flush({ data: { shops: [coop], products } });
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
    el.querySelector<HTMLButtonElement>('[aria-label="apple, Fruits, mark as bought"]')!.click();
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
      data: { shops: [coop], products: [apple, baguette, product('3', 'pomme', null, 'PENDING')] },
    });
    await fixture.whenStable();
    expect(toBuy(el)).toEqual(['baguette', 'apple', 'pomme']);
    expect(el.querySelector('[aria-label="pomme, sorting into a category, mark as bought"] .dot.pending')).not.toBeNull();
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
      .flush({ data: { shops: [coop], products: [product('3', 'pomme', null, 'PENDING')] } });
    await fixture.whenStable();
    expect(start).toHaveBeenCalledWith(2000);

    stop.mockClear();
    ref.refetch();
    controller
      .expectOne(GroceryDocument)
      .flush({ data: { shops: [coop], products: [product('3', 'pomme', 'Fruits')] } });
    await fixture.whenStable();
    expect(stop).toHaveBeenCalled();
  });
});
