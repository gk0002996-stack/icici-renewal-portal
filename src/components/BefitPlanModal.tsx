import React from 'react';
import { X, Check, Stethoscope, Pill, Activity, ShieldCheck, Sparkles, Award } from 'lucide-react';
import { BefitPlanKey, BEFIT_PLANS, BEFIT_PLAN_KEYS } from '../data/befitData';

interface BefitPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: BefitPlanKey;
  onSelectPlan: (planKey: BefitPlanKey) => void;
  selectedTenure?: number;
  isBefitAdded: boolean;
  onToggleAddOn?: () => void;
}

export const BefitPlanModal: React.FC<BefitPlanModalProps> = ({
  isOpen,
  onClose,
  selectedPlan,
  onSelectPlan,
  selectedTenure = 1,
  isBefitAdded,
  onToggleAddOn
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#00264A] via-[#0A3D62] to-[#00264A] text-white p-5 sm:p-6 relative flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#EA580C] text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Cashless Outpatient Cover
                </span>
                <span className="bg-white/15 text-white/90 text-xs px-2 py-0.5 rounded font-medium">
                  Rider UIN: ICIHLIP21569V012021
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
                ICICI Lombard BeFit Rider — Compare Plans A to F
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl">
                Get seamless cashless coverage for routine doctor consultations, prescribed medicines, diagnostic blood/radiology tests, physiotherapy & wellness support.
              </p>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tenure indicator */}
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-300">
              Pricing shown for <strong className="text-white">{selectedTenure} Year{selectedTenure > 1 ? 's' : ''}</strong> Tenure
              {selectedTenure === 2 && ' (5% multi-year discount applied)'}
              {selectedTenure === 3 && ' (10% multi-year discount applied)'}
            </span>
            <div className="flex items-center gap-1.5 text-orange-200">
              <ShieldCheck className="w-4 h-4 text-[#EA580C]" />
              <span>10,000+ Partner Clinics & Cashless Pharmacies Across India</span>
            </div>
          </div>
        </div>

        {/* Modal Body - Scrollable Comparison Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {BEFIT_PLAN_KEYS.map((key) => {
              const plan = BEFIT_PLANS[key];
              const isCurrent = selectedPlan === key;
              const tenurePrice = plan.tenurePrices[selectedTenure as 1 | 2 | 3] || plan.tenurePrices[1];

              return (
                <div
                  key={key}
                  className={`bg-white rounded-xl border-2 transition-all p-4.5 flex flex-col justify-between shadow-xs relative ${
                    isCurrent
                      ? 'border-[#EA580C] ring-2 ring-orange-500/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        plan.recommended
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : isCurrent
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {plan.badge}
                    </span>
                    {isCurrent && (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Currently Selected
                      </span>
                    )}
                  </div>

                  {/* Plan Name & Title */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{plan.title}</h3>
                    <p className="text-xs text-slate-500 font-medium">{plan.subtitle}</p>

                    {/* Pricing */}
                    <div className="my-3 py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900">
                          ₹{tenurePrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-slate-500">
                          {selectedTenure === 1 ? '/year' : `for ${selectedTenure} yrs`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{plan.summary}</p>
                    </div>

                    {/* Inclusions Detail */}
                    <div className="space-y-2.5 text-xs text-slate-700 pt-1">
                      <div className="flex items-start gap-2">
                        <Stethoscope className="w-3.5 h-3.5 text-[#EA580C] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-900">Consultations: </span>
                          <span className="text-slate-600">{plan.consultations}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Pill className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-900">Medicines / Pharmacy: </span>
                          <span className="text-slate-600">{plan.pharmacy}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Activity className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-900">Diagnostics / Labs: </span>
                          <span className="text-slate-600">{plan.diagnostics}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-900">Physiotherapy: </span>
                          <span className="text-slate-600">{plan.physiotherapy}</span>
                        </div>
                      </div>

                      {/* Special Key Features */}
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                          Highlights & Inclusions:
                        </span>
                        <ul className="space-y-1">
                          {plan.specialBenefits.map((benefit, bIdx) => (
                            <li key={bIdx} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                              <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Selection Action Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPlan(key);
                        if (!isBefitAdded && onToggleAddOn) {
                          onToggleAddOn();
                        }
                        onClose();
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isCurrent
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          : 'bg-[#00264A] hover:bg-[#0A3D62] text-white'
                      }`}
                    >
                      {isCurrent ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Selected & Applied</span>
                        </>
                      ) : (
                        <>
                          <span>Choose {plan.title}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Note / Terms */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
            <Award className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">How to use your BeFit Benefits?</p>
              <p className="text-slate-700 mt-0.5">
                Download the <strong>IL TakeCare App</strong> with your registered mobile number to locate partner network clinics, order prescribed medicines for home delivery, book lab tests cashless, and consult specialists 24x7 without out-of-pocket expenses.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Selected: <strong className="text-slate-900">{BEFIT_PLANS[selectedPlan]?.title}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
