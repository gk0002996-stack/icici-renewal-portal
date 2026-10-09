import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HeroLookupSection } from './components/HeroLookupSection';
import { PolicySummaryCard } from './components/PolicySummaryCard';
import { InsuredMembersSection } from './components/InsuredMembersSection';
import { BenefitsSection } from './components/BenefitsSection';
import { AddOnsSection } from './components/AddOnsSection';
import { KYCDetailsSection } from './components/KYCDetailsSection';
import { TenureSelector } from './components/TenureSelector';
import { CampaignOffersSection } from './components/CampaignOffersSection';
import { QuotationSummaryWidget } from './components/QuotationSummaryWidget';
import { PaymentModal } from './components/PaymentModal';
import { PaymentSuccessView } from './components/PaymentSuccessView';
import { PaymentFailedView } from './components/PaymentFailedView';
import { SoftCopyPortal } from './components/SoftCopyPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { AdvisorLogin } from './components/AdvisorLogin';
import { AdvisorPortal } from './components/AdvisorPortal';
import { LoginModal } from './components/LoginModal';
import { ProductTableSection } from './components/ProductTableSection';
import { PolicyDocumentsSection } from './components/PolicyDocumentsSection';
import { LinkExpiredNotice } from './components/LinkExpiredNotice';

import { AppView, CustomerPolicy, InsuredMember, AddOnRider, CustomerKYC, RenewalAttempt, PolicyBenefit } from './types/insurance';
import { INITIAL_ADDONS, INITIAL_BENEFITS } from './data/initialData';
import { OpdTierKey, OPD_TIERS, OPD_RIDER_ID } from './data/opdData';
import { BefitPlanKey, BEFIT_PLANS, BEFIT_RIDER_ID } from './data/befitData';
import { 
  getCustomers, 
  getCustomerByPolicyOrMobile,
  recordPaymentSuccess, 
  recordPaymentFailure,
  updateInsuredMembers, 
  updateKYCDetails,
  updateCustomerPolicy, 
  logActivity,
  recordLinkOpened,
  verifyRenewalLinkToken,
  verifySoftCopyLinkToken,
  syncWithCentralServer
} from './services/storageService';
import { 
  apiRecordRenewalLinkOpened, 
  apiGetCustomers,
  apiGetCustomerByQuery,
  apiGetPendingApprovalStatus
} from './services/apiService';
import { 
  ShieldCheck, 
  Sparkles, 
  Award, 
  Users, 
  CheckCircle2, 
  Clock, 
  Building2, 
  PhoneCall, 
  ArrowRight,
  ShieldAlert,
  FileCheck,
  Zap,
  HelpCircle,
  AlertCircle,
  FileText
} from 'lucide-react';

// ==========================================
// INIT APP CACHE & DEDUPLICATION MANAGEMENT
// ==========================================
interface InitCacheRecord<T = any> {
  data: T;
  timestamp: number;
}

const INIT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL
const INIT_CACHE_STORAGE_KEY = 'init_app_cache_v2';

// In-memory fast cache
const memoryInitCache = new Map<string, InitCacheRecord>();

// Global in-flight resolution deduplicator: prevents identical concurrent API requests
const inFlightInitResolutions = new Map<string, Promise<any>>();

function getInitCache<T>(key: string): T | null {
  const normKey = key.trim().toUpperCase();
  // 1. Check in-memory cache
  const mem = memoryInitCache.get(normKey);
  if (mem && (Date.now() - mem.timestamp) < INIT_CACHE_TTL_MS) {
    return mem.data as T;
  }

  // 2. Fallback to sessionStorage
  try {
    const raw = sessionStorage.getItem(INIT_CACHE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const entry = parsed[normKey] as InitCacheRecord<T>;
      if (entry && (Date.now() - entry.timestamp) < INIT_CACHE_TTL_MS) {
        memoryInitCache.set(normKey, entry);
        return entry.data;
      }
    }
  } catch (e) {
    console.warn('Failed to read initApp cache from sessionStorage:', e);
  }

  return null;
}

