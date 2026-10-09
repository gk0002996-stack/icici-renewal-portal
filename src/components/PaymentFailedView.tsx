import React from 'react';
import { XCircle, RotateCcw, ArrowLeft, ShieldAlert, PhoneCall, Mail, AlertTriangle, FileText } from 'lucide-react';
import { CustomerPolicy, RenewalAttempt } from '../types/insurance';

interface PaymentFailedViewProps {
  policy: CustomerPolicy;
  attempt: RenewalAttempt;
  onRetryPayment: () => void;
  onBackToRenewFlow: () => void;
  onGoToHome: () => void;
}

export const PaymentFailedView: React.FC<PaymentFailedViewProps> = ({
  policy,
  attempt,
  onRetryPayment,
  onBackToRenewFlow,
  onGoToHome
}) => {
  return (
    <div id="payment-failed-section" className="max-w-3xl mx-auto py-12 px-4 sm:px-6 font-sans space-y-8 animate-fadeIn">
      
      {/* Top Failure Banner Card */}
      <div className="bg-white rounded-3xl border border-rose-200 shadow-xl p-8 text-center space-y-4 relative overflow-hidden">
        
        {/* Top subtle warning bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-red-500 to-rose-600"></div>

        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner mt-2">
          <XCircle className="w-10 h-10 stroke-[2.5]" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 inline-block">
            Transaction Declined • 3D-Secure Verification
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Payment Failed
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Your renewal payment could not be processed. The one-time password (OTP) authorization was declined by your issuing bank or the secure payment gateway session timed out.
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-1">
            Product Code: <strong>4128</strong> | Gateway Code: <strong className="text-rose-700 font-bold">ERR_3DS_AUTH_DECLINED_402</strong>
          </div>
        </div>

        {/* Transaction Summary Table */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-xs text-slate-700 grid grid-cols-2 md:grid-cols-3 gap-4 text-left font-medium mt-6">
          
          <div>
            <span className="text-slate-500 block">Customer Name</span>
            <strong className="text-slate-900 text-sm">{policy.customerName}</strong>
          </div>

          <div>
            <span className="text-slate-500 block">Policy Number</span>
            <strong className="text-slate-900 text-sm font-mono">{policy.policyNumber}</strong>
          </div>

          <div>
            <span className="text-slate-500 block">Transaction Reference</span>
            <strong className="text-slate-900 text-sm font-mono text-rose-600 font-bold">
              {attempt.transactionRef || 'TXN-DECLINED-99214'}
            </strong>
          </div>

          <div>
            <span className="text-slate-500 block">Attempted Amount</span>
            <strong className="text-slate-900 text-sm font-mono text-slate-900 font-extrabold">
              ₹{attempt.finalPayable ? attempt.finalPayable.toLocaleString('en-IN') : '16,248'}
            </strong>
          </div>

          <div>
            <span className="text-slate-500 block">Payment Date & Time</span>
            <strong className="text-slate-900">{attempt.dateTime || new Date().toLocaleString('en-IN')}</strong>
          </div>

          <div>
            <span className="text-slate-500 block">Payment Status</span>
            <strong className="text-rose-700 font-bold bg-rose-100 px-2.5 py-0.5 rounded border border-rose-300 inline-block">
              DECLINED / FAILED
            </strong>
          </div>

        </div>

        {/* Auto-Refund Reassurance Note */}
        <div className="bg-amber-50/80 border border-amber-200 text-amber-900 p-4 rounded-xl flex items-start gap-3 text-left text-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block text-amber-950">Debit Note & Refund Assurance:</span>
            <p className="text-amber-900 leading-relaxed">
              If your bank account or credit card was debited, your money is completely safe. The issuing bank will automatically reverse and refund the debited amount to your original source account within <strong>3 to 5 business days</strong> per RBI regulations.
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            id="retry-payment-btn"
            type="button"
            onClick={onRetryPayment}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Renewal Payment</span>
          </button>

          <button
            id="back-to-plan-btn"
            type="button"
            onClick={onBackToRenewFlow}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Review Plan / Change Payment Method</span>
          </button>
        </div>

      </div>

      {/* Customer Support & Assistance */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 text-slate-700">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#00264A] flex items-center justify-center font-bold shrink-0">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <strong className="block text-slate-900 text-sm">Need Help with Payment?</strong>
            <span className="text-slate-500">Contact ICICI Lombard 24x7 Customer Support Helpline</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-extrabold text-sm text-[#00264A]">1800 2666</div>
            <div className="text-[11px] text-slate-500">Toll-Free (All India)</div>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="text-left">
            <div className="font-extrabold text-xs text-[#00264A]">customersupport@icicilombard.com</div>
            <div className="text-[11px] text-slate-500">24x7 Support Email</div>
          </div>
        </div>
      </div>

      {/* Return to Homepage */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onGoToHome}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Homepage</span>
        </button>

        <button
          type="button"
          onClick={onBackToRenewFlow}
          className="text-xs font-bold text-[#EA580C] hover:underline cursor-pointer"
        >
          Back to Policy Renewal Details →
        </button>
      </div>

    </div>
  );
};
