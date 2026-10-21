import { TestBed } from '@angular/core/testing';
import { AddBar } from './add-bar';

describe('AddBar', () => {
  it('clears and refocuses the input after each + click', async () => {
    const fixture = TestBed.createComponent(AddBar);
    const added: string[] = [];
    fixture.componentInstance.add.subscribe((name) => added.push(name));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input')!;
    const button = el.querySelector('button')!;

    for (const name of [' apple ', 'bread']) {
      input.value = name;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      // jsdom does not move focus on click, so do it as a browser would
      button.focus();
      button.click();
      expect(input.value).toBe('');
      expect(document.activeElement).toBe(input);
    }
    expect(added).toEqual(['apple', 'bread']);
  });
});
