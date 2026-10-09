/**
 * Utility functions for resolving customer-accessible URLs.
 * Resolves to the official live customer portal domain:
 * https://icicilombard-renewal-mumbai-prabhadevi-headbranch.ai.studio
 */

export const PUBLIC_PORTAL_URL = 'https://icici-renewal-portal-1.onrender.com';

export function getPublicCustomerBaseUrl(customOrigin?: string): string {
  let origin = (customOrigin || '').trim();

  if (!origin) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const custom = localStorage.getItem('ais_custom_portal_domain');
        if (custom && custom.trim() && !custom.includes('localhost')) {
          return custom.trim().replace(/\/+$/, '');
        }
      }
    } catch {}
    origin = (typeof window !== 'undefined' ? window.location.origin : '').trim();
  }

  // If in AI Studio development preview (ais-dev-), auto-route customers to public preview (ais-pre-)
  if (origin && origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-').replace(/\/+$/, '');
  }

  if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return PUBLIC_PORTAL_URL;
  }

  return origin.replace(/\/+$/, '');
}

export function buildPublicRenewalLink(token: string, policyNumber?: string, tenure?: number, discountAmount?: number, customOrigin?: string): string {
  const base = getPublicCustomerBaseUrl(customOrigin);
  const cleanToken = encodeURIComponent((token || '').trim());
  const tenureParam = tenure && tenure > 1 ? `&tenure=${tenure}` : '';
  const discParam = discountAmount && discountAmount > 0 ? `&disc=${discountAmount}` : '';
  const policyParam = policyNumber ? `&policy=${encodeURIComponent(policyNumber.trim())}` : '';

  return `${base}/?renewal_token=${cleanToken}${policyParam}${tenureParam}${discParam}`;
}

export function buildPublicSoftCopyLink(softToken: string, policyNumber?: string, customOrigin?: string): string {
  const base = getPublicCustomerBaseUrl(customOrigin);
  const cleanToken = encodeURIComponent((softToken || '').trim());
  const policyParam = policyNumber ? `&policy=${encodeURIComponent(policyNumber.trim())}` : '';

  return `${base}/?view=soft_copy&soft_token=${cleanToken}${policyParam}`;
}

/**
 * Direct Link to Admin Management Portal
 * Send to staff & policy administrators on other laptops to create customers and manage renewals.
 */
export function buildAdminPortalLink(customOrigin?: string): string {
  const base = getPublicCustomerBaseUrl(customOrigin);
  return `${base}/?view=admin`;
}

/**
 * Direct Link to Become an Advisor / Advisor Portal
 * Send to insurance advisors and field agents to onboard or manage their policy portfolio.
 */
export function buildAdvisorPortalLink(customOrigin?: string): string {
  const base = getPublicCustomerBaseUrl(customOrigin);
  return `${base}/?view=advisor`;
}
