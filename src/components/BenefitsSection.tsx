import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Stethoscope, Sparkles, Plus } from 'lucide-react';
import { PolicyBenefit } from '../types/insurance';
import { INITIAL_BENEFITS } from '../data/initialData';
import { OpdTierKey, OPD_TIERS } from '../data/opdData';
import { OpdTierSelector } from './OpdTierSelector';

interface BenefitsSectionProps {
  benefits?: PolicyBenefit[];
  isOpdSelected?: boolean;
  onToggleOpd?: () => void;
  selectedOpdTier?: OpdTierKey;
  onSelectOpdTier?: (tier: OpdTierKey) => void;
  selectedTenure?: number;
}

export const BenefitsSection: React.FC<BenefitsSectionProps> = ({ 
  benefits,
  isOpdSelected = false,
  onToggleOpd,
  selectedOpdTier = '25k',
  onSelectOpdTier,
  selectedTenure = 1
}) => {
  const displayBenefits = Array.isArray(benefits) ? benefits : INITIAL_BENEFITS;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isOpdCardExpanded, setIsOpdCardExpanded] = useState<boolean>(true);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const currentOpdData = OPD_TIERS[selectedOpdTier];
  const currentOpdPrice = currentOpdData.tenurePrices[selectedTenure as 1 | 2 | 3] || currentOpdData.tenurePrices[1];

  return (
    <div id="policy-benefits-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 font-sans">
      
      {/* Section Header */}
      <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#EA580C]">Coverage Catalog</div>
          <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">Benefits & Riders covered</h3>
          <p className="text-xs text-slate-500 mt-0.5">Comprehensive in-patient, out-patient OPD, pre/post hospitalisation & emergency care</p>
        </div>
        <div className="flex items-center gap-2">
          {isOpdSelected && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50 text-[#EA580C] border border-orange-200">
              OPD ({currentOpdData.shortLabel}) Active
            </span>
          )}
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {displayBenefits.length} in-patient benefits
          </span>
        </div>
      </div>

      {/* FEATURED: OUTPATIENT CARE (OPD) RIDER */}
      <div className={`rounded-2xl border-2 transition-all overflow-hidden ${
        isOpdSelected 
          ? 'border-[#EA580C] bg-orange-50/20 shadow-xs' 
          : 'border-slate-300 bg-slate-50/50 hover:border-slate-400'
      }`}>
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            
            {/* Icon and Title */}
            <div className="flex items-start gap-3 flex-1">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                isOpdSelected ? 'bg-[#EA580C] text-white shadow-xs' : 'bg-slate-200 text-slate-700'
              }`}>
                <Stethoscope className="w-5 h-5" />
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-extrabold text-base text-slate-900">
                    Outpatient Care (OPD) Rider
                  </h4>
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                    Rider Add-on
                  </span>
                  {isOpdSelected && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      {currentOpdData.formattedLimit} Added
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Covers routine and specialist doctor consultations, diagnostic tests (pathology/radiology), pharmacy bills & physiotherapy without 24-hour hospitalisation.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-slate-900">
                    Premium: <strong className="text-[#EA580C]">₹{currentOpdPrice.toLocaleString('en-IN')}</strong>
                    <span className="text-[11px] text-slate-500 font-normal"> for {selectedTenure} Year{selectedTenure > 1 ? 's' : ''}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOpdCardExpanded(prev => !prev)}
                    className="text-xs font-bold text-[#EA580C] hover:underline inline-flex items-center gap-0.5 ml-2 cursor-pointer"
                  >
                    <span>{isOpdCardExpanded ? 'Hide Options' : 'View 3 Tier Options'}</span>
                    {isOpdCardExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Button */}
            {onToggleOpd && (
              <button
                type="button"
                onClick={onToggleOpd}
                className={`px-4 py-2.5 rounded-xl border text-xs shrink-0 transition-all cursor-pointer flex items-center gap-1.5 justify-center font-bold self-start ${
                  isOpdSelected
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 font-extrabold shadow-xs'
                    : 'bg-[#EA580C] hover:bg-[#D97706] text-white border-[#EA580C] font-extrabold shadow-xs'
                }`}
              >
                {isOpdSelected ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                    <span>✓ Added to Policy</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
                    <span>+ Add OPD to Policy</span>
                  </>
                )}
              </button>
            )}

          </div>

          {/* 3 OPD OPTIONS (25,000 OPD, 50k OPD, 1lac OPD) */}
          {isOpdCardExpanded && (
            <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Select OPD Tier ({currentOpdData.formattedLimit} currently selected):
                </span>
                {!isOpdSelected && onToggleOpd && (
                  <span className="text-[11px] text-[#EA580C] font-semibold">
                    Selecting a tier automatically adds OPD to your renewal quote
                  </span>
                )}
              </div>

              <OpdTierSelector
                selectedTier={selectedOpdTier}
                onSelectTier={(tier) => {
                  if (onSelectOpdTier) {
                    onSelectOpdTier(tier);
                  }
                  if (!isOpdSelected && onToggleOpd) {
                    onToggleOpd();
                  }
                }}
                selectedTenure={selectedTenure}
              />

              {/* Covered Benefits List */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 text-xs text-slate-700 space-y-1.5 mt-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#EA580C]" />
                  <span>Included with ICICI Lombard OPD Care Rider:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>General Physician & Super Specialist Consultations</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Diagnostics: Blood Panels, MRI, CT Scan, X-Rays, Ultrasound</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Prescribed Pharmacy & Regular Chronic Care Medicines</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Minor Outpatient Procedures & Routine Physiotherapy Sessions</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Regular Policy Benefits List */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Standard Policy In-Patient Hospitalisation Benefits
        </h4>

        {displayBenefits.map((benefit) => {
          const isExpanded = expandedId === benefit.id;

          return (
            <div 
              key={benefit.id}
              onClick={() => toggleExpand(benefit.id)}
              className={`rounded-xl border p-4 transition-all cursor-pointer ${
                isExpanded ? 'border-orange-300 bg-orange-50/20' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                
                {/* Green checkmark circle icon */}
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>

                {/* Title & Description */}
                <div className="flex-1 space-y-1">
                  <h4 className="font-bold text-sm text-slate-900">{benefit.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {benefit.description}
                  </p>

                  {/* Expandable Extra Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-700 bg-slate-50 p-3 rounded-lg leading-relaxed">
                      <strong>Clause Details:</strong> {benefit.details || 'Standard terms as specified in ICICI Lombard policy wordings apply.'}
                    </div>
                  )}
                </div>

                {/* Right chevron */}
                <div className="text-slate-400 shrink-0 mt-0.5">
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-[#EA580C]" /> : <ChevronDown className="w-5 h-5" />}
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Waiting period disclaimer notice */}
      <div className="bg-[#FFF8E7] rounded-xl p-4 border border-[#FDE68A] text-xs text-slate-800 space-y-1">
        <p className="leading-relaxed">
          Any applicable waiting period on your current sum insured will remain in effect as mentioned in your policy document. For any incremental sum insured, the full waiting period specified in the policy document will apply. OPD Rider claim reimbursements are available with instant digital submission.
        </p>
      </div>

    </div>
  );
};
