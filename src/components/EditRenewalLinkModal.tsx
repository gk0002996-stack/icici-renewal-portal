import React, { useState, useEffect } from 'react';
import { 
  X, 
  Edit3, 
  Link as LinkIcon, 
  Check, 
  Copy, 
  Clock, 
  Send, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw, 
  MessageSquare, 
  Mail, 
  Phone, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  Zap,
  ArrowRight,
  User,
  CreditCard,
  Plus,
  Trash2,
  Award,
  Heart,
  Activity,
  RotateCcw,
  MapPin,
  Layers,
  ChevronRight
} from 'lucide-react';
import { RenewalLinkRecord, CustomerPolicy, PolicyBenefit } from '../types/insurance';
import { editRenewalLink, recordRenewalLinkResent } from '../services/storageService';
import { apiSendCustomerEmail } from '../services/apiService';
import { INITIAL_BENEFITS } from '../data/initialData';
import { formatDisplayDateTime } from '../utils/dateUtils';
import { buildPublicRenewalLink } from '../utils/urlUtils';

export interface EditRenewalLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: RenewalLinkRecord | null;
  customer?: CustomerPolicy | null;
  onSaveSuccess?: (updatedLink: RenewalLinkRecord, updatedCustomer?: CustomerPolicy) => void;
  onOpenFullShare?: (policy: CustomerPolicy, token?: string) => void;
  onOpenFullPolicyEdit?: (customer: CustomerPolicy) => void;
}

const BENEFIT_PRESETS = [
  {
    title: 'AYUSH Hospitalization Cover',
    highlight: '100% Cashless',
    description: 'In-patient treatments taken under Ayurveda, Yoga, Unani, Siddha and Homeopathy.',
    details: 'Covers up to 100% of Sum Insured for recognized institutional AYUSH therapy.',
    iconName: 'Heart'
  },
  {
    title: 'Emergency Road & Air Ambulance',
    highlight: 'Up to ₹2,50,000',
    description: 'Direct tie-up for emergency air & road ambulance transfers.',
    details: 'Covers domestic air transfer within India when certified necessary.',
    iconName: 'Activity'
  },
  {
    title: 'Modern & Robotic Treatments',
    highlight: 'Zero Sub-limit',
    description: 'Covers robotic surgery, stem cell therapy, deep brain stimulation.',
    details: 'Included up to total Sum Insured with no co-pay deductions.',
    iconName: 'Zap'
  },
  {
    title: 'Pre & Post Hospitalization (60 / 180 Days)',
    highlight: 'Extended Period',
    description: 'Reimbursement of consultations, diagnostics, medication before & after admission.',
    details: '60 days before hospital admission and 180 days post-discharge.',
    iconName: 'Sparkles'
  },
  {
    title: 'Annual Comprehensive Health Checkup',
    highlight: 'All Insured Members',
    description: 'Complimentary annual health wellness package comprising 60+ vital tests.',
    details: 'Available once every policy year from Day 1 cashless at partner diagnostic centers.',
    iconName: 'Award'
  },
  {
    title: 'Organ Donor In-Patient Expenses',
    highlight: 'Full Cover',
    description: 'Covers medical expenses incurred by an organ donor during harvesting.',
    details: 'Operative in-patient hospitalization costs covered up to sum insured.',
    iconName: 'ShieldCheck'
  },
  {
    title: 'Bariatric Weight Management Surgery',
    highlight: 'Metabolic Cover',
    description: 'Hospitalization expenses for surgical treatment of severe morbid obesity.',
    details: 'Covers approved metabolic surgery after 2-year waiting period.',
    iconName: 'CheckCircle2'
  },
  {
    title: 'Mental Healthcare & Psychiatry Cover',
    highlight: 'Full Parity',
    description: 'In-patient care and specialized therapies for recognized mental illnesses.',
    details: 'Coverage provided as per Mental Healthcare Act 2017 with no room rent capping.',
    iconName: 'Heart'
  }
];

