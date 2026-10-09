import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Sparkles, 
  CreditCard, 
  FileText, 
  Trash2, 
  Plus, 
  Users, 
  ShieldCheck, 
  HelpCircle,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Send
} from 'lucide-react';
import { CustomerPolicy, InsuredMember } from '../types/insurance';
import { INITIAL_ADDONS, INITIAL_BENEFITS } from '../data/initialData';
import { BEFIT_PLANS, BEFIT_PLAN_KEYS, BefitPlanKey, BEFIT_RIDER_ID } from '../data/befitData';
import { createCustomerPolicy, generateRenewalLink, generateSoftCopyLink } from '../services/storageService';
import { calculatePolicyPricing } from '../utils/premiumCalculation';

export interface CustomerCreationFormProps {
  onClose?: () => void;
  onSuccess: (createdCustomer: CustomerPolicy, linkToken: string, linkType: 'renewal' | 'softcopy', fullUrl: string) => void;
  isModal?: boolean;
  portalContext?: 'admin' | 'advisor';
  initialLinkType?: 'renewal' | 'softcopy';
}

export interface NewMemberState {
  id: string;
  name: string;
  relation: 'Self' | 'Spouse' | 'Son' | 'Daughter' | 'Father' | 'Mother' | 'Brother' | 'Sister' | 'Other';
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  age: number;
  weightKg: number;
  heightFeetInches: string;
  abhaNumber: string;
  coverageAmount: number;
  preExistingConditions: string[];
  preExistingDetails: string;
}

