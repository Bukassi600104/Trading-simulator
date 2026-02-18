"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/stores/authStore";
import { API_BASE } from "@/lib/runtimeConfig";

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, checkAuth, logout } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
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
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/landing");
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-t0-void">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl p-6 md:p-8">
        <h1 className="mb-8 text-2xl font-bold text-dark-100">Settings</h1>

        {/* Profile Section */}
        <section className="mb-8 rounded-2xl border border-dark-700/40 bg-dark-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-dark-100">Profile</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-400">Email</span>
              <span className="font-mono text-sm text-dark-200">
                {user?.email || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-400">Tier</span>
              <span className="rounded-md bg-primary-500/10 px-2.5 py-1 text-xs font-semibold text-primary-400">
                {user?.tier || "FREE"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-400">Member since</span>
              <span className="text-sm text-dark-200">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : "—"}
              </span>
            </div>
          </div>
        </section>

        {/* Password Section */}
        <section className="mb-8 rounded-2xl border border-dark-700/40 bg-dark-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-dark-100">
            Change Password
          </h2>
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
              <p className="text-sm text-green-400">
                Password updated successfully
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
            >
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>

        {/* Logout Section */}
        <section className="rounded-2xl border border-red-500/20 bg-dark-900 p-6">
          <h2 className="mb-2 text-lg font-semibold text-dark-100">
            Sign Out
          </h2>
          <p className="mb-4 text-sm text-dark-400">
            Sign out of your Terminal Zero account on this device.
          </p>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20"
          >
            Sign Out
          </button>
        </section>
      </div>
    </AppShell>
  );
}
