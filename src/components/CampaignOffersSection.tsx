import React from 'react';
import { Gift, Award, Tag, Sparkles, CheckCircle2, DollarSign } from 'lucide-react';

interface CampaignOffersSectionProps {
  loyaltyNcbDiscountAmount: number;
  loyaltyNcbPct: number;
  tenureDiscountAmount: number;
  adminCustomDiscountAmount: number;
  cashbackAmount: number;
  totalSavings: number;
}

export const CampaignOffersSection: React.FC<CampaignOffersSectionProps> = ({
  loyaltyNcbDiscountAmount,
  loyaltyNcbPct,
  tenureDiscountAmount,
  adminCustomDiscountAmount,
  cashbackAmount,
  totalSavings
}) => {
  return (
    <div id="campaign-offers-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 font-sans">
      
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
          <Gift className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Special Loyalty & Campaign Privileges</div>
          <h3 className="text-lg font-bold text-slate-900">Applied Discount Savings</h3>
        </div>
      </div>

      {/* Applied Savings Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* NCB Loyalty Discount */}
        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>NCB Loyalty Discount ({loyaltyNcbPct}%)</span>
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-extrabold text-emerald-900">
            -₹{loyaltyNcbDiscountAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-emerald-700 font-medium">Earned for continuous claim-free tenure</p>
        </div>

        {/* Multi-Year Tenure Campaign Discount */}
        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-800 font-bold">
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>Multi-Year Tenure Discount</span>
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-lg font-extrabold text-amber-900">
            -₹{tenureDiscountAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-amber-700 font-medium">Applied automatically on multi-year plans</p>
        </div>

        {/* Agent / Admin Configured Custom Discount */}
        <div className="bg-orange-50/60 p-4 rounded-xl border border-orange-200 space-y-1">
          <div className="flex items-center justify-between text-xs text-orange-800 font-bold">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>Admin Campaign Promo</span>
            </span>
            {adminCustomDiscountAmount > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />}
          </div>
          <div className="text-lg font-extrabold text-orange-900">
            -₹{adminCustomDiscountAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-orange-700 font-medium">Special voucher approved by renewal team</p>
        </div>

        {/* Applicable Instant Cashback */}
        <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-1">
          <div className="flex items-center justify-between text-xs text-blue-800 font-bold">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              <span>10% Credit Card Cashback</span>
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-lg font-extrabold text-blue-900">
            ₹{cashbackAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-blue-700 font-medium">10% cashback on any bank credit card for all tenures</p>
        </div>

      </div>

      {/* Cumulative Total Savings Highlight Bar */}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-200">Total Renewal Savings Today:</span>
        </div>
        <div className="text-lg font-black text-amber-300 font-mono">
          ₹{totalSavings.toLocaleString('en-IN')} Saved
        </div>
      </div>

    </div>
  );
};
