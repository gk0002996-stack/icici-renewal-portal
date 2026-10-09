import React, { useEffect } from 'react';
import { CheckCircle2, Download, ShieldCheck, ArrowLeft, FileText, CreditCard, Sparkles, Repeat, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CustomerPolicy, RenewalAttempt } from '../types/insurance';
import { generatePolicySchedulePDF, generateHealthCardPDF } from '../utils/pdfGenerator';
import { recordSoftCopyDownload } from '../services/storageService';

interface PaymentSuccessViewProps {
  policy: CustomerPolicy;
  attempt: RenewalAttempt;
  onGoToHome: () => void;
  onOpenSoftCopy: () => void;
}

export const PaymentSuccessView: React.FC<PaymentSuccessViewProps> = ({
  policy,
  attempt,
  onGoToHome,
  onOpenSoftCopy
}) => {
  useEffect(() => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.log('Confetti effect fired');
    }
  }, []);

  const handleDownloadSchedule = () => {
    const effectiveYear = attempt.tenureYears || policy.selectedTenure || 1;
    generatePolicySchedulePDF(policy, attempt.finalPayable, effectiveYear);
    recordSoftCopyDownload(policy.policyNumber, `Policy Schedule PDF (${effectiveYear} Year)`);
  };

  const handleDownloadHealthCard = () => {
    const effectiveYear = attempt.tenureYears || policy.selectedTenure || 1;
    generateHealthCardPDF(policy, undefined, effectiveYear);
    recordSoftCopyDownload(policy.policyNumber, 'Health Cards PDF');
  };

  return (
    <div id="payment-success-section" className="max-w-3xl mx-auto py-12 px-4 sm:px-6 font-sans space-y-8 animate-fadeIn">
      
      {/* Top Success Banner Card */}
      <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl p-8 text-center space-y-4 relative overflow-hidden">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Payment Authorized & Policy Issued
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Policy Renewal Successful!
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Your ICICI Lombard Complete Health Insurance policy cover is renewed with zero break-in coverage. Official soft copy and health card documents have been generated.
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-1">
            Product Code: <strong>4128</strong> | UIN: <strong>ICIHLIP26052V092526</strong>
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
            <strong className="text-slate-900 text-sm font-mono text-[#EA580C]">
              {attempt.transactionRef || 'TXN-APX-88219'}
            </strong>
          </div>

          <div>
            <span className="text-slate-500 block">Payment Method</span>
            <strong className="text-slate-900 text-sm font-bold flex items-center gap-1">
              {attempt.paymentMethod?.includes('AutoPay') ? (
                <span className="text-purple-700 flex items-center gap-1 font-black">
                  <Repeat className="w-3.5 h-3.5" />
                  <span>UPI AutoPay (Monthly EMI)</span>
                </span>
              ) : (
                attempt.paymentMethod || 'Online Gateway'
              )}
            </strong>
          </div>

          <div>
            <span className="text-slate-500 block">Amount Paid Today</span>
            <strong className="text-slate-900 text-sm font-mono text-emerald-700 font-extrabold">
              ₹{attempt.finalPayable.toLocaleString('en-IN')}
            </strong>
          </div>

          <div>
            <span className="text-slate-500 block">Payment Date & Time</span>
            <strong className="text-slate-900">{attempt.dateTime}</strong>
          </div>

          <div>
            <span className="text-slate-500 block">Renewal Status</span>
            <strong className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
              Successfully Renewed
            </strong>
          </div>

        </div>

        {/* UPI AutoPay Recurring Mandate Details */}
        {(attempt.paymentMethod?.includes('AutoPay') || attempt.isAutoPay) && (
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-orange-50 p-4 rounded-2xl border border-purple-200 text-left space-y-2">
            <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
              <span className="font-extrabold text-purple-950 text-xs flex items-center gap-1.5">
                <Repeat className="w-4 h-4 text-purple-600" />
                <span>Active UPI AutoPay Monthly Mandate</span>
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                Mandate Registered
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-700">
              <div>
                <span className="text-slate-500 block text-[10px]">Monthly Auto-Debit Amount</span>
                <strong className="font-mono text-purple-900 text-sm font-black">
                  ₹{(attempt.emiMonthlyAmount || Math.round(attempt.finalPayable / (attempt.emiTenureMonths || 6))).toLocaleString('en-IN')} / mo
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Recurring Auto-Debit Schedule</span>
                <strong className="text-slate-900 font-bold">5th of every month</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Total Installments</span>
                <strong className="text-slate-900 font-bold">{attempt.emiTenureMonths || 6} Months (0% Interest)</strong>
              </div>
            </div>

            <p className="text-[11px] text-purple-900 font-medium pt-1">
              Your policy cover is fully renewed and active today. Subsequent monthly installments of ₹{(attempt.emiMonthlyAmount || Math.round(attempt.finalPayable / (attempt.emiTenureMonths || 6))).toLocaleString('en-IN')} will be debited automatically on the 5th of each month from your linked UPI app.
            </p>
          </div>
        )}

        {/* Validity Extension Callout */}
        <div className="bg-gradient-to-r from-[#00264A] to-[#003866] text-white p-4 rounded-xl flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>New Extended Policy Expiry Date:</span>
          </div>
          <span className="font-mono text-amber-300 text-sm font-extrabold">
            {policy.newPolicyEndDate || policy.previousPolicyEndDate}
          </span>
        </div>
      </div>

      {/* Primary Download Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Soft Copy Schedule Download */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#EA580C] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base pt-2">Download Policy Soft Copy</h3>
            <p className="text-xs text-slate-500">
              Official IRDAI computer-generated Policy Schedule & Tax Certificate (u/s 80D).
            </p>
          </div>

          <button
            id="download-softcopy-btn"
            type="button"
            onClick={handleDownloadSchedule}
            className="w-full py-3 px-4 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Policy Schedule (PDF)</span>
          </button>
        </div>

        {/* Health Card Download */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base pt-2">Download Health Cards</h3>
            <p className="text-xs text-slate-500">
              Digital Member Cashless Health Cards for presentation at 11,000+ network hospitals.
            </p>
          </div>

          <button
            id="download-healthcard-btn"
            type="button"
            onClick={handleDownloadHealthCard}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Download All Member Cards (PDF)</span>
          </button>
        </div>

      </div>

      {/* Return to Home / Navigation */}
      <div className="flex items-center justify-between pt-4">
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
          onClick={onOpenSoftCopy}
          className="text-xs font-bold text-[#EA580C] hover:underline cursor-pointer"
        >
          Go to Soft Copy Verification Portal →
        </button>
      </div>

    </div>
  );
};
