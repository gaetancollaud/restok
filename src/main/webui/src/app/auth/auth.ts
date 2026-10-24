import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';

/**
 * App initializer: authorization code flow with PKCE against the OIDC provider the backend names
 * in /auth-config. The offline_access scope and localStorage (see app.config.ts) keep the login
 * across restarts. Resolves once a token is available, renewing a stored one if needed; otherwise
 * redirects to the provider's login.
 */
export async function login(): Promise<void> {
  const oauth = inject(OAuthService);
  const { issuer, clientId } = await (await fetch('/auth-config')).json();
  oauth.configure({
    issuer: issuer.replace(/\/$/, ''), // must equal the provider's "iss", which Keycloak writes without a trailing slash
    clientId,
    redirectUri: location.origin + '/',
    responseType: 'code',
    scope: 'openid profile email offline_access',
  });
  oauth.setupAutomaticSilentRefresh(); // uses the refresh token
  await oauth.loadDiscoveryDocumentAndTryLogin();
  if (oauth.hasValidAccessToken()) return;
  if (oauth.getRefreshToken()) {
    try {
      await oauth.refreshToken();
      return;
    } catch {
      // ponytail: any refresh failure (rejected or network) means log in again
    }
  }
  oauth.logOut(true); // drops stale tokens, no redirect to the provider
  oauth.initCodeFlow();
  return new Promise(() => {}); // redirecting to the login page: never render without a token
}
