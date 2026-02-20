import { useAuthStore } from '@/stores/authStore'

const FEATURE_MAP: Record<string, 'pro' | 'elite'> = {
  'realtime_data': 'pro',
  'backtesting': 'pro',
  'advanced_analytics': 'pro',
  'ai_coaching': 'pro',
  'multiple_portfolios': 'pro',
  'defi_simulation': 'elite',
  'copy_trading': 'elite',
  'strategy_builder': 'elite',
  'private_leaderboards': 'elite',
}

export function useFeatureGate(feature: string) {
  const { user } = useAuthStore()
  const tier = user?.tier || 'FREE'
  const required = FEATURE_MAP[feature]

  if (!required) return { hasAccess: true, requiredPlan: null }

  const tierRank: Record<string, number> = { FREE: 0, free: 0, PRO: 1, pro: 1, premium: 1, PROP_CHALLENGE: 1, ELITE: 2, elite: 2 }
  const hasAccess = (tierRank[tier] ?? 0) >= (required === 'pro' ? 1 : 2)

  return { hasAccess, requiredPlan: hasAccess ? null : required }
}
