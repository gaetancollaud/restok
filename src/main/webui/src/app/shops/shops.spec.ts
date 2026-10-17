import { TestBed } from '@angular/core/testing';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import {
  CategoriesDocument,
  SetShopCategoryOrderDocument,
  ShopsDocument,
} from '../graphql/generated';
import { Shops } from './shops';

describe('Shops', () => {
  let controller: ApolloTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Shops, ApolloTestingModule] });
    controller = TestBed.inject(ApolloTestingController);
  });

  afterEach(() => controller.verify());

  const bread = { __typename: 'ProductCategory', id: 'b', name: 'Bread' };
  const fruit = { __typename: 'ProductCategory', id: 'f', name: 'Fruit' };
  const cheese = { __typename: 'ProductCategory', id: 'c', name: 'Cheese' };
  const coop = {
    __typename: 'Shop',
    id: 's1',
    name: 'Coop',
    latitude: 46.5,
    longitude: 6.6,
    categoryOrder: [bread, fruit],
  };

  async function render() {
    const fixture = TestBed.createComponent(Shops);
    fixture.detectChanges();
    controller.expectOne(ShopsDocument).flush({ data: { shops: [coop] } });
    controller
      .expectOne(CategoriesDocument)
      .flush({ data: { categories: [bread, cheese, fruit] } });
    await fixture.whenStable();
    return fixture;
  }

  const order = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('ol li')).map((li) => li.textContent!.split('↑')[0].trim());
  const button = (el: HTMLElement, label: string) =>
    el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

  it('moves a category up before saving the order', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    expect(order(el)).toEqual(['Bread', 'Fruit']);

    button(el, 'Move Fruit up').click();
    await fixture.whenStable();
    expect(order(el)).toEqual(['Fruit', 'Bread']);

    Array.from(el.querySelectorAll('button'))
      .find((b) => b.textContent === 'Save order')!
      .click();
    const save = controller.expectOne(SetShopCategoryOrderDocument);
    expect(save.operation.variables).toEqual({ shopId: 's1', categoryIds: ['f', 'b'] });
    save.flush({
      data: {
        setShopCategoryOrder: { __typename: 'Shop', id: 's1', categoryOrder: [fruit, bread] },
      },
    });
    controller
      .expectOne(ShopsDocument)
      .flush({ data: { shops: [{ ...coop, categoryOrder: [fruit, bread] }] } });
  });

  it('offers only categories not yet in the order', async () => {
    const el = (await render()).nativeElement as HTMLElement;
    const options = Array.from(el.querySelectorAll('select option')).map((o) => o.textContent);
    expect(options).toEqual(['Cheese']);
  });
});
