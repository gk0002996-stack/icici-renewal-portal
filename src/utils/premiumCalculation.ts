import { AddOnRider, CustomerPolicy } from '../types/insurance';

export interface PricingCalculationParams {
  baseAnnualPremium: number;
  selectedAddOnIds?: string[];
  addOnRiders?: AddOnRider[];
  tenure1DiscountPct?: number;
  tenure2DiscountPct?: number;
  tenure3DiscountPct?: number;
  adminCustomDiscountAmount?: number;
  manualGrossPrices?: { 1?: number; 2?: number; 3?: number };
}

export interface PricingCalculationResult {
  grossTenurePrices: { 1: number; 2: number; 3: number };
  tenurePrices: { 1: number; 2: number; 3: number };
  discounts: { 1: number; 2: number; 3: number };
  discountPcts: { 1: number; 2: number; 3: number };
  addOnsTotalAnnual: number;
}

/**
 * Standardized single source of truth for calculating policy pricing across tenures.
 */
export function calculatePolicyPricing(params: PricingCalculationParams): PricingCalculationResult {
  const base = Math.max(0, Number(params.baseAnnualPremium) || 0);
  const addOnIds = params.selectedAddOnIds || [];
  const riders = params.addOnRiders || [];
  const customDisc = Math.max(0, Number(params.adminCustomDiscountAmount) || 0);

  const t1Pct = params.tenure1DiscountPct !== undefined ? Number(params.tenure1DiscountPct) : 10;
  const t2Pct = params.tenure2DiscountPct !== undefined ? Number(params.tenure2DiscountPct) : 25;
  const t3Pct = params.tenure3DiscountPct !== undefined ? Number(params.tenure3DiscountPct) : 35;

  const addOnsTotalAnnual = riders
    .filter(r => addOnIds.includes(r.id))
    .reduce((sum, r) => sum + (Number(r.annualPremium) || 0), 0);

  const totalAnnual1 = base + addOnsTotalAnnual;

  // Tenure 1
  const t1Orig = params.manualGrossPrices?.[1] !== undefined && params.manualGrossPrices[1] > 0
    ? params.manualGrossPrices[1]
    : totalAnnual1;
  const t1Disc = Math.round(t1Orig * (t1Pct / 100));
  const t1Payable = Math.max(0, t1Orig - t1Disc - customDisc);

  // Tenure 2 (Standard ~1.9x for 2-year tenure)
  const t2Orig = params.manualGrossPrices?.[2] !== undefined && params.manualGrossPrices[2] > 0
    ? params.manualGrossPrices[2]
    : Math.round(totalAnnual1 * 1.9);
  const t2Disc = Math.round(t2Orig * (t2Pct / 100));
  const t2Payable = Math.max(0, t2Orig - t2Disc - customDisc);

  // Tenure 3 (Standard ~2.75x for 3-year tenure)
  const t3Orig = params.manualGrossPrices?.[3] !== undefined && params.manualGrossPrices[3] > 0
    ? params.manualGrossPrices[3]
    : Math.round(totalAnnual1 * 2.75);
  const t3Disc = Math.round(t3Orig * (t3Pct / 100));
  const t3Payable = Math.max(0, t3Orig - t3Disc - customDisc);

  return {
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
    discounts: {
      1: Math.max(0, t1Orig - t1Payable),
      2: Math.max(0, t2Orig - t2Payable),
      3: Math.max(0, t3Orig - t3Payable)
    },
    discountPcts: {
      1: t1Orig > 0 ? Math.round(((t1Orig - t1Payable) / t1Orig) * 100) : t1Pct,
      2: t2Orig > 0 ? Math.round(((t2Orig - t2Payable) / t2Orig) * 100) : t2Pct,
      3: t3Orig > 0 ? Math.round(((t3Orig - t3Payable) / t3Orig) * 100) : t3Pct
    },
    addOnsTotalAnnual
  };
}

/**
 * Calculates tenure costs considering delta between selected add-ons and initial baseline add-ons.
 */
