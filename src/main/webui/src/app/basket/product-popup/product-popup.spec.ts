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
    const names: string[] = [];
    fixture.componentInstance.nameChange.subscribe((v) => names.push(v));
    const el = fixture.nativeElement as HTMLElement;
    const shopSelect = () =>
      el.querySelector<HTMLSelectElement>('select[aria-label="Buy only at"]')!;
    const categorySelect = () =>
      el.querySelector<HTMLSelectElement>('select[aria-label="Category"]')!;
    const pick = (select: HTMLSelectElement, value: string) => {
      select.value = value;
      select.dispatchEvent(new Event('change'));
    };
    return { el, changes, categoryChanges, names, shopSelect, categorySelect, pick };
  }

  /** Types into the name field and commits it, as Enter or leaving the field does. */
  const typeName = (el: HTMLElement, value: string) => {
    const field = el.querySelector<HTMLInputElement>('input[aria-label="Name"]')!;
    field.value = value;
    field.dispatchEvent(new Event('change'));
    return field;
  };

  const options = (select: HTMLSelectElement) =>
    Array.from(select.options).map((o) => o.text.trim());

  it('shows the product and "Any shop" when it has no shop', async () => {
    const { el, shopSelect } = await render({
      id: '1',
      name: 'Parmesan',
      aisle: 'Fromage',
      categoryId: 'fromage',
      status: 'CLASSIFIED',
    });
    expect(el.querySelector('dialog')!.open).toBe(true);
    expect(el.querySelector<HTMLInputElement>('input[aria-label="Name"]')!.value).toBe('Parmesan');
    expect(el.querySelector('dialog')!.getAttribute('aria-label')).toBe('Parmesan');
    expect(options(shopSelect())).toEqual(['Any shop', 'Coop', 'Lidl']);
    expect(shopSelect().value).toBe('');
  });

  it('emits the picked shop, and null for "Any shop"', async () => {
    const { changes, shopSelect, pick } = await render({
      id: '1',
      name: 'Parmesan',
      shopId: 'lidl',
    });
    expect(shopSelect().value).toBe('lidl');
    pick(shopSelect(), 'coop');
    pick(shopSelect(), '');
    expect(changes).toEqual(['coop', null]);
  });

  it('shows the current category, "No category" first', async () => {
    const { el, categorySelect } = await render({
      id: '1',
      name: 'Parmesan',
      aisle: 'Fromage',
      categoryId: 'fromage',
      status: 'CLASSIFIED',
    });
    expect(options(categorySelect())).toEqual(['No category', 'Fromage', 'Fruits']);
    expect(categorySelect().value).toBe('fromage');
    expect(el.querySelector('.cat')).toBeNull();
  });

  it('shows "No category" for an unclassified product', async () => {
    const { categorySelect } = await render({ id: '1', name: 'Bougies', status: 'UNCLASSIFIED' });
    expect(categorySelect().value).toBe('');
  });

  it('emits the picked category, and null for "No category"', async () => {
    const { categoryChanges, categorySelect, pick } = await render({
      id: '1',
      name: 'Tomato',
      categoryId: 'fruits',
      status: 'CLASSIFIED',
    });
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
    expect(el.querySelector('.danger')).toBeNull();
    expect(el.querySelector('input[aria-label="Name"]')).toBeNull();
    expect(el.querySelector('h2')!.textContent).toBe('Parmesan');
  });

  it('emits a changed name, trimmed', async () => {
    const { el, names } = await render({ id: '1', name: 'tomatoe' });
    typeName(el, ' tomato ');
    expect(names).toEqual(['tomato']);
  });

  it('emits nothing for a blank or unchanged name, and shows the name again', async () => {
    const { el, names } = await render({ id: '1', name: 'tomatoe' });
    expect(typeName(el, '   ').value).toBe('tomatoe');
    expect(typeName(el, ' tomatoe ').value).toBe('tomatoe');
    expect(names).toEqual([]);
  });

  describe('quantity', () => {
    async function renderQuantity(item: Item) {
      const fixture = TestBed.createComponent(ProductPopup);
      fixture.componentRef.setInput('item', item);
      fixture.componentRef.setInput('shops', shops);
      await fixture.whenStable();
      const quantities: number[] = [];
      fixture.componentInstance.quantityChange.subscribe((v) => quantities.push(v));
      const names: string[] = [];
      fixture.componentInstance.nameChange.subscribe((v) => names.push(v));
      const el = fixture.nativeElement as HTMLElement;
      const field = () => el.querySelector<HTMLInputElement>('input[aria-label="Quantity"]');
      const type = (value: string) => {
        field()!.value = value;
        field()!.dispatchEvent(new Event('change'));
      };
      return { el, field, type, quantities, names };
    }

    it('shows the quantity, 1 when unset', async () => {
      expect((await renderQuantity({ id: '1', name: 'apples', quantity: 3 })).field()!.value).toBe('3');
      expect((await renderQuantity({ id: '1', name: 'apples' })).field()!.value).toBe('1');
    });

    it('emits a changed quantity, back to 1 included, and puts the saved one back', async () => {
      const { field, type, quantities } = await renderQuantity({ id: '1', name: 'apples', quantity: 3 });
      type('5');
      expect(field()!.value).toBe('3');
      type('1');
      expect(quantities).toEqual([5, 1]);
    });

    it('emits nothing for 0, empty, a fraction or the same value', async () => {
      const { field, type, quantities } = await renderQuantity({ id: '1', name: 'apples', quantity: 2 });
      for (const value of ['0', '', '1.5', '2']) type(value);
      expect(quantities).toEqual([]);
      expect(field()!.value).toBe('2');
    });

    it('does not read a quantity from a new name', async () => {
      const { el, quantities, names } = await renderQuantity({ id: '1', name: 'apples' });
      typeName(el, '2 apples');
      expect(names).toEqual(['2 apples']);
      expect(quantities).toEqual([]);
    });

    it('has no quantity field before a new product is saved', async () => {
      expect((await renderQuantity({ id: 'n1', name: 'apples' })).field()).toBeNull();
    });
  });

  describe('delete', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    function renderNow() {
      const fixture = TestBed.createComponent(ProductPopup);
      fixture.componentRef.setInput('item', { id: '1', name: 'Tomatoe' });
      fixture.componentRef.setInput('shops', shops);
      fixture.detectChanges();
      const removed: unknown[] = [];
      fixture.componentInstance.removed.subscribe(() => removed.push(true));
      const el = fixture.nativeElement as HTMLElement;
      const del = el.querySelector<HTMLButtonElement>('.danger')!;
      return { fixture, el, del, removed };
    }

    it('deletes only on the second tap, and closes', () => {
      const { fixture, el, del, removed } = renderNow();
      expect(del.textContent!.trim()).toBe('Delete product');
      del.click();
      fixture.detectChanges();
      expect(del.textContent!.trim()).toBe('Tap again to delete Tomatoe');
      expect(removed).toEqual([]);
      del.click();
      expect(removed).toEqual([true]);
      expect(el.querySelector('dialog')!.open).toBe(false);
    });

    it('forgets the first tap after 4 s', () => {
      const { fixture, del, removed } = renderNow();
      del.click();
      vi.advanceTimersByTime(4000);
      fixture.detectChanges();
      expect(del.textContent!.trim()).toBe('Delete product');
      del.click();
      expect(removed).toEqual([]);
    });
  });
});
