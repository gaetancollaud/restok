import { TestBed } from '@angular/core/testing';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import {
  CategoriesDocument,
  ProductsDocument,
  SetProductBoughtDocument,
  ShopsDocument,
} from '../graphql/generated';
import { List } from './list';

describe('List', () => {
  let controller: ApolloTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [List, ApolloTestingModule] });
    controller = TestBed.inject(ApolloTestingController);
  });

  afterEach(() => controller.verify());

  const fruit = { __typename: 'ProductCategory', id: 'f', name: 'Fruit' };
  const product = (
    id: string,
    name: string,
    category: typeof fruit | null,
    classification = 'CLASSIFIED',
  ) => ({
    __typename: 'Product',
    id,
    name,
    bought: false,
    classification,
    category,
  });
  const coop = {
    __typename: 'Shop',
    id: 's1',
    name: 'Coop',
    latitude: 0,
    longitude: 0,
    categoryOrder: [],
  };

  async function render() {
    const fixture = TestBed.createComponent(List);
    fixture.detectChanges();
    controller.expectOne(ProductsDocument).flush({
      data: { products: [product('1', 'apple', fruit), product('2', 'tomato', null, 'PENDING')] },
    });
    controller.expectOne(ShopsDocument).flush({ data: { shops: [coop] } });
    controller.expectOne(CategoriesDocument).flush({ data: { categories: [fruit] } });
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows products with their category or pending state', async () => {
    const el = await render();
    const items = Array.from(el.querySelectorAll('li'));
    expect(items.map((li) => li.querySelector('label')!.textContent!.trim())).toEqual([
      'apple',
      'tomato',
    ]);
    expect(items[0].querySelector<HTMLSelectElement>('select')!.value).toBe('f');
    expect(items[1].querySelector('em')?.textContent).toBe('pending');
  });

  it('polls only while a product is pending', async () => {
    const fixture = TestBed.createComponent(List);
    const ref = (
      fixture.componentInstance as unknown as {
        productsRef: { startPolling: () => void; stopPolling: () => void };
      }
    ).productsRef;
    const start = vi.spyOn(ref, 'startPolling');
    const stop = vi.spyOn(ref, 'stopPolling');
    fixture.detectChanges();
    controller
      .expectOne(ProductsDocument)
      .flush({ data: { products: [product('2', 'tomato', null, 'PENDING')] } });
    controller.expectOne(ShopsDocument).flush({ data: { shops: [] } });
    controller.expectOne(CategoriesDocument).flush({ data: { categories: [fruit] } });
    await fixture.whenStable();
    expect(start).toHaveBeenCalledWith(2000);

    stop.mockClear();
    (
      fixture.componentInstance as unknown as { productsRef: { refetch: () => unknown } }
    ).productsRef.refetch();
    controller
      .expectOne(ProductsDocument)
      .flush({ data: { products: [product('2', 'tomato', fruit)] } });
    await fixture.whenStable();
    expect(stop).toHaveBeenCalled();
  });

  it('re-queries with the selected shop', async () => {
    const el = await render();
    const select = el.querySelector<HTMLSelectElement>('select[aria-label="Shop"]')!;
    select.value = 's1';
    select.dispatchEvent(new Event('change'));
    const query = controller.expectOne(ProductsDocument);
    expect(query.operation.variables).toEqual({ shopId: 's1' });
    query.flush({ data: { products: [] } });
  });

  it('marks a product bought', async () => {
    const el = await render();
    el.querySelector<HTMLInputElement>('li input[type=checkbox]')!.click();
    const op = controller.expectOne(SetProductBoughtDocument);
    expect(op.operation.variables).toEqual({ id: '1', bought: true });
    op.flush({ data: { setProductBought: { __typename: 'Product', id: '1', bought: true } } });
  });
});
