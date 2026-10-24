import { TestBed } from '@angular/core/testing';
import { OAuthService } from 'angular-oauth2-oidc';
import { Menu, Page } from './menu';

describe('Menu', () => {
  const setup = (current: Page = 'list', revoke: Promise<unknown> = Promise.resolve()) => {
    const oauth = {
      issuer: 'https://idp/realms/r',
      getIdentityClaims: () => ({ preferred_username: 'alice' }),
      revokeTokenAndLogout: vi.fn().mockReturnValue(revoke),
      logOut: vi.fn(),
    };
    TestBed.configureTestingModule({ providers: [{ provide: OAuthService, useValue: oauth }] });
    const fixture = TestBed.createComponent(Menu);
    fixture.componentRef.setInput('current', current);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const went: Page[] = [];
    fixture.componentInstance.go.subscribe((p) => went.push(p));
    const dialog = el.querySelector('dialog')!;
    el.querySelector<HTMLButtonElement>('[aria-label="Menu"]')!.click();
    const entry = (text: string) =>
      [...el.querySelectorAll<HTMLElement>('.entry')].find((e) => e.textContent!.trim() === text)!;
    return { fixture, el, dialog, went, entry, oauth };
  };

  it('opens with pages at the top and the account at the bottom', () => {
    const { el, dialog } = setup();
    expect(dialog.open).toBe(true);
    expect([...el.querySelectorAll('.entry')].map((e) => e.textContent!.trim())).toEqual([
      'Products',
      'Shops',
      'alice',
      'Logout',
    ]);
  });

  it('marks the current page', () => {
    const { entry } = setup('shops');
    expect(entry('Shops').getAttribute('aria-current')).toBe('page');
    expect(entry('Products').hasAttribute('aria-current')).toBe(false);
  });

  it('goes to the chosen page and closes', () => {
    const { entry, dialog, went } = setup();
    entry('Shops').click();
    expect(went).toEqual(['shops']);
    expect(dialog.open).toBe(false);
  });

  it('links the name to the account page in a new tab', () => {
    const { entry } = setup();
    expect(entry('alice').getAttribute('href')).toBe('https://idp/realms/r/account');
    expect(entry('alice').getAttribute('target')).toBe('_blank');
  });

  it('revokes the tokens and logs out', async () => {
    const { entry, oauth } = setup();
    entry('Logout').click();
    await Promise.resolve();
    expect(oauth.revokeTokenAndLogout).toHaveBeenCalledOnce();
    expect(oauth.logOut).not.toHaveBeenCalled();
  });

  it('still logs out when revocation fails', async () => {
    const { entry, oauth } = setup('list', Promise.reject(new Error('offline')));
    entry('Logout').click();
    await new Promise((r) => setTimeout(r));
    expect(oauth.logOut).toHaveBeenCalledOnce();
  });

  it('closes on a backdrop click without navigating', () => {
    const { dialog, went } = setup();
    dialog.click();
    expect(dialog.open).toBe(false);
    expect(went).toEqual([]);
  });
});
