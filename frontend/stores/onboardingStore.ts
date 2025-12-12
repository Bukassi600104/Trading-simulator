/**
 * Onboarding Store for Terminal Zero
 * 
 * Manages user onboarding state and progress through different flows.
 * 0: Just Registered
 * 1: Segmentation Complete
 * 2: Tutorial Complete
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
  
  // Actions
  setExperience: (experience: UserExperience) => void;
  setStage: (stage: OnboardingStage) => void;
  updateSettings: (settings: Partial<OnboardingSettings>) => void;
  setTutorialStep: (step: number) => void;
  completeFirstTrade: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const defaultSettings: OnboardingSettings = {
  indicators: [],
  propModeEnabled: false,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      // Initial state
      stage: 0,
      experience: null,
      settings: defaultSettings,
      tutorialStep: 0,
      hasCompletedFirstTrade: false,

      // Set user experience level (segmentation)
      setExperience: (experience) => set({ experience, stage: 1 }),

      // Set onboarding stage
      setStage: (stage) => set({ stage }),

      // Update onboarding settings
      updateSettings: (newSettings) => 
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),

      // Set tutorial step
      setTutorialStep: (step) => set({ tutorialStep: step }),

      // Mark first trade as complete
      completeFirstTrade: () => 
        set({ hasCompletedFirstTrade: true, stage: 2 }),

      // Complete onboarding (for pro and instructor flows)
      completeOnboarding: () => 
        set({ stage: 2 }),

      // Reset onboarding (for testing)
      resetOnboarding: () => 
        set({
          stage: 0,
          experience: null,
          settings: defaultSettings,
          tutorialStep: 0,
          hasCompletedFirstTrade: false,
        }),
    }),
    {
      name: 'onboarding-storage',
    }
  )
);

// Helper function to generate trader tags
export function generateTraderTag(): string {
  const adjectives = [
    'Bull', 'Bear', 'Diamond', 'Moon', 'Whale', 'Alpha', 'Sigma', 
    'Swift', 'Silent', 'Golden', 'Silver', 'Iron', 'Steel', 'Crypto'
  ];
  const nouns = [
    'Trader', 'Hunter', 'Hands', 'Wolf', 'Shark', 'Eagle', 'Phoenix',
    'King', 'Queen', 'Master', 'Pro', 'Legend', 'Guru', 'Wizard'
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}
