import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { Pwa } from './pwa';

describe('Pwa', () => {
  const setup = (sw?: Partial<SwUpdate>) => {
    TestBed.configureTestingModule({ providers: sw ? [{ provide: SwUpdate, useValue: sw }] : [] });
    return TestBed.inject(Pwa);
  };

  const offerInstall = () => {
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn().mockResolvedValue({ outcome: 'dismissed' }),
    });
    window.dispatchEvent(event);
    return event;
  };

  it('offers install until the prompt is used', async () => {
    const pwa = setup();
    expect(pwa.canInstall()).toBe(false);

    const event = offerInstall();
    expect(event.defaultPrevented).toBe(true);
    expect(pwa.canInstall()).toBe(true);

    await pwa.install();
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(pwa.canInstall()).toBe(false);
  });

  it('stops offering install once installed', () => {
    const pwa = setup();
    offerInstall();
    window.dispatchEvent(new Event('appinstalled'));
    expect(pwa.canInstall()).toBe(false);
  });

  it('flags an update only when the new version is ready', () => {
    const versionUpdates = new Subject<VersionEvent>();
    const pwa = setup({ isEnabled: true, versionUpdates });

    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'b' } });
    expect(pwa.updateReady()).toBe(false);

    versionUpdates.next({ type: 'VERSION_READY', currentVersion: { hash: 'a' }, latestVersion: { hash: 'b' } });
    expect(pwa.updateReady()).toBe(true);
  });
});
