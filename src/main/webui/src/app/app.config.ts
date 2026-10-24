import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { InMemoryCache } from '@apollo/client';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { OAuthStorage, provideOAuthClient } from 'angular-oauth2-oidc';
import { login } from './auth/auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptorsFromDi()),
    // Sends the access token to /graphql
    provideOAuthClient({ resourceServer: { allowedUrls: ['/graphql'], sendAccessToken: true } }),
    // Keeps the login across app restarts (the default, sessionStorage, dies with the tab)
    { provide: OAuthStorage, useFactory: () => localStorage },
    provideAppInitializer(login),
    provideApollo(() => ({
      link: inject(HttpLink).create({ uri: '/graphql' }),
      cache: new InMemoryCache(),
    })),
    // Caches the app shell and detects new deployments; production builds only
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
