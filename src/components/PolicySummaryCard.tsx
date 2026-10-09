import React, { useState } from 'react';
import { Sparkles, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { CustomerPolicy } from '../types/insurance';

interface PolicySummaryCardProps {
  policy: CustomerPolicy;
  onSumInsuredChange?: (newSi: number) => void;
  onViewAllBenefits?: () => void;
}

export const PolicySummaryCard: React.FC<PolicySummaryCardProps> = ({ 
  policy,
  onSumInsuredChange,
  onViewAllBenefits
}) => {
  const [selectedSi, setSelectedSi] = useState<number>(policy.baseSumInsured || 750000);

  const handleSiSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    setSelectedSi(val);
    if (onSumInsuredChange) onSumInsuredChange(val);
  };

  const loyaltyBonus = policy.loyaltyBonus || 450000;
  const totalSumInsured = selectedSi + loyaltyBonus;

  // Standard SI options list including 7.5 Lakh
  const baseOptions = [750000, 1000000, 1500000, 2000000, 2500000, 3000000, 5000000];
  if (policy.baseSumInsured && !baseOptions.includes(policy.baseSumInsured)) {
    baseOptions.unshift(policy.baseSumInsured);
    baseOptions.sort((a, b) => a - b);
  }

  const formatLakhsLabel = (val: number) => {
    if (val >= 100000) {
      const lakhs = val / 100000;
      return `₹${lakhs % 1 === 0 ? lakhs : lakhs.toFixed(1)} Lakh (₹${val.toLocaleString('en-IN')})`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Main Content Box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-5">
        
        {/* Thank you note */}
        <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span className="text-lg">👍</span>
          <span>Thank you for trusting ICICI Lombard with your Health Insurance needs.</span>
        </div>

        {/* Pro-Tip Light Blue Banner */}
        <div className="bg-[#F0F9FF] border border-[#BAE6FD] text-[#0369A1] rounded-xl p-3.5 text-xs flex items-center gap-2.5 font-medium">
          <span className="text-base">📈</span>
          <div>
            <strong className="font-bold">Pro-tip:</strong> A higher sum insured equals enhanced coverage against rising medical costs and greater peace of mind.
          </div>
        </div>

        {/* Sum Insured Calculator Box */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* SI Select Dropdown */}
            <div className="space-y-1">
              <label className="text-xs text-slate-500 font-medium block">Sum insured (SI)</label>
              <div className="relative inline-block">
                <select
                  value={selectedSi}
                  onChange={handleSiSelect}
                  className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-9 font-bold text-slate-900 text-sm shadow-2xs focus:outline-none focus:border-[#EA580C] cursor-pointer"
                >
                  {baseOptions.map(opt => (
                    <option key={opt} value={opt}>
                      {formatLakhsLabel(opt)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="text-slate-400 font-extrabold text-lg self-center">+</div>

            {/* Loyalty Bonus Display */}
            <div className="space-y-1">
              <span className="text-xs text-slate-500 font-medium block">Loyalty bonus:</span>
              <span className="font-bold text-slate-900 text-base block">₹{loyaltyBonus.toLocaleString('en-IN')}</span>
            </div>

            <div className="text-slate-300 font-light text-xl self-center">|</div>

            {/* Total Sum Insured */}
            <div className="space-y-1">
              <span className="text-xs text-slate-500 font-medium block">Your total sum insured:</span>
              <strong className="font-extrabold text-slate-900 text-xl block">₹{totalSumInsured.toLocaleString('en-IN')}</strong>
            </div>

          </div>

          {/* Yellow Pill for Loyalty Bonus */}
          <div className="inline-flex items-center gap-1.5 bg-[#FEF9C3] text-[#15803D] border border-[#FDE047] px-3 py-1 rounded-full text-xs font-bold shadow-2xs mt-1">
            <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
            <span>Loyalty Bonus ₹{loyaltyBonus.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Introduced New Benefits */}
        <div className="space-y-3 pt-1">
          <p className="text-xs font-bold text-slate-800">
            We have introduced new benefits in your plan from this year onwards.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-white border border-rose-200 rounded-xl p-3 flex items-start gap-2 shadow-2xs hover:border-rose-300 transition-colors">
              <span className="text-[#EA580C] font-bold mt-0.5">▶</span>
              <span className="text-slate-800 font-semibold leading-snug">Avail a 20% increase in the annual SI</span>
            </div>

            <div className="bg-white border border-rose-200 rounded-xl p-3 flex items-start gap-2 shadow-2xs hover:border-rose-300 transition-colors">
              <span className="text-[#EA580C] font-bold mt-0.5">▶</span>
              <span className="text-slate-800 font-semibold leading-snug">Enjoy no capping on the room rent</span>
            </div>

            <div className="bg-white border border-rose-200 rounded-xl p-3 flex items-start gap-2 shadow-2xs hover:border-rose-300 transition-colors">
              <span className="text-[#EA580C] font-bold mt-0.5">▶</span>
              <span className="text-slate-800 font-semibold leading-snug">Access unlimited tele-consultations</span>
            </div>

            <button
              type="button"
              onClick={onViewAllBenefits}
              className="bg-white border border-[#EA580C] text-[#EA580C] hover:bg-orange-50 rounded-xl p-3 flex items-center justify-between font-bold shadow-2xs transition-colors cursor-pointer text-xs"
            >
              <span>View all benefits</span>
              <ChevronRight className="w-4 h-4 text-[#EA580C]" />
            </button>
          </div>
        </div>

        {/* Zone Card with Map Illustration */}
        <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
          <div className="space-y-2 max-w-lg z-10">
            <h4 className="font-extrabold text-slate-900 text-sm">You're in <span className="text-slate-950">{policy.zone || 'Zone B'}</span>.</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {policy.zoneNotice || `Nice! You're getting a premium discount due to zone-based pricing, calculated on the treatment & medical expenses in your city${policy.kyc?.city ? ` (${policy.kyc.city}${policy.kyc.state ? `, ${policy.kyc.state}` : ''})` : ''}.`}
            </p>
            <button
              type="button"
              onClick={() => alert(`Zone pricing applied for ${policy.kyc?.city || 'customer'} (${policy.kyc?.state || policy.zone || 'Zone B'} region).`)}
              className="mt-2 px-4 py-1.5 bg-white border border-[#EA580C] text-[#EA580C] hover:bg-orange-50 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer inline-block"
            >
              View details
            </button>
          </div>

          {/* SVG Zone Map Graphic on the Right */}
          <div className="w-40 h-28 shrink-0 flex items-center justify-center opacity-90 sm:opacity-100">
            <svg viewBox="0 0 160 120" className="w-full h-full text-emerald-600 fill-current drop-shadow-xs">
              <path d="M 20,40 Q 40,20 80,25 Q 120,30 140,60 Q 150,90 110,105 Q 70,115 30,95 Q 10,70 20,40 Z" fill="#86EFAC" opacity="0.6" />
              <path d="M 40,35 Q 70,15 105,25 Q 130,45 125,75 Q 100,105 60,90 Q 25,80 40,35 Z" fill="#4ADE80" opacity="0.8" />
              <circle cx="75" cy="55" r="5" fill="#15803D" />
              <circle cx="75" cy="55" r="10" fill="none" stroke="#15803D" strokeWidth="1.5" className="animate-ping" />
              <path d="M 75,50 L 75,35" stroke="#15803D" strokeWidth="2" strokeDasharray="2,2" />
              <rect x="55" y="20" width="40" height="15" rx="3" fill="#002B49" />
              <text x="75" y="30" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">{policy.zone?.toUpperCase() || 'ZONE B'}</text>
            </svg>
          </div>
        </div>

      </div>

    </div>
  );
};


