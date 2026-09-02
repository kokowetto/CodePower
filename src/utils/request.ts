const BASE_URL = '/api';

interface RequestOptions extends RequestInit {
  data?: unknown;
}

export async function request<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('cp_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = { ...options, headers };

  if (options.data !== undefined) {
    config.body = JSON.stringify(options.data);
  }

  const response = await fetch(`${BASE_URL}${url}`, config);

  if (response.status === 401) {
    localStorage.removeItem('cp_token');
    localStorage.removeItem('cp_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const resData = await response.json() as { code: number; message: string; data: T };
  if (resData.code !== 0) {
    throw new Error(resData.message || 'Request failed');
  }

  return resData.data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const get = <T = any>(url: string) => request<T>(url, { method: 'GET' });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const post = <T = any>(url: string, data?: unknown) => request<T>(url, { method: 'POST', data });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const put = <T = any>(url: string, data?: unknown) => request<T>(url, { method: 'PUT', data });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const patch = <T = any>(url: string, data?: unknown) => request<T>(url, { method: 'PATCH', data });
