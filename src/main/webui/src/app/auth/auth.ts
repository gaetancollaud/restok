import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';

/**
 * App initializer: authorization code flow with PKCE against the OIDC provider the backend names
 * in /auth-config. Resolves once a token is available; otherwise redirects to the provider's login.
 */
export async function login(): Promise<void> {
  const oauth = inject(OAuthService);
  const { issuer, clientId } = await (await fetch('/auth-config')).json();
  oauth.configure({
    issuer: issuer.replace(/\/$/, ''), // must equal the provider's "iss", which Keycloak writes without a trailing slash
    clientId,
    redirectUri: location.origin + '/',
    responseType: 'code',
    scope: 'openid profile email',
  });
  oauth.setupAutomaticSilentRefresh(); // uses the refresh token
  if (!(await oauth.loadDiscoveryDocumentAndLogin())) {
    return new Promise(() => {}); // redirecting to the login page: never render without a token
  }
}
