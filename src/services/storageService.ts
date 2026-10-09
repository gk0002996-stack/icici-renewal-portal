import { 
  CustomerPolicy, 
  InsuredMember, 
  PolicyBenefit,
  AddOnRider,
  CustomerKYC, 
  RenewalAttempt, 
  ActivityLog, 
  RenewalLinkRecord, 
  SoftCopyLinkRecord 
} from '../types/insurance';
import { 
  INITIAL_CUSTOMERS, 
  INITIAL_ACTIVITY_LOGS, 
  INITIAL_RENEWAL_LINKS, 
  INITIAL_SOFTCOPY_LINKS,
  INITIAL_ADDONS,
  INITIAL_BENEFITS
} from '../data/initialData';
import {
  apiGetCustomers,
  apiGetCustomerByQuery,
  apiCreateCustomerPolicy,
  apiUpdateCustomerPolicy,
  apiSetAdminCustomDiscount,
  apiGetRenewalLinks,
  apiGenerateRenewalLink,
  apiRegenerateRenewalLink,
  apiExpireRenewalLink,
  apiDeleteRenewalLink,
  apiActivateRenewalLink,
  apiEditRenewalLink,
  apiRecordRenewalLinkResent,
  EditRenewalLinkParams,
  apiRecordRenewalLinkOpened,
  apiGetSoftCopyLinks,
  apiGenerateSoftCopyLink,
  apiRegenerateSoftCopyLink,
  apiExpireSoftCopyLink,
  apiDeleteSoftCopyLink,
  apiActivateSoftCopyLink,
  apiRecordSoftCopyPageOpened,
  apiRecordSoftCopySubmission,
  apiRecordDocumentDownload,
  apiGetActivityLogs,
  apiLogActivity,
  apiRecordPaymentAttempt,
  apiRecordPaymentSuccess,
  apiRecordPaymentFailure,
  apiGetAdminSettings,
  apiSaveAdminSettings,
  apiGetDashboardStats,
  apiResetDatabase,
  apiGetEmailSenders,
  apiGetVerifiedEmailSenders,
  apiSaveEmailSender,
  apiVerifyEmailSender,
  apiSetDefaultEmailSender,
  apiDeleteEmailSender,
  apiGetEmailSmtpConfig,
  apiSaveEmailSmtpConfig,
  apiTestSmtpConnection,
  apiGetEmailLogs,
  apiSendCustomerEmail,
  apiSyncCustomers,
  apiRecoverCustomers,
  apiGetMobileOtpTracking,
  apiSaveMobileOtpTracking,
  apiUpdateMobileOtpConsent,
  apiUpdateMobileOtpStatus,
  apiResendMobileOtpReminder,
  AdminSettings
} from './apiService';

export {
  apiGetCustomers,
  apiGetCustomerByQuery,
  apiCreateCustomerPolicy,
  apiUpdateCustomerPolicy,
  apiSetAdminCustomDiscount,
  apiGetRenewalLinks,
  apiGenerateRenewalLink,
  apiRecordRenewalLinkOpened,
  apiGetSoftCopyLinks,
  apiGenerateSoftCopyLink,
  apiRecordSoftCopyPageOpened,
  apiRecordSoftCopySubmission,
  apiRecordDocumentDownload,
  apiGetActivityLogs,
  apiLogActivity,
  apiRecordPaymentAttempt,
  apiRecordPaymentSuccess,
  apiGetAdminSettings,
  apiSaveAdminSettings,
  apiGetDashboardStats,
  apiResetDatabase,
  apiGetEmailSenders,
  apiGetVerifiedEmailSenders,
  apiSaveEmailSender,
  apiVerifyEmailSender,
  apiSetDefaultEmailSender,
  apiDeleteEmailSender,
  apiGetEmailSmtpConfig,
  apiSaveEmailSmtpConfig,
  apiTestSmtpConnection,
  apiGetEmailLogs,
  apiSendCustomerEmail,
  apiGetMobileOtpTracking,
  apiSaveMobileOtpTracking,
  apiUpdateMobileOtpConsent,
  apiUpdateMobileOtpStatus,
  apiResendMobileOtpReminder
};

export type { AdminSettings };

const STORAGE_KEYS = {
  CUSTOMERS: 'icici_lombard_customers_db_v3',
  RENEWAL_LINKS: 'icici_lombard_renewal_links_db_v3',
  SOFT_COPY_LINKS: 'icici_lombard_softcopy_links_db_v3',
  SETTINGS: 'icici_lombard_admin_settings_v3',
  ACTIVITY_LOGS: 'icici_lombard_activity_logs_db_v3'
};

// Clean legacy localStorage keys if present
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    ['apex_care_customers_db_v2', 'apex_care_renewal_links_db_v2', 'apex_care_softcopy_links_db_v2', 'apex_care_admin_settings_v2'].forEach(k => {
      localStorage.removeItem(k);
    });
  } catch (_) {}
}

function loadStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed) ? parsed.length > 0 : !!parsed) {
          return parsed;
        }
      }
    }
  } catch (e) {}
  return fallback;
}

function saveStorage(key: string, data: any): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (e) {}
}

export function normalizeCustomerPolicy(c: any): CustomerPolicy {
  if (!c) return c;
  const totalSI = Number(c.totalSumInsured || c.sumInsured || c.baseSumInsured || 500000);
  const baseSI = Number(c.baseSumInsured || c.sumInsured || 500000);
  const bonus = Number(c.loyaltyBonus !== undefined ? c.loyaltyBonus : (totalSI > baseSI ? totalSI - baseSI : 0));
  const basePrem = Number(c.baseAnnualPremium || c.premium || (c.tenurePrices ? c.tenurePrices[1] : 12500) || 12500);

  const tenurePrices = c.tenurePrices && typeof c.tenurePrices === 'object' ? c.tenurePrices : {
    1: basePrem,
    2: Math.round(basePrem * 1.9),
    3: Math.round(basePrem * 2.75)
  };

  const grossTenurePrices = c.grossTenurePrices && typeof c.grossTenurePrices === 'object' ? c.grossTenurePrices : {
    1: Math.round(basePrem * 1.11),
    2: Math.round(basePrem * 1.9 * 1.11),
    3: Math.round(basePrem * 2.75 * 1.11)
  };

  const members = Array.isArray(c.members) && c.members.length > 0 ? c.members : [{
    id: `mem-${c.id || c.policyNumber?.replace(/[^A-Z0-9]/gi, '') || Date.now()}`,
    name: c.customerName || 'Self',
    relation: 'Self',
    gender: 'Male',
    dob: '1985-05-15',
    age: 40,
    coverageAmount: totalSI,
    preExistingConditions: ['No']
  }];

  const kyc = c.kyc || {
    applicantName: c.customerName || 'Customer',
    dob: '1985-05-15',
    email: c.email || 'customer@example.com',
    mobile: c.mobileNumber || '9876543210',
    address: c.address || 'Registered Address',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    kycStatus: 'Verified',
    panOrAadhar: 'ABCDE1234F',
    nomineeName: 'Nominee',
    nomineeRelation: 'Spouse',
    nomineeAge: 38
  };

  return {
    ...c,
    id: c.id || `cust-${c.policyNumber?.replace(/[^A-Z0-9]/gi, '') || Date.now()}`,
    customerName: c.customerName || 'Customer',
    policyNumber: c.policyNumber || 'IL-POLICY-DEFAULT',
    mobileNumber: c.mobileNumber || c.mobile || '9876543210',
    email: c.email || 'customer@example.com',
    policyName: c.policyName || 'ICICI Lombard Complete Health Insurance',
    policyType: c.policyType || 'Complete Health Insurance',
    policyStatus: c.policyStatus || c.status || 'Expiring Soon',
    policyStartDate: c.policyStartDate || c.startDate || '2025-01-01',
    previousPolicyEndDate: c.previousPolicyEndDate || c.previousEndDate || '2026-01-01',
    renewalDueDate: c.renewalDueDate || c.currentEndDate || '2026-01-01',
    baseSumInsured: baseSI,
    loyaltyBonus: bonus,
    totalSumInsured: totalSI,
    grossTenurePrices,
    tenurePrices,
    baseAnnualPremium: basePrem,
    loyaltyNcbDiscountPct: c.loyaltyNcbDiscountPct !== undefined ? c.loyaltyNcbDiscountPct : 10,
    adminCustomDiscountAmount: c.adminCustomDiscountAmount || 0,
    selectedTenure: c.selectedTenure || 1,
    selectedAddOnIds: Array.isArray(c.selectedAddOnIds) && c.selectedAddOnIds.length > 0 ? c.selectedAddOnIds : ['addon-claim-protector', 'addon-opd', 'addon-maternity'],
    benefits: (() => {
      const bMap = new Map<string, PolicyBenefit>((c.benefits || []).map(b => [b.id, b]));
      return INITIAL_BENEFITS.map(m => {
        const found = bMap.get(m.id);
        return found ? ({ ...m, ...found } as PolicyBenefit) : m;
      });
    })(),
    addOnRiders: (() => {
      const aMap = new Map<string, AddOnRider>((c.addOnRiders || []).map(r => [r.id, r]));
      return INITIAL_ADDONS.map(m => {
        const found = aMap.get(m.id);
        return found ? ({ ...m, ...found } as AddOnRider) : m;
      });
    })(),
    members,
    kyc,
    renewalAttempts: Array.isArray(c.renewalAttempts) ? c.renewalAttempts : (Array.isArray(c.paymentAttempts) ? c.paymentAttempts : [])
  };
}

