import React from 'react';
import { Check, Sparkles, TrendingDown } from 'lucide-react';
import { CustomerPolicy, AddOnRider } from '../types/insurance';
import { getTenurePricingDetails } from '../utils/premiumCalculation';

interface TenureOption {
  years: number;
  label: string;
  discountPct: number;
  tagline?: string;
  popular?: boolean;
}

interface TenureSelectorProps {
  baseAnnualPremium: number;
  addonsPremium: number;
  selectedTenure: number;
  onSelectTenure: (years: number) => void;
  tenurePrices?: { 1: number; 2: number; 3: number };
  grossTenurePrices?: { 1: number; 2: number; 3: number };
  addonsTenureCost?: (years: number) => number;
  policy?: CustomerPolicy;
  selectedAddOns?: AddOnRider[];
  baselineAddOnIds?: string[];
}

export const TenureSelector: React.FC<TenureSelectorProps> = ({
  baseAnnualPremium,
  addonsPremium,
  selectedTenure,
  onSelectTenure,
  tenurePrices,
  grossTenurePrices,
  addonsTenureCost,
  policy,
  selectedAddOns,
  baselineAddOnIds
}) => {
  const options: TenureOption[] = [
    {
      years: 1,
      label: '1 Year Plan',
      discountPct: 10,
      tagline: '10% Discount + 10% Guaranteed Cashback'
    },
    {
      years: 2,
      label: '2 Years Plan',
      discountPct: 25,
      tagline: '25% Multi-Year Disc + 10% Guaranteed Cashback',
      popular: true
    },
    {
      years: 3,
      label: '3 Years Plan',
      discountPct: 35,
      tagline: '35% Discount + 10% Guaranteed Cashback'
    }
  ];

  return (
    <div id="renewal-tenure-section" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 font-sans">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#EA580C]">Renewal Duration</div>
          <h3 className="text-xl font-bold text-slate-900 mt-0.5">Select Policy Tenure & Lock Multi-Year Discounts</h3>
        </div>
        <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1 self-start sm:self-auto">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Multi-Year Price Guarantee Included</span>
        </div>
      </div>

      {/* 3 Tenure Options Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {options.map((opt) => {
          const isSelected = selectedTenure === opt.years;

          let grossOriginal = 0;
          let finalTenurePremium = 0;
          let discountAmt = 0;
          let effectiveDiscountPct = opt.discountPct;

          if (policy) {
            const pricing = getTenurePricingDetails(
              policy,
              opt.years,
              selectedAddOns || [],
              baselineAddOnIds || policy.selectedAddOnIds || []
            );
            grossOriginal = pricing.gross;
            finalTenurePremium = pricing.net;
            discountAmt = pricing.discAmt;
            effectiveDiscountPct = pricing.discPct;
          } else {
            const defaultDiscountPct = opt.years === 1 ? 10 : opt.years === 2 ? 25 : 35;
            const addonYrCost = addonsTenureCost ? addonsTenureCost(opt.years) : (addonsPremium * opt.years);
            grossOriginal = (grossTenurePrices && grossTenurePrices[opt.years as 1 | 2 | 3])
              ? grossTenurePrices[opt.years as 1 | 2 | 3]
              : Math.round((baseAnnualPremium * (opt.years === 1 ? 1 : opt.years === 2 ? 1.9 : 2.75)) + addonYrCost);

            finalTenurePremium = (tenurePrices && tenurePrices[opt.years as 1 | 2 | 3])
              ? tenurePrices[opt.years as 1 | 2 | 3]
              : Math.round(grossOriginal * (1 - defaultDiscountPct / 100));

            discountAmt = Math.max(0, grossOriginal - finalTenurePremium);
            effectiveDiscountPct = grossOriginal > 0 ? Math.round((discountAmt / grossOriginal) * 100) : defaultDiscountPct;
          }

          return (
            <div
              key={opt.years}
              onClick={() => onSelectTenure(opt.years)}
              className={`rounded-2xl border p-5 transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'border-[#EA580C] bg-orange-50/30 ring-2 ring-orange-400/30 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div>
                {/* Popular Badge */}
                {opt.popular && (
                  <span className="absolute -top-3 right-4 bg-[#EA580C] text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
                    Recommended Value
                  </span>
                )}

                {/* Duration Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      isSelected ? 'bg-[#EA580C] text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {opt.years}Y
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base">{opt.label}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">{opt.tagline}</p>
                    </div>
                  </div>

                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-[#EA580C] text-white' : 'border-2 border-slate-300'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Calculation Breakdown */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Gross ({opt.years} {opt.years === 1 ? 'Yr' : 'Yrs'}):</span>
                    <span className="line-through">₹{grossOriginal.toLocaleString('en-IN')}</span>
                  </div>

                  {discountAmt > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span className="flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-emerald-600" />
                        <span>
                          {effectiveDiscountPct}% Discount:
                        </span>
                      </span>
                      <span>-₹{discountAmt.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="mt-1 pt-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded px-2 py-1 font-bold text-[11px] flex items-center gap-1">
                    <span>🎁 + 10% Guaranteed Cashback Eligible</span>
                  </div>
                </div>
              </div>

              {/* Total Price Display */}
              <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Payable</span>
                  <span className="text-xs text-slate-500 font-medium">
                    (₹{Math.round(finalTenurePremium / opt.years).toLocaleString('en-IN')} / yr)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-slate-900">
                    ₹{finalTenurePremium.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-normal">All taxes included</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
