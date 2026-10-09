import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  RefreshCw, 
  FileText, 
  ExternalLink, 
  Copy, 
  Check, 
  ChevronUp, 
  ChevronDown, 
  MessageSquare,
  CreditCard
} from 'lucide-react';
import { EmailSender, SendEmailPayload } from '../types/insurance';
import { apiGetEmailSenders, apiSendCustomerEmail } from '../services/apiService';
import { generateSoftCopyLink, generateRenewalLink } from '../services/storageService';
import { buildPublicRenewalLink, buildPublicSoftCopyLink } from '../utils/urlUtils';

export interface SharePolicyData {
  token: string;
  softCopyToken?: string;
  customerName: string;
  email: string;
  mobileNumber?: string;
  policyNumber: string;
  policyName?: string;
  dueDate?: string;
  sumInsured?: number;
  finalPayable?: number;
  validityHours?: number;
}

export interface SharePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SharePolicyData | null;
  initialTab?: 'renewal' | 'soft_copy';
  senders?: EmailSender[];
  onEmailSent?: () => void;
}

export const SharePolicyModal: React.FC<SharePolicyModalProps> = ({
  isOpen,
  onClose,
  data,
  initialTab = 'renewal',
  senders: propSenders,
  onEmailSent
}) => {
  const [activeTab, setActiveTab] = useState<'renewal' | 'soft_copy'>(initialTab);
  const [emailSenders, setEmailSenders] = useState<EmailSender[]>(propSenders || []);
  const [selectedSenderEmail, setSelectedSenderEmail] = useState<string>('customersupport@icicilombard-renewal.com');
  const [recipientEmailInput, setRecipientEmailInput] = useState<string>('');
  const [emailSubjectInput, setEmailSubjectInput] = useState<string>('');
  const [customEmailNote, setCustomEmailNote] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailDispatchResult, setEmailDispatchResult] = useState<{
    success: boolean;
    message: string;
    refId?: string;
    sentAt?: string;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);
  const [copiedRichTemplate, setCopiedRichTemplate] = useState<boolean>(false);
  const [showEmailTemplatePreview, setShowEmailTemplatePreview] = useState<boolean>(true);

  // Load senders if not passed via props
  useEffect(() => {
    if (propSenders && propSenders.length > 0) {
      setEmailSenders(propSenders);
    } else {
      apiGetEmailSenders()
        .then(list => {
          if (list && list.length > 0) {
            setEmailSenders(list);
          }
        })
        .catch(() => {});
    }
  }, [propSenders]);

  // Sync state when data or modal opens
  useEffect(() => {
    if (!data) return;

    setActiveTab(initialTab);
    setRecipientEmailInput(data.email || '');
    setCustomEmailNote('');
    setEmailDispatchResult(null);

    // Pick default verified sender
    const verifiedSenders = emailSenders.filter(s => s.status === 'Verified');
    const defaultSender = verifiedSenders.find(s => s.isDefault) || verifiedSenders[0];
    if (defaultSender) {
      setSelectedSenderEmail(defaultSender.email);
    } else {
      setSelectedSenderEmail('customersupport@icicilombard-renewal.com');
    }

    if (initialTab === 'soft_copy') {
      setEmailSubjectInput(`Download Policy Soft Copy & Health Cards - #${data.policyNumber}`);
    } else {
      setEmailSubjectInput(`Action Required: Health Insurance Policy Renewal Notice - #${data.policyNumber}`);
    }
  }, [data, initialTab, emailSenders]);

  // Update subject when switching tabs
  const handleTabChange = (tab: 'renewal' | 'soft_copy') => {
    setActiveTab(tab);
    setEmailDispatchResult(null);
    if (!data) return;

    if (tab === 'soft_copy') {
      setEmailSubjectInput(`Download Policy Soft Copy & Health Cards - #${data.policyNumber}`);
      // Ensure soft copy token exists
      if (!data.softCopyToken) {
        const gen = generateSoftCopyLink(data.policyNumber, data.validityHours || 24);
        if (gen) {
          data.softCopyToken = gen.token;
        }
      }
    } else {
      setEmailSubjectInput(`Action Required: Health Insurance Policy Renewal Notice - #${data.policyNumber}`);
      if (!data.token) {
        const gen = generateRenewalLink(data.policyNumber, undefined, data.validityHours || 24);
        if (gen) {
          data.token = gen.token;
        }
      }
    }
  };

  if (!isOpen || !data) return null;

  const isSoftCopy = activeTab === 'soft_copy';

  const currentUrl = isSoftCopy
    ? buildPublicSoftCopyLink(data.softCopyToken || data.token, data.policyNumber)
    : buildPublicRenewalLink(data.token, data.policyNumber, data.selectedTenure);

  const actionLabel = isSoftCopy ? 'Download Policy & Health Cards' : 'Review & Renew Policy Online';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSendOfficialEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    const recipient = recipientEmailInput.trim() || data.email;
    if (!recipient || !recipient.includes('@')) {
      alert('Please enter a valid recipient email address.');
      return;
    }

    if (!selectedSenderEmail) {
      alert('Please select an authorized verified sender address.');
      return;
    }

    setIsSendingEmail(true);
    setEmailDispatchResult(null);

    const emailPayload: SendEmailPayload = {
      senderEmail: selectedSenderEmail,
      recipientEmail: recipient,
      customerName: data.customerName,
      policyNumber: data.policyNumber,
      subject: emailSubjectInput.trim() || (isSoftCopy 
        ? `ICICI Lombard Policy Soft Copy - #${data.policyNumber}` 
        : `ICICI Lombard Policy Renewal Notice - #${data.policyNumber}`),
      customMessage: customEmailNote.trim() || undefined,
      emailType: isSoftCopy ? 'Policy Quotation' : 'Renewal Link',
      linkType: isSoftCopy ? 'soft_copy' : 'renewal',
      renewalToken: data.token,
      softCopyToken: data.softCopyToken,
      linkUrl: currentUrl,
      policyName: data.policyName || 'Complete Health Insurance',
      sumInsured: data.sumInsured || 500000,
      finalPayable: data.finalPayable || 0,
      dueDate: data.dueDate || 'Immediate'
    };

    try {
      const res = await apiSendCustomerEmail(emailPayload);
      if (res.success && res.record) {
        setEmailDispatchResult({
          success: true,
          message: `${isSoftCopy ? 'Policy soft copy download' : 'Renewal payment'} link email dispatched successfully.`,
          refId: res.record.messageReferenceId,
          sentAt: res.record.sentAt
        });
        if (onEmailSent) onEmailSent();
      } else {
        setEmailDispatchResult({
          success: false,
          message: 'Failed to dispatch email. Please check sender authorization or SMTP configuration.'
        });
      }
    } catch (err: any) {
      setEmailDispatchResult({
        success: false,
        message: err.message || 'Error occurred while connecting to the email service.'
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const plainTextBody = isSoftCopy
    ? `Dear ${data.customerName},\n\nYour official ICICI Lombard Health Insurance policy documents and digital health cards are ready for immediate download.\n\nPolicy Number: ${data.policyNumber}\nPlan: ${data.policyName || 'Complete Health Insurance'}\nSum Insured: ₹${(data.sumInsured || 500000).toLocaleString('en-IN')}\n\nDownload Link:\n${currentUrl}\n\n${customEmailNote ? `Agent Note: ${customEmailNote}\n\n` : ''}Best Regards,\nICICI Lombard General Insurance Co.`
    : `Dear ${data.customerName},\n\nYour ICICI Lombard Health Insurance policy renewal is now due. Please review your renewal details and pay online:\n\nPolicy Number: ${data.policyNumber}\nPlan: ${data.policyName || 'Complete Health Insurance'}\nSum Insured: ₹${(data.sumInsured || 500000).toLocaleString('en-IN')}\nRenewal Due Date: ${data.dueDate || 'Immediate'}\nPayable Premium: ₹${(data.finalPayable || 0).toLocaleString('en-IN')}\n\nOnline Renewal Link:\n${currentUrl}\n\n${customEmailNote ? `Agent Note: ${customEmailNote}\n\n` : ''}Warm Regards,\nICICI Lombard Policy Renewals Desk`;

  const richEmailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #00264A; color: #ffffff; padding: 18px 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 0.5px;">ICICI Lombard General Insurance</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: #fed7aa;">${isSoftCopy ? 'Official Policy Documents & Digital Soft Copy' : 'Official Policy Renewal Notice & Payment'}</p>
      </div>
      <div style="padding: 24px; background-color: #ffffff; color: #1e293b; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0 0 14px; font-weight: bold;">Dear ${data.customerName},</p>
        ${customEmailNote ? `<div style="background-color: #fffbeb; border-left: 4px solid #ea580c; padding: 10px 14px; margin: 14px 0; border-radius: 4px; font-size: 13px; color: #92400e;">${customEmailNote}</div>` : ''}
        <p style="margin: 0 0 18px; color: #334155;">${isSoftCopy ? 'Your official ICICI Lombard Health Insurance policy schedule and digital e-cards are available for download.' : 'Your ICICI Lombard Health Insurance policy is due for renewal. Please review your policy details below and renew online.'}</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 13px;">
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; color: #64748b;">Policy Number:</td><td style="padding: 10px; font-weight: bold; color: #0f172a; text-align: right;">${data.policyNumber}</td></tr>
          <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; color: #64748b;">Plan:</td><td style="padding: 10px; font-weight: bold; color: #0f172a; text-align: right;">${data.policyName || 'Complete Health Insurance'}</td></tr>
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; color: #64748b;">Sum Insured:</td><td style="padding: 10px; font-weight: bold; color: #0f172a; text-align: right;">₹${(data.sumInsured || 500000).toLocaleString('en-IN')}</td></tr>
          ${!isSoftCopy ? `<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; color: #64748b;">Payable Premium:</td><td style="padding: 10px; font-weight: bold; color: #ea580c; text-align: right; font-size: 15px;">₹${(data.finalPayable || 0).toLocaleString('en-IN')}</td></tr>` : ''}
          <tr style="background-color: #f8fafc;"><td style="padding: 10px; color: #64748b;">${isSoftCopy ? 'Status:' : 'Due Date:'}</td><td style="padding: 10px; font-weight: bold; color: #0f172a; text-align: right;">${isSoftCopy ? 'Ready for Download' : (data.dueDate || 'Immediate')}</td></tr>
        </table>
        <div style="text-align: center; margin: 26px 0;">
          <a href="${currentUrl}" target="_blank" style="background-color: #ea580c; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">${actionLabel}</a>
        </div>
        <p style="margin: 16px 0 0; font-size: 11px; color: #64748b; text-align: center;">Direct Link: <a href="${currentUrl}" style="color: #1d4ed8; word-break: break-all;">${currentUrl}</a></p>
      </div>
      <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
        ICICI Lombard General Insurance Company Limited • IRDAI Reg. No. 115
      </div>
    </div>
  `;

  const handleCopyRichHtml = async () => {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
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
      console.warn('ClipboardItem copy failed:', e);
    }
    navigator.clipboard.writeText(plainTextBody);
    setCopiedRichTemplate(true);
    setTimeout(() => setCopiedRichTemplate(false), 3000);
  };

  const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmailInput.trim() || data.email)}&su=${encodeURIComponent(emailSubjectInput || (isSoftCopy ? `ICICI Lombard Policy Soft Copy - #${data.policyNumber}` : `ICICI Lombard Policy Renewal Notice - #${data.policyNumber}`))}&body=${encodeURIComponent(plainTextBody)}`;

  const waText = isSoftCopy
    ? `Hello ${data.customerName}, your ICICI Lombard Health Insurance Policy #${data.policyNumber} soft copy and health cards are available. Click here to download: ${currentUrl}`
    : `Hello ${data.customerName}, your ICICI Lombard Health Insurance Policy #${data.policyNumber} renewal premium of ₹${(data.finalPayable || 0).toLocaleString('en-IN')} is ready. Click link to review & pay online: ${currentUrl}`;

  const smsText = isSoftCopy
    ? `Dear ${data.customerName}, download your ICICI Lombard Health Insurance Policy #${data.policyNumber} soft copy and e-cards online: ${currentUrl}`
    : `Dear ${data.customerName}, your policy #${data.policyNumber} renewal is due. Pay ₹${(data.finalPayable || 0).toLocaleString('en-IN')} online: ${currentUrl}`;

  const verifiedList = emailSenders.filter(s => s.status === 'Verified');

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#00264A] to-[#0A3D62] text-white p-5 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#EA580C]" />
              <span>{isSoftCopy ? 'Share Policy Soft Copy & Health Cards Link' : 'Share Policy Renewal & Payment Link'}</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              {data.customerName} • Policy #{data.policyNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Link Type Selector Tabs */}
          <div className="flex border-b border-slate-200 gap-2">
            <button
              type="button"
              onClick={() => handleTabChange('renewal')}
              className={`pb-2.5 px-4 font-extrabold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'renewal'
                  ? 'border-[#EA580C] text-[#EA580C]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Renewal & Payment Link</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('soft_copy')}
              className={`pb-2.5 px-4 font-extrabold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'soft_copy'
                  ? 'border-[#00264A] text-[#00264A]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Soft Copy Download Link</span>
            </button>
          </div>

          {/* Generated URL Quick View & Copy */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-700">
                {isSoftCopy ? 'Direct Soft Copy Link:' : 'Direct Renewal Payment Link:'}
              </span>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Active ({data.validityHours || 24}h Validity)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="w-full bg-white px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 text-slate-800 outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-[#00264A] hover:bg-[#0A3D62] text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
              </button>
              <a
                href={currentUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition cursor-pointer shrink-0"
                title="Open Link in New Tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* 1. Official Email Dispatch Section */}
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

            {/* Email Dispatch Form */}
            <form onSubmit={handleSendOfficialEmail} className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3.5">
              
              {/* Send From Dropdown */}
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
                  {verifiedList.length === 0 ? (
                    <>
                      <option value="customersupport@icicilombard-renewal.com">
                        customersupport@icicilombard-renewal.com — ICICI Lombard Renewal Desk [Verified]
                      </option>
                      <option value="renewals@mydomain.com">
                        renewals@mydomain.com — ICICI Lombard Policy Renewals Desk [Verified]
                      </option>
                      <option value="support@mydomain.com">
                        support@mydomain.com — ICICI Lombard Customer Support [Verified]
                      </option>
                      <option value="payments@mydomain.com">
                        payments@mydomain.com — ICICI Lombard Payment Processing [Verified]
                      </option>
                    </>
                  ) : (
                    verifiedList.map(s => (
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
                    Recipient Email Address * <span className="text-slate-400 font-normal">(Editable)</span>
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
                    placeholder={isSoftCopy ? "Download Policy Soft Copy" : "Action Required: Policy Renewal Notice"}
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
                  placeholder={isSoftCopy 
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
                <div className={`p-3.5 rounded-xl border space-y-1 animate-fadeIn ${
                  emailDispatchResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center gap-1.5 font-black text-xs">
                    {emailDispatchResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                    <span>{emailDispatchResult.message}</span>
                  </div>
                  {emailDispatchResult.refId && (
                    <div className="text-[11px] text-emerald-700 pl-5.5 font-mono">
                      Ref ID: <span className="font-bold">{emailDispatchResult.refId}</span> • Sent: {emailDispatchResult.sentAt}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* 2. Copyable ICICI Lombard Email Template (For Customers) */}
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
                <div className="bg-[#00264A] text-white p-3.5 text-center">
                  <div className="font-extrabold text-sm text-white tracking-wide">ICICI Lombard General Insurance Company</div>
                  <div className="text-[11px] text-orange-200 font-semibold">
                    {isSoftCopy ? 'Official Policy Documents & Digital Soft Copy' : 'Official Policy Renewal Notice & Payment'}
                  </div>
                </div>

                <div className="p-4 space-y-3 bg-slate-50/50">
                  <div>
                    <p className="font-bold text-slate-900">Dear {data.customerName},</p>
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

                  {/* Policy Summary Table */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 font-sans">
                    <div className="flex justify-between text-[11px]"><span className="text-slate-500">Policy Number:</span><strong className="text-slate-900">{data.policyNumber}</strong></div>
                    <div className="flex justify-between text-[11px]"><span className="text-slate-500">Plan:</span><strong className="text-slate-900">{data.policyName || 'Complete Health Insurance'}</strong></div>
                    <div className="flex justify-between text-[11px]"><span className="text-slate-500">Sum Insured:</span><strong className="text-slate-900">₹{(data.sumInsured || 500000).toLocaleString('en-IN')}</strong></div>
                    {!isSoftCopy && (
                      <div className="flex justify-between text-[11px]"><span className="text-slate-500">Payable Premium:</span><strong className="text-[#EA580C] font-black text-xs">₹{(data.finalPayable || 0).toLocaleString('en-IN')}</strong></div>
                    )}
                    <div className="flex justify-between text-[11px]"><span className="text-slate-500">{isSoftCopy ? 'Status:' : 'Due Date:'}</span><strong className="text-slate-900">{isSoftCopy ? 'Ready for Download' : (data.dueDate || 'Immediate')}</strong></div>
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

                  <div className="border-t border-slate-200 pt-2 text-[10px] text-center text-slate-500">
                    ICICI Lombard General Insurance Company Limited • IRDAI Reg. No. 115
                  </div>
                </div>
              </div>
            )}

            {/* Template Action Buttons */}
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

          {/* 3. Share via WhatsApp or SMS */}
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                3. Share via WhatsApp or SMS
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

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-[#00264A] hover:bg-[#0A3D62] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
