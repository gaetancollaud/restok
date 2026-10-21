import { TestBed } from '@angular/core/testing';
import { Shop } from '../basket';
import { ShopEditor } from './shop-editor';

describe('ShopEditor', () => {
  const shops: Shop[] = [
    { id: 'coop', name: 'Coop', aisles: ['Pain', 'Fruits'] },
    { id: 'migros', name: 'Migros', aisles: ['Fruits'] },
  ];

  async function render() {
    const fixture = TestBed.createComponent(ShopEditor);
    fixture.componentRef.setInput('shops', shops);
    const out: unknown[] = [];
    const c = fixture.componentInstance;
    c.addShop.subscribe((a) => out.push(['addShop', a]));
    c.rename.subscribe((r) => out.push(['rename', r]));
    c.remove.subscribe((id) => out.push(['remove', id]));
    c.orderChange.subscribe((o) => out.push(['order', o]));
    c.addCategory.subscribe((n) => out.push(['addCategory', n]));
    c.renameCategory.subscribe((r) => out.push(['renameCategory', r]));
    c.removeCategory.subscribe((n) => out.push(['removeCategory', n]));
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement, out };
  }

  const chip = (el: HTMLElement, name: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('.chip')).find((b) => b.textContent!.trim() === name)!;
  const rows = (el: HTMLElement) =>
    Array.from(el.querySelectorAll<HTMLInputElement>('app-category-list .name')).map((n) => n.value);

  it("selects a shop and shows its order", async () => {
    const { fixture, el } = await render();
    expect(chip(el, 'Coop').getAttribute('aria-pressed')).toBe('true');
    expect(rows(el)).toEqual(['Pain', 'Fruits']);
    chip(el, 'Migros').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.shopId()).toBe('migros');
    expect(rows(el)).toEqual(['Fruits']);
  });

  it('renames on change, and asks for a copy of the order for a new shop', async () => {
    const { fixture, el, out } = await render();
    const name = el.querySelector<HTMLInputElement>('#shop-name')!;
    name.value = 'Coop Pronto';
    name.dispatchEvent(new Event('input'));
    name.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(chip(el, 'Coop Pronto')).toBeDefined();
    chip(el, 'New shop').click();
    expect(out).toEqual([
      ['rename', { id: 'coop', name: 'Coop Pronto' }],
      ['addShop', ['Pain', 'Fruits']],
    ]);
  });

  it('asks for a new category once, ignoring case', async () => {
    const { fixture, el, out } = await render();
    for (const name of ['Fromage', 'pain']) {
      const input = el.querySelector<HTMLInputElement>('app-add-bar input')!;
      input.value = name;
      input.dispatchEvent(new Event('input'));
      el.querySelector('app-add-bar form')!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
    }
    expect(out).toEqual([['addCategory', 'Fromage']]);
  });

  it('forwards category renames and deletes', async () => {
    const { fixture, el, out } = await render();
    const field = el.querySelector<HTMLInputElement>('[aria-label="Name of Pain"]')!;
    field.value = 'Boulangerie';
    field.dispatchEvent(new Event('change'));
    el.querySelector<HTMLButtonElement>('[aria-label="Delete Fruits"]')!.click();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('[aria-label="Tap again to delete Fruits"]')!.click();
    expect(out).toEqual([
      ['renameCategory', { from: 'Pain', to: 'Boulangerie' }],
      ['removeCategory', 'Fruits'],
    ]);
  });

  it('deletes a shop only on the second tap', async () => {
    const { fixture, el, out } = await render();
    const del = el.querySelector<HTMLButtonElement>('.danger')!;
    del.click();
    await fixture.whenStable();
    expect(del.textContent!.trim()).toBe('Tap again to delete Coop');
    expect(out).toEqual([]);
    del.click();
    await fixture.whenStable();
    expect(out).toEqual([['remove', 'coop']]);
    expect(fixture.componentInstance.shopId()).toBe('migros');
    expect(el.querySelector('.danger')).toBeNull(); // the last shop can't be deleted
  });
});
