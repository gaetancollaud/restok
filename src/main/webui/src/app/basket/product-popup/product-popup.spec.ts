import { TestBed } from '@angular/core/testing';
import { Category, Item, Shop } from '../basket';
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
});
