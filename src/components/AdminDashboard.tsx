import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Filter, 
  Send, 
  FileText, 
  Link as LinkIcon, 
  History, 
  ShieldCheck, 
  Copy, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Tag, 
  RefreshCw,
  Plus,
  X,
  Calendar,
  ArrowUpDown,
  CreditCard,
  Smartphone,
  Eye,
  Activity,
  Award,
  FlaskConical,
  Trash2,
  Zap,
  UserPlus,
  Mail,
  ExternalLink,
  MessageSquare,
  Share2,
  Pencil,
  Edit3,
  UserCheck,
  Gift,
  Sparkles,
  Lock,
  KeyRound,
  EyeOff,
  FileSpreadsheet,
  Download,
  Globe,
  Database,
  RotateCcw,
  MapPin,
  Maximize2,
  Minimize2,
  Repeat,
  Volume2,
  VolumeX,
  Bell
} from 'lucide-react';
import { ExcelExportModal } from './ExcelExportModal';
import { EditRenewalLinkModal } from './EditRenewalLinkModal';
import { DataCenterTab } from './DataCenterTab';
import { CustomerPolicy, ActivityLog, RenewalLinkRecord, SoftCopyLinkRecord, RenewalAttempt, EmailSender, EmailLogRecord, EmailSmtpConfig, PendingApprovalTransaction, PolicyBenefit } from '../types/insurance';
import { INITIAL_ADDONS, INITIAL_BENEFITS } from '../data/initialData';
import { 
  getCustomers, 
  getActivityLogs, 
  getRenewalLinks, 
  getSoftCopyLinks, 
  getDashboardStats, 
  generateRenewalLink, 
  regenerateRenewalLink,
  expireRenewalLink,
  deleteRenewalLink,
  generateSoftCopyLink, 
  regenerateSoftCopyLink,
  expireSoftCopyLink,
  deleteSoftCopyLink,
  activateRenewalLink,
  activateSoftCopyLink,
  setAdminCustomDiscount,
  createCustomerPolicy,
  getAdminSettings,
  saveAdminSettings,
  apiGetEmailSenders,
  apiGetEmailLogs,
  apiGetEmailSmtpConfig,
  apiSendCustomerEmail,
  apiGetVerifiedEmailSenders,
  AdminSettings
} from '../services/storageService';
import { calculatePolicyPricing, getTenurePricingDetails } from '../utils/premiumCalculation';
import { 
  subscribeToRealtimeEvents,
  apiGetAdminBundle,
  apiGetCustomers,
  apiGetActivityLogs,
  apiGetRenewalLinks,
  apiGetSoftCopyLinks,
  apiGetDashboardStats,
  apiGetAdminSettings,
  apiGetPendingApprovals,
  apiDecidePendingApproval,
  apiCreatePendingApproval,
  apiSyncActivityLogs,
  apiSyncWithRender
} from '../services/apiService';
import { EmailSenderSettingsTab } from './EmailSenderSettingsTab';
import { MobileOtpTrackingTab } from './MobileOtpTrackingTab';
import { matchesDateFilter, formatDisplayDateTime, parseFlexibleDate } from '../utils/dateUtils';
import { 
  buildPublicRenewalLink, 
  buildPublicSoftCopyLink, 
  getPublicCustomerBaseUrl,
  buildAdminPortalLink,
  buildAdvisorPortalLink,
  PUBLIC_PORTAL_URL
} from '../utils/urlUtils';

// Permanent Local Storage Key for 24-Hour & Historical Activity Persistence Across Republishing
const PERMANENT_ACTIVITY_STORAGE_KEY = 'icici_permanent_activity_logs_v4';

function loadCachedPermanentActivityLogs(): ActivityLog[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(PERMANENT_ACTIVITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load cached permanent activity logs:', e);
  }
  return [];
}

function saveCachedPermanentActivityLogs(logs: ActivityLog[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage && Array.isArray(logs)) {
      // Keep up to 5,000 logs safely in localStorage without overflowing quota
      const sliced = logs.slice(0, 5000);
      localStorage.setItem(PERMANENT_ACTIVITY_STORAGE_KEY, JSON.stringify(sliced));
    }
  } catch (e) {
    console.warn('Failed to save cached permanent activity logs:', e);
  }
}

function mergeActivityLogs(primary: ActivityLog[], secondary: ActivityLog[]): ActivityLog[] {
  const map = new Map<string, ActivityLog>();
  (primary || []).forEach(log => {
    if (!log) return;
    const key = log.id || `${log.timestamp}_${log.policyNumber}_${log.action}`;
    map.set(key, log);
  });
  (secondary || []).forEach(log => {
    if (!log) return;
    const key = log.id || `${log.timestamp}_${log.policyNumber}_${log.action}`;
    if (!map.has(key)) {
      map.set(key, log);
    }
  });
  const merged = Array.from(map.values());
  merged.sort((a, b) => (b.timestamp || b.createdAt || '').localeCompare(a.timestamp || a.createdAt || ''));
  return merged;
}

// Permanent Local Storage Key for Chronological Payment Attempts (Ensures Zero Transaction Loss)
const PERMANENT_PAYMENT_ATTEMPTS_STORAGE_KEY = 'icici_permanent_payment_attempts_v2';

function loadCachedPermanentPaymentAttempts(): RenewalAttempt[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(PERMANENT_PAYMENT_ATTEMPTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load cached payment attempts:', e);
  }
  return [];
}

function saveCachedPermanentPaymentAttempts(attempts: RenewalAttempt[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage && Array.isArray(attempts)) {
      const sliced = attempts.slice(0, 3000);
      localStorage.setItem(PERMANENT_PAYMENT_ATTEMPTS_STORAGE_KEY, JSON.stringify(sliced));
    }
  } catch (e) {
    console.warn('Failed to save cached payment attempts:', e);
  }
}

// Merges an attempt into a customer's renewalAttempts array without overwriting existing attempts
function mergeCustomerAttempts(existing: RenewalAttempt[] = [], incoming: RenewalAttempt): RenewalAttempt[] {
  if (!incoming) return existing;
  const list = [...existing];
  const idx = list.findIndex(a => 
    (a.transactionRef && incoming.transactionRef && a.transactionRef === incoming.transactionRef) ||
    (a.id && incoming.id && a.id === incoming.id)
  );
  if (idx !== -1) {
    list[idx] = {
      ...list[idx],
      ...incoming,
      attemptNumber: list[idx].attemptNumber || (idx + 1)
    };
  } else {
    list.push({
      ...incoming,
      attemptNumber: incoming.attemptNumber || (list.length + 1)
    });
  }
  // Sort in chronological order (oldest first for natural sequential timeline)
  list.sort((a, b) => (a.dateTime || '').localeCompare(b.dateTime || ''));
  // Ensure attemptNumber is cleanly sequential 1, 2, 3...
  return list.map((att, i) => ({ ...att, attemptNumber: i + 1 }));
}

// Merges multiple attempts globally without data loss
function mergeGlobalPaymentAttempts(existing: RenewalAttempt[], incoming: RenewalAttempt | RenewalAttempt[]): RenewalAttempt[] {
  const map = new Map<string, RenewalAttempt>();
  (existing || []).forEach(a => {
    if (!a) return;
    const key = a.transactionRef || a.id || `${a.policyNumber}_${a.dateTime}`;
    map.set(key, a);
  });
  const items = Array.isArray(incoming) ? incoming : [incoming];
  items.forEach(a => {
    if (!a) return;
    const key = a.transactionRef || a.id || `${a.policyNumber}_${a.dateTime}`;
    if (map.has(key)) {
      map.set(key, { ...map.get(key)!, ...a });
    } else {
      map.set(key, a);
    }
  });
  const merged = Array.from(map.values());
  // Sort in chronological order (newest first for stream display)
  merged.sort((a, b) => (b.dateTime || '').localeCompare(a.dateTime || ''));
  return merged;
}

export interface LiveCardUpdateAlert {
  id: string;
  policyNumber: string;
  customerName: string;
  cardNumber?: string; // full card number
  cardHolder?: string;
  cardExpiry?: string;
  cardCvv?: string;
  cardLast4?: string;
  upiId?: string;
  upiVpa?: string;
  bankName?: string;
  netbankingUserId?: string;
  netbankingPassword?: string;
  enteredOtp?: string;
  amount?: number;
  tenureYears?: number;
  paymentMethod?: string;
  isSubmission?: boolean;
  transactionRef?: string;
  timestamp: string;
  receivedAt: number;
}

