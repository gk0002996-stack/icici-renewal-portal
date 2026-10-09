import React, { useState } from 'react';
import { Clock, ShieldCheck, ChevronDown, ChevronUp, Sparkles, CheckCircle2 } from 'lucide-react';

interface WaitingPeriodItem {
  id: string;
  title: string;
  standardYears: number;
  description: string;
  reductionDetail: string;
}

export const WaitingPeriodsSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedReduction, setSelectedReduction] = useState<Record<string, string>>({
    'ped': 'standard',
    'specific': 'standard',
    'maternity': 'standard'
  });

  const waitingPeriods: WaitingPeriodItem[] = [
    {
      id: 'ped',
      title: 'Pre-Existing Disease Waiting Period',
      standardYears: 3,
      description: 'The waiting period is 3 years. If additional cover is chosen, it can be reduced to 2 years or 1 year.',
      reductionDetail: 'Covers conditions declared at inception after 3 continuous renewal years, or 1-2 years with PED Reduction Add-on.'
    },
    {
      id: 'specific',
      title: 'Specific Disease',
      standardYears: 2,
      description: 'The waiting period is 2 years. However, with additional cover, it can be reduced to 1 year if chosen.',
      reductionDetail: 'Covers specified medical conditions (e.g. cataract, hernia, joint replacement) after 2 policy years, reducible to 1 year.'
    },
    {
      id: 'maternity',
      title: 'Maternity',
      standardYears: 2,
      description: 'The waiting period is 2 years. However, with additional cover, it can be reduced to 1 year if chosen.',
      reductionDetail: 'Covers normal and c-section delivery expenses along with newborn vaccination after 2 continuous years.'
    }
  ];

  return (
    <div id="waiting-periods-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 font-sans">
      
      {/* Header */}
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#EA580C]">Policy Terms</div>
          <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">Waiting Periods</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard regulatory waiting periods applicable under your health insurance coverage
          </p>
        </div>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Continuous Renewal Advantage</span>
        </span>
      </div>

      {/* List of Waiting Periods */}
      <div className="space-y-3.5">
        {waitingPeriods.map((wp) => (
          <div
            key={wp.id}
            className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-100 text-[#EA580C] font-bold text-xs flex items-center justify-center shrink-0">
                  {wp.standardYears}y
                </span>
                <h4 className="font-extrabold text-sm text-slate-900">{wp.title}</h4>
              </div>

              <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md self-start sm:self-auto">
                Standard: {wp.standardYears} Year{wp.standardYears > 1 ? 's' : ''}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              {wp.description}
            </p>

            {isExpanded && (
              <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{wp.reductionDetail}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* View more / View less toggle */}
      <div className="pt-1 flex items-center justify-between border-t border-slate-100">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-bold text-[#EA580C] hover:text-[#d84d00] flex items-center gap-1 cursor-pointer"
        >
          <span>{isExpanded ? 'View less' : 'View more'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <span className="text-[11px] text-slate-400 font-medium">
          Note: Existing continuous coverage tenure is fully ported upon renewal.
        </span>
      </div>

    </div>
  );
};