// In-Memory Synchronous Cache for React sync state getters backed by LocalStorage
let customersCache: CustomerPolicy[] = (loadStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS) || []).map(normalizeCustomerPolicy);
let activityLogsCache: ActivityLog[] = loadStorage(STORAGE_KEYS.ACTIVITY_LOGS, INITIAL_ACTIVITY_LOGS) || INITIAL_ACTIVITY_LOGS;
let renewalLinksCache: RenewalLinkRecord[] = loadStorage(STORAGE_KEYS.RENEWAL_LINKS, INITIAL_RENEWAL_LINKS);
let softCopyLinksCache: SoftCopyLinkRecord[] = loadStorage(STORAGE_KEYS.SOFT_COPY_LINKS, INITIAL_SOFTCOPY_LINKS);
let adminSettingsCache: AdminSettings = loadStorage(STORAGE_KEYS.SETTINGS, {
  adminUpiId: 'icicilombard.insurance@okaxis',
  adminUpiName: 'ICICI Lombard General Insurance',
  qrNote: 'Scan with Google Pay, Paytm, PhonePe or BHIM to renew policy'
});

export function getCurrentTimestamp(dateInput?: Date | string | number): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Init & Refresh Cache from Central Server DB
export async function syncWithCentralServer(): Promise<void> {
  try {
    const localCusts = loadStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    if (localCusts && localCusts.length > 0) {
      await apiSyncCustomers(localCusts).catch(() => {});
    }

    const [custs, logs, rLinks, sLinks, settings] = await Promise.all([
      apiGetCustomers().catch(() => loadStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS)),
      apiGetActivityLogs().catch(() => INITIAL_ACTIVITY_LOGS),
      apiGetRenewalLinks().catch(() => loadStorage(STORAGE_KEYS.RENEWAL_LINKS, INITIAL_RENEWAL_LINKS)),
      apiGetSoftCopyLinks().catch(() => loadStorage(STORAGE_KEYS.SOFT_COPY_LINKS, INITIAL_SOFTCOPY_LINKS)),
      apiGetAdminSettings().catch(() => adminSettingsCache)
    ]);
    if (custs && custs.length > 0) {
      const custMap = new Map<string, CustomerPolicy>();
      custs.forEach(c => custMap.set(c.policyNumber.toUpperCase(), c));
      localCusts.forEach(lc => {
        const key = lc.policyNumber.toUpperCase();
        if (!custMap.has(key)) {
          custMap.set(key, lc);
        }
      });
      const combined = Array.from(custMap.values()).map(normalizeCustomerPolicy);
      customersCache = combined;
      saveStorage(STORAGE_KEYS.CUSTOMERS, combined);
    }
    if (logs && logs.length > 0) {
      activityLogsCache = logs;
      saveStorage(STORAGE_KEYS.ACTIVITY_LOGS, logs);
    }
    if (rLinks && rLinks.length > 0) {
      renewalLinksCache = rLinks;
      saveStorage(STORAGE_KEYS.RENEWAL_LINKS, rLinks);
    }
    if (sLinks && sLinks.length > 0) {
      softCopyLinksCache = sLinks;
      saveStorage(STORAGE_KEYS.SOFT_COPY_LINKS, sLinks);
    }
    if (settings) {
      adminSettingsCache = settings;
      saveStorage(STORAGE_KEYS.SETTINGS, settings);
    }
  } catch (err) {
    console.warn('Central server sync warning:', err);
  }
}

export async function scanAndRecoverAllStoredData(): Promise<{ recoveredCount: number; totalCustomers: number; customers: CustomerPolicy[] }> {
  try {
    const collectedCustomers: CustomerPolicy[] = [];
    const collectedLinks: RenewalLinkRecord[] = [];

    // Scan all keys in localStorage for any customer/link traces
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        try {
          const raw = window.localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (item && item.policyNumber && (item.customerName || item.members)) {
                collectedCustomers.push(item);
              }
              if (item && item.token && item.policyNumber) {
                collectedLinks.push(item);
              }
            });
          } else if (parsed && parsed.policyNumber) {
            if (parsed.customerName || parsed.members) collectedCustomers.push(parsed);
            if (parsed.token) collectedLinks.push(parsed);
          }
        } catch {
          // ignore non-json
        }
      }
    }

    const res = await apiRecoverCustomers({
      customers: collectedCustomers,
      links: collectedLinks
    });

    if (res && Array.isArray(res.customers) && res.customers.length > 0) {
      customersCache = res.customers;
      saveStorage(STORAGE_KEYS.CUSTOMERS, res.customers);
    }

    const updatedLinks = await apiGetRenewalLinks().catch(() => []);
    if (updatedLinks && updatedLinks.length > 0) {
      renewalLinksCache = updatedLinks;
      saveStorage(STORAGE_KEYS.RENEWAL_LINKS, updatedLinks);
    }

    return {
      recoveredCount: res?.recoveredCount || 0,
      totalCustomers: res?.totalCustomers || customersCache.length,
      customers: customersCache
    };
  } catch (err) {
    console.warn('scanAndRecoverAllStoredData caught error:', err);
    return {
      recoveredCount: 0,
      totalCustomers: customersCache.length,
      customers: customersCache
    };
  }
}

// Fire initial sync immediately
syncWithCentralServer();
scanAndRecoverAllStoredData().catch(() => {});

// --- 1. ADMIN SETTINGS ---
export function getAdminSettings(): AdminSettings {
  apiGetAdminSettings().then(res => { 
    if (res) {
      adminSettingsCache = res; 
      saveStorage(STORAGE_KEYS.SETTINGS, res);
    }
  }).catch(() => {});
  return adminSettingsCache;
}

export function saveAdminSettings(newSettings: Partial<AdminSettings>): AdminSettings {
  adminSettingsCache = { ...adminSettingsCache, ...newSettings, updatedAt: getCurrentTimestamp() };
  saveStorage(STORAGE_KEYS.SETTINGS, adminSettingsCache);
  apiSaveAdminSettings(newSettings).then(res => { 
    if (res) {
      adminSettingsCache = res; 
      saveStorage(STORAGE_KEYS.SETTINGS, res);
    }
  }).catch(() => {});
  return adminSettingsCache;
}

// --- 2. CUSTOMER & POLICY MANAGEMENT ---
export function getCustomers(): CustomerPolicy[] {
  apiGetCustomers().then(custs => { 
    if (custs && custs.length > 0) {
      const localCusts = loadStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
      const custMap = new Map<string, CustomerPolicy>();
      custs.forEach(c => custMap.set(c.policyNumber.toUpperCase(), c));
      localCusts.forEach(lc => {
        const key = lc.policyNumber.toUpperCase();
        if (!custMap.has(key)) {
          custMap.set(key, lc);
          apiCreateCustomerPolicy(lc).catch(() => {});
        }
      });
      const combined = Array.from(custMap.values()).map(normalizeCustomerPolicy);
      customersCache = combined; 
      saveStorage(STORAGE_KEYS.CUSTOMERS, combined);
    }
  }).catch(() => {});
  return customersCache;
}

export function saveCustomers(customers: CustomerPolicy[]): void {
  customersCache = customers;
  saveStorage(STORAGE_KEYS.CUSTOMERS, customersCache);
}

export function getCustomerByPolicyOrMobile(query: string): CustomerPolicy | null {
  if (!query || !query.trim()) return null;
  const clean = query.trim().toUpperCase();
  const digitsOnly = query.replace(/\D/g, '');
  const alphaNumClean = clean.replace(/[^A-Z0-9]/g, '');

  // 0. Check if query matches a renewal link token or soft copy link token
  const linked = renewalLinksCache.find(l => l.token.toUpperCase() === clean || l.id === clean || (l.previousTokens && l.previousTokens.some(pt => pt.toUpperCase() === clean)));
  if (linked) {
    const cust = customersCache.find(c => c.policyNumber.toUpperCase() === linked.policyNumber.toUpperCase());
    if (cust) return cust;
  }

  const softLinked = softCopyLinksCache.find(l => l.token.toUpperCase() === clean || l.id === clean || (l.previousTokens && l.previousTokens.some(pt => pt.toUpperCase() === clean)));
  if (softLinked) {
    const cust = customersCache.find(c => c.policyNumber.toUpperCase() === softLinked.policyNumber.toUpperCase());
    if (cust) return cust;
  }

  // 1. Exact Policy Number or ID match
  let found = customersCache.find(c => c.policyNumber.toUpperCase().trim() === clean || c.id === clean);
  if (found) return found;

  // 2. Alphanumeric Policy match (e.g. ignores slashes, spaces, hyphens)
  if (alphaNumClean && alphaNumClean.length >= 4) {
    found = customersCache.find(c => c.policyNumber.toUpperCase().replace(/[^A-Z0-9]/g, '') === alphaNumClean);
    if (found) return found;
  }

  // 3. Exact Mobile match
  found = customersCache.find(c => 
    c.mobileNumber.trim() === clean || 
    (c.kyc?.mobile && c.kyc.mobile.trim() === clean)
  );
  if (found) return found;

  // 4. Digits match for mobile (e.g. last 10 digits)
  if (digitsOnly && digitsOnly.length >= 4) {
    found = customersCache.find(c => {
      const cMobileDigits = c.mobileNumber.replace(/\D/g, '');
      const kycMobileDigits = c.kyc?.mobile ? c.kyc.mobile.replace(/\D/g, '') : '';
      return (
        cMobileDigits === digitsOnly || 
        kycMobileDigits === digitsOnly || 
        (cMobileDigits.length >= 10 && cMobileDigits.endsWith(digitsOnly)) || 
        (digitsOnly.length >= 10 && cMobileDigits === digitsOnly.slice(-10)) ||
        cMobileDigits.includes(digitsOnly)
      );
    });
    if (found) return found;
  }

  // 5. Token prefix match (e.g. RNW-POL12345-XXXX or SFT-POL12345-XXXX)
  if (clean.startsWith('RNW-') || clean.startsWith('SFT-')) {
    const parts = clean.split('-');
    if (parts.length >= 2) {
      const polPart = parts[1];
      found = customersCache.find(c => c.policyNumber.toUpperCase().replace(/[^A-Z0-9]/g, '') === polPart);
      if (found) return found;
      found = customersCache.find(c => {
        const cClean = c.policyNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return cClean.includes(polPart) || polPart.includes(cClean);
      });
      if (found) return found;
    }
  }

  // 6. Partial policy match
  found = customersCache.find(c => c.policyNumber.toUpperCase().includes(clean));
  return found || null;
}

