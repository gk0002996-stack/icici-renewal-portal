import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Check, 
  Calendar, 
  CreditCard, 
  Lock, 
  AlertCircle, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { CustomerPolicy } from '../types/insurance';
import { generatePolicySchedulePDF, generateHealthCardPDF } from '../utils/pdfGenerator';
import { recordSoftCopyDownload } from '../services/storageService';

interface PolicyDocumentsSectionProps {
  policyName?: string;
  productCode?: string;
  uinNumber?: string;
  policy?: CustomerPolicy;
  selectedTenure?: number;
  onSelectTenure?: (tenure: number) => void;
}

export const PolicyDocumentsSection: React.FC<PolicyDocumentsSectionProps> = ({
  policyName = 'Elevate health insurance',
  productCode,
  uinNumber,
  policy,
  selectedTenure = 1,
  onSelectTenure
}) => {
  const isElevate = !policyName || policyName.toLowerCase().includes('elevate');
  const displayedProduct = isElevate ? 'Elevate' : (policy?.policyName || policyName);
  const displayedCode = productCode || (isElevate ? '4225' : (policy?.productCode || '4128'));
  const displayedUin = uinNumber || (isElevate ? 'ICIHLIP25048V042425' : (policy?.uinNumber || 'ICIHLIP26052V092526'));

  // Determine if payment is done and approved in admin portal
  const isPaymentApproved = Boolean(
    policy?.policyStatus === 'Renewed' ||
    policy?.renewalStatus === 'Renewed' ||
    Boolean(policy?.newPolicyEndDate) ||
    policy?.renewalAttempts?.some(a => a.status === 'Paid' || a.status === 'Successful' || a.verificationStatus === 'Success (Gateway Verified)')
  );

  const approvedAttempt = policy?.renewalAttempts
    ?.slice()
    .reverse()
    .find(a => a.status === 'Paid' || a.status === 'Successful' || a.verificationStatus === 'Success (Gateway Verified)');

  const approvedTenure = isPaymentApproved 
    ? (approvedAttempt?.tenureYears || policy?.selectedTenure || 1)
    : null;

  // Active chosen tenure option in UI (defaults to approved tenure if approved, else selectedTenure)
  const [activeTenureView, setActiveTenureView] = useState<number>(() => {
    return approvedTenure || selectedTenure || policy?.selectedTenure || 1;
  });

  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // Sync with prop changes
  React.useEffect(() => {
    if (approvedTenure) {
      setActiveTenureView(approvedTenure);
    } else if (selectedTenure) {
      setActiveTenureView(selectedTenure);
    }
  }, [approvedTenure, selectedTenure]);

  const handleSelectTenureClick = (tenureYears: number) => {
    setActiveTenureView(tenureYears);
    if (!isPaymentApproved && onSelectTenure) {
      onSelectTenure(tenureYears);
    }
  };

  const handleDownloadSchedule = (tenureToDownload: number) => {
    if (!policy) {
      alert('Please look up or enter your policy details to download your official soft copy.');
      return;
    }
    // If payment has been approved, enforce the exact tenure chosen and approved by admin
    const effectiveYear = isPaymentApproved ? (approvedTenure || 1) : tenureToDownload;
    generatePolicySchedulePDF(policy, undefined, effectiveYear);
    recordSoftCopyDownload(policy.policyNumber, `Policy Schedule PDF (${effectiveYear} Year)`);
    setDownloadToast(`${effectiveYear} Year Policy Schedule Certificate downloaded successfully!`);
    setTimeout(() => setDownloadToast(null), 4000);
  };

  const handleDownloadHealthCards = () => {
    if (!policy) {
      alert('Please look up or enter your policy details to download health cards.');
      return;
    }
    const effectiveYear = isPaymentApproved ? (approvedTenure || 1) : activeTenureView;
    generateHealthCardPDF(policy, undefined, effectiveYear);
    recordSoftCopyDownload(policy.policyNumber, 'Member Health Cards PDF');
    setDownloadToast('Member Cashless Health Cards downloaded successfully!');
    setTimeout(() => setDownloadToast(null), 4000);
  };

  // Calculate validity date preview for a given tenure
  const getValidityPreview = (years: number) => {
    const basePrev = policy?.previousPolicyEndDate || '2026-03-31';
    try {
      const pEnd = new Date(basePrev);
      const rStart = new Date(pEnd);
      rStart.setDate(rStart.getDate() + 1);
      const rEnd = new Date(pEnd);
      rEnd.setFullYear(rEnd.getFullYear() + years);
      return `${rStart.toLocaleDateString('en-GB')} to ${rEnd.toLocaleDateString('en-GB')}`;
    } catch {
      return `${years} Year(s) Cover`;
    }
  };

  // Determine tenure to generate when user clicks download
  const targetDownloadTenure = isPaymentApproved ? (approvedTenure || 1) : activeTenureView;

  return (
    <div id="policy-documents-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 font-sans">
      
      {/* Toast Notification */}
      {downloadToast && (
        <div className="p-3.5 bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{downloadToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setDownloadToast(null)} 
            className="text-white/80 hover:text-white font-mono cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Policy documents & Soft Copy</h3>
            {isPaymentApproved && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Payment Approved</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Download your official IRDAI digitally signed Policy Schedule, Section 80D tax certificate, and cashless health cards.
          </p>
        </div>

        {policy && (
          <div className="text-left sm:text-right text-xs text-slate-500 font-medium">
            <div>Policy No: <strong className="font-mono text-slate-800 font-bold">{policy.policyNumber}</strong></div>
            <div>Holder: <strong className="text-slate-900">{policy.customerName}</strong></div>
          </div>
        )}
      </div>

      {/* PAYMENT APPROVAL STATUS BANNER */}
      {isPaymentApproved && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 text-xs text-emerald-950 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-black text-emerald-900 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Payment Confirmed & Approved in Admin Portal</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[11px] uppercase tracking-wider">
              {approvedTenure} Year Renewal Active
            </span>
          </div>
          <p className="text-emerald-900/90 font-medium leading-relaxed">
            Your policy renewal has been authorized and approved by the relationship manager for a <strong className="font-black text-emerald-950 underline decoration-emerald-500">{approvedTenure} Year Plan</strong> ({getValidityPreview(approvedTenure || 1)}). The official digitally signed soft copy is generated for your approved <strong>{approvedTenure} Year</strong> tenure.
          </p>
        </div>
      )}

      {/* TENURE SELECTION OPTIONS (1 YEAR / 2 YEARS / 3 YEARS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#EA580C]" />
            <span>Select Policy Tenure for Soft Copy Document</span>
          </label>
          {isPaymentApproved && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Approved: {approvedTenure} Year Plan
            </span>
          )}
        </div>

        {/* 3 Tenure Tabs / Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((years) => {
            const isApprovedPlan = isPaymentApproved && approvedTenure === years;
            const isSelected = activeTenureView === years;
            const isOtherPlanWhenApproved = isPaymentApproved && approvedTenure !== years;

            return (
              <div
                key={years}
                onClick={() => handleSelectTenureClick(years)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isApprovedPlan
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-400/40 shadow-xs'
                    : isSelected
                    ? 'border-[#EA580C] bg-orange-50/40 ring-1 ring-orange-300 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <span>{years} Year Plan</span>
                    </span>

                    {isApprovedPlan ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Approved</span>
                      </span>
                    ) : isOtherPlanWhenApproved ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" />
                        <span>Locked</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded-full">
                        {years === 1 ? 'Standard' : years === 2 ? '25% Disc' : '35% Disc'}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Coverage: {getValidityPreview(years)}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-semibold">
                    {isApprovedPlan ? (
                      <strong className="text-emerald-700 font-extrabold">Active Renewed Policy</strong>
                    ) : isOtherPlanWhenApproved ? (
                      <span className="text-slate-400">1-Year Was Approved</span>
                    ) : (
                      <span>Tenure Option</span>
                    )}
                  </span>
                  
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-[#EA580C] text-white' : 'border border-slate-300'
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Informative notice when user clicks a different year than approved */}
        {isPaymentApproved && activeTenureView !== approvedTenure && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Notice:</strong> Your payment was authorized and approved in the admin portal for a <strong>{approvedTenure} Year Policy</strong>. In accordance with insurance rules, the official soft copy downloaded will be for your approved <strong>{approvedTenure} Year</strong> tenure.
            </div>
          </div>
        )}
      </div>

      {/* DOWNLOAD ACTIONS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        
        {/* Policy Schedule Download Card */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#EA580C] transition-all flex flex-col justify-between shadow-2xs space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#EA580C] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-base">
                Policy Schedule & 80D Tax Certificate
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                Official digitally signed policy schedule for <strong className="text-slate-800">{targetDownloadTenure} Year(s)</strong> cover including 18% GST receipt and Section 80D tax exemption certificate.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-600">
              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Tenure: <strong>{targetDownloadTenure} Year(s)</strong>
              </span>
              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Period: <strong>{getValidityPreview(targetDownloadTenure)}</strong>
              </span>
            </div>
          </div>

          <button
            id="main-page-download-schedule-btn"
            type="button"
            onClick={() => handleDownloadSchedule(targetDownloadTenure)}
            className="w-full py-3.5 px-4 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>Download {targetDownloadTenure} Year Policy Schedule (PDF)</span>
          </button>
        </div>

        {/* Member Health Cards Download Card */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-900 transition-all flex flex-col justify-between shadow-2xs space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-base">
                Cashless Member Health Cards
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                Individual cashless hospital admission cards for all {policy?.members?.length || 1} family members across 14,000+ ICICI Lombard cashless network hospitals.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-600">
              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Members: <strong>{policy?.members?.length || 1} Insured</strong>
              </span>
              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Card Validity: <strong>{getValidityPreview(targetDownloadTenure)}</strong>
              </span>
            </div>
          </div>

          <button
            id="main-page-download-healthcards-btn"
            type="button"
            onClick={handleDownloadHealthCards}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Download All Member Health Cards (PDF)</span>
          </button>
        </div>

      </div>

      {/* Policy Wordings & Brochure Links */}
      <div className="flex flex-wrap items-center gap-5 pt-2 text-xs font-bold text-[#EA580C]">
        {isElevate ? (
          <>
            <a 
              href="#elevate-policy-wordings"
              onClick={(e) => {
                e.preventDefault();
                alert('Downloading Elevate Health Insurance Policy Wordings PDF (UIN: ICIHLIP25048V042425)...');
              }}
              className="underline hover:text-[#d84d00] cursor-pointer inline-flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Elevate Policy Wordings</span>
            </a>

            <span className="text-slate-300 font-light">|</span>

            <a 
              href="#elevate-brochure"
              onClick={(e) => {
                e.preventDefault();
                alert('Downloading Elevate Health Insurance Official Product Brochure PDF...');
              }}
              className="underline hover:text-[#d84d00] cursor-pointer inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Elevate Brochure</span>
            </a>
          </>
        ) : (
          <a 
            href="#policy-wordings"
            onClick={(e) => {
              e.preventDefault();
              alert(`Downloading ${displayedProduct} Policy Wordings PDF...`);
            }}
            className="underline hover:text-[#d84d00] cursor-pointer inline-flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{displayedProduct} Policy Wordings</span>
          </a>
        )}
      </div>

      {/* Product Code & UIN Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 mt-2">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#E5E3D5] text-slate-900 font-bold border-b border-slate-300">
              <th className="py-3 px-6 w-1/2">Product</th>
              <th className="py-3 px-6 text-center w-1/4">Product Code</th>
              <th className="py-3 px-6 text-center w-1/4">UIN no.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 font-medium bg-white">
            <tr>
              <td className="py-3.5 px-6 font-semibold">{displayedProduct}</td>
              <td className="py-3.5 px-6 text-center font-mono font-bold text-slate-900">{displayedCode}</td>
              <td className="py-3.5 px-6 text-center font-mono text-slate-700">{displayedUin}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
};
