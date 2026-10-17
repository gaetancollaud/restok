import { TestBed } from '@angular/core/testing';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import { AddItemDocument, ItemsDocument } from '../graphql/generated';
import { Items } from './items';

describe('Items', () => {
  let controller: ApolloTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Items, ApolloTestingModule] });
    controller = TestBed.inject(ApolloTestingController);
  });

  afterEach(() => controller.verify());

  const names = (el: HTMLElement) => Array.from(el.querySelectorAll('li')).map((li) => li.textContent);

  it('lists items and shows a new one after adding it', async () => {
    const fixture = TestBed.createComponent(Items);
    const el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    controller.expectOne(ItemsDocument).flush({ data: { items: [{ __typename: 'Item', id: '1', name: 'a' }] } });
    await fixture.whenStable();
    expect(names(el)).toEqual(['a']);

    el.querySelector('input')!.value = 'b';
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const add = controller.expectOne(AddItemDocument);
    expect(add.operation.variables).toEqual({ name: 'b' });
    add.flush({ data: { addItem: { __typename: 'Item', id: '2', name: 'b' } } });
    controller.expectOne(ItemsDocument).flush({
      data: {
        items: [
          { __typename: 'Item', id: '1', name: 'a' },
          { __typename: 'Item', id: '2', name: 'b' },
        ],
      },
    });
    await fixture.whenStable();
    expect(names(el)).toEqual(['a', 'b']);
    expect(el.querySelector('input')!.value).toBe('');
  });
});