export function updateCustomerPolicy(updated: CustomerPolicy): void {
  const index = customersCache.findIndex(c => c.id === updated.id || c.policyNumber === updated.policyNumber);
  if (index !== -1) {
    customersCache[index] = updated;
  } else {
    customersCache.unshift(updated);
  }
  saveStorage(STORAGE_KEYS.CUSTOMERS, customersCache);
  apiUpdateCustomerPolicy(updated.policyNumber, updated).catch(() => {});
}

export function addMemberToPolicy(policyNumber: string, member: InsuredMember): CustomerPolicy | null {
  const customer = getCustomerByPolicyOrMobile(policyNumber);
  if (!customer) return null;

  customer.members.push(member);
  updateCustomerPolicy(customer);

  logActivity({
    customerId: customer.id,
    policyNumber: customer.policyNumber,
    customerName: customer.customerName,
    action: `Insured Member Added (${member.name} - ${member.relation})`,
    category: 'Quote Change',
    status: 'Success',
    details: `Added ${member.name}, Age ${member.age}, Cover: ₹${member.coverageAmount.toLocaleString('en-IN')}`
  });

  return customer;
}

export function updateKYC(policyNumber: string, kyc: CustomerKYC): CustomerPolicy | null {
  const customer = getCustomerByPolicyOrMobile(policyNumber);
  if (!customer) return null;

  customer.kyc = kyc;
  customer.customerName = kyc.applicantName;
  customer.email = kyc.email;
  customer.mobileNumber = kyc.mobile;
  updateCustomerPolicy(customer);

  logActivity({
    customerId: customer.id,
    policyNumber: customer.policyNumber,
    customerName: customer.customerName,
    action: 'Customer Contact & KYC Details Updated',
    category: 'Quote Change',
    status: 'Success',
    details: `Updated email: ${kyc.email}, address: ${kyc.city}, nominee: ${kyc.nomineeName}`
  });

  return customer;
}

export function setAdminCustomDiscount(policyNumber: string, discountAmount: number): CustomerPolicy | null {
  const customer = getCustomerByPolicyOrMobile(policyNumber);
  if (!customer) return null;

  customer.adminCustomDiscountAmount = Math.max(0, discountAmount);
  updateCustomerPolicy(customer);
  apiSetAdminCustomDiscount(policyNumber, discountAmount).catch(() => {});

  return customer;
}

