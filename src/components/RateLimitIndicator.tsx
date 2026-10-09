import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert, X, ChevronDown, CheckCircle2, Clock } from 'lucide-react';

export interface RateLimitEventDetail {
  url?: string;
  retryAfter?: number;
  message?: string;
  timestamp?: number;
}

// Global listener helper
export const RATE_LIMIT_EVENT = 'AIS_RATE_LIMIT_TRIGGERED';
export const RATE_LIMIT_CLEARED = 'AIS_RATE_LIMIT_CLEARED';

export function notifyRateLimit(detail: RateLimitEventDetail = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RATE_LIMIT_EVENT, { detail }));
  }
}

export function clearRateLimitNotification() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RATE_LIMIT_CLEARED));
  }
}

interface RateLimitIndicatorProps {
  onRetry?: () => void;
}

export const RateLimitIndicator: React.FC<RateLimitIndicatorProps> = ({ onRetry }) => {
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(10);
  const [lastUrl, setLastUrl] = useState<string>('');
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [isResolvedToast, setIsResolvedToast] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for global 429 events
  useEffect(() => {
    const handleRateLimit = (e: Event) => {
      const customEvent = e as CustomEvent<RateLimitEventDetail>;
      const detail = customEvent.detail || {};
      const retrySeconds = Math.max(5, detail.retryAfter || 10);

      setIsRateLimited(true);
      setCountdown(retrySeconds);
      if (detail.url) {
        setLastUrl(detail.url);
      }

      // If already minimized, keep it minimized; otherwise show modal
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Auto retry on countdown end
            handleAttemptRetry();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const handleClear = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRateLimited(false);
      setIsRetrying(false);
      setIsResolvedToast(true);
      setTimeout(() => setIsResolvedToast(false), 3500);
    };

    window.addEventListener(RATE_LIMIT_EVENT, handleRateLimit);
    window.addEventListener(RATE_LIMIT_CLEARED, handleClear);

    return () => {
      window.removeEventListener(RATE_LIMIT_EVENT, handleRateLimit);
      window.removeEventListener(RATE_LIMIT_CLEARED, handleClear);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleAttemptRetry = async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        // Quick probe to check if server is unthrottled
        const res = await fetch('/api/health');
        if (res.ok) {
          clearRateLimitNotification();
          return;
        }
      }
    } catch {
      // Still throttled
    } finally {
      setIsRetrying(false);
      // If still limited, set a small 8s countdown
      setCountdown(8);
    }
  };

  const handleDismissToPill = () => {
    setIsMinimized(true);
  };

  if (!isRateLimited && !isResolvedToast) {
    return null;
  }

  // Toast banner when rate limit resolves successfully
  if (isResolvedToast) {
    return (
      <aside aria-label="Connection Restored Notice" className="fixed top-4 right-4 z-50 animate-bounce">
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold border border-emerald-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>Server traffic normalized. Connection restored!</span>
        </div>
      </aside>
    );
  }

  // Minimized floating status pill
  if (isMinimized) {
    return (
      <aside aria-label="Rate Limited Status Pill" className="fixed top-3 right-3 sm:right-6 z-50 animate-fadeIn">
        <div className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2 rounded-full shadow-2xl flex items-center gap-2.5 border-2 border-amber-300 font-sans transition-all">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-950"></span>
          </span>
          <span className="text-xs font-black tracking-tight">Rate Limited</span>
          <span className="bg-amber-950 text-amber-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
            {countdown > 0 ? `${countdown}s` : 'Retrying'}
          </span>
          <button
            type="button"
            onClick={handleAttemptRetry}
            disabled={isRetrying}
            className="p-1 hover:bg-amber-400 rounded-full transition-colors cursor-pointer"
            title="Retry Connection"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="text-[11px] font-extrabold hover:underline text-amber-950 pl-1 cursor-pointer"
          >
            Details
          </button>
        </div>
      </aside>
    );
  }

  // Full High-Visibility Alert Modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-400 max-w-md w-full overflow-hidden">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-700/60 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide">High Traffic Volume Detected</h3>
              <p className="text-[11px] text-amber-100 font-medium">HTTP 429 • Cloud Rate Limit Protection</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismissToPill}
            className="p-1.5 rounded-lg bg-amber-700/40 hover:bg-amber-700/80 text-amber-100 transition-colors cursor-pointer"
            title="Minimize to indicator"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 space-y-1">
              <p className="font-extrabold">The server is temporarily throttling requests</p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                To protect portal integrity during traffic spikes, Google Cloud rate limiting is active. 
                Your session and policy records remain completely safe in your local browser cache.
              </p>
            </div>
          </div>

          {/* Cooldown progress bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Automatic Cooldown</span>
              </span>
              <span className="font-mono text-amber-700 font-extrabold">
                {countdown > 0 ? `Auto-retrying in ${countdown}s` : 'Retrying now...'}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${Math.min(100, Math.max(5, (countdown / 10) * 100))}%` }}
              ></div>
            </div>
          </div>

          {lastUrl && (
            <p className="text-[10px] text-slate-400 font-mono truncate">
              Endpoint: {lastUrl}
            </p>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleAttemptRetry}
              disabled={isRetrying}
              className="flex-1 py-2.5 px-4 bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Checking Gateway...' : 'Retry Connection Now'}</span>
            </button>
            <button
              type="button"
              onClick={handleDismissToPill}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Minimize Indicator</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
