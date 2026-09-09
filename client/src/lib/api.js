const PRODUCTION_API_BASE = 'https://workflowx-2io0.onrender.com';
const configuredApiBase = import.meta.env.VITE_API_URL?.trim();

export const API_BASE = configuredApiBase && !/localhost|127\.0\.0\.1/i.test(configuredApiBase)
  ? configuredApiBase.replace(/\/$/, '')
  : PRODUCTION_API_BASE;

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
