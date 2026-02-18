import { supabase } from './supabase';
import { API_BASE } from './runtimeConfig';

/**
 * Authenticated fetch utility.
 * Uses Supabase session token when available, otherwise falls back
 * to the token stored in the auth store (local dev without Supabase).
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  // Try Supabase session first
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

    // On 401, try refreshing the session and retry once
    if (response.status === 401 && session) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session?.access_token) {
        headers.set('Authorization', `Bearer ${refreshed.session.access_token}`);
        return fetch(`${API_BASE}${path}`, { ...options, headers });
      }
    }

    return response;
  }

  // Fallback: use token from Zustand auth store (localStorage)
  try {
    const stored = localStorage.getItem('terminal-zero-auth');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.token) {
        headers.set('Authorization', `Bearer ${state.token}`);
      }
    }
  } catch {
    // ignore parse errors
  }

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}
