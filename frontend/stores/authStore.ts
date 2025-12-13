/**
 * Authentication Store for Terminal Zero
 * 
 * Manages user authentication state with JWT tokens.
 * Uses Zustand for state management with persistence.
 */

import { API_BASE } from '@/lib/runtimeConfig';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 15000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function safeJson(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// Types
export interface User {
  id: string;
  email: string;
  tier: 'free' | 'premium' | 'pro' | 'FREE' | 'PRO' | 'PROP_CHALLENGE';
  is_active: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<{ message: string; reset_token?: string | null } | null>;
  resetPassword: (token: string, newPassword: string) => Promise<boolean>;
  logout: () => void;
  getDemoToken: () => Promise<boolean>;
  clearError: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      // Login with email and password
      login: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetchWithTimeout(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          
          if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData?.detail || `Login failed (${response.status})`);
          }
          
          const data = await response.json();
          
          set({
            user: data.user,
            token: data.token.access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          return true;
        } catch (err) {
          const message =
            err instanceof DOMException && err.name === 'AbortError'
              ? 'Login timed out. Please try again.'
              : err instanceof TypeError
                ? 'Unable to reach the API server. Check your connection and API URL.'
                : err instanceof Error
                  ? err.message
                  : 'Login failed';
          set({ isLoading: false, error: message, isAuthenticated: false });
          return false;
        }
      },

      // Register new user
      register: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetchWithTimeout(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          
          if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData?.detail || `Registration failed (${response.status})`);
          }
          
          const data = await response.json();
          
          set({
            user: data.user,
            token: data.token.access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          return true;
        } catch (err) {
          const message =
            err instanceof DOMException && err.name === 'AbortError'
              ? 'Registration timed out. Please try again.'
              : err instanceof TypeError
                ? 'Unable to reach the API server. Check your connection and API URL.'
                : err instanceof Error
                  ? err.message
                  : 'Registration failed';
          set({ isLoading: false, error: message, isAuthenticated: false });
          return false;
        }
      },

      requestPasswordReset: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetchWithTimeout(`${API_BASE}/api/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });

          if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData?.detail || `Request failed (${response.status})`);
          }

          const data = await response.json();
          set({ isLoading: false, error: null });
          return data;
        } catch (err) {
          const message =
            err instanceof DOMException && err.name === 'AbortError'
              ? 'Request timed out. Please try again.'
              : err instanceof TypeError
                ? 'Unable to reach the API server. Check your connection and API URL.'
                : err instanceof Error
                  ? err.message
                  : 'Request failed';
          set({ isLoading: false, error: message });
          return null;
        }
      },

      resetPassword: async (token: string, newPassword: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetchWithTimeout(`${API_BASE}/api/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, new_password: newPassword }),
          });

          if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData?.detail || `Reset failed (${response.status})`);
          }

          set({ isLoading: false, error: null });
          return true;
        } catch (err) {
          const message =
            err instanceof DOMException && err.name === 'AbortError'
              ? 'Reset timed out. Please try again.'
              : err instanceof TypeError
                ? 'Unable to reach the API server. Check your connection and API URL.'
                : err instanceof Error
                  ? err.message
                  : 'Reset failed';
          set({ isLoading: false, error: message });
          return false;
        }
      },

      // Logout
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // Get demo account token
      getDemoToken: async (): Promise<boolean> => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetchWithTimeout(`${API_BASE}/api/auth/demo`, {
            method: 'POST',
          });
          
          if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData?.detail || `Failed to get demo token (${response.status})`);
          }
          
          const data = await response.json();
          
          set({
            user: data.user,
            token: data.token.access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          return true;
        } catch (err) {
          const message =
            err instanceof DOMException && err.name === 'AbortError'
              ? 'Demo login timed out. Please try again.'
              : err instanceof TypeError
                ? 'Unable to reach the API server. Check your connection and API URL.'
                : err instanceof Error
                  ? err.message
                  : 'Failed to get demo token';
          set({ isLoading: false, error: message, isAuthenticated: false });
          return false;
        }
      },

      // Clear error message
      clearError: () => {
        set({ error: null });
      },

      // Check if current token is valid
      checkAuth: async (): Promise<boolean> => {
        const { token } = get();
        
        if (!token) {
          set({ isAuthenticated: false });
          return false;
        }
        
        try {
          const response = await fetchWithTimeout(`${API_BASE}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }, 15000);
          
          if (!response.ok) {
            set({ user: null, token: null, isAuthenticated: false });
            return false;
          }
          
          const user = await response.json();
          set({ user, isAuthenticated: true });
          return true;
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
          return false;
        }
      },
    }),
    {
      name: 'terminal-zero-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helper hook for API requests with auth
export function useAuthenticatedFetch() {
  const token = useAuthStore((state) => state.token);
  
  return async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    return fetch(url, { ...options, headers });
  };
}
