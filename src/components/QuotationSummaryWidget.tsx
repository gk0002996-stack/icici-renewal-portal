import React, { useState } from 'react';
import { Info, Tag, Check, ShieldCheck, X, CreditCard } from 'lucide-react';
import { CustomerPolicy, AddOnRider } from '../types/insurance';
import { INITIAL_ADDONS } from '../data/initialData';
import { OPD_RIDER_ID } from '../data/opdData';
import { getTenurePricingDetails } from '../utils/premiumCalculation';

interface QuotationSummaryWidgetProps {
  policy: CustomerPolicy;
  selectedAddOns: AddOnRider[];
  selectedTenure: number;
  onSelectTenure: (tenure: number) => void;
  onProceedToPayment: () => void;
  onPaymentSuccess?: (method: string, transactionRef: string, attemptData: any) => void;
  onPaymentFailure?: (method: string, transactionRef: string, attemptData: any) => void;
}

export const QuotationSummaryWidget: React.FC<QuotationSummaryWidgetProps> = ({
  policy,
  selectedAddOns,
  selectedTenure,
  onSelectTenure,
  onProceedToPayment,
  onPaymentSuccess,
  onPaymentFailure
}) => {
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const baseAnnual = policy.baseAnnualPremium || 28666;
  const availableAddOns = policy.addOnRiders && policy.addOnRiders.length > 0 ? policy.addOnRiders : INITIAL_ADDONS;
  const baselineAddonIds = policy.selectedAddOnIds || [];
  const baselineAddonObjects = availableAddOns.filter(r => baselineAddonIds.includes(r.id));
  const baselineAddonsAnnual = baselineAddonObjects.reduce((sum, a) => sum + a.annualPremium, 0);

  const getAddonCostForTenure = (addon: AddOnRider, yr: number) => {
    if (addon.id === OPD_RIDER_ID && addon.tenurePrices) {
      return addon.tenurePrices[yr as 1 | 2 | 3] || addon.annualPremium * yr;
    }
    return addon.annualPremium * yr;
  };

  const getTenurePayableAndGross = (yr: number) => {
    return getTenurePricingDetails(policy, yr, selectedAddOns, baselineAddonIds);
  };

  const currentDetails = getTenurePayableAndGross(selectedTenure);
  const currentGrossTenure = currentDetails.gross;
  const totalPayable = currentDetails.net;
  const totalDiscounts = currentDetails.discAmt;
  const grossBaseTenure = currentDetails.grossBaseTenure;
  const grossAddonsTenure = currentDetails.grossAddonsTenure;

  return (
    <div id="quotation-summary-widget" className="bg-white rounded-2xl border border-slate-200/90 shadow-lg p-6 space-y-5 font-sans sticky top-20">
      
      {/* Header */}
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>Policy Renewal Summary</span>
            <button
              type="button"
              onClick={() => setShowSummaryModal(true)}
              className="text-[#EA580C] text-xs font-bold underline hover:text-[#d84d00] cursor-pointer"
            >
              (View Breakup)
            </button>
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">Policy #{policy.policyNumber}</p>
        </div>
        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-emerald-200 uppercase">
          Guaranteed Quote
        </span>
      </div>

      {/* Tenure selector 3 buttons */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Select Renewal Duration</label>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((yr) => {
            const isSelected = selectedTenure === yr;
            const { net, discPct } = getTenurePayableAndGross(yr);

            const cbConfig = policy.cashbackConfig;
            const hasCb = cbConfig ? cbConfig.enabled : true;
            const cbText = hasCb ? (cbConfig?.type === 'fixed' ? `₹${cbConfig.value} cashback` : `${cbConfig?.value ?? 10}% cashback`) : '';
            const discountTag = cbText ? `${discPct}% disc & ${cbText}` : `${discPct}% discount`;

            return (
              <button
                key={yr}
                type="button"
                onClick={() => onSelectTenure(yr)}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#EA580C] bg-[#FFF7ED] text-[#EA580C] ring-2 ring-[#EA580C]/20 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="text-[10px] text-slate-400 font-medium">Net Premium</div>
                <div className="text-xs font-black text-slate-900">₹{net.toLocaleString('en-IN')}</div>
                <div className="text-[11px] font-semibold text-slate-600 mb-0.5">{yr} {yr === 1 ? 'year' : 'years'}</div>
                {discountTag && (
                  <div className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 rounded mt-0.5 py-0.5 px-0.5 leading-tight border border-emerald-100">
                    {discountTag}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed Premium & Discount Breakdown */}
      <div className="space-y-3 text-xs text-slate-700 font-medium pt-2 border-t border-slate-100">
        
        {/* Actual Base Premium */}
        <div className="flex justify-between items-center text-slate-700">
          <span className="text-slate-600">Base Premium</span>
          <span className="font-extrabold text-slate-900">₹{grossBaseTenure.toLocaleString('en-IN')}</span>
        </div>

        {/* Selected Add-ons Premium */}
        {grossAddonsTenure > 0 && (
          <div className="flex justify-between items-center text-slate-700">
            <button 
              type="button"
              onClick={() => setShowSummaryModal(true)}
              className="flex items-center gap-1 text-slate-600 hover:text-[#EA580C] cursor-pointer"
            >
              <span>Additional covers</span>
              <Info className="w-3.5 h-3.5 text-slate-400 hover:text-[#EA580C]" />
            </button>
            <span className="font-bold text-slate-900">₹{grossAddonsTenure.toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* Sub total */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold text-slate-900 text-xs">
          <span>Sub total (Gross)</span>
          <span>₹{currentGrossTenure.toLocaleString('en-IN')}</span>
        </div>

        {/* DISCOUNTS SECTION */}
        {totalDiscounts > 0 && (
          <div className="flex justify-between items-center text-emerald-700 bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
            <span className="flex items-center gap-1 font-bold">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              <span>Special Renewal Discount ({currentDetails.discPct}%)</span>
            </span>
            <span className="font-extrabold text-emerald-700">-₹{totalDiscounts.toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* 10% Cashback Highlight */}
        <div className="flex justify-between items-center text-blue-800 bg-blue-50/80 p-2 rounded-lg border border-blue-200">
          <span className="flex items-center gap-1 font-bold">
            <span className="text-sm">🎁</span>
            <span>10% Guaranteed Cashback Eligible</span>
          </span>
          <span className="font-extrabold text-blue-900">₹{Math.round(totalPayable * 0.10).toLocaleString('en-IN')}</span>
        </div>

        {/* Savings Alert Banner */}
        {totalDiscounts > 0 && (
          <div className="bg-emerald-100/80 border border-emerald-300 text-emerald-900 rounded-xl p-2.5 text-center text-[11px] font-extrabold flex items-center justify-center gap-1.5 shadow-2xs">
            <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
            <span>Total Savings Applied: ₹{totalDiscounts.toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* Final Total Payable */}
        <div className="pt-3 border-t-2 border-slate-800 flex justify-between items-center">
          <div>
            <span className="font-extrabold text-slate-900 text-sm block">Total Premium Payable</span>
            <button 
              type="button"
              onClick={() => setShowSummaryModal(true)}
              className="text-[10px] text-[#EA580C] underline font-bold cursor-pointer"
            >
              View Detailed Summary
            </button>
          </div>
          <span className="font-black text-slate-950 text-xl text-[#EA580C]">
            ₹{totalPayable.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Checkout Button */}
      <div className="pt-2">
        <button
          id="proceed-to-pay-btn"
          type="button"
          onClick={onProceedToPayment}
          className="w-full bg-[#EA580C] hover:bg-[#C2410C] text-white py-3.5 px-6 rounded-xl font-black text-base shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all cursor-pointer text-center flex items-center justify-center gap-2 active:scale-95"
        >
          <CreditCard className="w-5 h-5 text-white" />
          <span>Proceed to Pay ₹{totalPayable.toLocaleString('en-IN')}</span>
        </button>
      </div>

      {/* Premium Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Premium summary</h3>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Base Premium */}
            <div className="pt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-800 font-medium">Base premium</span>
                <span className="font-medium text-slate-900">₹{grossBaseTenure.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Dotted Divider */}
            <div className="border-b border-dashed border-slate-300"></div>

            {/* Additional Covers Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-800 font-medium">Additional covers</span>
                <span className="font-medium text-slate-900">₹{grossAddonsTenure.toLocaleString('en-IN')}</span>
              </div>

              {/* Sub-item add-ons list */}
              {selectedAddOns.length > 0 && (
                <div className="space-y-1.5 pl-4 text-xs text-slate-500 font-normal">
                  {selectedAddOns.map(addon => (
                    <div key={addon.id} className="flex justify-between items-center">
                      <span>{addon.name} {addon.id === OPD_RIDER_ID && addon.coverageAmount ? `(${addon.coverageAmount})` : ''}</span>
                      <span>₹{getAddonCostForTenure(addon, selectedTenure).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dotted Divider */}
            <div className="border-b border-dashed border-slate-300"></div>

            {/* Sub total */}
            <div className="flex justify-between items-center text-sm font-bold text-slate-900">
              <span>Sub total (Gross)</span>
              <span>₹{currentGrossTenure.toLocaleString('en-IN')}</span>
            </div>

            {/* Discount Applied row */}
            {totalDiscounts > 0 && (
              <div className="flex justify-between items-center text-xs font-semibold text-emerald-700">
                <span>
                  Discount Applied ({currentDetails.discPct}%)
                </span>
                <span>-₹{totalDiscounts.toLocaleString('en-IN')}</span>
              </div>
            )}

            {/* Dotted Divider */}
            <div className="border-b border-dashed border-slate-300"></div>

            {/* Total payable */}
            <div className="flex justify-between items-center text-base font-bold text-slate-900">
              <span>Total payable</span>
              <span>₹{totalPayable.toLocaleString('en-IN')}</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};



