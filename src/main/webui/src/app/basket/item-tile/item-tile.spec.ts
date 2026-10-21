import { TestBed } from '@angular/core/testing';
import { ItemTile } from './item-tile';

describe('ItemTile', () => {
  function render(variant: 'tobuy' | 'bought' = 'tobuy', quantity = 1) {
    const fixture = TestBed.createComponent(ItemTile);
    fixture.componentRef.setInput('name', 'Parmesan');
    fixture.componentRef.setInput('variant', variant);
    fixture.componentRef.setInput('quantity', quantity);
    fixture.detectChanges();
    const events: string[] = [];
    fixture.componentInstance.press.subscribe(() => events.push('press'));
    fixture.componentInstance.longPress.subscribe(() => events.push('longPress'));
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    // jsdom has no PointerEvent; the handler only reads `button`
    const pointer = (type: string, b = 0) => button.dispatchEvent(new MouseEvent(type, { button: b }));
    return { button, pointer, events };
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a quantity above 1 before the name, on both variants', () => {
    for (const variant of ['tobuy', 'bought'] as const) {
      const { button } = render(variant, 2);
      expect(button.querySelector('.label')!.textContent).toBe('2x Parmesan');
      expect(button.getAttribute('aria-label')).toContain('2x Parmesan');
    }
  });

  it('shows the name alone for quantity 1', () => {
    const { button } = render('tobuy', 1);
    expect(button.querySelector('.label')!.textContent).toBe('Parmesan');
  });

  it('opens details on a long press and does not count the release as a tap', () => {
    const { button, pointer, events } = render('bought');
    pointer('pointerdown');
    vi.advanceTimersByTime(500);
    pointer('pointerup');
    button.click();
    expect(events).toEqual(['longPress']);
  });

  it('a short press is still a tap', () => {
    const { button, pointer, events } = render('bought');
    pointer('pointerdown');
    vi.advanceTimersByTime(100);
    pointer('pointerup');
    button.click();
    vi.advanceTimersByTime(1000);
    expect(events).toEqual(['press']);
  });

  it('a double tap still marks bought', () => {
    const { button, events } = render();
    button.click();
    button.click();
    expect(events).toEqual(['press']);
  });

  it('opens details from the context menu', () => {
    const { button, pointer, events } = render();
    pointer('pointerdown', 2);
    const menu = new MouseEvent('contextmenu', { cancelable: true });
    button.dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(true);
    button.click();
    button.click();
    expect(events).toEqual(['longPress', 'press']);
  });
});