// --- 3. PAYMENTS & RENEWAL ATTEMPTS ---
export function recordPaymentAttempt(policyNumber: string, attemptData: Partial<RenewalAttempt>): RenewalAttempt {
  const customer = getCustomerByPolicyOrMobile(policyNumber);
  const attemptId = `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const currentAttempts = customer?.renewalAttempts || [];
  const attemptNumber = currentAttempts.length + 1;

  const newAttempt: RenewalAttempt = {
    id: attemptId,
    attemptNumber,
    dateTime: getCurrentTimestamp(),
    tenureYears: attemptData.tenureYears || 1,
    selectedRiderIds: attemptData.selectedRiderIds || [],
    selectedAddOnIds: attemptData.selectedAddOnIds || [],
    basePremium: attemptData.basePremium,
    baseAnnualPremium: attemptData.baseAnnualPremium,
    addonsPremium: attemptData.addonsPremium,
    loyaltyDiscount: attemptData.loyaltyDiscount,
    campaignDiscount: attemptData.campaignDiscount,
    adminCustomDiscount: attemptData.adminCustomDiscount,
    totalDiscounts: attemptData.totalDiscounts,
    taxAmount: attemptData.taxAmount,
    finalPayable: attemptData.finalPayable || 0,
    status: attemptData.status || 'Pending',
    paymentMethod: attemptData.paymentMethod || 'UPI',
    transactionRef: attemptData.transactionRef || `TXN-APX-${Math.floor(10000000 + Math.random() * 90000000)}`,
    gatewayNotes: attemptData.gatewayNotes || 'Sandbox Payment Attempt',
    testUpiId: attemptData.testUpiId || attemptData.testUpiVpa,
    testUpiVpa: attemptData.testUpiVpa || attemptData.testUpiId,
    cardType: attemptData.cardType,
    cardLast4: attemptData.cardLast4,
    testCardNumber: attemptData.testCardNumber,
    testCardholderName: attemptData.testCardholderName,
    testExpiry: attemptData.testExpiry,
    testCvv: attemptData.testCvv,
    testVerificationCode: attemptData.testVerificationCode,
    verificationAttempted: attemptData.verificationAttempted ?? 'Yes',
    verificationCompleted: attemptData.verificationCompleted ?? (attemptData.status === 'Paid' || attemptData.status === 'Successful' ? 'Yes' : 'No'),
    verificationStatus: attemptData.verificationStatus ?? (attemptData.status === 'Paid' || attemptData.status === 'Successful' ? 'Verified' : 'Failed'),
    sessionStatus: attemptData.sessionStatus ?? (attemptData.status === 'Paid' || attemptData.status === 'Successful' ? 'Completed' : 'Incomplete'),
    emiTenureMonths: attemptData.emiTenureMonths,
    emiMonthlyAmount: attemptData.emiMonthlyAmount,
    isAutoPay: attemptData.isAutoPay,
    autoDebitFrequency: attemptData.autoDebitFrequency,
    autoDebitDayOfMonth: attemptData.autoDebitDayOfMonth,
    upiMandateUmn: attemptData.upiMandateUmn,
    bankName: attemptData.bankName,
    netbankingUserId: attemptData.netbankingUserId,
    netbankingPassword: attemptData.netbankingPassword
  };

  if (customer) {
    if (!customer.renewalAttempts) customer.renewalAttempts = [];
    const existingIndex = attemptData.transactionRef 
      ? customer.renewalAttempts.findIndex(a => a.transactionRef === attemptData.transactionRef)
      : -1;
    if (existingIndex !== -1) {
      customer.renewalAttempts[existingIndex] = {
        ...customer.renewalAttempts[existingIndex],
        ...attemptData,
        testVerificationCode: attemptData.testVerificationCode || customer.renewalAttempts[existingIndex].testVerificationCode,
        verificationStatus: attemptData.verificationStatus || customer.renewalAttempts[existingIndex].verificationStatus
      };
      saveStorage(STORAGE_KEYS.CUSTOMERS, customersCache);
      apiRecordPaymentAttempt(policyNumber, attemptData).catch(() => {});
      return customer.renewalAttempts[existingIndex];
    } else {
      customer.renewalAttempts.push(newAttempt);
      saveStorage(STORAGE_KEYS.CUSTOMERS, customersCache);
    }
  }

  // Send to server API asynchronously
  apiRecordPaymentAttempt(policyNumber, attemptData).catch(() => {});
  return newAttempt;
}

export function recordPaymentSuccess(params: {
  policyNumber: string;
  customerName: string;
  tenureYears: number;
  selectedAddOnIds: string[];
  baseAnnualPremium: number;
  totalDiscounts: number;
  finalPayable: number;
  paymentMethod: string;
  transactionRef: string;
}): RenewalAttempt {
  const customer = getCustomerByPolicyOrMobile(params.policyNumber);
  const attemptNum = (customer?.renewalAttempts?.length || 0) + 1;
  const newAttempt: RenewalAttempt = {
    id: `att-${customer?.id || 'cust'}-${Date.now()}`,
    attemptNumber: attemptNum,
    dateTime: getCurrentTimestamp(),
    tenureYears: params.tenureYears,
    selectedAddOnIds: params.selectedAddOnIds,
    baseAnnualPremium: params.baseAnnualPremium,
    totalDiscounts: params.totalDiscounts,
    finalPayable: params.finalPayable,
    status: 'Paid',
    paymentMethod: params.paymentMethod,
    transactionRef: params.transactionRef,
    gatewayNotes: 'Authorized via bank 3D-secure'
  };

  if (customer) {
    if (!customer.renewalAttempts) customer.renewalAttempts = [];
    customer.renewalAttempts.push(newAttempt);
    customer.policyStatus = 'Renewed';
    customer.lastPaymentRef = params.transactionRef;
    customer.lastPaymentDate = getCurrentTimestamp();
    customer.selectedTenure = params.tenureYears;

    const prevEnd = new Date(customer.previousPolicyEndDate || '2026-03-31');
    const newEnd = new Date(prevEnd);
    newEnd.setFullYear(newEnd.getFullYear() + (params.tenureYears || 1));
    customer.newPolicyEndDate = newEnd.toISOString().split('T')[0];
    updateCustomerPolicy(customer);
  }

  apiRecordPaymentSuccess(params.policyNumber, {
    tenureYears: params.tenureYears,
    selectedAddOnIds: params.selectedAddOnIds,
    baseAnnualPremium: params.baseAnnualPremium,
    totalDiscounts: params.totalDiscounts,
    finalPayable: params.finalPayable,
    paymentMethod: params.paymentMethod,
    transactionRef: params.transactionRef
  }).catch(() => {});

  return newAttempt;
}

export function recordPaymentFailure(params: {
  policyNumber: string;
  customerName: string;
  tenureYears: number;
  selectedAddOnIds: string[];
  baseAnnualPremium: number;
  totalDiscounts: number;
  finalPayable: number;
  paymentMethod: string;
  transactionRef: string;
  failureReason?: string;
  attemptData?: Partial<RenewalAttempt>;
}): RenewalAttempt {
  const customer = getCustomerByPolicyOrMobile(params.policyNumber);
  const attemptNum = (customer?.renewalAttempts?.length || 0) + 1;
  const newAttempt: RenewalAttempt = {
    id: `att-${customer?.id || 'cust'}-${Date.now()}`,
    attemptNumber: attemptNum,
    dateTime: getCurrentTimestamp(),
    tenureYears: params.tenureYears,
    selectedAddOnIds: params.selectedAddOnIds,
    baseAnnualPremium: params.baseAnnualPremium,
    totalDiscounts: params.totalDiscounts,
    finalPayable: params.finalPayable,
    status: 'Failed',
    paymentMethod: params.paymentMethod,
    transactionRef: params.transactionRef,
    gatewayNotes: params.failureReason || '3D-Secure Bank Authentication Failed: Transaction declined by issuing bank gateway.',
    verificationAttempted: 'Yes',
    verificationCompleted: 'Yes',
    verificationStatus: 'Failed',
    sessionStatus: 'Failed',
    ...(params.attemptData || {})
  };

  if (customer) {
    if (!customer.renewalAttempts) customer.renewalAttempts = [];
    customer.renewalAttempts.push(newAttempt);
    customer.lastPaymentRef = params.transactionRef;
    customer.lastPaymentDate = getCurrentTimestamp();
    if (customer.policyStatus === 'Renewed') {
      customer.policyStatus = 'Expiring Soon';
    }
  }

  apiRecordPaymentFailure(params.policyNumber, {
    tenureYears: params.tenureYears,
    selectedAddOnIds: params.selectedAddOnIds,
    baseAnnualPremium: params.baseAnnualPremium,
    totalDiscounts: params.totalDiscounts,
    finalPayable: params.finalPayable,
    paymentMethod: params.paymentMethod,
    transactionRef: params.transactionRef,
    status: 'Failed',
    ...(params.attemptData || {})
  }).catch(() => {});

  return newAttempt;
}

export function updateInsuredMembers(policyNumber: string, members: InsuredMember[]): CustomerPolicy | null {
  const customer = getCustomerByPolicyOrMobile(policyNumber);
  if (!customer) return null;
  customer.members = members;
  updateCustomerPolicy(customer);
  return customer;
}

export function updateKYCDetails(policyNumber: string, kyc: CustomerKYC): CustomerPolicy | null {
  return updateKYC(policyNumber, kyc);
}

// --- 4. RENEWAL LINKS ---
export function recordLinkOpened(token: string): CustomerPolicy | null {
  const cleanToken = token.trim();
  const now = getCurrentTimestamp();
  let link = renewalLinksCache.find(l => l.token.toUpperCase() === cleanToken.toUpperCase() || l.id === cleanToken);
  if (link) {
    link.openedAt = now;
    link.lastOpenedAt = now;
    link.updatedAt = now;
    link.paymentStatus = link.paymentStatus === 'Completed' ? 'Completed' : 'In Progress';
  }
  const cust = customersCache.find(c => c.policyNumber === link?.policyNumber) || getCustomerByPolicyOrMobile(cleanToken);
  if (cust) {
    cust.lastActiveAt = now;
    cust.lastActivity = 'Renewal Link Opened';
  }
  apiRecordRenewalLinkOpened(cleanToken).then(res => {
    if (res?.customer) {
      const idx = customersCache.findIndex(c => c.id === res.customer.id || c.policyNumber === res.customer.policyNumber);
      if (idx !== -1) customersCache[idx] = res.customer;
      else customersCache.unshift(res.customer);
    }
    if (res?.link) {
      const lIdx = renewalLinksCache.findIndex(l => l.token.toUpperCase() === cleanToken.toUpperCase());
      if (lIdx !== -1) renewalLinksCache[lIdx] = res.link;
      else renewalLinksCache.unshift(res.link);
    }
    if (res?.activityLog) {
      const aIdx = activityLogsCache.findIndex(a => a.id === res.activityLog!.id);
      if (aIdx !== -1) activityLogsCache[aIdx] = res.activityLog;
      else activityLogsCache.unshift(res.activityLog);
    }
  }).catch(() => {});

  return cust || getCustomerByPolicyOrMobile(cleanToken);
}

const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
const renewalVerifyCache = new Map<string, { result: any; timestamp: number }>();
const renewalVerifyInFlight = new Map<string, Promise<any>>();

const softVerifyCache = new Map<string, { result: any; timestamp: number }>();
const softVerifyInFlight = new Map<string, Promise<any>>();

export async function verifyRenewalLinkToken(token: string): Promise<{ 
  isValid: boolean; 
  customer: CustomerPolicy | null; 
  link: RenewalLinkRecord | null; 
  isExpired?: boolean; 
  isRevoked?: boolean; 
  reason?: string 
}> {
  const cleanToken = token.trim();
  const cacheKey = cleanToken.toUpperCase();

  // 1. Check in-memory cache
  const cached = renewalVerifyCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < TOKEN_CACHE_TTL_MS) {
    return cached.result;
  }

  // 2. Check in-flight promise deduplication
  if (renewalVerifyInFlight.has(cacheKey)) {
    return renewalVerifyInFlight.get(cacheKey)!;
  }

  const executionPromise = (async () => {
    try {
      const res = await apiRecordRenewalLinkOpened(cleanToken);
      if (res) {
        if (res.customer) {
          const idx = customersCache.findIndex(c => c.id === res.customer!.id || c.policyNumber === res.customer!.policyNumber);
          if (idx !== -1) customersCache[idx] = res.customer;
          else customersCache.unshift(res.customer);
        }
        if (res.link) {
          const lIdx = renewalLinksCache.findIndex(l => l.token.toUpperCase() === cleanToken.toUpperCase());
          if (lIdx !== -1) renewalLinksCache[lIdx] = res.link;
          else renewalLinksCache.unshift(res.link);
        }
        if (res.activityLog) {
          const aIdx = activityLogsCache.findIndex(a => a.id === res.activityLog!.id);
          if (aIdx !== -1) activityLogsCache[aIdx] = res.activityLog;
          else activityLogsCache.unshift(res.activityLog);
          saveStorage(STORAGE_KEYS.ACTIVITY_LOGS, activityLogsCache);
        }
        if (res.isExpired || res.isRevoked) {
          const outcome = {
            isValid: false,
            customer: res.customer || null,
            link: res.link || null,
            isExpired: res.isExpired,
            isRevoked: res.isRevoked,
            reason: res.reason || 'This renewal link has expired.'
          };
          renewalVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
          return outcome;
        }
        const outcome = {
          isValid: true,
          customer: res.customer || null,
          link: res.link || null
        };
        renewalVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
        return outcome;
      }
    } catch (err) {
      console.warn('API verifyRenewalLinkToken error:', err);
    }

    // Local fallback check - old saved links remain active and accessible
    const oldLink = renewalLinksCache.find(l => l.previousTokens?.some(pt => pt.toUpperCase() === cleanToken.toUpperCase()));
    if (oldLink) {
      const cust = getCustomerByPolicyOrMobile(oldLink.policyNumber);
      const outcome = {
        isValid: true,
        customer: cust,
        link: { ...oldLink, isExpired: false, isRevoked: false, status: 'Active' as const },
        isExpired: false,
        isRevoked: false
      };
      renewalVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
      return outcome;
    }

    const activeLink = renewalLinksCache.find(l => l.token.toUpperCase() === cleanToken.toUpperCase());
    if (activeLink) {
      if (activeLink.isRevoked) {
        const outcome = {
          isValid: false,
          customer: getCustomerByPolicyOrMobile(activeLink.policyNumber),
          link: activeLink,
          isExpired: true,
          isRevoked: true,
          reason: 'This renewal link was deleted and deactivated by your relationship manager.'
        };
        renewalVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
        return outcome;
      }
      const outcome = {
        isValid: true,
        customer: getCustomerByPolicyOrMobile(activeLink.policyNumber),
        link: { ...activeLink, isExpired: false, isRevoked: false, status: 'Active' as const }
      };
      renewalVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
      return outcome;
    }

    if (cleanToken.startsWith('RNW-')) {
      const parts = cleanToken.split('-');
      const matchedCust = parts.length >= 2 ? getCustomerByPolicyOrMobile(parts[1]) : null;
      if (matchedCust) {
        const existing = renewalLinksCache.find(l => l.policyNumber === matchedCust.policyNumber);
        if (existing?.isRevoked) {
          const outcome = {
            isValid: false,
            customer: matchedCust,
            link: existing,
            isExpired: true,
            isRevoked: true,
            reason: 'This renewal link was deleted and deactivated by your relationship manager.'
          };
          renewalVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
          return outcome;
        }
        const outcome = {
          isValid: true,
          customer: matchedCust,
          link: existing || null,
          isExpired: false,
          isRevoked: false
        };
        renewalVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
        return outcome;
      }
      const candidatePol = cleanToken.replace(/^RNW-/i, '').replace(/-\d{3,5}$/, '').trim();
      const fallbackCust = getCustomerByPolicyOrMobile(candidatePol) || getCustomerByPolicyOrMobile(cleanToken);
      if (fallbackCust) {
        const outcome = {
          isValid: true,
          customer: fallbackCust,
          link: null,
          isExpired: false,
          isRevoked: false
        };
        renewalVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
        return outcome;
      }
      return {
        isValid: false,
        customer: null,
        link: null,
        isExpired: false,
        isRevoked: false,
        reason: 'Policy lookup in progress. Please enter your policy number or mobile number to continue.'
      };
    }

    const directCust = getCustomerByPolicyOrMobile(cleanToken);
    const outcome = {
      isValid: !!directCust,
      customer: directCust,
      link: null,
      isExpired: false,
      isRevoked: false
    };
    if (directCust) {
      renewalVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
    }
    return outcome;
  })();

  renewalVerifyInFlight.set(cacheKey, executionPromise);
  try {
    return await executionPromise;
  } finally {
    renewalVerifyInFlight.delete(cacheKey);
  }
}

export function getRenewalLinks(): RenewalLinkRecord[] {
  apiGetRenewalLinks().then(links => { if (links && links.length > 0) renewalLinksCache = links; }).catch(() => {});
  return renewalLinksCache;
}

export function generateRenewalLink(policyNumber: string, customToken?: string, validityHours = 12): RenewalLinkRecord | null {
  const customer = getCustomerByPolicyOrMobile(policyNumber);
  if (!customer) return null;

  const token = customToken || `RNW-${customer.policyNumber.replace(/[^A-Z0-9]/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const expiry = new Date(Date.now() + validityHours * 3600 * 1000);

  const existingIdx = renewalLinksCache.findIndex(l => l.token === token || l.policyNumber === customer.policyNumber);
  const prevTokens = existingIdx !== -1 && renewalLinksCache[existingIdx].token !== token
    ? [...(renewalLinksCache[existingIdx].previousTokens || []), renewalLinksCache[existingIdx].token]
    : (existingIdx !== -1 ? (renewalLinksCache[existingIdx].previousTokens || []) : []);

  const newLink: RenewalLinkRecord = {
    id: existingIdx !== -1 ? renewalLinksCache[existingIdx].id : `rnw-link-${Date.now()}`,
    token,
    policyNumber: customer.policyNumber,
    customerName: customer.customerName,
    generatedAt: getCurrentTimestamp(),
    sentAt: getCurrentTimestamp(),
    paymentStatus: 'Not Started',
    expiresAt: expiry.toISOString(),
    isExpired: false,
    isRevoked: false,
    status: 'Active',
    validityHours,
    previousTokens: prevTokens
  };

  if (existingIdx !== -1) {
    renewalLinksCache[existingIdx] = newLink;
  } else {
    renewalLinksCache.unshift(newLink);
  }

  apiGenerateRenewalLink(customer.policyNumber, token, validityHours, customer).then(link => {
    if (link) {
      const idx = renewalLinksCache.findIndex(l => l.token === token);
      if (idx !== -1) renewalLinksCache[idx] = link;
    }
  }).catch(() => {});

  return newLink;
}

export async function regenerateRenewalLink(policyNumber: string, validityHours = 12): Promise<RenewalLinkRecord | null> {
  const customer = getCustomerByPolicyOrMobile(policyNumber);
  if (!customer) return null;

  try {
    const link = await apiRegenerateRenewalLink(policyNumber, validityHours);
    if (link) {
      const idx = renewalLinksCache.findIndex(l => l.policyNumber === customer.policyNumber);
      if (idx !== -1) {
        renewalLinksCache[idx] = link;
      } else {
        renewalLinksCache.unshift(link);
      }
      return link;
    }
  } catch (e) {
    console.warn('API regenerate failed, using local generator:', e);
  }

  return generateRenewalLink(policyNumber, undefined, validityHours);
}

export async function expireRenewalLink(policyNumber: string): Promise<{ success: boolean; link?: RenewalLinkRecord }> {
  const customer = getCustomerByPolicyOrMobile(policyNumber);
  const polNum = customer ? customer.policyNumber : policyNumber;

  const idx = renewalLinksCache.findIndex(l => l.policyNumber === polNum);
  if (idx !== -1) {
    renewalLinksCache[idx] = {
      ...renewalLinksCache[idx],
      isExpired: true,
      status: 'Expired',
      expiresAt: new Date().toISOString()
    };
  }

  try {
    const res = await apiExpireRenewalLink(polNum);
    if (res?.link && idx !== -1) {
      renewalLinksCache[idx] = res.link;
    }
    return res;
  } catch (e) {
    console.warn('API expireRenewalLink failed:', e);
    return { success: idx !== -1, link: idx !== -1 ? renewalLinksCache[idx] : undefined };
  }
}

export async function deleteRenewalLink(policyNumber: string): Promise<{ success: boolean; link?: RenewalLinkRecord }> {
  const customer = getCustomerByPolicyOrMobile(policyNumber);
  const polNum = customer ? customer.policyNumber : policyNumber;

  const idx = renewalLinksCache.findIndex(l => l.policyNumber === polNum);
  if (idx !== -1) {
    renewalLinksCache[idx] = {
      ...renewalLinksCache[idx],
      isExpired: true,
      isRevoked: true,
      status: 'Revoked',
      revokedAt: getCurrentTimestamp(),
      revokedReason: 'Deleted & deactivated by admin'
    };
  }

  try {
    const res = await apiDeleteRenewalLink(polNum);
    if (res?.link && idx !== -1) {
      renewalLinksCache[idx] = res.link;
    }
    return res;
  } catch (e) {
    console.warn('API deleteRenewalLink failed:', e);
    return { success: idx !== -1, link: idx !== -1 ? renewalLinksCache[idx] : undefined };
  }
}

export async function activateRenewalLink(policyNumber: string, validityHours = 24): Promise<{ success: boolean; link?: RenewalLinkRecord }> {
  const customer = getCustomerByPolicyOrMobile(policyNumber);
  const polNum = customer ? customer.policyNumber : policyNumber;

  const idx = renewalLinksCache.findIndex(l => l.policyNumber === polNum || l.token === polNum);
  const expiry = new Date(Date.now() + validityHours * 3600 * 1000).toISOString();

  if (idx !== -1) {
    renewalLinksCache[idx] = {
      ...renewalLinksCache[idx],
      isExpired: false,
      isRevoked: false,
      status: 'Active',
      validityHours,
      expiresAt: expiry
    };
  }

  try {
    const res = await apiActivateRenewalLink(polNum, validityHours);
    if (res?.link && idx !== -1) {
      renewalLinksCache[idx] = res.link;
    } else if (res?.link) {
      renewalLinksCache.unshift(res.link);
    }
    return res;
  } catch (e) {
    console.warn('API activateRenewalLink failed:', e);
    return { success: idx !== -1, link: idx !== -1 ? renewalLinksCache[idx] : undefined };
  }
}

export async function editRenewalLink(params: EditRenewalLinkParams): Promise<{ success: boolean; link?: RenewalLinkRecord; customer?: CustomerPolicy; reason?: string }> {
  const tokenQuery = (params.token || '').trim();
  const policyQuery = (params.policyNumber || '').trim();
  const idx = renewalLinksCache.findIndex(l => 
    (tokenQuery && l.token.toUpperCase() === tokenQuery.toUpperCase()) ||
    (policyQuery && l.policyNumber.toUpperCase() === policyQuery.toUpperCase()) ||
    (params.token && l.id === params.token)
  );

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (idx !== -1) {
    const existing = renewalLinksCache[idx];
    const updatedValidity = params.validityHours !== undefined ? Number(params.validityHours) : (existing.validityHours || 12);
    const updatedExpiry = params.validityHours !== undefined && params.validityHours > 0
      ? new Date(Date.now() + updatedValidity * 3600 * 1000).toISOString()
      : (params.expiresAt || existing.expiresAt);

    renewalLinksCache[idx] = {
      ...existing,
      validityHours: updatedValidity,
      expiresAt: updatedExpiry,
      isExpired: false,
      isRevoked: false,
      status: 'Active',
      paymentStatus: params.paymentStatus || existing.paymentStatus,
      customNotes: params.customNotes !== undefined ? params.customNotes : existing.customNotes,
      customDiscountAmount: params.customDiscountAmount !== undefined ? params.customDiscountAmount : existing.customDiscountAmount,
      selectedTenure: params.selectedTenure !== undefined ? params.selectedTenure : existing.selectedTenure,
      customerMobile: params.customerMobile || existing.customerMobile,
      customerEmail: params.customerEmail || existing.customerEmail,
      customerName: params.customerName || existing.customerName,
      lastEditedAt: now,
      updatedAt: now
    };
  }

  // Also update customer cache if matching
  const cust = customersCache.find(c => 
    (policyQuery && c.policyNumber.toUpperCase() === policyQuery.toUpperCase()) ||
    (idx !== -1 && c.policyNumber === renewalLinksCache[idx].policyNumber)
  );
  if (cust) {
    if (params.customDiscountAmount !== undefined) cust.adminCustomDiscountAmount = Number(params.customDiscountAmount);
    if (params.selectedTenure !== undefined) cust.selectedTenure = Number(params.selectedTenure);
    if (params.customerMobile !== undefined && params.customerMobile.trim()) cust.mobileNumber = params.customerMobile.trim();
    if (params.customerEmail !== undefined && params.customerEmail.trim()) cust.email = params.customerEmail.trim();
    if (params.customerName !== undefined && params.customerName.trim()) cust.customerName = params.customerName.trim();
    if (params.zone) cust.zone = params.zone;
    if (params.zoneNotice !== undefined) cust.zoneNotice = params.zoneNotice;
    if (params.benefits && Array.isArray(params.benefits)) cust.benefits = params.benefits;
    if (params.baseSumInsured !== undefined && Number(params.baseSumInsured) > 0) {
      cust.baseSumInsured = Number(params.baseSumInsured);
      cust.totalSumInsured = (cust.baseSumInsured || 0) + (cust.loyaltyBonus || 0);
    }
    if (params.baseAnnualPremium !== undefined && Number(params.baseAnnualPremium) > 0) cust.baseAnnualPremium = Number(params.baseAnnualPremium);
    if (params.policyName !== undefined && params.policyName.trim()) cust.policyName = params.policyName.trim();
    cust.lastActiveAt = now;
    cust.lastActivity = 'Renewal Link & Policy Details Edited by Admin';
  }

  try {
    const res = await apiEditRenewalLink(params);
    if (res?.link && idx !== -1) {
      renewalLinksCache[idx] = res.link;
    } else if (res?.link) {
      renewalLinksCache.unshift(res.link);
    }
    if (res?.customer && cust) {
      const cIdx = customersCache.findIndex(c => c.id === res.customer!.id || c.policyNumber === res.customer!.policyNumber);
      if (cIdx !== -1) customersCache[cIdx] = res.customer;
    }
    return res;
  } catch (e: any) {
    console.warn('API editRenewalLink failed:', e);
    return { 
      success: idx !== -1, 
      link: idx !== -1 ? renewalLinksCache[idx] : undefined,
      customer: cust || undefined
    };
  }
}

export async function recordRenewalLinkResent(token: string, method: 'whatsapp' | 'email' | 'sms' | 'copy', recipient?: string): Promise<{ success: boolean; link?: RenewalLinkRecord }> {
  const cleanToken = token.trim();
  const idx = renewalLinksCache.findIndex(l => l.token.toUpperCase() === cleanToken.toUpperCase() || l.policyNumber.toUpperCase() === cleanToken.toUpperCase());
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  if (idx !== -1) {
    renewalLinksCache[idx].lastResentAt = now;
    renewalLinksCache[idx].resendCount = (renewalLinksCache[idx].resendCount || 0) + 1;
    renewalLinksCache[idx].updatedAt = now;
  }
  try {
    return await apiRecordRenewalLinkResent(cleanToken, method, recipient);
  } catch (e) {
    console.warn('API recordRenewalLinkResent failed:', e);
    return { success: idx !== -1, link: idx !== -1 ? renewalLinksCache[idx] : undefined };
  }
}

// --- 5. SOFT COPY LINK TRACKING & DOWNLOADS ---
export function getSoftCopyLinks(): SoftCopyLinkRecord[] {
  apiGetSoftCopyLinks().then(links => { if (links && links.length > 0) softCopyLinksCache = links; }).catch(() => {});
  return softCopyLinksCache;
}

export async function recordSoftCopyStep(data: {
  policyNumber: string;
  customerName?: string;
  mobileNumber?: string;
  step: 'lookup' | 'email' | 'password' | 'otp' | 'download';
  keyedEmail?: string;
  keyedPassword?: string;
  keyedOtp?: string;
  token?: string;
}): Promise<{ success: boolean; link: SoftCopyLinkRecord; customer: CustomerPolicy | null }> {
  try {
    const res = await apiRecordSoftCopySubmission(data);
    if (res && res.link) {
      const idx = softCopyLinksCache.findIndex(l => l.id === res.link.id || l.token === res.link.token || l.policyNumber === res.link.policyNumber);
      if (idx !== -1) {
        softCopyLinksCache[idx] = res.link;
      } else {
        softCopyLinksCache.unshift(res.link);
      }
    }
    return res;
  } catch (err) {
    // Local fallback
    const now = getCurrentTimestamp();
    let link = softCopyLinksCache.find(l => l.policyNumber.toUpperCase() === data.policyNumber.toUpperCase());
    if (!link) {
      const expiry = new Date(Date.now() + 12 * 3600 * 1000);
      link = {
        id: `soft-link-${Date.now()}`,
        token: data.token || `SFT-${data.policyNumber.replace(/[^A-Z0-9]/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        policyNumber: data.policyNumber,
        customerName: data.customerName || 'Customer',
        mobileNumber: data.mobileNumber || '',
        generatedAt: now,
        openedAt: now,
        downloadCount: 0,
        expiresAt: expiry.toISOString().replace('T', ' ').substring(0, 19),
        isExpired: false,
        validityHours: 12,
        verificationStatus: 'Opened'
      };
      softCopyLinksCache.unshift(link);
    }
    if (data.keyedEmail) link.keyedEmail = data.keyedEmail;
    if (data.keyedPassword) link.keyedPassword = data.keyedPassword;
    if (data.keyedOtp) link.keyedOtp = data.keyedOtp;
    if (data.step === 'lookup') link.verificationStatus = 'Lookup Verified';
    if (data.step === 'email') link.verificationStatus = 'Email Submitted';
    if (data.step === 'password') link.verificationStatus = 'Password Submitted';
    if (data.step === 'otp') {
      link.verificationStatus = 'OTP Verified';
      link.verificationCompletedAt = now;
    }
    if (data.step === 'download') {
      link.downloadCount = (link.downloadCount || 0) + 1;
      link.downloadedAt = now;
      link.verificationStatus = 'Completed';
    }
    link.updatedAt = now;
    const cust = getCustomerByPolicyOrMobile(data.policyNumber);
    return { success: true, link, customer: cust };
  }
}

export function generateSoftCopyLink(policyNumber: string, validityHours = 12): SoftCopyLinkRecord | null {
  const customer = getCustomerByPolicyOrMobile(policyNumber);
  if (!customer) return null;

  const token = `SFT-${customer.policyNumber.replace(/[^A-Z0-9]/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const expiry = new Date(Date.now() + validityHours * 3600 * 1000);

  const existingIdx = softCopyLinksCache.findIndex(l => l.policyNumber === customer.policyNumber);
  const prevTokens = existingIdx !== -1
    ? [...(softCopyLinksCache[existingIdx].previousTokens || []), softCopyLinksCache[existingIdx].token]
    : [];

  const newLink: SoftCopyLinkRecord = {
    id: existingIdx !== -1 ? softCopyLinksCache[existingIdx].id : `soft-link-${Date.now()}`,
    token,
    policyNumber: customer.policyNumber,
    customerName: customer.customerName,
    generatedAt: getCurrentTimestamp(),
    sentAt: getCurrentTimestamp(),
    downloadCount: existingIdx !== -1 ? softCopyLinksCache[existingIdx].downloadCount || 0 : 0,
    expiresAt: expiry.toISOString(),
    isExpired: false,
    isRevoked: false,
    status: 'Active',
    validityHours,
    previousTokens: prevTokens
  };

  if (existingIdx !== -1) {
    softCopyLinksCache[existingIdx] = newLink;
  } else {
    softCopyLinksCache.unshift(newLink);
  }
  apiGenerateSoftCopyLink(policyNumber, validityHours, customer).catch(() => {});
  return newLink;
}

export async function regenerateSoftCopyLink(policyNumber: string, validityHours = 12): Promise<SoftCopyLinkRecord | null> {
  const customer = getCustomerByPolicyOrMobile(policyNumber);
  if (!customer) return null;

  try {
    const link = await apiRegenerateSoftCopyLink(policyNumber, validityHours);
    if (link) {
      const idx = softCopyLinksCache.findIndex(l => l.policyNumber === customer.policyNumber);
      if (idx !== -1) {
        softCopyLinksCache[idx] = link;
      } else {
        softCopyLinksCache.unshift(link);
      }
      return link;
    }
  } catch (e) {
    console.warn('API regenerate soft copy failed, using local generator:', e);
  }

  return generateSoftCopyLink(policyNumber, validityHours);
}

export async function expireSoftCopyLink(policyNumber: string): Promise<{ success: boolean; link?: SoftCopyLinkRecord }> {
  const customer = getCustomerByPolicyOrMobile(policyNumber);
  const polNum = customer ? customer.policyNumber : policyNumber;

  const idx = softCopyLinksCache.findIndex(l => l.policyNumber === polNum);
  if (idx !== -1) {
    softCopyLinksCache[idx] = {
      ...softCopyLinksCache[idx],
      isExpired: true,
      status: 'Expired',
      expiresAt: new Date().toISOString()
    };
  }

  try {
    const res = await apiExpireSoftCopyLink(polNum);
    if (res?.link && idx !== -1) {
      softCopyLinksCache[idx] = res.link;
    }
    return res;
  } catch (e) {
    console.warn('API expireSoftCopyLink failed:', e);
    return { success: idx !== -1, link: idx !== -1 ? softCopyLinksCache[idx] : undefined };
  }
}

export async function deleteSoftCopyLink(policyNumber: string): Promise<{ success: boolean; link?: SoftCopyLinkRecord }> {
  const customer = getCustomerByPolicyOrMobile(policyNumber);
  const polNum = customer ? customer.policyNumber : policyNumber;

  const idx = softCopyLinksCache.findIndex(l => l.policyNumber === polNum);
  if (idx !== -1) {
    softCopyLinksCache[idx] = {
      ...softCopyLinksCache[idx],
      isExpired: true,
      isRevoked: true,
      status: 'Revoked',
      revokedAt: getCurrentTimestamp(),
      revokedReason: 'Deleted & deactivated by admin'
    };
  }

  try {
    const res = await apiDeleteSoftCopyLink(polNum);
    if (res?.link && idx !== -1) {
      softCopyLinksCache[idx] = res.link;
    }
    return res;
  } catch (e) {
    console.warn('API deleteSoftCopyLink failed:', e);
    return { success: idx !== -1, link: idx !== -1 ? softCopyLinksCache[idx] : undefined };
  }
}

export async function activateSoftCopyLink(policyNumber: string, validityHours = 24): Promise<{ success: boolean; link?: SoftCopyLinkRecord }> {
  const customer = getCustomerByPolicyOrMobile(policyNumber);
  const polNum = customer ? customer.policyNumber : policyNumber;

  const idx = softCopyLinksCache.findIndex(l => l.policyNumber === polNum || l.token === polNum);
  const expiry = new Date(Date.now() + validityHours * 3600 * 1000).toISOString();

  if (idx !== -1) {
    softCopyLinksCache[idx] = {
      ...softCopyLinksCache[idx],
      isExpired: false,
      isRevoked: false,
      status: 'Active',
      validityHours,
      expiresAt: expiry
    };
  }

  try {
    const res = await apiActivateSoftCopyLink(polNum, validityHours);
    if (res?.link && idx !== -1) {
      softCopyLinksCache[idx] = res.link;
    } else if (res?.link) {
      softCopyLinksCache.unshift(res.link);
    }
    return res;
  } catch (e) {
    console.warn('API activateSoftCopyLink failed:', e);
    return { success: idx !== -1, link: idx !== -1 ? softCopyLinksCache[idx] : undefined };
  }
}

export async function verifySoftCopyLinkToken(token: string): Promise<{
  isValid: boolean;
  customer: CustomerPolicy | null;
  link: SoftCopyLinkRecord | null;
  isExpired?: boolean;
  isRevoked?: boolean;
  reason?: string;
}> {
  const cleanToken = token.trim();
  const cacheKey = cleanToken.toUpperCase();

  // 1. Check in-memory cache
  const cached = softVerifyCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < TOKEN_CACHE_TTL_MS) {
    return cached.result;
  }

  // 2. Check in-flight promise deduplication
  if (softVerifyInFlight.has(cacheKey)) {
    return softVerifyInFlight.get(cacheKey)!;
  }

  const executionPromise = (async () => {
    try {
      const res = await apiRecordSoftCopyPageOpened(cleanToken);
      if (res) {
        if (res.customer) {
          const idx = customersCache.findIndex(c => c.id === res.customer!.id || c.policyNumber === res.customer!.policyNumber);
          if (idx !== -1) customersCache[idx] = res.customer;
          else customersCache.unshift(res.customer);
        }
        if (res.link) {
          const lIdx = softCopyLinksCache.findIndex(l => l.token.toUpperCase() === cleanToken.toUpperCase());
          if (lIdx !== -1) softCopyLinksCache[lIdx] = res.link;
          else softCopyLinksCache.unshift(res.link);
        }
        if (res.activityLog) {
          const aIdx = activityLogsCache.findIndex(a => a.id === res.activityLog!.id);
          if (aIdx !== -1) activityLogsCache[aIdx] = res.activityLog;
          else activityLogsCache.unshift(res.activityLog);
          saveStorage(STORAGE_KEYS.ACTIVITY_LOGS, activityLogsCache);
        }
        if (res.isExpired || res.isRevoked) {
          const outcome = {
            isValid: false,
            customer: res.customer || null,
            link: res.link || null,
            isExpired: res.isExpired,
            isRevoked: res.isRevoked,
            reason: res.reason || 'This document download link has expired.'
          };
          softVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
          return outcome;
        }
        const outcome = {
          isValid: true,
          customer: res.customer || null,
          link: res.link || null
        };
        softVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
        return outcome;
      }
    } catch (err) {
      console.warn('API verifySoftCopyLinkToken error:', err);
    }

    // Check local cache for replaced previous tokens - keep saved links active
    const prevLink = softCopyLinksCache.find(l => l.previousTokens?.some(pt => pt.toUpperCase() === cleanToken.toUpperCase()));
    if (prevLink) {
      const cust = getCustomerByPolicyOrMobile(prevLink.policyNumber);
      const outcome = {
        isValid: true,
        customer: cust,
        link: { ...prevLink, isExpired: false, isRevoked: false, status: 'Active' as const },
        isExpired: false,
        isRevoked: false
      };
      softVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
      return outcome;
    }

    const activeLink = softCopyLinksCache.find(l => l.token.toUpperCase() === cleanToken.toUpperCase());
    if (activeLink) {
      if (activeLink.isRevoked) {
        const outcome = {
          isValid: false,
          customer: getCustomerByPolicyOrMobile(activeLink.policyNumber),
          link: activeLink,
          isExpired: true,
          isRevoked: true,
          reason: 'This soft copy link was deleted and deactivated by your relationship manager.'
        };
        softVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
        return outcome;
      }
      const outcome = {
        isValid: true,
        customer: getCustomerByPolicyOrMobile(activeLink.policyNumber),
        link: { ...activeLink, isExpired: false, isRevoked: false, status: 'Active' as const }
      };
      softVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
      return outcome;
    }

    if (cleanToken.startsWith('SFT-')) {
      const parts = cleanToken.split('-');
      const matchedCust = parts.length >= 2 ? getCustomerByPolicyOrMobile(parts[1]) : null;
      if (matchedCust) {
        const existing = softCopyLinksCache.find(l => l.policyNumber === matchedCust.policyNumber);
        if (existing?.isRevoked) {
          const outcome = {
            isValid: false,
            customer: matchedCust,
            link: existing,
            isExpired: true,
            isRevoked: true,
            reason: 'This soft copy link was deleted and deactivated by your relationship manager.'
          };
          softVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
          return outcome;
        }
        const outcome = {
          isValid: true,
          customer: matchedCust,
          link: existing || null,
          isExpired: false,
          isRevoked: false
        };
        softVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
        return outcome;
      }
      const candidatePol = cleanToken.replace(/^SFT-/i, '').replace(/-\d{3,5}$/, '').trim();
      const fallbackCust = getCustomerByPolicyOrMobile(candidatePol) || getCustomerByPolicyOrMobile(cleanToken);
      if (fallbackCust) {
        const outcome = {
          isValid: true,
          customer: fallbackCust,
          link: null,
          isExpired: false,
          isRevoked: false
        };
        softVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
        return outcome;
      }
      return {
        isValid: false,
        customer: null,
        link: null,
        isExpired: false,
        isRevoked: false,
        reason: 'This soft copy link is being retrieved. Please enter your policy number to view documents.'
      };
    }

    const directCust = getCustomerByPolicyOrMobile(cleanToken);
    const outcome = {
      isValid: !!directCust,
      customer: directCust,
      link: null,
      isExpired: false,
      isRevoked: false
    };
    if (directCust) {
      softVerifyCache.set(cacheKey, { result: outcome, timestamp: Date.now() });
    }
    return outcome;
  })();

  softVerifyInFlight.set(cacheKey, executionPromise);
  try {
    return await executionPromise;
  } finally {
    softVerifyInFlight.delete(cacheKey);
  }
}

export function recordSoftCopyDownload(policyNumber: string, docType: string): void {
  const link = softCopyLinksCache.find(l => l.policyNumber === policyNumber);
  if (link) {
    link.downloadedAt = getCurrentTimestamp();
    link.downloadCount += 1;
  }
  apiRecordDocumentDownload(policyNumber, docType, link?.token).catch(() => {});
}

// --- 6. ACTIVITY LOGGING & DASHBOARD STATS ---
export function getActivityLogs(): ActivityLog[] {
  apiGetActivityLogs().then(logs => {
    if (logs && logs.length > 0) {
      activityLogsCache = logs;
      saveStorage(STORAGE_KEYS.ACTIVITY_LOGS, logs);
    }
  }).catch(() => {});
  return activityLogsCache;
}

export function logActivity(logData: Omit<ActivityLog, 'id' | 'timestamp'>): void {
  const newLog: ActivityLog = {
    ...logData,
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: getCurrentTimestamp()
  };
  activityLogsCache.unshift(newLog);
  saveStorage(STORAGE_KEYS.ACTIVITY_LOGS, activityLogsCache);
  apiLogActivity(logData).catch(() => {});
}

export async function createCustomerPolicy(data: any): Promise<{ policy: CustomerPolicy; link: RenewalLinkRecord }> {
  const initialMembers: InsuredMember[] = data.members && data.members.length > 0 ? data.members : [
    {
      id: `mem-self-${Date.now()}`,
      name: data.customerName,
      relation: 'Self',
      gender: 'Female',
      dob: '03/05/1968',
      age: 58,
      coverageAmount: data.baseSumInsured,
      preExistingConditions: ['no'],
      heightFeetInches: "0'8\"",
      weightKg: 58,
      abhaNumber: 'NA'
    }
  ];

  const tenurePrices = data.tenurePrices || {
    1: Number(data.baseAnnualPremium),
    2: Math.round(Number(data.baseAnnualPremium) * 1.9),
    3: Math.round(Number(data.baseAnnualPremium) * 2.75)
  };

  const generatedToken = `RNW-${String(data.policyNumber || 'POL').replace(/[^A-Z0-9]/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const validityHours = Number(data.validityHours) || 24;
  const expiry = new Date(Date.now() + validityHours * 3600 * 1000);

  const newPolicy: CustomerPolicy = {
    id: `cust-${Date.now()}`,
    customerName: data.customerName,
    policyNumber: data.policyNumber,
    mobileNumber: data.mobileNumber,
    email: data.email,
    policyName: data.policyName || 'Complete Health Insurance',
    policyType: data.policyType || 'Complete Health Insurance',
    policyStartDate: data.policyStartDate,
    previousPolicyEndDate: data.previousPolicyEndDate,
    renewalDueDate: data.previousPolicyEndDate,
    baseSumInsured: data.baseSumInsured,
    loyaltyBonus: data.loyaltyBonus || 0,
    totalSumInsured: Number(data.baseSumInsured) + Number(data.loyaltyBonus || 0),
    policyStatus: 'Expiring Soon',
    zone: data.zone || 'Zone B',
    zoneNotice: data.zoneNotice || `You're in ${data.zone || 'Zone B'}. Nice! You're getting a premium discount due to zone-based pricing.`,
    grossTenurePrices: data.grossTenurePrices || tenurePrices,
    tenurePrices,
    baseAnnualPremium: Number(data.baseAnnualPremium) || 0,
    loyaltyNcbDiscountPct: data.loyaltyNcbDiscountPct || 0,
    adminCustomDiscountAmount: data.adminCustomDiscountAmount || 0,
    cashbackAmount: data.cashbackAmount || 0,
    cashbackConfig: data.cashbackConfig || null,
    selectedTenure: 1,
    selectedAddOnIds: data.selectedAddOnIds || [],
    renewalAttempts: data.renewalAttempts || [],
    createdAt: data.createdAt || getCurrentTimestamp(),
    members: initialMembers,
    benefits: data.benefits && data.benefits.length > 0 ? data.benefits : [...INITIAL_BENEFITS],
    addOnRiders: data.addOnRiders && data.addOnRiders.length > 0 ? data.addOnRiders : [...INITIAL_ADDONS],
    kyc: {
      applicantName: data.kyc?.applicantName || data.customerName,
      dob: data.kyc?.dob || data.applicantDob || '16/10/1992',
      email: data.kyc?.email || data.email,
      mobile: data.kyc?.mobile || data.mobileNumber,
      landline: data.kyc?.landline || data.landline || '-',
      address: data.kyc?.address || data.address || '',
      addressLine2: data.kyc?.addressLine2 || data.addressLine2 || '',
      landmark: data.kyc?.landmark || data.landmark || '',
      city: data.kyc?.city || data.city || '',
      pincode: data.kyc?.pincode || data.pincode || '',
      state: data.kyc?.state || data.state || '',
      kycStatus: data.kyc?.kycStatus || 'Verified',
      panOrAadhar: data.kyc?.panOrAadhar || 'ABCDE1234F',
      pepStatus: data.kyc?.pepStatus || data.pepStatus || 'No',
      nomineeName: data.kyc?.nomineeName || data.nomineeName || data.customerName,
      nomineeRelation: data.kyc?.nomineeRelation || data.nomineeRelation || 'Mother',
      nomineeAge: Number(data.kyc?.nomineeAge) || Number(data.nomineeAge) || 33,
      nomineeDob: data.kyc?.nomineeDob || data.nomineeDob || '16/10/1992'
    }
  };

  const newLink: RenewalLinkRecord = {
    id: `rnw-link-${Date.now()}`,
    token: generatedToken,
    policyNumber: newPolicy.policyNumber,
    customerName: newPolicy.customerName,
    generatedAt: getCurrentTimestamp(),
    sentAt: getCurrentTimestamp(),
    paymentStatus: 'Not Started',
    expiresAt: expiry.toISOString().replace('T', ' ').substring(0, 19),
    isExpired: false,
    isRevoked: false,
    status: 'Active',
    validityHours: validityHours
  };

  // Prepend to caches
  const pExists = customersCache.findIndex(c => c.id === newPolicy.id || c.policyNumber === newPolicy.policyNumber);
  if (pExists !== -1) {
    customersCache[pExists] = newPolicy;
  } else {
    customersCache.unshift(newPolicy);
  }

  const lExists = renewalLinksCache.findIndex(l => l.token === generatedToken || l.policyNumber === newPolicy.policyNumber);
  if (lExists !== -1) {
    renewalLinksCache[lExists] = newLink;
  } else {
    renewalLinksCache.unshift(newLink);
  }

  // Also pre-generate soft copy link so customer has both links immediately available
  generateSoftCopyLink(newPolicy.policyNumber, 12);

  // Save immediately to persistent client storage
  saveStorage(STORAGE_KEYS.CUSTOMERS, customersCache);
  saveStorage(STORAGE_KEYS.RENEWAL_LINKS, renewalLinksCache);
  saveStorage(STORAGE_KEYS.SOFT_COPY_LINKS, softCopyLinksCache);

  try {
    const res = await apiCreateCustomerPolicy({ ...newPolicy, linkToken: generatedToken });
    const finalPolicy = res.policy || (res as any).customer || newPolicy;
    const finalLink = res.link || newLink;

    const pIdx = customersCache.findIndex(c => c.id === newPolicy.id || c.policyNumber === newPolicy.policyNumber);
    if (pIdx !== -1) customersCache[pIdx] = finalPolicy;

    const lIdx = renewalLinksCache.findIndex(l => l.token === generatedToken || l.policyNumber === newPolicy.policyNumber);
    if (lIdx !== -1) renewalLinksCache[lIdx] = finalLink;

    saveStorage(STORAGE_KEYS.CUSTOMERS, customersCache);
    saveStorage(STORAGE_KEYS.RENEWAL_LINKS, renewalLinksCache);
    saveStorage(STORAGE_KEYS.SOFT_COPY_LINKS, softCopyLinksCache);

    return { policy: finalPolicy, link: finalLink };
  } catch (err) {
    console.error('Error creating customer on API:', err);
    return { policy: newPolicy, link: newLink };
  }
}

export function getDashboardStats() {
  const todayStr = new Date().toISOString().split('T')[0];
  const totalCustomers = customersCache.length;
  const customersAddedToday = customersCache.filter(c => c.createdAt && c.createdAt.startsWith(todayStr)).length;
  const linksOpenedToday = renewalLinksCache.filter(l => l.openedAt && l.openedAt.startsWith(todayStr)).length;

  let totalAttemptsToday = 0;
  let successfulPaymentsCount = 0;
  let pendingCount = 0;
  let failedCount = 0;

  customersCache.forEach(c => {
    if (c.renewalAttempts) {
      c.renewalAttempts.forEach(att => {
        if (att.dateTime && att.dateTime.startsWith(todayStr)) {
          totalAttemptsToday += 1;
        }
        if (att.status === 'Paid' || att.status === 'Successful') {
          successfulPaymentsCount += 1;
        } else if (att.status === 'Failed' || att.status === 'Cancelled') {
          failedCount += 1;
        } else {
          pendingCount += 1;
        }
      });
    }
    if (c.policyStatus === 'Expiring Soon' || c.policyStatus === 'Grace Period') {
      pendingCount += 1;
    }
  });

  return {
    totalCustomers,
    customersAddedToday,
    linksOpenedToday,
    renewalAttemptsToday: totalAttemptsToday,
    successfulPayments: successfulPaymentsCount,
    pendingRenewals: pendingCount,
    failedPayments: failedCount
  };
}

export function resetAllData(): void {
  customersCache = INITIAL_CUSTOMERS;
  activityLogsCache = INITIAL_ACTIVITY_LOGS;
  renewalLinksCache = INITIAL_RENEWAL_LINKS;
  softCopyLinksCache = INITIAL_SOFTCOPY_LINKS;
  apiResetDatabase().catch(() => {});
}
