const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getApiUrl(path: string): string {
  const base = API_URL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<{ data?: T; ok: boolean; status: number; error?: string }> {
  const url = getApiUrl(path);
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  let data: T | undefined;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      // ignore
    }
  }
  if (!res.ok) {
    const raw = data as unknown;
    let error = res.statusText || 'Request failed';
    if (raw && typeof raw === 'object' && 'message' in raw) {
      const msg = (raw as { message: unknown }).message;
      if (typeof msg === 'string') error = msg;
      else if (Array.isArray(msg)) error = msg.join(', ');
    }
    return { ok: false, status: res.status, error, data };
  }
  return { ok: true, status: res.status, data };
}

export type SignupResponse = { user: { id: number; email: string } };
export type SigninResponse = { user: { id: number; email: string } };
export type MeResponse = { user: { id: number; email: string } };

export async function signup(email: string, password: string) {
  return apiFetch<SignupResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signin(email: string, password: string) {
  return apiFetch<SigninResponse>('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' });
}

export async function getMe() {
  return apiFetch<MeResponse>('/auth/me');
}
