// frontend/src/lib/fetchWithAuth.ts
/**
 * Helper global para fetch con X-API-Key.
 * Úsalo en cualquier componente/página que haga fetch directo al backend,
 * en lugar de usar la función fetch() nativa.
 *
 * Ejemplo:
 *   import { fetchWithAuth } from '@/lib/fetchWithAuth';
 *   const res = await fetchWithAuth(`${API_URL}/crm/boards`);
 */

const DASHBOARD_API_KEY = process.env.NEXT_PUBLIC_API_KEY || process.env.NEXT_PUBLIC_DASHBOARD_API_KEY || '';

export function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers as HeadersInit);
  if (DASHBOARD_API_KEY) {
    headers.set('X-API-Key', DASHBOARD_API_KEY);
  }
  return fetch(url, { ...options, headers });
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