export function getTenurePricingDetails(
  policy: CustomerPolicy,
  tenureYears: number,
  currentSelectedAddOns: AddOnRider[] = [],
  baselineAddOnIds: string[] = []
) {
  const yr = tenureYears as 1 | 2 | 3;
  const baseAnnual = Number(policy.baseAnnualPremium) || 0;
  const riders = policy.addOnRiders || [];
  const baseSI = Number(policy.baseSumInsured) || 1000000;

  const getAddonCostForTenure = (addon: AddOnRider, y: number): number => {
    if (addon.id === 'addon-opd') {
      const opdLimit = policy.selectedOpdTier === '50k' ? 50000 : 25000;
      const yr1 = Math.round(opdLimit * 0.24);
      if (y === 1) return yr1;
      if (y === 2) return Math.round(yr1 * 1.9);
      return Math.round(yr1 * 2.7);
    }
    if (addon.id === 'addon-befit') {
      const p = policy.selectedBefitPlan || 'befit_starter';
      const annual = p === 'befit_elite' ? 6500 : p === 'befit_plus' ? 5200 : 4500;
      if (y === 1) return annual;
      if (y === 2) return Math.round(annual * 1.9);
      return Math.round(annual * 2.7);
    }
    if (addon.id === 'addon-si-protector') {
      const annual = Math.round(baseSI * 0.0006);
      if (y === 1) return annual;
      if (y === 2) return Math.round(annual * 1.9);
      return Math.round(annual * 2.7);
    }
    if (addon.tenurePrices && addon.tenurePrices[y as 1 | 2 | 3]) {
      return addon.tenurePrices[y as 1 | 2 | 3];
    }
    const annual = Number(addon.annualPremium) || 0;
    if (y === 1) return annual;
    if (y === 2) return Math.round(annual * 1.9);
    return Math.round(annual * 2.7);
  };

  const baselineObjects = riders.filter(r => (baselineAddOnIds.length > 0 ? baselineAddOnIds : (policy.selectedAddOnIds || [])).includes(r.id));
  const selectedCost = currentSelectedAddOns.reduce((sum, a) => sum + getAddonCostForTenure(a, yr), 0);
  const baselineCost = baselineObjects.reduce((sum, a) => sum + getAddonCostForTenure(a, yr), 0);
  const yrAddonDelta = selectedCost - baselineCost;

  const defaultDiscPct = (policy.tenureDiscountPcts && policy.tenureDiscountPcts[yr] !== undefined)
    ? Number(policy.tenureDiscountPcts[yr])
    : yr === 1 
      ? (policy.loyaltyNcbDiscountPct !== undefined && policy.loyaltyNcbDiscountPct > 0 ? policy.loyaltyNcbDiscountPct : 10) 
      : yr === 2 ? 25 : 35;
  const customDisc = Number(policy.adminCustomDiscountAmount) || 0;

  let gross = 0;
  let baseGross = 0;
  const storedNet = policy.tenurePrices && policy.tenurePrices[yr] !== undefined ? Number(policy.tenurePrices[yr]) : 0;
  const storedGross = policy.grossTenurePrices && policy.grossTenurePrices[yr] !== undefined ? Number(policy.grossTenurePrices[yr]) : 0;
  const storedDiscount = policy.tenureDiscounts && policy.tenureDiscounts[yr] !== undefined ? Number(policy.tenureDiscounts[yr]) : 0;

  if (storedGross > 0 && storedGross > storedNet) {
    baseGross = storedGross;
  } else if (storedGross > 0 && storedDiscount > 0) {
    baseGross = storedGross;
  } else if (storedNet > 0) {
    // If gross was stored identical to net (the 0% discount glitch) or missing, recover true gross
    baseGross = Math.round((storedNet + customDisc) / (1 - (defaultDiscPct / 100)));
  } else {
    const mult = yr === 1 ? 1 : yr === 2 ? 1.9 : 2.75;
    const baselineAnnual = baselineObjects.reduce((sum, a) => sum + (Number(a.annualPremium) || 0), 0);
    baseGross = Math.round((baseAnnual + baselineAnnual) * mult);
  }
  gross = baseGross + yrAddonDelta;

  const standardDiscAmt = Math.round(baseGross * (defaultDiscPct / 100));

  let baseNet = 0;
  if (storedNet > 0 && storedNet < baseGross) {
    baseNet = storedNet;
    // Check if custom discount was not yet deducted from stored net
    if (customDisc > 0) {
      if (Math.abs(baseNet - (baseGross - standardDiscAmt)) <= 5) {
        baseNet = Math.max(0, baseNet - customDisc);
      } else if (baseNet > (baseGross - standardDiscAmt - customDisc)) {
        baseNet = Math.max(0, baseNet - customDisc);
      }
    }
  } else {
    baseNet = Math.max(0, baseGross - standardDiscAmt - customDisc);
  }

  const net = Math.max(0, baseNet + yrAddonDelta);
  if (gross <= net && (defaultDiscPct > 0 || customDisc > 0)) {
    gross = Math.max(gross, Math.round(net / (1 - (defaultDiscPct / 100))) + customDisc);
  }

  const discAmt = Math.max(0, gross - net);
  const discPct = gross > 0 ? Math.round((discAmt / gross) * 100) : defaultDiscPct;
  const grossAddonsTenure = selectedCost;
  const grossBaseTenure = Math.max(0, gross - grossAddonsTenure);

  return {
    gross,
    net,
    discAmt,
    discPct,
    grossBaseTenure,
    grossAddonsTenure,
    customDiscount: customDisc,
    standardDiscount: Math.max(0, discAmt - customDisc)
  };
}
