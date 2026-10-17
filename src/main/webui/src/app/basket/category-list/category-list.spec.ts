import { TestBed } from '@angular/core/testing';
import { CategoryList } from './category-list';

describe('CategoryList', () => {
  async function render(categories = ['Pain', 'Fruits', 'Fromage']) {
    const fixture = TestBed.createComponent(CategoryList);
    fixture.componentRef.setInput('categories', categories);
    const changes: string[][] = [];
    fixture.componentInstance.categories.subscribe((c) => changes.push(c));
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement, changes };
  }

  const names = (el: HTMLElement) => Array.from(el.querySelectorAll('.name')).map((n) => n.textContent);
  const grip = (el: HTMLElement, name: string) =>
    el.querySelector<HTMLButtonElement>(`[aria-label^="Move ${name},"]`)!;

  it('moves a category with the arrow keys and keeps focus on it', async () => {
    const { fixture, el, changes } = await render();
    grip(el, 'Fruits').focus();
    grip(el, 'Fruits').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    await fixture.whenStable();
    expect(changes).toEqual([['Fruits', 'Pain', 'Fromage']]);
    expect(names(el)).toEqual(['Fruits', 'Pain', 'Fromage']);
    expect(document.activeElement).toBe(grip(el, 'Fruits'));
  });

  it('drops a dragged row where the pointer lets go', async () => {
    const { fixture, el, changes } = await render();
    const handle = grip(el, 'Pain');
    const pointer = (type: string, clientY: number) =>
      handle.dispatchEvent(new PointerEvent(type, { button: 0, clientY, bubbles: true }));
    pointer('pointerdown', 100);
    pointer('pointermove', 230); // two rows of 64px down
    await fixture.whenStable();
    expect(el.querySelector('.row.held .num')!.textContent).toBe('3');
    pointer('pointerup', 230);
    await fixture.whenStable();
    expect(changes).toEqual([['Fruits', 'Fromage', 'Pain']]);
  });

  it('removes a category, and says so when none are left', async () => {
    const { fixture, el, changes } = await render(['Pain']);
    el.querySelector<HTMLButtonElement>('[aria-label="Remove Pain"]')!.click();
    await fixture.whenStable();
    expect(changes).toEqual([[]]);
    expect(el.querySelector('.hint')!.textContent).toContain('No categories yet');
  });
});
