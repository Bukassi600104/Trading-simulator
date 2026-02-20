"use client";

import { useState } from "react";
import { Share2, MessageCircle, Twitter, Link, Send, X, Check } from "lucide-react";

interface SharePerformanceCardProps {
  username: string;
  returnPercent: number;
  streakDays: number;
  topAsset: string;
  referralCode?: string;
  onClose?: () => void;
}

export default function SharePerformanceCard({
  username,
  returnPercent,
  streakDays,
  topAsset,
  referralCode,
  onClose,
}: SharePerformanceCardProps) {
  const [copied, setCopied] = useState(false);

  const referralLink = referralCode
    ? `https://terminalzero.com/?ref=${referralCode}`
    : "https://terminalzero.com";

  const shareText = `I'm up ${returnPercent >= 0 ? "+" : ""}${returnPercent.toFixed(1)}% on Terminal Zero! Can you beat me? ${referralLink}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(`I'm up ${returnPercent >= 0 ? "+" : ""}${returnPercent.toFixed(1)}% on Terminal Zero! Can you beat me?`)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-2xl border border-dark-700/60 bg-dark-900 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary-400" />
          <h3 className="text-base font-bold text-dark-100">
            Share Performance
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-dark-500 hover:text-dark-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Performance Card */}
      <div className="rounded-xl bg-gradient-to-br from-t0-void via-dark-800 to-t0-void border border-dark-700/40 p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 font-mono text-[10px] font-bold text-white">
            T0
          </div>
          <span className="text-xs font-bold text-dark-400 uppercase tracking-wider">
            Terminal Zero
          </span>
        </div>

        <p className="text-sm text-dark-400 mb-1">@{username}</p>

        <div
          className={`font-mono text-3xl font-extrabold mb-4 ${returnPercent >= 0 ? "text-profit-400" : "text-loss-400"}`}
        >
          {returnPercent >= 0 ? "+" : ""}
          {returnPercent.toFixed(1)}% return
        </div>

        <div className="flex items-center gap-4 text-sm">
          {streakDays > 0 && (
            <span className="text-dark-300">
              <span className="text-amber-400 mr-1">*</span>
              {streakDays} day streak
            </span>
          )}
          <span className="text-dark-300">
            Top: <span className="font-mono font-semibold text-dark-100">{topAsset}</span>
          </span>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 px-4 py-3 text-sm font-semibold text-[#25D366] transition-all hover:bg-[#25D366]/20 no-underline"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-dark-800 border border-dark-700/40 px-4 py-3 text-sm font-semibold text-dark-200 transition-all hover:bg-dark-700 no-underline"
        >
          <Twitter className="h-4 w-4" />
          Twitter/X
        </a>
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#0088cc]/10 border border-[#0088cc]/20 px-4 py-3 text-sm font-semibold text-[#0088cc] transition-all hover:bg-[#0088cc]/20 no-underline"
        >
          <Send className="h-4 w-4" />
          Telegram
        </a>
        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-2 rounded-xl bg-dark-800 border border-dark-700/40 px-4 py-3 text-sm font-semibold text-dark-200 transition-all hover:bg-dark-700"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-profit-400" />
              <span className="text-profit-400">Copied</span>
            </>
          ) : (
            <>
              <Link className="h-4 w-4" />
              Copy Link
            </>
          )}
        </button>
      </div>

      <p className="text-center text-[11px] text-dark-600">
        Screenshot to share as image
      </p>
    </div>
  );
}
