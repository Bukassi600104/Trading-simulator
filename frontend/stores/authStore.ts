/**
 * Authentication Store for Terminal Zero
 * 
 * Manages user authentication state with JWT tokens.
 * Uses Zustand for state management with persistence.
 */

import { API_BASE } from '@/lib/runtimeConfig';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
          const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Login failed');
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
          const message = err instanceof Error ? err.message : 'Login failed';
          set({ isLoading: false, error: message, isAuthenticated: false });
          return false;
        }
      },

      // Register new user
      register: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Registration failed');
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
          const message = err instanceof Error ? err.message : 'Registration failed';
          set({ isLoading: false, error: message, isAuthenticated: false });
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
          const response = await fetch(`${API_BASE}/api/auth/demo`, {
            method: 'POST',
          });
          
          if (!response.ok) {
            throw new Error('Failed to get demo token');
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
          const message = err instanceof Error ? err.message : 'Failed to get demo token';
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
          const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
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
