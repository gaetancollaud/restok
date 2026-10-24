import { TestBed } from '@angular/core/testing';
import { OAuthService } from 'angular-oauth2-oidc';
import { login } from './auth';

describe('login', () => {
  const setup = (state: { valid?: boolean; refreshToken?: string; refresh?: Promise<unknown> } = {}) => {
    const oauth = {
      configure: vi.fn(),
      setupAutomaticSilentRefresh: vi.fn(),
      loadDiscoveryDocumentAndTryLogin: vi.fn().mockResolvedValue(true),
      hasValidAccessToken: vi.fn().mockReturnValue(state.valid ?? false),
      getRefreshToken: vi.fn().mockReturnValue(state.refreshToken ?? null),
      refreshToken: vi.fn().mockReturnValue(state.refresh ?? Promise.resolve({})),
      logOut: vi.fn(),
      initCodeFlow: vi.fn(),
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ json: async () => ({ issuer: 'https://idp/realms/r/', clientId: 'restok' }) }),
    );
    TestBed.configureTestingModule({ providers: [{ provide: OAuthService, useValue: oauth }] });
    const result = TestBed.runInInjectionContext(login);
    let settled = false;
    result.then(() => (settled = true));
    const flush = () => new Promise((r) => setTimeout(r));
    return { oauth, result, flush, settled: () => settled };
  };

  afterEach(() => vi.unstubAllGlobals());

  it('asks for an offline token', async () => {
    const { oauth, result } = setup({ valid: true });
    await result;
    expect(oauth.configure).toHaveBeenCalledWith(
      expect.objectContaining({ scope: expect.stringContaining('offline_access'), issuer: 'https://idp/realms/r' }),
    );
  });

  it('renders with a stored valid token', async () => {
    const { oauth, result } = setup({ valid: true });
    await result;
    expect(oauth.refreshToken).not.toHaveBeenCalled();
    expect(oauth.initCodeFlow).not.toHaveBeenCalled();
  });

  it('renews an expired token without a redirect', async () => {
    const { oauth, result } = setup({ refreshToken: 'rt' });
    await result;
    expect(oauth.refreshToken).toHaveBeenCalledOnce();
    expect(oauth.initCodeFlow).not.toHaveBeenCalled();
  });

  it('drops the tokens and logs in again when the refresh is rejected', async () => {
    const { oauth, flush, settled } = setup({ refreshToken: 'rt', refresh: Promise.reject(new Error('invalid_grant')) });
    await flush();
    expect(oauth.logOut).toHaveBeenCalledWith(true);
    expect(oauth.initCodeFlow).toHaveBeenCalledOnce();
    expect(settled()).toBe(false);
  });

  it('logs in when nothing is stored', async () => {
    const { oauth, flush, settled } = setup();
    await flush();
    expect(oauth.refreshToken).not.toHaveBeenCalled();
    expect(oauth.initCodeFlow).toHaveBeenCalledOnce();
    expect(settled()).toBe(false);
  });
});
