import React from 'react';
import { Sparkles, Shield, Check, Edit3, ArrowRight, Award } from 'lucide-react';
import { CustomerPolicy } from '../types/insurance';

interface LoyaltyRenewalHeroCardProps {
  policy: CustomerPolicy;
  selectedTenure: number;
  totalPayable: number;
  grossTotal?: number;
  totalDiscounts?: number;
  onEditPlan?: () => void;
  onNavigateSection?: (sectionId: string) => void;
}

export const LoyaltyRenewalHeroCard: React.FC<LoyaltyRenewalHeroCardProps> = ({
  policy,
  selectedTenure,
  totalPayable,
  grossTotal,
  totalDiscounts,
  onEditPlan,
  onNavigateSection
}) => {
  const loyaltyBonus = policy.loyaltyBonus || 3600000;
  const baseSI = policy.baseSumInsured || 1500000;
  const totalSI = policy.totalSumInsured || (baseSI + loyaltyBonus);

  const effectiveGross = grossTotal !== undefined && grossTotal > totalPayable
    ? grossTotal
    : (policy.grossTenurePrices?.[selectedTenure as 1 | 2 | 3] || totalPayable);
  const effectiveDiscount = totalDiscounts !== undefined && totalDiscounts > 0
    ? totalDiscounts
    : Math.max(0, effectiveGross - totalPayable);

  const bonusLakhs = loyaltyBonus >= 100000 ? `${loyaltyBonus / 100000} lakhs` : `₹${loyaltyBonus.toLocaleString('en-IN')}`;
  const baseSILakhs = baseSI >= 100000 ? `${baseSI / 100000} lakhs` : `₹${baseSI.toLocaleString('en-IN')}`;

  const scrollTo = (id: string) => {
    if (onNavigateSection) {
      onNavigateSection(id);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Covers from existing policy
  const existingCovers = [
    'Claim Protector',
    'Room modifier',
    'Power Booster',
    'Health Checkup'
  ];

  return (
    <div id="loyalty-renewal-hero-card" className="space-y-4 font-sans">
      {/* Golden Loyalty Badge Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-2xl p-4 sm:p-5 shadow-md flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
          </div>
          <div>
            <div className="text-sm sm:text-base font-extrabold flex items-center gap-1.5">
              <span>Extra ₹{bonusLakhs}</span>
              <span className="text-amber-100 font-medium text-xs sm:text-sm">cover — rewarding your loyalty.</span>
            </div>
            <p className="text-xs text-amber-100/90 font-medium">
              Base Sum Insured: ₹{baseSILakhs} + Loyalty Bonus ₹{bonusLakhs} = Total Cover ₹{(totalSI / 100000).toFixed(0)} Lakhs
            </p>
          </div>
        </div>

        <div className="bg-white/15 backdrop-blur-xs border border-white/30 rounded-xl px-3.5 py-1.5 text-xs font-extrabold text-white flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-300" />
          <span>Loyalty Rewarded</span>
        </div>
      </div>

      {/* Main Welcome Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-6">
        
        {/* Header Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#EA580C] bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
              <Shield className="w-3 h-3" />
              <span>{policy.policyName || 'Elevate health insurance'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {policy.customerName}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Let's make sure your protection stays strong — and even better this year.
            </p>
          </div>

          <div className="sm:text-right shrink-0">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Policy Number</span>
            <span className="font-mono text-sm font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg inline-block mt-0.5">
              {policy.policyNumber}
            </span>
          </div>
        </div>

        {/* Renewal Plan Details Box */}
        <div className="bg-gradient-to-br from-slate-50 to-orange-50/30 rounded-2xl border border-orange-100 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Renewal Plan</span>
              <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                <span className="text-3xl font-black text-slate-950 text-[#002B49]">
                  ₹{totalPayable.toLocaleString('en-IN')}
                </span>
                <span className="text-sm font-bold text-[#EA580C] bg-orange-100/70 px-2.5 py-0.5 rounded-full">
                  {selectedTenure} {selectedTenure === 1 ? 'year' : 'years'} policy
                </span>
                {effectiveDiscount > 0 && (
                  <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
                    <span>Discount Applied: -₹{effectiveDiscount.toLocaleString('en-IN')}</span>
                  </span>
                )}
              </div>
              {effectiveGross > totalPayable && (
                <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2 flex-wrap">
                  <span>Gross Original: <span className="line-through font-semibold text-slate-600">₹{effectiveGross.toLocaleString('en-IN')}</span></span>
                  <span className="text-emerald-700 font-bold">• Total Savings: ₹{effectiveDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onEditPlan || (() => scrollTo('renewal-tenure-section'))}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#EA580C] text-[#EA580C] hover:bg-orange-50 font-bold text-xs shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Plan / Tenure</span>
            </button>
          </div>

          {/* What's included in the plan */}
          <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
            <span className="text-xs font-extrabold text-slate-900 block">What's included in the plan:</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                <span className="text-slate-600 font-medium">Base Sum Insured:</span>
                <strong className="text-slate-900 font-extrabold">₹{baseSILakhs} (₹{baseSI.toLocaleString('en-IN')})</strong>
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-200 flex items-center justify-between shadow-2xs">
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Loyalty Bonus:</span>
                </span>
                <strong className="text-emerald-800 font-extrabold">₹{bonusLakhs} (₹{loyaltyBonus.toLocaleString('en-IN')})</strong>
              </div>
            </div>

            {/* Add-on Covers From existing policy */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">Add-on Covers:</span>
                  <span className="text-[11px] text-slate-500 font-normal">From existing policy</span>
                </div>
                <button
                  type="button"
                  onClick={() => scrollTo('add-on-covers-section')}
                  className="text-xs font-bold text-[#EA580C] underline hover:text-[#d84d00] cursor-pointer"
                >
                  Edit Add-ons
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {existingCovers.map((cover, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-bold"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>{cover}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4 Quick Anchor Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => scrollTo('add-on-covers-section')}
            className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-[#EA580C] text-slate-800 hover:text-[#EA580C] text-xs font-bold transition-all text-center cursor-pointer shadow-2xs flex items-center justify-center gap-1"
          >
            <span>Add-ons</span>
            <ArrowRight className="w-3 h-3 opacity-60" />
          </button>

          <button
            type="button"
            onClick={() => scrollTo('insured-members-section')}
            className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-[#EA580C] text-slate-800 hover:text-[#EA580C] text-xs font-bold transition-all text-center cursor-pointer shadow-2xs flex items-center justify-center gap-1"
          >
            <span>Insured Details</span>
            <ArrowRight className="w-3 h-3 opacity-60" />
          </button>

          <button
            type="button"
            onClick={() => scrollTo('policy-benefits-section')}
            className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-[#EA580C] text-slate-800 hover:text-[#EA580C] text-xs font-bold transition-all text-center cursor-pointer shadow-2xs flex items-center justify-center gap-1"
          >
            <span>Benefits Covered</span>
            <ArrowRight className="w-3 h-3 opacity-60" />
          </button>

          <button
            type="button"
            onClick={() => scrollTo('waiting-periods-section')}
            className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-[#EA580C] text-slate-800 hover:text-[#EA580C] text-xs font-bold transition-all text-center cursor-pointer shadow-2xs flex items-center justify-center gap-1"
          >
            <span>Waiting Periods</span>
            <ArrowRight className="w-3 h-3 opacity-60" />
          </button>
        </div>

      </div>
    </div>
  );
};