export const EditRenewalLinkModal: React.FC<EditRenewalLinkModalProps> = ({
  isOpen,
  onClose,
  link,
  customer,
  onSaveSuccess,
  onOpenFullShare,
  onOpenFullPolicyEdit
}) => {
  if (!isOpen || !link) return null;

  // Active view tab
  const [activeTab, setActiveTab] = useState<'benefits_zone' | 'link_settings'>('benefits_zone');

  // Policy-level states (Zone, Benefits, SI, Premium)
  const [zone, setZone] = useState<'Zone A' | 'Zone B' | 'Zone C' | 'Zone D'>(
    (customer?.zone as any) || 'Zone B'
  );
  const [zoneNotice, setZoneNotice] = useState<string>(
    customer?.zoneNotice || `You're in ${customer?.zone || 'Zone B'}. Nice! You're getting a premium discount due to zone-based pricing.`
  );
  const [policyName, setPolicyName] = useState<string>(
    customer?.policyName || 'Health Advantedge – ICICI Lombard Plus'
  );
  const [baseSumInsured, setBaseSumInsured] = useState<number>(
    customer?.baseSumInsured || customer?.sumInsured || 1000000
  );
  const [baseAnnualPremium, setBaseAnnualPremium] = useState<number>(
    customer?.baseAnnualPremium || 28491
  );
  const [benefits, setBenefits] = useState<PolicyBenefit[]>(() => {
    if (customer?.benefits && customer.benefits.length > 0) {
      return JSON.parse(JSON.stringify(customer.benefits));
    }
    return JSON.parse(JSON.stringify(INITIAL_BENEFITS));
  });

  // Benefit creation form states
  const [showAddBenefitForm, setShowAddBenefitForm] = useState<boolean>(false);
  const [newBenefitTitle, setNewBenefitTitle] = useState<string>('');
  const [newBenefitHighlight, setNewBenefitHighlight] = useState<string>('');
  const [newBenefitDesc, setNewBenefitDesc] = useState<string>('');
  const [newBenefitDetails, setNewBenefitDetails] = useState<string>('');

  // Link parameter states
  const [validityHours, setValidityHours] = useState<number>(link.validityHours || 24);
  const [customDiscountAmount, setCustomDiscountAmount] = useState<number>(
    customer?.adminCustomDiscountAmount || link.customDiscountAmount || 0
  );
  const [selectedTenure, setSelectedTenure] = useState<number>(
    customer?.selectedTenure || link.selectedTenure || 1
  );
  const [paymentStatus, setPaymentStatus] = useState<RenewalLinkRecord['paymentStatus']>(
    link.paymentStatus || 'Not Started'
  );
  const [customerName, setCustomerName] = useState<string>(
    customer?.customerName || link.customerName || ''
  );
  const [customerMobile, setCustomerMobile] = useState<string>(
    customer?.mobileNumber || customer?.mobile || link.customerMobile || ''
  );
  const [customerEmail, setCustomerEmail] = useState<string>(
    customer?.email || link.customerEmail || ''
  );
  const [customNotes, setCustomNotes] = useState<string>(
    link.customNotes || ''
  );
  const [reactivate, setReactivate] = useState<boolean>(true);

  // Interaction / feedback states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedMessage, setCopiedMessage] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);

  // Sync state when link/customer changes
  useEffect(() => {
    if (link) {
      setValidityHours(link.validityHours || 24);
      setPaymentStatus(link.paymentStatus || 'Not Started');
      setCustomNotes(link.customNotes || '');
      setReactivate(true);
      setSaveToast(null);
      setEmailSuccessMsg(null);
    }
    if (customer) {
      setCustomerName(customer.customerName || link?.customerName || '');
      setCustomerMobile(customer.mobileNumber || customer.mobile || link?.customerMobile || '');
      setCustomerEmail(customer.email || link?.customerEmail || '');
      setCustomDiscountAmount(customer.adminCustomDiscountAmount || link?.customDiscountAmount || 0);
      setSelectedTenure(customer.selectedTenure || link?.selectedTenure || 1);
      setZone((customer.zone as any) || 'Zone B');
      setZoneNotice(customer.zoneNotice || `You're in ${customer.zone || 'Zone B'}. Nice! You're getting a premium discount due to zone-based pricing.`);
      setPolicyName(customer.policyName || 'Health Advantedge – ICICI Lombard Plus');
      setBaseSumInsured(customer.baseSumInsured || customer.sumInsured || 1000000);
      setBaseAnnualPremium(customer.baseAnnualPremium || 28491);
      if (customer.benefits && customer.benefits.length > 0) {
        setBenefits(JSON.parse(JSON.stringify(customer.benefits)));
      } else {
        setBenefits(JSON.parse(JSON.stringify(INITIAL_BENEFITS)));
      }
    }
  }, [link, customer]);

  // Computed fields
  const linkUrl = buildPublicRenewalLink(link.token, link.policyNumber, selectedTenure, Number(customDiscountAmount) || 0);
  const baseAnnual = Number(baseAnnualPremium) || customer?.baseAnnualPremium || 28491;
  
  // Multi-year base premium calculations
  let baseForTenure = baseAnnual;
  if (selectedTenure === 2) {
    baseForTenure = Math.round(baseAnnual * 1.9);
  } else if (selectedTenure === 3) {
    baseForTenure = Math.round(baseAnnual * 2.75);
  }

  const discountVal = Math.max(0, Number(customDiscountAmount) || 0);
  const finalPayable = Math.max(0, baseForTenure - discountVal);

  // Expiry preview
  const newExpiryDate = new Date(Date.now() + validityHours * 3600 * 1000);
  const newExpiryFormatted = formatDisplayDateTime(newExpiryDate.toISOString()).dateTime;

  // Formatted customer message
  const generatedMessage = 
`*ICICI Lombard Health Insurance Renewal Notice*

Dear ${customerName || 'Valued Customer'},

We have updated your health insurance renewal offer for Policy #${link.policyNumber}:
• Plan: ${policyName}
• Sum Insured: ₹${(Number(baseSumInsured) || 1000000).toLocaleString('en-IN')}
• Pricing Zone: ${zone}
• Covered In-Patient Benefits: ${benefits.length} Included
• Selected Tenure: ${selectedTenure} Year(s)
${discountVal > 0 ? `• Special Discount Applied: -₹${discountVal.toLocaleString('en-IN')}\n` : ''}• Final Renewal Premium: ₹${finalPayable.toLocaleString('en-IN')}

Access and approve your customized renewal now:
👉 ${linkUrl}

Valid until: ${newExpiryFormatted}

Need assistance? Reply to this message directly.
ICICI Lombard General Insurance Co. Ltd.`;

  // Benefit handlers
  const handleAddCustomBenefit = () => {
    if (!newBenefitTitle.trim()) return;
    const item: PolicyBenefit = {
      id: `ben-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: newBenefitTitle.trim(),
      highlight: newBenefitHighlight.trim() || undefined,
      description: newBenefitDesc.trim() || newBenefitTitle.trim(),
      details: newBenefitDetails.trim() || 'Comprehensive in-patient cover under ICICI Lombard terms.',
      iconName: 'ShieldCheck'
    };
    setBenefits(prev => [item, ...prev]);
    setNewBenefitTitle('');
    setNewBenefitHighlight('');
    setNewBenefitDesc('');
    setNewBenefitDetails('');
    setShowAddBenefitForm(false);
  };

  const handleRemoveBenefit = (id: string) => {
    setBenefits(prev => prev.filter(b => b.id !== id));
  };

  const handleAddPresetBenefit = (preset: typeof BENEFIT_PRESETS[0]) => {
    const item: PolicyBenefit = {
      id: `ben-tpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: preset.title,
      highlight: preset.highlight,
      description: preset.description,
      details: preset.details,
      iconName: preset.iconName
    };
    setBenefits(prev => [...prev, item]);
  };

  const handleRestoreDefaultBenefits = () => {
    setBenefits(JSON.parse(JSON.stringify(INITIAL_BENEFITS)));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(linkUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopiedMessage(true);
    recordRenewalLinkResent(link.token, 'copy');
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const handleSave = async (andResendMethod?: 'whatsapp' | 'email' | 'sms'): Promise<boolean> => {
    setIsSaving(true);
    setSaveToast(null);
    try {
      const res = await editRenewalLink({
        token: link.token,
        policyNumber: link.policyNumber,
        validityHours,
        reactivate,
        paymentStatus,
        customDiscountAmount: discountVal,
        selectedTenure,
        customerMobile: customerMobile.trim(),
        customerEmail: customerEmail.trim(),
        customerName: customerName.trim(),
        customNotes: customNotes.trim(),
        zone,
        zoneNotice: zoneNotice.trim() || `You're in ${zone}. Nice! You're getting a premium discount due to zone-based pricing.`,
        benefits,
        baseSumInsured: Number(baseSumInsured) || 1000000,
        baseAnnualPremium: Number(baseAnnualPremium) || 28491,
        policyName: policyName.trim()
      });

      if (res && res.success && res.link) {
        setSaveToast('Policy and renewal link changes saved successfully! Updates are live.');
        if (onSaveSuccess) {
          onSaveSuccess(res.link, res.customer);
        }

        if (andResendMethod === 'whatsapp') {
          handleSendWhatsApp();
        } else if (andResendMethod === 'email') {
          await handleSendEmail();
        } else if (andResendMethod === 'sms') {
          handleSendSms();
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to save policy updates:', err);
      setSaveToast('Failed to save changes. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendWhatsApp = () => {
    const rawMob = (customerMobile || '').replace(/\D/g, '');
    const mob = rawMob.length === 10 ? `91${rawMob}` : rawMob;
    const waUrl = `https://wa.me/${mob}?text=${encodeURIComponent(generatedMessage)}`;
    window.open(waUrl, '_blank');
    recordRenewalLinkResent(link.token, 'whatsapp');
  };

  const handleSendEmail = async () => {
    if (!customerEmail) {
      alert('Customer email address is empty. Please enter an email first.');
      return;
    }
    setIsSendingEmail(true);
    setEmailSuccessMsg(null);
    try {
      const subject = `ICICI Lombard Policy Renewal Offer - Policy #${link.policyNumber}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #00264A; padding: 24px; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 800;">ICICI Lombard General Insurance</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #cbd5e1;">Health Advantedge Renewal Proposal</p>
          </div>
          <div style="padding: 24px;">
            <p>Dear <strong>${customerName || 'Valued Customer'}</strong>,</p>
            <p>Your health insurance policy renewal proposal has been updated with full coverage details:</p>
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0; margin: 16px 0;">
              <table style="width: 100%; font-size: 13px;">
                <tr><td style="color: #64748b; padding: 4px 0;">Policy Number:</td><td style="font-weight: bold; text-align: right;">${link.policyNumber}</td></tr>
                <tr><td style="color: #64748b; padding: 4px 0;">Plan:</td><td style="font-weight: bold; text-align: right;">${policyName}</td></tr>
                <tr><td style="color: #64748b; padding: 4px 0;">Pricing Zone:</td><td style="font-weight: bold; color: #2563eb; text-align: right;">${zone}</td></tr>
                <tr><td style="color: #64748b; padding: 4px 0;">Covered Benefits:</td><td style="font-weight: bold; color: #059669; text-align: right;">${benefits.length} Benefits Included</td></tr>
                <tr><td style="color: #64748b; padding: 4px 0;">Sum Insured:</td><td style="font-weight: bold; text-align: right;">₹${(Number(baseSumInsured) || 1000000).toLocaleString('en-IN')}</td></tr>
                <tr><td style="color: #64748b; padding: 4px 0;">Tenure:</td><td style="font-weight: bold; text-align: right;">${selectedTenure} Year(s)</td></tr>
                ${discountVal > 0 ? `<tr><td style="color: #059669; padding: 4px 0;">Special Discount:</td><td style="font-weight: bold; color: #059669; text-align: right;">-₹${discountVal.toLocaleString('en-IN')}</td></tr>` : ''}
                <tr style="border-top: 1px solid #cbd5e1;"><td style="color: #00264A; font-weight: bold; padding: 8px 0 0 0; font-size: 15px;">Final Payable:</td><td style="font-weight: 800; color: #ea580c; text-align: right; padding: 8px 0 0 0; font-size: 16px;">₹${finalPayable.toLocaleString('en-IN')}</td></tr>
              </table>
            </div>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${linkUrl}" style="background-color: #ea580c; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                Review Policy & Complete Renewal →
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b; text-align: center;">This renewal link is active until <strong>${newExpiryFormatted}</strong>.</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            ICICI Lombard General Insurance Company Limited. IRDAI Reg No. 115.
          </div>
        </div>
      `;

      await apiSendCustomerEmail({
        policyNumber: link.policyNumber,
        customerName: customerName || 'Valued Customer',
        customerEmail: customerEmail,
        recipientEmail: customerEmail,
        subject,
        htmlBody: emailHtml,
        renewalToken: link.token,
        linkUrl
      });

      recordRenewalLinkResent(link.token, 'email');
      setEmailSuccessMsg(`Email dispatched successfully to ${customerEmail}!`);
      setTimeout(() => setEmailSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(`Failed to send email: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendSms = () => {
    const rawMob = (customerMobile || '').replace(/\D/g, '');
    const mob = rawMob.length === 10 ? `+91${rawMob}` : rawMob;
    const smsUrl = `sms:${mob}?body=${encodeURIComponent(generatedMessage)}`;
    window.open(smsUrl, '_blank');
    recordRenewalLinkResent(link.token, 'sms');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden font-sans my-auto flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="bg-[#00264A] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EA580C] text-white flex items-center justify-center font-extrabold shadow-sm">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Edit Policy & Renewal Link
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {zone}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {benefits.length} Benefits
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium">
                Policy #{link.policyNumber} • Customer: {customerName || 'Customer'} • Token: <span className="font-mono text-amber-400">{link.token}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenFullPolicyEdit && customer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullPolicyEdit(customer);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-colors cursor-pointer shadow-xs"
                title="Edit full policy including members, KYC, and nominee details"
              >
                <span>Full Member & KYC Editor</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('benefits_zone')}
              className={`py-3 px-3.5 font-extrabold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'benefits_zone'
                  ? 'border-[#EA580C] text-[#EA580C] bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Zone & Benefits Schedule</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'benefits_zone' ? 'bg-[#EA580C] text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {benefits.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('link_settings')}
              className={`py-3 px-3.5 font-extrabold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'link_settings'
                  ? 'border-[#EA580C] text-[#EA580C] bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Link Expiry & Discounts</span>
            </button>
          </div>

          <div className="text-right py-2 text-xs">
            <span className="text-[11px] text-slate-500">Payable: </span>
            <strong className="text-[#EA580C] font-black text-sm">₹{finalPayable.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-5 text-xs font-semibold">
          
          {/* TAB 1: ZONE & BENEFITS SCHEDULE */}
          {activeTab === 'benefits_zone' && (
            <div className="space-y-5">
              
              {/* SECTION: BASIC POLICY PLAN & SUM INSURED */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#EA580C]" />
                    <span>Plan Name, Coverage & Base Sum Insured</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Policy #{link.policyNumber}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="md:col-span-1">
                    <label className="block text-slate-700 font-bold mb-1">Policy Plan Name *</label>
                    <input
                      type="text"
                      value={policyName}
                      onChange={(e) => setPolicyName(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-[#EA580C] outline-none"
                      placeholder="Policy Name"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Base Sum Insured (₹) *</label>
                    <input
                      type="number"
                      step="50000"
                      value={baseSumInsured}
                      onChange={(e) => setBaseSumInsured(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-[#EA580C] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Base Annual Premium (₹) *</label>
                    <input
                      type="number"
                      step="100"
                      value={baseAnnualPremium}
                      onChange={(e) => setBaseAnnualPremium(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-[#EA580C] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: PRICING ZONE & NOTICE */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>Pricing Zone & Zone Notification</span>
                  </h4>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Current: {zone}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Pricing Zone *</label>
                    <select
                      value={zone}
                      onChange={(e) => {
                        const newZ = e.target.value as any;
                        setZone(newZ);
                        setZoneNotice(`You're in ${newZ}. Nice! You're getting a premium discount due to zone-based pricing.`);
                      }}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-[#EA580C] outline-none"
                    >
                      <option value="Zone A">Zone A (Tier 1 Metros - Mumbai, Delhi NCR, Bangalore)</option>
                      <option value="Zone B">Zone B (Tier 2 Metros - Hyderabad, Pune, Kolkata, Ahmedabad)</option>
                      <option value="Zone C">Zone C (State Capitals & Major Cities)</option>
                      <option value="Zone D">Zone D (Rest of India)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">Zone Notice Banner (Displayed to Customer)</label>
                    <input
                      type="text"
                      value={zoneNotice}
                      onChange={(e) => setZoneNotice(e.target.value)}
                      placeholder="You're in Zone B. Nice! You're getting a premium discount..."
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-[#EA580C] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: POLICY BENEFITS & IN-PATIENT COVERAGES */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2.5 gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                      Policy In-Patient Benefits Schedule
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                      {benefits.length} Active
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddBenefitForm(!showAddBenefitForm)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs cursor-pointer flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showAddBenefitForm ? 'Close Add Form' : '+ Add Custom Benefit'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRestoreDefaultBenefits}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer flex items-center gap-1 transition-colors"
                      title="Restore the standard 15 ICICI Lombard policy benefits"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Restore Defaults</span>
                    </button>
                  </div>
                </div>

                {/* Quick Add Presets Bar */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                    Quick-Add Standard Insurance Coverages:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {BENEFIT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddPresetBenefit(preset)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-slate-700 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1"
                        title={preset.description}
                      >
                        <Plus className="w-3 h-3 text-emerald-600" />
                        <span>{preset.title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Benefit Form */}
                {showAddBenefitForm && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-300 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-900 text-xs flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Create New Policy Benefit</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddBenefitForm(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] text-slate-700 font-bold mb-1">Benefit Title *</label>
                        <input
                          type="text"
                          value={newBenefitTitle}
                          onChange={(e) => setNewBenefitTitle(e.target.value)}
                          placeholder="e.g. Modern Robotic Treatments"
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 font-bold text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-700 font-bold mb-1">Highlight Tag (Optional)</label>
                        <input
                          type="text"
                          value={newBenefitHighlight}
                          onChange={(e) => setNewBenefitHighlight(e.target.value)}
                          placeholder="e.g. 100% Cashless / Zero Sub-limit"
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 font-bold text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-700 font-bold mb-1">Short Description</label>
                        <input
                          type="text"
                          value={newBenefitDesc}
                          onChange={(e) => setNewBenefitDesc(e.target.value)}
                          placeholder="Brief summary of coverage"
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-700 font-bold mb-1">Coverage Details</label>
                        <input
                          type="text"
                          value={newBenefitDetails}
                          onChange={(e) => setNewBenefitDetails(e.target.value)}
                          placeholder="Detailed terms or limits"
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddBenefitForm(false)}
                        className="px-3 py-1 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCustomBenefit}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Add Benefit to Policy</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Current Benefits List with Remove Actions */}
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {benefits.length === 0 ? (
                    <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-2">
                      <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
                      <p className="font-bold text-slate-700 text-xs">No benefits in this policy schedule.</p>
                      <button
                        type="button"
                        onClick={handleRestoreDefaultBenefits}
                        className="px-3 py-1 rounded bg-[#EA580C] text-white font-bold text-xs cursor-pointer"
                      >
                        Restore Standard 15 Benefits
                      </button>
                    </div>
                  ) : (
                    benefits.map((b, index) => (
                      <div
                        key={b.id || index}
                        className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">
                                {b.title}
                              </span>
                              {b.highlight && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                                  {b.highlight}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-1">{b.description}</p>
                            {b.details && (
                              <p className="text-[10px] text-slate-400 font-normal line-clamp-1">{b.details}</p>
                            )}
                          </div>
                        </div>

                        {/* Remove Action Button */}
                        <div className="shrink-0 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveBenefit(b.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold text-[11px] cursor-pointer flex items-center gap-1 transition-all border border-red-200 hover:border-red-600"
                            title="Remove this benefit from the policy"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: LINK EXPIRY, DISCOUNTS & DELIVERY */}
          {activeTab === 'link_settings' && (
            <div className="space-y-5">
              
              {/* SECTION: VALIDITY & EXPIRY */}
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Link Validity (Hours from Now)</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="reactivateToggle"
                      checked={reactivate}
                      onChange={(e) => setReactivate(e.target.checked)}
                      className="w-3.5 h-3.5 text-[#EA580C] rounded border-slate-300 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="reactivateToggle" className="text-[11px] font-bold text-slate-700 cursor-pointer">
                      Set Status to Active
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { label: '12 Hours', value: 12 },
                    { label: '24 Hours', value: 24 },
                    { label: '48 Hours', value: 48 },
                    { label: '72 Hours', value: 72 },
                    { label: '7 Days', value: 168 }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValidityHours(opt.value)}
                      className={`py-1.5 px-2 rounded-lg font-bold text-xs border text-center transition-all cursor-pointer ${
                        validityHours === opt.value
                          ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 font-mono">
                  <span>Calculated Expiry: <strong className="text-slate-800">{newExpiryFormatted}</strong></span>
                  <span>Current Link Status: <strong className={link.isExpired || link.isRevoked ? 'text-amber-600' : 'text-emerald-600'}>{link.status || (link.isExpired ? 'Expired' : 'Active')}</strong></span>
                </div>
              </div>

              {/* SECTION: DISCOUNT & TENURE OPTIONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Special Discount */}
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 space-y-2">
                  <label className="font-extrabold text-slate-800 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#EA580C]" />
                      <span>Special Admin Discount (₹)</span>
                    </span>
                    {discountVal > 0 && (
                      <span className="text-[10px] text-emerald-700 font-bold">Active</span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={customDiscountAmount || ''}
                      onChange={(e) => setCustomDiscountAmount(Number(e.target.value))}
                      placeholder="Enter discount amount (e.g. 1500)"
                      className="w-full pl-7 pr-3 py-2 bg-white rounded-lg border border-slate-300 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-[#EA580C] focus:border-transparent outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Applied directly to renewal offer. Subtracted from customer payable premium.
                  </p>
                </div>

                {/* Policy Tenure */}
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 space-y-2">
                  <label className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    <span>Selected Policy Tenure</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTenure(t)}
                        className={`py-2 px-1 rounded-lg font-bold text-xs border text-center transition-all cursor-pointer ${
                          selectedTenure === t
                            ? 'bg-blue-700 border-blue-800 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {t} Year{t > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-600 flex justify-between font-mono">
                    <span>Base: ₹{baseForTenure.toLocaleString('en-IN')}</span>
                    <span className="font-bold text-emerald-700">Net: ₹{finalPayable.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* SECTION: RECIPIENT CONTACT INFO */}
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 space-y-3">
                <label className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  <span>Recipient & Delivery Contact Details</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Customer Full Name</span>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer Name"
                      className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 font-bold text-slate-900 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Mobile (for WhatsApp / SMS)</span>
                    <input
                      type="text"
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 font-bold text-slate-900 text-xs outline-none font-mono"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Email Address (for Proposal)</span>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 font-bold text-slate-900 text-xs outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: PAYMENT STATUS & INTERNAL NOTES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 space-y-2">
                  <label className="font-extrabold text-slate-800 text-xs block">Payment State Override</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-bold text-slate-900 text-xs outline-none"
                  >
                    <option value="Not Started">Not Started (Link Pending)</option>
                    <option value="In Progress">In Progress (Customer Opened Link)</option>
                    <option value="Completed">Completed (Payment Received)</option>
                    <option value="Failed">Failed (Transaction Dropped)</option>
                  </select>
                </div>

                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 space-y-2">
                  <label className="font-extrabold text-slate-800 text-xs block">Internal Notes</label>
                  <input
                    type="text"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="e.g. Approved 5% special discount on call"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 text-xs outline-none"
                  />
                </div>
              </div>

              {/* SECTION: IMMEDIATE RESEND ACTIONS */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-extrabold text-[#00264A] text-xs flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-[#EA580C]" />
                    <span>Save & Dispatch Across Direct Channels</span>
                  </h5>
                  <span className="text-[10px] text-slate-500 font-medium">Saves updates and dispatches</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSave('whatsapp')}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Save & Open WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSaving || isSendingEmail}
                    onClick={() => handleSave('email')}
                    className="py-2.5 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs shadow-sm cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSendingEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    <span>Save & Send Email</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSave('sms')}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs shadow-sm cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Save & Send SMS</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-orange-200/60">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied Link!' : 'Copy Renewal Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMessage ? 'Copied Full Text!' : 'Copy Formatted Text'}</span>
                  </button>
                </div>

                {emailSuccessMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{emailSuccessMsg}</span>
                  </div>
                )}
              </div>

            </div>
          )}

          {saveToast && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveToast}</span>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">
              Token: <strong className="font-mono text-slate-800">{link.token}</strong>
            </span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              Zone: {zone}
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
              {benefits.length} Benefits
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 cursor-pointer transition-colors"
            >
              Close
            </button>

            {onOpenFullPolicyEdit && customer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullPolicyEdit(customer);
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs border border-purple-300 cursor-pointer transition-colors"
              >
                Edit Members & KYC
              </button>
            )}

            {onOpenFullShare && customer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullShare(customer, link.token);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer transition-colors"
              >
                Share Center
              </button>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave()}
              className="px-5 py-2 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving...' : 'Save All Policy Changes'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
