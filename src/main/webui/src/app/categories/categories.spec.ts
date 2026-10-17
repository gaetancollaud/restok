import { TestBed } from '@angular/core/testing';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import { GraphQLError } from 'graphql';
import {
  AddCategoryDocument,
  CategoriesDocument,
  RenameCategoryDocument,
} from '../graphql/generated';
import { Categories } from './categories';

describe('Categories', () => {
  let controller: ApolloTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Categories, ApolloTestingModule] });
    controller = TestBed.inject(ApolloTestingController);
  });

  afterEach(() => controller.verify());

  const category = (id: string, name: string) => ({ __typename: 'ProductCategory', id, name });

  async function render() {
    const fixture = TestBed.createComponent(Categories);
    fixture.detectChanges();
    controller
      .expectOne(CategoriesDocument)
      .flush({ data: { categories: [category('1', 'Bread'), category('2', 'Fruit')] } });
    await fixture.whenStable();
    return fixture;
  }

  const names = (el: HTMLElement) =>
    Array.from(el.querySelectorAll<HTMLInputElement>('li input')).map((input) => input.value);

  it('lists categories', async () => {
    const fixture = await render();
    expect(names(fixture.nativeElement)).toEqual(['Bread', 'Fruit']);
  });

  it('renames a category', async () => {
    const el = (await render()).nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('li input')!;
    input.value = 'Bakery';
    input.dispatchEvent(new Event('change'));
    const rename = controller.expectOne(RenameCategoryDocument);
    expect(rename.operation.variables).toEqual({ id: '1', name: 'Bakery' });
    rename.flush({ data: { renameCategory: category('1', 'Bakery') } });
    controller
      .expectOne(CategoriesDocument)
      .flush({ data: { categories: [category('1', 'Bakery'), category('2', 'Fruit')] } });
  });

  it('shows the error of a rejected add and keeps the list', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLInputElement>('form input')!.value = 'fruit';
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    controller
      .expectOne(AddCategoryDocument)
      .flush({ errors: [new GraphQLError('category name already exists')] });
    await fixture.whenStable();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('category name already exists');
    expect(names(el)).toEqual(['Bread', 'Fruit']);
  });
});
