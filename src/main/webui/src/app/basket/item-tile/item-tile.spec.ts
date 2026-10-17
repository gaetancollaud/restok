import { TestBed } from '@angular/core/testing';
import { ItemTile } from './item-tile';

describe('ItemTile', () => {
  function render(variant: 'tobuy' | 'bought' = 'tobuy') {
    const fixture = TestBed.createComponent(ItemTile);
    fixture.componentRef.setInput('name', 'Parmesan');
    fixture.componentRef.setInput('variant', variant);
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
