import { Component, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';

export type Page = 'list' | 'shops';

/** Header menu button and the drawer it opens: pages at the top, account at the bottom. */
@Component({
  selector: 'app-menu',
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  readonly current = input.required<Page>();
  /** A page was chosen; the drawer closes itself. */
  readonly go = output<Page>();

  private readonly oauth = inject(OAuthService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly user: string = this.oauth.getIdentityClaims()?.['preferred_username'] ?? 'Account';
  // ponytail: Keycloak's account console path; another provider needs its own URL
  protected readonly profileUrl = `${this.oauth.issuer}/account`;

  protected open(): void {
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected choose(page: Page): void {
    this.close();
    this.go.emit(page);
  }

  /** Revoking the refresh token ends the offline session; logs out anyway if that fails. */
  protected logout(): void {
    this.oauth.revokeTokenAndLogout().catch(() => this.oauth.logOut());
  }

  /** A click on the backdrop lands on the dialog itself, outside its content box. */
  protected backdrop(e: MouseEvent): void {
    if (e.target === this.dialog().nativeElement) this.close();
  }
}
