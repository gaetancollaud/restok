import { TestBed } from '@angular/core/testing';
import { Item, Shop } from '../basket';
import { ProductPopup } from './product-popup';

describe('ProductPopup', () => {
  const shops: Shop[] = [
    { id: 'coop', name: 'Coop' },
    { id: 'lidl', name: 'Lidl' },
  ];

  async function render(item: Item) {
    const fixture = TestBed.createComponent(ProductPopup);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('shops', shops);
    await fixture.whenStable();
    const changes: (string | null)[] = [];
    fixture.componentInstance.shopChange.subscribe((v) => changes.push(v));
    const el = fixture.nativeElement as HTMLElement;
    const pick = (value: string) => {
      const select = el.querySelector('select')!;
      select.value = value;
      select.dispatchEvent(new Event('change'));
    };
    return { el, changes, pick };
  }

  it('shows the product and "Any shop" when it has no shop', async () => {
    const { el } = await render({ id: '1', name: 'Parmesan', aisle: 'Fromage', status: 'CLASSIFIED' });
    expect(el.querySelector('dialog')!.open).toBe(true);
    expect(el.querySelector('h2')!.textContent).toBe('Parmesan');
    expect(el.querySelector('.cat')!.textContent).toBe('Fromage');
    const select = el.querySelector('select')!;
    expect(Array.from(select.options).map((o) => o.text.trim())).toEqual(['Any shop', 'Coop', 'Lidl']);
    expect(select.value).toBe('');
  });

  it('emits the picked shop, and null for "Any shop"', async () => {
    const { el, changes, pick } = await render({ id: '1', name: 'Parmesan', shopId: 'lidl' });
    expect(el.querySelector('select')!.value).toBe('lidl');
    pick('coop');
    pick('');
    expect(changes).toEqual(['coop', null]);
  });

  it('has no dropdown before a new product is saved', async () => {
    const { el } = await render({ id: 'n123', name: 'Parmesan', status: 'PENDING' });
    expect(el.querySelector('select')).toBeNull();
  });
});
