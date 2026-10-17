import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

/** Chromium's install prompt event; not in the TS DOM lib. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
}

/** Whether the app can be installed or updated, and the actions behind the header button. */
@Injectable({ providedIn: 'root' })
export class Pwa {
  // Absent when no service worker is provided (specs); disabled in dev mode
  private readonly sw = inject(SwUpdate, { optional: true });
  private deferred: InstallPromptEvent | null = null;

  /** The browser offers to install the app (Chromium, not installed yet). */
  readonly canInstall = signal(false);
  /** A newer deployed version is downloaded and ready to activate. */
  readonly updateReady = signal(false);

  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); // no browser mini-infobar; the header button prompts instead
      this.deferred = e as InstallPromptEvent;
      this.canInstall.set(true);
    });
    window.addEventListener('appinstalled', () => this.clearInstall());
    if (this.sw?.isEnabled) {
      this.sw.versionUpdates
        .pipe(filter((e) => e.type === 'VERSION_READY'))
        .subscribe(() => this.updateReady.set(true));
    }
  }

  /** Opens the browser's install prompt; it can only be used once, accepted or not. */
  async install(): Promise<void> {
    const prompt = this.deferred;
    this.clearInstall();
    await prompt?.prompt();
  }

  /** Switches to the downloaded version and reloads onto it. */
  async update(): Promise<void> {
    await this.sw?.activateUpdate();
    document.location.reload();
  }

  private clearInstall(): void {
    this.deferred = null;
    this.canInstall.set(false);
  }
}
