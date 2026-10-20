import { afterEach, describe, expect, it } from 'vitest';
import api from './api';

afterEach(() => {
  localStorage.clear();
});

describe('API client', () => {
  it('builds a development API URL and includes credentials', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:5001/api');
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('unwraps the standard successful API response body', async () => {
    const result = await api.get('/health', {
      adapter: async (config) => ({
        data: { success: true, message: 'healthy', data: { status: 'ok' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }),
    });

    expect(result).toEqual({
      success: true,
      message: 'healthy',
      data: { status: 'ok' },
    });
  });

  it('normalizes API errors using the server error message', async () => {
    await expect(
      api.get('/auth/me', {
        adapter: async (config) => {
          const error = new Error('Request failed with status code 401');
          error.config = config;
          error.response = {
            data: { message: 'Not authorized, no token session found' },
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
          };
          throw error;
        },
      }),
    ).rejects.toMatchObject({
      message: 'Not authorized, no token session found',
      status: 401,
    });
  });
});
