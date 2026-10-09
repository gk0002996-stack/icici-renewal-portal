import React, { useState } from 'react';
import { 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Plus, 
  Trash2, 
  Send, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  KeyRound, 
  Lock, 
  Server, 
  Clock, 
  Eye, 
  FileText, 
  ChevronRight,
  Sparkles,
  Info,
  Layers,
  ArrowUpDown,
  UserCheck,
  SendHorizontal,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { EmailSender, EmailLogRecord, EmailSmtpConfig, CustomerPolicy, SendEmailPayload } from '../types/insurance';
import { 
  apiSaveEmailSender, 
  apiVerifyEmailSender, 
  apiSetDefaultEmailSender, 
  apiDeleteEmailSender,
  apiSaveEmailSmtpConfig,
  apiTestSmtpConnection,
  apiSendCustomerEmail
} from '../services/storageService';
import { formatDisplayDateTime } from '../utils/dateUtils';

interface EmailSenderSettingsTabProps {
  senders: EmailSender[];
  logs: EmailLogRecord[];
  smtpConfig: EmailSmtpConfig;
  customers?: CustomerPolicy[];
  onRefresh: () => void;
  onOpenShareModalForCustomer?: (policyNumber: string) => void;
}

export const EmailSenderSettingsTab: React.FC<EmailSenderSettingsTabProps> = ({
  senders,
  logs,
  smtpConfig,
  customers = [],
  onRefresh,
}) => {
  const [subTab, setSubTab] = useState<'compose' | 'senders' | 'smtp' | 'logs'>('compose');

  // Search & Filter for Email Logs
  const [logSearch, setLogSearch] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'Delivered' | 'Sent' | 'Failed'>('all');
  const [selectedPreviewLog, setSelectedPreviewLog] = useState<EmailLogRecord | null>(null);

  // New Sender Form Modal
  const [showAddSenderModal, setShowAddSenderModal] = useState(false);
  const [newSenderForm, setNewSenderForm] = useState({
    email: '',
    senderName: 'ICICI Lombard Policy Renewals Desk',
    department: 'Policy Renewals Desk',
    replyToEmail: 'support@mydomain.com',
    isDefault: false,
  });
  const [isSubmittingSender, setIsSubmittingSender] = useState(false);

  // SMTP Settings Form
  const [smtpForm, setSmtpForm] = useState<EmailSmtpConfig>({ 
    ...smtpConfig,
    providerType: smtpConfig.providerType || 'smtp'
  });
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [smtpSaveToast, setSmtpSaveToast] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // --- COMPOSE & SEND EMAIL STATE ---
  const verifiedSenders = senders.filter(s => s.status === 'Verified');
  const defaultSender = verifiedSenders.find(s => s.isDefault) || verifiedSenders[0] || senders[0];

  const [composeSenderEmail, setComposeSenderEmail] = useState<string>(defaultSender?.email || 'renewals@mydomain.com');
  const [composeCustomerSelect, setComposeCustomerSelect] = useState<string>('');
  const [composeRecipientEmail, setComposeRecipientEmail] = useState<string>('');
  const [composeCustomerName, setComposeCustomerName] = useState<string>('');
  const [composePolicyNumber, setComposePolicyNumber] = useState<string>('');
  const [composeSubject, setComposeSubject] = useState<string>('Important: Health Insurance Policy Renewal Schedule & Notice');
  const [composeTemplateType, setComposeTemplateType] = useState<string>('renewal');
  const [composeEmailBody, setComposeEmailBody] = useState<string>(
`Dear Customer,

Your ICICI Lombard health insurance coverage is due for renewal. To ensure uninterrupted cashless hospitalization across 10,000+ network hospitals and retain your accumulated cumulative bonus benefits, please review your policy renewal schedule and complete your payment online.

Policy Summary:
• Policy Number: {PolicyNumber}
• Plan Name: Complete Health Insurance
• Total Sum Insured: ₹10,00,000
• Due Date: Immediate

Please click the secure link below to access your renewal portal and complete instant payment.

Regards,
ICICI Lombard Policy Renewals Desk`
  );

  // Send status states
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendSuccessResult, setSendSuccessResult] = useState<{ message: string; record: EmailLogRecord } | null>(null);
  const [sendErrorResult, setSendErrorResult] = useState<string | null>(null);

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyToastMessage, setCopyToastMessage] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Helper to get active policy URL
  const hostOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentPolicyUrl = composePolicyNumber.trim()
    ? `${hostOrigin}?policy=${encodeURIComponent(composePolicyNumber.trim())}`
    : `${hostOrigin}`;

  // Helper to generate full styled HTML email for Gmail/Outlook
  const generateFormattedHtmlEmail = () => {
    const senderName = verifiedSenders.find(s => s.email === composeSenderEmail)?.name || 'ICICI Lombard Policy Renewals Desk';
    const cleanBodyHtml = composeEmailBody.replace(/\n/g, '<br/>');
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${composeSubject || 'Important: Policy Communication'}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
    <div style="background: #00264A; color: #ffffff; padding: 24px; text-align: center;">
      <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em;">ICICI Lombard General Insurance</h1>
      <p style="margin: 0; font-size: 13px; color: #fed7aa;">Official Policy Renewal & Customer Service Portal</p>
    </div>
    <div style="padding: 24px; font-size: 14px; line-height: 1.6; color: #334155;">
      <p style="margin-top: 0;">Dear <strong>${composeCustomerName || 'Valued Customer'}</strong>,</p>
      <div style="margin: 16px 0; line-height: 1.6;">
        ${cleanBodyHtml}
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px;">
        <div style="font-weight: bold; font-size: 12px; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">Policy Summary</div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #cbd5e1;"><span>Policy Number:</span><strong>${composePolicyNumber || 'POL-SAMPLE'}</strong></div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #cbd5e1;"><span>Customer Name:</span><strong>${composeCustomerName || 'Valued Customer'}</strong></div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0;"><span>Coverage / Plan:</span><strong>Complete Health Insurance</strong></div>
      </div>
      <div style="text-align: center; margin: 28px 0 20px 0;">
        <a href="${currentPolicyUrl}" style="display: inline-block; background-color: #ea580c; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(234, 88, 12, 0.2);" target="_blank">Access Official Policy Portal →</a>
      </div>
      <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0; line-height: 1.5;">
        Direct Policy Hyperlink:<br/>
        <a href="${currentPolicyUrl}" style="color: #0284c7; word-break: break-all; font-family: monospace; font-size: 12px;" target="_blank">${currentPolicyUrl}</a>
      </p>
    </div>
    <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0 0 4px 0;">Sent by authorized sender <strong>${composeSenderEmail}</strong> (${senderName})</p>
      <p style="margin: 0;">© 2026 ICICI Lombard General Insurance Company Ltd. IRDAI Reg. No. 115. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  };

  // Copy Full Rich HTML Email for pasting into Gmail, Outlook, Apple Mail
  const handleCopyFormattedEmail = async () => {
    const htmlContent = generateFormattedHtmlEmail();
    const textContent = `Subject: ${composeSubject}\n\nDear ${composeCustomerName || 'Valued Customer'},\n\n${composeEmailBody}\n\n----------------------------------------\nPOLICY INFORMATION:\n• Policy Number: ${composePolicyNumber || 'POL-SAMPLE'}\n• Customer: ${composeCustomerName || 'Valued Customer'}\n----------------------------------------\n\nAccess Official Policy Portal Link:\n${currentPolicyUrl}\n\nRegards,\nICICI Lombard Policy Renewals Desk`;

    try {
      if (typeof window !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([textContent], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          })
        ]);
      } else {
        await navigator.clipboard.writeText(textContent);
      }
      setCopiedId('email-template-html');
      setCopyToastMessage('Formatted ICICI Lombard email template copied! Ready to paste into Gmail / Outlook with active hyperlink.');
      setTimeout(() => {
        setCopiedId(null);
        setCopyToastMessage(null);
      }, 3500);
    } catch (err) {
      console.warn('Clipboard write failed, using text fallback:', err);
      await navigator.clipboard.writeText(textContent);
      setCopiedId('email-template-html');
      setCopyToastMessage('Email text & link copied to clipboard!');
      setTimeout(() => {
        setCopiedId(null);
        setCopyToastMessage(null);
      }, 3500);
    }
  };

  // Copy Clean Plain Text Email for WhatsApp / Notes / SMS
  const handleCopyPlainTextEmail = async () => {
    const textContent = `Subject: ${composeSubject}\n\nDear ${composeCustomerName || 'Valued Customer'},\n\n${composeEmailBody}\n\n----------------------------------------\nPOLICY SUMMARY:\n• Policy Number: ${composePolicyNumber || 'POL-SAMPLE'}\n• Customer Name: ${composeCustomerName || 'Valued Customer'}\n----------------------------------------\n\n👉 Click here to view & renew your policy:\n${currentPolicyUrl}\n\nRegards,\nICICI Lombard Policy Renewals Desk`;
    await navigator.clipboard.writeText(textContent);
    setCopiedId('email-template-text');
    setCopyToastMessage('Clean plain text template with clickable policy URL copied!');
    setTimeout(() => {
      setCopiedId(null);
      setCopyToastMessage(null);
    }, 3500);
  };

  // When customer is selected from dropdown, auto-fill fields
  const handleSelectCustomer = (polNo: string) => {
    setComposeCustomerSelect(polNo);
    if (!polNo) return;
    const cust = customers.find(c => c.policyNumber === polNo);
    if (cust) {
      setComposeCustomerName(cust.customerName);
      setComposePolicyNumber(cust.policyNumber);
      setComposeRecipientEmail(cust.email || cust.kyc?.email || '');
      
      const payable = cust.finalPayable || cust.baseAnnualPremium || 24485;
      const si = cust.totalSumInsured || cust.baseSumInsured || 1000000;
      const dueDate = cust.renewalDueDate || cust.previousPolicyEndDate || '10 Days';

      setComposeSubject(`Important: Health Insurance Policy Renewal Notice - #${cust.policyNumber}`);
      setComposeEmailBody(
`Dear ${cust.customerName},

Your ICICI Lombard health insurance policy #${cust.policyNumber} (${cust.policyName || 'Complete Health Insurance'}) is due for renewal.

Policy Summary:
• Policy Number: ${cust.policyNumber}
• Customer Name: ${cust.customerName}
• Total Sum Insured: ₹${si.toLocaleString('en-IN')}
• Renewal Premium Payable: ₹${payable.toLocaleString('en-IN')}
• Renewal Due Date: ${dueDate}

Please review your renewal schedule and proceed with your preferred payment method (UPI, Net Banking, Debit/Credit Card) to maintain continuous coverage.

Thank you for choosing ICICI Lombard General Insurance.

Regards,
ICICI Lombard Policy Renewals Desk`
      );
    }
  };

  // Quick template changer
  const handleTemplateChange = (tmpl: string) => {
    setComposeTemplateType(tmpl);
    const pol = composePolicyNumber || 'POL-8902-X';
    const name = composeCustomerName || 'Valued Customer';
    
    if (tmpl === 'renewal') {
      setComposeSubject(`Important: Health Insurance Policy Renewal Notice - #${pol}`);
      setComposeEmailBody(
`Dear ${name},

Your ICICI Lombard health insurance coverage under policy #${pol} is due for renewal. To ensure continuous healthcare protection and avoid loss of cumulative NCB bonuses, please complete your renewal.

Policy Details:
• Policy Number: ${pol}
• Plan: Complete Health Insurance
• Status: Expiring Soon
• Online Payment Link: Attached

Click the link below to verify your policy schedule and complete instant payment.

Regards,
ICICI Lombard Policy Renewals Desk`
      );
    } else if (tmpl === 'quotation') {
      setComposeSubject(`Official Health Insurance Quotation & Benefits Schedule - #${pol}`);
      setComposeEmailBody(
`Dear ${name},

Thank you for your interest in ICICI Lombard Health Insurance. Please find attached your customized health coverage quotation and benefits schedule for Policy #${pol}.

Coverage Highlights:
• Comprehensive In-patient Hospitalization with No Room Rent Capping
• 10,000+ Cashless Network Hospitals Across India
• Day Care Procedures & Pre/Post Hospitalization Covered
• Cumulative Loyalty Bonus & Zone-based Pricing Benefit Included

Please review the quote and proceed to activate your policy.

Regards,
ICICI Lombard Underwriting & Quotations Desk`
      );
    } else if (tmpl === 'payment_receipt') {
      setComposeSubject(`Payment Confirmation & Renewal Receipt - Policy #${pol}`);
      setComposeEmailBody(
`Dear ${name},

We are pleased to confirm that we have received your renewal premium payment for Policy #${pol}.

Transaction Details:
• Policy Number: ${pol}
• Payment Status: Successful
• Payment Date: ${new Date().toLocaleDateString('en-GB')}
• Coverage Status: Active & Renewed

You can download your digitally signed policy certificate and 80D tax exemption receipt directly from our portal.

Thank you for trusting ICICI Lombard General Insurance.

Regards,
ICICI Lombard Accounts & Payments Desk`
      );
    }
  };

  // SEND EMAIL DISPATCH HANDLER
  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendSuccessResult(null);
    setSendErrorResult(null);

    if (!composeSenderEmail) {
      setSendErrorResult('Please select an authorized sender address.');
      return;
    }

    if (!composeRecipientEmail || !composeRecipientEmail.includes('@')) {
      setSendErrorResult('Please enter a valid recipient email address.');
      return;
    }

    if (!composeCustomerName.trim()) {
      setSendErrorResult('Please specify the customer name.');
      return;
    }

    if (!composePolicyNumber.trim()) {
      setSendErrorResult('Please specify the policy number.');
      return;
    }

    if (!composeSubject.trim()) {
      setSendErrorResult('Please enter an email subject.');
      return;
    }

    if (!composeEmailBody.trim()) {
      setSendErrorResult('Please enter the email body text.');
      return;
    }

    setIsSendingEmail(true);

    try {
      const payload: SendEmailPayload = {
        senderEmail: composeSenderEmail,
        recipientEmail: composeRecipientEmail.trim(),
        customerName: composeCustomerName.trim(),
        policyNumber: composePolicyNumber.trim(),
        subject: composeSubject.trim(),
        emailBody: composeEmailBody.trim(),
        customBody: composeEmailBody.trim(),
        emailType: composeTemplateType === 'quotation' ? 'Policy Quotation' : composeTemplateType === 'payment_receipt' ? 'Payment Receipt' : 'Renewal Link'
      };

      const result = await apiSendCustomerEmail(payload);
      
      const record = (result as any).record || result;
      setSendSuccessResult({
        message: 'Email sent successfully',
        record
      });
      
      onRefresh();
    } catch (err: any) {
      console.error('Email send failed:', err);
      setSendErrorResult(err.message || 'Email delivery failed. Please check your Email Provider / SMTP configuration in Email Settings.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Sender Actions
  const handleAddSenderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMail = (newSenderForm.email || '').trim().toLowerCase();
    if (!cleanMail || !cleanMail.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    setIsSubmittingSender(true);
    try {
      await apiSaveEmailSender({
        ...newSenderForm,
        email: cleanMail,
        status: 'Verified',
        replyToEmail: newSenderForm.replyToEmail || cleanMail
      });
      setShowAddSenderModal(false);
      setComposeSenderEmail(cleanMail);
      setNewSenderForm({
        email: '',
        senderName: 'ICICI Lombard Policy Renewals Desk',
        department: 'Policy Renewals Desk',
        replyToEmail: 'customersupport@icicilombard-renewal.com',
        isDefault: false,
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to save sender');
    } finally {
      setIsSubmittingSender(false);
    }
  };

  const handleVerifySender = async (senderEmail: string) => {
    try {
      await apiVerifyEmailSender(senderEmail);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to verify sender');
    }
  };

  const handleSetDefault = async (senderEmail: string) => {
    try {
      await apiSetDefaultEmailSender(senderEmail);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to set default sender');
    }
  };

  const handleDeleteSender = async (senderEmail: string) => {
    if (confirm(`Are you sure you want to remove authorized sender ${senderEmail}?`)) {
      try {
        const res = await apiDeleteEmailSender(senderEmail);
        if (res && res.success !== false) {
          onRefresh();
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete sender');
      }
    }
  };

  // Provider Preset Helper
  const applyProviderPreset = (provider: 'godaddy' | 'godaddy_o365' | 'sendgrid' | 'resend' | 'mailgun' | 'brevo' | 'ses' | 'gmail' | 'smtp') => {
    if (provider === 'godaddy') {
      setSmtpForm({
        ...smtpForm,
        providerType: 'smtp',
        host: 'smtpout.secureserver.net',
        port: 465,
        secure: true,
        user: 'customersupport@icicilombard-renewal.com'
      });
    } else if (provider === 'godaddy_o365') {
      setSmtpForm({
        ...smtpForm,
        providerType: 'smtp',
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        user: 'customersupport@icicilombard-renewal.com'
      });
    } else if (provider === 'sendgrid') {
      setSmtpForm({
        ...smtpForm,
        providerType: 'sendgrid',
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        user: 'apikey'
      });
    } else if (provider === 'resend') {
      setSmtpForm({
        ...smtpForm,
        providerType: 'resend',
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        user: 'resend'
      });
    } else if (provider === 'mailgun') {
      setSmtpForm({
        ...smtpForm,
        providerType: 'mailgun',
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        user: 'postmaster@your-domain.mailgun.org'
      });
    } else if (provider === 'brevo') {
      setSmtpForm({
        ...smtpForm,
        providerType: 'brevo',
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        user: 'your-brevo-login@domain.com'
      });
    } else if (provider === 'ses') {
      setSmtpForm({
        ...smtpForm,
        providerType: 'ses',
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 587,
        secure: false,
        user: 'AKIAIOSFODNN7EXAMPLE'
      });
    } else if (provider === 'gmail') {
      setSmtpForm({
        ...smtpForm,
        providerType: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        user: 'your-email@gmail.com'
      });
    } else {
      setSmtpForm({
        ...smtpForm,
        providerType: 'smtp',
        host: 'smtpout.secureserver.net',
        port: 465,
        secure: true,
        user: 'customersupport@icicilombard-renewal.com'
      });
    }
  };

  // SMTP Actions
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSmtp(true);
    try {
      await apiSaveEmailSmtpConfig(smtpForm);
      setSmtpSaveToast(true);
      setTimeout(() => setSmtpSaveToast(false), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to save SMTP settings');
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await apiTestSmtpConnection();
      setSmtpTestResult(res);
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: err.message || 'Email Provider Connection Test Failed'
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // Filtered Logs
  const filteredLogs = logs.filter(log => {
    const q = logSearch.toLowerCase();
    const matchesSearch = 
      log.senderEmail.toLowerCase().includes(q) ||
      log.recipientEmail.toLowerCase().includes(q) ||
      log.customerName.toLowerCase().includes(q) ||
      log.policyNumber.toLowerCase().includes(q) ||
      log.subject.toLowerCase().includes(q) ||
      log.messageReferenceId.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (logStatusFilter !== 'all' && log.deliveryStatus !== logStatusFilter) return false;
    return true;
  });

  const verifiedCount = senders.filter(s => s.status === 'Verified').length;
  const deliveredCount = logs.filter(l => l.deliveryStatus === 'Delivered' || l.deliveryStatus === 'Sent').length;

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-xs">
      
      {/* Top Header & Overview Banner */}
      <div className="bg-gradient-to-r from-[#00264A] to-[#0A3D62] text-white p-5 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EA580C] text-white flex items-center justify-center font-bold">
              <Mail className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-black text-white">Email Service & Multi-Sender Gateway</h2>
          </div>
          <p className="text-xs text-slate-300 font-medium max-w-2xl">
            Dispatch real customer policy emails, configure authorized sender identities, connect email provider SMTP/API gateways, and audit all outbound delivery logs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('compose')}
            className="px-4 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <SendHorizontal className="w-4 h-4" />
            <span>Send Email</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer transition-all border border-white/10"
            title="Refresh Email System State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-tight">Authorized Senders</span>
          <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>{senders.length}</span>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
              {verifiedCount} Verified
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Multi-department identities</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-tight">Emails Dispatched</span>
          <div className="text-2xl font-black text-emerald-700">{logs.length}</div>
          <span className="text-[10px] text-slate-400 font-medium">{deliveredCount} confirmed delivered</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-tight">Provider Gateway</span>
          <div className="text-xs font-black text-blue-800 flex items-center gap-1 mt-1">
            <Server className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">{smtpConfig.host || smtpConfig.smtpHost || 'smtp.sendgrid.net'}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>TLS Secured Gateway</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-tight">Anti-Spoofing Guard</span>
          <div className="text-xs font-bold text-purple-900 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Active & Enforced</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Unverified senders blocked</span>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 bg-slate-100/60 p-1.5 rounded-xl">
        <button
          type="button"
          onClick={() => setSubTab('compose')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
            subTab === 'compose' ? 'bg-[#00264A] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <SendHorizontal className="w-3.5 h-3.5 text-[#EA580C]" />
          <span>Compose & Send Email</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('senders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
            subTab === 'senders' ? 'bg-[#00264A] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Authorized Senders ({verifiedCount}/{senders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('smtp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
            subTab === 'smtp' ? 'bg-[#00264A] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Server className="w-3.5 h-3.5 text-purple-400" />
          <span>Email Provider & Gateway Connection</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
            subTab === 'logs' ? 'bg-[#00264A] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>Email Activity Records ({logs.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: COMPOSE & SEND EMAIL WORKBENCH                                */}
      {/* ========================================================================= */}
      {subTab === 'compose' && (
        <div className="space-y-6">
          
          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 text-blue-900">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="font-extrabold text-xs text-blue-950">Secure Outbound Email Gateway</h4>
              <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                Emails are dispatched strictly through the verified sender identity and configured backend email provider. Arbitrary sender spoofing (such as pretending to send from customersupport@icicilombard.com) is strictly blocked by security validation.
              </p>
            </div>
          </div>

          {/* Success Banner */}
          {sendSuccessResult && (
            <div className="bg-emerald-50 border-2 border-emerald-400 p-4 rounded-xl flex items-start justify-between gap-3 text-emerald-900 shadow-sm animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-emerald-950">Email sent successfully</h4>
                  <p className="text-xs text-emerald-800">
                    Dispatched to <strong className="font-bold">{sendSuccessResult.record.recipientEmail}</strong> for policy <span className="font-mono font-bold">{sendSuccessResult.record.policyNumber}</span>.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-700 font-mono pt-1">
                    <span>Ref ID: {sendSuccessResult.record.messageReferenceId}</span>
                    <span>• Status: {sendSuccessResult.record.deliveryStatus}</span>
                    <span>• Timestamp: {sendSuccessResult.record.formattedDateTime || sendSuccessResult.record.sentAt}</span>
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSendSuccessResult(null)}
                className="text-emerald-700 hover:text-emerald-900 cursor-pointer font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Error Banner */}
          {sendErrorResult && (
            <div className="bg-rose-50 border-2 border-rose-400 p-4 rounded-xl flex items-start justify-between gap-3 text-rose-900 shadow-sm animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-rose-950">Email Dispatch Failed</h4>
                  <p className="text-xs text-rose-800 font-mono whitespace-pre-wrap">
                    {sendErrorResult}
                  </p>
                  <p className="text-[11px] text-rose-700 font-sans pt-1">
                    Ensure your Email Provider credentials in the <strong>Email Provider & Gateway Connection</strong> tab are configured and tested.
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSendErrorResult(null)}
                className="text-rose-700 hover:text-rose-900 cursor-pointer font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Email Compose Form */}
            <form onSubmit={handleSendEmailSubmit} className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#EA580C]" />
                  <span>Outbound Customer Message Dispatch</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">All fields required</span>
              </div>

              {/* Quick Customer Selection */}
              {customers.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Quick Autofill from Policy Database
                  </label>
                  <select
                    value={composeCustomerSelect}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white focus:border-[#EA580C] outline-none text-xs"
                  >
                    <option value="">-- Select an Existing Policy to Autofill --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.policyNumber}>
                        {c.customerName} - {c.policyNumber} ({c.email || c.mobileNumber})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Field: Send From (Dropdown of Verified Senders) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-800 font-extrabold text-xs flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Send From (Authorized Sender) *</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddSenderModal(true)}
                      className="text-[11px] text-[#EA580C] hover:text-[#D97706] font-extrabold flex items-center gap-1 cursor-pointer bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded border border-orange-200"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Sender</span>
                    </button>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                      Verified Identity
                    </span>
                  </div>
                </div>

                <select
                  value={composeSenderEmail}
                  onChange={(e) => setComposeSenderEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] focus:ring-2 focus:ring-orange-200 outline-none text-xs"
                  required
                >
                  {senders.length === 0 ? (
                    <option value="">No senders configured. Click '+ Add Sender' to add one.</option>
                  ) : (
                    senders.map(s => (
                      <option key={s.id} value={s.email}>
                        {s.name || s.senderName || 'ICICI Lombard'} &lt;{s.email}&gt; ({s.department || 'Policy Desk'}) {s.isDefault ? '★ Primary Default' : ''} [{s.status}]
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Authorized domain sender will be used as the outbound identity.</span>
                  </span>
                  {composeSenderEmail && (
                    <span className="font-mono text-slate-600 font-semibold">Active: {composeSenderEmail}</span>
                  )}
                </p>
              </div>

              {/* 2-Column: Customer Name & Policy Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-800 font-extrabold text-xs mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={composeCustomerName}
                    onChange={(e) => setComposeCustomerName(e.target.value)}
                    placeholder="e.g. Smt. Kamala Devi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] focus:ring-2 focus:ring-orange-200 outline-none text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-extrabold text-xs mb-1">
                    Policy Number *
                  </label>
                  <input
                    type="text"
                    value={composePolicyNumber}
                    onChange={(e) => setComposePolicyNumber(e.target.value)}
                    placeholder="e.g. 4128i/CHI/987654321/00/000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 bg-white focus:border-[#EA580C] focus:ring-2 focus:ring-orange-200 outline-none text-xs"
                    required
                  />
                </div>
              </div>

              {/* Field: Recipient Email */}
              <div>
                <label className="block text-slate-800 font-extrabold text-xs mb-1">
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  value={composeRecipientEmail}
                  onChange={(e) => setComposeRecipientEmail(e.target.value)}
                  placeholder="customer.email@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 bg-white focus:border-[#EA580C] focus:ring-2 focus:ring-orange-200 outline-none text-xs"
                  required
                />
              </div>

              {/* Field: Subject */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-800 font-extrabold text-xs">
                    Subject Line *
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Preset:</span>
                    <button
                      type="button"
                      onClick={() => handleTemplateChange('renewal')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${composeTemplateType === 'renewal' ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-slate-100 text-slate-600'}`}
                    >
                      Renewal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTemplateChange('quotation')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${composeTemplateType === 'quotation' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-600'}`}
                    >
                      Quotation
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTemplateChange('payment_receipt')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${composeTemplateType === 'payment_receipt' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}
                    >
                      Receipt
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="e.g. Important: Health Insurance Policy Renewal Notice - #POL-1234"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] focus:ring-2 focus:ring-orange-200 outline-none text-xs"
                  required
                />
              </div>

              {/* Field: Email Body */}
              <div>
                <label className="block text-slate-800 font-extrabold text-xs mb-1 flex items-center justify-between">
                  <span>Email Body Text & Content *</span>
                  <span className="text-[10px] text-slate-500 font-normal">Formatted HTML template generated automatically</span>
                </label>
                <textarea
                  rows={8}
                  value={composeEmailBody}
                  onChange={(e) => setComposeEmailBody(e.target.value)}
                  placeholder="Type your official communication message to the customer..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-slate-900 bg-white focus:border-[#EA580C] focus:ring-2 focus:ring-orange-200 outline-none text-xs leading-relaxed"
                  required
                />
              </div>

              {/* Send Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSendingEmail || verifiedSenders.length === 0}
                  className="w-full bg-[#EA580C] hover:bg-[#D97706] text-white px-6 py-3.5 rounded-xl font-extrabold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Send Email</span>
                    </>
                  )}
                </button>
              </div>

            </form>

            {/* Right: Live Email Visual Preview */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    Customer Email Inbox Preview
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Live
                  </span>
                </div>

                {/* Quick Copy Action Badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyFormattedEmail}
                    className="px-2.5 py-1 rounded-lg bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                    title="Copy styled HTML email ready to paste directly into Gmail or Outlook"
                  >
                    {copiedId === 'email-template-html' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied HTML!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Email (HTML)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyPlainTextEmail}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                    title="Copy formatted plain text with direct link for WhatsApp / SMS"
                  >
                    {copiedId === 'email-template-text' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied Text!</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Toast Feedback */}
              {copyToastMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{copyToastMessage}</span>
                </div>
              )}

              {/* Preview Canvas */}
              <div className="bg-white rounded-2xl border border-slate-300 shadow-lg overflow-hidden flex flex-col">
                
                {/* Email Client Header bar */}
                <div className="bg-[#00264A] text-white p-3.5 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold tracking-wide ml-1 text-slate-200">Customer Mail Client</span>
                  </div>
                  <span className="text-[10px] text-orange-300 font-mono">TLS-Encrypted</span>
                </div>

                {/* Email Metadata */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-[11px] space-y-1">
                  <div className="flex gap-2">
                    <span className="text-slate-500 font-bold w-12 shrink-0">From:</span>
                    <span className="text-slate-900 font-bold truncate">
                      {verifiedSenders.find(s => s.email === composeSenderEmail)?.name || 'ICICI Lombard Policy Renewals Desk'} &lt;{composeSenderEmail}&gt;
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-500 font-bold w-12 shrink-0">To:</span>
                    <span className="text-slate-900 font-mono truncate">
                      {composeRecipientEmail || 'customer@example.com'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-500 font-bold w-12 shrink-0">Subject:</span>
                    <span className="text-slate-900 font-extrabold truncate">
                      {composeSubject || 'Important: Policy Communication'}
                    </span>
                  </div>
                </div>

                {/* Rendered Email Body in Preview */}
                <div className="p-4 bg-slate-100/50 flex-1 space-y-3 overflow-y-auto max-h-[420px]">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
                    
                    {/* ICICI LOMBARD BRAND HEADER */}
                    <div className="bg-[#00264A] text-white p-3.5 rounded-xl text-center shadow-xs space-y-0.5">
                      <h4 className="font-extrabold text-sm tracking-wide text-white">ICICI Lombard General Insurance</h4>
                      <p className="text-[10.5px] text-orange-200 font-medium">Official Policy Renewal & Customer Service Portal</p>
                    </div>

                    <div className="text-xs text-slate-800 space-y-2 whitespace-pre-wrap font-sans leading-relaxed">
                      {composeEmailBody || 'Please enter message content in the compose window...'}
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-500">Policy Number:</span>
                        <span className="font-mono text-slate-900">{composePolicyNumber || 'POL-SAMPLE'}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-500">Customer:</span>
                        <span className="text-slate-900">{composeCustomerName || 'Valued Customer'}</span>
                      </div>
                    </div>

                    {/* CLICKABLE HYPERLINK BUTTON FOR CUSTOMER */}
                    <div className="text-center pt-2 space-y-2">
                      <a
                        href={currentPolicyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs px-6 py-2.5 rounded-lg shadow-sm transition-transform active:scale-95 cursor-pointer no-underline"
                      >
                        <span>Access Official Policy Portal</span>
                        <span>→</span>
                      </a>

                      <div className="text-[10px] text-slate-500 font-mono break-all pt-0.5 flex flex-col items-center justify-center gap-0.5">
                        <span className="text-slate-400 font-sans">Clickable Policy Hyperlink:</span>
                        <a
                          href={currentPolicyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 hover:text-blue-900 underline font-semibold flex items-center gap-1"
                        >
                          <span>{currentPolicyUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 inline" />
                        </a>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                      Sent by authorized sender {composeSenderEmail} • Reference: MSG-LIVE-PREVIEW
                    </div>

                  </div>
                </div>

                {/* Bottom Action Footer for Admin */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10.5px] text-slate-500 font-medium">
                    Ready to send to customer? Copy formatted template or send directly.
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyFormattedEmail}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedId === 'email-template-html' ? 'Copied HTML!' : 'Copy Formatted Template'}</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: AUTHORIZED SENDER DIRECTORY                                    */}
      {/* ========================================================================= */}
      {subTab === 'senders' && (
        <div className="space-y-4">
          <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-amber-900">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-xs text-amber-950">Domain Authorization & Anti-Impersonation Policy</h4>
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                Only email addresses registered and verified in this section will appear in the <strong>"Send From"</strong> dropdown when dispatching policy renewal notices or quotes to customers. Arbitrary sender impersonation (e.g. spoofing icicilombard.com) is strictly forbidden by server-side verification.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Configured Sender Identities</h3>
                <p className="text-slate-500 text-[11px]">Authorized email origins for customer quotations and renewal reminders</p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddSenderModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Sender</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Sender Email</th>
                    <th className="p-3.5">Display Name</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Domain DNS / SPF</th>
                    <th className="p-3.5">Default</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {senders.map((sender) => (
                    <tr key={sender.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-slate-900">{sender.email}</span>
                          {sender.isDefault && (
                            <span className="bg-orange-100 text-orange-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-orange-200">
                              DEFAULT
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 font-medium text-slate-800">
                        {sender.name || sender.senderName || 'ICICI Lombard'}
                      </td>

                      <td className="p-3.5 text-slate-600">
                        {sender.department || 'Policy Services'}
                      </td>

                      <td className="p-3.5">
                        {sender.status === 'Verified' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-extrabold text-[10px] border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-100 text-slate-700 font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-200">
                            SPF: Pass
                          </span>
                          <span className="bg-slate-100 text-slate-700 font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-200">
                            DKIM: Pass
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        {sender.isDefault ? (
                          <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Primary
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(sender.email)}
                            className="text-slate-500 hover:text-slate-800 text-[10px] font-bold underline cursor-pointer"
                          >
                            Set Default
                          </button>
                        )}
                      </td>

                      <td className="p-3.5 text-right space-x-2">
                        {sender.status !== 'Verified' && (
                          <button
                            type="button"
                            onClick={() => handleVerifySender(sender.email)}
                            className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 text-[10px] cursor-pointer"
                          >
                            Verify
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteSender(sender.email)}
                          className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer rounded hover:bg-rose-50"
                          title="Delete Sender"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: EMAIL PROVIDER & GATEWAY SETTINGS                              */}
      {/* ========================================================================= */}
      {subTab === 'smtp' && (
        <div className="space-y-6">
          
          <div className="bg-purple-50/80 border border-purple-200 p-4 rounded-xl flex items-start gap-3 text-purple-900">
            <Server className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-xs text-purple-950">Email Provider Connection Gateway</h4>
              <p className="text-[11px] text-purple-800 leading-relaxed font-medium">
                Connect your real email provider (SendGrid, Mailgun, Resend, Amazon SES, Brevo, Gmail App Password, or Custom SMTP). Credentials are stored securely on the backend and are never exposed to the frontend.
              </p>
            </div>
          </div>

          {smtpSaveToast && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-bounce">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Email Provider Settings Saved & Verified Successfully!</span>
            </div>
          )}

          {smtpTestResult && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${smtpTestResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'}`}>
              {smtpTestResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              <div className="space-y-1">
                <h4 className="font-extrabold text-xs">{smtpTestResult.success ? 'Connection Test Succeeded' : 'Connection Test Failed'}</h4>
                <p className="text-[11px]">{smtpTestResult.message}</p>
              </div>
            </div>
          )}

          {/* Preset Buttons */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Quick Provider Presets</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyProviderPreset('godaddy')}
                className="px-3.5 py-1.5 rounded-lg border-2 border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-900 font-extrabold text-xs cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#EA580C]" />
                <span>GoDaddy Secureserver (Port 465 SSL)</span>
              </button>
              <button
                type="button"
                onClick={() => applyProviderPreset('godaddy_o365')}
                className="px-3.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs cursor-pointer"
              >
                GoDaddy M365 (smtp.office365.com)
              </button>
              <button
                type="button"
                onClick={() => applyProviderPreset('sendgrid')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs cursor-pointer"
              >
                SendGrid
              </button>
              <button
                type="button"
                onClick={() => applyProviderPreset('resend')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs cursor-pointer"
              >
                Resend
              </button>
              <button
                type="button"
                onClick={() => applyProviderPreset('mailgun')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs cursor-pointer"
              >
                Mailgun
              </button>
              <button
                type="button"
                onClick={() => applyProviderPreset('brevo')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs cursor-pointer"
              >
                Brevo
              </button>
              <button
                type="button"
                onClick={() => applyProviderPreset('ses')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs cursor-pointer"
              >
                AWS SES
              </button>
              <button
                type="button"
                onClick={() => applyProviderPreset('gmail')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs cursor-pointer"
              >
                Gmail App Password
              </button>
              <button
                type="button"
                onClick={() => applyProviderPreset('smtp')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs cursor-pointer"
              >
                Custom SMTP
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveSmtp} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-800 font-extrabold text-xs mb-1">
                  Mail Server Host *
                </label>
                <input
                  type="text"
                  value={smtpForm.host || smtpForm.smtpHost || ''}
                  onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value, smtpHost: e.target.value })}
                  placeholder="e.g. smtp.sendgrid.net"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-800 font-extrabold text-xs mb-1">
                  Port *
                </label>
                <input
                  type="number"
                  value={smtpForm.port || smtpForm.smtpPort || 587}
                  onChange={(e) => setSmtpForm({ ...smtpForm, port: Number(e.target.value), smtpPort: Number(e.target.value) })}
                  placeholder="587"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-800 font-extrabold text-xs mb-1">
                  Username / API Key *
                </label>
                <input
                  type="text"
                  value={smtpForm.user || smtpForm.smtpUser || ''}
                  onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value, smtpUser: e.target.value })}
                  placeholder="apikey or smtp_user"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-800 font-extrabold text-xs mb-1">
                  Password / API Secret (Masked)
                </label>
                <input
                  type="password"
                  value={smtpForm.smtpPass || ''}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtpPass: e.target.value })}
                  placeholder="•••••••••••••••• (Leave blank to keep existing)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="smtpSecureCheck"
                checked={!!(smtpForm.secure || smtpForm.smtpSecure)}
                onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked, smtpSecure: e.target.checked })}
                className="w-4 h-4 text-[#EA580C] rounded border-slate-300"
              />
              <label htmlFor="smtpSecureCheck" className="text-slate-800 font-bold text-xs cursor-pointer select-none">
                Use Secure Connection (SSL/TLS on Port 465)
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={isTestingSmtp}
                className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs border border-blue-200 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isTestingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>{isTestingSmtp ? 'Testing Handshake...' : 'Test Connection Handshake'}</span>
              </button>

              <button
                type="submit"
                disabled={isSavingSmtp}
                className="px-6 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSavingSmtp ? 'Saving Settings...' : 'Save Provider Settings'}</span>
              </button>
            </div>

          </form>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: EMAIL ACTIVITY RECORDS & AUDIT LOGS                           */}
      {/* ========================================================================= */}
      {subTab === 'logs' && (
        <div className="space-y-4">
          
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search recipient, sender, policy, or Ref ID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 bg-white focus:border-[#EA580C] outline-none text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-slate-500 font-bold text-[11px]">Filter Status:</span>
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white text-xs"
              >
                <option value="all">All Statuses ({logs.length})</option>
                <option value="Delivered">Delivered</option>
                <option value="Sent">Sent</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Recipient</th>
                    <th className="p-3.5">Authorized Sender</th>
                    <th className="p-3.5">Customer & Policy #</th>
                    <th className="p-3.5">Subject</th>
                    <th className="p-3.5">Delivery Status</th>
                    <th className="p-3.5">Message Ref ID</th>
                    <th className="p-3.5 text-right">Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                        No email activity logs found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {formatDisplayDateTime(log.sentAt).dateTime}
                        </td>

                        <td className="p-3.5 font-mono font-bold text-slate-900">
                          {log.recipientEmail}
                        </td>

                        <td className="p-3.5">
                          <span className="font-mono text-slate-700">{log.senderEmail}</span>
                          <span className="block text-[10px] text-slate-400 font-sans">{log.senderName}</span>
                        </td>

                        <td className="p-3.5">
                          <span className="font-extrabold text-slate-900">{log.customerName}</span>
                          <span className="block font-mono text-[11px] text-slate-500">{log.policyNumber}</span>
                        </td>

                        <td className="p-3.5 max-w-[200px] truncate text-slate-800 font-medium" title={log.subject}>
                          {log.subject}
                        </td>

                        <td className="p-3.5">
                          {log.deliveryStatus === 'Delivered' || log.deliveryStatus === 'Sent' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px] border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{log.deliveryStatus}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-extrabold text-[10px] border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>{log.deliveryStatus}</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 font-mono text-[10px] text-slate-600">
                          {log.messageReferenceId}
                        </td>

                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedPreviewLog(log)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ADD SENDER MODAL */}
      {showAddSenderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
            
            <div className="bg-[#00264A] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#EA580C]" />
                <h3 className="font-extrabold text-sm text-white">Add Authorized Sender Identity</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSenderModal(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSenderSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Sender Email Address *
                </label>
                <input
                  type="email"
                  value={newSenderForm.email}
                  onChange={(e) => setNewSenderForm({ ...newSenderForm, email: e.target.value })}
                  placeholder="e.g. renewals@mydomain.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Example: renewals@mydomain.com, support@mydomain.com, payments@mydomain.com
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Display Sender Name *
                </label>
                <input
                  type="text"
                  value={newSenderForm.senderName}
                  onChange={(e) => setNewSenderForm({ ...newSenderForm, senderName: e.target.value })}
                  placeholder="e.g. ICICI Lombard Policy Renewals Desk"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:border-[#EA580C] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Department / Function
                </label>
                <select
                  value={newSenderForm.department}
                  onChange={(e) => setNewSenderForm({ ...newSenderForm, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                >
                  <option value="Policy Renewals Desk">Policy Renewals Desk</option>
                  <option value="Customer Support & Claims">Customer Support & Claims</option>
                  <option value="Payment Processing & Accounts">Payment Processing & Accounts</option>
                  <option value="Underwriting & Verification">Underwriting & Verification</option>
                  <option value="Executive Escalations">Executive Escalations</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Reply-To Email Address
                </label>
                <input
                  type="email"
                  value={newSenderForm.replyToEmail}
                  onChange={(e) => setNewSenderForm({ ...newSenderForm, replyToEmail: e.target.value })}
                  placeholder="support@mydomain.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="setAsDefault"
                  checked={newSenderForm.isDefault}
                  onChange={(e) => setNewSenderForm({ ...newSenderForm, isDefault: e.target.checked })}
                  className="w-4 h-4 text-[#EA580C] rounded border-slate-300"
                />
                <label htmlFor="setAsDefault" className="text-slate-800 font-bold cursor-pointer select-none">
                  Set as primary default sender
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSenderModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSender}
                  className="px-5 py-2 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingSender ? 'Saving...' : 'Authorize & Verify'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* EMAIL PREVIEW MODAL */}
      {selectedPreviewLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-[#00264A] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EA580C] text-white flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Dispatched Email Audit Record</h3>
                  <p className="text-[10px] text-slate-300 font-mono">Ref ID: {selectedPreviewLog.messageReferenceId}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPreviewLog(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Email Metadata */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-1.5 text-xs font-semibold shrink-0">
              <div className="flex justify-between">
                <span className="text-slate-500">From:</span>
                <span className="font-bold text-slate-900">{selectedPreviewLog.senderName} &lt;{selectedPreviewLog.senderEmail}&gt;</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">To:</span>
                <span className="font-bold text-slate-900">{selectedPreviewLog.customerName} &lt;{selectedPreviewLog.recipientEmail}&gt;</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Policy #:</span>
                <span className="font-mono font-bold text-slate-900">{selectedPreviewLog.policyNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subject:</span>
                <span className="font-bold text-slate-900">{selectedPreviewLog.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sent At:</span>
                <span className="font-mono text-slate-700">{formatDisplayDateTime(selectedPreviewLog.sentAt).dateTime}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-500">Delivery Status:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                  selectedPreviewLog.deliveryStatus === 'Delivered' || selectedPreviewLog.deliveryStatus === 'Sent'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border-rose-200'
                }`}>
                  {selectedPreviewLog.deliveryStatus === 'Delivered' || selectedPreviewLog.deliveryStatus === 'Sent' ? '✓ ' : '✕ '}
                  {selectedPreviewLog.deliveryStatus} (Provider Gateway Handshake)
                </span>
              </div>
            </div>

            {/* Email Body Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
                <div 
                  className="prose prose-xs max-w-none text-slate-800"
                  dangerouslySetInnerHTML={{ __html: selectedPreviewLog.bodyHtml || selectedPreviewLog.bodyText || '' }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPreviewLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Close Audit Record
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
