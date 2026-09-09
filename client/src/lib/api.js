import { API_BASE } from './apiBase';

export async function api(path, session, options = {}) {
  if (!session?.access_token) throw new Error('Your session has expired. Please log in again.');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Something went wrong');
  return body;
}
