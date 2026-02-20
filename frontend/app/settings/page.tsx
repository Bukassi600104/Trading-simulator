"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/stores/authStore";
import { API_BASE } from "@/lib/runtimeConfig";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  children,
  danger,
}: {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      className={`mb-8 rounded-2xl border p-6 ${
        danger
          ? "border-red-500/20 bg-dark-900"
          : "border-dark-700/40 bg-dark-900"
      }`}
    >
      <h2 className="mb-5 text-lg font-semibold text-dark-100">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-dark-700/30 last:border-0">
      <span className="text-sm text-dark-400">{label}</span>
      <span className="text-sm text-dark-200">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete-account confirmation modal
// ---------------------------------------------------------------------------

function DeleteAccountModal({
  onConfirm,
  onCancel,
  isDeleting,
  error,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  error: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-red-500/30 bg-dark-900 p-6 shadow-2xl">
        <h3 className="mb-2 text-lg font-bold text-red-400">Delete Account</h3>
        <p className="mb-2 text-sm text-dark-300">
          This action is permanent and cannot be undone.
        </p>
        <ul className="mb-6 ml-4 list-disc space-y-1 text-sm text-dark-400">
          <li>Your email and password will be anonymised</li>
          <li>Your trading history and journal will remain for audit purposes</li>
          <li>You will be signed out immediately</li>
        </ul>
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-dark-700 bg-dark-800 px-4 py-2.5 text-sm font-medium text-dark-200 transition-colors hover:bg-dark-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Yes, Delete My Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notification toggle row
// ---------------------------------------------------------------------------

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-dark-700/30 last:border-0">
      <div className="mr-4">
        <p className="text-sm font-medium text-dark-200">{label}</p>
        <p className="text-xs text-dark-500">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary-500" : "bg-dark-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MeResponse {
  id: string;
  email: string;
  tier: string;
  xp_total: number;
  trial_end_date: string | null;
  is_trial_active: boolean;
  effective_tier: string;
  created_at: string;
}

interface ReferralResponse {
  referral_code: string;
  referral_link: string;
  referral_count: number;
  rewards_earned_days: number;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const router = useRouter();
  const { token, logout, checkAuth } = useAuthStore();

  const [isChecking, setIsChecking] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [referral, setReferral] = useState<ReferralResponse | null>(null);
  const [copiedReferral, setCopiedReferral] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Notification prefs (local optimistic state)
  const [emailTradeAlerts, setEmailTradeAlerts] = useState(true);
  const [emailNewsletter, setEmailNewsletter] = useState(false);
  const [emailTrialReminders, setEmailTrialReminders] = useState(true);

  // Data & Privacy
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Auth check + data load
  // -------------------------------------------------------------------------

  useEffect(() => {
    const run = async () => {
      const ok = await checkAuth();
      if (!ok) {
        router.replace("/landing?auth=login");
        return;
      }
      setIsChecking(false);
    };
    run();
  }, [checkAuth, router]);

  const fetchMe = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setMe(await res.json());
    } catch {
      // non-fatal
    }
  }, [token]);

  const fetchReferral = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/gamification/referral`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setReferral(await res.json());
    } catch {
      // non-fatal
    }
  }, [token]);

  useEffect(() => {
    if (!isChecking) {
      fetchMe();
      fetchReferral();
    }
  }, [isChecking, fetchMe, fetchReferral]);

  // -------------------------------------------------------------------------
  // Password change
  // -------------------------------------------------------------------------

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Failed to update password");
      }

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to update password"
      );
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // -------------------------------------------------------------------------
  // Copy referral code
  // -------------------------------------------------------------------------

  const handleCopyReferral = async () => {
    if (!referral?.referral_code) return;
    try {
      await navigator.clipboard.writeText(referral.referral_code);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  // -------------------------------------------------------------------------
  // Export data
  // -------------------------------------------------------------------------

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/account/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `terminal-zero-data-${me?.id ?? "export"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // surface silently — user can retry
    } finally {
      setIsExporting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Delete account
  // -------------------------------------------------------------------------

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`${API_BASE}/api/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Deletion failed");
      }
      logout();
      router.replace("/landing");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Deletion failed. Please try again."
      );
      setIsDeleting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Loading guard
  // -------------------------------------------------------------------------

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-t0-void">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const tierLabel = (me?.effective_tier ?? me?.tier ?? "FREE").toUpperCase();
  const isTrial = me?.is_trial_active ?? false;
  const trialEnd = me?.trial_end_date
    ? new Date(me.trial_end_date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <>
      {showDeleteModal && (
        <DeleteAccountModal
          onConfirm={handleDeleteAccount}
          onCancel={() => {
            setShowDeleteModal(false);
            setDeleteError(null);
          }}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}

      <AppShell>
        <div className="mx-auto max-w-2xl p-6 md:p-8">
          <h1 className="mb-8 text-2xl font-bold text-dark-100">Settings</h1>

          {/* ---------------------------------------------------------------- */}
          {/* 1. Profile                                                        */}
          {/* ---------------------------------------------------------------- */}
          <SectionCard title="Profile">
            <Row label="Email" value={<span className="font-mono">{me?.email ?? "—"}</span>} />
            <Row
              label="Tier"
              value={
                <span className="rounded-md bg-primary-500/10 px-2.5 py-1 text-xs font-semibold text-primary-400">
                  {tierLabel}
                </span>
              }
            />
            <Row
              label="Member since"
              value={
                me?.created_at
                  ? new Date(me.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "—"
              }
            />
            <Row
              label="Total XP"
              value={
                <span className="font-mono text-yellow-400">
                  {me ? `${me.xp_total ?? 0} XP` : "—"}
                </span>
              }
            />

            {referral && (
              <div className="mt-4 rounded-xl border border-dark-700/40 bg-t0-void p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-dark-500">
                  Your Referral Code
                </p>
                <div className="flex items-center gap-3">
                  <span className="flex-1 font-mono text-xl font-bold tracking-widest text-primary-400">
                    {referral.referral_code}
                  </span>
                  <button
                    onClick={handleCopyReferral}
                    className="rounded-lg border border-dark-700 bg-dark-800 px-3 py-1.5 text-xs font-medium text-dark-300 transition-colors hover:bg-dark-700"
                  >
                    {copiedReferral ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-dark-500">
                  {referral.referral_count} referral{referral.referral_count !== 1 ? "s" : ""}{" "}
                  &middot; {referral.rewards_earned_days} bonus day
                  {referral.rewards_earned_days !== 1 ? "s" : ""} earned
                </p>
              </div>
            )}
          </SectionCard>

          {/* ---------------------------------------------------------------- */}
          {/* 2. Subscription                                                   */}
          {/* ---------------------------------------------------------------- */}
          <SectionCard title="Subscription">
            <Row
              label="Current plan"
              value={
                <span className="rounded-md bg-primary-500/10 px-2.5 py-1 text-xs font-semibold text-primary-400">
                  {tierLabel}
                </span>
              }
            />
            {isTrial && trialEnd && (
              <Row
                label="Pro trial ends"
                value={<span className="text-yellow-400">{trialEnd}</span>}
              />
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              {tierLabel === "FREE" && (
                <a
                  href="/pricing"
                  className="inline-flex items-center rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
                >
                  Upgrade to Pro
                </a>
              )}
              <a
                href={`${API_BASE}/api/billing/portal`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-dark-700 bg-dark-800 px-4 py-2 text-sm font-medium text-dark-300 transition-colors hover:bg-dark-700"
              >
                Manage Billing
              </a>
            </div>
          </SectionCard>

          {/* ---------------------------------------------------------------- */}
          {/* 3. Change Password                                                */}
          {/* ---------------------------------------------------------------- */}
          <SectionCard title="Change Password">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-dark-400">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2.5 text-sm text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-dark-400">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2.5 text-sm text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-dark-400">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2.5 text-sm text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                  required
                  minLength={8}
                />
              </div>
              {passwordError && (
                <p className="text-sm text-red-400">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-green-400">Password updated successfully</p>
              )}
              <button
                type="submit"
                disabled={isSubmittingPassword}
                className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
              >
                {isSubmittingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </SectionCard>

          {/* ---------------------------------------------------------------- */}
          {/* 4. Notifications                                                  */}
          {/* ---------------------------------------------------------------- */}
          <SectionCard title="Notifications">
            <NotificationToggle
              label="Trade alerts"
              description="Email when a limit order is filled or position is liquidated"
              checked={emailTradeAlerts}
              onChange={setEmailTradeAlerts}
            />
            <NotificationToggle
              label="Trial & subscription reminders"
              description="Reminders before your trial or subscription expires"
              checked={emailTrialReminders}
              onChange={setEmailTrialReminders}
            />
            <NotificationToggle
              label="Newsletter & product updates"
              description="Tips, new features, and Terminal Zero news"
              checked={emailNewsletter}
              onChange={setEmailNewsletter}
            />
            <p className="mt-4 text-xs text-dark-600">
              Notification preferences are saved locally. Full preference sync coming soon.
            </p>
          </SectionCard>

          {/* ---------------------------------------------------------------- */}
          {/* 5. Data & Privacy                                                 */}
          {/* ---------------------------------------------------------------- */}
          <SectionCard title="Data & Privacy">
            <p className="mb-4 text-sm text-dark-400">
              Under GDPR and similar regulations you have the right to access and
              erase your personal data.
            </p>

            <div className="mb-5 rounded-xl border border-dark-700/40 bg-t0-void p-4">
              <p className="mb-1 text-sm font-medium text-dark-200">Export My Data</p>
              <p className="mb-3 text-xs text-dark-500">
                Download a JSON file containing all data we hold about your account,
                portfolios, and trading journal.
              </p>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="rounded-lg border border-dark-700 bg-dark-800 px-4 py-2 text-sm font-medium text-dark-200 transition-colors hover:bg-dark-700 disabled:opacity-50"
              >
                {isExporting ? "Preparing download..." : "Export My Data"}
              </button>
            </div>

            <div className="rounded-xl border border-red-500/20 bg-t0-void p-4">
              <p className="mb-1 text-sm font-medium text-red-400">Delete Account</p>
              <p className="mb-3 text-xs text-dark-500">
                Permanently anonymise your account. This action cannot be undone.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                Delete Account
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-4 text-xs text-dark-500">
              <a href="/legal/privacy" className="underline-offset-2 hover:text-dark-300 hover:underline">
                Privacy Policy
              </a>
              <a href="/legal/terms" className="underline-offset-2 hover:text-dark-300 hover:underline">
                Terms of Service
              </a>
              <a href="/legal/disclaimer" className="underline-offset-2 hover:text-dark-300 hover:underline">
                Risk Disclaimer
              </a>
            </div>
          </SectionCard>

          {/* ---------------------------------------------------------------- */}
          {/* 6. Sign Out                                                       */}
          {/* ---------------------------------------------------------------- */}
          <section className="rounded-2xl border border-red-500/20 bg-dark-900 p-6">
            <h2 className="mb-2 text-lg font-semibold text-dark-100">Sign Out</h2>
            <p className="mb-4 text-sm text-dark-400">
              Sign out of your Terminal Zero account on this device.
            </p>
            <button
              onClick={() => { logout(); router.push("/landing"); }}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20"
            >
              Sign Out
            </button>
          </section>
        </div>
      </AppShell>
    </>
  );
}
