import React, { useState, useEffect, useMemo } from 'react';
import { Check, Plus } from 'lucide-react';
import { AddOnRider } from '../types/insurance';
import { INITIAL_ADDONS } from '../data/initialData';
import { OpdTierKey, OPD_TIERS, OPD_RIDER_ID } from '../data/opdData';
import { OpdTierSelector } from './OpdTierSelector';
import { BefitPlanKey, BEFIT_PLANS, BEFIT_PLAN_KEYS, BEFIT_RIDER_ID } from '../data/befitData';
import { BefitPlanModal } from './BefitPlanModal';

interface AddOnsSectionProps {
  addOns?: AddOnRider[];
  selectedAddOnIds: string[];
  onToggleAddOn: (riderId: string) => void;
  selectedOpdTier?: OpdTierKey;
  onSelectOpdTier?: (tier: OpdTierKey) => void;
  selectedBefitPlan?: BefitPlanKey;
  onSelectBefitPlan?: (plan: BefitPlanKey) => void;
  selectedTenure?: number;
}

export const AddOnsSection: React.FC<AddOnsSectionProps> = ({
  addOns,
  selectedAddOnIds,
  onToggleAddOn,
  selectedOpdTier = '25k',
  onSelectOpdTier,
  selectedBefitPlan = 'Plan A',
  onSelectBefitPlan,
  selectedTenure = 1
}) => {
  // Always guarantee all 15 master add-ons are displayed across all laptops and refreshed links
  const displayAddOns = useMemo(() => {
    const list = addOns && addOns.length > 0 ? addOns : INITIAL_ADDONS;
    const map = new Map<string, AddOnRider>(list.map(r => [r.id, r]));
    return INITIAL_ADDONS.map(master => {
      const existing = map.get(master.id);
      return existing ? ({ ...master, ...existing } as AddOnRider) : master;
    });
  }, [addOns]);

  const [befitPlan, setBefitPlan] = useState<BefitPlanKey>(selectedBefitPlan);
  const [showBefitModal, setShowBefitModal] = useState<boolean>(false);

  useEffect(() => {
    if (selectedBefitPlan && selectedBefitPlan !== befitPlan) {
      setBefitPlan(selectedBefitPlan);
    }
  }, [selectedBefitPlan]);

  const handleBefitPlanChange = (newPlan: BefitPlanKey, isCurrentlySelected: boolean) => {
    setBefitPlan(newPlan);
    if (onSelectBefitPlan) {
      onSelectBefitPlan(newPlan);
    }
    if (!isCurrentlySelected) {
      onToggleAddOn(BEFIT_RIDER_ID);
    }
  };

  const opdData = OPD_TIERS[selectedOpdTier];
  const opdPriceForTenure = opdData.tenurePrices[selectedTenure as 1 | 2 | 3] || opdData.tenurePrices[1];

  const currentBefitPlan = BEFIT_PLANS[befitPlan] || BEFIT_PLANS['Plan A'];
  const befitPriceForTenure = currentBefitPlan.tenurePrices[selectedTenure as 1 | 2 | 3] || currentBefitPlan.tenurePrices[1];

  return (
    <div id="add-on-covers-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5 font-sans">
      
      {/* Section Header (Matches User Screenshot: 3 CHOOSE ADD-ON COVERS) */}
      <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-full bg-[#00264A] text-white flex items-center justify-center text-[10px] font-black shrink-0">
            3
          </div>
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
            CHOOSE ADD-ON COVERS
          </h3>
        </div>
        <span className="text-[11px] sm:text-xs font-bold px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {selectedAddOnIds.length} Add-on(s) Selected
        </span>
      </div>

      {/* 2-Column Responsive Card Grid (Matching Screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayAddOns.map((rider) => {
          const isOpd = rider.id === OPD_RIDER_ID;
          const isBefit = rider.id === BEFIT_RIDER_ID;
          const isSelected = selectedAddOnIds.includes(rider.id);

          // Calculate displayed price
          const displayPrice = isOpd 
            ? opdPriceForTenure 
            : isBefit 
            ? befitPriceForTenure 
            : (rider.annualPremium || 0) * selectedTenure;

          const displayCoverage = isOpd 
            ? opdData.formattedLimit + ' OPD Limit' 
            : isBefit 
            ? `Plan A: Starter` 
            : rider.coverageAmount;

          return (
            <div
              key={rider.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all bg-white shadow-2xs ${
                isSelected 
                  ? 'border-emerald-500 bg-emerald-50/15 ring-1 ring-emerald-500 shadow-xs' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-2">
                {/* Top Row: Title & Price */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">
                    {rider.name}
                  </h4>
                  <span className="font-mono text-emerald-700 font-extrabold text-xs sm:text-sm whitespace-nowrap">
                    +₹{displayPrice.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {rider.description}
                </p>

                {/* Specific selector for BeFit: Plans A to F */}
                {isBefit && (
                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      BeFit Plan Tier (Plans A to F):
                    </label>
                    <select
                      value={befitPlan}
                      onChange={(e) => handleBefitPlanChange(e.target.value as BefitPlanKey, isSelected)}
                      className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:border-[#EA580C] outline-none"
                    >
                      {BEFIT_PLAN_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {k} ({BEFIT_PLANS[k].badge}) — ₹{BEFIT_PLANS[k].pricePerYear.toLocaleString('en-IN')}/yr
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Specific selector for OPD: Tiers */}
                {isOpd && (
                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <OpdTierSelector
                      selectedTier={selectedOpdTier}
                      onSelectTier={(tier) => {
                        if (onSelectOpdTier) onSelectOpdTier(tier);
                        if (!isSelected) onToggleAddOn(rider.id);
                      }}
                      selectedTenure={selectedTenure}
                    />
                  </div>
                )}
              </div>

              {/* Bottom Row: Subtitle / Tag on Left, Action Button on Right */}
              <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                  {displayCoverage}
                </span>

                <button
                  type="button"
                  onClick={() => onToggleAddOn(rider.id)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                      <span>Added</span>
                    </>
                  ) : (
                    <>
                      <span>+ Add Cover</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Compare BeFit Plans Modal */}
      <BefitPlanModal
        isOpen={showBefitModal}
        onClose={() => setShowBefitModal(false)}
        selectedPlan={befitPlan}
        onSelectPlan={(k) => handleBefitPlanChange(k, selectedAddOnIds.includes(BEFIT_RIDER_ID))}
        selectedTenure={selectedTenure}
        isBefitAdded={selectedAddOnIds.includes(BEFIT_RIDER_ID)}
        onToggleAddOn={() => onToggleAddOn(BEFIT_RIDER_ID)}
      />

    </div>
  );
};