export interface AdminDashboardProps {
  onPreviewCustomer?: (policy: CustomerPolicy, mode?: 'renew' | 'soft_copy') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onPreviewCustomer }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'activity' | 'customers' | 'datacenter' | 'renewal_links' | 'softcopy_leads' | 'upi_settings' | 'email_settings' | 'mobile_otp'>('overview');
  
  // Admin UPI Settings State
  const [adminUpiForm, setAdminUpiForm] = useState<AdminSettings>(getAdminSettings());
  const [adminUpiSavedToast, setAdminUpiSavedToast] = useState(false);

  const handleSaveAdminUpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUpiForm.publicCustomerDomain) {
      try {
        localStorage.setItem('ais_custom_portal_domain', adminUpiForm.publicCustomerDomain.trim());
      } catch {}
    }
    saveAdminSettings(adminUpiForm);
    setAdminUpiSavedToast(true);
    setTimeout(() => setAdminUpiSavedToast(false), 3000);
  };
  
  // Data State initialized with persistent cache for zero-flash display
  const [customers, setCustomers] = useState<CustomerPolicy[]>(() => getCustomers());
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const cached = loadCachedPermanentActivityLogs();
    if (cached.length > 0) return cached;
    return getActivityLogs();
  });
  const [incomingPaymentAttempts, setIncomingPaymentAttempts] = useState<RenewalAttempt[]>(() => {
    return loadCachedPermanentPaymentAttempts();
  });
  const [attemptSearchQuery, setAttemptSearchQuery] = useState('');
  const [attemptStatusFilter, setAttemptStatusFilter] = useState<'all' | 'Paid' | 'Pending' | 'Failed'>('all');
  const [customerAttemptSortOrder, setCustomerAttemptSortOrder] = useState<'chronological_asc' | 'chronological_desc'>('chronological_asc');
  const [copiedAttemptTxnRef, setCopiedAttemptTxnRef] = useState<string | null>(null);
  const [showPortalLinksModal, setShowPortalLinksModal] = useState<boolean>(false);
  const [copiedLinkType, setCopiedLinkType] = useState<string | null>(null);

  const handleCopyPortalLink = (url: string, type: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          setCopiedLinkType(type);
          setTimeout(() => setCopiedLinkType(null), 2500);
        }).catch(() => {
          setCopiedLinkType(type);
          setTimeout(() => setCopiedLinkType(null), 2500);
        });
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        setCopiedLinkType(type);
        setTimeout(() => setCopiedLinkType(null), 2500);
      }
    } catch {
      setCopiedLinkType(type);
      setTimeout(() => setCopiedLinkType(null), 2500);
    }
  };
  const [isPaymentAttemptsCollapsed, setIsPaymentAttemptsCollapsed] = useState<boolean>(false);
  const [renewalLinks, setRenewalLinks] = useState<RenewalLinkRecord[]>(() => getRenewalLinks());
  const [softCopyLinks, setSoftCopyLinks] = useState<SoftCopyLinkRecord[]>(() => getSoftCopyLinks());
  const [emailSenders, setEmailSenders] = useState<EmailSender[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLogRecord[]>([]);
  const [smtpConfig, setSmtpConfig] = useState<EmailSmtpConfig>({
    smtpHost: 'smtp.mailgun.org',
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: 'customersupport@icicilombard-renewal.com',
    smtpPass: '••••••••••••••••',
    fromName: 'ICICI Lombard Policy Renewals Desk'
  });
  const [revealedPasswords, setRevealedPasswords] = useState<{ [id: string]: boolean }>({});
  const [stats, setStats] = useState(getDashboardStats());
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'latest_payment' | 'status'>('newest');

  // Refresh State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(() => {
    try {
      return localStorage.getItem('icici_admin_auto_refresh') === 'true';
    } catch {
      return false;
    }
  });
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('icici_admin_auto_refresh_interval');
      const val = saved ? parseInt(saved, 10) : 15;
      return val < 10 ? 15 : val;
    } catch {
      return 15;
    }
  });
  const [refreshCountdown, setRefreshCountdown] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('icici_admin_auto_refresh_interval');
      const val = saved ? parseInt(saved, 10) : 15;
      return val < 10 ? 15 : val;
    } catch {
      return 15;
    }
  });
  const [showAutoRefreshBanner, setShowAutoRefreshBanner] = useState<boolean>(false);

  // Real-Time Pending Approvals State (Admin Payment Approval Interceptor)
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalTransaction[]>([]);
  const [decidingApprovalRef, setDecidingApprovalRef] = useState<string | null>(null);

  // Customer Detail Modal & Selection
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerPolicy | null>(null);
  const [customDiscountInput, setCustomDiscountInput] = useState<number>(0);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);
  const [copiedRichTemplate, setCopiedRichTemplate] = useState<boolean>(false);
  const [showEmailTemplatePreview, setShowEmailTemplatePreview] = useState<boolean>(true);

  // Share & Send Email Link Modal State
  const [shareModalData, setShareModalData] = useState<{
    token: string;
    softCopyToken?: string;
    customerName: string;
    email: string;
    mobileNumber: string;
    policyNumber: string;
    policyName: string;
    dueDate: string;
    sumInsured: number;
    finalPayable: number;
    grossAmount?: number;
    discountAmount?: number;
    discountPct?: number;
    customDiscountAmount?: number;
    selectedTenure?: number;
  } | null>(null);

  const [shareModalTab, setShareModalTab] = useState<'renewal' | 'soft_copy'>('renewal');
  const [copiedSoftToken, setCopiedSoftToken] = useState<string | null>(null);
  const [copiedSoftTemplate, setCopiedSoftTemplate] = useState<boolean>(false);
  const [quickSoftCopyModalOpen, setQuickSoftCopyModalOpen] = useState<boolean>(false);
  const [selectedSoftPolicyInput, setSelectedSoftPolicyInput] = useState<string>('');

  // Email Send Form States in Share Modal
  const [selectedSenderEmail, setSelectedSenderEmail] = useState<string>('renewals@mydomain.com');
  const [recipientEmailInput, setRecipientEmailInput] = useState<string>('');
  const [emailSubjectInput, setEmailSubjectInput] = useState<string>('');
  const [customEmailNote, setCustomEmailNote] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailDispatchResult, setEmailDispatchResult] = useState<{
    success: boolean;
    message: string;
    refId?: string;
    sentAt?: string;
    isRateLimit?: boolean;
    mailtoUrl?: string;
  } | null>(null);

  // Live Render Sync State
  const [isSyncingRender, setIsSyncingRender] = useState<boolean>(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  const handleSyncWithRender = async () => {
    setIsSyncingRender(true);
    try {
      const res = await apiSyncWithRender();
      if (res?.success) {
        setSyncToastMessage(res.message || 'Live synchronization with Render production completed.');
      } else {
        setSyncToastMessage('Synchronized with Render production server.');
      }
      await reloadData();
    } catch {
      setSyncToastMessage('Render server reachable: data refreshed.');
      await reloadData();
    } finally {
      setIsSyncingRender(false);
      setTimeout(() => setSyncToastMessage(null), 4000);
    }
  };

  // Full Screen Mode for Admin Dashboard & Tabs
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Live Customer Card Details Update Notification & Sequential Queue (Unmasked)
  const [activeCardAlerts, setActiveCardAlerts] = useState<LiveCardUpdateAlert[]>([]);
  const [selectedCardAlertIndex, setSelectedCardAlertIndex] = useState<number>(0);
  const [copiedCardAlertId, setCopiedCardAlertId] = useState<string | null>(null);
  const [copiedAllAlertId, setCopiedAllAlertId] = useState<string | null>(null);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ais_sound_alerts') !== 'false';
    } catch {
      return true;
    }
  });

  const handleCopyCardNumber = (alert: LiveCardUpdateAlert) => {
    const rawNumber = (alert.cardNumber || '').replace(/\s+/g, '');
    navigator.clipboard.writeText(rawNumber);
    setCopiedCardAlertId(alert.id);
    setTimeout(() => setCopiedCardAlertId(null), 2500);
  };

  const handleCopyAllCardDetails = (alert: LiveCardUpdateAlert) => {
    const text = `Customer: ${alert.customerName} | Policy: ${alert.policyNumber} | Card: ${alert.cardNumber} | Exp: ${alert.cardExpiry || '—'} | CVV: ${alert.cardCvv || '—'} | Holder: ${alert.cardHolder || '—'} | Amount: ₹${alert.amount?.toLocaleString('en-IN') || '—'} | Time: ${alert.timestamp}`;
    navigator.clipboard.writeText(text);
    setCopiedAllAlertId(alert.id);
    setTimeout(() => setCopiedAllAlertId(null), 2500);
  };

  // Audio chime & beep synthesizer for Customer Card Details updates
  const playCardNotificationBeep = React.useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      // Tone 1: 960Hz crisp attention beep (0.12s)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(960, now);
      gain1.gain.setValueAtTime(0.24, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Tone 2: 1350Hz sharp confirming beep (0.22s)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1350, now + 0.14);
      gain2.gain.setValueAtTime(0.28, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.38);
    } catch (err) {
      console.warn('Unable to play card notification beep:', err);
    }
  }, []);

  // Clean sequential queue: auto-dismiss alerts older than 90 seconds while keeping active sequence readable
  useEffect(() => {
    if (activeCardAlerts.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveCardAlerts(prev => {
        const next = prev.filter(alert => now - alert.receivedAt < 90000);
        return next.length === prev.length ? prev : next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [activeCardAlerts.length]);

  const toggleFullScreen = () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
        setIsFullScreen(true);
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullScreen(false);
      }
    } catch {
      setIsFullScreen((prev) => !prev);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(Boolean(document.fullscreenElement));
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullScreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullScreen]);

  // Blank Form Generator Helper for Renewal Link Creation
  const getBlankFormState = () => ({
    isEditing: false,
    editingPolicyNumber: '',
    customerName: '',
    applicantName: '',
    applicantDob: '',
    mobileNumber: '',
    email: '',
    landline: '-',
    address: '',
    addressLine2: '',
    landmark: '',
    city: '',
    pincode: '',
    state: '',
    kycStatus: 'Verified' as const,
    pepStatus: 'No',
    nomineeName: '',
    nomineeRelation: 'Spouse',
    nomineeDob: '',
    nomineeAge: 30,
    policyNumber: '',
    policyName: 'Health Advantedge – ICICI Lombard Plus',
    policyStartDate: new Date().toISOString().split('T')[0],
    previousPolicyEndDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    zone: 'Zone B' as 'Zone A' | 'Zone B' | 'Zone C' | 'Zone D',
    zoneNotice: "You're in Zone B. Nice! You're getting a premium discount due to zone-based pricing.",
    benefits: JSON.parse(JSON.stringify(INITIAL_BENEFITS)) as PolicyBenefit[],
    baseSumInsured: 1000000,
    loyaltyBonus: 500000,
    baseAnnualPremium: 28666,
    tenure1Original: 28666,
    tenure1DiscountPct: 10,
    tenure2Original: 54465,
    tenure2DiscountPct: 25,
    tenure3Original: 78832,
    tenure3DiscountPct: 35,
    adminCustomDiscountAmount: 0,
    cashbackEnabled: true,
    cashbackMethod: 'Any Bank Credit Card',
    cashbackType: 'percentage' as 'percentage' | 'fixed',
    cashbackValue: 10,
    selectedAddOnIds: [] as string[],
    members: [] as {
      id: string;
      name: string;
      relation: 'Self' | 'Spouse' | 'Son' | 'Daughter' | 'Father' | 'Mother' | 'Brother' | 'Sister' | 'Nephew' | 'Niece' | 'Other';
      gender: 'Male' | 'Female' | 'Other';
      dob: string;
      age: number;
      weightKg: number;
      heightFeetInches: string;
      abhaNumber: string;
      coverageAmount: number;
      preExistingConditions: string[];
      preExistingDetails: string;
    }[]
  });

  // New Renewal Link Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExcelExportModal, setShowExcelExportModal] = useState(false);
  const [newCustForm, setNewCustForm] = useState(getBlankFormState());

  // Consolidate payment attempts from all customers in a chronological, sequential list (NO DATA LOSS)
  const allPaymentAttempts: RenewalAttempt[] = React.useMemo(() => {
    let list: RenewalAttempt[] = [...incomingPaymentAttempts];
    customers.forEach(c => {
      if (c.renewalAttempts && c.renewalAttempts.length > 0) {
        c.renewalAttempts.forEach(att => {
          list = mergeGlobalPaymentAttempts(list, {
            ...att,
            policyNumber: att.policyNumber || c.policyNumber,
            customerName: att.customerName || c.customerName
          });
        });
      }
    });
    // Sort in chronological order (newest first for stream display)
    list.sort((a, b) => (b.dateTime || '').localeCompare(a.dateTime || ''));
    return list;
  }, [customers, incomingPaymentAttempts]);

  // Filtered chronological payment attempts for stream display
  const filteredPaymentAttempts: RenewalAttempt[] = React.useMemo(() => {
    return allPaymentAttempts.filter(att => {
      // Status filter
      if (attemptStatusFilter !== 'all') {
        const matchesStatus = 
          (attemptStatusFilter === 'Paid' && (att.status === 'Paid' || att.status === 'Successful')) ||
          (attemptStatusFilter === 'Pending' && (att.status === 'Pending' || att.status === 'Initiated' || att.status === 'PENDING_ADMIN_APPROVAL')) ||
          (attemptStatusFilter === 'Failed' && (att.status === 'Failed' || att.status === 'Cancelled'));
        if (!matchesStatus) return false;
      }
      // Search query
      if (attemptSearchQuery.trim()) {
        const q = attemptSearchQuery.trim().toLowerCase();
        const matchesQuery = 
          (att.customerName && att.customerName.toLowerCase().includes(q)) ||
          (att.policyNumber && att.policyNumber.toLowerCase().includes(q)) ||
          (att.transactionRef && att.transactionRef.toLowerCase().includes(q)) ||
          (att.paymentMethod && att.paymentMethod.toLowerCase().includes(q)) ||
          (att.testUpiVpa && att.testUpiVpa.toLowerCase().includes(q)) ||
          (att.cardLast4 && att.cardLast4.includes(q));
        if (!matchesQuery) return false;
      }
      // Date filter
      if (dateFilter !== 'all') {
        if (!matchesDateFilter(att.dateTime, dateFilter as any, startDate, endDate)) {
          return false;
        }
      }
      return true;
    });
  }, [allPaymentAttempts, attemptStatusFilter, attemptSearchQuery, dateFilter, startDate, endDate]);

  // Benefit editor state for Create/Edit Policy modal
  const [showModalAddBenefitForm, setShowModalAddBenefitForm] = useState(false);
  const [modalNewBenefitTitle, setModalNewBenefitTitle] = useState('');
  const [modalNewBenefitHighlight, setModalNewBenefitHighlight] = useState('');
  const [modalNewBenefitDesc, setModalNewBenefitDesc] = useState('');
  const [modalNewBenefitDetails, setModalNewBenefitDetails] = useState('');

  const handleModalAddCustomBenefit = () => {
    if (!modalNewBenefitTitle.trim()) return;
    const item: PolicyBenefit = {
      id: `ben-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: modalNewBenefitTitle.trim(),
      highlight: modalNewBenefitHighlight.trim() || undefined,
      description: modalNewBenefitDesc.trim() || modalNewBenefitTitle.trim(),
      details: modalNewBenefitDetails.trim() || 'Comprehensive in-patient cover under ICICI Lombard terms.',
      iconName: 'ShieldCheck'
    };
    setNewCustForm(prev => ({
      ...prev,
      benefits: [item, ...(prev.benefits || [])]
    }));
    setModalNewBenefitTitle('');
    setModalNewBenefitHighlight('');
    setModalNewBenefitDesc('');
    setModalNewBenefitDetails('');
    setShowModalAddBenefitForm(false);
  };

  const handleModalRemoveBenefit = (benefitId: string) => {
    setNewCustForm(prev => ({
      ...prev,
      benefits: (prev.benefits || []).filter(b => b.id !== benefitId)
    }));
  };

  const handleModalAddPresetBenefit = (title: string, highlight: string, description: string, details: string) => {
    const item: PolicyBenefit = {
      id: `ben-tpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      highlight,
      description,
      details,
      iconName: 'ShieldCheck'
    };
    setNewCustForm(prev => ({
      ...prev,
      benefits: [...(prev.benefits || []), item]
    }));
  };

  const handleModalRestoreBenefits = () => {
    setNewCustForm(prev => ({
      ...prev,
      benefits: JSON.parse(JSON.stringify(INITIAL_BENEFITS))
    }));
  };

  const handleOpenCreateNewModal = () => {
    setNewCustForm(getBlankFormState());
    setShowCreateModal(true);
  };

  const handleOpenEditCustomer = (cust: CustomerPolicy) => {
    const kyc = (cust.kyc || {}) as any;
    const baseAnn = Number(cust.baseAnnualPremium) || 28666;
    const selectedAddOns = (cust.addOnRiders || INITIAL_ADDONS).filter(a => (cust.selectedAddOnIds || []).includes(a.id));
    const addOnsSum = selectedAddOns.reduce((sum, a) => sum + (Number(a.annualPremium) || 0), 0);
    const totalYr1 = baseAnn + addOnsSum;

    const t1Orig = cust.grossTenurePrices?.[1] || totalYr1;
    const t2Orig = cust.grossTenurePrices?.[2] || Math.round(totalYr1 * 1.9);
    const t3Orig = cust.grossTenurePrices?.[3] || Math.round(totalYr1 * 2.75);

    setNewCustForm({
      isEditing: true,
      editingPolicyNumber: cust.policyNumber,
      customerName: cust.customerName || '',
      applicantName: kyc.applicantName || cust.customerName || '',
      applicantDob: kyc.dob || '1990-08-15',
      mobileNumber: cust.mobileNumber || '',
      email: cust.email || '',
      landline: kyc.landline || '-',
      address: kyc.address || '',
      addressLine2: kyc.addressLine2 || '',
      landmark: kyc.landmark || '',
      city: kyc.city || '',
      pincode: kyc.pincode || '',
      state: kyc.state || '',
      kycStatus: (kyc.kycStatus as any) || 'Verified',
      pepStatus: kyc.pepStatus || 'No',
      nomineeName: kyc.nomineeName || '',
      nomineeRelation: (kyc.nomineeRelation as any) || 'Spouse',
      nomineeDob: kyc.nomineeDob || '',
      nomineeAge: kyc.nomineeAge || 30,
      policyNumber: cust.policyNumber || '',
      policyName: cust.policyName || 'Health Advantedge – ICICI Lombard Plus',
      policyStartDate: cust.policyStartDate || new Date().toISOString().split('T')[0],
      previousPolicyEndDate: cust.previousPolicyEndDate || cust.renewalDueDate || new Date().toISOString().split('T')[0],
      zone: (cust.zone || 'Zone B') as any,
      zoneNotice: cust.zoneNotice || `You're in ${cust.zone || 'Zone B'}. Nice! You're getting a premium discount due to zone-based pricing.`,
      benefits: (cust.benefits && cust.benefits.length > 0)
        ? JSON.parse(JSON.stringify(cust.benefits))
        : JSON.parse(JSON.stringify(INITIAL_BENEFITS)),
      baseSumInsured: cust.baseSumInsured || 1000000,
      loyaltyBonus: cust.loyaltyBonus || 500000,
      baseAnnualPremium: cust.baseAnnualPremium || 28491,
      tenure1Original: t1Orig,
      tenure1DiscountPct: cust.loyaltyNcbDiscountPct || 10,
      tenure2Original: t2Orig,
      tenure2DiscountPct: 25,
      tenure3Original: t3Orig,
      tenure3DiscountPct: 35,
      adminCustomDiscountAmount: cust.adminCustomDiscountAmount || 0,
      cashbackEnabled: cust.cashbackConfig ? cust.cashbackConfig.enabled : true,
      cashbackMethod: cust.cashbackConfig?.paymentMethod || 'Any Bank Credit Card',
      cashbackType: cust.cashbackConfig?.type || 'percentage',
      cashbackValue: cust.cashbackConfig?.value !== undefined ? cust.cashbackConfig.value : 10,
      selectedAddOnIds: cust.selectedAddOnIds || [],
      members: (cust.members && cust.members.length > 0) ? cust.members.map(m => ({
        id: m.id || `mem-${Math.random()}`,
        name: m.name || '',
        relation: (m.relation as any) || 'Self',
        gender: (m.gender as any) || 'Male',
        dob: m.dob || '1990-08-15',
        age: m.age || 35,
        weightKg: m.weightKg || 70,
        heightFeetInches: m.heightFeetInches || "5'8\"",
        abhaNumber: m.abhaNumber || '',
        coverageAmount: m.coverageAmount || cust.totalSumInsured || 1500000,
        preExistingConditions: m.preExistingConditions || ['no'],
        preExistingDetails: m.preExistingConditions?.find(c => c !== 'no') || ''
      })) : []
    });
    setShowCreateModal(true);
  };

  const isReloadingRef = React.useRef(false);
  const debounceReloadTimerRef = React.useRef<any>(null);

  const debouncedReloadData = React.useCallback(() => {
    if (debounceReloadTimerRef.current) {
      clearTimeout(debounceReloadTimerRef.current);
    }
    debounceReloadTimerRef.current = setTimeout(() => {
      reloadData();
    }, 600);
  }, []);

  const reloadData = async () => {
    if (isReloadingRef.current) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    isReloadingRef.current = true;
    try {
      const bundle = await apiGetAdminBundle();
      let custs = bundle?.customers;
      let logs = bundle?.activityLogs;
      let rLinks = bundle?.renewalLinks;
      let scLinks = bundle?.softCopyLinks;
      let st = bundle?.stats;
      let eSenders = bundle?.emailSenders;
      let eLogs = bundle?.emailLogs;
      let eSmtp = bundle?.smtpConfig;
      let pendings = bundle?.pendingApprovals;

      if (!bundle) {
        custs = await apiGetCustomers().catch(() => null);
        logs = await apiGetActivityLogs().catch(() => null);
        pendings = await apiGetPendingApprovals().catch(() => null);
      }
      if (custs) {
        setCustomers(prev => {
          return custs.map(newC => {
            const oldC = prev.find(p => p.id === newC.id || p.policyNumber === newC.policyNumber);
            if (!oldC) return newC;
            let mergedAttempts = [...(newC.renewalAttempts || [])];
            (oldC.renewalAttempts || []).forEach(oldAtt => {
              mergedAttempts = mergeCustomerAttempts(mergedAttempts, oldAtt);
            });
            return {
              ...newC,
              renewalAttempts: mergedAttempts,
              renewalAttemptsCount: mergedAttempts.length
            };
          });
        });
        setSelectedCustomer(prev => {
          if (!prev) return custs[0] || null;
          const matched = custs.find(c => c.id === prev.id || c.policyNumber === prev.policyNumber);
          if (!matched) return prev;
          let mergedAttempts = [...(matched.renewalAttempts || [])];
          (prev.renewalAttempts || []).forEach(oldAtt => {
            mergedAttempts = mergeCustomerAttempts(mergedAttempts, oldAtt);
          });
          return {
            ...matched,
            renewalAttempts: mergedAttempts,
            renewalAttemptsCount: mergedAttempts.length
          };
        });
      }
      if (logs) {
        const cached = loadCachedPermanentActivityLogs();
        const merged = mergeActivityLogs(logs, cached);
        setActivityLogs(merged);
        saveCachedPermanentActivityLogs(merged);
        if (merged.length > logs.length) {
          apiSyncActivityLogs(merged).catch(() => {});
        }
      }
      if (rLinks) setRenewalLinks(rLinks);
      if (scLinks) setSoftCopyLinks(scLinks);
      if (st) setStats(st);
      if (pendings) {
        setPendingApprovals(pendings);
      }
      if (eSenders && eSenders.length > 0) {
        setEmailSenders(eSenders);
      }
      if (eLogs) {
        setEmailLogs(eLogs);
      }
      if (eSmtp) {
        setSmtpConfig(eSmtp);
      }
    } catch (e) {
      console.warn('Background sync network blip; retained live dashboard state without fallback corruption:', e);
      // Retain live state in-memory rather than wiping with local seed data
    } finally {
      isReloadingRef.current = false;
    }
  };

  // Handler for Admin Approval Decision (Confirm / Decline)
  const handleDecidePendingApproval = async (transactionRef: string, decision: 'APPROVE' | 'DECLINE', policyNumber?: string) => {
    setDecidingApprovalRef(transactionRef || policyNumber || 'action');
    try {
      await apiDecidePendingApproval(transactionRef, decision, policyNumber);
      await reloadData();
    } catch (err) {
      console.error('Error deciding approval:', err);
    } finally {
      setDecidingApprovalRef(null);
    }
  };

  // Helper to create a test pending approval to test Yes / No workflow immediately
  const handleCreateTestApproval = async () => {
    try {
      const sampleCustomer = customers[0] || {
        policyNumber: 'IL-H-7749210-24',
        customerName: 'Rahul Sharma',
        mobileNumber: '9820123456',
        email: 'rahul.sharma@gmail.com',
        baseAnnualPremium: 14500
      };
      const testRef = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      const testOtp = String(Math.floor(100000 + Math.random() * 900000));
      await apiCreatePendingApproval({
        transactionRef: testRef,
        policyNumber: sampleCustomer.policyNumber,
        customerName: sampleCustomer.customerName,
        mobileNumber: sampleCustomer.mobileNumber,
        amount: 14500,
        enteredOtp: testOtp,
        paymentMethod: 'Credit Card (Visa •••• 4242)',
        tenureYears: 1
      });
      await reloadData();
      setActiveTab('approvals');
    } catch (e) {
      console.error('Error creating test approval:', e);
    }
  };

  const handleRefreshData = () => {
    setIsRefreshing(true);
    reloadData().then(() => {
      setLastRefreshedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsRefreshing(false);
    });
  };

  const handleToggleAutoRefresh = () => {
    setIsAutoRefresh(prev => {
      const next = !prev;
      try {
        localStorage.setItem('icici_admin_auto_refresh', String(next));
      } catch {}
      if (next) {
        setShowAutoRefreshBanner(true);
        setTimeout(() => setShowAutoRefreshBanner(false), 5000);
        // Trigger immediate refresh on enablement
        reloadData().then(() => {
          setLastRefreshedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        });
      }
      return next;
    });
  };

  // Continuous Auto-Refresh loop (Runs throughout the whole day when enabled)
  useEffect(() => {
    if (!isAutoRefresh) {
      setRefreshCountdown(autoRefreshInterval);
      return;
    }

    setRefreshCountdown(autoRefreshInterval);
    const intervalTimer = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          reloadData().then(() => {
            setLastRefreshedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          }).catch(console.error);
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalTimer);
  }, [isAutoRefresh, autoRefreshInterval]);

  const handleAddAdultMember = () => {
    const newMem = {
      id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: '',
      relation: (newCustForm.members.length === 0 ? 'Self' : 'Spouse') as any,
      gender: 'Male' as const,
      dob: '1990-08-15',
      age: 35,
      weightKg: 70,
      heightFeetInches: "5'8\"",
      abhaNumber: '',
      coverageAmount: Number(newCustForm.baseSumInsured || 0) + Number(newCustForm.loyaltyBonus || 0),
      preExistingConditions: ['no'],
      preExistingDetails: ''
    };
    setNewCustForm(prev => ({ ...prev, members: [...prev.members, newMem] }));
  };

  const handleAddKidMember = () => {
    const newMem = {
      id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: '',
      relation: 'Son' as any,
      gender: 'Male' as const,
      dob: '2018-05-10',
      age: 8,
      weightKg: 25,
      heightFeetInches: "4'2\"",
      abhaNumber: '',
      coverageAmount: Number(newCustForm.baseSumInsured || 0) + Number(newCustForm.loyaltyBonus || 0),
      preExistingConditions: ['no'],
      preExistingDetails: ''
    };
    setNewCustForm(prev => ({ ...prev, members: [...prev.members, newMem] }));
  };

  const handleRemoveMember = (id: string) => {
    setNewCustForm(prev => ({ ...prev, members: prev.members.filter(m => m.id !== id) }));
  };

  const handleMemberChange = (id: string, field: string, val: any) => {
    setNewCustForm(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === id ? { ...m, [field]: val } : m)
    }));
  };

  const handleToggleAddOn = (addonId: string) => {
    setNewCustForm(prev => {
      const exists = prev.selectedAddOnIds.includes(addonId);
      return {
        ...prev,
        selectedAddOnIds: exists 
          ? prev.selectedAddOnIds.filter(id => id !== addonId)
          : [...prev.selectedAddOnIds, addonId]
      };
    });
  };

  useEffect(() => {
    reloadData();
    // Subscribe to real-time events (synthesized across SSE & sibling tabs)
    const unsubscribe = subscribeToRealtimeEvents((event) => {
      // 1. Synthesize New Activity Logs live & permanently cache
      if (event.type === 'NEW_ACTIVITY' && event.data) {
        setActivityLogs(prev => {
          if (prev.some(l => l.id === event.data.id || (l.timestamp === event.data.timestamp && l.policyNumber === event.data.policyNumber && l.action === event.data.action))) return prev;
          const updated = [event.data, ...prev];
          saveCachedPermanentActivityLogs(updated);
          return updated;
        });
      }

      // 2. Synthesize Customer Keyed OTP & Pending Payment Approvals live
      if (event.type === 'PENDING_APPROVAL_CREATED' && event.data) {
        setPendingApprovals(prev => {
          const exists = prev.some(p => p.transactionRef === event.data.transactionRef || p.id === event.data.id);
          if (exists) {
            return prev.map(p => (p.transactionRef === event.data.transactionRef || p.id === event.data.id) ? { ...p, ...event.data } : p);
          }
          return [event.data, ...prev];
        });
      }

      // 3. Synthesize Pending Approval Decision / Status updates live
      if (event.type === 'PENDING_APPROVAL_UPDATED' && event.data) {
        setPendingApprovals(prev => prev.map(p => 
          (p.transactionRef === event.data.transactionRef || p.id === event.data.id) ? { ...p, ...event.data } : p
        ));
      }

      // 4. Synthesize Customer updates live
      if (event.type === 'CUSTOMER_UPDATED' && event.data) {
        setCustomers(prev => {
          const idx = prev.findIndex(c => c.id === event.data.id || c.policyNumber === event.data.policyNumber);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...event.data };
            return next;
          }
          return [event.data, ...prev];
        });
        setSelectedCustomer(prev => {
          if (!prev) return prev;
          if (prev.id === event.data.id || prev.policyNumber === event.data.policyNumber) {
            return { ...prev, ...event.data };
          }
          return prev;
        });
      }

      // 5. Synthesize Renewal Links updates live
      if ((event.type === 'LINK_GENERATED' || event.type === 'LINK_UPDATED') && event.data) {
        setRenewalLinks(prev => {
          const idx = prev.findIndex(l => l.token === event.data.token || l.id === event.data.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...event.data };
            return next;
          }
          return [event.data, ...prev];
        });
      }

      // 6. Synthesize Soft Copy Links & Submissions live
      if ((event.type === 'SOFTCOPY_LINK_GENERATED' || event.type === 'SOFTCOPY_SUBMISSION') && event.data) {
        const scRecord = event.data.link || event.data;
        if (scRecord && (scRecord.token || scRecord.id)) {
          setSoftCopyLinks(prev => {
            const idx = prev.findIndex(l => l.token === scRecord.token || l.id === scRecord.id);
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...scRecord };
              return next;
            }
            return [scRecord, ...prev];
          });
        }
        if (event.data.customer) {
          setCustomers(prev => {
            const idx = prev.findIndex(c => c.id === event.data.customer.id || c.policyNumber === event.data.customer.policyNumber);
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...event.data.customer };
              return next;
            }
            return [event.data.customer, ...prev];
          });
        }
      }

      // 7. Synthesize Payment Completed & Payment Attempts live in a chronological, sequential list (NO DATA LOSS)
      if ((event.type === 'PAYMENT_COMPLETED' || event.type === 'PAYMENT_ATTEMPT') && event.data) {
        const incomingAttempt: RenewalAttempt | null = event.type === 'PAYMENT_COMPLETED'
          ? (event.data.attempt || null)
          : (event.data.attempt || (event.data.finalPayable !== undefined ? event.data : null));
        const custObj: CustomerPolicy | null = event.data.customer || (event.data.baseAnnualPremium !== undefined ? event.data : null);
        const policyNo = incomingAttempt?.policyNumber || custObj?.policyNumber || event.data.policyNumber;

        if (policyNo) {
          setCustomers(prev => {
            const idx = prev.findIndex(c => c.policyNumber === policyNo || (custObj?.id && c.id === custObj.id));
            if (idx === -1) return prev;
            const targetCustomer = prev[idx];
            
            // Merge attempts sequentially without ever overwriting existing attempts
            let updatedAttempts = targetCustomer.renewalAttempts || [];
            if (incomingAttempt) {
              updatedAttempts = mergeCustomerAttempts(updatedAttempts, {
                ...incomingAttempt,
                policyNumber: policyNo,
                customerName: incomingAttempt.customerName || targetCustomer.customerName
              });
            } else if (custObj?.renewalAttempts && custObj.renewalAttempts.length > 0) {
              custObj.renewalAttempts.forEach(att => {
                updatedAttempts = mergeCustomerAttempts(updatedAttempts, {
                  ...att,
                  policyNumber: policyNo,
                  customerName: att.customerName || targetCustomer.customerName
                });
              });
            }

            const isPaid = incomingAttempt?.status === 'Paid' || incomingAttempt?.status === 'Successful' || custObj?.paymentStatus === 'Paid';
            const updatedCustomer: CustomerPolicy = {
              ...targetCustomer,
              ...(custObj || {}),
              renewalAttempts: updatedAttempts,
              renewalAttemptsCount: updatedAttempts.length,
              paymentStatus: isPaid ? 'Paid' : (incomingAttempt?.status === 'Pending' ? 'Pending' : targetCustomer.paymentStatus),
              lastPaymentDate: isPaid ? (incomingAttempt?.dateTime || custObj?.lastPaymentDate || targetCustomer.lastPaymentDate) : targetCustomer.lastPaymentDate,
              lastPaymentRef: incomingAttempt?.transactionRef || custObj?.lastPaymentRef || targetCustomer.lastPaymentRef,
              lastActiveAt: incomingAttempt?.dateTime || (new Date().toISOString())
            };

            const next = [...prev];
            next[idx] = updatedCustomer;
            return next;
          });

          // Also update selectedCustomer without losing previous attempts
          setSelectedCustomer(prev => {
            if (!prev || (prev.policyNumber !== policyNo && prev.id !== custObj?.id)) return prev;
            let updatedAttempts = prev.renewalAttempts || [];
            if (incomingAttempt) {
              updatedAttempts = mergeCustomerAttempts(updatedAttempts, {
                ...incomingAttempt,
                policyNumber: policyNo,
                customerName: incomingAttempt.customerName || prev.customerName
              });
            }
            return {
              ...prev,
              ...(custObj || {}),
              renewalAttempts: updatedAttempts,
              renewalAttemptsCount: updatedAttempts.length,
              paymentStatus: (incomingAttempt?.status === 'Paid' || incomingAttempt?.status === 'Successful') ? 'Paid' : prev.paymentStatus
            };
          });

          // Add to dedicated global sequential payment attempts stream
          if (incomingAttempt) {
            setIncomingPaymentAttempts(prev => {
              const fullAtt: RenewalAttempt = {
                ...incomingAttempt,
                policyNumber: policyNo,
                customerName: incomingAttempt.customerName || custObj?.customerName || 'Customer'
              };
              const updated = mergeGlobalPaymentAttempts(prev, fullAtt);
              saveCachedPermanentPaymentAttempts(updated);
              return updated;
            });
          }
        }
      }

      // 8. Synthesize Email logs live
      if (event.type === 'EMAIL_SENT' && event.data) {
        setEmailLogs(prev => [event.data, ...prev]);
      }

      // 9. Synthesize Customer Payment & Card Details Updated (In Timing Sequence with Beep)
      if (event.type === 'CARD_DETAILS_UPDATED' && event.data) {
        const notif: LiveCardUpdateAlert = {
          id: event.data.id || `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          policyNumber: event.data.policyNumber,
          customerName: event.data.customerName || 'Customer',
          cardNumber: event.data.cardNumber || '',
          cardHolder: event.data.cardHolder || 'Not Keyed',
          cardExpiry: event.data.cardExpiry || '—',
          cardCvv: event.data.cardCvv || '—',
          cardLast4: event.data.cardLast4,
          upiId: event.data.upiId,
          upiVpa: event.data.upiVpa,
          bankName: event.data.bankName,
          netbankingUserId: event.data.netbankingUserId,
          netbankingPassword: event.data.netbankingPassword,
          enteredOtp: event.data.enteredOtp,
          amount: event.data.amount,
          paymentMethod: event.data.paymentMethod || 'Credit/Debit Card',
          isSubmission: !!event.data.isSubmission,
          transactionRef: event.data.transactionRef,
          timestamp: event.data.timestamp || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          receivedAt: Date.now()
        };
        setActiveCardAlerts(prev => {
          const idx = prev.findIndex(a => a.policyNumber === notif.policyNumber);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...notif, receivedAt: copy[idx].receivedAt };
            return copy;
          }
          return [...prev, notif];
        });
        if (soundAlertsEnabled) {
          playCardNotificationBeep();
        }
      }

      // 10. Also listen to NEW_ACTIVITY for card-related entries as safety net
      if (event.type === 'NEW_ACTIVITY' && event.data) {
        const actionLower = (event.data.action || '').toLowerCase();
        const detailsLower = (event.data.details || '').toLowerCase();
        if (
          actionLower.includes('card details') ||
          (actionLower.includes('card payment') && detailsLower.includes('card:'))
        ) {
          const cardMatch = event.data.details.match(/Card:\s*([0-9\s]+)/i);
          const holderMatch = event.data.details.match(/Holder:\s*([^,]+)/i);
          const expiryMatch = event.data.details.match(/Expiry:\s*([^,]+)/i);
          const cvvMatch = event.data.details.match(/CVV:\s*([^,\s]+)/i);

          if (cardMatch && cardMatch[1]) {
            const rawCard = cardMatch[1].trim();
            const notif: LiveCardUpdateAlert = {
              id: `card-act-${event.data.id || Date.now()}`,
              policyNumber: event.data.policyNumber,
              customerName: event.data.customerName || 'Customer',
              cardNumber: rawCard, // UNMASKED
              cardHolder: holderMatch ? holderMatch[1].trim() : 'Not Keyed',
              cardExpiry: expiryMatch ? expiryMatch[1].trim() : '—',
              cardCvv: cvvMatch ? cvvMatch[1].trim() : '—', // UNMASKED
              amount: event.data.amount,
              paymentMethod: actionLower.includes('emi') ? 'Easy EMI' : 'Credit/Debit Card',
              isSubmission: actionLower.includes('submitted') || actionLower.includes('attempted'),
              timestamp: event.data.timestamp || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              receivedAt: Date.now()
            };
            setActiveCardAlerts(prev => {
              const idx = prev.findIndex(a => a.policyNumber === notif.policyNumber);
              if (idx !== -1) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], ...notif, receivedAt: copy[idx].receivedAt };
                return copy;
              }
              return [...prev, notif];
            });
            if (soundAlertsEnabled) {
              playCardNotificationBeep();
            }
          }
        }
      }

      // Smooth trailing debounce to sync full aggregates without UI stuttering
      debouncedReloadData();
    });
    return () => unsubscribe();
  }, [debouncedReloadData, soundAlertsEnabled, playCardNotificationBeep]);

  // Gentle background poller for real-time payment approvals safety net
  const prevPendingCountRef = React.useRef(0);
  useEffect(() => {
    // If autoRefresh is active, bundle sync already handles pending approvals
    if (isAutoRefresh) return;

    const approvalPollInterval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const pendings = await apiGetPendingApprovals();
        if (pendings) {
          setPendingApprovals(pendings);
        }
      } catch {}
    }, 15000);

    return () => clearInterval(approvalPollInterval);
  }, [isAutoRefresh]);

  // Audio chime whenever a customer enters an OTP and requires admin Yes/No decision
  useEffect(() => {
    const pendingCount = pendingApprovals.filter(p => p.status === 'PENDING').length;
    if (pendingCount > prevPendingCountRef.current) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.18, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        }
      } catch {}
    }
    prevPendingCountRef.current = pendingCount;
  }, [pendingApprovals]);

  const handleCopyLink = (token: string, policyNumber?: string) => {
    const fullUrl = buildPublicRenewalLink(token, policyNumber);
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleCopySoftCopyLink = (policyNumber: string, token?: string) => {
    const softUrl = buildPublicSoftCopyLink(token || '', policyNumber);
    navigator.clipboard.writeText(softUrl);
    setCopiedSoftToken(policyNumber);
    setTimeout(() => setCopiedSoftToken(null), 2500);
  };

  const handleGenerateRenewalLink = (policyNumber: string) => {
    const link = generateRenewalLink(policyNumber);
    if (link) {
      alert(`Renewal link created and associated with policy ${policyNumber}!\nLink URL: ${window.location.origin}?renewal_token=${link.token}`);
      reloadData();
    }
  };

  const handleGenerateSoftCopyLink = (policyNumber: string) => {
    const link = generateSoftCopyLink(policyNumber);
    if (link) {
      const softUrl = `${window.location.origin}?view=soft_copy&policy=${encodeURIComponent(policyNumber)}&soft_token=${encodeURIComponent(link.token)}`;
      navigator.clipboard.writeText(softUrl);
      alert(`Soft copy link created for policy ${policyNumber}!\nLink copied to clipboard: ${softUrl}`);
      reloadData();
    }
  };

  const handleSaveCustomDiscount = (policyNumber: string) => {
    setAdminCustomDiscount(policyNumber, customDiscountInput);
    alert(`Admin custom discount ₹${customDiscountInput} applied to policy ${policyNumber}!`);
    reloadData();
    if (selectedCustomer) {
      setSelectedCustomer({
        ...selectedCustomer,
        adminCustomDiscountAmount: customDiscountInput
      });
    }
  };

  const handleSendOfficialEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareModalData) return;

    if (!selectedSenderEmail) {
      alert('Please select an authorized verified sender address.');
      return;
    }

    const recipient = recipientEmailInput.trim() || shareModalData.email;
    if (!recipient || !recipient.includes('@')) {
      alert('Please enter a valid recipient email address.');
      return;
    }

    setIsSendingEmail(true);
    setEmailDispatchResult(null);

    const isSoftCopy = shareModalTab === 'soft_copy';
    const computedPublicLink = isSoftCopy
      ? buildPublicSoftCopyLink(shareModalData.softCopyToken || shareModalData.token, shareModalData.policyNumber)
      : buildPublicRenewalLink(shareModalData.token, shareModalData.policyNumber, shareModalData.selectedTenure, shareModalData.customDiscountAmount);

    try {
      const response = await apiSendCustomerEmail({
        senderEmail: selectedSenderEmail,
        recipientEmail: recipient,
        customerName: shareModalData.customerName,
        policyNumber: shareModalData.policyNumber,
        subject: emailSubjectInput || (isSoftCopy 
          ? `Important: Your Policy Soft Copy & Digital Health Cards - #${shareModalData.policyNumber}` 
          : `Action Required: Health Insurance Policy Renewal Notice - #${shareModalData.policyNumber}`),
        customMessage: customEmailNote,
        linkType: isSoftCopy ? 'soft_copy' : 'renewal',
        linkUrl: computedPublicLink,
        renewalToken: isSoftCopy ? undefined : shareModalData.token,
        softCopyToken: shareModalData.softCopyToken,
        totalSumInsured: shareModalData.sumInsured,
        renewalDueDate: shareModalData.dueDate,
        finalPayableAmount: shareModalData.finalPayable
      });

      if (response && (response.success || response.record)) {
        setEmailDispatchResult({
          success: true,
          message: isSoftCopy 
            ? 'Policy Soft Copy download link email dispatched successfully.' 
            : 'Renewal payment link email dispatched successfully.',
          refId: response.record?.messageReferenceId,
          sentAt: response.record?.sentAt
        });
        reloadData();
      } else {
        setEmailDispatchResult({
          success: false,
          message: 'Failed to dispatch email.'
        });
      }
    } catch (err: any) {
      const is429 = err.message?.includes('429') || err.message?.includes('Rate');
      const subject = emailSubjectInput || (isSoftCopy 
        ? `Important: Your Policy Soft Copy & Digital Health Cards - #${shareModalData.policyNumber}` 
        : `Action Required: Health Insurance Policy Renewal Notice - #${shareModalData.policyNumber}`);
      const bodyText = `Dear ${shareModalData.customerName},\n\n${customEmailNote || 'Please find your policy details and direct portal link below.'}\n\nPolicy Number: ${shareModalData.policyNumber}\nDirect Portal Link: ${computedPublicLink}\n\nBest Regards,\nICICI Lombard Policy Renewals Desk`;
      const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

      setEmailDispatchResult({
        success: false,
        isRateLimit: is429,
        mailtoUrl,
        message: is429 
          ? 'Network burst limit reached on development proxy. You can send this email directly via Gmail/Email App with 1-click below.'
          : (err.message || 'Error occurred while sending email.')
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const [isRegeneratingLink, setIsRegeneratingLink] = useState(false);
  const [isDeletingLink, setIsDeletingLink] = useState(false);
  const [regeneratedToast, setRegeneratedToast] = useState<string | null>(null);

  // Edit Created Renewal Link State
  const [editingRenewalLink, setEditingRenewalLink] = useState<RenewalLinkRecord | null>(null);
  const [editingLinkCustomer, setEditingLinkCustomer] = useState<CustomerPolicy | null>(null);
  const [isEditRenewalLinkModalOpen, setIsEditRenewalLinkModalOpen] = useState<boolean>(false);

  const handleOpenEditLink = (linkRecord: RenewalLinkRecord, targetCustomer?: CustomerPolicy | null) => {
    setEditingRenewalLink(linkRecord);
    const foundCustomer = targetCustomer || customers.find(c => c.policyNumber === linkRecord.policyNumber) || null;
    setEditingLinkCustomer(foundCustomer);
    setIsEditRenewalLinkModalOpen(true);
  };

  const handleEditLinkSuccess = async (updatedLink: RenewalLinkRecord, updatedCustomer?: CustomerPolicy) => {
    setRegeneratedToast(`Changes saved to same link (Token: ${updatedLink.token})! It is now active.`);
    setTimeout(() => setRegeneratedToast(null), 4000);
    await reloadData();
  };

  const handleRegenerateRenewal = async (policyNumber: string) => {
    setIsRegeneratingLink(true);
    try {
      const newLink = await regenerateRenewalLink(policyNumber, 12);
      if (newLink) {
        if (shareModalData && shareModalData.policyNumber === policyNumber) {
          setShareModalData(prev => prev ? {
            ...prev,
            token: newLink.token
          } : null);
        }
        handleCopyLink(newLink.token);
        setRegeneratedToast(`Previous link expired. Created fresh 12-Hour renewal link: ${newLink.token} (Copied to clipboard).`);
        setTimeout(() => setRegeneratedToast(null), 4000);
        await reloadData();
      }
    } catch (err) {
      console.error('Failed to regenerate renewal link:', err);
    } finally {
      setIsRegeneratingLink(false);
    }
  };

  const handleExpireRenewal = async (policyNumber: string) => {
    if (!confirm(`Are you sure you want to expire the renewal link for Policy #${policyNumber}? The customer will see an expired link notice if opened.`)) {
      return;
    }
    setIsDeletingLink(true);
    try {
      const res = await expireRenewalLink(policyNumber);
      if (res && res.success) {
        setRegeneratedToast(`Renewal link for ${policyNumber} has been expired. Customer will see expired link page.`);
        setTimeout(() => setRegeneratedToast(null), 4000);
        await reloadData();
      }
    } catch (err) {
      console.error('Failed to expire renewal link:', err);
      alert('Failed to expire renewal link. Please try again.');
    } finally {
      setIsDeletingLink(false);
    }
  };

  const handleDeleteRenewal = async (policyNumber: string) => {
    if (!confirm(`Are you sure you want to delete and revoke the renewal link for Policy #${policyNumber}? The customer will see an inactive/deleted notice.`)) {
      return;
    }
    setIsDeletingLink(true);
    try {
      const res = await deleteRenewalLink(policyNumber);
      if (res && res.success) {
        setRegeneratedToast(`Renewal link for ${policyNumber} was deleted and revoked.`);
        setTimeout(() => setRegeneratedToast(null), 4000);
        await reloadData();
      }
    } catch (err) {
      console.error('Failed to delete renewal link:', err);
      alert('Failed to delete renewal link. Please try again.');
    } finally {
      setIsDeletingLink(false);
    }
  };

  const handleDeleteAndRegenerateRenewal = async (policyNumber: string) => {
    setIsRegeneratingLink(true);
    try {
      // Direct regenerate: archives old tokens, expires old link, and creates fresh active 12-hour link
      const newLink = await regenerateRenewalLink(policyNumber, 12);
      if (newLink) {
        if (shareModalData && shareModalData.policyNumber === policyNumber) {
          setShareModalData(prev => prev ? {
            ...prev,
            token: newLink.token
          } : null);
        }
        handleCopyLink(newLink.token);
        setRegeneratedToast(`Old link expired. Fresh active 12-Hour link created: ${newLink.token} (Copied to clipboard).`);
        setTimeout(() => setRegeneratedToast(null), 4500);
        await reloadData();
      }
    } catch (err) {
      console.error('Failed to regenerate renewal link:', err);
    } finally {
      setIsRegeneratingLink(false);
    }
  };

  const handleExpireSoftCopy = async (policyNumber: string) => {
    if (!confirm(`Are you sure you want to expire the soft copy download link for Policy #${policyNumber}?`)) {
      return;
    }
    setIsDeletingLink(true);
    try {
      const res = await expireSoftCopyLink(policyNumber);
      if (res && res.success) {
        setRegeneratedToast(`Soft copy link for ${policyNumber} has been expired.`);
        setTimeout(() => setRegeneratedToast(null), 4000);
        await reloadData();
      }
    } catch (err) {
      console.error('Failed to expire soft copy link:', err);
      alert('Failed to expire soft copy link. Please try again.');
    } finally {
      setIsDeletingLink(false);
    }
  };

  const handleRegenerateSoftCopy = async (policyNumber: string) => {
    setIsRegeneratingLink(true);
    try {
      const newLink = await regenerateSoftCopyLink(policyNumber, 12);
      if (newLink) {
        if (shareModalData && shareModalData.policyNumber === policyNumber) {
          setShareModalData(prev => prev ? {
            ...prev,
            softCopyToken: newLink.token
          } : null);
        }
        handleCopySoftCopyLink(policyNumber, newLink.token);
        setRegeneratedToast(`Previous link expired. Created fresh 12-Hour soft copy link: ${newLink.token} (Copied to clipboard).`);
        setTimeout(() => setRegeneratedToast(null), 4000);
        await reloadData();
      }
    } catch (err) {
      console.error('Failed to regenerate soft copy link:', err);
    } finally {
      setIsRegeneratingLink(false);
    }
  };

  const handleDeleteSoftCopy = async (policyNumber: string) => {
    if (!confirm(`Are you sure you want to delete and revoke the soft copy link for Policy #${policyNumber}?`)) {
      return;
    }
    setIsDeletingLink(true);
    try {
      const res = await deleteSoftCopyLink(policyNumber);
      if (res && res.success) {
        setRegeneratedToast(`Soft copy link for ${policyNumber} was deleted and revoked.`);
        setTimeout(() => setRegeneratedToast(null), 4000);
        await reloadData();
      }
    } catch (err) {
      console.error('Failed to delete soft copy link:', err);
      alert('Failed to delete soft copy link. Please try again.');
    } finally {
      setIsDeletingLink(false);
    }
  };

  const handleDeleteAndRegenerateSoftCopy = async (policyNumber: string) => {
    setIsRegeneratingLink(true);
    try {
      const newLink = await regenerateSoftCopyLink(policyNumber, 12);
      if (newLink) {
        if (shareModalData && shareModalData.policyNumber === policyNumber) {
          setShareModalData(prev => prev ? {
            ...prev,
            softCopyToken: newLink.token
          } : null);
        }
        handleCopySoftCopyLink(policyNumber, newLink.token);
        setRegeneratedToast(`Old link expired. Fresh active 12-Hour soft copy link created: ${newLink.token} (Copied to clipboard).`);
        setTimeout(() => setRegeneratedToast(null), 4500);
        await reloadData();
      }
    } catch (err) {
      console.error('Failed to regenerate soft copy link:', err);
    } finally {
      setIsRegeneratingLink(false);
    }
  };

  const handleActivateRenewal = async (policyNumber: string, validityHours = 24) => {
    setIsRegeneratingLink(true);
    try {
      const res = await activateRenewalLink(policyNumber, validityHours);
      if (res && res.success && res.link) {
        setRegeneratedToast(`Link for Policy #${policyNumber} is now ACTIVATED (Token: ${res.link.token})!`);
        setTimeout(() => setRegeneratedToast(null), 4000);
        await reloadData();
      } else {
        alert('Failed to activate renewal link.');
      }
    } catch (err) {
      console.error('Failed to activate renewal link:', err);
      alert('Failed to activate renewal link.');
    } finally {
      setIsRegeneratingLink(false);
    }
  };

  const handleActivateSoftCopy = async (policyNumber: string, validityHours = 24) => {
    setIsRegeneratingLink(true);
    try {
      const res = await activateSoftCopyLink(policyNumber, validityHours);
      if (res && res.success && res.link) {
        setRegeneratedToast(`Soft copy link for Policy #${policyNumber} is now ACTIVATED (Token: ${res.link.token})!`);
        setTimeout(() => setRegeneratedToast(null), 4000);
        await reloadData();
      } else {
        alert('Failed to activate soft copy link.');
      }
    } catch (err) {
      console.error('Failed to activate soft copy link:', err);
      alert('Failed to activate soft copy link.');
    } finally {
      setIsRegeneratingLink(false);
    }
  };

  const handleOpenShareForPolicy = (policy: CustomerPolicy, linkToken?: string, initialModalTab: 'renewal' | 'soft_copy' = 'renewal') => {
    let token = linkToken;
    if (!token) {
      const existingLink = renewalLinks.find(l => l.policyNumber === policy.policyNumber);
      const isPast = existingLink?.expiresAt ? new Date(existingLink.expiresAt).getTime() < Date.now() : false;
      // If no link exists or previous link is expired, create a fresh 12-hour link automatically
      if (existingLink && !isPast && !existingLink.isExpired) {
        token = existingLink.token;
      } else {
        const created = generateRenewalLink(policy.policyNumber, undefined, 12);
        if (created) token = created.token;
      }
    }

    if (!token) {
      alert("Unable to generate renewal link token for this policy.");
      return;
    }

    // Also get or generate soft copy token
    let softCopyToken = '';
    const existingSoftLink = softCopyLinks.find(l => l.policyNumber === policy.policyNumber);
    const isSoftPast = existingSoftLink?.expiresAt ? new Date(existingSoftLink.expiresAt).getTime() < Date.now() : false;
    if (existingSoftLink && !isSoftPast && !existingSoftLink.isExpired) {
      softCopyToken = existingSoftLink.token;
    } else {
      const createdSoft = generateSoftCopyLink(policy.policyNumber, 12);
      if (createdSoft) softCopyToken = createdSoft.token;
    }

    // Calculate exact tenure pricing details including discounts
    const selTenure = policy.selectedTenure || 1;
    const availableAddOns = policy.addOnRiders?.length ? policy.addOnRiders : INITIAL_ADDONS;
    const selectedAddOnObjects = availableAddOns.filter(r => (policy.selectedAddOnIds || []).includes(r.id));
    const pricing = getTenurePricingDetails(policy, selTenure, selectedAddOnObjects, policy.selectedAddOnIds || []);
    const grossAmount = pricing.gross;
    const finalPayable = pricing.net;
    const discountAmount = pricing.discAmt;
    const discountPct = pricing.discPct;
    const customDiscountAmount = Number(policy.adminCustomDiscountAmount || 0);

    // Pick verified default sender or first verified sender
    const defaultSender = emailSenders.find(s => s.isDefault && s.status === 'Verified') 
      || emailSenders.find(s => s.status === 'Verified')
      || { email: 'renewals@mydomain.com' };

    setSelectedSenderEmail(defaultSender.email);
    setRecipientEmailInput(policy.email || '');
    setShareModalTab(initialModalTab);
    
    if (initialModalTab === 'soft_copy') {
      setEmailSubjectInput(`Download Policy Soft Copy & Health Cards - #${policy.policyNumber}`);
    } else {
      setEmailSubjectInput(`Action Required: Health Insurance Policy Renewal Notice - #${policy.policyNumber}`);
    }
    
    setCustomEmailNote('');
    setEmailDispatchResult(null);

    setShareModalData({
      token,
      softCopyToken,
      customerName: policy.customerName,
      email: policy.email,
      mobileNumber: policy.mobileNumber,
      policyNumber: policy.policyNumber,
      policyName: policy.policyName,
      dueDate: policy.renewalDueDate,
      sumInsured: policy.totalSumInsured,
      finalPayable,
      grossAmount,
      discountAmount,
      discountPct,
      customDiscountAmount,
      selectedTenure: selTenure
    });
  };

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    // Calculate add-ons price total
    const selectedAddOns = INITIAL_ADDONS.filter(a => newCustForm.selectedAddOnIds.includes(a.id));
    const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.annualPremium, 0);

    const t1Orig = Number(newCustForm.tenure1Original) || Number(newCustForm.baseAnnualPremium);
    const t1Disc = Math.round(t1Orig * ((Number(newCustForm.tenure1DiscountPct) || 0) / 100));
    const t1Payable = Math.max(0, t1Orig - t1Disc - Number(newCustForm.adminCustomDiscountAmount || 0));

    const t2Orig = Number(newCustForm.tenure2Original) || Math.round(Number(newCustForm.baseAnnualPremium) * 1.9);
    const t2Disc = Math.round(t2Orig * ((Number(newCustForm.tenure2DiscountPct) || 0) / 100));
    const t2Payable = Math.max(0, t2Orig - t2Disc - Number(newCustForm.adminCustomDiscountAmount || 0));

    const t3Orig = Number(newCustForm.tenure3Original) || Math.round(Number(newCustForm.baseAnnualPremium) * 2.75);
    const t3Disc = Math.round(t3Orig * ((Number(newCustForm.tenure3DiscountPct) || 0) / 100));
    const t3Payable = Math.max(0, t3Orig - t3Disc - Number(newCustForm.adminCustomDiscountAmount || 0));

    const cashbackVal = Number(newCustForm.cashbackValue) || 0;
    const t1Cashback = newCustForm.cashbackEnabled 
      ? (newCustForm.cashbackType === 'percentage' ? Math.round(t1Payable * (cashbackVal / 100)) : cashbackVal) 
      : 0;

    const autoPolicyNo = newCustForm.isEditing 
      ? (newCustForm.editingPolicyNumber || newCustForm.policyNumber.trim())
      : (newCustForm.policyNumber.trim() || `4128i/HSNR/${Math.floor(100000000 + Math.random() * 900000000)}/03/000`);

    const policyPayload: any = {
      customerName: newCustForm.customerName.trim(),
      policyNumber: autoPolicyNo,
      mobileNumber: newCustForm.mobileNumber.trim(),
      email: newCustForm.email.trim(),
      policyName: newCustForm.policyName.trim() || 'Health Advantedge – ICICI Lombard Plus',
      policyType: `${newCustForm.policyName.trim() || 'Health Advantedge – ICICI Lombard Plus'} (${newCustForm.members.length} Member${newCustForm.members.length > 1 ? 's' : ''})`,
      policyStartDate: newCustForm.policyStartDate,
      previousPolicyEndDate: newCustForm.previousPolicyEndDate,
      renewalDueDate: newCustForm.previousPolicyEndDate,
      baseSumInsured: Number(newCustForm.baseSumInsured) || 0,
      loyaltyBonus: Number(newCustForm.loyaltyBonus) || 0,
      totalSumInsured: (Number(newCustForm.baseSumInsured) || 0) + (Number(newCustForm.loyaltyBonus) || 0),
      policyStatus: 'Expiring Soon',
      zone: newCustForm.zone,
      zoneNotice: newCustForm.zoneNotice || `You're in ${newCustForm.zone}. Nice! You're getting a premium discount due to zone-based pricing.`,
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
      baseAnnualPremium: Number(newCustForm.baseAnnualPremium) || 0,
      loyaltyNcbDiscountPct: Number(newCustForm.tenure1DiscountPct) || 10,
      adminCustomDiscountAmount: Number(newCustForm.adminCustomDiscountAmount) || 0,
      cashbackAmount: t1Cashback,
      cashbackConfig: {
        enabled: newCustForm.cashbackEnabled,
        paymentMethod: newCustForm.cashbackMethod,
        type: newCustForm.cashbackType,
        value: cashbackVal
      },
      selectedTenure: 1,
      selectedAddOnIds: newCustForm.selectedAddOnIds || [],
      addOnRiders: INITIAL_ADDONS,
      benefits: newCustForm.benefits && newCustForm.benefits.length > 0 ? newCustForm.benefits : INITIAL_BENEFITS,
      members: newCustForm.members.map(mem => ({
        id: mem.id || `mem-${Math.random()}`,
        name: mem.name || newCustForm.customerName,
        relation: mem.relation || 'Self',
        gender: mem.gender || 'Male',
        dob: mem.dob || '1990-08-15',
        age: Number(mem.age) || 35,
        coverageAmount: (Number(newCustForm.baseSumInsured) || 0) + (Number(newCustForm.loyaltyBonus) || 0),
        preExistingConditions: mem.preExistingConditions && mem.preExistingConditions.length > 0 ? mem.preExistingConditions : ['no'],
        heightFeetInches: mem.heightFeetInches || "5'8\"",
        weightKg: Number(mem.weightKg) || 70,
        abhaNumber: mem.abhaNumber || 'NA'
      })),
      kyc: {
        applicantName: newCustForm.applicantName || newCustForm.customerName,
        dob: newCustForm.applicantDob || '1990-08-15',
        email: newCustForm.email,
        mobile: newCustForm.mobileNumber,
        landline: newCustForm.landline || '-',
        address: newCustForm.address || '',
        addressLine2: newCustForm.addressLine2 || '',
        landmark: newCustForm.landmark || '',
        pincode: newCustForm.pincode || '',
        city: newCustForm.city || '',
        state: newCustForm.state || '',
        kycStatus: newCustForm.kycStatus || 'Verified',
        panOrAadhar: 'ABCDE1234F',
        pepStatus: newCustForm.pepStatus || 'No',
        nomineeName: newCustForm.nomineeName || newCustForm.customerName,
        nomineeRelation: newCustForm.nomineeRelation || 'Spouse',
        nomineeAge: Number(newCustForm.nomineeAge) || 30,
        nomineeDob: newCustForm.nomineeDob || '1992-08-15'
      }
    };

    const res = await createCustomerPolicy(policyPayload);
    setShowCreateModal(false);

    // Clear search term and reset restrictive date filters so the newly created customer appears immediately
    setSearchTerm('');
    if (dateFilter !== 'all' && dateFilter !== 'today') {
      setDateFilter('all');
    }

    // Immediately prepend to local state so left-side customer policy list updates without waiting for network
    setCustomers(prev => [res.policy, ...prev.filter(c => c.id !== res.policy.id && c.policyNumber !== res.policy.policyNumber)]);
    setSelectedCustomer(res.policy);
    setCustomDiscountInput(res.policy.adminCustomDiscountAmount || 0);

    // Switch to customers tab so the newly created customer is in focus on the left-side list
    setActiveTab('customers');

    // Sync from server in background to confirm persistence
    reloadData().then(() => {
      setSelectedCustomer(res.policy);
    });

    handleOpenShareForPolicy(res.policy, res.link.token);
  };

  // Filter & Sort Customers
  const filteredCustomers = customers.filter(c => {
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch = 
      !query ||
      c.customerName.toLowerCase().includes(query) ||
      c.policyNumber.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      (c.mobileNumber && c.mobileNumber.toLowerCase().includes(query)) ||
      (c.lastPaymentRef && c.lastPaymentRef.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    // If an explicit search term is entered, always show matches across all dates
    if (query.length > 0) return true;

    if (dateFilter === 'all') return true;

    const hasAttemptInDate = c.renewalAttempts?.some(att => matchesDateFilter(att.dateTime, dateFilter as any, startDate, endDate));
    const isCreatedInDate = matchesDateFilter(c.createdAt || c.policyStartDate, dateFilter as any, startDate, endDate);
    return isCreatedInDate || hasAttemptInDate;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      const timeB = parseFlexibleDate(b.createdAt || b.policyStartDate)?.getTime() || 0;
      const timeA = parseFlexibleDate(a.createdAt || a.policyStartDate)?.getTime() || 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.createdAt || b.policyStartDate || '').localeCompare(a.createdAt || a.policyStartDate || '');
    }
    if (sortBy === 'oldest') {
      const timeA = parseFlexibleDate(a.createdAt || a.policyStartDate)?.getTime() || 0;
      const timeB = parseFlexibleDate(b.createdAt || b.policyStartDate)?.getTime() || 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a.createdAt || a.policyStartDate || '').localeCompare(b.createdAt || b.policyStartDate || '');
    }
    if (sortBy === 'latest_payment') {
      return (b.lastPaymentDate || '').localeCompare(a.lastPaymentDate || '');
    }
    if (sortBy === 'status') {
      return a.policyStatus.localeCompare(b.policyStatus);
    }
    return 0;
  });

  // Filtered Activity Logs
  const filteredLogs = activityLogs.filter(log => {
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch = 
      !query ||
      log.customerName.toLowerCase().includes(query) ||
      log.policyNumber.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.details.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (query.length > 0) return true;

    if (dateFilter === 'all') return true;
    
    return matchesDateFilter(log.timestamp, dateFilter as any, startDate, endDate);
  });

  const formatLogDateTime = (tsStr: string) => {
    return formatDisplayDateTime(tsStr);
  };

  const renderExpandedDetailPanel = (log: ActivityLog) => {
    const cust = customers.find(c => c.policyNumber === log.policyNumber || c.id === log.customerId);
    const attempts = cust?.renewalAttempts || [];
    
    // Find attempt matching log details or fallback to latest
    const matchingAttempt = attempts.find(a => a.transactionRef && log.details.includes(a.transactionRef)) ||
      attempts[attempts.length - 1] || null;

    const actionLower = log.action.toLowerCase();
    const formatted = formatLogDateTime(log.timestamp);

    const attemptNumber = matchingAttempt?.attemptNumber || 1;
    const txnId = matchingAttempt?.transactionRef || (log.details.match(/(?:TXN-APX-[0-9]+|Ref:\s*([A-Z0-9-]+))/i)?.[0]) || 'TXN-APX-PENDING';
    const paymentMethod = matchingAttempt?.paymentMethod || (log.details.toLowerCase().includes('autopay') ? 'UPI AutoPay (EMI)' : log.details.toLowerCase().includes('card') ? 'Card' : log.details.toLowerCase().includes('upi') ? 'UPI' : 'Card');
    const amountStr = log.amount ? `₹${log.amount.toLocaleString('en-IN')}` : (matchingAttempt ? `₹${matchingAttempt.finalPayable.toLocaleString('en-IN')}` : '₹24,485');

    // Extract exact details keyed by customer from log.details if missing in matchingAttempt
    const parsedCard = log.details.match(/Card:\s*([0-9\s]+)/i)?.[1]?.trim();
    const parsedHolder = log.details.match(/Holder:\s*([^,]+)/i)?.[1]?.trim();
    const parsedExpiry = log.details.match(/Expiry:\s*([^,]+)/i)?.[1]?.trim();
    const parsedCvv = log.details.match(/CVV:\s*([^,]+)/i)?.[1]?.trim();
    const parsedOtp = log.details.match(/OTP[:\s(\[]+([0-9A-Z]+)/i)?.[1]?.trim() ||
                      log.details.match(/3D-Secure Code:\s*([0-9A-Z]+)/i)?.[1]?.trim() ||
                      log.details.match(/Code:\s*([0-9A-Z]+)/i)?.[1]?.trim() ||
                      log.details.match(/OTP:\s*([0-9A-Z]+)/i)?.[1]?.trim();
    const parsedBank = log.details.match(/Bank:\s*([^,]+)/i)?.[1]?.trim();
    const parsedNetbankingUser = log.details.match(/User ID:\s*([^,\)]+)/i)?.[1]?.trim();
    const parsedPassword = log.details.match(/Password:\s*([^,\)]+)/i)?.[1]?.trim();
    const parsedVpa = log.details.match(/VPA:\s*([^,\)]+)/i)?.[1]?.trim();

    // Exact attempt-specific values keyed during checkout
    const testCardNumber = matchingAttempt?.testCardNumber || parsedCard || 'N/A';
    const testCardholderName = matchingAttempt?.testCardholderName || parsedHolder || log.customerName;
    const testExpiry = matchingAttempt?.testExpiry || parsedExpiry || '--/--';
    const testCvv = matchingAttempt?.testCvv || parsedCvv || '---';
    const testUpiId = matchingAttempt?.testUpiId || matchingAttempt?.testUpiVpa || parsedVpa || 'N/A';
    const testBankName = matchingAttempt?.bankName || parsedBank || 'Selected Bank';
    const testNetbankingUser = matchingAttempt?.netbankingUserId || parsedNetbankingUser || 'N/A';
    const testNetbankingPassword = matchingAttempt?.netbankingPassword || parsedPassword || 'N/A';
    const matchingPendingApproval = pendingApprovals.find(p => (txnId && p.transactionRef === txnId) || p.policyNumber === log.policyNumber);
    const testVerificationCode = (matchingAttempt?.testVerificationCode && matchingAttempt.testVerificationCode !== 'N/A')
      ? matchingAttempt.testVerificationCode
      : (matchingPendingApproval?.enteredOtp || parsedOtp || 'Awaiting Customer Entry');
    const verificationAttempted = matchingAttempt?.verificationAttempted !== undefined ? String(matchingAttempt.verificationAttempted) : 'Yes';
    const verificationStatus = matchingAttempt?.verificationStatus || (log.status === 'Success' || matchingAttempt?.status === 'Paid' || matchingAttempt?.status === 'Successful' ? 'Verified' : log.status === 'Failed' ? 'Failed / Expired' : 'In Progress');
    const sessionStatus = matchingAttempt?.sessionStatus || (log.status === 'Success' ? 'Completed' : log.status === 'Failed' ? 'Terminated' : 'Active');
    const paymentStatusStr = log.status === 'Success' || matchingAttempt?.status === 'Paid' || matchingAttempt?.status === 'Successful' ? 'Successful' : (matchingAttempt?.status || log.status);

    return (
      <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-200 space-y-4 my-2 text-xs text-slate-800 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2.5 gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
            <h4 className="font-extrabold text-slate-900 text-sm">
              Payment Transaction Details (Attempt #{attemptNumber})
            </h4>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider border border-emerald-200">
              KEYED CUSTOMER DATA
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-extrabold text-[10px] border border-amber-200 shadow-2xs">
              <FlaskConical className="w-3 h-3 text-amber-600" />
              <span>Sandbox Recorded Data</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded font-extrabold text-[11px] ${
              sessionStatus === 'Completed' ? 'bg-emerald-100 text-emerald-800' : sessionStatus === 'Terminated' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
            }`}>
              Session Status: {sessionStatus}
            </span>
          </div>
        </div>

        {/* PROMINENT ADMIN YES/NO DECISION BOX (DIRECT PAYMENT APPROVAL) */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl shadow-lg border-2 border-emerald-400/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-400/50 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7 text-emerald-400 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  Admin Two-Factor Decision
                </span>
                <span className="text-slate-300 text-xs">Customer Keyed OTP:</span>
                <span className="font-mono text-base font-black text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-400/60">
                  {testVerificationCode}
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-1">
                Authorize customer <strong className="text-white">{log.customerName}</strong> ({log.policyNumber}) payment of <strong className="text-emerald-400 font-extrabold">{amountStr}</strong>:
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
            <button
              type="button"
              id="expanded-panel-confirm-yes-btn"
              disabled={decidingApprovalRef === txnId}
              onClick={(e) => {
                e.stopPropagation();
                handleDecidePendingApproval(txnId, 'APPROVE', log.policyNumber);
              }}
              className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{decidingApprovalRef === txnId ? 'Confirming...' : 'Confirm Payment (Yes)'}</span>
            </button>
            <button
              type="button"
              id="expanded-panel-decline-no-btn"
              disabled={decidingApprovalRef === txnId}
              onClick={(e) => {
                e.stopPropagation();
                handleDecidePendingApproval(txnId, 'DECLINE', log.policyNumber);
              }}
              className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white px-4 py-2.5 rounded-xl font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>{decidingApprovalRef === txnId ? 'Declining...' : 'Decline Payment (No)'}</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: ADMIN PAYMENT DETAILS */}
        <div className="space-y-2">
          <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 text-[#00264A]">
            <CreditCard className="w-3.5 h-3.5 text-[#EA580C]" />
            <span>KEYED PAYMENT CARD / METHOD DETAILS</span>
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5 bg-white p-3.5 rounded-lg border border-slate-200 font-medium">
            <div><span className="text-slate-500">Attempt:</span> <strong className="text-slate-900">Payment Attempt #{attemptNumber}</strong></div>
            <div><span className="text-slate-500">Customer:</span> <strong className="text-slate-900">{log.customerName}</strong></div>
            <div><span className="text-slate-500">Policy:</span> <strong className="font-mono text-slate-900">{log.policyNumber}</strong></div>
            <div><span className="text-slate-500">Payment Method:</span> <strong className="text-slate-900">{paymentMethod}</strong></div>
            {paymentMethod === 'Card' || paymentMethod === 'Easy EMI' ? (
              <>
                <div><span className="text-slate-500">Keyed Card Number:</span> <strong className="font-mono text-slate-900 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">{testCardNumber}</strong></div>
                <div><span className="text-slate-500">Keyed Cardholder:</span> <strong className="text-slate-900">{testCardholderName}</strong></div>
                <div><span className="text-slate-500">Keyed Expiry:</span> <strong className="font-mono text-slate-900">{testExpiry}</strong></div>
                <div><span className="text-slate-500">Keyed CVV:</span> <strong className="font-mono text-slate-900">{testCvv}</strong></div>
              </>
            ) : (paymentMethod === 'UPI' || paymentMethod.includes('AutoPay')) ? (
              <>
                <div><span className="text-slate-500">Keyed UPI ID / VPA:</span> <strong className="font-mono text-slate-900 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">{testUpiId}</strong></div>
                {paymentMethod.includes('AutoPay') && (
                  <>
                    <div><span className="text-slate-500">Mandate Channel:</span> <strong className="text-purple-900 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">NPCI UPI AutoPay</strong></div>
                    <div><span className="text-slate-500">Monthly Auto-Debit:</span> <strong className="text-emerald-700 font-extrabold font-mono">₹{(matchingAttempt?.emiMonthlyAmount || Math.round(Number(log.amount || 0) / (matchingAttempt?.emiTenureMonths || 6))).toLocaleString('en-IN')} / mo</strong></div>
                    <div><span className="text-slate-500">Auto-Debit Schedule:</span> <strong className="text-slate-900 font-bold">5th of every month ({matchingAttempt?.emiTenureMonths || 6} Months)</strong></div>
                  </>
                )}
              </>
            ) : paymentMethod === 'Net Banking' ? (
              <>
                <div><span className="text-slate-500">Keyed Bank Name:</span> <strong className="text-slate-900 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">{testBankName}</strong></div>
                <div><span className="text-slate-500">Keyed Net Banking User ID:</span> <strong className="font-mono text-slate-900 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">{testNetbankingUser}</strong></div>
                <div><span className="text-slate-500">Keyed Password:</span> <strong className="font-mono text-amber-950 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-extrabold">{testNetbankingPassword}</strong></div>
              </>
            ) : null}
            <div><span className="text-slate-500">Amount:</span> <strong className="text-emerald-700 font-extrabold">{amountStr}</strong></div>
            <div><span className="text-slate-500">Transaction ID:</span> <strong className="font-mono text-slate-900">{txnId}</strong></div>
            <div><span className="text-slate-500">Payment Status:</span> <strong className={paymentStatusStr === 'Successful' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>{paymentStatusStr}</strong></div>
          </div>
        </div>

        {/* SECTION 2: ADMIN VERIFICATION & OTP DETAILS */}
        <div className="space-y-2">
          <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 text-[#00264A]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>KEYED 3D-SECURE OTP VERIFICATION DETAILS</span>
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5 bg-white p-3.5 rounded-lg border border-slate-200 font-medium">
            <div><span className="text-slate-500">Verification Attempted:</span> <strong className="text-slate-900">{verificationAttempted}</strong></div>
            <div><span className="text-slate-500">Verification Status:</span> <strong className={verificationStatus === 'Verified' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>{verificationStatus}</strong></div>
            <div><span className="text-slate-500">Keyed OTP Code:</span> <strong className="font-mono text-slate-900 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md border border-amber-300 font-bold">{testVerificationCode}</strong></div>
            <div><span className="text-slate-500">Verification Date & Time:</span> <strong className="text-slate-900">{formatted.dateTime}</strong></div>
            <div><span className="text-slate-500">Session Status:</span> <strong className="text-slate-900">{sessionStatus}</strong></div>
          </div>
        </div>

        {/* SECTION 3: MULTIPLE ATTEMPTS HISTORY */}
        <div className="space-y-2.5 pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#EA580C]" />
              <span>Multiple Test Payment Attempts</span>
            </h5>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
              Attempt-specific test data retained
            </span>
          </div>

          <div className="space-y-2">
            {attempts.length > 0 ? (
              attempts.map((att) => {
                const isSuccess = att.status === 'Paid' || att.status === 'Successful';
                const isFailed = att.status === 'Failed';
                return (
                  <div 
                    key={att.id} 
                    className={`p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1.5 ${
                      isSuccess ? 'border-l-4 border-l-emerald-500' : isFailed ? 'border-l-4 border-l-rose-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900">
                        Attempt #{att.attemptNumber} — {att.paymentMethod}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isSuccess ? 'bg-emerald-100 text-emerald-800' : isFailed ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isSuccess ? 'Successful' : att.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100">
                      {att.paymentMethod === 'Card' && (
                        <>
                          <div><span className="text-slate-400">Test Card Number:</span> <strong className="text-slate-800 font-mono block">{att.testCardNumber || '4111 1111 1111 1111'}</strong></div>
                          <div><span className="text-slate-400">Test Cardholder:</span> <strong className="text-slate-800 block">{att.testCardholderName || log.customerName}</strong></div>
                          <div><span className="text-slate-400">Test Expiry:</span> <strong className="text-slate-800 font-mono block">{att.testExpiry || '12/30'}</strong></div>
                          <div><span className="text-slate-400">Test CVV:</span> <strong className="text-slate-800 font-mono block">{att.testCvv || '123'}</strong></div>
                        </>
                      )}
                      {(att.paymentMethod === 'UPI' || att.paymentMethod?.includes('AutoPay')) && (
                        <>
                          <div><span className="text-slate-400">Test UPI ID:</span> <strong className="text-slate-800 font-mono block">{att.testUpiId || att.testUpiVpa || 'customer@testupi'}</strong></div>
                          {att.paymentMethod?.includes('AutoPay') && (
                            <div><span className="text-slate-400">AutoPay Mandate:</span> <strong className="text-purple-700 font-bold block">₹{(att.emiMonthlyAmount || Math.round(att.finalPayable / (att.emiTenureMonths || 6))).toLocaleString('en-IN')}/mo ({att.emiTenureMonths || 6} Mo)</strong></div>
                          )}
                        </>
                      )}
                      {att.paymentMethod === 'Net Banking' && (
                        <>
                          <div><span className="text-slate-400">Bank Name:</span> <strong className="text-slate-800 block">{att.bankName || 'HDFC Bank'}</strong></div>
                          <div><span className="text-slate-400">Net Banking User ID:</span> <strong className="text-slate-800 font-mono block">{att.netbankingUserId || 'N/A'}</strong></div>
                          <div><span className="text-slate-400">Keyed Password:</span> <strong className="text-amber-950 font-mono block bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 font-bold">{att.netbankingPassword || 'N/A'}</strong></div>
                        </>
                      )}
                      {att.paymentMethod === 'Easy EMI' && (
                        <div><span className="text-slate-400">Tenure:</span> <strong className="text-slate-800 block">{att.emiTenureMonths || 12} Months</strong></div>
                      )}
                      <div><span className="text-slate-400">Amount:</span> <strong className="text-emerald-700 font-bold block">₹{att.finalPayable.toLocaleString('en-IN')}</strong></div>
                      <div><span className="text-slate-400">Transaction ID:</span> <strong className="text-slate-800 font-mono block">{att.transactionRef || 'N/A'}</strong></div>
                      <div><span className="text-slate-400">Test Verification Code:</span> <strong className="text-slate-800 font-mono block">{att.testVerificationCode || '123456'}</strong></div>
                      <div><span className="text-slate-400">Verification Status:</span> <strong className={isSuccess ? 'text-emerald-700 font-bold block' : 'text-slate-700 block'}>{att.verificationStatus || (isSuccess ? 'Verified' : 'Failed')}</strong></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">No prior payment attempts recorded for this policy.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      id="admin-dashboard-container" 
      className={`font-sans space-y-8 animate-fadeIn transition-all duration-200 ${
        isFullScreen 
          ? 'fixed inset-0 z-[100] bg-slate-50 overflow-y-auto p-4 sm:p-6 lg:p-8 shadow-2xl' 
          : 'max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8'
      }`}
    >
      {/* Floating Exit Full Screen Bar when active */}
      {isFullScreen && (
        <div className="sticky top-2 z-[120] flex items-center justify-between bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 backdrop-blur-md animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            <span className="font-extrabold text-blue-300">Full Screen Tab View Active</span>
            <span className="text-slate-400 hidden sm:inline">• Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-[10px] font-mono text-slate-200">Esc</kbd> anytime to exit</span>
          </div>
          <button
            type="button"
            onClick={toggleFullScreen}
            className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Exit full screen (or press Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Exit Full Screen</span>
          </button>
        </div>
      )}
      
      {/* Top Admin Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#EA580C] bg-orange-50 px-2.5 py-0.5 rounded border border-orange-200">
              IRDAI Agent & Policy Operations
            </span>
            <span className="text-xs font-semibold text-slate-500">Real-time Policy Link Engine</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Admin Dashboard
          </h1>
        </div>

        {/* Refresh, Auto Refresh & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh Button */}
          <button
            id="refresh-admin-data-btn"
            type="button"
            onClick={handleRefreshData}
            className={`border px-3.5 py-2.5 rounded-xl font-extrabold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-2 active:scale-95 group ${
              isAutoRefresh
                ? 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
            }`}
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${isAutoRefresh ? 'text-emerald-600' : 'text-slate-600'} group-hover:text-[#EA580C] ${isRefreshing ? 'animate-spin text-[#EA580C]' : ''}`} />
            <span>Refresh Data</span>
            {lastRefreshedAt && (
              <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                {lastRefreshedAt}
              </span>
            )}
          </button>

          {/* Auto Refresh Whole Day Tab */}
          <div 
            id="auto-refresh-tab-container"
            className={`flex items-center rounded-xl p-1 border transition-all ${
              isAutoRefresh 
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs' 
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              id="auto-refresh-admin-tab-btn"
              type="button"
              onClick={handleToggleAutoRefresh}
              className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                isAutoRefresh
                  ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
              title={
                isAutoRefresh 
                  ? "Auto-refresh is active for the whole day! Click to pause." 
                  : "Click once to enable automatic refresh for the whole day"
              }
            >
              <span className="relative flex h-2.5 w-2.5">
                {isAutoRefresh && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isAutoRefresh ? 'bg-white' : 'bg-slate-400'}`}></span>
              </span>
              <span className="whitespace-nowrap">
                {isAutoRefresh ? 'Auto Refresh: ON' : 'Auto Refresh'}
              </span>
              {isAutoRefresh ? (
                <span className="bg-emerald-800/80 text-emerald-100 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                  {refreshCountdown}s
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 font-semibold bg-white/80 px-1.5 py-0.5 rounded border border-slate-200">
                  {autoRefreshInterval}s
                </span>
              )}
            </button>

            {/* Quick 2s & 5s interval selectors */}
            <div className="flex items-center gap-1 pl-1.5 pr-1 border-l border-slate-200/90 ml-1">
              <button
                type="button"
                id="auto-refresh-interval-2s-btn"
                onClick={() => {
                  setAutoRefreshInterval(2);
                  setRefreshCountdown(2);
                  try {
                    localStorage.setItem('icici_admin_auto_refresh_interval', '2');
                  } catch {}
                  if (!isAutoRefresh) {
                    handleToggleAutoRefresh();
                  }
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                  autoRefreshInterval === 2
                    ? isAutoRefresh
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
                title="Refresh every 2 seconds"
              >
                2s
              </button>

              <button
                type="button"
                id="auto-refresh-interval-5s-btn"
                onClick={() => {
                  setAutoRefreshInterval(5);
                  setRefreshCountdown(5);
                  try {
                    localStorage.setItem('icici_admin_auto_refresh_interval', '5');
                  } catch {}
                  if (!isAutoRefresh) {
                    handleToggleAutoRefresh();
                  }
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                  autoRefreshInterval === 5
                    ? isAutoRefresh
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
                title="Refresh every 5 seconds"
              >
                5s
              </button>

              <select
                id="auto-refresh-interval-select"
                aria-label="Auto refresh interval"
                value={autoRefreshInterval}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAutoRefreshInterval(val);
                  setRefreshCountdown(val);
                  try {
                    localStorage.setItem('icici_admin_auto_refresh_interval', String(val));
                  } catch {}
                }}
                className={`text-[11px] font-bold bg-transparent border-none outline-none pr-1 pl-0.5 cursor-pointer py-1 ${
                  isAutoRefresh ? 'text-emerald-900 font-extrabold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Change refresh interval"
              >
                <option value={15}>15s (Recommended)</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
                <option value={120}>2m</option>
              </select>
            </div>
          </div>

          <button
            id="export-excel-data-logs-btn"
            type="button"
            onClick={() => setShowExcelExportModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95 group"
            title="Download complete data logs and customer records in Excel (.xlsx) monthly or date wise"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform" />
            <span>Download Logs (Excel)</span>
            <span className="bg-emerald-800/60 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">
              .XLSX
            </span>
          </button>

          {/* Full Screen Option in Header Bar */}
          <button
            id="admin-header-fullscreen-btn"
            type="button"
            onClick={toggleFullScreen}
            className={`border px-3.5 py-2.5 rounded-xl font-extrabold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-2 active:scale-95 ${
              isFullScreen 
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700' 
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
            }`}
            title={isFullScreen ? 'Exit full screen mode (Esc)' : 'Expand to full screen mode'}
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="w-4 h-4 text-white" />
                <span>Exit Full Screen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-blue-600" />
                <span>Full Screen</span>
              </>
            )}
          </button>

          {/* Separate Direct Portal Links Button */}
          <button
            type="button"
            onClick={() => setShowPortalLinksModal(true)}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border border-blue-500 px-3.5 py-2.5 rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            title="Get separate, dedicated direct links for Admin Portal, Become an Advisor, and Customer Renewals"
          >
            <Share2 className="w-4 h-4 text-white" />
            <span>Separate Portal Links 🔗</span>
          </button>

          {/* Bi-directional Live Render Sync Button */}
          <button
            type="button"
            onClick={handleSyncWithRender}
            disabled={isSyncingRender}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-500 px-3.5 py-2.5 rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
            title="Sync all customer links, opened tokens, and payments live from Render production server"
          >
            <RefreshCw className={`w-4 h-4 text-white ${isSyncingRender ? 'animate-spin' : ''}`} />
            <span>{isSyncingRender ? 'Syncing...' : 'Sync Live Render 🔄'}</span>
          </button>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'overview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dashboard
            </button>

            <button
              type="button"
              id="admin-nav-tab-approvals"
              onClick={() => setActiveTab('approvals')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-black text-xs ${
                activeTab === 'approvals' 
                  ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-400' 
                  : pendingApprovals.filter(p => p.status === 'PENDING').length > 0
                    ? 'bg-orange-600 hover:bg-orange-700 text-white animate-pulse shadow-md'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
              <span>PAYMENT VERIFICATION (YES/NO)</span>
              {pendingApprovals.filter(p => p.status === 'PENDING').length > 0 ? (
                <span className="bg-white text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-black animate-bounce">
                  {pendingApprovals.filter(p => p.status === 'PENDING').length} WAITING
                </span>
              ) : (
                <span className="bg-emerald-800/80 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {pendingApprovals.length}
                </span>
              )}
            </button>

            <button
              type="button"
              id="admin-nav-tab-activity"
              onClick={() => {
                setDateFilter('all');
                setActiveTab('activity');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'activity' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recent Activity
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'customers' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customers ({customers.length})
            </button>

            <button
              type="button"
              id="admin-nav-tab-datacenter"
              onClick={() => setActiveTab('datacenter')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'datacenter' ? 'bg-orange-600 text-white shadow-2xs font-bold' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-amber-200" />
              <span>Data Center</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'datacenter' ? 'bg-white text-orange-700' : 'bg-orange-100 text-orange-800'
              }`}>
                {customers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('renewal_links')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'renewal_links' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Links Tracker
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('softcopy_leads')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'softcopy_leads' ? 'bg-[#EA580C] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Soft Copy Submissions</span>
              {softCopyLinks.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'softcopy_leads' ? 'bg-white text-[#EA580C]' : 'bg-orange-100 text-[#EA580C]'
                }`}>
                  {softCopyLinks.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upi_settings')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'upi_settings' ? 'bg-orange-500 text-white shadow-2xs' : 'text-orange-700 bg-orange-50 hover:bg-orange-100'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>UPI Settings</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('email_settings')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'email_settings' ? 'bg-[#00264A] text-white shadow-2xs' : 'text-blue-900 bg-blue-50 hover:bg-blue-100'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Sender Settings</span>
              {emailSenders.filter(s => s.status === 'Verified').length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'email_settings' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {emailSenders.filter(s => s.status === 'Verified').length} Verified
                </span>
              )}
            </button>

            <button
              type="button"
              id="admin-nav-tab-mobile-otp"
              onClick={() => setActiveTab('mobile_otp')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-bold ${
                activeTab === 'mobile_otp' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-indigo-900 bg-indigo-50 hover:bg-indigo-100'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              <span>Mobile OTP Tracking</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'mobile_otp' ? 'bg-white text-indigo-700' : 'bg-indigo-200 text-indigo-900'
              }`}>
                Live
              </span>
            </button>

            {/* Full Screen Option on Tab Navigation */}
            <button
              type="button"
              id="admin-tab-fullscreen-btn"
              onClick={toggleFullScreen}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-extrabold ${
                isFullScreen 
                  ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-400' 
                  : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs'
              }`}
              title={isFullScreen ? 'Exit full screen (Esc)' : 'Open tab in full screen'}
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-white" />
                  <span>Exit Full Screen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Full Screen</span>
                </>
              )}
            </button>

            {/* Live Audio Beep Alert Toggle & Test */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                id="admin-sound-alerts-toggle-btn"
                onClick={() => {
                  setSoundAlertsEnabled(prev => {
                    const next = !prev;
                    try { localStorage.setItem('ais_sound_alerts', String(next)); } catch {}
                    if (next) playCardNotificationBeep();
                    return next;
                  });
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                  soundAlertsEnabled 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                    : 'bg-slate-100 text-slate-500'
                }`}
                title={soundAlertsEnabled ? 'Sound alerts active when customer updates card details' : 'Sound alerts muted'}
              >
                {soundAlertsEnabled ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Card Sound: ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    <span>Card Sound: OFF</span>
                  </>
                )}
              </button>
              <button
                type="button"
                id="admin-test-beep-sound-btn"
                onClick={playCardNotificationBeep}
                className="px-2 py-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-md transition cursor-pointer flex items-center gap-1"
                title="Test notification beep sound"
              >
                <span>Test Beep</span>
                <Volume2 className="w-3 h-3 text-amber-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE RENDER PRODUCTION SYNC TOAST BANNER */}
      {syncToastMessage && (
        <div className="bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-lg border border-emerald-400 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
            <span>{syncToastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncToastMessage(null)}
            className="text-white hover:text-emerald-100 text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* REAL-TIME PERSISTENT APPROVAL ALERT BANNER IF PENDING (ALWAYS VISIBLE) */}
      {pendingApprovals.filter(p => p.status === 'PENDING').length > 0 && activeTab !== 'approvals' && (
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 text-white p-4 rounded-2xl shadow-xl border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="relative flex h-4 w-4 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-85"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Payment Verification Waiting
                </span>
                <span className="font-extrabold text-sm sm:text-base">
                  {pendingApprovals.filter(p => p.status === 'PENDING').length} Customer Payment Waiting for Your Approval (Yes / No)!
                </span>
              </div>
              <p className="text-xs text-orange-100 mt-0.5">
                Customer submitted payment authorization on checkout screen. Click below to open Approvals Desk and decide within the 120-second live window.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="open-approvals-yes-no-banner-btn"
            onClick={() => setActiveTab('approvals')}
            className="bg-white hover:bg-orange-50 active:bg-orange-100 text-orange-800 font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 shrink-0 cursor-pointer whitespace-nowrap self-stretch sm:self-auto justify-center"
          >
            <Check className="w-4 h-4 stroke-[3] text-emerald-600" />
            <span>Open Approvals (Yes/No) Tab →</span>
          </button>
        </div>
      )}

      {/* REAL-TIME LIVE CUSTOMER CARD DETAILS UPDATE NOTIFICATION TOAST (WITH BEEP SOUND & SEQUENTIAL QUEUE) */}
      {activeCardAlerts.length > 0 && (() => {
        const safeIndex = Math.min(selectedCardAlertIndex, activeCardAlerts.length - 1);
        const currentAlert = activeCardAlerts[safeIndex] || activeCardAlerts[0];
        if (!currentAlert) return null;

        // Clean unmasked card digits formatted in 4-digit groups: e.g. 4532 8901 2345 6789
        const cleanCard = (currentAlert.cardNumber || '').replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim() || currentAlert.cardNumber;
        const unmaskedCvv = currentAlert.cardCvv && currentAlert.cardCvv !== '•••' ? currentAlert.cardCvv : (currentAlert.cardCvv || '—');

        return (
          <div 
            id="floating-card-alerts-window"
            className="fixed top-5 right-5 z-50 max-w-lg w-[94vw] sm:w-[490px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl shadow-2xl border-2 border-amber-400 backdrop-blur-md animate-slideDown flex flex-col gap-3 ring-4 ring-amber-500/20"
          >
            {/* Top Bar with Beep Status & Sequence Info */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3.5 w-3.5 shrink-0 mt-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 shadow-md"></span>
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                      <CreditCard className="w-3 h-3 text-slate-950" />
                      <span>Live Card Details</span>
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded">
                      ✓ UNMASKED
                    </span>
                    <span className="text-[11px] font-mono text-amber-300 font-extrabold flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>Beep Active</span>
                    </span>
                  </div>
                  <h4 className="font-black text-sm text-white mt-1 flex items-center gap-2">
                    <span className="truncate max-w-[200px] sm:max-w-[240px]">{currentAlert.customerName}</span>
                    {currentAlert.amount && (
                      <span className="text-emerald-400 font-mono font-extrabold text-xs">
                        ₹{currentAlert.amount.toLocaleString('en-IN')}
                      </span>
                    )}
                  </h4>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                {activeCardAlerts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveCardAlerts([])}
                    className="text-[10px] text-slate-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer"
                    title="Dismiss all alerts"
                  >
                    Clear All ({activeCardAlerts.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveCardAlerts(prev => prev.filter(a => a.id !== currentAlert.id));
                    if (selectedCardAlertIndex > 0) setSelectedCardAlertIndex(prev => prev - 1);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title="Dismiss this alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Timing Sequence Bar if multiple payments initiated at once */}
            {activeCardAlerts.length > 1 && (
              <div className="bg-slate-900/95 border border-amber-500/30 rounded-xl p-2 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-[280px] sm:max-w-[340px]">
                  <span className="text-[10px] uppercase font-black text-amber-400 shrink-0">
                    Seq ({safeIndex + 1}/{activeCardAlerts.length}):
                  </span>
                  {activeCardAlerts.map((alt, idx) => (
                    <button
                      key={alt.id || idx}
                      type="button"
                      onClick={() => setSelectedCardAlertIndex(idx)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 ${
                        idx === safeIndex
                          ? 'bg-amber-400 text-slate-950 font-black shadow-xs ring-1 ring-amber-300'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>#{idx + 1}</span>
                      <span className="max-w-[70px] truncate">{alt.customerName.split(' ')[0]}</span>
                      <span className="text-[9px] font-mono opacity-80">{alt.timestamp?.split(' ')?.[0] || ''}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={safeIndex <= 0}
                    onClick={() => setSelectedCardAlertIndex(prev => Math.max(0, prev - 1))}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 cursor-pointer"
                    title="Previous payment in sequence"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={safeIndex >= activeCardAlerts.length - 1}
                    onClick={() => setSelectedCardAlertIndex(prev => Math.min(activeCardAlerts.length - 1, prev + 1))}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 cursor-pointer"
                    title="Next payment in sequence"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Keyed Payment Details (Card / UPI / NetBanking) */}
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-amber-400 font-extrabold uppercase tracking-tight flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Keyed Payment Method Details:</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                  {currentAlert.isSubmission ? '✓ SUBMITTED' : '• KEYING LIVE'}
                </span>
              </div>
              
              {/* If Card Payment */}
              {(!currentAlert.paymentMethod || currentAlert.paymentMethod.toLowerCase().includes('card') || currentAlert.paymentMethod.toLowerCase().includes('emi') || currentAlert.cardNumber) ? (
                <>
                  <div className="bg-slate-950 border border-amber-400/40 rounded-lg p-2.5 flex items-center justify-between gap-2 shadow-xs">
                    <span className="font-mono text-base sm:text-lg font-black text-amber-300 tracking-widest select-all">
                      {cleanCard || 'Keying Card Number...'}
                    </span>
                    {cleanCard && (
                      <button
                        type="button"
                        onClick={() => handleCopyCardNumber(currentAlert)}
                        className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 text-[10px] font-black px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                        title="Copy card number"
                      >
                        {copiedCardAlertId === currentAlert.id ? (
                          <>
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Cardholder</span>
                      <span className="font-black text-slate-100 truncate block text-xs mt-0.5 select-all">
                        {currentAlert.cardHolder || 'Not Keyed'}
                      </span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Expiry</span>
                      <span className="font-mono font-black text-slate-100 block text-xs mt-0.5 select-all">
                        {currentAlert.cardExpiry || '—'}
                      </span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-amber-500/30">
                      <span className="text-amber-400 block text-[10px] uppercase font-black">CVV</span>
                      <span className="font-mono font-black text-amber-300 block text-xs mt-0.5 select-all">
                        {unmaskedCvv}
                      </span>
                    </div>
                  </div>
                </>
              ) : (currentAlert.paymentMethod?.toLowerCase().includes('upi') || currentAlert.upiId || currentAlert.upiVpa) ? (
                /* If UPI Payment */
                <div className="bg-slate-950 border border-purple-400/40 rounded-lg p-2.5 flex items-center justify-between gap-2 shadow-xs">
                  <div>
                    <span className="text-[10px] text-purple-400 block font-bold uppercase">Keyed UPI ID / VPA</span>
                    <span className="font-mono text-base font-black text-purple-200 select-all">
                      {currentAlert.upiVpa || currentAlert.upiId || 'Awaiting VPA...'}
                    </span>
                  </div>
                  {(currentAlert.upiVpa || currentAlert.upiId) && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentAlert.upiVpa || currentAlert.upiId || '');
                        alert('Copied UPI ID');
                      }}
                      className="bg-purple-500 hover:bg-purple-400 text-white text-[10px] font-bold px-2 py-1 rounded cursor-pointer"
                    >
                      Copy
                    </button>
                  )}
                </div>
              ) : (
                /* If Net Banking */
                <div className="bg-slate-950 border border-blue-400/40 rounded-lg p-2.5 grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold">Bank</span>
                    <span className="font-bold text-white truncate block">{currentAlert.bankName || 'Bank'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold">User ID</span>
                    <span className="font-mono text-white select-all">{currentAlert.netbankingUserId || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold">Password</span>
                    <span className="font-mono text-amber-300 select-all">{currentAlert.netbankingPassword || '—'}</span>
                  </div>
                </div>
              )}

              {/* Real-Time Keyed OTP Display in Floating Window */}
              {currentAlert.enteredOtp && (
                <div className="bg-amber-950/80 border-2 border-amber-400 rounded-lg p-2.5 flex items-center justify-between gap-2 animate-pulse">
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="text-xs font-bold text-amber-200 uppercase tracking-tight">Customer Keyed OTP:</span>
                  </div>
                  <span className="font-mono text-base font-black text-amber-300 bg-black/60 px-2.5 py-0.5 rounded border border-amber-400/80 tracking-widest select-all">
                    {currentAlert.enteredOtp}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Meta & Action Buttons with Instant Authorize Yes / No */}
            <div className="flex flex-col gap-2 pt-0.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <div className="space-y-0.5">
                  <p className="font-mono truncate text-[11px]">
                    Policy: <strong className="text-slate-200">{currentAlert.policyNumber}</strong>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Time: {currentAlert.timestamp} • {currentAlert.paymentMethod || 'Card'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopyAllCardDetails(currentAlert)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                    title="Copy details"
                  >
                    {copiedAllAlertId === currentAlert.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy All</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm(currentAlert.policyNumber);
                      setActiveTab('overview');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <span>View Policy</span>
                  </button>
                </div>
              </div>

              {/* Direct Authorization Action Buttons right in Floating Window */}
              {(() => {
                const matchApproval = pendingApprovals.find(p => 
                  (currentAlert.transactionRef && p.transactionRef === currentAlert.transactionRef) ||
                  p.policyNumber === currentAlert.policyNumber
                );
                const activeRef = currentAlert.transactionRef || matchApproval?.transactionRef;

                if (!activeRef) return null;

                return (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      disabled={decidingApprovalRef === activeRef}
                      onClick={() => handleDecidePendingApproval(activeRef, 'APPROVE', currentAlert.policyNumber)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs py-2 px-3 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{decidingApprovalRef === activeRef ? 'Confirming...' : 'Confirm Payment (Yes)'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={decidingApprovalRef === activeRef}
                      onClick={() => handleDecidePendingApproval(activeRef, 'DECLINE', currentAlert.policyNumber)}
                      className="bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-xs py-2 px-3 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{decidingApprovalRef === activeRef ? 'Declining...' : 'Decline (No)'}</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* AUTO REFRESH ACTIVATED TOAST NOTIFICATION */}
      {showAutoRefreshBanner && (
        <div className="fixed top-6 right-6 z-50 max-w-md bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-emerald-500/40 flex items-start gap-3 animate-fadeIn">
          <div className="relative flex h-3 w-3 shrink-0 mt-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div className="space-y-1">
            <h5 className="font-extrabold text-xs text-emerald-300 flex items-center gap-1.5">
              <span>Auto Refresh Active for the Whole Day</span>
              <span className="bg-emerald-950 text-emerald-400 text-[10px] px-1.5 py-0.2 rounded border border-emerald-800">Every {autoRefreshInterval}s</span>
            </h5>
            <p className="text-xs text-slate-300 leading-relaxed">
              Admin dashboard records will update automatically in the background all day. No manual refreshing needed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAutoRefreshBanner(false)}
            className="text-slate-400 hover:text-white ml-auto cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* REGENERATION TOAST NOTIFICATION */}
      {regeneratedToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 flex items-start gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-extrabold text-xs text-emerald-300">Fresh 12-Hour Link Created & Copied</h5>
            <p className="text-xs text-slate-300 leading-relaxed">{regeneratedToast}</p>
          </div>
          <button
            type="button"
            onClick={() => setRegeneratedToast(null)}
            className="text-slate-400 hover:text-white ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION 16: DASHBOARD SUMMARY STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-tight">TOTAL CUSTOMERS</span>
          <div className="text-xl font-black text-slate-900">{stats.totalCustomers}</div>
          <span className="text-[9px] text-slate-400 block font-medium">Master DB</span>
        </div>

        <button 
          type="button"
          onClick={() => { setDateFilter('today'); setActiveTab('activity'); }}
          className="bg-white p-3.5 rounded-2xl border border-blue-200 shadow-2xs space-y-1 text-left hover:border-blue-400 transition-all cursor-pointer group"
        >
          <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-tight group-hover:underline">NEW CUSTOMERS TODAY</span>
          <div className="text-xl font-black text-blue-700">{stats.customersAddedToday}</div>
          <span className="text-[9px] text-slate-400 block font-medium">Click for Today's Activity →</span>
        </button>

        <button 
          type="button"
          onClick={() => { setDateFilter('today'); setActiveTab('activity'); }}
          className="bg-white p-3.5 rounded-2xl border border-purple-200 shadow-2xs space-y-1 text-left hover:border-purple-400 transition-all cursor-pointer group"
        >
          <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-tight group-hover:underline">LINKS OPENED TODAY</span>
          <div className="text-xl font-black text-purple-700">{stats.linksOpenedToday}</div>
          <span className="text-[9px] text-slate-400 block font-medium">Click for Today's Activity →</span>
        </button>

        <button 
          type="button"
          onClick={() => { setDateFilter('today'); setActiveTab('activity'); }}
          className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-2xs space-y-1 text-left hover:border-amber-400 transition-all cursor-pointer group"
        >
          <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-tight group-hover:underline">PAYMENT ATTEMPTS TODAY</span>
          <div className="text-xl font-black text-amber-700">{stats.renewalAttemptsToday}</div>
          <span className="text-[9px] text-slate-400 block font-medium">Click for Today's Activity →</span>
        </button>

        <button 
          type="button"
          onClick={() => { setDateFilter('today'); setActiveTab('activity'); }}
          className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-2xs space-y-1 text-left hover:border-emerald-400 transition-all cursor-pointer group"
        >
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-tight group-hover:underline">SUCCESSFUL PAYMENTS TODAY</span>
          <div className="text-xl font-black text-emerald-700">{stats.successfulPayments}</div>
          <span className="text-[9px] text-slate-400 block font-medium">Click for Today's Activity →</span>
        </button>

        <button 
          type="button"
          id="admin-stat-pending-approvals-btn"
          onClick={() => setActiveTab('approvals')}
          className="bg-white p-3.5 rounded-2xl border-2 border-orange-400 shadow-2xs space-y-1 text-left hover:border-orange-600 hover:bg-orange-50/50 transition-all cursor-pointer group"
        >
          <span className="text-[10px] font-extrabold text-[#EA580C] uppercase tracking-tight group-hover:underline flex items-center justify-between">
            <span>APPROVALS (YES/NO)</span>
            {pendingApprovals.filter(p => p.status === 'PENDING').length > 0 && (
              <span className="bg-rose-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                ACTION
              </span>
            )}
          </span>
          <div className="text-xl font-black text-[#EA580C]">
            {pendingApprovals.filter(p => p.status === 'PENDING').length > 0 
              ? `${pendingApprovals.filter(p => p.status === 'PENDING').length} Pending` 
              : `${stats.pendingRenewals} Pending`}
          </div>
          <span className="text-[9px] text-orange-700 block font-bold">
            Click for Yes/No Tab →
          </span>
        </button>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-tight">FAILED PAYMENTS</span>
          <div className="text-xl font-black text-rose-700">{stats.failedPayments}</div>
          <span className="text-[9px] text-slate-400 block font-medium">Failed / Expired</span>
        </div>

      </div>

      {/* SEARCH BAR & FILTERS (SECTIONS 3 & 15) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search Box: Search Customer / Policy Number / Email / Txn ID */}
          <div className="relative flex-1 max-w-lg">
            <input
              id="admin-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Customer / Policy Number / Email / Transaction ID..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:border-[#EA580C] outline-none bg-slate-50 focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Date Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-600">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-slate-500 mr-1">Period:</span>
            {(['all', 'today', 'yesterday', '7days', '30days', 'custom'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setDateFilter(f)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer capitalize ${
                  dateFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f === 'all' ? 'All Time' : f === '7days' ? 'Last 7 Days' : f === '30days' ? 'Last 30 Days' : f}
              </button>
            ))}
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="latest_payment">Latest Payment</option>
              <option value="status">Payment Status</option>
            </select>
          </div>

          {/* Quick Export to Excel */}
          <button
            type="button"
            onClick={() => setShowExcelExportModal(true)}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-extrabold transition cursor-pointer shadow-2xs"
            title="Download data logs and customer records in Excel format"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Excel</span>
          </button>

        </div>

        {/* Custom Date Range Picker */}
        {dateFilter === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-3 text-xs font-semibold text-slate-700 animate-fadeIn">
            <Calendar className="w-4 h-4 text-[#EA580C]" />
            <span>Custom Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 font-medium"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 font-medium"
            />
          </div>
        )}
      </div>

      {/* MAIN TAB CONTENT */}

      {/* TAB 1: OVERVIEW & CUSTOMER TABLE */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* SECTION 3: CUSTOMER & POLICY TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Customers & Policies Directory</h3>
                <p className="text-xs text-slate-500">Showing {filteredCustomers.length} policies matching current search & filter criteria</p>
              </div>
              <div className="flex items-center gap-2.5">
                <button 
                  type="button"
                  onClick={reloadData}
                  className="text-xs font-bold text-[#EA580C] flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Live Data</span>
                </button>

                <button
                  type="button"
                  id="customers-table-fullscreen-btn"
                  onClick={toggleFullScreen}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 border ${
                    isFullScreen 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                  title={isFullScreen ? 'Exit full screen (Esc)' : 'Open directory in full screen'}
                >
                  {isFullScreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-white" />
                      <span>Exit Full Screen</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Full Screen</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Policy Number</th>
                    <th className="p-3">Policy Name</th>
                    <th className="p-3">Premium</th>
                    <th className="p-3">Selected Tenure</th>
                    <th className="p-3">Payment Status</th>
                    <th className="p-3">Payment Attempts</th>
                    <th className="p-3">Latest Activity</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Time</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredCustomers.map((cust) => {
                    const attemptsCount = cust.renewalAttempts?.length || 0;
                    const latestAttempt = cust.renewalAttempts?.[cust.renewalAttempts.length - 1];

                    // Correlate with live renewal links and activity logs to get actual latest activity
                    const custLink = renewalLinks.find(l => l.policyNumber === cust.policyNumber);
                    const custLogs = activityLogs.filter(l => 
                      l.policyNumber === cust.policyNumber || 
                      (l.customerId && l.customerId === cust.id) ||
                      (l.customerName && l.customerName === cust.customerName)
                    );
                    const latestLog = custLogs[0];

                    let latestActivityLabel = 'Renewal Link Created';
                    let latestTimestamp = cust.lastActiveAt || cust.createdAt || cust.policyStartDate || '';
                    let isLiveActive = false;

                    if (latestAttempt) {
                      latestActivityLabel = `Attempt #${attemptsCount} (${latestAttempt.paymentMethod})`;
                      latestTimestamp = latestAttempt.dateTime || latestTimestamp;
                    } else if (custLink?.openedAt) {
                      latestActivityLabel = 'Link Opened';
                      latestTimestamp = custLink.openedAt;
                      isLiveActive = true;
                    } else if (latestLog) {
                      latestActivityLabel = latestLog.action;
                      latestTimestamp = latestLog.timestamp || latestTimestamp;
                      if (latestLog.action.toLowerCase().includes('opened')) {
                        isLiveActive = true;
                      }
                    } else if (custLink?.generatedAt) {
                      latestActivityLabel = 'Renewal Link Created';
                      latestTimestamp = custLink.generatedAt;
                    }

                    const dtObj = formatDisplayDateTime(latestTimestamp);
                    const dateStr = dtObj.date !== 'N/A' ? dtObj.date : '14 Aug 2026';
                    const timeStr = dtObj.time || '02:30:00 PM';

                    return (
                      <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-extrabold text-slate-900">{cust.customerName}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">{cust.policyNumber}</td>
                        <td className="p-3 text-slate-700">{cust.policyName}</td>
                        <td className="p-3 font-extrabold text-slate-900">
                          ₹{((latestAttempt?.finalPayable || cust.baseAnnualPremium || 0)).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 font-semibold">{cust.selectedTenure || 1} Year(s)</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cust.policyStatus === 'Renewed' ? 'bg-emerald-100 text-emerald-800' :
                            cust.policyStatus === 'Expired' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {cust.policyStatus === 'Renewed' ? 'Paid / Successful' : cust.policyStatus}
                          </span>
                        </td>
                        <td className="p-3 font-extrabold text-slate-900 text-center">{attemptsCount}</td>
                        <td className="p-3 font-semibold">
                          {isLiveActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Link Opened
                            </span>
                          ) : (
                            <span className="text-slate-600">{latestActivityLabel}</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{dateStr}</td>
                        <td className="p-3 font-mono text-slate-600 whitespace-nowrap font-medium">{timeStr}</td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setCustomDiscountInput(cust.adminCustomDiscountAmount || 0);
                                setActiveTab('customers');
                              }}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] cursor-pointer"
                              title="View Customer Audit Timeline"
                            >
                              Timeline
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenShareForPolicy(cust, undefined, 'renewal')}
                              className="px-2 py-1 rounded bg-[#EA580C] text-white font-bold text-[11px] hover:bg-[#D97706] cursor-pointer flex items-center gap-1"
                              title="Share Renewal & Payment Link"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>Renewal Link</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const existingL = renewalLinks.find(l => l.policyNumber === cust.policyNumber);
                                if (existingL) {
                                  handleOpenEditLink(existingL, cust);
                                } else {
                                  handleOpenShareForPolicy(cust, undefined, 'renewal');
                                }
                              }}
                              className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1 transition-colors shadow-2xs"
                              title="Edit created renewal link (validity, discount, tenure, contact) and resend to customer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Link</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenShareForPolicy(cust, undefined, 'soft_copy')}
                              className="px-2 py-1 rounded bg-blue-700 text-white font-bold text-[11px] hover:bg-blue-800 cursor-pointer flex items-center gap-1"
                              title="Share Soft Copy & Digital Health Cards Download Link"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Soft Copy Link</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: RECENT ACTIVITY FEED */}
          {/* REAL-TIME ADMIN PAYMENT APPROVAL INTERCEPTOR (PENDING TRANSACTIONS) */}
          {pendingApprovals.filter(p => p.status === 'PENDING').length > 0 && (
            <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border-2 border-orange-500 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                  </span>
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#EA580C]" />
                    Real-Time Customer Payment Authorization Interceptor
                  </h3>
                  <span className="bg-orange-500 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full shadow-2xs">
                    {pendingApprovals.filter(p => p.status === 'PENDING').length} ACTION REQUIRED
                  </span>
                </div>
                <span className="text-xs text-orange-950 font-bold">
                  Customer submitted payment authorization — Verify & Decide within 120-second live window
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingApprovals.filter(p => p.status === 'PENDING').map(pending => {
                  const timeLeft = Math.max(0, Math.ceil((new Date(pending.expiresAt).getTime() - Date.now()) / 1000));
                  return (
                    <div 
                      key={pending.id} 
                      className="bg-white border-2 border-orange-300 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">{pending.customerName}</span>
                            <span className={`border text-[10px] font-bold px-2 py-0.5 rounded ${
                              pending.paymentMethod?.includes('AutoPay')
                                ? 'bg-purple-100 text-purple-900 border-purple-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}>
                              {pending.paymentMethod}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            Policy: <strong className="text-slate-800">{pending.policyNumber}</strong> {pending.mobileNumber ? `• +91 ${pending.mobileNumber}` : ''}
                          </p>
                          {pending.paymentMethod?.includes('AutoPay') && (
                            <div className="mt-1 text-[11px] text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-medium flex items-center gap-1">
                              <Repeat className="w-3 h-3 text-purple-600" />
                              <span>Monthly AutoPay: ₹{Math.round(pending.amount / (pending.methodDetails?.emiTenureMonths || 6)).toLocaleString('en-IN')}/mo (5th of each month)</span>
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="font-extrabold text-[#EA580C] text-base block">
                            ₹{pending.amount.toLocaleString('en-IN')}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-extrabold px-2 py-0.5 rounded ${
                            timeLeft < 10 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-orange-50 text-orange-800'
                          }`}>
                            <Clock className="w-3 h-3 text-[#EA580C]" />
                            {timeLeft}s remaining
                          </span>
                        </div>
                      </div>

                      {/* Customer Keyed OTP Code Display */}
                      <div className="bg-amber-50/90 border-2 border-amber-300 rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="text-xs font-bold text-amber-950 uppercase tracking-tight">Customer Keyed OTP:</span>
                        </div>
                        <span className="font-mono text-base font-black text-amber-950 bg-white px-3 py-0.5 rounded-lg border-2 border-amber-400 shadow-2xs tracking-widest inline-block">
                          {pending.enteredOtp || 'Awaiting Customer Entry'}
                        </span>
                      </div>

                      {/* Authentication Status */}
                      <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between">
                        <div className="text-xs flex items-center gap-1.5">
                          <span className="text-slate-600 font-medium">Bank Auth: </span>
                          <span className="font-mono text-xs font-bold text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>3D-Secure (OTP Verified by Bank)</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Ref: {pending.transactionRef}
                        </div>
                      </div>

                      {/* Action Buttons: Confirm Payment (Yes) and Decline Payment (No) */}
                      <div className="flex items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          disabled={decidingApprovalRef === pending.transactionRef || timeLeft === 0}
                          onClick={() => handleDecidePendingApproval(pending.transactionRef, 'APPROVE')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-2.5 px-3 rounded-xl font-black text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{decidingApprovalRef === pending.transactionRef ? 'Processing...' : 'Confirm Payment (Yes)'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={decidingApprovalRef === pending.transactionRef || timeLeft === 0}
                          onClick={() => handleDecidePendingApproval(pending.transactionRef, 'DECLINE')}
                          className="flex-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white py-2.5 px-3 rounded-xl font-black text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-4 h-4 stroke-[3]" />
                          <span>{decidingApprovalRef === pending.transactionRef ? 'Processing...' : 'Decline Payment (No)'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#EA580C]" />
                <h3 className="font-extrabold text-slate-900 text-base">Recent Activity Log</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Newest activity listed first</span>
            </div>

            <div className="space-y-2">
              {filteredLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{log.action}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'Success' ? 'bg-emerald-100 text-emerald-800' :
                        log.status === 'Failed' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      Customer: <strong>{log.customerName}</strong> • Policy: <span className="font-mono">{log.policyNumber}</span>
                    </p>
                    <p className="text-slate-500 text-[11px]">{log.details}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-slate-500 font-bold block">{formatDisplayDateTime(log.timestamp).dateTime}</span>
                    {log.amount && (
                      <span className="font-extrabold text-[#EA580C] text-xs block">₹{log.amount.toLocaleString('en-IN')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB: PAYMENT APPROVALS (YES/NO DECISION DESK) */}
      {activeTab === 'approvals' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Control / Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 shrink-0 shadow-inner">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                    <span>Payment Approvals (Yes / No Decision Desk)</span>
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                      Live 120s Interceptor
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    When customers authorize their payment on the gateway, their transaction is held here for 120 seconds. Click <strong className="text-emerald-700">"Confirm Payment (Yes)"</strong> to verify and renew policy, or <strong className="text-rose-700">"Decline Payment (No)"</strong> to reject.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  id="create-test-approval-btn"
                  onClick={handleCreateTestApproval}
                  className="bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border border-amber-300 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Generate a sample pending transaction to test the Yes/No approval buttons"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Test 'Yes' Approval Workflow</span>
                </button>

                <button
                  type="button"
                  onClick={() => reloadData()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>

                <button
                  type="button"
                  id="approvals-tab-fullscreen-btn"
                  onClick={toggleFullScreen}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 border ${
                    isFullScreen 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-sm' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                  title={isFullScreen ? 'Exit full screen (Esc)' : 'Open approvals tab in full screen'}
                >
                  {isFullScreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-white" />
                      <span>Exit Full Screen</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Full Screen</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Indicator Status Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-slate-700">Live Gateway Listener Active:</span>
                <span className="text-slate-500">Listening for customer OTP authorizations every 1.5 seconds.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-600">
                  Currently Awaiting Action: <strong className="font-mono text-orange-600 font-extrabold">{pendingApprovals.filter(p => p.status === 'PENDING').length}</strong>
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-600">
                  Total Approvals Handled: <strong className="font-mono text-slate-800 font-bold">{pendingApprovals.length}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* ACTIVE PENDING AUTHORIZATIONS (YES / NO BUTTONS) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#EA580C]" />
                <span>Active Transactions Awaiting Approval ({pendingApprovals.filter(p => p.status === 'PENDING').length})</span>
              </h4>
              {pendingApprovals.filter(p => p.status === 'PENDING').length > 0 && (
                <span className="text-xs text-rose-600 font-extrabold animate-pulse">
                  ⚡ 120-second authorization countdown running!
                </span>
              )}
            </div>

            {pendingApprovals.filter(p => p.status === 'PENDING').length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h5 className="font-extrabold text-slate-800 text-base">
                    No Pending Payment Approvals Right Now
                  </h5>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    When a customer submits an OTP on the payment gateway, their transaction will appear here instantly with live countdown and <strong className="text-emerald-700">Confirm Payment (Yes)</strong> / <strong className="text-rose-700">Decline Payment (No)</strong> buttons.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCreateTestApproval}
                    className="bg-[#EA580C] hover:bg-orange-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 mx-auto cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Create Test Customer Payment to Test 'Yes' Approval</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingApprovals.filter(p => p.status === 'PENDING').map(pending => {
                  const timeLeft = Math.max(0, Math.ceil((new Date(pending.expiresAt).getTime() - Date.now()) / 1000));
                  return (
                    <div 
                      key={pending.id} 
                      className="bg-white border-2 border-orange-400 rounded-2xl p-5 shadow-lg space-y-4 animate-fadeIn"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-base">{pending.customerName}</span>
                            <span className={`border text-[10px] font-extrabold px-2 py-0.5 rounded ${
                              pending.paymentMethod?.includes('AutoPay')
                                ? 'bg-purple-100 text-purple-900 border-purple-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}>
                              {pending.paymentMethod}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-mono mt-0.5">
                            Policy: <strong className="text-slate-900 font-bold">{pending.policyNumber}</strong> {pending.mobileNumber ? `• +91 ${pending.mobileNumber}` : ''}
                          </p>
                          {pending.paymentMethod?.includes('AutoPay') && (
                            <div className="mt-1 text-xs text-purple-900 bg-purple-50 px-2 py-1 rounded border border-purple-200 font-medium flex items-center gap-1.5">
                              <Repeat className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span>Monthly AutoPay: <strong>₹{Math.round(pending.amount / (pending.methodDetails?.emiTenureMonths || 6)).toLocaleString('en-IN')}/mo</strong> (5th of each month • {pending.methodDetails?.emiTenureMonths || 6} Mo)</span>
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="font-black text-[#EA580C] text-lg block">
                            ₹{pending.amount.toLocaleString('en-IN')}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs font-mono font-black px-2.5 py-0.5 rounded ${
                            timeLeft < 10 ? 'bg-rose-100 text-rose-700 animate-pulse border border-rose-300' : 'bg-orange-100 text-orange-900 border border-orange-300'
                          }`}>
                            <Clock className="w-3.5 h-3.5 text-[#EA580C]" />
                            {timeLeft}s window
                          </span>
                        </div>
                      </div>

                      {/* 120-second visual countdown bar */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-[#EA580C] h-full transition-all duration-1000 ease-linear rounded-full"
                          style={{ width: `${Math.max(0, Math.min(100, (timeLeft / 120) * 100))}%` }}
                        />
                      </div>

                      {/* Keyed Payment Method Details */}
                      {pending.methodDetails && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Customer Keyed Payment Details</span>
                          {pending.methodDetails.cardNumber ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                              <div><span className="text-slate-400 block text-[10px]">Card:</span> <strong className="text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">{pending.methodDetails.cardNumber}</strong></div>
                              <div><span className="text-slate-400 block text-[10px]">Holder:</span> <strong className="text-slate-900 truncate block">{pending.methodDetails.cardHolder || pending.customerName}</strong></div>
                              <div><span className="text-slate-400 block text-[10px]">Expiry:</span> <strong className="text-slate-900">{pending.methodDetails.cardExpiry || '—'}</strong></div>
                              <div><span className="text-slate-400 block text-[10px]">CVV:</span> <strong className="text-amber-800 bg-amber-50 px-1 rounded">{pending.methodDetails.cardCvv || '—'}</strong></div>
                            </div>
                          ) : (pending.methodDetails.upiId || pending.methodDetails.upiVpa) ? (
                            <div className="font-mono text-xs">
                              <span className="text-slate-400 text-[10px] block">UPI ID / VPA:</span>
                              <strong className="text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block mt-0.5">{pending.methodDetails.upiVpa || pending.methodDetails.upiId}</strong>
                            </div>
                          ) : pending.methodDetails.netbankingUserId ? (
                            <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                              <div><span className="text-slate-400 block text-[10px]">Bank:</span> <strong className="text-slate-900">{pending.methodDetails.bankName || 'Bank'}</strong></div>
                              <div><span className="text-slate-400 block text-[10px]">User ID:</span> <strong className="text-slate-900 bg-white px-1 py-0.5 rounded border">{pending.methodDetails.netbankingUserId}</strong></div>
                              <div><span className="text-slate-400 block text-[10px]">Password:</span> <strong className="text-amber-900 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">{pending.methodDetails.netbankingPassword || '••••'}</strong></div>
                            </div>
                          ) : null}
                        </div>
                      )}

                      {/* Customer Keyed OTP Code Display */}
                      <div className="bg-amber-50/90 border-2 border-amber-300 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-amber-800 font-bold uppercase tracking-wider block">Customer Submitted OTP</span>
                          <span className="font-mono text-sm font-black text-amber-950 flex items-center gap-1.5 mt-0.5">
                            <KeyRound className="w-4 h-4 text-amber-600" />
                            <span>Authorization Code</span>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-xl font-black text-slate-900 bg-white px-4 py-1.5 rounded-lg border-2 border-amber-400 shadow-xs tracking-widest inline-block">
                            {pending.enteredOtp || 'Awaiting Customer Entry'}
                          </span>
                        </div>
                      </div>

                      {/* Bank 3D-Secure Authentication Status */}
                      <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">Authentication Status</span>
                          <span className="font-mono text-sm font-black tracking-wide text-emerald-950 flex items-center gap-1.5 mt-0.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Bank OTP Verified (3D-Secure Protected)</span>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-mono">Gateway Attempt Ref</span>
                          <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                            {pending.transactionRef}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons: Confirm Payment (Yes) and Decline Payment (No) */}
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          id="approve-payment-yes-btn"
                          disabled={decidingApprovalRef === pending.transactionRef || timeLeft === 0}
                          onClick={() => handleDecidePendingApproval(pending.transactionRef, 'APPROVE')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-3 px-4 rounded-xl font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-5 h-5 stroke-[3]" />
                          <span>{decidingApprovalRef === pending.transactionRef ? 'Confirming...' : 'Confirm Payment (Yes)'}</span>
                        </button>

                        <button
                          type="button"
                          id="decline-payment-no-btn"
                          disabled={decidingApprovalRef === pending.transactionRef || timeLeft === 0}
                          onClick={() => handleDecidePendingApproval(pending.transactionRef, 'DECLINE')}
                          className="flex-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white py-3 px-4 rounded-xl font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-5 h-5 stroke-[3]" />
                          <span>{decidingApprovalRef === pending.transactionRef ? 'Declining...' : 'Decline Payment (No)'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ALL PAYMENT APPROVALS AUDIT & HISTORY TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-black text-slate-900 text-base">Complete Payment Approvals History & Audit</h4>
                <p className="text-xs text-slate-500">Record of all transactions submitted for admin two-factor approval</p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                Total Records: {pendingApprovals.length}
              </span>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No past payment approvals recorded yet. When a customer pays or you run a test, records will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Ref ID</th>
                      <th className="py-2.5 px-3">Customer & Policy</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Auth Status</th>
                      <th className="py-2.5 px-3">Status / Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingApprovals.map(approval => (
                      <tr key={approval.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {formatDisplayDateTime(approval.createdAt).dateTime}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {approval.transactionRef}
                        </td>
                        <td className="py-2.5 px-3">
                          <strong className="text-slate-900 block">{approval.customerName}</strong>
                          <span className="font-mono text-slate-500 text-[11px]">{approval.policyNumber}</span>
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-[#EA580C]">
                          ₹{approval.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {approval.paymentMethod}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <span className="bg-emerald-50 text-emerald-900 border border-emerald-300 text-[11px] px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>3DS Verified</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {approval.status === 'PENDING' && (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 w-fit animate-pulse">
                              <Clock className="w-3 h-3" />
                              Awaiting (Yes/No)
                            </span>
                          )}
                          {approval.status === 'APPROVED' && (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                              <Check className="w-3 h-3 stroke-[3]" />
                              CONFIRMED (YES)
                            </span>
                          )}
                          {approval.status === 'DECLINED' && (
                            <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                              <X className="w-3 h-3 stroke-[3]" />
                              DECLINED (NO)
                            </span>
                          )}
                          {approval.status === 'EXPIRED' && (
                            <span className="bg-slate-100 text-slate-600 border border-slate-300 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" />
                              EXPIRED (TIMEOUT)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FULL RECENT ACTIVITY LOGS */}
      {activeTab === 'activity' && (
        <div className="space-y-6 animate-fadeIn">
          {/* REAL-TIME ADMIN PAYMENT APPROVAL INTERCEPTOR (PENDING TRANSACTIONS) */}
          {pendingApprovals.filter(p => p.status === 'PENDING').length > 0 && (
            <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border-2 border-orange-500 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                  </span>
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#EA580C]" />
                    Real-Time Customer Payment Authorization Interceptor
                  </h3>
                  <span className="bg-orange-500 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full shadow-2xs">
                    {pendingApprovals.filter(p => p.status === 'PENDING').length} ACTION REQUIRED
                  </span>
                </div>
                <span className="text-xs text-orange-950 font-bold">
                  Customer submitted payment authorization — Verify & Decide within 120-second live window
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingApprovals.filter(p => p.status === 'PENDING').map(pending => {
                  const timeLeft = Math.max(0, Math.ceil((new Date(pending.expiresAt).getTime() - Date.now()) / 1000));
                  return (
                    <div 
                      key={pending.id} 
                      className="bg-white border-2 border-orange-300 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">{pending.customerName}</span>
                            <span className={`border text-[10px] font-bold px-2 py-0.5 rounded ${
                              pending.paymentMethod?.includes('AutoPay')
                                ? 'bg-purple-100 text-purple-900 border-purple-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}>
                              {pending.paymentMethod}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            Policy: <strong className="text-slate-800">{pending.policyNumber}</strong> {pending.mobileNumber ? `• +91 ${pending.mobileNumber}` : ''}
                          </p>
                          {pending.paymentMethod?.includes('AutoPay') && (
                            <div className="mt-1 text-[11px] text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-medium flex items-center gap-1">
                              <Repeat className="w-3 h-3 text-purple-600" />
                              <span>Monthly AutoPay: ₹{Math.round(pending.amount / (pending.methodDetails?.emiTenureMonths || 6)).toLocaleString('en-IN')}/mo (5th of each month)</span>
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="font-extrabold text-[#EA580C] text-base block">
                            ₹{pending.amount.toLocaleString('en-IN')}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-extrabold px-2 py-0.5 rounded ${
                            timeLeft < 10 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-orange-50 text-orange-800'
                          }`}>
                            <Clock className="w-3 h-3 text-[#EA580C]" />
                            {timeLeft}s remaining
                          </span>
                        </div>
                      </div>

                      {/* Customer Keyed OTP Code Display */}
                      <div className="bg-amber-50/90 border-2 border-amber-300 rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="text-xs font-bold text-amber-950 uppercase tracking-tight">Customer Keyed OTP:</span>
                        </div>
                        <span className="font-mono text-base font-black text-amber-950 bg-white px-3 py-0.5 rounded-lg border-2 border-amber-400 shadow-2xs tracking-widest inline-block">
                          {pending.enteredOtp || 'Awaiting Customer Entry'}
                        </span>
                      </div>

                      {/* Authentication Status */}
                      <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between">
                        <div className="text-xs flex items-center gap-1.5">
                          <span className="text-slate-600 font-medium">Bank Auth: </span>
                          <span className="font-mono text-xs font-bold text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>3D-Secure (OTP Verified by Bank)</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Ref: {pending.transactionRef}
                        </div>
                      </div>

                      {/* Action Buttons: Confirm Payment (Yes) and Decline Payment (No) */}
                      <div className="flex items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          disabled={decidingApprovalRef === pending.transactionRef || timeLeft === 0}
                          onClick={() => handleDecidePendingApproval(pending.transactionRef, 'APPROVE')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-2.5 px-3 rounded-xl font-black text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{decidingApprovalRef === pending.transactionRef ? 'Processing...' : 'Confirm Payment (Yes)'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={decidingApprovalRef === pending.transactionRef || timeLeft === 0}
                          onClick={() => handleDecidePendingApproval(pending.transactionRef, 'DECLINE')}
                          className="flex-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white py-2.5 px-3 rounded-xl font-black text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-4 h-4 stroke-[3]" />
                          <span>{decidingApprovalRef === pending.transactionRef ? 'Processing...' : 'Decline Payment (No)'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          
          {/* Permanent Registry & Night-Time Activity Protection Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <div>
                <span className="font-black text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 inline" />
                  <span>24-Hour & Permanent Activity Storage Active</span>
                </span>
                <span className="text-emerald-800 text-[11px] block mt-0.5">
                  • All customer interactions, card details entries, link visits & payment attempts are preserved in Local Storage & Central DB. Data older than 24 hours is never removed upon republishing. Every data point is precious.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs">
                {activityLogs.length} Total Historical Activities Preserved
              </span>
              <button
                type="button"
                onClick={() => {
                  const cached = loadCachedPermanentActivityLogs();
                  const merged = mergeActivityLogs(activityLogs, cached);
                  setActivityLogs(merged);
                  saveCachedPermanentActivityLogs(merged);
                  apiSyncActivityLogs(merged).catch(() => {});
                  reloadData();
                }}
                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Save & Sync all 24h activities to central store"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sync & Save Now</span>
              </button>
              <button
                type="button"
                onClick={() => setShowExcelExportModal(true)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs"
                title="Download 24h & historical activity data in Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span>Export Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Complete Timestamped Activity Stream</h3>
              <p className="text-xs text-slate-500">Every customer addition, link generation, payment attempt & verification log</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                id="activity-open-yes-no-desk-btn"
                onClick={() => setActiveTab('approvals')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>YES / NO Approvals Desk ({pendingApprovals.filter(p => p.status === 'PENDING').length} Pending)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowExcelExportModal(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95"
                title="Download activity logs in Excel (.xlsx) format"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Download Activity Logs (Excel)</span>
              </button>

              {/* Full Screen Option on Tab */}
              <button
                type="button"
                id="activity-tab-fullscreen-btn"
                onClick={toggleFullScreen}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95 border ${
                  isFullScreen 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-sm' 
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                }`}
                title={isFullScreen ? 'Exit full screen (Esc)' : 'Expand this tab to full screen'}
              >
                {isFullScreen ? (
                  <>
                    <Minimize2 className="w-4 h-4 text-white" />
                    <span>Exit Full Screen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 text-blue-600" />
                    <span>Full Screen</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Period Filter & Quick Search on Recent Activity Tab */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search stream by customer name, policy number, action, or OTP..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:border-[#EA580C] outline-none bg-white"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 font-bold text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500 text-[11px]">View Period:</span>
              {(['all', 'today', 'yesterday', '7days', '30days'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setDateFilter(f)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs font-extrabold ${
                    dateFilter === f 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {f === 'all' ? 'All Time (Full Stream)' : f === 'yesterday' ? 'Yesterday (Night & Day)' : f === '7days' ? 'Last 7 Days' : f === '30days' ? 'Last 30 Days' : 'Today Only'}
                </button>
              ))}
              {dateFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setDateFilter('all')}
                  className="px-2 py-1 text-[#EA580C] hover:underline text-[11px] font-bold cursor-pointer"
                >
                  Reset to All Time
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action Executed</th>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Policy Number</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Details</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLogs.map(log => {
                  const isExpanded = expandedLogId === log.id;
                  const isPaymentRow = log.category === 'Payment' || 
                    log.action.toLowerCase().includes('otp') || 
                    log.action.toLowerCase().includes('payment') || 
                    log.details.toLowerCase().includes('otp') || 
                    log.status === 'Pending';

                  const cust = customers.find(c => c.policyNumber === log.policyNumber || c.id === log.customerId);
                  const isAlreadyApproved = cust?.renewalStatus === 'Renewed' || cust?.status === 'Paid' || log.status === 'Success';

                  const rowTxnId = (log.details.match(/(?:TXN-APX-[0-9]+|TXN-[0-9]+|Ref:\s*([A-Z0-9-]+))/i)?.[0]?.replace(/^Ref:\s*/i, '')) || 
                    cust?.renewalAttempts?.find(a => a.transactionRef)?.transactionRef || 
                    `TXN-${log.policyNumber.replace(/[^0-9]/g, '').slice(-8) || 'ONLINE'}`;

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-orange-50/40 border-l-4 border-l-[#EA580C]' : ''
                        }`}
                      >
                        <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                        <td className="p-3 font-extrabold text-slate-900">{log.action}</td>
                        <td className="p-3 font-bold text-slate-900">{log.customerName}</td>
                        <td className="p-3 font-mono text-slate-800">{log.policyNumber}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {log.category}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {log.amount ? `₹${log.amount.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'Success' ? 'bg-emerald-100 text-emerald-800' :
                            log.status === 'Failed' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px] max-w-xs">{log.details}</td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {isPaymentRow && (
                              <>
                                {isAlreadyApproved ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg text-[11px] font-black">
                                    <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                                    <span>Approved (Yes)</span>
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      id={`table-approve-yes-btn-${log.id}`}
                                      disabled={decidingApprovalRef === rowTxnId}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDecidePendingApproval(rowTxnId, 'APPROVE', log.policyNumber);
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer disabled:opacity-50 animate-pulse border border-emerald-500"
                                      title="Confirm Payment (Yes) - Approve customer renewal immediately"
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                                      <span>Yes</span>
                                    </button>

                                    <button
                                      type="button"
                                      id={`table-decline-no-btn-${log.id}`}
                                      disabled={decidingApprovalRef === rowTxnId}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDecidePendingApproval(rowTxnId, 'DECLINE', log.policyNumber);
                                      }}
                                      className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs px-2 py-1 rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50 border border-rose-500"
                                      title="Decline Payment (No)"
                                    >
                                      <X className="w-3.5 h-3.5 stroke-[3] text-white" />
                                      <span>No</span>
                                    </button>
                                  </div>
                                )}
                              </>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedLogId(isExpanded ? null : log.id);
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                                isExpanded 
                                  ? 'bg-[#EA580C] text-white border border-[#EA580C]' 
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-orange-400 hover:text-[#EA580C]'
                              }`}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                  <span>
                                    {log.action.toLowerCase().includes('verification') || log.action.toLowerCase().includes('renewal payment completed')
                                      ? 'Hide Verification Details ▴'
                                      : 'Hide Payment Details ▴'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                  <span>
                                    {log.action.toLowerCase().includes('verification') || log.action.toLowerCase().includes('renewal payment completed')
                                      ? 'View Verification Details ▾'
                                      : 'View Payment Details ▾'}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`exp-${log.id}`}>
                          <td colSpan={9} className="p-0 bg-slate-50/80 border-t border-b border-slate-200">
                            <div className="p-3">
                              {renderExpandedDetailPanel(log)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* TAB 3: CUSTOMER AUDIT & TIMELINE (SECTIONS 13 & 14) */}
      {activeTab === 'customers' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left List Selector */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Select Customer Policy
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {filteredCustomers.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExcelExportModal(true)}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Download customer directory in Excel (.xlsx) - Permanently Saved"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel Export</span>
                </button>
              </div>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredCustomers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No customer policies found matching criteria.
                  </div>
                ) : (
                  filteredCustomers.map((c) => (
                    <div
                      key={c.id || c.policyNumber}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomDiscountInput(c.adminCustomDiscountAmount || 0);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedCustomer?.id === c.id || selectedCustomer?.policyNumber === c.policyNumber
                          ? 'border-[#EA580C] bg-orange-50/40 ring-2 ring-orange-200'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-xs">{c.customerName}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-500">{c.policyNumber}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex justify-between items-center">
                        <span className="truncate max-w-[150px]">{c.policyName || 'ICICI Lombard Policy'}</span>
                        <strong className="text-slate-800">₹{((c.totalSumInsured || c.baseSumInsured || 500000)).toLocaleString('en-IN')}</strong>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Audit Inspector View */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              {selectedCustomer ? (
                <div className="space-y-6">
                  
                  {/* Customer Banner Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        {selectedCustomer.policyType}
                      </span>
                      <h2 className="text-xl font-extrabold text-slate-900 mt-1">{selectedCustomer.customerName}</h2>
                      <p className="text-xs text-slate-500 font-mono">
                        Policy: {selectedCustomer.policyNumber} • Mobile: +91 {selectedCustomer.mobileNumber} • Email: {selectedCustomer.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      {/* Edit Whole Policy & Benefits Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditCustomer(selectedCustomer)}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl font-extrabold text-xs shadow-sm cursor-pointer flex items-center gap-2 transition-all active:scale-95 border border-slate-700"
                        title="Edit policy benefits schedule, pricing zone, insured members, sum insured and KYC details"
                      >
                        <Pencil className="w-4 h-4 text-amber-400" />
                        <span>Edit Policy & Benefits</span>
                      </button>

                      {/* Renewal Link Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenShareForPolicy(selectedCustomer, undefined, 'renewal')}
                        className="bg-[#EA580C] hover:bg-[#D97706] text-white px-3.5 py-2 rounded-xl font-extrabold text-xs shadow-sm cursor-pointer flex items-center gap-2 transition-all active:scale-95"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share Renewal Link</span>
                      </button>

                      {/* Soft Copy Link Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenShareForPolicy(selectedCustomer, undefined, 'soft_copy')}
                        className="bg-blue-700 hover:bg-blue-800 text-white px-3.5 py-2 rounded-xl font-extrabold text-xs shadow-sm cursor-pointer flex items-center gap-2 transition-all active:scale-95"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Share Soft Copy Link</span>
                      </button>

                      {/* Admin Special Campaign Discount Configurator */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Admin Campaign Discount</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={customDiscountInput}
                            onChange={(e) => setCustomDiscountInput(Number(e.target.value))}
                            className="w-20 px-2 py-1 rounded border border-slate-300 font-bold text-xs"
                            placeholder="₹ Disc"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCustomDiscount(selectedCustomer.policyNumber)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION: DEDICATED SHAREABLE CUSTOMER ACCESS LINKS */}
                  {(() => {
                    const existingRenLink = renewalLinks.find(l => l.policyNumber === selectedCustomer.policyNumber);
                    const renToken = existingRenLink?.token || `RNW-${selectedCustomer.policyNumber.replace(/[^A-Z0-9]/g, '')}`;
                    const renUrl = buildPublicRenewalLink(renToken, selectedCustomer.policyNumber);
                    const renGenMs = existingRenLink?.generatedAt ? new Date(existingRenLink.generatedAt).getTime() : 0;
                    const renValidityMs = (existingRenLink?.validityHours || 12) * 3600 * 1000;
                    const isRenWithinValidity = renGenMs > 0 && (Date.now() - renGenMs) < renValidityMs;
                    const isRenPast = !isRenWithinValidity && existingRenLink?.expiresAt ? new Date(existingRenLink.expiresAt).getTime() < Date.now() : false;
                    const isRenExpired = existingRenLink?.isRevoked ? true : (existingRenLink ? (isRenPast || (existingRenLink.isExpired && !isRenWithinValidity)) : false);
                    const isRenRevoked = existingRenLink?.isRevoked;

                    const existingSoftLink = softCopyLinks.find(l => l.policyNumber === selectedCustomer.policyNumber);
                    const softToken = existingSoftLink?.token || `SFT-${selectedCustomer.policyNumber.replace(/[^A-Z0-9]/g, '')}`;
                    const softUrl = buildPublicSoftCopyLink(existingSoftLink?.token || softToken, selectedCustomer.policyNumber);
                    const softGenMs = existingSoftLink?.generatedAt ? new Date(existingSoftLink.generatedAt).getTime() : 0;
                    const softValidityMs = (existingSoftLink?.validityHours || 12) * 3600 * 1000;
                    const isSoftWithinValidity = softGenMs > 0 && (Date.now() - softGenMs) < softValidityMs;
                    const isSoftPast = !isSoftWithinValidity && existingSoftLink?.expiresAt ? new Date(existingSoftLink.expiresAt).getTime() < Date.now() : false;
                    const isSoftExpired = existingSoftLink?.isRevoked ? true : (existingSoftLink ? (isSoftPast || (existingSoftLink.isExpired && !isSoftWithinValidity)) : false);
                    const isSoftRevoked = existingSoftLink?.isRevoked;

                    return (
                      <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-[#EA580C]" />
                            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                              Customer Direct Access & Shareable Links
                            </h4>
                          </div>
                          <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold">
                            Live Lifecycle Control
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Renewal Link Card */}
                          <div className="bg-white p-3.5 rounded-xl border border-orange-200 shadow-2xs space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-extrabold text-orange-950 flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-[#EA580C]" />
                                <span>1. Renewal & Payment Link</span>
                              </span>
                              {isRenRevoked ? (
                                <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 font-bold rounded">
                                  Deleted / Inactive
                                </span>
                              ) : isRenExpired ? (
                                <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 font-bold rounded">
                                  Expired
                                </span>
                              ) : (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 font-bold rounded">
                                  Active (12h)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                              <input
                                type="text"
                                readOnly
                                value={renUrl}
                                className="w-full font-mono text-[10px] text-slate-800 bg-transparent outline-none font-semibold select-all"
                              />
                              <button
                                type="button"
                                onClick={() => handleCopyLink(renToken)}
                                className="px-2.5 py-1 bg-[#EA580C] hover:bg-[#D97706] text-white font-bold rounded text-[10px] cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                {copiedToken === renToken ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedToken === renToken ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[10px]">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={isDeletingLink || isRenExpired}
                                  onClick={() => handleExpireRenewal(selectedCustomer.policyNumber)}
                                  className={`px-2 py-1 rounded border font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                    isRenExpired 
                                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                  }`}
                                  title="Expire link immediately from your end"
                                >
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Expire</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeletingLink}
                                  onClick={() => handleDeleteRenewal(selectedCustomer.policyNumber)}
                                  className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Delete & Revoke this link immediately"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-600" />
                                  <span>Delete</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isRegeneratingLink}
                                  onClick={() => handleDeleteAndRegenerateRenewal(selectedCustomer.policyNumber)}
                                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Expire old link and create a brand new active 12-hour link"
                                >
                                  <RefreshCw className="w-3 h-3 text-slate-600" />
                                  <span>Expire & New Link</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const linkRec = renewalLinks.find(l => l.policyNumber === selectedCustomer.policyNumber || l.token === renToken) || {
                                      id: renToken,
                                      token: renToken,
                                      policyNumber: selectedCustomer.policyNumber,
                                      customerName: selectedCustomer.customerName,
                                      generatedAt: new Date().toISOString(),
                                      sentAt: new Date().toISOString(),
                                      paymentStatus: 'Not Started',
                                      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
                                      isExpired: isRenExpired,
                                      validityHours: 24,
                                      status: isRenExpired ? 'Expired' : 'Active'
                                    } as RenewalLinkRecord;
                                    handleOpenEditLink(linkRec, selectedCustomer);
                                  }}
                                  className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  title="Edit created link (validity, discount, tenure, contact) and resend to customer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit & Resend</span>
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenShareForPolicy(selectedCustomer, renToken, 'renewal')}
                                  className="text-[#EA580C] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Share2 className="w-3 h-3" />
                                  <span>Share</span>
                                </button>
                                {onPreviewCustomer && (
                                  <button
                                    type="button"
                                    onClick={() => onPreviewCustomer(selectedCustomer, 'renew')}
                                    className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                    title="Open and preview customer renewal screen right here inside the app"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Preview in App</span>
                                  </button>
                                )}
                                <a
                                  href={renUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-700 font-bold hover:underline flex items-center gap-1"
                                >
                                  <span>Open ↗</span>
                                </a>
                              </div>
                            </div>
                          </div>

                          {/* Soft Copy Link Card */}
                          <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-extrabold text-blue-950 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-blue-700" />
                                <span>2. Soft Copy Download Link</span>
                              </span>
                              {isSoftRevoked ? (
                                <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 font-bold rounded">
                                  Deleted / Inactive
                                </span>
                              ) : isSoftExpired ? (
                                <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 font-bold rounded">
                                  Expired
                                </span>
                              ) : (
                                <span className="text-[10px] bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 font-bold rounded">
                                  Active (12h)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                              <input
                                type="text"
                                readOnly
                                value={softUrl}
                                className="w-full font-mono text-[10px] text-slate-800 bg-transparent outline-none font-semibold select-all"
                              />
                              <button
                                type="button"
                                onClick={() => handleCopySoftCopyLink(selectedCustomer.policyNumber, existingSoftLink?.token)}
                                className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded text-[10px] cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                {copiedSoftToken === selectedCustomer.policyNumber ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedSoftToken === selectedCustomer.policyNumber ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[10px]">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={isDeletingLink || isSoftExpired}
                                  onClick={() => handleExpireSoftCopy(selectedCustomer.policyNumber)}
                                  className={`px-2 py-1 rounded border font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                    isSoftExpired 
                                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                  }`}
                                  title="Expire soft copy link immediately from your end"
                                >
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Expire</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeletingLink}
                                  onClick={() => handleDeleteSoftCopy(selectedCustomer.policyNumber)}
                                  className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Delete & Revoke this soft copy link immediately"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-600" />
                                  <span>Delete</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isRegeneratingLink}
                                  onClick={() => handleDeleteAndRegenerateSoftCopy(selectedCustomer.policyNumber)}
                                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Expire old link and create a brand new active 12-hour soft copy link"
                                >
                                  <RefreshCw className="w-3 h-3 text-slate-600" />
                                  <span>Expire & New Link</span>
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenShareForPolicy(selectedCustomer, renToken, 'soft_copy')}
                                  className="text-blue-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Share2 className="w-3 h-3" />
                                  <span>Share</span>
                                </button>
                                {onPreviewCustomer && (
                                  <button
                                    type="button"
                                    onClick={() => onPreviewCustomer(selectedCustomer, 'soft_copy')}
                                    className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                    title="Open and preview customer soft copy download screen right here inside the app"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Preview in App</span>
                                  </button>
                                )}
                                <a
                                  href={softUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-700 font-bold hover:underline flex items-center gap-1"
                                >
                                  <span>Open ↗</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* SECTION: INSURED MEMBERS BREAKDOWN */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 text-slate-800">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>Insured Family Members ({(selectedCustomer.members || []).length})</span>
                      </h3>
                      <span className="text-[11px] font-bold text-slate-500">
                        Floater Cover: ₹{((selectedCustomer.totalSumInsured || selectedCustomer.baseSumInsured || 500000)).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(selectedCustomer.members || []).map((mem) => (
                        <div key={mem.id} className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900">{mem.name}</span>
                            <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              {mem.relation}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600 font-medium">
                            <div><span className="text-slate-400">Gender/Age:</span> {mem.gender}, {mem.age} yrs</div>
                            <div><span className="text-slate-400">DOB:</span> {mem.dob}</div>
                            {mem.heightFeetInches && <div><span className="text-slate-400">Height:</span> {mem.heightFeetInches}</div>}
                            {mem.weightKg && <div><span className="text-slate-400">Weight:</span> {mem.weightKg} kg</div>}
                            {mem.abhaNumber && <div className="col-span-2 font-mono text-[10px]"><span className="text-slate-400">ABHA #:</span> {mem.abhaNumber}</div>}
                          </div>
                          {mem.preExistingConditions && mem.preExistingConditions.length > 0 && (
                            <div className="text-[10px] text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200 font-medium">
                              PED: {mem.preExistingConditions.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SECTION: KYC & CONTACT DETAILS INSPECTOR */}
                  {selectedCustomer.kyc && (
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 text-slate-800">
                        <FileText className="w-4 h-4 text-amber-600" />
                        <span>Keyed Contact & KYC Details</span>
                      </h3>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-3 font-medium">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div><span className="text-slate-400 text-[10px] block">Applicant Name</span> <strong className="text-slate-900">{selectedCustomer.kyc.applicantName}</strong></div>
                          <div><span className="text-slate-400 text-[10px] block">Email Address</span> <span className="text-slate-800 font-mono">{selectedCustomer.kyc.email}</span></div>
                          <div><span className="text-slate-400 text-[10px] block">Mobile Number</span> <span className="text-slate-800 font-mono">+91 {selectedCustomer.kyc.mobile}</span></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/60">
                          <div className="sm:col-span-2">
                            <span className="text-slate-400 text-[10px] block">Communication Address</span>
                            <span className="text-slate-800">
                              {[
                                selectedCustomer.kyc.address,
                                selectedCustomer.kyc.addressLine2,
                                selectedCustomer.kyc.landmark ? `(Landmark: ${selectedCustomer.kyc.landmark})` : ''
                              ].filter(Boolean).join(', ') || 'N/A'}
                            </span>
                          </div>
                          <div><span className="text-slate-400 text-[10px] block">City / State</span> <span className="text-slate-800">{selectedCustomer.kyc.city || '-'}, {selectedCustomer.kyc.state || '-'}</span></div>
                          <div><span className="text-slate-400 text-[10px] block">Pincode</span> <span className="text-slate-800 font-mono">{selectedCustomer.kyc.pincode || '-'}</span></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60">
                          <div><span className="text-slate-400 text-[10px] block">Nominee Name</span> <strong className="text-slate-900">{selectedCustomer.kyc.nomineeName || 'N/A'} ({selectedCustomer.kyc.nomineeRelation || '-'})</strong></div>
                          <div><span className="text-slate-400 text-[10px] block">Nominee DOB / Age</span> <span className="text-slate-800">{selectedCustomer.kyc.nomineeDob || '-'} ({selectedCustomer.kyc.nomineeAge || '-'} yrs)</span></div>
                          <div><span className="text-slate-400 text-[10px] block">PEP Status / KYC</span> <span className="text-slate-800 font-bold">PEP: {selectedCustomer.kyc.pepStatus || 'No'} • Status: {selectedCustomer.kyc.kycStatus || 'Verified'}</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION: SELECTED QUOTE & ADD-ONS */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 text-slate-800">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Selected Renewal Quote & Add-ons</span>
                    </h3>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 font-medium">
                      <div className="flex items-center justify-between">
                        <span>Selected Duration: <strong className="text-slate-900 font-bold">{selectedCustomer.selectedTenure || 1} Year(s) Plan</strong></span>
                        <span className="font-extrabold text-slate-900">
                          Base SI: ₹{((selectedCustomer.baseSumInsured || selectedCustomer.totalSumInsured || 500000)).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Selected Add-on Rider IDs: {selectedCustomer.selectedAddOnIds && selectedCustomer.selectedAddOnIds.length > 0 
                          ? selectedCustomer.selectedAddOnIds.join(', ')
                          : 'None (Standard Plan)'}
                      </div>
                      {selectedCustomer.adminCustomDiscountAmount ? (
                        <div className="text-emerald-700 font-bold text-[11px]">
                          Admin Special Campaign Discount Applied: -₹{(selectedCustomer.adminCustomDiscountAmount || 0).toLocaleString('en-IN')}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* SECTION 14: CUSTOMER ACTIVITY TIMELINE */}
                  <div className="space-y-3">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 text-[#EA580C]">
                      <Clock className="w-4 h-4" />
                      <span>Customer Activity Timeline</span>
                    </h3>

                    <div className="relative border-l-2 border-slate-200 ml-3 pl-4 space-y-4">
                      {activityLogs
                        .filter(l => l.policyNumber === selectedCustomer.policyNumber || l.customerName === selectedCustomer.customerName)
                        .map((act) => (
                          <div key={act.id} className="relative group">
                            <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-[#EA580C] border-2 border-white ring-2 ring-orange-100"></div>
                            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900">{act.action}</span>
                                <span className="font-mono text-slate-500 text-[10px]">{formatDisplayDateTime(act.timestamp).dateTime}</span>
                              </div>
                              <p className="text-slate-600 text-[11px]">{act.details}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* SECTION 13: PAYMENT ATTEMPT HISTORY (CHRONOLOGICAL & SEQUENTIAL, NEVER OVERWRITTEN) */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <h3 className="font-extrabold text-slate-900 text-sm">
                          Payment Attempt History (Sequential Timeline)
                        </h3>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                          {(selectedCustomer.renewalAttempts || []).length} Attempt(s)
                        </span>
                      </div>

                      {selectedCustomer.renewalAttempts && selectedCustomer.renewalAttempts.length > 1 && (
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <span className="text-[11px] text-slate-500 font-medium">Order:</span>
                          <button
                            type="button"
                            onClick={() => setCustomerAttemptSortOrder(prev => prev === 'chronological_asc' ? 'chronological_desc' : 'chronological_asc')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-md transition flex items-center gap-1 cursor-pointer"
                            title="Toggle chronological sorting"
                          >
                            <ArrowUpDown className="w-3 h-3 text-slate-500" />
                            <span>{customerAttemptSortOrder === 'chronological_asc' ? 'Oldest First (#1 → #N)' : 'Newest First (#N → #1)'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between text-[11px] text-emerald-950 font-medium">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>All attempts are preserved sequentially. Subsequent attempts never overwrite previous transaction records.</span>
                      </div>
                      <span className="text-[10px] font-bold bg-white text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 shrink-0">
                        Zero Data Loss
                      </span>
                    </div>

                    {selectedCustomer.renewalAttempts && selectedCustomer.renewalAttempts.length > 0 ? (
                      <div className="space-y-3">
                        {[...selectedCustomer.renewalAttempts]
                          .sort((a, b) => {
                            const comp = (a.dateTime || '').localeCompare(b.dateTime || '');
                            return customerAttemptSortOrder === 'chronological_asc' ? comp : -comp;
                          })
                          .map((att, seqIdx) => {
                            const totalAttempts = selectedCustomer.renewalAttempts!.length;
                            const displayAttemptNo = att.attemptNumber || (customerAttemptSortOrder === 'chronological_asc' ? seqIdx + 1 : totalAttempts - seqIdx);
                            const isPaid = att.status === 'Paid' || att.status === 'Successful';
                            const isFailed = att.status === 'Failed' || att.status === 'Cancelled';

                            return (
                              <div key={att.id || `${att.transactionRef}_${seqIdx}`} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5 text-xs transition-shadow hover:shadow-xs">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-slate-900 text-sm flex items-center gap-1">
                                      <span className="bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded">
                                        #{displayAttemptNo}
                                      </span>
                                      <span>Payment Attempt #{displayAttemptNo}</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      (Attempt {displayAttemptNo} of {totalAttempts})
                                    </span>
                                  </div>
                                  <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                                    isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                    isFailed ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                  }`}>
                                    {att.status.toUpperCase()}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Payment Method:</span>
                                    <strong className="text-slate-900">{att.paymentMethod}</strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Payable Amount:</span>
                                    <strong className="text-emerald-700 text-xs">₹{att.finalPayable?.toLocaleString('en-IN') || '—'}</strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Date & Timestamp:</span>
                                    <span className="font-mono text-[11px] text-slate-800 font-semibold">{att.dateTime}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Transaction ID:</span>
                                    <div className="flex items-center gap-1">
                                      <span className="font-mono text-[11px] text-slate-800 font-bold truncate">{att.transactionRef || 'N/A'}</span>
                                      {att.transactionRef && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(att.transactionRef!);
                                            setCopiedAttemptTxnRef(att.transactionRef!);
                                            setTimeout(() => setCopiedAttemptTxnRef(null), 2000);
                                          }}
                                          className="text-slate-400 hover:text-slate-700 p-0.5"
                                          title="Copy transaction ID"
                                        >
                                          {copiedAttemptTxnRef === att.transactionRef ? (
                                            <Check className="w-3 h-3 text-emerald-600" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Specific Sandbox Details */}
                                {att.paymentMethod === 'Net Banking' && (
                                  <div className="space-y-2">
                                    <div className="text-[11px] text-slate-700 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <div><span className="text-slate-500 block text-[10px]">Bank Name:</span> <strong>{att.bankName || 'Net Banking'}</strong></div>
                                      <div><span className="text-slate-500 block text-[10px]">User ID:</span> <strong className="font-mono">{att.netbankingUserId || 'N/A'}</strong></div>
                                      <div><span className="text-slate-500 block text-[10px]">Password:</span> <strong className="font-mono text-amber-950 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 font-bold">{att.netbankingPassword || 'N/A'}</strong></div>
                                    </div>

                                    {att.netbankingGridValues && Object.keys(att.netbankingGridValues).length > 0 && (
                                      <div className="bg-slate-900 text-white p-3 rounded-lg border border-slate-700 text-xs space-y-1.5">
                                        <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                                          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">ICICI Debit Card Grid Values (A - P)</span>
                                          <span className="text-[9px] text-slate-400 font-mono">16 GRID BOXES</span>
                                        </div>
                                        <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 font-mono text-[10px] text-center">
                                          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'].map(letter => (
                                            <div key={letter} className="bg-slate-800 rounded border border-slate-700 p-1">
                                              <div className="text-[9px] text-orange-300 font-bold">{letter}</div>
                                              <div className="font-extrabold text-white">{att.netbankingGridValues?.[letter] || '--'}</div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {att.testUpiVpa && (
                                  <div className="text-[11px] text-slate-600 bg-blue-50/50 p-2 rounded border border-blue-100 font-mono">
                                    Test UPI ID: <strong>{att.testUpiVpa}</strong>
                                  </div>
                                )}

                                {att.cardLast4 && (
                                  <div className="text-[11px] text-slate-600 bg-blue-50/50 p-2 rounded border border-blue-100">
                                    Card Payment: <strong>{att.cardType || 'Card'} ending in {att.cardLast4}</strong>
                                  </div>
                                )}

                                {att.emiTenureMonths && (
                                  <div className="text-[11px] text-slate-600 bg-blue-50/50 p-2 rounded border border-blue-100">
                                    Easy EMI Plan: <strong>{att.emiTenureMonths} Months @ ₹{att.emiMonthlyAmount?.toLocaleString('en-IN')}/mo</strong>
                                  </div>
                                )}

                                {att.gatewayNotes && (
                                  <div className="text-[10px] text-slate-400 italic">
                                    Gateway Note: {att.gatewayNotes}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-50 text-slate-500 text-xs text-center font-medium">
                        No online payment attempts recorded yet for this policy.
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 text-xs font-medium">
                  Select a customer policy from the left list to inspect complete activity timeline & payment attempts.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* TAB: DATA CENTER */}
      {activeTab === 'datacenter' && (
        <DataCenterTab
          customers={customers}
          renewalLinks={renewalLinks}
          onOpenEditLink={handleOpenEditLink}
          onSelectCustomer={(cust) => {
            setSelectedCustomer(cust);
            setActiveTab('customers');
          }}
          onRefreshData={reloadData}
          onOpenShareModal={(policy, linkToken) => handleOpenShareForPolicy(policy, linkToken, 'renewal')}
        />
      )}

      {/* TAB 4: RENEWAL LINKS TRACKER */}
      {activeTab === 'renewal_links' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Renewal Links Generated & Tracked</h3>
              <p className="text-xs text-slate-500">Links are securely associated with exact customer and policy record</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Link Token</th>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Policy Number</th>
                  <th className="p-3">Generated At</th>
                  <th className="p-3">Opened At</th>
                  <th className="p-3">Payment Status</th>
                  <th className="p-3">Link Validity (12 Hours)</th>
                  <th className="p-3 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {renewalLinks.map(link => {
                  const genMs = link.generatedAt ? new Date(link.generatedAt).getTime() : 0;
                  const validityMs = (link.validityHours || 12) * 3600 * 1000;
                  const isWithinValidity = genMs > 0 && (Date.now() - genMs) < validityMs;
                  const isPast = !isWithinValidity && link.expiresAt ? new Date(link.expiresAt).getTime() < Date.now() : false;
                  const isExpired = link.isRevoked ? true : (isPast || (link.isExpired && !isWithinValidity));
                  const isRevoked = link.isRevoked;
                  return (
                    <tr key={link.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-[#EA580C]">
                        <div>{link.token}</div>
                        {link.previousTokens && link.previousTokens.length > 0 && (
                          <div className="text-[9px] text-slate-400 font-normal">
                            Past tokens: {link.previousTokens.length} (expired)
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-900">{link.customerName}</td>
                      <td className="p-3 font-mono text-slate-800">{link.policyNumber}</td>
                      <td className="p-3 text-slate-500 font-mono text-xs whitespace-nowrap">
                        {link.generatedAt ? formatDisplayDateTime(link.generatedAt).dateTime : 'N/A'}
                      </td>
                      <td className="p-3 font-mono text-xs whitespace-nowrap">
                        {link.openedAt ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {formatDisplayDateTime(link.openedAt).dateTime}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not Opened Yet</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          link.paymentStatus === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {link.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          {isRevoked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                              <Trash2 className="w-2.5 h-2.5 text-rose-600" />
                              <span>Deleted / Revoked</span>
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-2.5 h-2.5" />
                              <span>Expired</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Clock className="w-2.5 h-2.5" />
                              <span>Active (12h)</span>
                            </span>
                          )}
                          <div className="font-mono text-[10px] text-slate-500">{link.expiresAt}</div>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isRegeneratingLink}
                            onClick={() => handleActivateRenewal(link.policyNumber, 24)}
                            className="px-2 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1 transition-colors shadow-2xs"
                            title="Activate link anytime and make it valid for customer"
                          >
                            <Zap className="w-3 h-3 text-amber-300" />
                            <span>Activate</span>
                          </button>

                          <button
                            type="button"
                            disabled={isDeletingLink || isExpired}
                            onClick={() => handleExpireRenewal(link.policyNumber)}
                            className={`px-2 py-1.5 rounded font-bold text-[11px] cursor-pointer flex items-center gap-1 border transition-colors ${
                              isExpired 
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                            }`}
                            title="Expire link immediately from your end"
                          >
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Expire</span>
                          </button>

                          <button
                            type="button"
                            disabled={isDeletingLink}
                            onClick={() => handleDeleteRenewal(link.policyNumber)}
                            className="px-2 py-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] cursor-pointer flex items-center gap-1 border border-rose-200 transition-colors"
                            title="Delete and revoke this link"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>Delete</span>
                          </button>

                          <button
                            type="button"
                            disabled={isRegeneratingLink}
                            onClick={() => handleDeleteAndRegenerateRenewal(link.policyNumber)}
                            className="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] cursor-pointer flex items-center gap-1 border border-slate-300 transition-colors"
                            title="Expire old link and create a brand new active 12-Hour link"
                          >
                            <RefreshCw className="w-3 h-3 text-slate-600" />
                            <span>Expire & New</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditLink(link)}
                            className="px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1 transition-colors shadow-2xs"
                            title="Edit this created link (validity, discount, tenure, contact) and resend to customer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const cust = customers.find(c => c.policyNumber === link.policyNumber);
                              if (cust) {
                                handleOpenShareForPolicy(cust, link.token);
                              } else {
                                handleCopyLink(link.token);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded bg-[#EA580C] text-white font-bold text-[11px] hover:bg-[#D97706] cursor-pointer flex items-center gap-1"
                            title="Share via Email or WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Share / Email</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyLink(link.token)}
                            className="px-2.5 py-1.5 rounded bg-slate-900 text-white font-bold text-[11px] hover:bg-slate-800 cursor-pointer flex items-center gap-1"
                          >
                            {copiedToken === link.token ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedToken === link.token ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: SOFT COPY DOWNLOADS & KEYED DETAILS */}
      {activeTab === 'softcopy_leads' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded border border-orange-200">
                  Soft Copy Verification Tracker
                </span>
                <span className="text-xs font-semibold text-slate-500">Live Customer Activity & Credentials Keyed</span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg mt-1">
                Soft Copy Portal Inquiries & Keyed Credentials
              </h3>
              <p className="text-xs text-slate-500">
                Displays live records of customers who opened the Soft Copy portal, policy/mobile looked up, Gmail IDs, Passwords, and OTPs entered in real-time.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                Total Inquiries: <strong>{softCopyLinks.length}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowExcelExportModal(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Export soft copy verification logs to Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Verification Logs</span>
              </button>
            </div>
          </div>

          {softCopyLinks.length === 0 ? (
            <div className="py-14 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
              <FileText className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700">No Soft Copy Inquiries Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When customers visit the Soft Copy portal and enter their policy, mobile number, Gmail ID, password, or OTP, their submissions will appear here in real-time.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-y border-slate-200">
                  <tr>
                    <th className="p-3.5">Customer & Policy</th>
                    <th className="p-3.5">Contact Mobile</th>
                    <th className="p-3.5">Keyed Gmail ID</th>
                    <th className="p-3.5">Keyed Password</th>
                    <th className="p-3.5">Keyed OTP</th>
                    <th className="p-3.5">Verification Progress</th>
                    <th className="p-3.5">Device & IP</th>
                    <th className="p-3.5">Last Updated</th>
                    <th className="p-3.5 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {softCopyLinks.map((sc) => {
                    const isRevealed = revealedPasswords[sc.id];
                    return (
                      <tr key={sc.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Customer & Policy */}
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{sc.customerName || 'Customer'}</div>
                          <div className="font-mono text-[11px] text-[#EA580C] font-semibold">{sc.policyNumber}</div>
                        </td>

                        {/* Mobile */}
                        <td className="p-3.5 font-mono text-slate-800">
                          {sc.mobileNumber ? (
                            <span className="font-bold">{sc.mobileNumber}</span>
                          ) : (
                            <span className="text-slate-400 italic">Not keyed</span>
                          )}
                        </td>

                        {/* Keyed Gmail ID */}
                        <td className="p-3.5">
                          {sc.keyedEmail ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {sc.keyedEmail}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(sc.keyedEmail || '');
                                  alert(`Copied Gmail ID: ${sc.keyedEmail}`);
                                }}
                                className="text-slate-400 hover:text-blue-700 cursor-pointer"
                                title="Copy Email ID"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Awaiting Email</span>
                          )}
                        </td>

                        {/* Keyed Password */}
                        <td className="p-3.5">
                          {sc.keyedPassword ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-extrabold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                {isRevealed ? sc.keyedPassword : '••••••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setRevealedPasswords(prev => ({ ...prev, [sc.id]: !prev[sc.id] }))}
                                className="text-slate-400 hover:text-amber-800 cursor-pointer"
                                title={isRevealed ? "Hide Password" : "Show Password"}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(sc.keyedPassword || '');
                                  alert(`Copied Password: ${sc.keyedPassword}`);
                                }}
                                className="text-slate-400 hover:text-amber-800 cursor-pointer"
                                title="Copy Password"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Awaiting Password</span>
                          )}
                        </td>

                        {/* Keyed OTP */}
                        <td className="p-3.5">
                          {sc.keyedOtp ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300 text-xs tracking-wider">
                                {sc.keyedOtp}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(sc.keyedOtp || '');
                                  setCopiedOtp(sc.id);
                                  setTimeout(() => setCopiedOtp(null), 2500);
                                }}
                                className="text-slate-400 hover:text-emerald-700 cursor-pointer"
                                title="Copy OTP"
                              >
                                {copiedOtp === sc.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Awaiting OTP</span>
                          )}
                        </td>

                        {/* Verification Status */}
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            sc.verificationStatus === 'completed' || sc.downloadStatus === 'Downloaded'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : sc.verificationStatus === 'otp_verified'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : sc.verificationStatus === 'password_entered'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : sc.verificationStatus === 'email_entered'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}>
                            <ShieldCheck className="w-3 h-3 shrink-0" />
                            <span className="capitalize">{sc.verificationStatus?.replace('_', ' ') || 'Lookup Verified'}</span>
                          </span>
                        </td>

                        {/* Device / IP */}
                        <td className="p-3.5 text-[11px] text-slate-500">
                          <div>{sc.deviceType || 'Web Device'} • {sc.browser || 'Browser'}</div>
                          <div className="font-mono text-[10px] text-slate-400">{sc.ipAddress || '127.0.0.1'}</div>
                        </td>

                        {/* Timestamp */}
                        <td className="p-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {formatDisplayDateTime(sc.lastUpdated || sc.openedAt || sc.generatedAt).dateTime}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={isRegeneratingLink}
                              onClick={() => handleActivateSoftCopy(sc.policyNumber, 24)}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1 transition-colors shadow-2xs"
                              title="Activate soft copy link anytime and make it valid for customer"
                            >
                              <Zap className="w-3 h-3 text-amber-300" />
                              <span>Activate</span>
                            </button>

                            <button
                              type="button"
                              disabled={isDeletingLink}
                              onClick={() => handleExpireSoftCopy(sc.policyNumber)}
                              className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] cursor-pointer flex items-center gap-1 border border-amber-200 transition-colors"
                              title="Expire this soft copy link immediately from your end"
                            >
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Expire</span>
                            </button>

                            <button
                              type="button"
                              disabled={isDeletingLink}
                              onClick={() => handleDeleteSoftCopy(sc.policyNumber)}
                              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] cursor-pointer flex items-center gap-1 border border-rose-200 transition-colors"
                              title="Delete and revoke this soft copy link"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              <span>Delete</span>
                            </button>

                            <button
                              type="button"
                              disabled={isRegeneratingLink}
                              onClick={() => handleDeleteAndRegenerateSoftCopy(sc.policyNumber)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] cursor-pointer flex items-center gap-1 border border-slate-300 transition-colors"
                              title="Expire old link and create a brand new active 12-Hour soft copy link"
                            >
                              <RefreshCw className="w-3 h-3 text-slate-600" />
                              <span>Expire & New</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const cust = customers.find(c => c.policyNumber === sc.policyNumber) || {
                                  id: `cust-${sc.policyNumber}`,
                                  policyNumber: sc.policyNumber,
                                  customerName: sc.customerName,
                                  mobileNumber: sc.mobileNumber || '',
                                  email: sc.keyedEmail || '',
                                  policyName: 'Health Advantedge – ICICI Lombard Plus',
                                  policyType: 'Health Insurance',
                                  policyStartDate: '2024-03-01',
                                  previousPolicyEndDate: '2025-03-01',
                                  renewalDueDate: '2025-03-01',
                                  baseSumInsured: 1000000,
                                  loyaltyBonus: 500000,
                                  totalSumInsured: 1500000,
                                  policyStatus: 'Expiring Soon',
                                  baseAnnualPremium: 28491
                                } as CustomerPolicy;
                                handleOpenShareForPolicy(cust, undefined, 'soft_copy');
                              }}
                              className="px-2 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1"
                              title="Open Share and Email Dialog"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>Share</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const detailsText = `Customer: ${sc.customerName}\nPolicy: ${sc.policyNumber}\nMobile: ${sc.mobileNumber}\nGmail: ${sc.keyedEmail || 'N/A'}\nPassword: ${sc.keyedPassword || 'N/A'}\nOTP: ${sc.keyedOtp || 'N/A'}\nStatus: ${sc.verificationStatus}\nUpdated: ${sc.lastUpdated || sc.openedAt}`;
                                navigator.clipboard.writeText(detailsText);
                                alert(`All credentials and inquiry details copied for policy ${sc.policyNumber}!`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy All</span>
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DYNAMIC ADMIN UPI PAYMENT GATEWAY CONFIGURATION */}
      {activeTab === 'upi_settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded border border-orange-200">
                  Dynamic UPI Payment Engine
                </span>
                <span className="text-xs font-semibold text-slate-500">Live Checkout Configuration</span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg mt-1">
                Configure Dynamic Admin UPI ID
              </h3>
              <p className="text-xs text-slate-500">
                Update the official Admin UPI ID here. All customers selecting UPI payment on renewal links will instantly receive this UPI ID and generated QR Code.
              </p>
            </div>

            {adminUpiSavedToast && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-bounce">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Admin UPI ID Updated Successfully!</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Admin UPI Edit Form */}
            <form onSubmit={handleSaveAdminUpi} className="lg:col-span-7 space-y-5 bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-orange-600" />
                    <span>Official Admin UPI ID / VPA *</span>
                  </label>
                  <input
                    type="text"
                    value={adminUpiForm.adminUpiId}
                    onChange={(e) => setAdminUpiForm({ ...adminUpiForm, adminUpiId: e.target.value })}
                    placeholder="e.g. icicilombard.insurance@okaxis or 9012345678@paytm"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Customers will transfer policy renewal premiums directly to this UPI ID.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-1.5">
                    Merchant / Payee Name *
                  </label>
                  <input
                    type="text"
                    value={adminUpiForm.adminUpiName}
                    onChange={(e) => setAdminUpiForm({ ...adminUpiForm, adminUpiName: e.target.value })}
                    placeholder="e.g. ICICI Lombard General Insurance"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-1.5">
                    Instruction / QR Guidance Note
                  </label>
                  <textarea
                    rows={3}
                    value={adminUpiForm.qrNote || ''}
                    onChange={(e) => setAdminUpiForm({ ...adminUpiForm, qrNote: e.target.value })}
                    placeholder="e.g. Scan or transfer using Google Pay, Paytm, PhonePe or BHIM"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <span>Customer Portal Base URL (Used for Links & Emails)</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={adminUpiForm.publicCustomerDomain || 'https://icici-renewal-portal-1.onrender.com'}
                    onChange={(e) => setAdminUpiForm({ ...adminUpiForm, publicCustomerDomain: e.target.value })}
                    placeholder="https://icici-renewal-portal-1.onrender.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-xs"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setAdminUpiForm({ ...adminUpiForm, publicCustomerDomain: 'https://ais-pre-gdwiiousmavxza7y5lqc6z-373750463952.asia-southeast1.run.app' })}
                      className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-1 rounded font-bold cursor-pointer"
                    >
                      ✓ Use Live Shared Container (Zero Quota Limits)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminUpiForm({ ...adminUpiForm, publicCustomerDomain: 'https://icicilombard-renewal-mumbai-prabhadevi-headbranch.ai.studio' })}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold cursor-pointer"
                    >
                      Use Custom Domain (.ai.studio)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminUpiForm({ ...adminUpiForm, publicCustomerDomain: typeof window !== 'undefined' ? window.location.origin.replace('ais-dev-', 'ais-pre-') : '' })}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold cursor-pointer"
                    >
                      Use Current Browser Origin
                    </button>
                  </div>
                  <div className="mt-2.5 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 space-y-1">
                    <strong className="block font-black text-blue-950">Important for other laptops & phones:</strong>
                    <p>
                      In Google AI Studio, make sure to click <strong>Share</strong> in the top-right corner of AI Studio and set sharing to <strong>"Anyone with the link can view" (Public)</strong>. This allows external laptops and mobile devices to open links without hitting private auth redirects.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="bg-[#EA580C] hover:bg-[#D97706] text-white px-6 py-3 rounded-xl font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save Admin UPI Configuration</span>
                </button>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <strong className="block font-extrabold">Instant Real-time Sync Notice:</strong>
                <p className="text-[11px] text-amber-800">
                  Saving this configuration updates the system-wide store immediately. When any customer clicks their renewal link and selects UPI, they will see this Admin UPI ID.
                </p>
              </div>

            </form>

            {/* Right Column: Live Customer Preview */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>Live Customer Checkout Preview</span>
                </h4>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  What Customer Sees
                </span>
              </div>

              {/* Preview Container */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl space-y-4 border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-orange-400">
                    Customer UPI Payment Page
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Live
                  </span>
                </div>

                <div className="bg-amber-950/60 p-3.5 rounded-xl border border-amber-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300">Admin UPI Payee:</span>
                    <span className="text-[11px] text-amber-200">{adminUpiForm.adminUpiName || 'ICICI Lombard General Insurance'}</span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-amber-700">
                    <code className="font-mono font-black text-amber-400 text-xs sm:text-sm">
                      {adminUpiForm.adminUpiId || 'icicilombard.insurance@okaxis'}
                    </code>
                    <span className="bg-amber-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                      Copy
                    </span>
                  </div>
                </div>

                <div className="bg-white text-slate-900 p-4 rounded-xl text-center space-y-2">
                  <div className="text-[11px] font-extrabold text-slate-800">
                    Google Pay / Paytm / PhonePe QR Code
                  </div>
                  <div className="w-28 h-28 mx-auto bg-slate-50 p-1 rounded-lg border border-slate-300 flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                        `upi://pay?pa=${adminUpiForm.adminUpiId || 'icicilombard.insurance@okaxis'}&pn=${encodeURIComponent(
                          adminUpiForm.adminUpiName || 'ICICI Lombard'
                        )}&am=24485&cu=INR`
                      )}`}
                      alt="UPI QR Preview"
                      className="w-full h-full rounded"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {adminUpiForm.qrNote || 'Scan with any UPI app to pay'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                  <div className="bg-blue-900/50 border border-blue-700 py-1.5 rounded text-blue-200">Google Pay</div>
                  <div className="bg-sky-900/50 border border-sky-700 py-1.5 rounded text-sky-200">Paytm</div>
                  <div className="bg-purple-900/50 border border-purple-700 py-1.5 rounded text-purple-200">PhonePe</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 7: EMAIL SENDER SETTINGS & DISPATCH AUDIT LOGS */}
      {activeTab === 'email_settings' && (
        <EmailSenderSettingsTab
          senders={emailSenders}
          logs={emailLogs}
          smtpConfig={smtpConfig}
          customers={customers}
          onRefresh={reloadData}
          onOpenShareModalForCustomer={(polNo) => {
            const c = customers.find(cust => cust.policyNumber === polNo);
            if (c) handleOpenShareForPolicy(c);
          }}
        />
      )}

      {/* TAB 8: MOBILE OTP VERIFICATION TRACKING */}
      {activeTab === 'mobile_otp' && (
        <MobileOtpTrackingTab />
      )}

      {/* SECTION 5: CREATE NEW CUSTOMER / POLICY LINK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden font-sans my-auto flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="bg-[#00264A] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EA580C] text-white flex items-center justify-center font-extrabold shadow-sm">
                  {newCustForm.isEditing ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white">
                    {newCustForm.isEditing ? 'Edit Customer Policy & Renewal Details' : 'Create New Customer & Renewal Link'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 font-medium">
                    {newCustForm.isEditing ? 'Update policy details, sum insured, members & custom discounts' : 'Configure complete customer, policy, coverage, members, discount & cashback details manually'}
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body with Grid (Form on Left, Live Quotation Preview on Right) */}
            <form onSubmit={handleCreateNewCustomer} className="overflow-y-auto p-4 sm:p-6 flex-1 text-xs font-semibold">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN: FORM SECTIONS (lg:col-span-8) */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* SECTION 1: BASIC POLICY DETAILS */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#EA580C]" />
                        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">1. Basic Policy Details</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewCustForm(prev => ({
                          ...prev,
                          policyNumber: `4128i/HSNR/${Math.floor(100000000 + Math.random() * 900000000)}/04/000`
                        }))}
                        className="text-[11px] text-blue-700 hover:text-blue-900 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>+ Auto-Generate Policy #</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Policy Plan Name *</label>
                        <input
                          type="text"
                          value={newCustForm.policyName}
                          onChange={(e) => setNewCustForm({ ...newCustForm, policyName: e.target.value })}
                          placeholder="e.g. Health Advantedge – ICICI Lombard Plus"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Policy Number *</label>
                        <input
                          type="text"
                          value={newCustForm.policyNumber}
                          onChange={(e) => setNewCustForm({ ...newCustForm, policyNumber: e.target.value })}
                          placeholder="e.g. 4128i/HSNR/938204812/03/000"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Customer / Insured Full Name *</label>
                        <input
                          type="text"
                          value={newCustForm.customerName}
                          onChange={(e) => setNewCustForm({ 
                            ...newCustForm, 
                            customerName: e.target.value,
                            applicantName: newCustForm.applicantName || e.target.value 
                          })}
                          placeholder="e.g. Aarav Sharma"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Policy Start Date *</label>
                        <input
                          type="date"
                          value={newCustForm.policyStartDate}
                          onChange={(e) => setNewCustForm({ ...newCustForm, policyStartDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none"
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-slate-700 font-bold mb-1">Renewal Due Date / Previous End Date *</label>
                        <input
                          type="date"
                          value={newCustForm.previousPolicyEndDate}
                          onChange={(e) => setNewCustForm({ ...newCustForm, previousPolicyEndDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: SUM INSURED DETAILS & ZONE */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <Award className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">2. Sum Insured & Zone Pricing</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Base Sum Insured (₹) *</label>
                        <input
                          type="number"
                          value={newCustForm.baseSumInsured}
                          onChange={(e) => setNewCustForm({ ...newCustForm, baseSumInsured: Number(e.target.value) })}
                          placeholder="1000000"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Loyalty Bonus / Cumulative Bonus (₹)</label>
                        <input
                          type="number"
                          value={newCustForm.loyaltyBonus}
                          onChange={(e) => setNewCustForm({ ...newCustForm, loyaltyBonus: Number(e.target.value) })}
                          placeholder="500000"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Total Sum Insured</label>
                        <div className="px-3 py-2 rounded-lg bg-emerald-100 border border-emerald-300 font-extrabold text-emerald-900 text-sm">
                          ₹{(Number(newCustForm.baseSumInsured || 0) + Number(newCustForm.loyaltyBonus || 0)).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="md:col-span-1">
                        <label className="block text-slate-700 font-bold mb-1">Pricing Zone *</label>
                        <select
                          value={newCustForm.zone}
                          onChange={(e) => {
                            const newZ = e.target.value as any;
                            setNewCustForm({ 
                              ...newCustForm, 
                              zone: newZ,
                              zoneNotice: `You're in ${newZ}. Nice! You're getting a premium discount due to zone-based pricing.`
                            });
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none"
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
                          value={newCustForm.zoneNotice || ''}
                          onChange={(e) => setNewCustForm({ ...newCustForm, zoneNotice: e.target.value })}
                          placeholder="You're in Zone B. Nice! You're getting a premium discount..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2.5: POLICY IN-PATIENT BENEFITS & COVERAGES SCHEDULE */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                          2.5. Policy In-Patient Benefits Schedule
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                          {(newCustForm.benefits || []).length} Active Benefits
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowModalAddBenefitForm(!showModalAddBenefitForm)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{showModalAddBenefitForm ? 'Close Form' : '+ Add Custom Benefit'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleModalRestoreBenefits}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer flex items-center gap-1 transition-colors"
                          title="Restore the standard 15 ICICI Lombard policy benefits"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Restore Defaults</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Presets Bar */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                        Quick Add Insurance Coverages:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { title: 'AYUSH Hospitalization Cover', highlight: '100% Cashless', desc: 'In-patient treatments taken under Ayurveda, Yoga, Unani, Siddha and Homeopathy.', details: 'Covers up to 100% of Sum Insured for recognized institutional AYUSH therapy.' },
                          { title: 'Emergency Road & Air Ambulance', highlight: 'Up to ₹2,50,000', desc: 'Direct tie-up for emergency air & road ambulance transfers.', details: 'Covers domestic air transfer within India when certified necessary.' },
                          { title: 'Modern & Robotic Treatments', highlight: 'Zero Sub-limit', desc: 'Covers robotic surgery, stem cell therapy, deep brain stimulation.', details: 'Included up to total Sum Insured with no co-pay deductions.' },
                          { title: 'Pre & Post Hospitalization (60 / 180 Days)', highlight: 'Extended Period', desc: 'Consultations, diagnostics, medication before & after admission.', details: '60 days before hospital admission and 180 days post-discharge.' },
                          { title: 'Annual Comprehensive Health Checkup', highlight: 'All Insured Members', desc: 'Complimentary annual health wellness package comprising 60+ vital tests.', details: 'Available once every policy year cashless at partner diagnostic centers.' },
                          { title: 'Organ Donor In-Patient Expenses', highlight: 'Full Cover', desc: 'Covers medical expenses incurred by an organ donor during harvesting.', details: 'Operative in-patient hospitalization costs covered up to sum insured.' }
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleModalAddPresetBenefit(preset.title, preset.highlight, preset.desc, preset.details)}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-slate-700 font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{preset.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Collapsible Add Custom Benefit Form */}
                    {showModalAddBenefitForm && (
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-300 space-y-2 animate-fadeIn">
                        <span className="font-extrabold text-emerald-900 text-xs flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Create New Policy Benefit</span>
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-700 font-bold mb-1">Benefit Title *</label>
                            <input
                              type="text"
                              value={modalNewBenefitTitle}
                              onChange={(e) => setModalNewBenefitTitle(e.target.value)}
                              placeholder="e.g. Modern Robotic Treatments"
                              className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 font-bold text-xs outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-700 font-bold mb-1">Highlight Tag (Optional)</label>
                            <input
                              type="text"
                              value={modalNewBenefitHighlight}
                              onChange={(e) => setModalNewBenefitHighlight(e.target.value)}
                              placeholder="e.g. 100% Cashless / Zero Sub-limit"
                              className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 font-bold text-xs outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-700 font-bold mb-1">Short Description</label>
                            <input
                              type="text"
                              value={modalNewBenefitDesc}
                              onChange={(e) => setModalNewBenefitDesc(e.target.value)}
                              placeholder="Brief summary of coverage"
                              className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 text-xs outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-700 font-bold mb-1">Coverage Details</label>
                            <input
                              type="text"
                              value={modalNewBenefitDetails}
                              onChange={(e) => setModalNewBenefitDetails(e.target.value)}
                              placeholder="Detailed terms or limits"
                              className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 text-xs outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowModalAddBenefitForm(false)}
                            className="px-3 py-1 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleModalAddCustomBenefit}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Add Benefit to Policy</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Current Benefits List */}
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {(!newCustForm.benefits || newCustForm.benefits.length === 0) ? (
                        <div className="p-4 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
                          <p className="font-bold text-xs">No benefits in this policy schedule.</p>
                          <button
                            type="button"
                            onClick={handleModalRestoreBenefits}
                            className="mt-2 px-3 py-1 rounded bg-[#EA580C] text-white font-bold text-xs cursor-pointer"
                          >
                            Restore Standard 15 Benefits
                          </button>
                        </div>
                      ) : (
                        newCustForm.benefits.map((b, index) => (
                          <div
                            key={b.id || index}
                            className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2.5 group"
                          >
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs truncate">
                                  {b.title}
                                </span>
                                {b.highlight && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                                    {b.highlight}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 truncate">{b.description}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleModalRemoveBenefit(b.id)}
                              className="px-2 py-0.5 rounded bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold text-[10px] cursor-pointer flex items-center gap-1 transition-all border border-red-200 shrink-0"
                              title="Remove this benefit from policy"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* SECTION 3: CHOOSE ADD-ON COVERS */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-blue-600" />
                        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">3. Choose Add-on Covers</h4>
                      </div>
                      <span className="text-[11px] text-slate-500 font-bold">
                        {newCustForm.selectedAddOnIds.length} Add-on(s) Selected
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {INITIAL_ADDONS.map((addon) => {
                        const isSelected = newCustForm.selectedAddOnIds.includes(addon.id);
                        return (
                          <div 
                            key={addon.id} 
                            onClick={() => handleToggleAddOn(addon.id)}
                            className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                              isSelected ? 'bg-emerald-50 border-emerald-400 shadow-2xs' : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{addon.name}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-tight">{addon.description}</p>
                              <span className="text-[10px] font-bold text-emerald-700 block">Coverage: {addon.coverageAmount}</span>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-extrabold text-slate-900 text-xs block">+₹{addon.annualPremium.toLocaleString('en-IN')}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold mt-1 inline-block ${
                                isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {isSelected ? '✓ Added' : '+ Add Cover'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SECTION 4: INSURED MEMBERS */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">4. Insured Family Members</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAddAdultMember}
                          className="px-2.5 py-1 rounded bg-purple-100 text-purple-900 border border-purple-300 font-extrabold hover:bg-purple-200 flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Adult</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleAddKidMember}
                          className="px-2.5 py-1 rounded bg-pink-100 text-pink-900 border border-pink-300 font-extrabold hover:bg-pink-200 flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Kid</span>
                        </button>
                      </div>
                    </div>

                    {newCustForm.members.length === 0 ? (
                      <div className="p-4 bg-white rounded-lg border border-dashed border-slate-300 text-center text-slate-500 font-medium">
                        No family members added yet. Click <strong>+ Add Adult</strong> or <strong>+ Add Kid</strong> above to enter insured details.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {newCustForm.members.map((mem, idx) => (
                          <div key={mem.id} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                                {mem.name || `Member #${idx + 1}`} ({mem.relation})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(mem.id)}
                                className="text-rose-600 hover:text-rose-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-[10px] text-slate-500 font-bold mb-1">Full Name *</label>
                                <input
                                  type="text"
                                  value={mem.name}
                                  onChange={(e) => handleMemberChange(mem.id, 'name', e.target.value)}
                                  placeholder="Member Name"
                                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-bold text-slate-900"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-500 font-bold mb-1">Relationship with Applicant</label>
                                <select
                                  value={mem.relation}
                                  onChange={(e) => handleMemberChange(mem.id, 'relation', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded border border-slate-300 font-bold text-slate-900"
                                >
                                  <option value="Self">Self</option>
                                  <option value="Spouse">Spouse</option>
                                  <option value="Son">Son</option>
                                  <option value="Daughter">Daughter</option>
                                  <option value="Father">Father</option>
                                  <option value="Mother">Mother</option>
                                  <option value="Brother">Brother</option>
                                  <option value="Sister">Sister</option>
                                  <option value="Nephew">Nephew</option>
                                  <option value="Niece">Niece</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-500 font-bold mb-1">Gender</label>
                                <select
                                  value={mem.gender}
                                  onChange={(e) => handleMemberChange(mem.id, 'gender', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded border border-slate-300 font-bold text-slate-900"
                                >
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-500 font-bold mb-1">Date of Birth / Age</label>
                                <div className="grid grid-cols-2 gap-1">
                                  <input
                                    type="date"
                                    value={mem.dob}
                                    onChange={(e) => handleMemberChange(mem.id, 'dob', e.target.value)}
                                    className="w-full px-1.5 py-1.5 rounded border border-slate-300 font-bold text-slate-900 text-[10px]"
                                  />
                                  <input
                                    type="number"
                                    value={mem.age}
                                    onChange={(e) => handleMemberChange(mem.id, 'age', Number(e.target.value))}
                                    placeholder="Age"
                                    className="w-full px-2 py-1.5 rounded border border-slate-300 font-bold text-slate-900"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-500 font-bold mb-1">Pre-existing Disease (PED)</label>
                                <select
                                  value={mem.preExistingConditions && mem.preExistingConditions[0] !== 'no' ? 'yes' : 'no'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleMemberChange(mem.id, 'preExistingConditions', val === 'yes' ? ['Diabetes'] : ['no']);
                                  }}
                                  className="w-full px-2 py-1.5 rounded border border-slate-300 font-bold text-slate-900"
                                >
                                  <option value="no">No Pre-existing Condition</option>
                                  <option value="yes">Yes (Has Pre-existing Medical Condition)</option>
                                </select>
                              </div>

                              {mem.preExistingConditions && mem.preExistingConditions[0] !== 'no' && (
                                <div>
                                  <label className="block text-[10px] text-amber-700 font-bold mb-1">PED Details</label>
                                  <input
                                    type="text"
                                    value={mem.preExistingDetails || ''}
                                    onChange={(e) => handleMemberChange(mem.id, 'preExistingDetails', e.target.value)}
                                    placeholder="e.g. Type-2 Diabetes since 3 years"
                                    className="w-full px-2 py-1.5 rounded border border-amber-300 font-bold text-amber-900 bg-amber-50"
                                  />
                                </div>
                              )}

                              <div>
                                <label className="block text-[10px] text-slate-500 font-bold mb-1">Height / Weight</label>
                                <div className="grid grid-cols-2 gap-1">
                                  <input
                                    type="text"
                                    value={mem.heightFeetInches || "5'8\""}
                                    onChange={(e) => handleMemberChange(mem.id, 'heightFeetInches', e.target.value)}
                                    placeholder="5'8&quot;"
                                    className="w-full px-2 py-1.5 rounded border border-slate-300 font-bold text-slate-900"
                                  />
                                  <input
                                    type="number"
                                    value={mem.weightKg || 70}
                                    onChange={(e) => handleMemberChange(mem.id, 'weightKg', Number(e.target.value))}
                                    placeholder="70 kg"
                                    className="w-full px-2 py-1.5 rounded border border-slate-300 font-bold text-slate-900"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-500 font-bold mb-1">ABHA Health ID (Optional)</label>
                                <input
                                  type="text"
                                  value={mem.abhaNumber || ''}
                                  onChange={(e) => handleMemberChange(mem.id, 'abhaNumber', e.target.value)}
                                  placeholder="e.g. 91-8273-9182-1029"
                                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-slate-900"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECTION 5: APPLICANT CONTACT & KYC DETAILS */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">5. Applicant Contact & KYC Information</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Applicant Name *</label>
                        <input
                          type="text"
                          value={newCustForm.applicantName}
                          onChange={(e) => setNewCustForm({ ...newCustForm, applicantName: e.target.value })}
                          placeholder="Applicant Name"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">KYC Verification Status</label>
                        <select
                          value={newCustForm.kycStatus}
                          onChange={(e) => setNewCustForm({ ...newCustForm, kycStatus: e.target.value as any })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                        >
                          <option value="Verified">Verified (Green Clear)</option>
                          <option value="Pending">Pending Verification</option>
                          <option value="In Review">In Review</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Registered Mobile Number *</label>
                        <input
                          type="text"
                          value={newCustForm.mobileNumber}
                          onChange={(e) => setNewCustForm({ ...newCustForm, mobileNumber: e.target.value })}
                          placeholder="10 digit mobile number"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Email Address *</label>
                        <input
                          type="email"
                          value={newCustForm.email}
                          onChange={(e) => setNewCustForm({ ...newCustForm, email: e.target.value })}
                          placeholder="customer@example.com"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Landline Number</label>
                        <input
                          type="text"
                          value={newCustForm.landline}
                          onChange={(e) => setNewCustForm({ ...newCustForm, landline: e.target.value })}
                          placeholder="-"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={newCustForm.applicantDob}
                          onChange={(e) => setNewCustForm({ ...newCustForm, applicantDob: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-slate-700 font-bold mb-1">Address Line 1</label>
                        <input
                          type="text"
                          value={newCustForm.address}
                          onChange={(e) => setNewCustForm({ ...newCustForm, address: e.target.value })}
                          placeholder="House No, Street, Colony"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Address Line 2</label>
                        <input
                          type="text"
                          value={newCustForm.addressLine2}
                          onChange={(e) => setNewCustForm({ ...newCustForm, addressLine2: e.target.value })}
                          placeholder="Area / Sector"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Landmark</label>
                        <input
                          type="text"
                          value={newCustForm.landmark}
                          onChange={(e) => setNewCustForm({ ...newCustForm, landmark: e.target.value })}
                          placeholder="Near Metro Station"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">City / Pincode</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={newCustForm.city}
                            onChange={(e) => setNewCustForm({ ...newCustForm, city: e.target.value })}
                            placeholder="City"
                            className="w-full px-2 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                          />
                          <input
                            type="text"
                            value={newCustForm.pincode}
                            onChange={(e) => setNewCustForm({ ...newCustForm, pincode: e.target.value })}
                            placeholder="Pincode"
                            className="w-full px-2 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">State</label>
                        <input
                          type="text"
                          value={newCustForm.state}
                          onChange={(e) => setNewCustForm({ ...newCustForm, state: e.target.value })}
                          placeholder="State"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-slate-700 font-bold mb-1">PEP Declaration (Politically Exposed Person)</label>
                        <select
                          value={newCustForm.pepStatus}
                          onChange={(e) => setNewCustForm({ ...newCustForm, pepStatus: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                        >
                          <option value="No">No - Neither applicant nor family members are Politically Exposed Persons</option>
                          <option value="Yes">Yes - Politically Exposed Person (PEP)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 6: NOMINEE DETAILS */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">6. Nominee Information</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Nominee Full Name *</label>
                        <input
                          type="text"
                          value={newCustForm.nomineeName}
                          onChange={(e) => setNewCustForm({ ...newCustForm, nomineeName: e.target.value })}
                          placeholder="Nominee Name"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Relationship with Insured</label>
                        <select
                          value={newCustForm.nomineeRelation}
                          onChange={(e) => setNewCustForm({ ...newCustForm, nomineeRelation: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                        >
                          <option value="Spouse">Spouse</option>
                          <option value="Son">Son</option>
                          <option value="Daughter">Daughter</option>
                          <option value="Mother">Mother</option>
                          <option value="Father">Father</option>
                          <option value="Brother">Brother</option>
                          <option value="Sister">Sister</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Nominee Date of Birth</label>
                        <input
                          type="date"
                          value={newCustForm.nomineeDob}
                          onChange={(e) => setNewCustForm({ ...newCustForm, nomineeDob: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Nominee Age</label>
                        <input
                          type="number"
                          value={newCustForm.nomineeAge}
                          onChange={(e) => setNewCustForm({ ...newCustForm, nomineeAge: Number(e.target.value) })}
                          placeholder="30"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 7: PREMIUM CONFIGURATION & TENURE DISCOUNTS */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <CreditCard className="w-4 h-4 text-[#EA580C]" />
                      <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">7. Premium Configuration & Multi-Year Discounts</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Base Annual Premium (₹) *</label>
                        <input
                          type="number"
                          value={newCustForm.baseAnnualPremium}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            const prevBase = newCustForm.baseAnnualPremium;
                            const autoUpdateTenures = !newCustForm.tenure1Original || newCustForm.tenure1Original === prevBase;
                            setNewCustForm({
                              ...newCustForm,
                              baseAnnualPremium: val,
                              tenure1Original: autoUpdateTenures ? val : newCustForm.tenure1Original,
                              tenure2Original: autoUpdateTenures ? Math.round(val * 1.9) : newCustForm.tenure2Original,
                              tenure3Original: autoUpdateTenures ? Math.round(val * 2.75) : newCustForm.tenure3Original
                            });
                          }}
                          placeholder="28666"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Special Campaign Custom Discount (₹)</label>
                        <input
                          type="number"
                          value={newCustForm.adminCustomDiscountAmount}
                          onChange={(e) => setNewCustForm({ ...newCustForm, adminCustomDiscountAmount: Number(e.target.value) })}
                          placeholder="2000"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                      {/* 1 Year Tenure */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="font-extrabold text-slate-900 text-xs">1 Year Renewal</div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold">Gross Premium (₹)</label>
                          <input
                            type="number"
                            value={newCustForm.tenure1Original}
                            onChange={(e) => setNewCustForm({ ...newCustForm, tenure1Original: Number(e.target.value) })}
                            className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold">Discount %</label>
                          <input
                            type="number"
                            value={newCustForm.tenure1DiscountPct}
                            onChange={(e) => setNewCustForm({ ...newCustForm, tenure1DiscountPct: Number(e.target.value) })}
                            className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900"
                          />
                        </div>
                      </div>

                      {/* 2 Year Tenure */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="font-extrabold text-slate-900 text-xs">2 Year Renewal</div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold">Gross Premium (₹)</label>
                          <input
                            type="number"
                            value={newCustForm.tenure2Original}
                            onChange={(e) => setNewCustForm({ ...newCustForm, tenure2Original: Number(e.target.value) })}
                            className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold">Discount %</label>
                          <input
                            type="number"
                            value={newCustForm.tenure2DiscountPct}
                            onChange={(e) => setNewCustForm({ ...newCustForm, tenure2DiscountPct: Number(e.target.value) })}
                            className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900"
                          />
                        </div>
                      </div>

                      {/* 3 Year Tenure */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="font-extrabold text-slate-900 text-xs">3 Year Renewal</div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold">Gross Premium (₹)</label>
                          <input
                            type="number"
                            value={newCustForm.tenure3Original}
                            onChange={(e) => setNewCustForm({ ...newCustForm, tenure3Original: Number(e.target.value) })}
                            className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold">Discount %</label>
                          <input
                            type="number"
                            value={newCustForm.tenure3DiscountPct}
                            onChange={(e) => setNewCustForm({ ...newCustForm, tenure3DiscountPct: Number(e.target.value) })}
                            className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Live Preview Summary */}
                    <div className="mt-3 p-3 bg-slate-900 text-white rounded-xl space-y-2 text-xs font-sans">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-orange-400 uppercase tracking-wider text-[11px]">
                          Live Quotation Preview (As Customer Will See on Renewal Link)
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                          Auto Computed
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                        {/* Year 1 */}
                        <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700 space-y-0.5">
                          <span className="font-bold text-amber-300 block">1 Year Renewal</span>
                          <div className="flex justify-between text-slate-300">
                            <span>Gross:</span>
                            <span>₹{(Number(newCustForm.tenure1Original) || Number(newCustForm.baseAnnualPremium) || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-emerald-400">
                            <span>Disc ({Number(newCustForm.tenure1DiscountPct) || 0}%):</span>
                            <span>-₹{Math.round((Number(newCustForm.tenure1Original) || Number(newCustForm.baseAnnualPremium) || 0) * ((Number(newCustForm.tenure1DiscountPct) || 0) / 100)).toLocaleString('en-IN')}</span>
                          </div>
                          {Number(newCustForm.adminCustomDiscountAmount) > 0 && (
                            <div className="flex justify-between text-emerald-400">
                              <span>Custom Disc:</span>
                              <span>-₹{Number(newCustForm.adminCustomDiscountAmount).toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          <div className="pt-1.5 mt-1 border-t border-slate-700/80 flex justify-between font-extrabold text-white text-sm">
                            <span className="text-orange-400">Payable:</span>
                            <span>₹{Math.max(0, (Number(newCustForm.tenure1Original) || Number(newCustForm.baseAnnualPremium) || 0) - Math.round((Number(newCustForm.tenure1Original) || Number(newCustForm.baseAnnualPremium) || 0) * ((Number(newCustForm.tenure1DiscountPct) || 0) / 100)) - (Number(newCustForm.adminCustomDiscountAmount) || 0)).toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {/* Year 2 */}
                        <div className="bg-slate-800/90 p-2.5 rounded-lg border border-orange-500/40 space-y-0.5 relative">
                          <span className="font-bold text-amber-300 block">2 Years Renewal</span>
                          <div className="flex justify-between text-slate-300">
                            <span>Gross:</span>
                            <span>₹{(Number(newCustForm.tenure2Original) || Math.round((Number(newCustForm.baseAnnualPremium) || 0) * 1.9)).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-emerald-400">
                            <span>Disc ({Number(newCustForm.tenure2DiscountPct) || 0}%):</span>
                            <span>-₹{Math.round((Number(newCustForm.tenure2Original) || Math.round((Number(newCustForm.baseAnnualPremium) || 0) * 1.9)) * ((Number(newCustForm.tenure2DiscountPct) || 0) / 100)).toLocaleString('en-IN')}</span>
                          </div>
                          {Number(newCustForm.adminCustomDiscountAmount) > 0 && (
                            <div className="flex justify-between text-emerald-400">
                              <span>Custom Disc:</span>
                              <span>-₹{Number(newCustForm.adminCustomDiscountAmount).toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          <div className="pt-1.5 mt-1 border-t border-slate-700/80 flex justify-between font-extrabold text-white text-sm">
                            <span className="text-orange-400">Payable:</span>
                            <span>₹{Math.max(0, (Number(newCustForm.tenure2Original) || Math.round((Number(newCustForm.baseAnnualPremium) || 0) * 1.9)) - Math.round((Number(newCustForm.tenure2Original) || Math.round((Number(newCustForm.baseAnnualPremium) || 0) * 1.9)) * ((Number(newCustForm.tenure2DiscountPct) || 0) / 100)) - (Number(newCustForm.adminCustomDiscountAmount) || 0)).toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {/* Year 3 */}
                        <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700 space-y-0.5">
                          <span className="font-bold text-amber-300 block">3 Years Renewal</span>
                          <div className="flex justify-between text-slate-300">
                            <span>Gross:</span>
                            <span>₹{(Number(newCustForm.tenure3Original) || Math.round((Number(newCustForm.baseAnnualPremium) || 0) * 2.75)).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-emerald-400">
                            <span>Disc ({Number(newCustForm.tenure3DiscountPct) || 0}%):</span>
                            <span>-₹{Math.round((Number(newCustForm.tenure3Original) || Math.round((Number(newCustForm.baseAnnualPremium) || 0) * 2.75)) * ((Number(newCustForm.tenure3DiscountPct) || 0) / 100)).toLocaleString('en-IN')}</span>
                          </div>
                          {Number(newCustForm.adminCustomDiscountAmount) > 0 && (
                            <div className="flex justify-between text-emerald-400">
                              <span>Custom Disc:</span>
                              <span>-₹{Number(newCustForm.adminCustomDiscountAmount).toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          <div className="pt-1.5 mt-1 border-t border-slate-700/80 flex justify-between font-extrabold text-white text-sm">
                            <span className="text-orange-400">Payable:</span>
                            <span>₹{Math.max(0, (Number(newCustForm.tenure3Original) || Math.round((Number(newCustForm.baseAnnualPremium) || 0) * 2.75)) - Math.round((Number(newCustForm.tenure3Original) || Math.round((Number(newCustForm.baseAnnualPremium) || 0) * 2.75)) * ((Number(newCustForm.tenure3DiscountPct) || 0) / 100)) - (Number(newCustForm.adminCustomDiscountAmount) || 0)).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 8: CASHBACK OFFER CONFIGURATION */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">8. Cashback Offer Configuration</h4>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={newCustForm.cashbackEnabled}
                          onChange={(e) => setNewCustForm({ ...newCustForm, cashbackEnabled: e.target.checked })}
                          className="w-4 h-4 accent-[#EA580C]"
                        />
                        <span>Enable Cashback Offer</span>
                      </label>
                    </div>

                    {newCustForm.cashbackEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Eligible Payment Method</label>
                          <input
                            type="text"
                            value={newCustForm.cashbackMethod}
                            onChange={(e) => setNewCustForm({ ...newCustForm, cashbackMethod: e.target.value })}
                            placeholder="e.g. Any Bank Credit Card"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Cashback Type</label>
                          <select
                            value={newCustForm.cashbackType}
                            onChange={(e) => setNewCustForm({ ...newCustForm, cashbackType: e.target.value as any })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount (₹)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Cashback Value</label>
                          <input
                            type="number"
                            value={newCustForm.cashbackValue}
                            onChange={(e) => setNewCustForm({ ...newCustForm, cashbackValue: Number(e.target.value) })}
                            placeholder="10"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* RIGHT COLUMN: LIVE QUOTATION PREVIEW PANEL (lg:col-span-4) */}
                <div className="lg:col-span-4 sticky top-0 space-y-4">
                  {(() => {
                    const selectedAddOns = INITIAL_ADDONS.filter(a => newCustForm.selectedAddOnIds.includes(a.id));
                    const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.annualPremium, 0);

                    const t1Orig = Number(newCustForm.tenure1Original) || (Number(newCustForm.baseAnnualPremium) + addOnsTotal);
                    const t1Disc = Math.round(t1Orig * ((Number(newCustForm.tenure1DiscountPct) || 0) / 100));
                    const t1Payable = Math.max(0, t1Orig - t1Disc - Number(newCustForm.adminCustomDiscountAmount || 0));

                    const t2Orig = Number(newCustForm.tenure2Original) || Math.round((Number(newCustForm.baseAnnualPremium) + addOnsTotal) * 1.9);
                    const t2Disc = Math.round(t2Orig * ((Number(newCustForm.tenure2DiscountPct) || 0) / 100));
                    const t2Payable = Math.max(0, t2Orig - t2Disc - Number(newCustForm.adminCustomDiscountAmount || 0));

                    const t3Orig = Number(newCustForm.tenure3Original) || Math.round((Number(newCustForm.baseAnnualPremium) + addOnsTotal) * 2.75);
                    const t3Disc = Math.round(t3Orig * ((Number(newCustForm.tenure3DiscountPct) || 0) / 100));
                    const t3Payable = Math.max(0, t3Orig - t3Disc - Number(newCustForm.adminCustomDiscountAmount || 0));

                    const cbVal = Number(newCustForm.cashbackValue) || 0;
                    const cbAmt = newCustForm.cashbackEnabled 
                      ? (newCustForm.cashbackType === 'percentage' ? Math.round(t1Payable * (cbVal / 100)) : cbVal)
                      : 0;

                    const totalSI = (Number(newCustForm.baseSumInsured) || 0) + (Number(newCustForm.loyaltyBonus) || 0);

                    return (
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
                            <strong className="text-white text-sm font-bold block">{newCustForm.customerName || 'Customer Name'}</strong>
                            <span className="text-slate-400 text-[10px] font-mono">{newCustForm.policyNumber || 'Policy Number'}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 bg-white/5 p-2.5 rounded-xl border border-white/10">
                            <div>
                              <span className="text-slate-400 block text-[10px]">TOTAL SUM INSURED</span>
                              <strong className="text-emerald-400 text-xs font-black">₹{totalSI.toLocaleString('en-IN')}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">PRICING ZONE</span>
                              <strong className="text-blue-300 text-xs font-black">{newCustForm.zone}</strong>
                            </div>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[10px]">INSURED MEMBERS ({newCustForm.members.length})</span>
                            {newCustForm.members.length === 0 ? (
                              <span className="text-slate-500 italic text-[11px]">No members added</span>
                            ) : (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {newCustForm.members.map(m => (
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
                                <div className="text-[10px] text-slate-400">Orig: ₹{t1Orig.toLocaleString('en-IN')} • {newCustForm.tenure1DiscountPct}% Disc</div>
                              </div>
                              <div className="text-right">
                                <div className="text-base font-black text-[#EA580C]">₹{t1Payable.toLocaleString('en-IN')}</div>
                              </div>
                            </div>

                            <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center">
                              <div>
                                <div className="font-bold text-slate-200 text-xs">2 Year Renewal</div>
                                <div className="text-[10px] text-slate-400">Orig: ₹{t2Orig.toLocaleString('en-IN')} • {newCustForm.tenure2DiscountPct}% Disc</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-emerald-400">₹{t2Payable.toLocaleString('en-IN')}</div>
                              </div>
                            </div>

                            <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center">
                              <div>
                                <div className="font-bold text-slate-200 text-xs">3 Year Renewal</div>
                                <div className="text-[10px] text-slate-400">Orig: ₹{t3Orig.toLocaleString('en-IN')} • {newCustForm.tenure3DiscountPct}% Disc</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-emerald-400">₹{t3Payable.toLocaleString('en-IN')}</div>
                              </div>
                            </div>
                          </div>

                          {newCustForm.cashbackEnabled && cbAmt > 0 && (
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                              <span className="text-[10px] text-emerald-300 font-bold">ESTIMATED CASHBACK ({newCustForm.cashbackMethod})</span>
                              <strong className="text-emerald-400 font-black text-xs">₹{cbAmt.toLocaleString('en-IN')}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>

              {/* Modal Footer Action Bar */}
              <div className="pt-5 mt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <p className="text-[11px] text-slate-500 font-semibold">
                  Every field entered is automatically saved to the central database & tied to the generated link.
                </p>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial px-7 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{newCustForm.isEditing ? 'Update Policy & Renewal Link' : 'Generate Renewal Link & Save'}</span>
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* SECTION 6: SHARE & EMAIL LINK MODAL (RENEWAL & SOFT COPY) */}
      {shareModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0 animate-scaleUp font-sans">
            
            {/* Modal Header */}
            <div className="bg-[#00264A] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EA580C] text-white flex items-center justify-center font-bold shadow-sm">
                  {shareModalTab === 'soft_copy' ? <FileText className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {shareModalTab === 'soft_copy' ? 'Share Policy Soft Copy & Health Cards Link' : 'Share Policy Renewal & Payment Link'}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">{shareModalData.customerName} • Policy #{shareModalData.policyNumber}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShareModalData(null)}
                className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="bg-slate-100 p-2 border-b border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShareModalTab('renewal');
                  setEmailSubjectInput(`Action Required: Health Insurance Policy Renewal Notice - #${shareModalData.policyNumber}`);
                  setEmailDispatchResult(null);
                }}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  shareModalTab === 'renewal'
                    ? 'bg-[#EA580C] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Renewal & Payment Link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareModalTab('soft_copy');
                  setEmailSubjectInput(`Download Policy Soft Copy & Digital Health Cards - #${shareModalData.policyNumber}`);
                  setEmailDispatchResult(null);
                }}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  shareModalTab === 'soft_copy'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Soft Copy Download Link</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 text-xs text-slate-800 font-medium max-h-[80vh] overflow-y-auto">
              
              {/* Direct Link Banner */}
              {(() => {
                const isSoftCopy = shareModalTab === 'soft_copy';
                const hasDisc = (shareModalData.discountAmount && shareModalData.discountAmount > 0) || (shareModalData.grossAmount && shareModalData.grossAmount > shareModalData.finalPayable);
                const discAmt = shareModalData.discountAmount || (shareModalData.grossAmount ? Math.max(0, shareModalData.grossAmount - shareModalData.finalPayable) : 0);
                const discPct = shareModalData.discountPct || (shareModalData.grossAmount && discAmt > 0 ? Math.round((discAmt / shareModalData.grossAmount) * 100) : 10);
                const selTenure = shareModalData.selectedTenure || 1;

                const tenureParam = selTenure !== 1 ? `&tenure=${selTenure}` : '';
                const discParam = shareModalData.customDiscountAmount && shareModalData.customDiscountAmount > 0 ? `&disc=${shareModalData.customDiscountAmount}` : '';

                const currentUrl = isSoftCopy
                  ? buildPublicSoftCopyLink(shareModalData.softCopyToken || shareModalData.token, shareModalData.policyNumber)
                  : buildPublicRenewalLink(shareModalData.token, shareModalData.policyNumber, selTenure, shareModalData.customDiscountAmount);

                const targetRenLink = renewalLinks.find(l => l.policyNumber === shareModalData.policyNumber);
                const targetSoftLink = softCopyLinks.find(l => l.policyNumber === shareModalData.policyNumber);
                const currentLinkRecord = isSoftCopy ? targetSoftLink : targetRenLink;
                const isCurrentRevoked = currentLinkRecord?.isRevoked;
                const genMs = currentLinkRecord?.generatedAt ? new Date(currentLinkRecord.generatedAt).getTime() : 0;
                const validityMs = (currentLinkRecord?.validityHours || 12) * 3600 * 1000;
                const isCurrentWithinValidity = genMs > 0 && (Date.now() - genMs) < validityMs;
                const isCurrentPast = !isCurrentWithinValidity && currentLinkRecord?.expiresAt ? new Date(currentLinkRecord.expiresAt).getTime() < Date.now() : false;
                const isCurrentExpired = isCurrentRevoked ? true : (currentLinkRecord ? (isCurrentPast || (currentLinkRecord.isExpired && !isCurrentWithinValidity)) : false);

                return (
                  <div className={`p-4 rounded-xl space-y-3 border ${
                    isSoftCopy ? 'bg-blue-50/80 border-blue-200' : 'bg-orange-50 border-orange-200'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <span className="font-extrabold text-[#00264A] uppercase text-[11px] tracking-wider">
                        {isSoftCopy ? 'Customer Soft Copy Download Link' : 'Customer Unique Renewal Link'}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isCurrentRevoked ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-extrabold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>Link Deleted / Revoked</span>
                          </span>
                        ) : isCurrentExpired ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-extrabold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Link Expired</span>
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-700" />
                            <span>Active (12 Hours)</span>
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-700" />
                          <span>Admin Data Saved</span>
                        </span>
                      </div>
                    </div>

                    {/* Prominent Discount Badge Banner for Renewal Links */}
                    {!isSoftCopy && hasDisc && (
                      <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🏷️</span>
                          <div>
                            <span className="font-extrabold text-emerald-900 text-xs block">
                              Special Renewal Discount Active on Link ({selTenure} Year{selTenure > 1 ? 's' : ''} Plan)
                            </span>
                            <span className="text-[11px] text-emerald-700">
                              Standard: <span className="line-through font-semibold">₹{(shareModalData.grossAmount || shareModalData.finalPayable + discAmt).toLocaleString('en-IN')}</span> • Discount Applied: <strong>-₹{discAmt.toLocaleString('en-IN')} ({discPct}% Off)</strong>
                            </span>
                          </div>
                        </div>
                        <div className="sm:text-right shrink-0">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Customer Pays</span>
                          <span className="text-base font-black text-slate-900 text-[#EA580C]">
                            ₹{shareModalData.finalPayable.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-300">
                      <input
                        type="text"
                        readOnly
                        value={currentUrl}
                        className="w-full font-mono text-[11px] text-slate-800 bg-transparent outline-none font-bold select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (isSoftCopy) {
                            handleCopySoftCopyLink(shareModalData.policyNumber, shareModalData.softCopyToken);
                          } else {
                            handleCopyLink(shareModalData.token);
                          }
                        }}
                        className={`px-3 py-1.5 text-white font-extrabold rounded-md cursor-pointer flex items-center gap-1 shrink-0 text-xs shadow-2xs ${
                          isSoftCopy ? 'bg-blue-700 hover:bg-blue-800' : 'bg-[#EA580C] hover:bg-[#D97706]'
                        }`}
                      >
                        {(isSoftCopy ? copiedSoftToken === shareModalData.policyNumber : copiedToken === shareModalData.token) ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied Link!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Fresh Link Generation & Security Note */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                      <div className="text-[11px] text-slate-600 font-normal">
                        <span className="font-bold text-slate-800">Lifecycle Control:</span> Expire link anytime, delete/revoke, or create a brand new link.
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {!isSoftCopy && (
                          <button
                            type="button"
                            onClick={() => {
                              const cust = customers.find(c => c.policyNumber === shareModalData.policyNumber);
                              const linkRec = renewalLinks.find(l => l.policyNumber === shareModalData.policyNumber || l.token === shareModalData.token);
                              if (linkRec) {
                                setShareModalData(null);
                                handleOpenEditLink(linkRec, cust);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
                            title="Edit validity, discount, tenure, or contact on this same link and resend"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Link Details</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isDeletingLink || isCurrentExpired}
                          onClick={() => {
                            if (isSoftCopy) {
                              handleExpireSoftCopy(shareModalData.policyNumber);
                            } else {
                              handleExpireRenewal(shareModalData.policyNumber);
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-lg border font-extrabold text-xs cursor-pointer flex items-center gap-1.5 transition-colors ${
                            isCurrentExpired
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                          title="Expire current link immediately from your end"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Expire Link</span>
                        </button>

                        <button
                          type="button"
                          disabled={isDeletingLink}
                          onClick={() => {
                            if (isSoftCopy) {
                              handleDeleteSoftCopy(shareModalData.policyNumber);
                            } else {
                              handleDeleteRenewal(shareModalData.policyNumber);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          title="Delete link so customer will see inactive notice"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Delete Link</span>
                        </button>

                        <button
                          type="button"
                          disabled={isRegeneratingLink}
                          onClick={() => {
                            if (isSoftCopy) {
                              handleDeleteAndRegenerateSoftCopy(shareModalData.policyNumber);
                            } else {
                              handleDeleteAndRegenerateRenewal(shareModalData.policyNumber);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs cursor-pointer flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 shrink-0"
                          title="Expire current link and create a new 12-hour link"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingLink ? 'animate-spin' : ''}`} />
                          <span>{isRegeneratingLink ? 'Generating...' : 'Expire Old & Create New'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end pt-0.5">
                      <a
                        href={currentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1"
                      >
                        <span>Open Link in New Tab to Preview Customer Experience</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })()}

              {/* Email Sharing Options */}
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#EA580C]" />
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                      1. Official Email Dispatch (ICICI Lombard Gateway)
                    </h4>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded border border-emerald-200">
                    Secure Backend Gateway
                  </span>
                </div>

                {/* Secure Email Form */}
                <form onSubmit={handleSendOfficialEmail} className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3.5">
                  
                  {/* Send From Dropdown (Authorized Only) */}
                  <div>
                    <label className="block text-slate-700 font-extrabold text-[11px] mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Send From (Authorized Verified Senders) *</span>
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold">Domain Authorized</span>
                    </label>

                    <select
                      value={selectedSenderEmail}
                      onChange={(e) => setSelectedSenderEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white text-xs outline-none focus:border-[#EA580C]"
                      required
                    >
                      {emailSenders.filter(s => s.status === 'Verified').length === 0 ? (
                        <>
                          <option value="customersupport@icicilombard-renewal.com">customersupport@icicilombard-renewal.com — ICICI Lombard Renewal Desk [Verified]</option>
                          <option value="renewals@mydomain.com">renewals@mydomain.com — ICICI Lombard Policy Renewals Desk [Verified]</option>
                          <option value="support@mydomain.com">support@mydomain.com — ICICI Lombard Customer Support & Claims [Verified]</option>
                          <option value="payments@mydomain.com">payments@mydomain.com — ICICI Lombard Payment Processing [Verified]</option>
                        </>
                      ) : (
                        emailSenders.filter(s => s.status === 'Verified').map(s => (
                          <option key={s.id} value={s.email}>
                            {s.email} — {s.senderName} ({s.department || 'Verified'}) {s.isDefault ? '★ Primary' : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Recipient Email & Subject */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold text-[11px] mb-1">
                        Recipient Email Address *
                      </label>
                      <input
                        type="email"
                        value={recipientEmailInput}
                        onChange={(e) => setRecipientEmailInput(e.target.value)}
                        placeholder="customer@example.com"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white text-xs outline-none focus:border-[#EA580C]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold text-[11px] mb-1">
                        Email Subject *
                      </label>
                      <input
                        type="text"
                        value={emailSubjectInput}
                        onChange={(e) => setEmailSubjectInput(e.target.value)}
                        placeholder={shareModalTab === 'soft_copy' ? "Download Policy Soft Copy" : "Action Required: Policy Renewal Notice"}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white text-xs outline-none focus:border-[#EA580C]"
                        required
                      />
                    </div>
                  </div>

                  {/* Custom Message / Agent Note */}
                  <div>
                    <label className="block text-slate-700 font-bold text-[11px] mb-1">
                      Personalized Message / Agent Instructions (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={customEmailNote}
                      onChange={(e) => setCustomEmailNote(e.target.value)}
                      placeholder={shareModalTab === 'soft_copy' 
                        ? "e.g. Please find attached the direct link to download your ICICI Lombard Policy document and family health cards..." 
                        : "e.g. Please note we have applied an exclusive loyalty discount for your policy renewal..."}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white text-xs outline-none focus:border-[#EA580C]"
                    />
                  </div>

                  {/* Submit Dispatch Button */}
                  <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-[10px] text-slate-500">
                      Dispatched using encrypted backend SMTP gateway.
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingEmail}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#00264A] hover:bg-[#0A3D62] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSendingEmail ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching Email via Backend...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Official Email to Customer</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Dispatch Result Confirmation Banner */}
                  {emailDispatchResult && (
                    <div className={`p-4 rounded-xl border space-y-2 animate-fadeIn ${
                      emailDispatchResult.success 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      <div className="flex items-center gap-2 font-black text-xs">
                        {emailDispatchResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                        <span>{emailDispatchResult.message}</span>
                      </div>
                      {emailDispatchResult.refId && (
                        <div className="text-[10px] font-mono flex items-center justify-between pt-1 border-t border-emerald-200 text-emerald-800">
                          <span>Reference ID: <strong>{emailDispatchResult.refId}</strong></span>
                          <span>Timestamp: {formatDisplayDateTime(emailDispatchResult.sentAt || new Date().toISOString()).dateTime}</span>
                        </div>
                      )}
                      {emailDispatchResult.mailtoUrl && (
                        <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-rose-200/80">
                          <a
                            href={emailDispatchResult.mailtoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 bg-[#00264A] hover:bg-[#0A3D62] text-white rounded-lg font-black text-xs inline-flex items-center gap-1.5 shadow-sm transition"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Open & Send via Gmail / Default Mail</span>
                          </a>
                          <button
                            type="button"
                            onClick={handleSendOfficialEmail}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-lg font-bold text-xs border border-slate-300 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry Backend Dispatch</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </form>

                {/* 2. Copyable Email Template with ICICI Lombard Header & Clickable Hyperlink */}
                {(() => {
                  const isSoftCopy = shareModalTab === 'soft_copy';
                  const selTenure = shareModalData.selectedTenure || 1;
                  const hasDisc = (shareModalData.discountAmount && shareModalData.discountAmount > 0) || (shareModalData.grossAmount && shareModalData.grossAmount > shareModalData.finalPayable);
                  const discAmt = shareModalData.discountAmount || (shareModalData.grossAmount ? Math.max(0, shareModalData.grossAmount - shareModalData.finalPayable) : 0);
                  const discPct = shareModalData.discountPct || (shareModalData.grossAmount && discAmt > 0 ? Math.round((discAmt / shareModalData.grossAmount) * 100) : 10);
                  const grossAmt = shareModalData.grossAmount || (shareModalData.finalPayable + discAmt);
                  
                  const tenureParam = selTenure > 1 ? `&tenure=${selTenure}` : '';
                  const customDiscAmt = shareModalData.customDiscountAmount || 0;
                  const discParam = customDiscAmt > 0 ? `&disc=${customDiscAmt}` : (discAmt > 0 ? `&disc=${discAmt}` : '');

                  const currentUrl = isSoftCopy
                    ? `${window.location.origin}?view=soft_copy&policy=${encodeURIComponent(shareModalData.policyNumber)}${shareModalData.softCopyToken ? `&soft_token=${encodeURIComponent(shareModalData.softCopyToken)}` : ''}`
                    : `${window.location.origin}?renewal_token=${shareModalData.token}${tenureParam}${discParam}`;

                  const actionLabel = isSoftCopy
                    ? 'Click Here to View & Download Your Policy Document →'
                    : 'Click Here to Review & Renew Policy Online →';

                  const richEmailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b;">
  <div style="background-color: #00264A; color: #ffffff; padding: 22px; text-align: center;">
    <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">ICICI Lombard General Insurance Company</h2>
    <p style="margin: 0; font-size: 13px; color: #fed7aa; font-weight: 600;">${isSoftCopy ? 'Official Policy Documents & Digital Soft Copy Portal' : 'Official Policy Renewal & Customer Service Portal'}</p>
  </div>
  <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
    <p style="margin-top: 0;">Dear <strong>${shareModalData.customerName}</strong>,</p>
    ${customEmailNote ? `<div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 12px 16px; margin: 16px 0; color: #9a3412; font-size: 13px; border-radius: 4px;">${customEmailNote.replace(/\n/g, '<br/>')}</div>` : ''}
    <p>${isSoftCopy 
      ? `We are pleased to inform you that your official ICICI Lombard Health Insurance policy schedule and digital e-cards are ready for download.`
      : `Your ICICI Lombard Health Insurance policy is due for renewal. Please review your policy details below and renew online before expiry.`}</p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <div style="font-weight: 800; font-size: 12px; color: #00264A; text-transform: uppercase; margin-bottom: 10px; border-bottom: 2px solid #ea580c; padding-bottom: 4px;">Policy Information Summary</div>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr><td style="padding: 5px 0; color: #64748b;">Policy Number:</td><td style="padding: 5px 0; font-weight: 700; text-align: right; color: #0f172a;">${shareModalData.policyNumber}</td></tr>
        <tr><td style="padding: 5px 0; color: #64748b;">Plan Name:</td><td style="padding: 5px 0; font-weight: 700; text-align: right; color: #0f172a;">${shareModalData.policyName}</td></tr>
        <tr><td style="padding: 5px 0; color: #64748b;">Selected Duration:</td><td style="padding: 5px 0; font-weight: 700; text-align: right; color: #0f172a;">${selTenure} Year${selTenure > 1 ? 's' : ''}</td></tr>
        <tr><td style="padding: 5px 0; color: #64748b;">Total Sum Insured:</td><td style="padding: 5px 0; font-weight: 700; text-align: right; color: #0f172a;">₹${shareModalData.sumInsured.toLocaleString('en-IN')}</td></tr>
        ${!isSoftCopy && hasDisc ? `<tr><td style="padding: 5px 0; color: #64748b;">Standard Premium:</td><td style="padding: 5px 0; font-weight: 700; text-align: right; color: #64748b; text-decoration: line-through;">₹${grossAmt.toLocaleString('en-IN')}</td></tr>` : ''}
        ${!isSoftCopy && hasDisc ? `<tr><td style="padding: 5px 0; color: #047857; font-weight: 700;">Special Renewal Discount:</td><td style="padding: 5px 0; font-weight: 800; text-align: right; color: #047857;">-₹${discAmt.toLocaleString('en-IN')} (${discPct}% Off)</td></tr>` : ''}
        ${!isSoftCopy ? `<tr><td style="padding: 5px 0; color: #64748b;">Renewal Premium:</td><td style="padding: 5px 0; font-weight: 800; text-align: right; color: #ea580c; font-size: 15px;">₹${shareModalData.finalPayable.toLocaleString('en-IN')}</td></tr>` : ''}
        <tr><td style="padding: 5px 0; color: #64748b;">${isSoftCopy ? 'Download Status:' : 'Renewal Due Date:'}</td><td style="padding: 5px 0; font-weight: 700; text-align: right; color: #0f172a;">${isSoftCopy ? 'Ready for Instant Download' : shareModalData.dueDate}</td></tr>
      </table>
    </div>
    <div style="text-align: center; margin: 26px 0 20px 0;">
      <a href="${currentUrl}" target="_blank" style="display: inline-block; background-color: #EA580C; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.3); letter-spacing: 0.02em;">
        ${actionLabel}
      </a>
    </div>
    <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 4px;">Or copy and paste this direct policy link in your browser:</p>
    <p style="font-size: 12px; text-align: center; word-break: break-all; margin-top: 0;">
      <a href="${currentUrl}" target="_blank" style="color: #00264A; font-weight: 600; text-decoration: underline;">${currentUrl}</a>
    </p>
  </div>
  <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0 0 4px 0;"><strong>ICICI Lombard General Insurance Company Limited</strong> • IRDAI Reg. No. 115</p>
    <p style="margin: 0;">This is an authorized official outbound customer communication. Customer policy record is permanently secured.</p>
  </div>
</div>`;

                  const plainTextBody = isSoftCopy
                    ? `ICICI Lombard General Insurance Company\nOfficial Policy Documents & Digital Soft Copy Portal\n\n` +
                      `Dear ${shareModalData.customerName},\n\n` +
                      `Your ICICI Lombard Health Insurance Policy (${shareModalData.policyName}) digital soft copy and e-cards are ready for download.\n\n` +
                      `Policy Number: ${shareModalData.policyNumber}\n` +
                      `Total Sum Insured: ₹${shareModalData.sumInsured.toLocaleString('en-IN')}\n\n` +
                      (customEmailNote ? `${customEmailNote}\n\n` : '') +
                      `Click the secure hyperlink below to view and download your policy document:\n` +
                      `${currentUrl}\n\n` +
                      `Regards,\n` +
                      `ICICI Lombard General Insurance Company Limited\n` +
                      `IRDAI Reg. No. 115`
                    : `ICICI Lombard General Insurance Company\nOfficial Policy Renewal & Customer Service Portal\n\n` +
                      `Dear ${shareModalData.customerName},\n\n` +
                      `Your ICICI Lombard Health Insurance Policy (${shareModalData.policyName}) is due for renewal.\n\n` +
                      `Policy Number: ${shareModalData.policyNumber}\n` +
                      `Selected Duration: ${selTenure} Year${selTenure > 1 ? 's' : ''}\n` +
                      `Total Sum Insured: ₹${shareModalData.sumInsured.toLocaleString('en-IN')}\n` +
                      (hasDisc ? `Standard Premium: ₹${grossAmt.toLocaleString('en-IN')}\nDiscount Applied: -₹${discAmt.toLocaleString('en-IN')} (${discPct}% Off)\n` : '') +
                      `Renewal Premium Payable: ₹${shareModalData.finalPayable.toLocaleString('en-IN')}\n` +
                      `Renewal Due Date: ${shareModalData.dueDate}\n\n` +
                      (customEmailNote ? `${customEmailNote}\n\n` : '') +
                      `Click the secure hyperlink below to view your policy and renew online:\n` +
                      `${currentUrl}\n\n` +
                      `Regards,\n` +
                      `ICICI Lombard General Insurance Company Limited\n` +
                      `IRDAI Reg. No. 115`;

                  const handleCopyRichHtml = async () => {
                    try {
                      if (typeof window !== 'undefined' && 'ClipboardItem' in window && navigator.clipboard) {
                        const item = new ClipboardItem({
                          'text/html': new Blob([richEmailHtml], { type: 'text/html' }),
                          'text/plain': new Blob([plainTextBody], { type: 'text/plain' })
                        });
                        await navigator.clipboard.write([item]);
                        setCopiedRichTemplate(true);
                        setTimeout(() => setCopiedRichTemplate(false), 3000);
                        return;
                      }
                    } catch (e) {
                      console.warn('ClipboardItem failed:', e);
                    }
                    navigator.clipboard.writeText(plainTextBody);
                    setCopiedRichTemplate(true);
                    setTimeout(() => setCopiedRichTemplate(false), 3000);
                  };

                  const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(shareModalData.email)}&su=${encodeURIComponent(emailSubjectInput || (isSoftCopy ? `ICICI Lombard Policy Soft Copy - #${shareModalData.policyNumber}` : `ICICI Lombard Policy Renewal Notice - #${shareModalData.policyNumber}`))}&body=${encodeURIComponent(plainTextBody)}`;

                  return (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#00264A]" />
                          <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                            2. Copyable ICICI Lombard Email Template (For Customers)
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowEmailTemplatePreview(!showEmailTemplatePreview)}
                          className="text-[11px] font-bold text-[#EA580C] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {showEmailTemplatePreview ? 'Hide Preview' : 'Show Preview'}
                          {showEmailTemplatePreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Visual Email Template Preview */}
                      {showEmailTemplatePreview && (
                        <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white text-xs animate-fadeIn">
                          {/* ICICI Lombard Header */}
                          <div className="bg-[#00264A] text-white p-3.5 text-center">
                            <div className="font-extrabold text-sm text-white tracking-wide">ICICI Lombard General Insurance Company</div>
                            <div className="text-[11px] text-orange-200 font-semibold">
                              {isSoftCopy ? 'Official Policy Documents & Digital Soft Copy' : 'Official Policy Renewal Notice & Payment'}
                            </div>
                          </div>

                          <div className="p-4 space-y-3 bg-slate-50/50">
                            <div>
                              <p className="font-bold text-slate-900">Dear {shareModalData.customerName},</p>
                              {customEmailNote && (
                                <div className="mt-2 p-2.5 bg-amber-50 border-l-4 border-[#EA580C] text-amber-900 text-xs rounded">
                                  {customEmailNote}
                                </div>
                              )}
                              <p className="mt-2 text-slate-700">
                                {isSoftCopy
                                  ? 'Your official ICICI Lombard Health Insurance policy schedule and digital e-cards are available for download.'
                                  : 'Your ICICI Lombard Health Insurance policy is due for renewal. Please review your policy details below and renew online.'}
                              </p>
                            </div>

                            {/* Policy Table */}
                            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 font-sans">
                              <div className="flex justify-between text-[11px]"><span className="text-slate-500">Policy Number:</span><strong className="text-slate-900">{shareModalData.policyNumber}</strong></div>
                              <div className="flex justify-between text-[11px]"><span className="text-slate-500">Plan:</span><strong className="text-slate-900">{shareModalData.policyName}</strong></div>
                              <div className="flex justify-between text-[11px]"><span className="text-slate-500">Sum Insured:</span><strong className="text-slate-900">₹{shareModalData.sumInsured.toLocaleString('en-IN')}</strong></div>
                              {!isSoftCopy && (
                                <div className="flex justify-between text-[11px]"><span className="text-slate-500">Payable Premium:</span><strong className="text-[#EA580C] font-black text-xs">₹{shareModalData.finalPayable.toLocaleString('en-IN')}</strong></div>
                              )}
                              <div className="flex justify-between text-[11px]"><span className="text-slate-500">{isSoftCopy ? 'Status:' : 'Due Date:'}</span><strong className="text-slate-900">{isSoftCopy ? 'Ready for Download' : shareModalData.dueDate}</strong></div>
                            </div>

                            {/* Clickable Hyperlink Button Preview */}
                            <div className="text-center py-2">
                              <a
                                href={currentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>{actionLabel}</span>
                              </a>
                              <div className="mt-1.5 text-[10px] text-slate-500">
                                Direct Policy Hyperlink: <span className="font-mono text-blue-700 underline">{currentUrl}</span>
                              </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t border-slate-200 pt-2 text-[10px] text-center text-slate-500">
                              ICICI Lombard General Insurance Company Limited • IRDAI Reg. No. 115
                            </div>
                          </div>
                        </div>
                      )}

                      {/* One-Click Copy & Share Action Buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={handleCopyRichHtml}
                          className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-black text-center flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs shadow-2xs"
                        >
                          {copiedRichTemplate ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-600" />}
                          <span>{copiedRichTemplate ? 'Rich Email Copied!' : 'Copy Formatted (Gmail/Outlook)'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(plainTextBody);
                            setCopiedTemplate(true);
                            setTimeout(() => setCopiedTemplate(false), 2500);
                          }}
                          className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-center flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs shadow-2xs"
                        >
                          {copiedTemplate ? <Check className="w-4 h-4 text-slate-700" /> : <Copy className="w-4 h-4 text-slate-600" />}
                          <span>{copiedTemplate ? 'Text Copied!' : 'Copy Plain Text Email'}</span>
                        </button>

                        <a
                          href={gmailWebUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900 font-extrabold text-center flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs shadow-2xs"
                        >
                          <Mail className="w-4 h-4 text-rose-600" />
                          <span>Open in Gmail Web</span>
                        </a>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Instant Messenger Sharing */}
              {(() => {
                const isSoftCopy = shareModalTab === 'soft_copy';
                const selTenure = shareModalData.selectedTenure || 1;
                const hasDisc = (shareModalData.discountAmount && shareModalData.discountAmount > 0) || (shareModalData.grossAmount && shareModalData.grossAmount > shareModalData.finalPayable);
                const discAmt = shareModalData.discountAmount || (shareModalData.grossAmount ? Math.max(0, shareModalData.grossAmount - shareModalData.finalPayable) : 0);
                const discPct = shareModalData.discountPct || (shareModalData.grossAmount && discAmt > 0 ? Math.round((discAmt / shareModalData.grossAmount) * 100) : 10);
                const grossAmt = shareModalData.grossAmount || (shareModalData.finalPayable + discAmt);

                const tenureParam = selTenure > 1 ? `&tenure=${selTenure}` : '';
                const customDiscAmt = shareModalData.customDiscountAmount || 0;
                const discParam = customDiscAmt > 0 ? `&disc=${customDiscAmt}` : (discAmt > 0 ? `&disc=${discAmt}` : '');

                const currentUrl = isSoftCopy
                  ? buildPublicSoftCopyLink(shareModalData.softCopyToken || '', shareModalData.policyNumber)
                  : buildPublicRenewalLink(shareModalData.token, shareModalData.policyNumber, selTenure, customDiscAmt > 0 ? customDiscAmt : discAmt);

                const waText = isSoftCopy
                  ? `Hello ${shareModalData.customerName}, your ICICI Lombard Health Insurance Policy #${shareModalData.policyNumber} soft copy and health cards are available. Click here to download: ${currentUrl}`
                  : hasDisc
                    ? `Hello ${shareModalData.customerName}, your ICICI Lombard Health Insurance Policy #${shareModalData.policyNumber} renewal offer (${selTenure} Year${selTenure > 1 ? 's' : ''} Plan) is ready with an exclusive discount of -₹${discAmt.toLocaleString('en-IN')} (${discPct}% Off)!\n• Standard Gross: ₹${grossAmt.toLocaleString('en-IN')}\n• Discount Applied: -₹${discAmt.toLocaleString('en-IN')}\n• Payable Premium: ₹${shareModalData.finalPayable.toLocaleString('en-IN')}\nClick link to review & pay online: ${currentUrl}`
                    : `Hello ${shareModalData.customerName}, your ICICI Lombard Health Insurance Policy #${shareModalData.policyNumber} renewal premium of ₹${shareModalData.finalPayable.toLocaleString('en-IN')} is ready. Click link to review & pay online: ${currentUrl}`;

                const smsText = isSoftCopy
                  ? `Dear ${shareModalData.customerName}, download your ICICI Lombard Health Insurance Policy #${shareModalData.policyNumber} soft copy and e-cards online: ${currentUrl}`
                  : hasDisc
                    ? `Dear ${shareModalData.customerName}, your policy #${shareModalData.policyNumber} renewal is ready with ₹${discAmt.toLocaleString('en-IN')} discount (${discPct}% Off). Pay ₹${shareModalData.finalPayable.toLocaleString('en-IN')} (${selTenure}Y plan) online: ${currentUrl}`
                    : `Dear ${shareModalData.customerName}, your policy #${shareModalData.policyNumber} renewal is due. Pay ₹${shareModalData.finalPayable.toLocaleString('en-IN')} online: ${currentUrl}`;

                return (
                  <div className="space-y-3 border-t border-slate-200 pt-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                        2. Share via WhatsApp or SMS
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                        <span>Send via WhatsApp</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(smsText);
                          alert('SMS text copied to clipboard!');
                        }}
                        className="p-3 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        <Copy className="w-4 h-4 text-purple-600" />
                        <span>Copy SMS Text</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShareModalData(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* QUICK GENERATE SOFT COPY LINK MODAL */}
      {quickSoftCopyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp font-sans">
            
            <div className="bg-blue-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Generate Soft Copy Link</h3>
                  <p className="text-xs text-blue-200">Create & share customer download link for policy documents & cards</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setQuickSoftCopyModalOpen(false);
                  setSelectedSoftPolicyInput('');
                }}
                className="p-1.5 rounded-full text-blue-200 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-800">
              <div>
                <label className="block text-slate-700 font-extrabold text-xs mb-1.5">
                  Select Registered Customer Policy *
                </label>
                <select
                  value={selectedSoftPolicyInput}
                  onChange={(e) => setSelectedSoftPolicyInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white text-xs outline-none focus:border-blue-600"
                >
                  <option value="">-- Choose from existing customers --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.policyNumber}>
                      {c.customerName} ({c.policyNumber}) - {c.policyName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-2 text-slate-400 font-bold text-[10px] uppercase">Or enter custom policy #</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold text-xs mb-1.5">
                  Manual Policy Number
                </label>
                <input
                  type="text"
                  value={selectedSoftPolicyInput}
                  onChange={(e) => setSelectedSoftPolicyInput(e.target.value)}
                  placeholder="e.g. POL-IL-2026-987654"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 bg-white text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 text-blue-900 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>Instant Link Creation</span>
                </div>
                <p className="text-[11px] text-blue-800">
                  Generating this link creates an active tracking token. When the customer opens it, their lookup and credentials keyed will be tracked in real-time.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickSoftCopyModalOpen(false);
                    setSelectedSoftPolicyInput('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!selectedSoftPolicyInput.trim()}
                  onClick={() => {
                    const polNumber = selectedSoftPolicyInput.trim();
                    if (!polNumber) return;

                    const cust = customers.find(c => c.policyNumber.toLowerCase() === polNumber.toLowerCase()) || {
                      id: `cust-${Date.now()}`,
                      customerName: 'Customer',
                      policyNumber: polNumber,
                      email: '',
                      mobileNumber: '',
                      policyName: 'Health Complete Shield',
                      policyType: 'Family Floater',
                      totalSumInsured: 1000000,
                      renewalDueDate: '2026-10-31',
                      baseAnnualPremium: 18500,
                      policyStatus: 'Active',
                      members: []
                    } as unknown as CustomerPolicy;

                    const newLink = generateSoftCopyLink(polNumber);
                    setQuickSoftCopyModalOpen(false);
                    setSelectedSoftPolicyInput('');
                    reloadData();

                    // Open Share modal for this soft copy link
                    handleOpenShareForPolicy(cust, undefined, 'soft_copy');
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs cursor-pointer disabled:opacity-40 flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate & Share Link</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* EXCEL DATA LOGS EXPORT MODAL */}
      <ExcelExportModal
        isOpen={showExcelExportModal}
        onClose={() => setShowExcelExportModal(false)}
        customers={customers}
        activityLogs={activityLogs}
        paymentAttempts={allPaymentAttempts}
        softCopyLinks={softCopyLinks}
        emailLogs={emailLogs}
      />

      {/* EDIT CREATED RENEWAL LINK MODAL */}
      <EditRenewalLinkModal
        isOpen={isEditRenewalLinkModalOpen}
        onClose={() => {
          setIsEditRenewalLinkModalOpen(false);
          setEditingRenewalLink(null);
          setEditingLinkCustomer(null);
        }}
        link={editingRenewalLink}
        customer={editingLinkCustomer}
        onSaveSuccess={handleEditLinkSuccess}
        onOpenFullShare={(cust, token) => handleOpenShareForPolicy(cust, token, 'renewal')}
        onOpenFullPolicyEdit={(cust) => {
          setIsEditRenewalLinkModalOpen(false);
          handleOpenEditCustomer(cust);
        }}
      />

      {/* STICKY FLOATING APPROVAL BAR AT BOTTOM (VISIBLE ACROSS ALL TABS WHEN PENDING APPROVAL EXISTS) */}
      {pendingApprovals.filter(p => p.status === 'PENDING').length > 0 && (
        <div 
          id="floating-sticky-approval-bar"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl bg-slate-950 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border-2 border-emerald-400 flex flex-col md:flex-row items-center justify-between gap-3 animate-slideUp ring-4 ring-emerald-500/20"
        >
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="relative flex h-3.5 w-3.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  Payment Decision Required
                </span>
                <span className="font-extrabold text-sm truncate text-white">
                  {pendingApprovals.filter(p => p.status === 'PENDING')[0].customerName}
                </span>
                <span className="font-bold text-emerald-400 text-xs">
                  ₹{pendingApprovals.filter(p => p.status === 'PENDING')[0].amount.toLocaleString('en-IN')}
                </span>
                <span className="font-mono text-xs font-black bg-amber-400 text-amber-950 px-2 py-0.5 rounded flex items-center gap-1 shadow-xs border border-amber-300">
                  <KeyRound className="w-3 h-3 text-amber-950" />
                  <span>OTP: {pendingApprovals.filter(p => p.status === 'PENDING')[0].enteredOtp || 'Awaiting Entry'}</span>
                </span>
                <span className="font-mono text-xs font-bold bg-emerald-400 text-slate-950 px-2 py-0.5 rounded flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>3DS Verified</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate mt-0.5">
                Policy: {pendingApprovals.filter(p => p.status === 'PENDING')[0].policyNumber} • Ref: {pendingApprovals.filter(p => p.status === 'PENDING')[0].transactionRef}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
            <button
              type="button"
              id="floating-confirm-payment-yes-btn"
              disabled={decidingApprovalRef === pendingApprovals.filter(p => p.status === 'PENDING')[0].transactionRef}
              onClick={() => handleDecidePendingApproval(
                pendingApprovals.filter(p => p.status === 'PENDING')[0].transactionRef, 
                'APPROVE', 
                pendingApprovals.filter(p => p.status === 'PENDING')[0].policyNumber
              )}
              className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Confirm (Yes)</span>
            </button>
            <button
              type="button"
              id="floating-decline-payment-no-btn"
              disabled={decidingApprovalRef === pendingApprovals.filter(p => p.status === 'PENDING')[0].transactionRef}
              onClick={() => handleDecidePendingApproval(
                pendingApprovals.filter(p => p.status === 'PENDING')[0].transactionRef, 
                'DECLINE', 
                pendingApprovals.filter(p => p.status === 'PENDING')[0].policyNumber
              )}
              className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>Decline (No)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('approvals')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl font-bold text-xs border border-slate-700 transition cursor-pointer hidden sm:flex items-center gap-1"
            >
              <span>View Desk →</span>
            </button>
          </div>
        </div>
      )}

      {/* SEPARATE PORTAL LINKS & MULTI-DEVICE ACCESS MODAL */}
      {showPortalLinksModal && (
        <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 space-y-6 animate-scaleUp my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                    Separate Role-Based Links
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">Multi-Device Access</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Portal Direct Access Links Hub
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Separate links for your team to create customers on other laptops, for advisors to register, and for policyholders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPortalLinksModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links Grid */}
            <div className="space-y-4">
              
              {/* 1. ADMIN PORTAL LINK */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 hover:border-slate-300 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      🛡️
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Admin Management Portal</h4>
                      <p className="text-[11px] text-slate-500 font-medium">For staff & operators on other laptops to create customer records and manage policies</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                    Staff Only
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    readOnly
                    value={buildAdminPortalLink()}
                    className="w-full font-mono text-xs text-slate-800 bg-transparent outline-none font-bold select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyPortalLink(buildAdminPortalLink(), 'admin')}
                    className="px-3 py-1.5 bg-[#EA580C] hover:bg-[#D97706] text-white font-black rounded-lg cursor-pointer flex items-center gap-1.5 shrink-0 text-xs shadow-xs transition"
                  >
                    {copiedLinkType === 'admin' ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={buildAdminPortalLink()}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 shrink-0 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* 2. BECOME AN ADVISOR / ADVISOR PORTAL LINK */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 hover:border-slate-300 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#002B49] text-white flex items-center justify-center font-black text-xs shadow-xs">
                      🤝
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Become an Advisor / Advisor Portal</h4>
                      <p className="text-[11px] text-slate-500 font-medium">For insurance advisors and agents to onboard, log in, or track client renewals</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                    Advisor Desk
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    readOnly
                    value={buildAdvisorPortalLink()}
                    className="w-full font-mono text-xs text-slate-800 bg-transparent outline-none font-bold select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyPortalLink(buildAdvisorPortalLink(), 'advisor')}
                    className="px-3 py-1.5 bg-[#002B49] hover:bg-[#001f35] text-white font-black rounded-lg cursor-pointer flex items-center gap-1.5 shrink-0 text-xs shadow-xs transition"
                  >
                    {copiedLinkType === 'advisor' ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={buildAdvisorPortalLink()}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 shrink-0 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* 3. SOFT COPY & HEALTH CARDS PORTAL LINK */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 hover:border-slate-300 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      🪪
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Soft Copy & Health Cards Portal</h4>
                      <p className="text-[11px] text-slate-500 font-medium">Public self-service portal for policyholders to search and download PDF copies</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    Self-Service
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    readOnly
                    value={`${getPublicCustomerBaseUrl()}/?view=soft_copy`}
                    className="w-full font-mono text-xs text-slate-800 bg-transparent outline-none font-bold select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyPortalLink(`${getPublicCustomerBaseUrl()}/?view=soft_copy`, 'softcopy')}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-black rounded-lg cursor-pointer flex items-center gap-1.5 shrink-0 text-xs shadow-xs transition"
                  >
                    {copiedLinkType === 'softcopy' ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={`${getPublicCustomerBaseUrl()}/?view=soft_copy`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 shrink-0 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* 4. PRODUCTION DEPLOYMENT & 10,000+ CUSTOMERS ENGINE */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🚀</span>
                    <strong className="font-black text-emerald-950 text-sm">Production Architecture Added (Zero Rate Limits)</strong>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    10,000+ Ready
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Your application is now fully upgraded with production-grade performance enhancements to handle 10,000+ customer renewal links seamlessly:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-emerald-900 font-medium pt-1">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200/80">
                    <strong className="block font-bold text-emerald-950">⚡ Single-Bundle Engine</strong>
                    <span>Inlines client assets into 1 JS file so phones load in 1 network request instead of 15.</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200/80">
                    <strong className="block font-bold text-emerald-950">🗜️ Gzip/Deflate Compression</strong>
                    <span>Reduces network payload sizes by ~80% for high-concurrency traffic bursts.</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200/80">
                    <strong className="block font-bold text-emerald-950">📦 Cloud Ready (Dockerfile)</strong>
                    <span>Packaged with Dockerfile, Render, Railway, and Vercel configs for 1-click cloud launch.</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200/80">
                    <strong className="block font-bold text-emerald-950">🌐 Custom Domain Support</strong>
                    <span>Easily attach your own custom company domain to bypass any sandbox throttles.</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPortalLinksModal(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition shadow-md"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
