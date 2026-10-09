import React from 'react';
import { Smartphone, ShieldCheck, Zap, X, Check, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { DeviceInfo } from '../utils/mobileDeviceDetection';

interface MobileOtpAssistanceModalProps {
  isOpen: boolean;
  deviceInfo: DeviceInfo;
  customerName: string;
  policyNumber: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const MobileOtpAssistanceModal: React.FC<MobileOtpAssistanceModalProps> = ({
  isOpen,
  deviceInfo,
  customerName,
  policyNumber,
  onAccept,
  onDecline
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-slideUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-otp-title"
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#00264A] via-[#003866] to-[#EA580C] p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-amber-300">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-amber-300 font-extrabold block">
                  Mobile Browser Assistance
                </span>
                <h3 id="mobile-otp-title" className="text-sm font-black leading-tight">
                  Seamless Bank OTP Autofill
                </h3>
              </div>
            </div>
            
            <button
              type="button"
              onClick={onDecline}
              aria-label="Close and enter manually"
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* Device & Browser Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Detected Mobile Client:</span>
            <span className="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs font-mono">
              {deviceInfo.browserCategory} ({deviceInfo.os})
            </span>
          </div>

          {/* Value Prop Banner */}
          <div className="space-y-2">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-black text-[#EA580C]">
                <Zap className="w-4 h-4 fill-[#EA580C]" />
                <span>Prevents Session Expiry on Mobile</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                When switching between <strong>Google Chrome</strong> and your <strong>SMS messages</strong>, mobile browser tabs can be unloaded or time out. 
                With Mobile OTP Assistance, your browser receives the code without you leaving this page.
              </p>
            </div>
          </div>

          {/* How It Works & Transparency */}
          <div className="space-y-2 text-xs">
            <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>How It Works & Information Shared</span>
            </h4>
            
            <ul className="space-y-2 text-[11px] text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>One-Tap Detection:</strong> Your browser natively detects the incoming 6-digit authentication code sent by your bank.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Privacy Guaranteed:</strong> No personal text messages, contacts, or phone data are accessed or read.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero OTP Exposure:</strong> Your OTP code is entered directly into the payment gateway and is never visible to customer care or stored in administrative portals.
                </span>
              </li>
            </ul>
          </div>

          {/* Policy Context */}
          <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Policy: <strong className="text-slate-800">{policyNumber}</strong></span>
            <span>Holder: <strong className="text-slate-800">{customerName}</strong></span>
          </div>

          {/* Explicit Accept / Decline Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              id="accept-mobile-otp-btn"
              onClick={onAccept}
              className="w-full bg-[#EA580C] hover:bg-[#d84d00] active:scale-95 text-white py-3 px-4 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Enable Mobile OTP Assistance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              id="decline-mobile-otp-btn"
              onClick={onDecline}
              className="w-full bg-white hover:bg-slate-100 active:scale-95 text-slate-700 py-2.5 px-4 rounded-xl font-bold text-xs border border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>No Thanks, I'll Enter Manually</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
