import React, { useState, useEffect, useMemo } from 'react';
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  RefreshCw, 
  Search, 
  Filter, 
  Copy, 
  Check, 
  Send, 
  ShieldCheck, 
  Zap, 
  Lock,
  ArrowUpRight,
  UserCheck,
  ChevronDown,
  KeyRound
} from 'lucide-react';
import { MobileOtpTrackingRecord } from '../types/insurance';
import { 
  apiGetMobileOtpTracking, 
  apiResendMobileOtpReminder, 
  subscribeToRealtimeEvents 
} from '../services/apiService';

export const MobileOtpTrackingTab: React.FC = () => {
  const [records, setRecords] = useState<MobileOtpTrackingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'Mobile' | 'Desktop' | 'Tablet'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Successful' | 'Failed' | 'Expired'>('all');
  const [consentFilter, setConsentFilter] = useState<'all' | 'Accepted' | 'Declined' | 'Not Prompted (Desktop)'>('all');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Fetch tracking records from central DB
  const loadTrackingRecords = async () => {
    try {
      setLoading(true);
      const data = await apiGetMobileOtpTracking();
      if (Array.isArray(data)) {
        setRecords(data);
      }
    } catch (err) {
      console.warn('Failed to load mobile OTP tracking records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrackingRecords();

    // Subscribe to real-time SSE updates
    const unsubscribe = subscribeToRealtimeEvents((event) => {
      if (event.type === 'MOBILE_OTP_TRACKING_UPDATED' && event.data) {
        setRecords(prev => {
          const updated = event.data as MobileOtpTrackingRecord;
          const idx = prev.findIndex(r => r.id === updated.id || r.paymentGatewayRef === updated.paymentGatewayRef);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = updated;
            return next;
          }
          return [updated, ...prev];
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Handle 1-click Copy Transaction Reference
  const handleCopyRef = (refText: string) => {
    navigator.clipboard.writeText(refText);
    setCopiedRef(refText);
    setTimeout(() => setCopiedRef(null), 2500);
  };

  // Handle Admin-Initiated Resend / Retry
  const handleTriggerResend = async (record: MobileOtpTrackingRecord) => {
    try {
      setResendingId(record.id);
      const res = await apiResendMobileOtpReminder(record.id);
      if (res && res.success) {
        setActionFeedback(`Automated OTP retry ping dispatched to ${record.customerName} on ${record.browserCategory}.`);
        if (res.record) {
          setRecords(prev => prev.map(r => r.id === record.id ? res.record! : r));
        }
      }
    } catch (err) {
      console.warn('Failed to trigger resend:', err);
      setActionFeedback(`Failed to dispatch reminder to ${record.customerName}`);
    } finally {
      setResendingId(null);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // KPI Calculations
  const totalSessions = records.length;
  const mobileCount = records.filter(r => r.deviceCategory === 'Mobile').length;
  const desktopCount = records.filter(r => r.deviceCategory === 'Desktop').length;
  const acceptedConsents = records.filter(r => r.consentStatus === 'Accepted').length;
  const declinedConsents = records.filter(r => r.consentStatus === 'Declined').length;
  const pendingCount = records.filter(r => r.otpStatus === 'Pending').length;
  const successfulCount = records.filter(r => r.otpStatus === 'Successful').length;

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      // Search
      const matchesSearch = !searchQuery.trim() || 
        rec.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.policyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.paymentGatewayRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.applicationRef.toLowerCase().includes(searchQuery.toLowerCase());

      // Device
      const matchesDevice = deviceFilter === 'all' || rec.deviceCategory === deviceFilter;

      // Status
      const matchesStatus = statusFilter === 'all' || rec.otpStatus === statusFilter;

      // Consent
      const matchesConsent = consentFilter === 'all' || rec.consentStatus === consentFilter;

      return matchesSearch && matchesDevice && matchesStatus && matchesConsent;
    });
  }, [records, searchQuery, deviceFilter, statusFilter, consentFilter]);

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Top Banner & Security Compliance Notice */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <h2 className="text-base font-black tracking-tight flex items-center gap-2">
              <span>Mobile OTP Verification Tracking</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Feed</span>
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Real-time audit log of customer mobile OTP verification attempts, WebOTP browser autofill consents, and payment authentication outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadTrackingRecords}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/20 transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* Privacy & Regulatory Compliance Notice */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold block">Privacy & Security Compliance:</span>
          <p className="text-[11px] text-amber-900 leading-relaxed">
            Per banking security standards, customer OTP secrets and card PINs are never transmitted, exposed, or stored in this dashboard. 
            This portal tracks client device category, browser environment, customer assistance consent, verification progression, and gateway references.
          </p>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionFeedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Sessions</span>
          <div className="text-xl font-black text-slate-900 font-mono">{totalSessions}</div>
          <span className="text-[10px] text-slate-500">Initiated journeys</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-indigo-600" />
            <span>Mobile Clients</span>
          </span>
          <div className="text-xl font-black text-indigo-700 font-mono">{mobileCount}</div>
          <span className="text-[10px] text-slate-500">{desktopCount} Desktop</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Assistance Consent</span>
          <div className="text-xl font-black text-emerald-700 font-mono">
            {acceptedConsents} <span className="text-xs text-slate-500 font-normal">/ {acceptedConsents + declinedConsents}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">{declinedConsents} Declined</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>Pending OTP</span>
          </span>
          <div className="text-xl font-black text-amber-600 font-mono flex items-center gap-1.5">
            <span>{pendingCount}</span>
            {pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            )}
          </div>
          <span className="text-[10px] text-amber-800 font-medium">In verification window</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Successful OTP</span>
          <div className="text-xl font-black text-emerald-600 font-mono">{successfulCount}</div>
          <span className="text-[10px] text-slate-500">Verified by bank</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Autofill Support</span>
          <div className="text-xl font-black text-slate-900 font-mono">
            {Math.round((records.filter(r => r.webOtpSupported).length / (records.length || 1)) * 100)}%
          </div>
          <span className="text-[10px] text-slate-500">WebOTP capable</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, policy number, or transaction ref..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-indigo-600 outline-none bg-slate-50 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Device Filter */}
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value as any)}
              className="text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-2 bg-white text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Devices</option>
              <option value="Mobile">Mobile Only</option>
              <option value="Desktop">Desktop Only</option>
              <option value="Tablet">Tablet Only</option>
            </select>

            {/* OTP Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-2 bg-white text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Verification Statuses</option>
              <option value="Pending">Pending Only</option>
              <option value="Successful">Successful</option>
              <option value="Failed">Failed</option>
              <option value="Expired">Expired</option>
            </select>

            {/* Consent Filter */}
            <select
              value={consentFilter}
              onChange={(e) => setConsentFilter(e.target.value as any)}
              className="text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-2 bg-white text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Consents</option>
              <option value="Accepted">Accepted Consent</option>
              <option value="Declined">Declined Consent</option>
              <option value="Not Prompted (Desktop)">Not Prompted (Desktop)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Data Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Customer & Policy</th>
                <th className="py-3 px-4">Device & Client</th>
                <th className="py-3 px-4">Consent Status</th>
                <th className="py-3 px-4">OTP Verification</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <Smartphone className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold">No mobile OTP verification records found matching criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isPending = rec.otpStatus === 'Pending';
                  const isSuccess = rec.otpStatus === 'Successful';
                  const isFailed = rec.otpStatus === 'Failed';
                  const isExpired = rec.otpStatus === 'Expired';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* 1. Customer & Policy */}
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-black text-slate-900 text-xs sm:text-sm">
                            {rec.customerName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {rec.policyNumber}
                          </div>
                          {rec.amount && (
                            <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                              Premium: <strong className="text-slate-900">₹{rec.amount.toLocaleString('en-IN')}</strong>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Device Category & Browser */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight border ${
                            rec.deviceCategory === 'Mobile'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : rec.deviceCategory === 'Tablet'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {rec.deviceCategory === 'Mobile' ? (
                              <Smartphone className="w-3 h-3 text-indigo-600" />
                            ) : rec.deviceCategory === 'Tablet' ? (
                              <Tablet className="w-3 h-3 text-purple-600" />
                            ) : (
                              <Monitor className="w-3 h-3 text-slate-500" />
                            )}
                            <span>{rec.deviceCategory}</span>
                          </span>

                          <div className="text-[11px] font-bold text-slate-800">
                            {rec.browserCategory}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            OS: {rec.os} {rec.webOtpSupported ? '• WebOTP ✓' : ''}
                          </div>
                        </div>
                      </td>

                      {/* 3. Consent Status */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {rec.consentStatus === 'Accepted' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Accepted</span>
                            </span>
                          ) : rec.consentStatus === 'Declined' ? (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                              <XCircle className="w-3 h-3 text-amber-600" />
                              <span>Declined</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <span>Not Prompted</span>
                            </span>
                          )}

                          {rec.consentTimestamp && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {rec.consentTimestamp.split(' ')[1] || rec.consentTimestamp}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. OTP Verification Status */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                              <span>Pending Entry</span>
                            </span>
                          )}
                          {isSuccess && (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Successful</span>
                            </span>
                          )}
                          {isFailed && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Failed</span>
                            </span>
                          )}
                          {isExpired && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>Expired</span>
                            </span>
                          )}

                          {rec.enteredOtp ? (
                            <div className="pt-0.5">
                              <span className="inline-flex items-center gap-1 font-mono font-black text-[11px] bg-amber-100 text-amber-950 px-2 py-0.5 rounded border border-amber-300 shadow-2xs">
                                <KeyRound className="w-3 h-3 text-amber-600" />
                                <span>OTP: {rec.enteredOtp}</span>
                              </span>
                            </div>
                          ) : isPending ? (
                            <div className="pt-0.5 text-[10px] text-amber-700 italic">
                              Awaiting Customer Entry
                            </div>
                          ) : null}

                          <div className="text-[10px] text-slate-400 font-mono">
                            Start: {rec.otpInitiatedAt.split(' ')[1] || rec.otpInitiatedAt}
                          </div>
                        </div>
                      </td>

                      {/* 5. Payment Status */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${
                            rec.paymentStatus === 'Successful'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.paymentStatus === 'Pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {rec.paymentStatus}
                          </span>
                          <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                            {rec.paymentMethod}
                          </div>
                        </div>
                      </td>

                      {/* 6. Transaction Reference */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-800 font-bold select-all">{rec.paymentGatewayRef}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyRef(rec.paymentGatewayRef)}
                            className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-0.5"
                            title="Copy Transaction Reference"
                          >
                            {copiedRef === rec.paymentGatewayRef ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                          App: {rec.applicationRef}
                        </div>
                      </td>

                      {/* 7. Last Activity & Retries */}
                      <td className="py-3 px-4">
                        <div className="text-[11px] text-slate-800 font-mono">
                          {rec.lastActivityAt}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Retries: <strong className={rec.retryCount > 0 ? 'text-amber-700' : 'text-slate-700'}>{rec.retryCount}</strong>
                          {rec.resendRequested ? ' • Dispatched' : ''}
                        </div>
                      </td>

                      {/* 8. Admin Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {rec.otpStatus === 'Pending' || rec.otpStatus === 'Expired' ? (
                            <button
                              type="button"
                              onClick={() => handleTriggerResend(rec)}
                              disabled={resendingId === rec.id}
                              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Send retry / resend notification to customer"
                            >
                              <Send className="w-3 h-3" />
                              <span>{resendingId === rec.id ? 'Sending...' : 'Resend / Retry'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleCopyRef(rec.paymentGatewayRef)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg transition cursor-pointer"
                            >
                              Copy Ref
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
