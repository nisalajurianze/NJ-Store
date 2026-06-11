import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const requestHandlers: Array<(config: Record<string, unknown>) => Promise<unknown> | unknown> = [];
  const responseErrorHandlers: Array<(error: Record<string, unknown>) => Promise<unknown>> = [];
  const apiInstance = Object.assign(
    vi.fn(async (config: Record<string, unknown>) => ({ config })),
    {
      interceptors: {
        request: {
          use: vi.fn((handler: (config: Record<string, unknown>) => Promise<unknown> | unknown) => {
            requestHandlers.push(handler);
            return requestHandlers.length - 1;
          })
        },
        response: {
          use: vi.fn((_: unknown, handler: (error: Record<string, unknown>) => Promise<unknown>) => {
            responseErrorHandlers.push(handler);
            return responseErrorHandlers.length - 1;
          })
        }
      }
    }
  );

  return {
    apiInstance,
    axiosCreateMock: vi.fn(() => apiInstance),
    axiosGetMock: vi.fn(),
    resolveApiBaseUrlMock: vi.fn(() => '/api/v1'),
    requestHandlers,
    responseErrorHandlers
  };
});

vi.mock('axios', () => ({
  default: {
    create: mocks.axiosCreateMock,
    get: mocks.axiosGetMock
  },
  create: mocks.axiosCreateMock,
  get: mocks.axiosGetMock
}));

vi.mock('../utils/apiConfig', () => ({
  resolveApiBaseUrl: mocks.resolveApiBaseUrlMock
}));

const loadApiModule = async () => {
  vi.resetModules();
  mocks.requestHandlers.length = 0;
  mocks.responseErrorHandlers.length = 0;
  mocks.apiInstance.mockReset();
  mocks.apiInstance.mockImplementation(async (config: Record<string, unknown>) => ({ config }));
  mocks.axiosCreateMock.mockClear();
  mocks.axiosGetMock.mockReset();
  mocks.resolveApiBaseUrlMock.mockClear();

  return import('./api');
};

describe('store api client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not bypass refresh for routes that merely contain an auth-like substring', async () => {
    const apiModule = await loadApiModule();
    const refreshHandler = vi.fn().mockResolvedValue('renewed-token');
    apiModule.registerRefreshHandler(refreshHandler);

    await mocks.responseErrorHandlers[0]({
      config: {
        url: '/auth-products',
        headers: {}
      },
      response: {
        status: 401,
        data: {}
      }
    });

    expect(refreshHandler).toHaveBeenCalledTimes(1);
    expect(mocks.apiInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/auth-products',
        headers: expect.objectContaining({
          Authorization: 'Bearer renewed-token'
        })
      })
    );
  });

  it('throws a session-expired error when refresh cannot recover the request', async () => {
    const apiModule = await loadApiModule();
    apiModule.registerRefreshHandler(vi.fn().mockResolvedValue(null));

    await expect(
      mocks.responseErrorHandlers[0]({
        config: {
          url: '/orders',
          headers: {}
        },
        response: {
          status: 401,
          data: {}
        }
      })
    ).rejects.toThrow('Session expired. Please sign in again.');

    expect(mocks.apiInstance).not.toHaveBeenCalled();
  });
});
