import { useAuth } from '@clerk/expo';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

import { useDevBypass } from '@/lib/dev-bypass';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

// In dev the API routes are served by the same Expo dev server as the JS bundle.
function baseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri;
  if (!host) throw new ApiError(0, 'no_api_url', 'Set EXPO_PUBLIC_API_URL to reach the API.');
  return `http://${host}`;
}

type RequestOptions = { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown };

export function useApi() {
  const { getToken } = useAuth();
  const devBypass = useDevBypass();

  return async function api<T>(path: string, { method = 'GET', body }: RequestOptions = {}) {
    const headers: Record<string, string> = { Accept: 'application/json' };
    // A FormData body sets its own multipart Content-Type (with the boundary).
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (__DEV__ && devBypass) headers['x-dev-bypass'] = '1';

    let response: Response;
    try {
      response = await fetch(`${baseUrl()}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      });
    } catch {
      Sentry.logger.warn('API network error', { path, method });
      throw new ApiError(0, 'network', 'Network request failed');
    }

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      // 4xx are expected (validation, quota); only 5xx point at a server problem.
      if (response.status >= 500) {
        Sentry.logger.error('API request failed', { path, method, status: response.status });
      }
      throw new ApiError(
        response.status,
        typeof data.error === 'string' ? data.error : 'request_failed',
        typeof data.message === 'string' ? data.message : `Request failed (${response.status})`,
        data,
      );
    }
    return data as T;
  };
}