export const CustomerCreationForm: React.FC<CustomerCreationFormProps> = ({
  onClose,
  onSuccess,
  isModal = true,
  portalContext = 'advisor',
  initialLinkType = 'renewal'
}) => {
  const [linkType, setLinkType] = useState<'renewal' | 'softcopy'>(initialLinkType);
  const [validityHours, setValidityHours] = useState<number>(24);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Section 1: Basic Policy Details
  const [policyName, setPolicyName] = useState('Health Advantedge – ICICI Lombard Plus');
  const [policyNumber, setPolicyNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [policyStartDate, setPolicyStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [previousPolicyEndDate, setPreviousPolicyEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  // Section 2: Sum Insured & Zone
  const [baseSumInsured, setBaseSumInsured] = useState<number>(2500000);
  const [loyaltyBonus, setLoyaltyBonus] = useState<number>(0);
  const [zone, setZone] = useState<'Zone A' | 'Zone B' | 'Zone C' | 'Zone D'>('Zone B');

  // Section 3: Add-on Covers
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([
    'addon-opd',
    'addon-maternity',
    'addon-claim-protector'
  ]);
  const [selectedBefitPlan, setSelectedBefitPlan] = useState<BefitPlanKey>('Plan A');

  // Section 4: Insured Family Members
  const [members, setMembers] = useState<NewMemberState[]>([
    {
      id: `mem-${Date.now()}-1`,
      name: 'Goturi Mahendar Reddy',
      relation: 'Self',
      gender: 'Male',
      dob: '1990-08-15',
      age: 36,
      weightKg: 72,
      heightFeetInches: "5'9\"",
      abhaNumber: '',
      coverageAmount: 2500000,
      preExistingConditions: ['no'],
      preExistingDetails: ''
    }
  ]);

  // Section 5: Applicant Contact & KYC
  const [applicantName, setApplicantName] = useState('');
  const [kycStatus, setKycStatus] = useState<'Verified' | 'Pending Verification' | 'In Review'>('Verified');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [landline, setLandline] = useState('-');
  const [applicantDob, setApplicantDob] = useState('1990-08-15');
  const [address, setAddress] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [pincode, setPincode] = useState('500081');
  const [state, setState] = useState('Telangana');
  const [pepStatus, setPepStatus] = useState('No');

  // Section 6: Nominee Information
  const [nomineeName, setNomineeName] = useState('Goturi Sujatha');
  const [nomineeRelation, setNomineeRelation] = useState('Mother');
  const [nomineeDob, setNomineeDob] = useState('1968-05-12');
  const [nomineeAge, setNomineeAge] = useState<number>(58);

  // Section 7: Premium Configuration & Multi-Year Discounts
  const [baseAnnualPremium, setBaseAnnualPremium] = useState<number>(28491);
  const [adminCustomDiscountAmount, setAdminCustomDiscountAmount] = useState<number>(0);
  const [selectedTenure, setSelectedTenure] = useState<number>(1);
  const [tenure1Original, setTenure1Original] = useState<number>(37852);
  const [tenure1DiscountPct, setTenure1DiscountPct] = useState<number>(10);
  const [tenure2Original, setTenure2Original] = useState<number>(71920);
  const [tenure2DiscountPct, setTenure2DiscountPct] = useState<number>(25);
  const [tenure3Original, setTenure3Original] = useState<number>(104094);
  const [tenure3DiscountPct, setTenure3DiscountPct] = useState<number>(35);

  // Section 8: Cashback Offer Configuration
  const [cashbackEnabled, setCashbackEnabled] = useState(true);
  const [cashbackMethod, setCashbackMethod] = useState('Any Bank Credit Card');
  const [cashbackType, setCashbackType] = useState<'percentage' | 'fixed'>('percentage');
  const [cashbackValue, setCashbackValue] = useState<number>(10);

  // Auto-generate random ICICI Lombard policy number
  const handleAutoGeneratePolicyNo = () => {
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
    setPolicyNumber(`4128i/HSNR/${randomDigits}/04/000`);
  };

  // Load Elevate Health Insurance Product Template (Product Code 4225, UIN ICIHLIP25048V042425)
  const handleLoadElevatePreset = () => {
    setPolicyName('Elevate health insurance');
    setBaseSumInsured(1500000);
    setLoyaltyBonus(3600000);
    setSelectedTenure(3);
    setSelectedAddOnIds([
      'addon-claim-protector',
      'addon-room-modifier',
      'addon-power-booster',
      'addon-health-checkup'
    ]);
    setSelectedBefitPlan('Plan C');
    setBaseAnnualPremium(86682);
    setTenure1Original(119631);
    setTenure1DiscountPct(10);
    setTenure2Original(235136);
    setTenure2DiscountPct(13);
    setTenure3Original(323001);
    setTenure3DiscountPct(8.33);
    setZone('Zone A');
    setCity('Mumbai');
    setState('Maharashtra');
    setPincode('400054');
  };

  // Keep applicant name in sync with customer name if empty
  const handleCustomerNameChange = (val: string) => {
    setCustomerName(val);
    if (!applicantName || applicantName === customerName) {
      setApplicantName(val);
    }
    // Update first member name if relation is Self
    if (members.length > 0 && members[0].relation === 'Self') {
      const updated = [...members];
      updated[0].name = val;
      setMembers(updated);
    }
  };

  // Add Member Handlers
  const handleAddAdult = () => {
    const newMember: NewMemberState = {
      id: `mem-${Date.now()}-${Math.random()}`,
      name: '',
      relation: members.length === 0 ? 'Self' : 'Spouse',
      gender: members.length === 0 ? 'Male' : 'Female',
      dob: '1992-06-15',
      age: 34,
      weightKg: 65,
      heightFeetInches: "5'6\"",
      abhaNumber: '',
      coverageAmount: baseSumInsured + loyaltyBonus,
      preExistingConditions: ['no'],
      preExistingDetails: ''
    };
    setMembers(prev => [...prev, newMember]);
  };

  const handleAddKid = () => {
    const newKid: NewMemberState = {
      id: `mem-${Date.now()}-${Math.random()}`,
      name: '',
      relation: 'Son',
      gender: 'Male',
      dob: '2018-04-10',
      age: 8,
      weightKg: 28,
      heightFeetInches: "4'1\"",
      abhaNumber: '',
      coverageAmount: baseSumInsured + loyaltyBonus,
      preExistingConditions: ['no'],
      preExistingDetails: ''
    };
    setMembers(prev => [...prev, newKid]);
  };

  const handleRemoveMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const handleUpdateMember = (id: string, updates: Partial<NewMemberState>) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  // Add-on toggle handler
  const handleToggleAddOn = (addonId: string) => {
    setSelectedAddOnIds(prev => 
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    );
  };

  // Calculations for live preview
  const selectedAddOns = INITIAL_ADDONS.filter(a => selectedAddOnIds.includes(a.id));
  const addOnsTotal = selectedAddOns.reduce((sum, a) => {
    if (a.id === BEFIT_RIDER_ID) {
      return sum + (BEFIT_PLANS[selectedBefitPlan]?.pricePerYear || a.annualPremium);
    }
    return sum + a.annualPremium;
  }, 0);

  const pricing = calculatePolicyPricing({
    baseAnnualPremium,
    selectedAddOnIds,
    addOnRiders: INITIAL_ADDONS,
    tenure1DiscountPct,
    tenure2DiscountPct,
    tenure3DiscountPct,
    adminCustomDiscountAmount,
    manualGrossPrices: {
      1: tenure1Original,
      2: tenure2Original,
      3: tenure3Original
    }
  });

  const t1Orig = pricing.grossTenurePrices[1];
  const t1Disc = pricing.discounts[1];
  const t1Payable = pricing.tenurePrices[1];

  const t2Orig = pricing.grossTenurePrices[2];
  const t2Disc = pricing.discounts[2];
  const t2Payable = pricing.tenurePrices[2];

  const t3Orig = pricing.grossTenurePrices[3];
  const t3Disc = pricing.discounts[3];
  const t3Payable = pricing.tenurePrices[3];

  const cbVal = Number(cashbackValue) || 0;
  const cbAmt = cashbackEnabled 
    ? (cashbackType === 'percentage' ? Math.round(t1Payable * (cbVal / 100)) : cbVal)
    : 0;

  const totalSI = Number(baseSumInsured || 0) + Number(loyaltyBonus || 0);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert('Please enter the customer full name.');
      return;
    }

    if (!mobileNumber.trim()) {
      alert('Please enter the customer mobile number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const autoPolicyNo = policyNumber.trim() || `4128i/HSNR/${Math.floor(100000000 + Math.random() * 900000000)}/04/000`;

      const policyPayload: any = {
        customerName: customerName.trim(),
        policyNumber: autoPolicyNo,
        mobileNumber: mobileNumber.trim(),
        email: email.trim() || `${customerName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        policyName: policyName.trim() || 'Health Advantedge – ICICI Lombard Plus',
        policyType: `${policyName.trim() || 'Health Advantedge – ICICI Lombard Plus'} (${members.length} Member${members.length > 1 ? 's' : ''})`,
        policyStartDate,
        previousPolicyEndDate,
        renewalDueDate: previousPolicyEndDate,
        baseSumInsured: Number(baseSumInsured) || 0,
        loyaltyBonus: Number(loyaltyBonus) || 0,
        totalSumInsured: totalSI,
        policyStatus: 'Expiring Soon',
        zone,
        zoneNotice: `You're in ${zone}. Nice! You're getting a premium discount due to zone-based pricing.`,
        grossTenurePrices: {
          1: t1Orig,
          2: t2Orig,
          3: t3Orig
        },
        tenurePrices: {
          1: t1Payable,
          2: t2Payable,
          3: t3Payable
        },
        tenureDiscounts: {
          1: t1Disc,
          2: t2Disc,
          3: t3Disc
        },
        tenureDiscountPcts: {
          1: Number(tenure1DiscountPct) || 10,
          2: Number(tenure2DiscountPct) || 25,
          3: Number(tenure3DiscountPct) || 35
        },
        baseAnnualPremium: Number(baseAnnualPremium) || 0,
        loyaltyNcbDiscountPct: Number(tenure1DiscountPct) || 10,
        adminCustomDiscountAmount: Number(adminCustomDiscountAmount) || 0,
        cashbackAmount: cbAmt,
        cashbackConfig: {
          enabled: cashbackEnabled,
          paymentMethod: cashbackMethod,
          type: cashbackType,
          value: cbVal
        },
        selectedTenure: Number(selectedTenure) || 1,
        selectedAddOnIds,
        selectedBefitPlan,
        validityHours,
        addOnRiders: INITIAL_ADDONS,
        benefits: INITIAL_BENEFITS,
        members: members.map(mem => ({
          id: mem.id || `mem-${Math.random()}`,
          name: mem.name || customerName,
          relation: mem.relation || 'Self',
          gender: mem.gender || 'Male',
          dob: mem.dob || '1990-08-15',
          age: Number(mem.age) || 35,
          coverageAmount: totalSI,
          preExistingConditions: mem.preExistingConditions && mem.preExistingConditions.length > 0 ? mem.preExistingConditions : ['no'],
          heightFeetInches: mem.heightFeetInches || "5'8\"",
          weightKg: Number(mem.weightKg) || 70,
          abhaNumber: mem.abhaNumber || 'NA'
        })),
        kyc: {
          applicantName: applicantName || customerName,
          dob: applicantDob || '1990-08-15',
          email: email || `${customerName.toLowerCase().replace(/\s+/g, '')}@example.com`,
          mobile: mobileNumber,
          landline: landline || '-',
          address: address || '',
          addressLine2: addressLine2 || '',
          landmark: landmark || '',
          pincode: pincode || '500081',
          city: city || 'Hyderabad',
          state: state || 'Telangana',
          kycStatus: kycStatus || 'Verified',
          panOrAadhar: 'ABCDE1234F',
          pepStatus: pepStatus || 'No',
          nomineeName: nomineeName || 'Goturi Sujatha',
          nomineeRelation: nomineeRelation || 'Mother',
          nomineeAge: Number(nomineeAge) || 58,
          nomineeDob: nomineeDob || '1968-05-12'
        }
      };

      const res = await createCustomerPolicy(policyPayload);
      const createdPolicy = res.policy;

      // Determine final token and full URL based on selected link type
      let finalToken = '';
      let fullUrl = '';
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const selYr = Number(selectedTenure) || 1;
      const customDiscAmt = Number(adminCustomDiscountAmount) || 0;

      if (linkType === 'renewal') {
        finalToken = res.link?.token || `RNW-${createdPolicy.policyNumber.replace(/[^A-Z0-9]/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
        const tenureParam = selYr !== 1 ? `&tenure=${selYr}` : '';
        const discParam = customDiscAmt > 0 ? `&disc=${customDiscAmt}` : '';
        fullUrl = `${origin}/?token=${encodeURIComponent(finalToken)}${tenureParam}${discParam}`;
      } else {
        const softLink = generateSoftCopyLink(createdPolicy.policyNumber, validityHours);
        finalToken = softLink?.token || `SFT-${createdPolicy.policyNumber.replace(/[^A-Z0-9]/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
        fullUrl = `${origin}/?soft_token=${encodeURIComponent(finalToken)}`;
      }

      // Copy automatically to clipboard
      try {
        await navigator.clipboard.writeText(fullUrl);
      } catch {}

      onSuccess(createdPolicy, finalToken, linkType, fullUrl);

    } catch (err: any) {
      alert('Error creating customer policy: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* LINK TYPE & VALIDITY BANNER (ADVISOR LINK CONFIGURATION) */}
      <div className="bg-gradient-to-r from-[#00264A] to-[#001D3A] text-white p-4 sm:p-5 rounded-2xl border border-blue-900/50 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-widest text-[#EA580C] uppercase font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#EA580C]" />
              LINK GENERATION SETTINGS
            </span>
            <h4 className="text-sm sm:text-base font-extrabold text-white">
              Choose Link Type & Validity Duration
            </h4>
            <p className="text-xs text-slate-300">
              The link generated will automatically reflect all 8 sections below and be saved permanently.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Link Type Toggle */}
            <div className="flex bg-white/10 p-1 rounded-xl border border-white/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLinkType('renewal')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  linkType === 'renewal' ? 'bg-[#EA580C] text-white font-bold shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Renewal & Payment Link</span>
              </button>
              <button
                type="button"
                onClick={() => setLinkType('softcopy')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  linkType === 'softcopy' ? 'bg-[#003B70] text-white font-bold shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Soft Copy & Health Cards</span>
              </button>
            </div>

            {/* Validity Duration */}
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10 text-xs">
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-slate-300 text-[11px]">Validity:</span>
              <select
                value={validityHours}
                onChange={(e) => setValidityHours(Number(e.target.value))}
                className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
              >
                <option value={12} className="text-slate-900">12 Hours</option>
                <option value={24} className="text-slate-900">24 Hours (Default)</option>
                <option value={48} className="text-slate-900">48 Hours</option>
                <option value={168} className="text-slate-900">7 Days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: 8 CONFIGURATION SECTIONS (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Product Quick-Fill Preset Buttons */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3.5 rounded-2xl border border-amber-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#EA580C]" />
              <span className="text-xs font-extrabold text-slate-900">Product Presets:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleLoadElevatePreset}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>✨ Elevate Health Insurance (4225)</span>
              </button>
            </div>
          </div>

          {/* 1. BASIC POLICY DETAILS */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00264A] text-white flex items-center justify-center text-[10px]">1</span>
                <span>Basic Policy Details</span>
              </h4>
              <button
                type="button"
                onClick={handleAutoGeneratePolicyNo}
                className="text-[11px] font-bold text-[#EA580C] hover:underline cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-Generate Policy #</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Policy Plan Name *</label>
                <input
                  type="text"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="Health Advantedge – ICICI Lombard Plus"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white focus:ring-2 focus:ring-[#EA580C] outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Policy Number *</label>
                <input
                  type="text"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  placeholder="4128i/HSNR/846084812/04/000"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#EA580C] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Customer / Insured Full Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  placeholder="Goturi Mahendar Reddy"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#EA580C] outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Policy Start Date *</label>
                <input
                  type="date"
                  value={policyStartDate}
                  onChange={(e) => setPolicyStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white focus:ring-2 focus:ring-[#EA580C] outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Renewal Due Date / Previous End Date *</label>
                <input
                  type="date"
                  value={previousPolicyEndDate}
                  onChange={(e) => setPreviousPolicyEndDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white focus:ring-2 focus:ring-[#EA580C] outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. SUM INSURED & ZONE PRICING */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4 shadow-2xs">
            <div className="border-b border-slate-200 pb-2">
              <h4 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00264A] text-white flex items-center justify-center text-[10px]">2</span>
                <span>Sum Insured & Zone Pricing</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Base Sum Insured (₹) *</label>
                <input
                  type="number"
                  value={baseSumInsured}
                  onChange={(e) => setBaseSumInsured(Number(e.target.value))}
                  placeholder="2500000"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#EA580C] outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Loyalty Bonus / Cumulative Bonus (₹)</label>
                <input
                  type="number"
                  value={loyaltyBonus}
                  onChange={(e) => setLoyaltyBonus(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#EA580C] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="text-[11px] font-bold text-emerald-900 block">Total Sum Insured (Base + Loyalty Bonus)</span>
                      <span className="text-[10px] text-emerald-700">Displayed to customer as primary coverage amount</span>
                    </div>
                  </div>
                  <span className="text-emerald-700 font-black text-sm sm:text-base">
                    ₹{totalSI.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Pricing Zone *</label>
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-[#EA580C] outline-none"
                >
                  <option value="Zone A">Zone A (Tier 1 Metros - Mumbai, Delhi NCR)</option>
                  <option value="Zone B">Zone B (Tier 2 Metros - Hyderabad, Pune, Kolkata, Ahmedabad)</option>
                  <option value="Zone C">Zone C (Major Cities - Bengaluru, Chennai, Jaipur, Lucknow, Chandigarh)</option>
                  <option value="Zone D">Zone D (Rest of India)</option>
                </select>
                <p className="text-[11px] text-blue-600 font-medium mt-1">
                  You're in {zone}. Nice! You're getting a premium discount due to zone-based pricing.
                </p>
              </div>
            </div>
          </div>

          {/* 3. CHOOSE ADD-ON COVERS */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00264A] text-white flex items-center justify-center text-[10px]">3</span>
                <span>Choose Add-on Covers</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                {selectedAddOnIds.length} Add-on(s) Selected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {INITIAL_ADDONS.map(addon => {
                const isSelected = selectedAddOnIds.includes(addon.id);
                const isBefit = addon.id === BEFIT_RIDER_ID;
                const displayPrice = isBefit 
                  ? BEFIT_PLANS[selectedBefitPlan].pricePerYear 
                  : addon.annualPremium;
                const displayCoverage = isBefit 
                  ? `${selectedBefitPlan}: ${BEFIT_PLANS[selectedBefitPlan].badge}` 
                  : addon.coverageAmount;

                return (
                  <div 
                    key={addon.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-emerald-50/60 border-emerald-300 shadow-xs' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <strong className="text-slate-900 font-bold block">{addon.name}</strong>
                        <span className="font-mono text-emerald-700 font-extrabold text-xs whitespace-nowrap">
                          +₹{displayPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{addon.description}</p>

                      {isBefit && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">
                            BeFit Plan Tier (Plans A to F):
                          </label>
                          <select
                            value={selectedBefitPlan}
                            onChange={(e) => {
                              const newPlan = e.target.value as BefitPlanKey;
                              setSelectedBefitPlan(newPlan);
                              if (!isSelected) {
                                handleToggleAddOn(addon.id);
                              }
                            }}
                            className="w-full text-xs font-bold bg-white border border-slate-300 rounded px-2 py-1 text-slate-800"
                          >
                            {BEFIT_PLAN_KEYS.map((k) => (
                              <option key={k} value={k}>
                                {k} ({BEFIT_PLANS[k].badge}) — ₹{BEFIT_PLANS[k].pricePerYear.toLocaleString('en-IN')}/yr
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">{displayCoverage}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleAddOn(addon.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          isSelected 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-slate-100 text-slate-700 hover:bg-[#EA580C] hover:text-white'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added</span>
                          </>
                        ) : (
                          <span>+ Add Cover</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. INSURED FAMILY MEMBERS */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00264A] text-white flex items-center justify-center text-[10px]">4</span>
                <span>Insured Family Members</span>
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddAdult}
                  className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Adult</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddKid}
                  className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Kid</span>
                </button>
              </div>
            </div>

            {members.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
                No family members added yet. Click "+ Add Adult" or "+ Add Kid" above to enter insured details.
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((mem, index) => (
                  <div key={mem.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-xs text-slate-700">
                        Member #{index + 1}: {mem.name || 'Unnamed'} ({mem.relation})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(mem.id)}
                        className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-0.5">Full Name *</label>
                        <input
                          type="text"
                          value={mem.name}
                          onChange={(e) => handleUpdateMember(mem.id, { name: e.target.value })}
                          placeholder="Member Full Name"
                          required
                          className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 font-medium text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-0.5">Relationship *</label>
                        <select
                          value={mem.relation}
                          onChange={(e) => handleUpdateMember(mem.id, { relation: e.target.value as any })}
                          className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 font-medium text-slate-900 bg-white"
                        >
                          <option value="Self">Self</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Son">Son</option>
                          <option value="Daughter">Daughter</option>
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Brother">Brother</option>
                          <option value="Sister">Sister</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-0.5">Gender *</label>
                        <select
                          value={mem.gender}
                          onChange={(e) => handleUpdateMember(mem.id, { gender: e.target.value as any })}
                          className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 font-medium text-slate-900 bg-white"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-0.5">Date of Birth</label>
                        <input
                          type="date"
                          value={mem.dob}
                          onChange={(e) => handleUpdateMember(mem.id, { dob: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 font-medium text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-0.5">Age</label>
                        <input
                          type="number"
                          value={mem.age}
                          onChange={(e) => handleUpdateMember(mem.id, { age: Number(e.target.value) })}
                          placeholder="35"
                          className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 font-medium text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-0.5">Height & Weight</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={mem.heightFeetInches}
                            onChange={(e) => handleUpdateMember(mem.id, { heightFeetInches: e.target.value })}
                            placeholder="5'8&quot;"
                            className="w-1/2 px-2 py-1.5 rounded-md border border-slate-300 text-xs bg-white"
                          />
                          <input
                            type="number"
                            value={mem.weightKg}
                            onChange={(e) => handleUpdateMember(mem.id, { weightKg: Number(e.target.value) })}
                            placeholder="70 kg"
                            className="w-1/2 px-2 py-1.5 rounded-md border border-slate-300 text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-slate-600 font-semibold mb-0.5">Pre-existing Disease (PED)</label>
                        <select
                          value={mem.preExistingConditions[0] || 'no'}
                          onChange={(e) => handleUpdateMember(mem.id, { preExistingConditions: [e.target.value] })}
                          className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 font-medium text-slate-900 bg-white"
                        >
                          <option value="no">None / No Pre-Existing Illness</option>
                          <option value="Diabetes">Diabetes Mellitus</option>
                          <option value="Hypertension">Hypertension (High Blood Pressure)</option>
                          <option value="Cardiac">Cardiac / Heart Disease</option>
                          <option value="Asthma">Asthma / Respiratory</option>
                          <option value="Thyroid">Thyroid Disorder</option>
                          <option value="Other">Other Specific Condition</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-0.5">ABHA Health ID (Optional)</label>
                        <input
                          type="text"
                          value={mem.abhaNumber}
                          onChange={(e) => handleUpdateMember(mem.id, { abhaNumber: e.target.value })}
                          placeholder="e.g. 91-8829-1920-12"
                          className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 font-medium text-slate-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. APPLICANT CONTACT & KYC INFORMATION */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4 shadow-2xs">
            <div className="border-b border-slate-200 pb-2">
              <h4 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00264A] text-white flex items-center justify-center text-[10px]">5</span>
                <span>Applicant Contact & KYC Information</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Applicant Name *</label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Goturi Mahendar Reddy"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">KYC Verification Status</label>
                <select
                  value={kycStatus}
                  onChange={(e) => setKycStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                >
                  <option value="Verified">Verified (Green Clear)</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="In Review">In Review</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Registered Mobile Number *</label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="9876543210"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Landline Number</label>
                <input
                  type="text"
                  value={landline}
                  onChange={(e) => setLandline(e.target.value)}
                  placeholder="040-27891234 or -"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={applicantDob}
                  onChange={(e) => setApplicantDob(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Flat 402, Sai Balaji Heights"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Road No 12, Banjara Hills"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Landmark</label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near Apollo Cradle"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">City / Pincode</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Hyderabad"
                    className="w-2/3 px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                  />
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="500081"
                    className="w-1/3 px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Telangana"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">PEP Declaration (Politically Exposed Person)</label>
                <select
                  value={pepStatus}
                  onChange={(e) => setPepStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-900 bg-white"
                >
                  <option value="No">No (Standard Applicant)</option>
                  <option value="Yes">Yes (Politically Exposed Person)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 6. NOMINEE INFORMATION */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4 shadow-2xs">
            <div className="border-b border-slate-200 pb-2">
              <h4 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00264A] text-white flex items-center justify-center text-[10px]">6</span>
                <span>Nominee Information</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nominee Full Name *</label>
                <input
                  type="text"
                  value={nomineeName}
                  onChange={(e) => setNomineeName(e.target.value)}
                  placeholder="Goturi Sujatha"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Relationship with Insured</label>
                <select
                  value={nomineeRelation}
                  onChange={(e) => setNomineeRelation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-900 bg-white"
                >
                  <option value="Mother">Mother</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Father">Father</option>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nominee Date of Birth</label>
                <input
                  type="date"
                  value={nomineeDob}
                  onChange={(e) => setNomineeDob(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nominee Age</label>
                <input
                  type="number"
                  value={nomineeAge}
                  onChange={(e) => setNomineeAge(Number(e.target.value))}
                  placeholder="58"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* 7. PREMIUM CONFIGURATION & MULTI-YEAR DISCOUNTS */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4 shadow-2xs">
            <div className="border-b border-slate-200 pb-2">
              <h4 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00264A] text-white flex items-center justify-center text-[10px]">7</span>
                <span>Premium Configuration & Multi-Year Discounts</span>
              </h4>
            </div>

            {/* Default Selected Tenure for Generated Link */}
            <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-200">
              <label className="block text-slate-800 font-extrabold text-xs">
                Default Renewal Plan Tenure (Active On Customer Link) *
              </label>
              <p className="text-[11px] text-slate-500">
                Choose which duration plan is highlighted and pre-selected when the customer clicks the renewal link:
              </p>
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {[
                  { yr: 1, label: '1 Year Plan', disc: tenure1DiscountPct, orig: t1Orig, pay: t1Payable },
                  { yr: 2, label: '2 Years Plan', disc: tenure2DiscountPct, orig: t2Orig, pay: t2Payable },
                  { yr: 3, label: '3 Years Plan', disc: tenure3DiscountPct, orig: t3Orig, pay: t3Payable }
                ].map(opt => (
                  <button
                    key={opt.yr}
                    type="button"
                    onClick={() => setSelectedTenure(opt.yr)}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      selectedTenure === opt.yr
                        ? 'border-[#EA580C] bg-orange-50 text-[#EA580C] ring-2 ring-orange-400/30 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-black">{opt.label}</div>
                    <div className="text-[11px] font-bold text-slate-900 mt-0.5">₹{opt.pay.toLocaleString('en-IN')}</div>
                    <div className="text-[10px] text-emerald-700 font-semibold">{opt.disc}% Disc</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Base Annual Premium (₹) *</label>
                <input
                  type="number"
                  value={baseAnnualPremium}
                  onChange={(e) => setBaseAnnualPremium(Number(e.target.value))}
                  placeholder="28491"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-black text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Special Campaign Custom Discount (₹)</label>
                <input
                  type="number"
                  value={adminCustomDiscountAmount}
                  onChange={(e) => setAdminCustomDiscountAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-black text-rose-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">1 Year Renewal (Gross ₹ &amp; Disc %)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={tenure1Original}
                    onChange={(e) => setTenure1Original(Number(e.target.value))}
                    placeholder="37852"
                    className="w-2/3 px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                  />
                  <input
                    type="number"
                    value={tenure1DiscountPct}
                    onChange={(e) => setTenure1DiscountPct(Number(e.target.value))}
                    placeholder="10%"
                    className="w-1/3 px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">2 Year Renewal (Gross ₹ &amp; Disc %)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={tenure2Original}
                    onChange={(e) => setTenure2Original(Number(e.target.value))}
                    placeholder="71920"
                    className="w-2/3 px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                  />
                  <input
                    type="number"
                    value={tenure2DiscountPct}
                    onChange={(e) => setTenure2DiscountPct(Number(e.target.value))}
                    placeholder="25%"
                    className="w-1/3 px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">3 Year Renewal (Gross ₹ &amp; Disc %)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={tenure3Original}
                    onChange={(e) => setTenure3Original(Number(e.target.value))}
                    placeholder="104094"
                    className="w-2/3 px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                  />
                  <input
                    type="number"
                    value={tenure3DiscountPct}
                    onChange={(e) => setTenure3DiscountPct(Number(e.target.value))}
                    placeholder="35%"
                    className="w-1/3 px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-blue-900 font-bold text-[11px]">
                    <span>LIVE QUOTATION PREVIEW (AS CUSTOMER WILL SEE ON RENEWAL LINK)</span>
                    <span className="text-[10px] font-mono text-blue-700 font-normal">AUTO COMPUTED</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-white border border-blue-200">
                      <span className="text-[10px] text-slate-500 font-bold block">1 YEAR RENEWAL</span>
                      <div className="text-[11px] text-slate-600">Orig: ₹{t1Orig.toLocaleString('en-IN')}</div>
                      <div className="text-[11px] text-emerald-600 font-semibold">Disc: ₹{t1Disc.toLocaleString('en-IN')} ({tenure1DiscountPct}%)</div>
                      {adminCustomDiscountAmount > 0 && (
                        <div className="text-[11px] text-rose-600 font-semibold">Custom Disc: -₹{adminCustomDiscountAmount.toLocaleString('en-IN')}</div>
                      )}
                      <div className="mt-1 pt-1 border-t border-slate-100 font-black text-xs text-[#EA580C]">
                        Payable: ₹{t1Payable.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-blue-200">
                      <span className="text-[10px] text-slate-500 font-bold block">2 YEARS RENEWAL</span>
                      <div className="text-[11px] text-slate-600">Orig: ₹{t2Orig.toLocaleString('en-IN')}</div>
                      <div className="text-[11px] text-emerald-600 font-semibold">Disc: ₹{t2Disc.toLocaleString('en-IN')} ({tenure2DiscountPct}%)</div>
                      {adminCustomDiscountAmount > 0 && (
                        <div className="text-[11px] text-rose-600 font-semibold">Custom Disc: -₹{adminCustomDiscountAmount.toLocaleString('en-IN')}</div>
                      )}
                      <div className="mt-1 pt-1 border-t border-slate-100 font-black text-xs text-emerald-700">
                        Payable: ₹{t2Payable.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-blue-200">
                      <span className="text-[10px] text-slate-500 font-bold block">3 YEARS RENEWAL</span>
                      <div className="text-[11px] text-slate-600">Orig: ₹{t3Orig.toLocaleString('en-IN')}</div>
                      <div className="text-[11px] text-emerald-600 font-semibold">Disc: ₹{t3Disc.toLocaleString('en-IN')} ({tenure3DiscountPct}%)</div>
                      {adminCustomDiscountAmount > 0 && (
                        <div className="text-[11px] text-rose-600 font-semibold">Custom Disc: -₹{adminCustomDiscountAmount.toLocaleString('en-IN')}</div>
                      )}
                      <div className="mt-1 pt-1 border-t border-slate-100 font-black text-xs text-emerald-700">
                        Payable: ₹{t3Payable.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 8. CASHBACK OFFER CONFIGURATION */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00264A] text-white flex items-center justify-center text-[10px]">8</span>
                <span>Cashback Offer Configuration</span>
              </h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cashbackEnabled}
                  onChange={(e) => setCashbackEnabled(e.target.checked)}
                  className="rounded text-[#EA580C] focus:ring-[#EA580C] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">Enable Cashback Offer</span>
              </label>
            </div>

            {cashbackEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs animate-fadeIn">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Eligible Payment Method</label>
                  <select
                    value={cashbackMethod}
                    onChange={(e) => setCashbackMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                  >
                    <option value="Any Bank Credit Card">Any Bank Credit Card</option>
                    <option value="ICICI Bank Credit Cards">ICICI Bank Credit Cards</option>
                    <option value="HDFC Bank Credit Cards">HDFC Bank Credit Cards</option>
                    <option value="UPI &amp; NetBanking">UPI &amp; NetBanking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cashback Type</label>
                  <select
                    value={cashbackType}
                    onChange={(e) => setCashbackType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cashback Value</label>
                  <input
                    type="number"
                    value={cashbackValue}
                    onChange={(e) => setCashbackValue(Number(e.target.value))}
                    placeholder="10"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: STICKY LIVE QUOTATION PREVIEW PANEL (lg:col-span-4) */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="bg-[#001D3A] text-white rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#EA580C]" />
                <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">Live Quotation Preview</h4>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-extrabold">
                LIVE CALCULATOR
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">CUSTOMER NAME</span>
                <strong className="text-white text-sm font-bold block">{customerName || 'Customer Name'}</strong>
                <span className="text-slate-400 text-[10px] font-mono">{policyNumber || 'Policy Number'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-white/5 p-2.5 rounded-xl border border-white/10">
                <div>
                  <span className="text-slate-400 block text-[10px]">TOTAL SUM INSURED</span>
                  <strong className="text-emerald-400 text-xs font-black">₹{totalSI.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PRICING ZONE</span>
                  <strong className="text-blue-300 text-xs font-black">{zone}</strong>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">INSURED MEMBERS ({members.length})</span>
                {members.length === 0 ? (
                  <span className="text-slate-500 italic text-[11px]">No members added</span>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {members.map(m => (
                      <span key={m.id} className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] font-bold">
                        {m.name || 'Member'} ({m.relation})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {selectedAddOns.length > 0 && (
                <div>
                  <span className="text-slate-400 block text-[10px]">SELECTED ADD-ONS ({selectedAddOns.length})</span>
                  <div className="space-y-1 mt-1">
                    {selectedAddOns.map(a => (
                      <div key={a.id} className="flex justify-between text-[10px] text-slate-300">
                        <span>• {a.name}</span>
                        <span className="font-mono">+₹{a.annualPremium.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    <div className="pt-1 border-t border-white/10 flex justify-between font-bold text-blue-300 text-[10px]">
                      <span>Total Add-ons Premium:</span>
                      <span>+₹{addOnsTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-white/10 space-y-2">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">PAYABLE PREMIUM BY TENURE</span>
                
                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white text-xs">1 Year Renewal</div>
                    <div className="text-[10px] text-slate-400">Orig: ₹{t1Orig.toLocaleString('en-IN')} • {tenure1DiscountPct}% Disc</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-[#EA580C]">₹{t1Payable.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-200 text-xs">2 Year Renewal</div>
                    <div className="text-[10px] text-slate-400">Orig: ₹{t2Orig.toLocaleString('en-IN')} • {tenure2DiscountPct}% Disc</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-400">₹{t2Payable.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-200 text-xs">3 Year Renewal</div>
                    <div className="text-[10px] text-slate-400">Orig: ₹{t3Orig.toLocaleString('en-IN')} • {tenure3DiscountPct}% Disc</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-400">₹{t3Payable.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>

              {cashbackEnabled && cbAmt > 0 && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-300 font-bold">ESTIMATED CASHBACK ({cashbackMethod})</span>
                  <strong className="text-emerald-400 font-black text-xs">₹{cbAmt.toLocaleString('en-IN')}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER ACTION BAR */}
      <div className="pt-5 mt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <p className="text-[11px] text-slate-500 font-semibold">
          Every field entered is automatically saved to the central database &amp; tied to the generated link.
        </p>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer text-xs"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-initial px-7 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Saving &amp; Generating Link...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Generate Renewal Link &amp; Save</span>
              </>
            )}
          </button>
        </div>
      </div>

    </form>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-6xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp font-sans">
          
          {/* Modal Header */}
          <div className="bg-[#00264A] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EA580C]/20 border border-[#EA580C]/30 flex items-center justify-center text-[#EA580C]">
                <Plus className="w-5 h-5 font-black" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 tracking-tight">
                  Create New Customer &amp; Renewal Link
                </h3>
                <p className="text-xs text-slate-300">
                  Configure complete customer, policy, coverage, members, discount &amp; cashback details manually
                </p>
              </div>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {formContent}
          </div>

        </div>
      </div>
    );
  }

  // Inline mode
  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
      <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EA580C]/20 border border-[#EA580C]/30 flex items-center justify-center text-[#EA580C]">
            <Plus className="w-5 h-5 font-black" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 tracking-tight">
              Create New Customer &amp; Renewal Link
            </h3>
            <p className="text-xs text-slate-500">
              Configure complete customer, policy, coverage, members, discount &amp; cashback details manually
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {formContent}
      </div>
    </div>
  );
};
