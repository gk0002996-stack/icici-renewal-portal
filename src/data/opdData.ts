export type OpdTierKey = '25k' | '50k' | '1lac';

export interface OpdTierOption {
  id: OpdTierKey;
  label: string;
  limit: number;
  formattedLimit: string;
  shortLabel: string;
  tenurePrices: {
    1: number;
    2: number;
    3: number;
  };
  description: string;
  badge?: string;
  saving2Yr: number;
  saving3Yr: number;
}

export const OPD_RIDER_ID = 'addon-opd';

export const OPD_TIERS: Record<OpdTierKey, OpdTierOption> = {
  '25k': {
    id: '25k',
    label: '₹25,000 OPD Limit',
    shortLabel: '25k OPD',
    limit: 25000,
    formattedLimit: '₹25,000',
    tenurePrices: {
      1: 6000,
      2: 11400,
      3: 16200
    },
    saving2Yr: 600,
    saving3Yr: 1800,
    description: 'Covers general physician consultations, essential lab tests, and prescribed medicines up to ₹25,000 per policy year.',
    badge: 'Starter OPD'
  },
  '50k': {
    id: '50k',
    label: '₹50,000 OPD Limit',
    shortLabel: '50k OPD',
    limit: 50000,
    formattedLimit: '₹50,000',
    tenurePrices: {
      1: 8900,
      2: 16910,
      3: 24030
    },
    saving2Yr: 890,
    saving3Yr: 2670,
    description: 'Enhanced outpatient protection covering specialist consultations, radiology, advanced pathology & pharmacy up to ₹50,000 per policy year.',
    badge: 'Most Popular'
  },
  '1lac': {
    id: '1lac',
    label: '₹1,00,000 (1 Lac) OPD Limit',
    shortLabel: '1 Lac OPD',
    limit: 100000,
    formattedLimit: '₹1,00,000',
    tenurePrices: {
      1: 11400,
      2: 21660,
      3: 30780
    },
    saving2Yr: 1140,
    saving3Yr: 3420,
    description: 'Comprehensive high-limit OPD coverage for frequent clinic visits, diagnostics, physiotherapy, dental & vision up to ₹1,00,000 per policy year.',
    badge: 'Max Protection'
  }
};
