import type { UserSummary } from '@njstore/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ANALYTICS_PROFILE_KEY = 'njstore:analytics-profile';
const ANALYTICS_EVENT_LOG_KEY = 'njstore:analytics-event-log';
const storageState = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string): string | null => storageState.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    storageState.set(key, value);
  }
};

const buildUser = (): UserSummary => ({
  id: 'user-123',
  name: 'Jane Customer',
  email: 'jane@example.com',
  role: 'customer',
  language: 'en',
  isEmailVerified: true,
  loyaltyPoints: 25
});

describe('analytics storage privacy', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    storageState.clear();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      writable: true,
      value: localStorageMock
    });
  });

  it('keeps runtime user identity out of persisted analytics storage', async () => {
    const { analytics } = await import('./analytics');
    const user = buildUser();

    analytics.identify(user);
    const trackedEvent = analytics.trackPageView('/shop', '?q=laptop');

    expect(trackedEvent.userId).toBe(user.id);

    const storedProfile = JSON.parse(window.localStorage.getItem(ANALYTICS_PROFILE_KEY) ?? 'null');
    const storedEventLog = JSON.parse(window.localStorage.getItem(ANALYTICS_EVENT_LOG_KEY) ?? 'null');

    expect(storedProfile.customer).toEqual({ isAuthenticated: true });
    expect(storedProfile.customer.userId).toBeUndefined();
    expect(storedProfile.customer.email).toBeUndefined();
    expect(storedProfile.customer.name).toBeUndefined();
    expect(storedEventLog[0]?.userId).toBeUndefined();
  });

  it('redacts legacy persisted identity fields when storage is touched again', async () => {
    window.localStorage.setItem(
      ANALYTICS_PROFILE_KEY,
      JSON.stringify({
        anonymousId: 'anon-1',
        firstSeenAt: '2026-01-01T00:00:00.000Z',
        lastSeenAt: '2026-01-02T00:00:00.000Z',
        acquisition: {
          source: 'direct',
          medium: 'none',
          landingPath: '/'
        },
        cohort: {
          acquisitionDate: '2026-01-01',
          acquisitionWeek: '2026-W01',
          acquisitionMonth: '2026-01'
        },
        customer: {
          userId: 'legacy-user',
          email: 'legacy@example.com',
          name: 'Legacy User',
          isAuthenticated: true
        },
        commerce: {
          quotationCount: 0,
          confirmedOrderCount: 0,
          revenue: 0,
          discountTotal: 0,
          shippingTotal: 0,
          taxTotal: 0,
          averageOrderValue: 0,
          loyaltyPointsAwarded: 0,
          ltv: 0,
          quotationIds: [],
          orderIds: []
        }
      })
    );
    window.localStorage.setItem(
      ANALYTICS_EVENT_LOG_KEY,
      JSON.stringify([
        {
          id: 'evt-1',
          event: 'page_view',
          timestamp: '2026-01-02T00:00:00.000Z',
          anonymousId: 'anon-1',
          userId: 'legacy-user',
          acquisition: {
            source: 'direct',
            medium: 'none',
            landingPath: '/'
          },
          cohort: {
            acquisitionDate: '2026-01-01',
            acquisitionWeek: '2026-W01',
            acquisitionMonth: '2026-01'
          },
          commerce: {
            quotationCount: 0,
            confirmedOrderCount: 0,
            revenue: 0,
            discountTotal: 0,
            shippingTotal: 0,
            taxTotal: 0,
            averageOrderValue: 0,
            loyaltyPointsAwarded: 0,
            ltv: 0
          },
          properties: {
            path: '/'
          }
        }
      ])
    );

    const { analytics } = await import('./analytics');

    analytics.captureAcquisition();
    analytics.trackPageView('/');

    const storedProfile = JSON.parse(window.localStorage.getItem(ANALYTICS_PROFILE_KEY) ?? 'null');
    const storedEventLog = JSON.parse(window.localStorage.getItem(ANALYTICS_EVENT_LOG_KEY) ?? 'null');

    expect(storedProfile.customer).toEqual({ isAuthenticated: true });
    expect(storedEventLog.every((event: { userId?: string }) => event.userId === undefined)).toBe(true);
  });

  it('batches endpoint forwarding and flushes on pagehide', async () => {
    vi.stubEnv('VITE_ANALYTICS_ENDPOINT', '/analytics');
    const sendBeacon = vi.fn<(url: string, data?: BodyInit | null) => boolean>(() => true);

    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: sendBeacon
    });

    const { analytics } = await import('./analytics');

    analytics.trackPageView('/shop');
    analytics.trackSearch('laptop', 8);

    expect(sendBeacon).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('pagehide'));

    const readBeaconBody = async (body: BodyInit | null | undefined): Promise<string> => {
      if (typeof body === 'string') {
        return body;
      }

      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(String(reader.result)));
        reader.addEventListener('error', () => reject(reader.error));
        reader.readAsText(body as unknown as Blob);
      });
    };
    const analyticsPayloads = await Promise.all(
      sendBeacon.mock.calls
        .filter(([endpoint]) => endpoint === '/analytics')
        .map(async ([, body]) => JSON.parse(await readBeaconBody(body)) as { events: Array<{ event: string }> })
    );

    expect(analyticsPayloads.map((payload) => payload.events.map((event) => event.event))).toContainEqual(['page_view', 'search']);
  });
});
