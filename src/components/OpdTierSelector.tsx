import React from 'react';
import { Check, Shield, Sparkles } from 'lucide-react';
import { OPD_TIERS, OpdTierKey } from '../data/opdData';

interface OpdTierSelectorProps {
  selectedTier: OpdTierKey;
  onSelectTier: (tier: OpdTierKey) => void;
  selectedTenure: number; // 1, 2, or 3
  compact?: boolean;
}

export const OpdTierSelector: React.FC<OpdTierSelectorProps> = ({
  selectedTier,
  onSelectTier,
  selectedTenure,
  compact = false
}) => {
  const tierKeys: OpdTierKey[] = ['25k', '50k', '1lac'];

  return (
    <div className="space-y-3 pt-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#EA580C]" />
          <span className="text-xs font-bold text-slate-800">
            Choose OPD Coverage Limit & Multi-Year Rates:
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Applicable for selected <strong className="text-slate-700">{selectedTenure} Year{selectedTenure > 1 ? 's' : ''} Tenure</strong>
        </span>
      </div>

      {/* 3 Tier Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tierKeys.map((key) => {
          const tier = OPD_TIERS[key];
          const isSelected = selectedTier === key;
          const currentPrice = tier.tenurePrices[selectedTenure as 1 | 2 | 3] || tier.tenurePrices[1];

          return (
            <div
              key={key}
              onClick={() => onSelectTier(key)}
              className={`rounded-xl border p-3.5 transition-all cursor-pointer relative flex flex-col justify-between text-left ${
                isSelected
                  ? 'border-[#EA580C] bg-orange-50/40 shadow-xs ring-2 ring-orange-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              {/* Badge */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-[#EA580C] text-white'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {tier.badge || tier.shortLabel}
                </span>

                {isSelected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Selected</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">Select</span>
                )}
              </div>

              {/* Title & Limit */}
              <div className="space-y-1">
                <div className="font-extrabold text-slate-900 text-sm">
                  {tier.formattedLimit} OPD
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-normal">
                  {tier.description}
                </p>
              </div>

              {/* Pricing Breakdown */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    {selectedTenure} Yr Premium:
                  </span>
                  <span className="text-sm font-extrabold text-[#EA580C]">
                    ₹{currentPrice.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Tenure-wise prices breakdown */}
                <div className="bg-slate-50 rounded-lg p-1.5 border border-slate-200/60 text-[10px] space-y-0.5 text-slate-600">
                  <div className={`flex justify-between ${selectedTenure === 1 ? 'font-bold text-slate-900' : ''}`}>
                    <span>1 Yr:</span>
                    <span>₹{tier.tenurePrices[1].toLocaleString('en-IN')}</span>
                  </div>
                  <div className={`flex justify-between ${selectedTenure === 2 ? 'font-bold text-emerald-700' : ''}`}>
                    <span>2 Yrs:</span>
                    <span>₹{tier.tenurePrices[2].toLocaleString('en-IN')} <span className="text-[9px] text-emerald-600">(Save ₹{tier.saving2Yr})</span></span>
                  </div>
                  <div className={`flex justify-between ${selectedTenure === 3 ? 'font-bold text-emerald-700' : ''}`}>
                    <span>3 Yrs:</span>
                    <span>₹{tier.tenurePrices[3].toLocaleString('en-IN')} <span className="text-[9px] text-emerald-600">(Save ₹{tier.saving3Yr})</span></span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
