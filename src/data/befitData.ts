export type BefitPlanKey = 'Plan A' | 'Plan B' | 'Plan C' | 'Plan D' | 'Plan E' | 'Plan F';

export interface BefitPlanOption {
  id: BefitPlanKey;
  label: string;
  title: string;
  subtitle: string;
  pricePerYear: number;
  tenurePrices: {
    1: number;
    2: number;
    3: number;
  };
  consultations: string;
  pharmacy: string;
  diagnostics: string;
  physiotherapy: string;
  specialBenefits: string[];
  badge: string;
  summary: string;
  recommended?: boolean;
}

export const BEFIT_RIDER_ID = 'addon-befit';

export const BEFIT_PLANS: Record<BefitPlanKey, BefitPlanOption> = {
  'Plan A': {
    id: 'Plan A',
    label: 'Plan A (Starter Care)',
    title: 'BeFit Plan A',
    subtitle: 'Starter Cashless OPD',
    pricePerYear: 2500,
    tenurePrices: {
      1: 2500,
      2: 4750,
      3: 6750
    },
    consultations: 'Unlimited Tele-consultations + 2 In-Clinic visits (up to ₹1,500)',
    pharmacy: 'Prescription medicines up to ₹1,500',
    diagnostics: 'Basic pathology & lab tests up to ₹1,500',
    physiotherapy: 'Not covered',
    specialBenefits: [
      'Unlimited 24x7 General Physician e-consultations',
      'Diet & Nutrition tele-counselling',
      'Digital health records on IL TakeCare app'
    ],
    badge: 'Starter',
    summary: 'Doctor consultations & basic medicines up to ₹2,500/yr'
  },
  'Plan B': {
    id: 'Plan B',
    label: 'Plan B (Essential Care)',
    title: 'BeFit Plan B',
    subtitle: 'Most Chosen Family OPD',
    pricePerYear: 4500,
    tenurePrices: {
      1: 4500,
      2: 8550,
      3: 12150
    },
    consultations: 'Unlimited Tele-consultations + 5 In-Clinic visits (up to ₹3,500)',
    pharmacy: 'Prescription medicines up to ₹3,000',
    diagnostics: 'Pathology & routine diagnostics up to ₹3,000',
    physiotherapy: '2 Physiotherapy sessions included',
    specialBenefits: [
      'Specialist & General Physician consultations',
      'E-pharmacy home delivery discounts',
      'Mental health e-counselling (2 sessions)',
      'Wellbeing reward points redeemable at renewal'
    ],
    badge: 'Popular',
    recommended: true,
    summary: 'Enhanced outpatient consultations & pharmacy up to ₹5,000/yr'
  },
  'Plan C': {
    id: 'Plan C',
    label: 'Plan C (Comprehensive Care)',
    title: 'BeFit Plan C',
    subtitle: 'Broad Outpatient Protection',
    pricePerYear: 6500,
    tenurePrices: {
      1: 6500,
      2: 12350,
      3: 17550
    },
    consultations: 'Unlimited Tele-consultations + 8 In-Clinic visits (up to ₹6,000)',
    pharmacy: 'Medicines & consumables up to ₹5,000',
    diagnostics: 'Comprehensive diagnostics & blood tests up to ₹5,000',
    physiotherapy: '4 Physiotherapy sessions included',
    specialBenefits: [
      'Minor daycare OPD procedures covered',
      'Super-specialist consultations',
      'Unlimited tele-psychologist sessions',
      'Cashless network across 10,000+ partner clinics'
    ],
    badge: 'Comprehensive',
    summary: 'Specialists, diagnostics & minor procedures up to ₹8,000/yr'
  },
  'Plan D': {
    id: 'Plan D',
    label: 'Plan D (Family Advantage)',
    title: 'BeFit Plan D',
    subtitle: 'Multi-member Active Health',
    pricePerYear: 9500,
    tenurePrices: {
      1: 9500,
      2: 18050,
      3: 25650
    },
    consultations: 'Unlimited Virtual + 12 In-Clinic Specialist visits (up to ₹10,000)',
    pharmacy: 'Cashless pharmacy coverage up to ₹8,000',
    diagnostics: 'Advanced imaging, USG, X-Ray & pathology up to ₹8,000',
    physiotherapy: '6 Physiotherapy sessions included',
    specialBenefits: [
      'Covers all insured family members cashless',
      'Minor surgical OPD procedures',
      'Comprehensive preventive health profile',
      'Mental health & stress management'
    ],
    badge: 'Family Care',
    summary: 'Advanced diagnostics, specialists & family OPD up to ₹15,000/yr'
  },
  'Plan E': {
    id: 'Plan E',
    label: 'Plan E (Executive Health)',
    title: 'BeFit Plan E',
    subtitle: 'High-limit Outpatient Cover',
    pricePerYear: 14000,
    tenurePrices: {
      1: 14000,
      2: 26600,
      3: 37800
    },
    consultations: 'Unlimited Virtual + 18 In-Clinic Specialist/Super-Specialist visits',
    pharmacy: 'Cashless medicines & express delivery up to ₹14,000',
    diagnostics: 'Complete pathology, MRI/CT scans & diagnostics up to ₹14,000',
    physiotherapy: '10 Physiotherapy sessions included',
    specialBenefits: [
      'Dental & Vision OPD preventive care included (up to ₹4,000)',
      'Dietitian personalized meal planning',
      'Minor daycare procedures with no co-pay',
      'Emergency ambulance dispatch support'
    ],
    badge: 'Executive',
    summary: 'Executive OPD including Dental, Vision & Scans up to ₹25,000/yr'
  },
  'Plan F': {
    id: 'Plan F',
    label: 'Plan F (Platinum Supreme)',
    title: 'BeFit Plan F',
    subtitle: 'Ultimate OPD & Wellness Coverage',
    pricePerYear: 22000,
    tenurePrices: {
      1: 22000,
      2: 41800,
      3: 59400
    },
    consultations: 'Unlimited In-Clinic & Virtual Visits for all specialists across India',
    pharmacy: 'Full cashless pharmacy & medical consumables up to ₹25,000',
    diagnostics: 'Advanced full-body diagnostics, CT/MRI & genetic panels up to ₹25,000',
    physiotherapy: 'Up to 15 Physiotherapy sessions included',
    specialBenefits: [
      'Dental, Vision & Hearing OPD care (up to ₹8,000)',
      'Zero out-of-pocket cashless network priority',
      'Priority appointment booking with senior department heads',
      'Home healthcare & nursing assistance visits'
    ],
    badge: 'Platinum Elite',
    summary: 'All-inclusive cashless OPD, Dental, Vision & Priority care up to ₹50,000/yr'
  }
};

export const BEFIT_PLAN_KEYS: BefitPlanKey[] = [
  'Plan A',
  'Plan B',
  'Plan C',
  'Plan D',
  'Plan E',
  'Plan F'
];
