import React from 'react';
import { ShieldAlert, Clock, RefreshCw, MessageSquare, PhoneCall, ArrowRight, Home, CheckCircle2 } from 'lucide-react';
import { CustomerPolicy, RenewalLinkRecord } from '../types/insurance';

interface LinkExpiredNoticeProps {
  token?: string;
  customer?: CustomerPolicy | null;
  link?: RenewalLinkRecord | null;
  reason?: string;
  isRevoked?: boolean;
  onContinueLookup?: (policyNumber?: string) => void;
  onGoHome?: () => void;
}

export const LinkExpiredNotice: React.FC<LinkExpiredNoticeProps> = ({
  token,
  customer,
  link,
  reason,
  isRevoked,
  onContinueLookup,
  onGoHome
}) => {
  const policyNum = customer?.policyNumber || link?.policyNumber || (token?.startsWith('RNW-') ? token.split('-')[1] : '');
  const customerName = customer?.customerName || link?.customerName;

  const defaultReason = isRevoked
    ? 'This personalized renewal link has expired because a new link was created by your relationship manager, or the link was deactivated for security.'
    : 'For your security and privacy, personalized ICICI Lombard renewal links have an active validity window (12 hours) and have expired.';

  const displayReason = reason || defaultReason;

  const whatsappMessage = encodeURIComponent(
    `Hello, my ICICI Lombard renewal link for Policy #${policyNum || 'N/A'} has expired. Could you please send me a fresh active renewal link? Thank you.`
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Brand Banner */}
      <div className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-xl shadow-xs">
              IL
            </div>
            <div>
              <div className="font-bold text-slate-900 tracking-tight text-lg leading-tight">
                ICICI Lombard <span className="text-orange-600">General Insurance</span>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Nibhaye Vaade • Secure Customer Portal
              </div>
            </div>
          </div>
          {onGoHome && (
            <button
              id="expired-home-top-btn"
              onClick={onGoHome}
              className="text-xs font-semibold text-slate-600 hover:text-orange-600 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-orange-300 transition-colors bg-white shadow-2xs"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Expired Content */}
      <main className="max-w-2xl w-full mx-auto px-4 py-10 my-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
          {/* Header Banner with Warning Tone */}
          <div className="bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 p-1 text-center" />
          
          <div className="p-8 sm:p-10">
            {/* Icon & Badge */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner mb-4">
                {isRevoked ? (
                  <ShieldAlert className="w-10 h-10 text-rose-600" />
                ) : (
                  <Clock className="w-10 h-10 text-amber-600" />
                )}
              </div>
              
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-rose-100 text-rose-700 border border-rose-200 mb-3">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                <span>{isRevoked ? 'Link Inactivated / Replaced' : 'Renewal Link Expired'}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {isRevoked ? 'This Renewal Link is No Longer Active' : 'This Renewal Link Has Expired'}
              </h1>
              
              <p className="mt-3 text-slate-600 text-sm sm:text-base max-w-md leading-relaxed">
                {displayReason}
              </p>
            </div>

            {/* Policy Reference Card (if details known) */}
            {policyNum && (
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 mb-8">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Policy Summary
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 block text-xs">Policy Number</span>
                    <span className="font-mono font-bold text-slate-800 text-base">{policyNum}</span>
                  </div>
                  {customerName && (
                    <div>
                      <span className="text-slate-500 block text-xs">Policyholder Name</span>
                      <span className="font-semibold text-slate-800">{customerName}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Policy details are securely stored in ICICI Lombard records</span>
                  </span>
                </div>
              </div>
            )}

            {/* Recommended Next Actions */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                How to Proceed
              </div>

              {/* Action 1: Self Verify / Instant Lookup */}
              <button
                id="expired-verify-lookup-btn"
                onClick={() => onContinueLookup?.(policyNum)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-all shadow-md hover:shadow-lg group text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/50 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Renew Directly Using Policy / Mobile Number</div>
                    <div className="text-xs text-orange-100 font-normal">
                      Instant 2-step verification to view quotation and make payment
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              {/* Action 2: WhatsApp Relationship Manager */}
              <a
                id="expired-whatsapp-rm-link"
                href={`https://wa.me/?text=${whatsappMessage}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition-colors group text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Request New Link from Relationship Manager</div>
                    <div className="text-xs text-emerald-700 font-normal">
                      Send a message on WhatsApp to get a fresh 12-hour link instantly
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform shrink-0" />
              </a>

              {/* Action 3: Contact Toll Free */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center space-x-2">
                  <PhoneCall className="w-4 h-4 text-slate-500" />
                  <span>24x7 Customer Support Hotline:</span>
                  <span className="font-bold text-slate-800">1800 2666</span>
                </div>
                <span className="text-slate-400">Toll Free</span>
              </div>
            </div>

            {/* Back Home Link */}
            {onGoHome && (
              <div className="mt-6 text-center">
                <button
                  id="expired-return-home-btn"
                  onClick={onGoHome}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  ← Return to ICICI Lombard Home
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} ICICI Lombard General Insurance Company Limited. All rights reserved. IRDAI Reg. No. 115.</p>
      </footer>
    </div>
  );
};
