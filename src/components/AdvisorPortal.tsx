import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Share2, 
  Send, 
  RefreshCw, 
  LogOut, 
  Home, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  CreditCard, 
  Search, 
  UserPlus, 
  Clock, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Plus,
  Mail
} from 'lucide-react';
import { CustomerPolicy, RenewalLinkRecord, SoftCopyLinkRecord } from '../types/insurance';
import { CustomerCreationForm } from './CustomerCreationForm';
import { SharePolicyModal, SharePolicyData } from './SharePolicyModal';
import { apiGetCustomers } from '../services/apiService';
import { buildPublicRenewalLink, buildPublicSoftCopyLink } from '../utils/urlUtils';
import { 
  getCustomers, 
  generateRenewalLink, 
  generateSoftCopyLink, 
  createCustomerPolicy,
  getRenewalLinks,
  getSoftCopyLinks,
  syncWithCentralServer
} from '../services/storageService';
import { getTenurePricingDetails } from '../utils/premiumCalculation';

interface AdvisorPortalProps {
  onLogout: () => void;
  onBackToHome: () => void;
  onOpenGeneratedLink?: (token: string, type: 'renewal' | 'softcopy') => void;
}

interface CreatedLinkItem {
  id: string;
  type: 'renewal' | 'softcopy';
  token: string;
  url: string;
  customerName: string;
  policyNumber: string;
  email?: string;
  mobileNumber?: string;
  policyName?: string;
  sumInsured?: number;
  finalPayable?: number;
  dueDate?: string;
  generatedAt: string;
  validityHours: number;
  grossAmount?: number;
  discountAmount?: number;
  discountPct?: number;
  selectedTenure?: number;
  customDiscountAmount?: number;
}

