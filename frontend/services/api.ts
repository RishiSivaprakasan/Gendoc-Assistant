const DEFAULT_API_BASE_URL = 'http://localhost:5000/api';

export function getApiBaseUrl() {
  const url = (import.meta.env.VITE_API_BASE_URL as string | undefined) || DEFAULT_API_BASE_URL;
  return url.replace(/\/+$/, '');
}

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = typeof data === 'object' && data && 'message' in data ? String((data as any).message) : 'Request failed';
    const err = new Error(message);
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }

  return data as T;
}
