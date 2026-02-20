import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/runtimeConfig';
import { useAuthStore } from '@/stores/authStore';

interface SubscriptionData {
  plan: string | null;
  status: string | null;
  periodEnd: string | null;
  trialEnd: string | null;
  isTrialActive: boolean;
  trialDaysLeft: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSubscription(): SubscriptionData {
  const token = useAuthStore((s) => s.token);
  const [plan, setPlan] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/billing/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch subscription (${res.status})`);
      }
      const data = await res.json();
      setPlan(data.plan || null);
      setStatus(data.status || null);
      setPeriodEnd(data.period_end || null);
      setTrialEnd(data.trial_end || null);
      setIsTrialActive(data.is_trial || false);

      if (data.trial_end) {
        const daysLeft = Math.max(
          0,
          Math.ceil(
            (new Date(data.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        );
        setTrialDaysLeft(daysLeft);
      } else {
        setTrialDaysLeft(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [token]);

  return {
    plan,
    status,
    periodEnd,
    trialEnd,
    isTrialActive,
    trialDaysLeft,
    isLoading,
    error,
    refetch: fetchSubscription,
  };
}
