/**
 * Onboarding Store for Terminal Zero
 *
 * Manages user onboarding state and syncs to the backend DB via PATCH /api/auth/me/onboarding.
 *
 * Stages:
 *   0 = Just Registered
 *   1 = Segmentation Complete (chose experience level)
 *   2 = Tutorial / Setup Complete
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserExperience = 'beginner' | 'experienced' | 'instructor' | null;
export type OnboardingStage = 0 | 1 | 2;

export interface OnboardingSettings {
  // Flow B: Pro settings
  assetClass?: string;
  layout?: string;
  indicators: string[];
  propModeEnabled: boolean;
  propSettings?: {
    drawdown: string;
    profitTarget: string;
    timeLimit: string;
  };
  // Flow C: Instructor settings
  organizationName?: string;
  organizationType?: string;
  classroomName?: string;
}

export interface OnboardingState {
  // State
  stage: OnboardingStage;
  experience: UserExperience;
  settings: OnboardingSettings;
  tutorialStep: number;
  hasCompletedFirstTrade: boolean;
  tradertag: string | null;

  // Actions
  setExperience: (experience: UserExperience, token?: string) => void;
  setStage: (stage: OnboardingStage, token?: string) => void;
  updateSettings: (settings: Partial<OnboardingSettings>) => void;
  setTutorialStep: (step: number) => void;
  setTradertag: (tag: string, token?: string) => void;
  completeFirstTrade: (token?: string) => void;
  completeOnboarding: (token?: string) => void;
  resetOnboarding: () => void;
}

const defaultSettings: OnboardingSettings = {
  indicators: [],
  propModeEnabled: false,
};

/** Sync onboarding stage (and optional username) to backend DB */
async function syncToBackend(
  stage: OnboardingStage,
  token?: string,
  username?: string
): Promise<void> {
  if (!token) return;
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/me/onboarding`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stage, username }),
    });
  } catch (e) {
    // Non-critical — local state is the source of truth until user logs in again
    console.warn('[onboardingStore] Failed to sync stage to backend:', e);
  }
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      // Initial state
      stage: 0,
      experience: null,
      settings: defaultSettings,
      tutorialStep: 0,
      hasCompletedFirstTrade: false,
      tradertag: null,

      // Set user experience level (segmentation) → stage 1
      setExperience: (experience, token) => {
        set({ experience, stage: 1 });
        syncToBackend(1, token);
      },

      // Manually set stage
      setStage: (stage, token) => {
        set({ stage });
        syncToBackend(stage, token);
      },

      // Update settings (layout, prop mode, org details, etc.)
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      // Set tutorial step
      setTutorialStep: (step) => set({ tutorialStep: step }),

      // Set Trader Tag and sync to backend
      setTradertag: (tag, token) => {
        set({ tradertag: tag });
        const { stage } = get();
        syncToBackend(stage, token, tag);
      },

      // Mark first trade complete → stage 2
      completeFirstTrade: (token) => {
        set({ hasCompletedFirstTrade: true, stage: 2 });
        syncToBackend(2, token);
      },

      // Complete onboarding (Pro / Instructor flows) → stage 2
      completeOnboarding: (token) => {
        set({ stage: 2 });
        syncToBackend(2, token);
      },

      // Reset (used when user logs out or starts fresh)
      resetOnboarding: () =>
        set({
          stage: 0,
          experience: null,
          settings: defaultSettings,
          tutorialStep: 0,
          hasCompletedFirstTrade: false,
          tradertag: null,
        }),
    }),
    {
      name: 'onboarding-storage',
    }
  )
);

// ---------------------------------------------------------------------------
// Trader Tag generator
// ---------------------------------------------------------------------------
export function generateTraderTag(): string {
  const adjectives = [
    'Bull', 'Bear', 'Diamond', 'Moon', 'Whale', 'Alpha', 'Sigma',
    'Swift', 'Silent', 'Golden', 'Silver', 'Iron', 'Steel', 'Crypto',
  ];
  const nouns = [
    'Trader', 'Hunter', 'Hands', 'Wolf', 'Shark', 'Eagle', 'Phoenix',
    'King', 'Queen', 'Master', 'Pro', 'Legend', 'Guru', 'Wizard',
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}