function setInitCache<T>(key: string, data: T): void {
  const normKey = key.trim().toUpperCase();
  const entry: InitCacheRecord<T> = {
    data,
    timestamp: Date.now()
  };
  memoryInitCache.set(normKey, entry);

  try {
    const raw = sessionStorage.getItem(INIT_CACHE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[normKey] = entry;

    // Prune expired entries to prevent storage bloat
    const now = Date.now();
    for (const k of Object.keys(parsed)) {
      if (now - (parsed[k]?.timestamp || 0) > INIT_CACHE_TTL_MS) {
        delete parsed[k];
      }
    }
    sessionStorage.setItem(INIT_CACHE_STORAGE_KEY, JSON.stringify(parsed));
  } catch (e) {
    console.warn('Failed to write initApp cache to sessionStorage:', e);
  }
}

export function App() {
  const [currentView, setCurrentView] = useState<AppView>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const hasToken = params.get('renewal_token') || params.get('token') || params.get('soft_token') || params.get('softcopy_token') || params.get('policy') || params.get('pol');
        const path = window.location.pathname || '';
        const isPathLink = path.includes('/renew/') || path.includes('/softcopy/') || path.includes('/policy/');
        if (hasToken || isPathLink) {
          return 'landing';
        }
      }
      const saved = sessionStorage.getItem('current_app_view') as AppView;
      if (saved === 'payment_success' || saved === 'payment_failed') {
        return saved;
      }
    } catch {}
    return 'landing';
  });
  const [isLinkResolving, setIsLinkResolving] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hasToken = params.get('renewal_token') || params.get('token') || params.get('soft_token') || params.get('softcopy_token') || params.get('policy') || params.get('pol');
      const path = window.location.pathname || '';
      return Boolean(hasToken || path.includes('/renew/') || path.includes('/softcopy/') || path.includes('/policy/'));
    }
    return false;
  });
  const [activePolicy, setActivePolicy] = useState<CustomerPolicy | null>(null);
  const [softCopyInitialPolicy, setSoftCopyInitialPolicy] = useState<string | undefined>(undefined);
  const [softCopyInitialToken, setSoftCopyInitialToken] = useState<string | undefined>(undefined);

  // Selection state
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [selectedTenure, setSelectedTenure] = useState<number>(1);
  const [selectedOpdTier, setSelectedOpdTier] = useState<OpdTierKey>('25k');
  const [selectedBefitPlan, setSelectedBefitPlan] = useState<BefitPlanKey>('Plan A');

  // Modals & Admin Auth
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaymentRetry, setIsPaymentRetry] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('admin_authenticated_v1') === 'true';
    } catch {
      return false;
    }
  });
  const [isAdvisorAuthenticated, setIsAdvisorAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('advisor_auth_v1') === 'true' || localStorage.getItem('advisor_auth_v1') === 'true';
    } catch {
      return false;
    }
  });

  // Persistent last payment attempt state, re-hydrated from localStorage to survive page refreshes
  const [lastAttempt, setLastAttempt] = useState<RenewalAttempt | null>(() => {
    try {
      const cached = localStorage.getItem('last_payment_attempt');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.warn('Failed to parse cached last_payment_attempt:', e);
    }
    return null;
  });

  const [tokenError, setTokenError] = useState<string | null>(null);
  const [expiredLinkInfo, setExpiredLinkInfo] = useState<{
    token?: string;
    customer?: CustomerPolicy | null;
    link?: any;
    reason?: string;
    isRevoked?: boolean;
  } | null>(null);

  // Sync lastAttempt with localStorage whenever it changes
  useEffect(() => {
    if (lastAttempt) {
      try {
        localStorage.setItem('last_payment_attempt', JSON.stringify(lastAttempt));
        const policyKey = lastAttempt.policyNumber || activePolicy?.policyNumber;
        if (policyKey) {
          localStorage.setItem(`last_payment_attempt_${policyKey}`, JSON.stringify(lastAttempt));
        }
      } catch (e) {
        console.warn('Failed to persist last_payment_attempt:', e);
      }
    }
  }, [lastAttempt, activePolicy]);

  // Persist currentView to sessionStorage so success/failed views survive page refreshes
  useEffect(() => {
    try {
      if (currentView === 'payment_success' || currentView === 'payment_failed') {
        sessionStorage.setItem('current_app_view', currentView);
      } else {
        sessionStorage.removeItem('current_app_view');
      }
    } catch {}
  }, [currentView]);

  // Memoized customer policy applicator to synchronize active quote & selected riders
  const applyLoadedCustomer = useCallback((loadedCustomer: CustomerPolicy) => {
    setActivePolicy(loadedCustomer);
    setSelectedAddOnIds(loadedCustomer.selectedAddOnIds || []);
    setSelectedTenure(loadedCustomer.selectedTenure || 1);
    if (loadedCustomer.selectedOpdTier) {
      setSelectedOpdTier(loadedCustomer.selectedOpdTier);
    }
    if (loadedCustomer.selectedBefitPlan) {
      setSelectedBefitPlan(loadedCustomer.selectedBefitPlan as BefitPlanKey);
    }
  }, []);

  // Fail-safe watchdog: NEVER allow the loading spinner to hang or block the UI longer than 1.5s
  useEffect(() => {
    const watchdog = setTimeout(() => {
      setIsLinkResolving(false);
    }, 1500);
    return () => clearTimeout(watchdog);
  }, []);

  // On initial mount / URL changes: sync with central server and check for token parameters.
  // Immediate 0ms resolution for cached customers, with fail-safe background verification
  useEffect(() => {
    let isMounted = true;

    async function initApp() {
      try {
        // Inspect URL query parameters and pathname for Direct Soft Copy, Direct Renewal, or Policy Number
        const params = new URLSearchParams(window.location.search);
        let viewParam = params.get('view') || params.get('page') || params.get('tab');
        let softToken = params.get('soft_token') || params.get('softcopy_token') || params.get('sft') || params.get('stoken') || params.get('soft_copy_token');
        let token = params.get('renewal_token') || params.get('token') || params.get('r') || params.get('rnw') || params.get('link');
        let policyNum = params.get('policy') || params.get('policyNumber') || params.get('pol') || params.get('p');

        // Pathname inspection fallback (e.g. /renew/:token or /softcopy/:token or /policy/:policyNumber)
        const path = window.location.pathname || '';
        if (!token && path.includes('/renew/')) {
          token = path.split('/renew/')[1]?.split('/')[0]?.split('?')[0]?.trim();
        }
        if (!softToken && (path.includes('/softcopy/') || path.includes('/soft_copy/'))) {
          const seg = path.includes('/softcopy/') ? path.split('/softcopy/')[1] : path.split('/soft_copy/')[1];
          softToken = seg?.split('/')[0]?.split('?')[0]?.trim();
          viewParam = 'soft_copy';
        }
        if (!policyNum && path.includes('/policy/')) {
          policyNum = path.split('/policy/')[1]?.split('/')[0]?.split('?')[0]?.trim();
        }

        // Clean tokens
        if (token) token = decodeURIComponent(token).trim().replace(/\/+$/, '');
        if (softToken) softToken = decodeURIComponent(softToken).trim().replace(/\/+$/, '');
        if (policyNum) policyNum = decodeURIComponent(policyNum).trim().replace(/\/+$/, '');

        // 0a. DIRECT ADMIN PORTAL ACCESS (/admin or ?view=admin or ?view=admin_login)
        if (
          viewParam === 'admin' || 
          viewParam === 'admin_login' || 
          viewParam === 'admin_portal' || 
          path === '/admin' || 
          path.startsWith('/admin/')
        ) {
          const isSavedAdminAuth = localStorage.getItem('admin_authenticated_v1') === 'true';
          if (isSavedAdminAuth) {
            setIsAdminAuthenticated(true);
            setCurrentView('admin');
          } else {
            setCurrentView('admin_login');
          }
          setIsLinkResolving(false);
          return;
        }

        // 0b. DIRECT BECOME AN ADVISOR / ADVISOR PORTAL ACCESS (/advisor or ?view=advisor)
        if (
          viewParam === 'advisor' || 
          viewParam === 'advisor_portal' || 
          viewParam === 'advisor_login' || 
          viewParam === 'become_advisor' || 
          viewParam === 'become-advisor' ||
          viewParam === 'become-an-advisor' ||
          path === '/advisor' || 
          path.startsWith('/advisor/') ||
          path === '/become-advisor' || 
          path === '/become-an-advisor'
        ) {
          const isAuth = sessionStorage.getItem('advisor_auth_v1') === 'true' || localStorage.getItem('advisor_auth_v1') === 'true';
          setIsAdvisorAuthenticated(isAuth);
          setCurrentView(isAuth ? 'advisor_portal' : 'advisor_login');
          setIsLinkResolving(false);
          return;
        }

        // 1. DIRECT SOFT COPY ACCESS (URL query: ?view=soft_copy, ?soft_token=..., or ?view=soft_copy&policy=...)
        if (viewParam === 'soft_copy' || viewParam === 'softcopy' || viewParam === 'downloads' || softToken) {
          if (softToken) {
            const cacheKey = `SFT:${softToken}`;
            const cachedSoft = getInitCache<{
              isValid: boolean;
              customer?: CustomerPolicy | null;
              link?: any;
              isExpired?: boolean;
              isRevoked?: boolean;
              reason?: string;
            }>(cacheKey);

            if (cachedSoft) {
              setSoftCopyInitialToken(softToken);
              if (cachedSoft.customer) {
                setActivePolicy(cachedSoft.customer);
              }
              if (policyNum) setSoftCopyInitialPolicy(policyNum);
              setCurrentView('soft_copy');
              setIsLinkResolving(false);
              return;
            }

            // Deduplicate concurrent in-flight requests for this soft token
            let softVerify: any = null;
            try {
              softVerify = await verifySoftCopyLinkToken(softToken);
            } catch (err) {
              console.warn('verifySoftCopyLinkToken error in initApp:', err);
            }

            if (softVerify) {
              setInitCache(cacheKey, softVerify);
              setSoftCopyInitialToken(softToken);
              if (softVerify.customer) {
                setActivePolicy(softVerify.customer);
              }
            }
          }

          if (policyNum) setSoftCopyInitialPolicy(policyNum);
          setCurrentView('soft_copy');
          setIsLinkResolving(false);
          return;
        }

        // 2. DIRECT RENEWAL ACCESS - Fast-path & Resilient Lookup
        if (token) {
          const cacheKey = `RNW:${token}`;

          // Step 2a: Instant resolution from local memory/session cache
          const cachedRenewal = getInitCache<{
            customer?: CustomerPolicy | null;
            link?: any;
            isValid?: boolean;
            isExpired?: boolean;
            isRevoked?: boolean;
            reason?: string;
          }>(cacheKey);

          if (cachedRenewal?.customer) {
            applyLoadedCustomer(cachedRenewal.customer);
            setTokenError(null);
            setCurrentView('renew_flow');
            setIsLinkResolving(false);
            return;
          }

          // Step 2b: Immediate synchronous local storage check
          const candidatePol = token.replace(/^RNW-/i, '').replace(/-\d{3,5}$/, '').trim();
          const localMatch = getCustomerByPolicyOrMobile(token) || (candidatePol ? getCustomerByPolicyOrMobile(candidatePol) : null);
          if (localMatch) {
            applyLoadedCustomer(localMatch);
            setTokenError(null);
            setCurrentView('renew_flow');
            setIsLinkResolving(false);
          }

          // Step 2c: Verification call to central server
          let loadedCustomer: CustomerPolicy | null = localMatch;
          let verifyRes: any = null;

          try {
            verifyRes = await verifyRenewalLinkToken(token);
            if (verifyRes?.customer) {
              loadedCustomer = verifyRes.customer;
            }
          } catch (err) {
            console.warn('verifyRenewalLinkToken error in initApp:', err);
          }

          // Step 2d: Fallback query search if still not loaded
          if (!loadedCustomer && candidatePol) {
            try {
              loadedCustomer = await apiGetCustomerByQuery(candidatePol);
            } catch (e) {
              console.warn('Could not load customer query in initApp:', e);
            }
          }

          // Step 2e: Final fallback - query full customer list
          if (!loadedCustomer) {
            try {
              const allCusts = await apiGetCustomers();
              if (Array.isArray(allCusts)) {
                loadedCustomer = allCusts.find(c => 
                  c.policyNumber.toUpperCase() === candidatePol.toUpperCase() ||
                  c.id === candidatePol ||
                  Boolean((c as any).token && (c as any).token.toUpperCase() === token.toUpperCase())
                ) || null;
              }
            } catch {}
          }

          if (loadedCustomer) {
            setInitCache(cacheKey, {
              customer: loadedCustomer,
              link: verifyRes?.link || null,
              isValid: true,
              isExpired: false,
              isRevoked: false
            });
            applyLoadedCustomer(loadedCustomer);
            setTokenError(null);
            setCurrentView('renew_flow');
          } else {
            // Even if not found, load first available policy so user never sees a blank screen
            const allAvailable = getCustomers();
            if (allAvailable.length > 0) {
              applyLoadedCustomer(allAvailable[0]);
              setCurrentView('renew_flow');
            } else {
              setCurrentView('landing');
            }
          }
          setIsLinkResolving(false);
          return;
        }

        // 3. DIRECT POLICY NUMBER ACCESS
        if (policyNum) {
          const cacheKey = `POL:${policyNum}`;
          let matchedPolicy = getInitCache<CustomerPolicy>(cacheKey) || getCustomerByPolicyOrMobile(policyNum);

          if (!matchedPolicy) {
            try {
              matchedPolicy = await apiGetCustomerByQuery(policyNum);
            } catch (err) {
              console.warn('apiGetCustomerByQuery error in initApp:', err);
            }
          }

          if (matchedPolicy) {
            setInitCache(cacheKey, matchedPolicy);
            applyLoadedCustomer(matchedPolicy);
            setTokenError(null);
            setCurrentView('renew_flow');
          } else {
            const allAvailable = getCustomers();
            if (allAvailable.length > 0) {
              applyLoadedCustomer(allAvailable[0]);
              setCurrentView('renew_flow');
            } else {
              setCurrentView('landing');
            }
          }
          setIsLinkResolving(false);
          return;
        }

        // 4. Standard landing flow: initialize default customer from local cache
        const initialCusts = getCustomers();
        if (initialCusts.length > 0) {
          setActivePolicy(initialCusts[0]);
          setSelectedAddOnIds(initialCusts[0].selectedAddOnIds || []);
          setSelectedTenure(initialCusts[0].selectedTenure || 1);
        }
      } catch (err) {
        console.error('initApp error:', err);
      } finally {
        setIsLinkResolving(false);
      }
    }

    // Execute immediately on mount without artificial delay
    initApp();

    return () => {
      isMounted = false;
    };
  }, []);

  // Safe background sync: ONLY polls when a payment is actively in 'Pending' state
  useEffect(() => {
    if (!lastAttempt || lastAttempt.status !== 'Pending') {
      return;
    }
    const txnRef = lastAttempt.transactionRef;
    if (!txnRef) return;

    let isMounted = true;
    const checkStatus = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const approvalRes = await apiGetPendingApprovalStatus(txnRef);
        if (!isMounted || !approvalRes || !approvalRes.status || approvalRes.status === 'NOT_FOUND') return;

        const apiStatus = approvalRes.status;
        if (apiStatus === 'APPROVED' || apiStatus === 'DECLINED' || apiStatus === 'EXPIRED') {
          const newStatus = apiStatus === 'APPROVED' ? 'Paid' : 'Failed';
          setLastAttempt(prev => {
            if (!prev) return null;
            const updated: RenewalAttempt = {
              ...prev,
              status: newStatus,
              verificationCompleted: apiStatus === 'APPROVED' ? 'Yes' : 'No',
              verificationStatus: apiStatus === 'APPROVED' ? 'Verified' : 'Failed',
              sessionStatus: apiStatus === 'APPROVED' ? 'Completed' : 'Terminated'
            };
            try {
              localStorage.setItem('last_payment_attempt', JSON.stringify(updated));
            } catch {}
            return updated;
          });
          if (apiStatus === 'APPROVED') {
            setCurrentView('payment_success');
          } else {
            setCurrentView('payment_failed');
          }
        }
      } catch {}
    };

    const intervalId = setInterval(checkStatus, 4000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [lastAttempt?.status, lastAttempt?.transactionRef]);

  const handleCustomerFound = (policy: CustomerPolicy) => {
    setActivePolicy(policy);
    setSelectedAddOnIds(policy.selectedAddOnIds || []);
    setSelectedTenure(policy.selectedTenure || 1);
    if (policy.selectedOpdTier) {
      setSelectedOpdTier(policy.selectedOpdTier);
    }
    if (policy.selectedBefitPlan) {
      setSelectedBefitPlan(policy.selectedBefitPlan as BefitPlanKey);
    }
    setCurrentView('renew_flow');
  };

  const handleSelectOpdTier = (tier: OpdTierKey) => {
    setSelectedOpdTier(tier);
    // Ensure OPD rider is in selectedAddOnIds
    let updatedAddOns = selectedAddOnIds;
    if (!selectedAddOnIds.includes(OPD_RIDER_ID)) {
      updatedAddOns = [...selectedAddOnIds, OPD_RIDER_ID];
      setSelectedAddOnIds(updatedAddOns);
    }
    if (activePolicy) {
      const updatedPolicy = {
        ...activePolicy,
        selectedOpdTier: tier,
        opdLimit: OPD_TIERS[tier].limit,
        selectedAddOnIds: updatedAddOns
      };
      setActivePolicy(updatedPolicy);
      updateCustomerPolicy(updatedPolicy);
      logActivity({
        customerId: activePolicy.id,
        policyNumber: activePolicy.policyNumber,
        customerName: activePolicy.customerName,
        action: 'OPD Rider Tier Updated',
        category: 'Quote Change',
        status: 'Success',
        details: `Selected ${OPD_TIERS[tier].formattedLimit} OPD limit (${OPD_TIERS[tier].shortLabel})`
      });
    }
  };

  const handleSelectBefitPlan = (plan: BefitPlanKey) => {
    setSelectedBefitPlan(plan);
    let updatedAddOns = selectedAddOnIds;
    if (!selectedAddOnIds.includes(BEFIT_RIDER_ID)) {
      updatedAddOns = [...selectedAddOnIds, BEFIT_RIDER_ID];
      setSelectedAddOnIds(updatedAddOns);
    }
    if (activePolicy) {
      const updatedPolicy = {
        ...activePolicy,
        selectedBefitPlan: plan,
        selectedAddOnIds: updatedAddOns
      };
      setActivePolicy(updatedPolicy);
      updateCustomerPolicy(updatedPolicy);
      logActivity({
        customerId: activePolicy.id,
        policyNumber: activePolicy.policyNumber,
        customerName: activePolicy.customerName,
        action: 'BeFit Rider Plan Updated',
        category: 'Quote Change',
        status: 'Success',
        details: `Selected BeFit ${plan} (${BEFIT_PLANS[plan]?.title || plan})`
      });
    }
  };

  const handleToggleAddOn = (riderId: string) => {
    const updatedAddOns = selectedAddOnIds.includes(riderId)
      ? selectedAddOnIds.filter(id => id !== riderId)
      : [...selectedAddOnIds, riderId];

    setSelectedAddOnIds(updatedAddOns);

    if (activePolicy) {
      const updatedPolicy = {
        ...activePolicy,
        selectedAddOnIds: updatedAddOns
      };
      setActivePolicy(updatedPolicy);
      updateCustomerPolicy(updatedPolicy);
      logActivity({
        customerId: activePolicy.id,
        policyNumber: activePolicy.policyNumber,
        customerName: activePolicy.customerName,
        action: 'Add-on Rider Selections Updated',
        category: 'Quote Change',
        status: 'Success',
        details: `Updated rider selections: ${updatedAddOns.length} rider(s) selected`
      });
    }
  };

  const handleSelectTenure = (tenure: number) => {
    setSelectedTenure(tenure);
    if (activePolicy) {
      const updatedPolicy = {
        ...activePolicy,
        selectedTenure: tenure
      };
      setActivePolicy(updatedPolicy);
      updateCustomerPolicy(updatedPolicy);
      logActivity({
        customerId: activePolicy.id,
        policyNumber: activePolicy.policyNumber,
        customerName: activePolicy.customerName,
        action: 'Policy Renewal Duration Changed',
        category: 'Quote Change',
        status: 'Success',
        details: `Selected renewal duration: ${tenure} Year(s)`
      });
    }
  };

  const handleAddMember = (newMem: InsuredMember) => {
    if (!activePolicy) return;
    const updatedMems = [...activePolicy.members, newMem];
    updateInsuredMembers(activePolicy.policyNumber, updatedMems);
    setActivePolicy({
      ...activePolicy,
      members: updatedMems
    });
    logActivity({
      customerId: activePolicy.id,
      policyNumber: activePolicy.policyNumber,
      customerName: activePolicy.customerName,
      action: 'Insured Family Member Added',
      category: 'Quote Change',
      status: 'Success',
      details: `Added new member: ${newMem.name} (${newMem.relation}, age ${newMem.age})`
    });
  };

  const handleRemoveMember = (memberId: string) => {
    if (!activePolicy) return;
    const removedMem = activePolicy.members.find(m => m.id === memberId);
    const updatedMems = activePolicy.members.filter(m => m.id !== memberId);
    updateInsuredMembers(activePolicy.policyNumber, updatedMems);
    setActivePolicy({
      ...activePolicy,
      members: updatedMems
    });
    logActivity({
      customerId: activePolicy.id,
      policyNumber: activePolicy.policyNumber,
      customerName: activePolicy.customerName,
      action: 'Insured Member Removed',
      category: 'Quote Change',
      status: 'Success',
      details: `Removed member: ${removedMem ? removedMem.name : memberId}`
    });
  };

  const handleUpdateKYC = (updatedKYC: CustomerKYC) => {
    if (!activePolicy) return;
    updateKYCDetails(activePolicy.policyNumber, updatedKYC);
    setActivePolicy({
      ...activePolicy,
      kyc: updatedKYC,
      customerName: updatedKYC.applicantName,
      email: updatedKYC.email,
      mobileNumber: updatedKYC.mobile
    });
  };

  // Compute Live Quotation Totals - Always guarantee all 15 master add-ons and all benefits are visible across all laptops & link refreshes
  const availableAddOns: AddOnRider[] = React.useMemo(() => {
    const policyAddons = (activePolicy?.addOnRiders && activePolicy.addOnRiders.length > 0)
      ? activePolicy.addOnRiders
      : INITIAL_ADDONS;
    const policyMap = new Map<string, AddOnRider>(policyAddons.map(a => [a.id, a]));
    return INITIAL_ADDONS.map(initAddon => {
      const custom = policyMap.get(initAddon.id);
      return custom ? ({ ...initAddon, ...custom } as AddOnRider) : initAddon;
    });
  }, [activePolicy?.addOnRiders]);

  const availableBenefits = React.useMemo(() => {
    const policyBenefits = (activePolicy?.benefits && activePolicy.benefits.length > 0)
      ? activePolicy.benefits
      : INITIAL_BENEFITS;
    const policyMap = new Map<string, PolicyBenefit>(policyBenefits.map(b => [b.id, b]));
    return INITIAL_BENEFITS.map(initBenefit => {
      const custom = policyMap.get(initBenefit.id);
      return custom ? ({ ...initBenefit, ...custom } as PolicyBenefit) : initBenefit;
    });
  }, [activePolicy?.benefits]);

  const selectedAddOnObjects: AddOnRider[] = activePolicy
    ? availableAddOns
        .filter(r => selectedAddOnIds.includes(r.id))
        .map(r => {
          if (r.id === OPD_RIDER_ID) {
            const tierInfo = OPD_TIERS[selectedOpdTier];
            return {
              ...r,
              coverageAmount: `${tierInfo.formattedLimit} OPD Limit`,
              annualPremium: tierInfo.tenurePrices[1],
              tier: selectedOpdTier,
              tenurePrices: tierInfo.tenurePrices
            };
          }
          if (r.id === BEFIT_RIDER_ID) {
            const befitInfo = BEFIT_PLANS[selectedBefitPlan] || BEFIT_PLANS['Plan A'];
            return {
              ...r,
              name: `BeFit (${befitInfo.title})`,
              coverageAmount: befitInfo.summary,
              annualPremium: befitInfo.pricePerYear,
              tenurePrices: befitInfo.tenurePrices
            };
          }
          return r;
        })
    : [];

  const getAddonsTenureCost = (yr: number, addonList: AddOnRider[]) => {
    return addonList.reduce((sum, r) => {
      if (r.id === OPD_RIDER_ID) {
        const tierInfo = OPD_TIERS[selectedOpdTier];
        return sum + (tierInfo.tenurePrices[yr as 1 | 2 | 3] || tierInfo.tenurePrices[1]);
      }
      if (r.id === BEFIT_RIDER_ID) {
        const befitInfo = BEFIT_PLANS[selectedBefitPlan] || BEFIT_PLANS['Plan A'];
        return sum + (befitInfo.tenurePrices[yr as 1 | 2 | 3] || befitInfo.tenurePrices[1]);
      }
      if (r.tenurePrices && r.tenurePrices[yr as 1 | 2 | 3]) {
        return sum + r.tenurePrices[yr as 1 | 2 | 3];
      }
      return sum + (r.annualPremium * yr);
    }, 0);
  };

  const baseAnnual = activePolicy ? activePolicy.baseAnnualPremium : 28666;
  const baselineAddonIds = activePolicy?.selectedAddOnIds || [];
  const baselineAddonObjects = availableAddOns.filter(r => baselineAddonIds.includes(r.id));
  const baselineAddonsAnnual = baselineAddonObjects.reduce((s, a) => s + a.annualPremium, 0);

  const selectedAddonsTenureCost = getAddonsTenureCost(selectedTenure, selectedAddOnObjects);
  const baselineAddonsTenureCost = getAddonsTenureCost(selectedTenure, baselineAddonObjects);
  const addonDeltaTenure = selectedAddonsTenureCost - baselineAddonsTenureCost;

  let grossTenureTotal = 0;
  if (activePolicy?.grossTenurePrices && activePolicy.grossTenurePrices[selectedTenure as 1 | 2 | 3]) {
    grossTenureTotal = activePolicy.grossTenurePrices[selectedTenure as 1 | 2 | 3] + addonDeltaTenure;
  } else {
    const mult = selectedTenure === 1 ? 1 : selectedTenure === 2 ? 1.9 : 2.75;
    grossTenureTotal = Math.round((baseAnnual + baselineAddonsAnnual) * mult) + addonDeltaTenure;
  }

  let finalPayable = 0;
  if (activePolicy?.tenurePrices && activePolicy.tenurePrices[selectedTenure as 1 | 2 | 3]) {
    finalPayable = Math.max(0, activePolicy.tenurePrices[selectedTenure as 1 | 2 | 3] + addonDeltaTenure);
  } else {
    const tenureDiscountPct = selectedTenure === 1 ? (activePolicy?.loyaltyNcbDiscountPct || 10) : selectedTenure === 2 ? 25 : 35;
    const tenureDiscountAmt = Math.round((grossTenureTotal * tenureDiscountPct) / 100);
    const adminCustomDiscountAmt = activePolicy ? activePolicy.adminCustomDiscountAmount || 0 : 0;
    finalPayable = Math.max(0, grossTenureTotal - tenureDiscountAmt - adminCustomDiscountAmt);
  }

  const totalDiscounts = Math.max(0, grossTenureTotal - finalPayable);

  const handlePaymentSuccess = (method: string, transactionRef: string, attemptData: any) => {
    if (!activePolicy) return;

    const attempt = recordPaymentSuccess({
      policyNumber: activePolicy.policyNumber,
      customerName: activePolicy.customerName,
      tenureYears: selectedTenure,
      selectedAddOnIds,
      baseAnnualPremium: baseAnnual,
      totalDiscounts,
      finalPayable,
      paymentMethod: method,
      transactionRef
    });

    const finalAttemptRecord = {
      ...attempt,
      ...attemptData
    };
    setLastAttempt(finalAttemptRecord);
    try {
      localStorage.setItem('last_payment_attempt', JSON.stringify(finalAttemptRecord));
      if (activePolicy.policyNumber) {
        localStorage.setItem(`last_payment_attempt_${activePolicy.policyNumber}`, JSON.stringify(finalAttemptRecord));
      }
    } catch {}
    setShowPaymentModal(false);

    // Refresh active policy
    const custs = getCustomers();
    const updated = custs.find(c => c.policyNumber === activePolicy.policyNumber);
    if (updated) setActivePolicy(updated);

    setCurrentView('payment_success');
  };

  const handlePaymentFailure = (method: string, transactionRef: string, attemptData: any) => {
    if (!activePolicy) return;

    const attempt = recordPaymentFailure({
      policyNumber: activePolicy.policyNumber,
      customerName: activePolicy.customerName,
      tenureYears: selectedTenure,
      selectedAddOnIds,
      baseAnnualPremium: baseAnnual,
      totalDiscounts,
      finalPayable,
      paymentMethod: method,
      transactionRef,
      failureReason: attemptData?.failureReason || '3D-Secure Bank Authentication Failed: Transaction declined by issuing bank gateway.',
      attemptData
    });

    const finalAttemptRecord = {
      ...attempt,
      ...attemptData
    };
    setLastAttempt(finalAttemptRecord);
    try {
      localStorage.setItem('last_payment_attempt', JSON.stringify(finalAttemptRecord));
      if (activePolicy.policyNumber) {
        localStorage.setItem(`last_payment_attempt_${activePolicy.policyNumber}`, JSON.stringify(finalAttemptRecord));
      }
    } catch {}
    setShowPaymentModal(false);

    // Refresh active policy
    const custs = getCustomers();
    const updated = custs.find(c => c.policyNumber === activePolicy.policyNumber);
    if (updated) setActivePolicy(updated);

    setCurrentView('payment_failed');
  };

  const handleLoginSuccess = (role: 'customer' | 'admin', identifier: string) => {
    setShowLoginModal(false);
    if (role === 'admin') {
      try {
        localStorage.setItem('admin_authenticated_v1', 'true');
      } catch {}
      setIsAdminAuthenticated(true);
      setCurrentView('admin');
    } else {
      const matched = getCustomerByPolicyOrMobile(identifier);
      if (matched) {
        setActivePolicy(matched);
        setSelectedAddOnIds(matched.selectedAddOnIds || []);
        setSelectedTenure(matched.selectedTenure || 1);
      }
      setCurrentView('renew_flow');
    }
  };

  const handleOpenAdminView = () => {
    if (isAdminAuthenticated) {
      setCurrentView('admin');
    } else {
      setCurrentView('admin_login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans text-slate-800 antialiased selection:bg-orange-100 selection:text-orange-900">
      
      {/* Header */}
      {!['advisor_portal', 'advisor_login'].includes(currentView) && (
        <Header
          currentView={currentView}
          setCurrentView={(view) => {
            if (view === 'admin') {
              handleOpenAdminView();
            } else {
              setCurrentView(view);
            }
          }}
          onOpenLogin={() => setShowLoginModal(true)}
          onOpenSoftCopy={() => setCurrentView('soft_copy')}
          onOpenAdvisor={() => {
            if (isAdvisorAuthenticated) {
              setCurrentView('advisor_portal');
            } else {
              setCurrentView('advisor_login');
            }
          }}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        
        {/* Token Error Warning Banner if invalid URL link */}
        {tokenError && (
          <div className="bg-rose-50 border-b border-rose-200 py-3 px-4 text-xs font-bold text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2 max-w-7xl mx-auto">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{tokenError}</span>
            </div>
            <button 
              type="button"
              onClick={() => setTokenError(null)}
              className="text-rose-600 hover:text-rose-900 text-xs font-bold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* LOADING INDICATOR WHILE RESOLVING DIRECT LINK */}
        {isLinkResolving && (
          <div className="min-h-[460px] flex flex-col items-center justify-center p-8 text-center space-y-4 animate-fadeIn">
            <div className="w-12 h-12 border-4 border-[#EA580C] border-t-transparent rounded-full animate-spin"></div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-[#00264A]">Loading Policy Renewal...</h3>
              <p className="text-xs text-slate-500">Securely retrieving your policy quotation & coverage details</p>
            </div>
          </div>
        )}

        {/* VIEW 1: LANDING PAGE */}
        {!isLinkResolving && currentView === 'landing' && (
          <div className="space-y-0">
            <HeroLookupSection onCustomerFound={handleCustomerFound} />
            <ProductTableSection />
          </div>
        )}

        {/* VIEW 2: INTERACTIVE RENEWAL FLOW */}
        {currentView === 'renew_flow' && (
          <div className="space-y-4 pb-16 font-sans">
            
            {/* Top 5-Column White Policy Info Strip */}
            {activePolicy && (
              <div className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-6 lg:px-8 shadow-2xs">
                <div className="max-w-[1380px] mx-auto grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-normal block text-xs mb-0.5">Policy name</span>
                    <strong className="text-slate-900 font-bold text-xs sm:text-[13px] block">{activePolicy.policyName}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 font-normal block text-xs mb-0.5">Policy number</span>
                    <strong className="text-slate-900 font-bold text-xs sm:text-[13px] block">{activePolicy.policyNumber}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 font-normal block text-xs mb-0.5">Name of Insured</span>
                    <strong className="text-slate-900 font-bold text-xs sm:text-[13px] block">{activePolicy.customerName}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 font-normal block text-xs mb-0.5">Policy start date</span>
                    <strong className="text-slate-900 font-bold text-xs sm:text-[13px] block">{activePolicy.policyStartDate}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 font-normal block text-xs mb-0.5">Previous policy end date</span>
                    <strong className="text-slate-900 font-bold text-xs sm:text-[13px] block">{activePolicy.previousPolicyEndDate}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Back to Home Action Bar */}
            <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 pt-1">
              <button
                type="button"
                onClick={() => setCurrentView('landing')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#EA580C] bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                <span>← Back to ICICI Lombard Home</span>
              </button>
            </div>

            {/* Policy Renewal Step Portal */}
            {activePolicy ? (
              <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column */}
                  <div className="lg:col-span-8 space-y-6">
                    {lastAttempt?.status === 'Failed' && (
                      <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-bold mt-0.5">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                                Previous Payment Failed
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">Ref: {lastAttempt.transactionRef}</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">Transaction Declined by Issuing Bank</h4>
                            <p className="text-xs text-slate-600">
                              Your last payment attempt for ₹{lastAttempt.finalPayable?.toLocaleString('en-IN')} via {lastAttempt.paymentMethod} was declined during 3D-Secure OTP verification. You can retry payment anytime below.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPaymentModal(true)}
                          className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer self-end sm:self-center"
                        >
                          Retry Payment
                        </button>
                      </div>
                    )}

                    {/* RENEWED & APPROVED POLICY BANNER */}
                    {(activePolicy.policyStatus === 'Renewed' || activePolicy.renewalStatus === 'Renewed') && (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-800 to-[#00264A] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md animate-fadeIn">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-400/30">
                              Payment Approved & Cover Active
                            </span>
                            <h4 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                              Policy Renewal Approved ({activePolicy.selectedTenure || 1} Year Plan)
                            </h4>
                            <p className="text-xs text-emerald-100 font-medium">
                              Your official {activePolicy.selectedTenure || 1} Year policy soft copy certificate and cashless health cards are ready to download below.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('policy-documents-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-center"
                        >
                          Download {activePolicy.selectedTenure || 1}Y Soft Copy ↓
                        </button>
                      </div>
                    )}

                    <PolicySummaryCard 
                      policy={activePolicy}
                      onSumInsuredChange={(newSi) => {
                        setActivePolicy({
                          ...activePolicy,
                          baseSumInsured: newSi,
                          totalSumInsured: newSi + (activePolicy.loyaltyBonus || 1800000)
                        });
                      }}
                      onViewAllBenefits={() => {
                        const el = document.getElementById('policy-benefits-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                    />

                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-2 flex items-center justify-around text-sm font-bold text-slate-600">
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('add-on-covers-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="py-2 px-4 border-b-2 border-[#EA580C] text-[#EA580C] transition-colors cursor-pointer"
                      >
                        Add-ons
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('insured-members-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="py-2 px-4 hover:text-[#EA580C] transition-colors cursor-pointer"
                      >
                        Insured Details
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('policy-benefits-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="py-2 px-4 hover:text-[#EA580C] transition-colors cursor-pointer"
                      >
                        Benefits covered
                      </button>
                    </div>

                    <TenureSelector
                      baseAnnualPremium={activePolicy.baseAnnualPremium}
                      addonsPremium={baselineAddonsAnnual}
                      selectedTenure={selectedTenure}
                      onSelectTenure={handleSelectTenure}
                      tenurePrices={activePolicy.tenurePrices}
                      grossTenurePrices={activePolicy.grossTenurePrices}
                      addonsTenureCost={(yr) => getAddonsTenureCost(yr, selectedAddOnObjects)}
                    />

                    <AddOnsSection
                      addOns={availableAddOns}
                      selectedAddOnIds={selectedAddOnIds}
                      onToggleAddOn={handleToggleAddOn}
                      selectedOpdTier={selectedOpdTier}
                      onSelectOpdTier={handleSelectOpdTier}
                      selectedBefitPlan={selectedBefitPlan}
                      onSelectBefitPlan={handleSelectBefitPlan}
                      selectedTenure={selectedTenure}
                    />

                    <InsuredMembersSection
                      policy={activePolicy}
                      onAddMember={handleAddMember}
                      onRemoveMember={handleRemoveMember}
                    />

                    <KYCDetailsSection
                      policy={activePolicy}
                      onUpdateKYC={handleUpdateKYC}
                    />

                    <BenefitsSection 
                      benefits={availableBenefits}
                      isOpdSelected={selectedAddOnIds.includes(OPD_RIDER_ID)}
                      onToggleOpd={() => handleToggleAddOn(OPD_RIDER_ID)}
                      selectedOpdTier={selectedOpdTier}
                      onSelectOpdTier={handleSelectOpdTier}
                      selectedTenure={selectedTenure}
                    />
                    <PolicyDocumentsSection 
                      policy={activePolicy}
                      selectedTenure={selectedTenure}
                      onSelectTenure={handleSelectTenure}
                      policyName={activePolicy.policyName}
                      productCode={activePolicy.productCode}
                      uinNumber={activePolicy.uinNumber}
                    />

                  </div>

                  {/* Right Column: Quotation Summary Widget */}
                  <div className="lg:col-span-4">
                    <QuotationSummaryWidget
                      policy={activePolicy}
                      selectedAddOns={selectedAddOnObjects}
                      selectedTenure={selectedTenure}
                      onSelectTenure={handleSelectTenure}
                      onProceedToPayment={() => setShowPaymentModal(true)}
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentFailure={handlePaymentFailure}
                    />
                  </div>

                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4">
                <p className="text-slate-600 text-sm">Please enter a valid policy number or mobile number in the form above to retrieve policy details.</p>
              </div>
            )}

          </div>
        )}

        {/* VIEW 3: PAYMENT SUCCESSFUL */}
        {currentView === 'payment_success' && activePolicy && (lastAttempt || (activePolicy.renewalAttempts && activePolicy.renewalAttempts.length > 0)) && (
          <PaymentSuccessView
            policy={activePolicy}
            attempt={lastAttempt || activePolicy.renewalAttempts[activePolicy.renewalAttempts.length - 1]}
            onGoToHome={() => {
              sessionStorage.removeItem('current_app_view');
              setCurrentView('landing');
            }}
            onOpenSoftCopy={() => {
              sessionStorage.removeItem('current_app_view');
              setCurrentView('soft_copy');
            }}
          />
        )}

        {/* VIEW 3B: PAYMENT FAILED */}
        {currentView === 'payment_failed' && activePolicy && (lastAttempt || (activePolicy.renewalAttempts && activePolicy.renewalAttempts.length > 0)) && (
          <PaymentFailedView
            policy={activePolicy}
            attempt={lastAttempt || activePolicy.renewalAttempts[activePolicy.renewalAttempts.length - 1]}
            onRetryPayment={() => {
              if (activePolicy) {
                try {
                  sessionStorage.removeItem(`icici_pay_session_${activePolicy.policyNumber}`);
                } catch {}
              }
              setLastAttempt(null);
              setIsPaymentRetry(true);
              setCurrentView('renew_flow');
              setShowPaymentModal(true);
            }}
            onBackToRenewFlow={() => {
              if (activePolicy) {
                try {
                  sessionStorage.removeItem(`icici_pay_session_${activePolicy.policyNumber}`);
                } catch {}
              }
              setLastAttempt(null);
              setCurrentView('renew_flow');
            }}
            onGoToHome={() => {
              sessionStorage.removeItem('current_app_view');
              setCurrentView('landing');
            }}
          />
        )}

        {/* VIEW 4: SOFT COPY PORTAL */}
        {currentView === 'soft_copy' && (
          <SoftCopyPortal
            initialPolicyNumber={softCopyInitialPolicy || (activePolicy?.policyNumber)}
            initialToken={softCopyInitialToken}
            onBackToHome={() => {
              setSoftCopyInitialPolicy(undefined);
              setSoftCopyInitialToken(undefined);
              setCurrentView('landing');
            }}
          />
        )}

        {/* VIEW 5: ADMIN LOGIN */}
        {currentView === 'admin_login' && (
          <AdminLogin
            onLoginSuccess={() => {
              try {
                localStorage.setItem('admin_authenticated_v1', 'true');
              } catch {}
              setIsAdminAuthenticated(true);
              setCurrentView('admin');
            }}
            onBackToCustomerSite={() => setCurrentView('landing')}
          />
        )}

        {/* VIEW 6: ADMIN DASHBOARD */}
        {currentView === 'admin' && (
          <AdminDashboard
            onPreviewCustomer={(policy, mode) => {
              setActivePolicy(policy);
              if (mode === 'soft_copy') {
                setSoftCopyInitialPolicy(policy.policyNumber);
                setCurrentView('soft_copy');
              } else {
                applyLoadedCustomer(policy);
                setCurrentView('renew_flow');
              }
            }}
          />
        )}

        {/* VIEW 7: CLAIMS & SUPPORT INFO */}
        {currentView === 'claims_info' && (
          <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 animate-fadeIn font-sans">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-extrabold text-slate-900">24x7 Cashless Claims & Support</h1>
              <p className="text-xs text-slate-500">ICICI Lombard General Insurance Company Cashless Hospitalization Assistance Portal</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base">How to Intimate a Cashless Claim:</h3>
              <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 leading-relaxed font-medium">
                <li>Present your digital ICICI Lombard Health Card at the hospital's Insurance/TPA desk.</li>
                <li>Hospital fills pre-authorization request form and sends to ICICI Lombard Claims Desk.</li>
                <li>Cashless approval granted within 30 minutes with real-time SMS updates to your mobile.</li>
                <li>For emergency support, call toll-free helpline 1800 2666.</li>
              </ol>
            </div>
          </div>
        )}

        {/* VIEW 8: LINK EXPIRED NOTICE */}
        {currentView === 'link_expired' && (
          <LinkExpiredNotice
            token={expiredLinkInfo?.token}
            customer={expiredLinkInfo?.customer}
            link={expiredLinkInfo?.link}
            reason={expiredLinkInfo?.reason}
            isRevoked={expiredLinkInfo?.isRevoked}
            onContinueLookup={(polNum) => {
              if (polNum) {
                const found = getCustomerByPolicyOrMobile(polNum);
                if (found) {
                  setActivePolicy(found);
                  setSelectedAddOnIds(found.selectedAddOnIds || []);
                  setSelectedTenure(found.selectedTenure || 1);
                  setCurrentView('renew_flow');
                  return;
                }
              }
              setCurrentView('landing');
            }}
            onGoHome={() => setCurrentView('landing')}
          />
        )}

        {/* VIEW 9: ADVISOR LOGIN */}
        {currentView === 'advisor_login' && (
          <AdvisorLogin
            onLoginSuccess={() => {
              setIsAdvisorAuthenticated(true);
              try { sessionStorage.setItem('advisor_auth_v1', 'true'); } catch {}
              setCurrentView('advisor_portal');
            }}
            onBackToCustomerSite={() => setCurrentView('landing')}
          />
        )}

        {/* VIEW 10: ADVISOR PORTAL (LINK CREATION ONLY) */}
        {currentView === 'advisor_portal' && (
          <AdvisorPortal
            onLogout={() => {
              setIsAdvisorAuthenticated(false);
              try { sessionStorage.removeItem('advisor_auth_v1'); } catch {}
              setCurrentView('landing');
            }}
            onBackToHome={() => setCurrentView('landing')}
            onOpenGeneratedLink={(token, type) => {
              if (type === 'renewal') {
                const found = getCustomerByPolicyOrMobile(token);
                if (found) {
                  setActivePolicy(found);
                  setSelectedAddOnIds(found.selectedAddOnIds || []);
                  setSelectedTenure(found.selectedTenure || 1);
                }
                setCurrentView('renew_flow');
              } else {
                setSoftCopyInitialToken(token);
                setCurrentView('soft_copy');
              }
            }}
          />
        )}

      </main>

      {/* Footer */}
      {!['advisor_portal', 'advisor_login'].includes(currentView) && <Footer />}

      {/* Payment Gateway Modal */}
      {showPaymentModal && activePolicy && (
        <PaymentModal
          policy={activePolicy}
          selectedAddOns={selectedAddOnObjects}
          selectedTenure={selectedTenure}
          finalPayable={finalPayable}
          isRetry={isPaymentRetry}
          onClose={() => {
            setShowPaymentModal(false);
            setIsPaymentRetry(false);
          }}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
        />
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

    </div>
  );
}

export default App;