export const AdvisorPortal: React.FC<AdvisorPortalProps> = ({ 
  onLogout, 
  onBackToHome,
  onOpenGeneratedLink
}) => {
  const [linkType, setLinkType] = useState<'renewal' | 'softcopy'>('renewal');
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');

  // Existing customer search
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerPolicy[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerPolicy | null>(null);

  // New customer inputs
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newPolicyNumber, setNewPolicyNumber] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPlanName, setNewPlanName] = useState('Complete Health Insurance');
  const [newSumInsured, setNewSumInsured] = useState('500000');
  const [newPremium, setNewPremium] = useState('11500');

  // Link options
  const [validityHours, setValidityHours] = useState<number>(24);

  // Status & output
  const [isGenerating, setIsGenerating] = useState(false);
  const [latestCreatedLink, setLatestCreatedLink] = useState<CreatedLinkItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showComprehensiveModal, setShowComprehensiveModal] = useState(false);

  // Email dispatch modal state (feature parity with Admin Dashboard)
  const [shareModalData, setShareModalData] = useState<SharePolicyData | null>(null);
  const [shareModalInitialTab, setShareModalInitialTab] = useState<'renewal' | 'soft_copy'>('renewal');
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const handleOpenShareEmailModal = (linkItem: CreatedLinkItem) => {
    const cust = customers.find(c => c.policyNumber.toUpperCase() === linkItem.policyNumber.toUpperCase()) || selectedCustomer;
    const selTenure = linkItem.selectedTenure || cust?.selectedTenure || 1;
    const pricing = cust
      ? getTenurePricingDetails(cust, selTenure, cust.addOnRiders?.filter(r => (cust.selectedAddOnIds || []).includes(r.id)) || [], cust.selectedAddOnIds || [])
      : null;

    const grossAmount = linkItem.grossAmount || pricing?.gross || cust?.grossTenurePrices?.[selTenure as 1|2|3] || (linkItem.finalPayable || 12000);
    const finalPayable = linkItem.finalPayable || pricing?.net || cust?.tenurePrices?.[selTenure as 1|2|3] || (cust?.baseAnnualPremium || 12000);
    const discountAmount = linkItem.discountAmount !== undefined && linkItem.discountAmount > 0
      ? linkItem.discountAmount
      : (pricing?.discAmt || Math.max(0, grossAmount - finalPayable));
    const discountPct = linkItem.discountPct || pricing?.discPct || (grossAmount > 0 && discountAmount > 0 ? Math.round((discountAmount / grossAmount) * 100) : (cust?.loyaltyNcbDiscountPct || 10));
    const customDisc = linkItem.customDiscountAmount || cust?.adminCustomDiscountAmount || 0;

    setShareModalData({
      token: linkItem.type === 'renewal' ? linkItem.token : '',
      softCopyToken: linkItem.type === 'softcopy' ? linkItem.token : undefined,
      customerName: linkItem.customerName,
      policyNumber: linkItem.policyNumber,
      email: linkItem.email || cust?.email || '',
      mobileNumber: linkItem.mobileNumber || cust?.mobileNumber || '',
      policyName: linkItem.policyName || cust?.policyName || 'Complete Health Insurance',
      sumInsured: linkItem.sumInsured || cust?.totalSumInsured || cust?.baseSumInsured || 500000,
      finalPayable,
      grossAmount,
      discountAmount,
      discountPct,
      selectedTenure: selTenure,
      customDiscountAmount: customDisc,
      dueDate: linkItem.dueDate || cust?.renewalDueDate || cust?.previousPolicyEndDate || 'Immediate',
      validityHours: linkItem.validityHours || 24
    });
    setShareModalInitialTab(linkItem.type === 'renewal' ? 'renewal' : 'soft_copy');
    setShowShareModal(true);
  };

  const handleComprehensiveSuccess = (
    createdCustomer: CustomerPolicy, 
    linkToken: string, 
    createdLinkType: 'renewal' | 'softcopy', 
    fullUrl: string
  ) => {
    const selTenure = createdCustomer.selectedTenure || 1;
    const pricing = getTenurePricingDetails(
      createdCustomer, 
      selTenure, 
      createdCustomer.addOnRiders?.filter(r => (createdCustomer.selectedAddOnIds || []).includes(r.id)) || [], 
      createdCustomer.selectedAddOnIds || []
    );
    const grossAmount = pricing.gross;
    const finalPayable = pricing.net;
    const discountAmount = pricing.discAmt;
    const discountPct = pricing.discPct;
    const customDisc = Number(createdCustomer.adminCustomDiscountAmount || 0);

    const newLinkItem: CreatedLinkItem = {
      id: `adv-link-${Date.now()}`,
      type: createdLinkType,
      token: linkToken,
      url: fullUrl,
      customerName: createdCustomer.customerName,
      policyNumber: createdCustomer.policyNumber,
      email: createdCustomer.email,
      mobileNumber: createdCustomer.mobileNumber,
      policyName: createdCustomer.policyName || 'Complete Health Insurance',
      sumInsured: createdCustomer.totalSumInsured || createdCustomer.baseSumInsured || 500000,
      finalPayable: finalPayable > 0 ? finalPayable : Number(createdCustomer.baseAnnualPremium || 12000),
      grossAmount,
      discountAmount,
      discountPct,
      selectedTenure: selTenure,
      customDiscountAmount: customDisc,
      dueDate: createdCustomer.renewalDueDate || 'Immediate',
      generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      validityHours: 24
    };

    setLatestCreatedLink(newLinkItem);
    setSessionLinks(prev => [newLinkItem, ...prev]);
    loadCustomerList();
    setShowComprehensiveModal(false);
    setSelectedCustomer(createdCustomer);
    setCustomerMode('existing');
    setCopiedId(newLinkItem.id);
    setNotification(`New customer ${createdCustomer.customerName} registered & saved in admin database!`);
    
    // Smooth scroll up to see link card
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Advisor link history in this session
  const [sessionLinks, setSessionLinks] = useState<CreatedLinkItem[]>(() => {
    try {
      const saved = sessionStorage.getItem('advisor_created_links_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('advisor_created_links_v1', JSON.stringify(sessionLinks));
    } catch {}
  }, [sessionLinks]);

  // Load customer list for search and ensure persistent sync with server
  const loadCustomerList = async () => {
    try {
      const custs = await apiGetCustomers();
      if (custs && custs.length > 0) {
        setCustomers(custs);
        return;
      }
    } catch {}
    setCustomers(getCustomers());
  };

  useEffect(() => {
    loadCustomerList();
    syncWithCentralServer().then(() => {
      loadCustomerList();
    });
  }, []);

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.customerName?.toLowerCase().includes(q) ||
      c.policyNumber?.toLowerCase().includes(q) ||
      c.mobileNumber?.includes(q)
    );
  }).slice(0, 5);

  const handleSelectCustomer = (c: CustomerPolicy) => {
    setSelectedCustomer(c);
    setSearchQuery('');
  };

  const handleAutoGeneratePolicyNo = () => {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    setNewPolicyNumber(`IL-HLTH-${randomDigits}`);
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setNotification('Link copied to clipboard!');
    setTimeout(() => {
      setCopiedId(null);
      setNotification(null);
    }, 2500);
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setNotification(null);

    try {
      let targetCustomer: CustomerPolicy | null = null;
      let targetPolicyNumber = '';
      let targetCustomerName = '';
      let targetMobile = '';

      if (customerMode === 'existing') {
        if (!selectedCustomer) {
          alert('Please search and select a customer first.');
          setIsGenerating(false);
          return;
        }
        targetCustomer = selectedCustomer;
        targetPolicyNumber = selectedCustomer.policyNumber;
        targetCustomerName = selectedCustomer.customerName;
        targetMobile = selectedCustomer.mobileNumber;
      } else {
        // Create new customer first
        if (!newCustomerName.trim()) {
          alert('Please enter customer full name.');
          setIsGenerating(false);
          return;
        }

        const polNo = newPolicyNumber.trim() || `IL-HLTH-${Math.floor(100000 + Math.random() * 900000)}`;
        const mobile = newMobile.trim() || '9876543210';
        const sumInsured = Number(newSumInsured) || 500000;
        const premium = Number(newPremium) || 12000;

        const { policy: newCust } = await createCustomerPolicy({
          customerName: newCustomerName.trim(),
          policyNumber: polNo,
          mobileNumber: mobile,
          email: newEmail.trim() || `${newCustomerName.toLowerCase().replace(/\s+/g, '')}@example.com`,
          policyName: newPlanName,
          baseSumInsured: sumInsured,
          baseAnnualPremium: premium,
          policyStartDate: '2024-03-01',
          previousPolicyEndDate: '2025-03-01',
          policyStatus: 'Expiring Soon'
        });

        targetCustomer = newCust;
        targetPolicyNumber = newCust.policyNumber;
        targetCustomerName = newCust.customerName;
        targetMobile = newCust.mobileNumber;

        // Refresh customers list from server & cache
        await loadCustomerList();
      }

      // Generate link based on selected type
      let token = '';
      let fullUrl = '';

      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      const selTenure = targetCustomer?.selectedTenure || 1;
      const pricing = targetCustomer
        ? getTenurePricingDetails(
            targetCustomer, 
            selTenure, 
            targetCustomer.addOnRiders?.filter(r => (targetCustomer.selectedAddOnIds || []).includes(r.id)) || [], 
            targetCustomer.selectedAddOnIds || []
          )
        : null;

      const grossAmount = pricing?.gross || targetCustomer?.grossTenurePrices?.[selTenure as 1|2|3] || (customerMode === 'new' ? Number(newPremium) : 12000);
      const finalPayable = pricing?.net || targetCustomer?.tenurePrices?.[selTenure as 1|2|3] || (customerMode === 'new' ? Number(newPremium) : 12000);
      const discountAmount = pricing?.discAmt || Math.max(0, grossAmount - finalPayable);
      const discountPct = pricing?.discPct || (grossAmount > 0 && discountAmount > 0 ? Math.round((discountAmount / grossAmount) * 100) : (targetCustomer?.loyaltyNcbDiscountPct || 10));
      const customDisc = Number(targetCustomer?.adminCustomDiscountAmount || 0);

      const tenureParam = selTenure > 1 ? `&tenure=${selTenure}` : '';
      const discParam = customDisc > 0 ? `&disc=${customDisc}` : (discountAmount > 0 ? `&disc=${discountAmount}` : '');

      if (linkType === 'renewal') {
        const linkRec = generateRenewalLink(targetPolicyNumber, undefined, validityHours);
        if (linkRec) {
          token = linkRec.token;
        } else {
          token = `RNW-${targetPolicyNumber.replace(/[^A-Z0-9]/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        fullUrl = buildPublicRenewalLink(token, targetPolicyNumber, selTenure, customDisc || discountAmount);
      } else {
        const softRec = generateSoftCopyLink(targetPolicyNumber, validityHours);
        if (softRec) {
          token = softRec.token;
        } else {
          token = `SFT-${targetPolicyNumber.replace(/[^A-Z0-9]/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        fullUrl = buildPublicSoftCopyLink(token, targetPolicyNumber);
      }

      const newLinkItem: CreatedLinkItem = {
        id: `adv-link-${Date.now()}`,
        type: linkType,
        token,
        url: fullUrl,
        customerName: targetCustomerName,
        policyNumber: targetPolicyNumber,
        email: targetCustomer?.email || (customerMode === 'new' ? newEmail.trim() : ''),
        mobileNumber: targetMobile,
        policyName: targetCustomer?.policyName || newPlanName,
        sumInsured: targetCustomer?.totalSumInsured || targetCustomer?.baseSumInsured || Number(newSumInsured) || 500000,
        finalPayable: finalPayable > 0 ? finalPayable : grossAmount,
        grossAmount,
        discountAmount,
        discountPct,
        selectedTenure: selTenure,
        customDiscountAmount: customDisc,
        dueDate: targetCustomer?.renewalDueDate || targetCustomer?.previousPolicyEndDate || 'Immediate',
        generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        validityHours
      };

      setLatestCreatedLink(newLinkItem);
      setSessionLinks(prev => [newLinkItem, ...prev]);

      // Populate share modal data ready for 1-click email sending
      setShareModalData({
        token: linkType === 'renewal' ? token : '',
        softCopyToken: linkType === 'softcopy' ? token : undefined,
        customerName: targetCustomerName,
        policyNumber: targetPolicyNumber,
        email: newLinkItem.email || '',
        mobileNumber: targetMobile,
        policyName: newLinkItem.policyName,
        sumInsured: newLinkItem.sumInsured,
        finalPayable: newLinkItem.finalPayable,
        grossAmount,
        discountAmount,
        discountPct,
        selectedTenure: selTenure,
        customDiscountAmount: customDisc,
        dueDate: newLinkItem.dueDate,
        validityHours
      });
      setShareModalInitialTab(linkType === 'renewal' ? 'renewal' : 'soft_copy');

      // Copy automatically to clipboard for convenience
      try {
        await navigator.clipboard.writeText(fullUrl);
        setCopiedId(newLinkItem.id);
        setNotification('Link generated and copied to clipboard!');
      } catch {
        setNotification('Link generated successfully!');
      }

      // Reset form fields if created in new customer mode
      if (customerMode === 'new') {
        setNewCustomerName('');
        setNewPolicyNumber('');
        setNewMobile('');
        setNewEmail('');
      }

    } catch (err: any) {
      alert('Error creating link: ' + (err.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetForAnotherLink = () => {
    setLatestCreatedLink(null);
    setSelectedCustomer(null);
    setSearchQuery('');
  };

  return (
    <div id="advisor-portal-page" className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#00264A] text-white border-b border-white/10 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EA580C] text-white flex items-center justify-center font-black shadow-md">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-white">ICICI Lombard</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Advisor Desk
                </span>
              </div>
              <p className="text-[11px] text-slate-300">Authorized Agent Portal • Link Generation Only</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="advisor-exit-home-btn"
              onClick={onBackToHome}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Customer Site</span>
            </button>
            <button
              id="advisor-logout-btn"
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Notification Banner */}
      <div className="bg-gradient-to-r from-[#003B70] to-[#00264A] text-white py-6 px-4 border-b border-blue-900">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Advisor Link Creation Desk</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Create renewal and digital policy links instantly. Once created, copy and send directly to your customer.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setShowComprehensiveModal(true)}
                className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create New Customer & Link</span>
              </button>
              <div className="flex items-center gap-2 text-xs bg-white/10 px-3 py-2 rounded-xl border border-white/15 backdrop-blur-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Permanent DB Sync • Auto Admin Backup</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Floating Notification */}
        {notification && (
          <div className="bg-emerald-600 text-white text-xs sm:text-sm font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{notification}</span>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="text-white/80 hover:text-white text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* LATEST GENERATED LINK SUCCESS CARD */}
        {latestCreatedLink && (
          <div id="latest-created-link-card" className="bg-white rounded-2xl p-6 border-2 border-emerald-500/50 shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {latestCreatedLink.type === 'renewal' ? 'Renewal Link Created!' : 'Soft Copy Link Created!'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ready to copy and share with {latestCreatedLink.customerName}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active • {latestCreatedLink.validityHours} Hours Validity
              </span>
            </div>

            {/* URL Display and Big Copy Action */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600">Generated URL Link:</label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 truncate select-all">
                  {latestCreatedLink.url}
                </div>
                <button
                  id="advisor-copy-latest-btn"
                  onClick={() => handleCopy(latestCreatedLink.url, latestCreatedLink.id)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm ${
                    copiedId === latestCreatedLink.id 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-[#EA580C] hover:bg-[#C2410C] text-white'
                  }`}
                >
                  {copiedId === latestCreatedLink.id ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                id="advisor-share-whatsapp-btn"
                href={`https://wa.me/${latestCreatedLink.mobileNumber ? '91' + latestCreatedLink.mobileNumber.replace(/\D/g, '') : ''}?text=${encodeURIComponent(
                  `Dear ${latestCreatedLink.customerName}, here is your ICICI Lombard ${
                    latestCreatedLink.type === 'renewal' ? 'Health Insurance Renewal Link' : 'Digital Policy & Health Card Link'
                  } for Policy #${latestCreatedLink.policyNumber}:\n\n${latestCreatedLink.url}\n\nValid for ${latestCreatedLink.validityHours} hours. Please click to complete.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send via WhatsApp</span>
              </a>

              <button
                id="advisor-share-email-btn"
                type="button"
                onClick={() => handleOpenShareEmailModal(latestCreatedLink)}
                className="px-4 py-2 rounded-xl bg-[#00264A] hover:bg-[#0A3D62] text-white text-xs font-bold flex items-center gap-2 transition shadow-sm cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-[#EA580C]" />
                <span>Send Link via Email</span>
              </button>

              {onOpenGeneratedLink && (
                <button
                  id="advisor-preview-link-btn"
                  onClick={() => onOpenGeneratedLink(latestCreatedLink.token, latestCreatedLink.type)}
                  className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#003B70] text-xs font-semibold flex items-center gap-1.5 transition border border-blue-200 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Link in App</span>
                </button>
              )}

              <button
                id="advisor-create-another-btn"
                onClick={handleResetForAnotherLink}
                className="ml-auto px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
              >
                + Create Another Link
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-500 flex items-center justify-between border border-slate-200/70">
              <span>Token: <strong className="font-mono text-slate-700">{latestCreatedLink.token}</strong></span>
              <span>Customer: <strong className="text-slate-700">{latestCreatedLink.customerName} ({latestCreatedLink.policyNumber})</strong></span>
              <span>Created at: {latestCreatedLink.generatedAt}</span>
            </div>
          </div>
        )}

        {/* LINK CREATION FORM (ONLY OPTION AS REQUESTED) */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
          
          <div className="p-5 sm:p-6 bg-slate-50/50 border-b border-slate-200">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-[#EA580C]" />
              <span>Create New Customer Link</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select link category, choose or enter customer details, and generate instant secure link.
            </p>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            
            {/* 1. SELECT LINK TYPE */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                1. Select Link Type *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  id="advisor-link-type-renewal"
                  onClick={() => setLinkType('renewal')}
                  className={`p-4 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                    linkType === 'renewal'
                      ? 'border-[#EA580C] bg-orange-50/50 ring-2 ring-[#EA580C]/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${linkType === 'renewal' ? 'bg-[#EA580C] text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Renewal & Payment Link</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sends customer directly to health policy renewal flow with UPI, Card, NetBanking payment.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  id="advisor-link-type-softcopy"
                  onClick={() => setLinkType('softcopy')}
                  className={`p-4 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                    linkType === 'softcopy'
                      ? 'border-[#003B70] bg-blue-50/50 ring-2 ring-[#003B70]/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${linkType === 'softcopy' ? 'bg-[#003B70] text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Soft Copy & Health Card Link</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Allows customer to verify mobile/email and instantly download policy bond & e-card.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. CUSTOMER SELECTION MODE */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Customer & Policy Selection *
                </label>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('existing')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                      customerMode === 'existing'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Search Existing Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('new')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                      customerMode === 'new'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    + Register New Customer
                  </button>
                </div>
              </div>

              {customerMode === 'existing' ? (
                <div className="space-y-3">
                  {selectedCustomer ? (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{selectedCustomer.customerName}</span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                            {selectedCustomer.policyNumber}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Mobile: {selectedCustomer.mobileNumber} • Plan: {selectedCustomer.planName || 'Health Shield'} • Premium: ₹{selectedCustomer.baseAnnualPremium?.toLocaleString('en-IN') || '11,500'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(null)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search customer by Name, Policy #, or Mobile (e.g. Ramesh, IL-HLTH-)"
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#EA580C] focus:border-transparent outline-none bg-white"
                        />
                      </div>

                      {filteredCustomers.length > 0 && (
                        <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
                          {filteredCustomers.map(cust => (
                            <button
                              key={cust.id}
                              type="button"
                              onClick={() => handleSelectCustomer(cust)}
                              className="w-full text-left p-3 hover:bg-orange-50/60 transition flex items-center justify-between cursor-pointer"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800">{cust.customerName}</p>
                                <p className="text-[11px] text-slate-500">
                                  Policy: <span className="font-mono">{cust.policyNumber}</span> • Mobile: {cust.mobileNumber}
                                </p>
                              </div>
                              <span className="text-[11px] font-semibold text-[#EA580C]">Select →</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchQuery.trim() && filteredCustomers.length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          No matching customer found. Switch to "+ Register New Customer" tab to create one.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* FULL COMPREHENSIVE CUSTOMER CREATION FORM */
                <div className="pt-2">
                  <CustomerCreationForm
                    isModal={false}
                    portalContext="advisor"
                    initialLinkType={linkType}
                    onSuccess={handleComprehensiveSuccess}
                  />
                </div>
              )}
            </div>

            {/* ONLY DISPLAY VALIDITY & SUBMIT BUTTON IN EXISTING CUSTOMER SEARCH MODE */}
            {customerMode === 'existing' && (
              <form onSubmit={handleCreateLink} className="space-y-4 pt-2 border-t border-slate-100">
                {/* 3. LINK VALIDITY PERIOD */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    3. Link Validity Duration *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: '12 Hours', value: 12 },
                      { label: '24 Hours (Recommended)', value: 24 },
                      { label: '48 Hours', value: 48 },
                      { label: '7 Days', value: 168 }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setValidityHours(opt.value)}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border transition cursor-pointer text-center ${
                          validityHours === opt.value
                            ? 'border-[#EA580C] bg-orange-50 text-[#EA580C] font-bold'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  id="advisor-submit-generate-btn"
                  type="submit"
                  disabled={isGenerating || !selectedCustomer}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#EA580C] to-[#C2410C] hover:from-[#C2410C] hover:to-[#9A3412] text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating Secure Link...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Generate Link & Copy Immediately</span>
                    </>
                  )}
                </button>
              </form>
            )}

          </div>
        </div>

        {/* ADVISOR CREATED LINKS IN THIS SESSION */}
        {sessionLinks.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-0">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Recently Created Links</h3>
                <p className="text-xs text-slate-500">Copy any created link to send to your customer</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {sessionLinks.length} Created
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {sessionLinks.map(link => (
                <div key={link.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{link.customerName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {link.policyNumber}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        link.type === 'renewal' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {link.type === 'renewal' ? 'Renewal Link' : 'Soft Copy Link'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Token: <strong className="font-mono text-slate-700">{link.token}</strong></span>
                      <span>•</span>
                      <span>Created: {link.generatedAt}</span>
                      <span>•</span>
                      <span>Valid: {link.validityHours}h</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleCopy(link.url, link.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        copiedId === link.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 hover:bg-[#EA580C] hover:text-white text-slate-700'
                      }`}
                    >
                      {copiedId === link.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleOpenShareEmailModal(link)}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-[#00264A] hover:text-white text-[#00264A] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-blue-200"
                      title="Send Link via Email"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#EA580C]" />
                      <span className="hidden sm:inline">Send Email</span>
                    </button>

                    <a
                      href={`https://wa.me/${link.mobileNumber ? '91' + link.mobileNumber.replace(/\D/g, '') : ''}?text=${encodeURIComponent(
                        `Dear ${link.customerName}, here is your ICICI Lombard link:\n${link.url}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs transition"
                      title="Send via WhatsApp"
                    >
                      <Send className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* COMPREHENSIVE CUSTOMER CREATION MODAL */}
      {showComprehensiveModal && (
        <CustomerCreationForm
          isModal={true}
          portalContext="advisor"
          initialLinkType={linkType}
          onClose={() => setShowComprehensiveModal(false)}
          onSuccess={handleComprehensiveSuccess}
        />
      )}

      {/* SHARE POLICY & EMAIL DISPATCH MODAL */}
      <SharePolicyModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        data={shareModalData}
        initialTab={shareModalInitialTab}
        onEmailSent={() => {
          setNotification('Official email dispatched successfully to customer!');
          setTimeout(() => setNotification(null), 4000);
        }}
      />

    </div>
  );
};
