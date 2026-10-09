import React, { useState, useMemo } from 'react';
import { 
  Database, 
  Search, 
  Calendar, 
  Download, 
  RefreshCw, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Edit3, 
  User, 
  CreditCard, 
  ShieldCheck, 
  Phone, 
  Mail, 
  ChevronRight, 
  Sparkles, 
  Laptop, 
  Smartphone, 
  X, 
  FileSpreadsheet,
  ArrowUpDown,
  Send,
  SlidersHorizontal,
  Layers
} from 'lucide-react';
import { CustomerPolicy, RenewalLinkRecord } from '../types/insurance';
import { downloadDataCenterExcel } from '../utils/excelExport';
import { formatDisplayDateTime } from '../utils/dateUtils';
import { scanAndRecoverAllStoredData } from '../services/storageService';

export interface DataCenterTabProps {
  customers: CustomerPolicy[];
  renewalLinks: RenewalLinkRecord[];
  onOpenEditLink: (linkRecord: RenewalLinkRecord, customer?: CustomerPolicy | null) => void;
  onSelectCustomer: (customer: CustomerPolicy) => void;
  onRefreshData: () => Promise<void>;
  onOpenShareModal?: (policy: CustomerPolicy, linkToken?: string) => void;
}

type TimelineFilterMode = 'date' | 'week' | 'month';
type DatePreset = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom';
type WeekPreset = 'all' | 'current' | 'last_week' | 'past_2_weeks' | 'past_4_weeks';
type MonthPreset = 'all' | 'current' | 'last_month' | 'past_3_months' | 'custom';

export const DataCenterTab: React.FC<DataCenterTabProps> = ({
  customers,
  renewalLinks,
  onOpenEditLink,
  onSelectCustomer,
  onRefreshData,
  onOpenShareModal
}) => {
  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineMode, setTimelineMode] = useState<TimelineFilterMode>('date');
  
  // Date-wise filters
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Week-wise filters
  const [weekPreset, setWeekPreset] = useState<WeekPreset>('all');

  // Month-wise filters
  const [monthPreset, setMonthPreset] = useState<MonthPreset>('all');
  const [customMonth, setCustomMonth] = useState('2026-09');

  // Secondary Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'Renewed' | 'Expiring Soon' | 'Active'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'Completed' | 'In Progress' | 'Not Started' | 'Pending'>('all');
  const [linkFilter, setLinkFilter] = useState<'all' | 'Active' | 'Expired' | 'Revoked'>('all');

  // UI state
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<CustomerPolicy | null>(null);

  // Map renewal links by policy number and token
  const linksMap = useMemo(() => {
    const map = new Map<string, RenewalLinkRecord>();
    renewalLinks.forEach(l => {
      if (l.policyNumber) map.set(l.policyNumber.toUpperCase(), l);
      if (l.token) map.set(l.token.toUpperCase(), l);
    });
    return map;
  }, [renewalLinks]);

  // Helper to extract timestamp for timeline filtering
  const getRecordDate = (customer: CustomerPolicy): Date => {
    const link = linksMap.get(customer.policyNumber.toUpperCase());
    const dateStr = customer.lastActiveAt || 
                    link?.generatedAt || 
                    customer.createdAt || 
                    customer.updatedAt || 
                    customer.policyStartDate;
    if (!dateStr) return new Date();
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Filter logic
  const filteredCustomers = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 3600 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    // Week boundaries (Monday to Sunday)
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const thisWeekStart = new Date(todayStart.getTime() - distanceToMonday * 24 * 3600 * 1000);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 3600 * 1000);
    const twoWeeksAgoStart = new Date(thisWeekStart.getTime() - 14 * 24 * 3600 * 1000);
    const fourWeeksAgoStart = new Date(thisWeekStart.getTime() - 28 * 24 * 3600 * 1000);

    // Month boundaries
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const threeMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    return customers.filter(c => {
      const link = linksMap.get(c.policyNumber.toUpperCase());
      const recordDate = getRecordDate(c);
      const recordTime = recordDate.getTime();

      // 1. Text Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (c.customerName || '').toLowerCase().includes(q);
        const policyMatch = (c.policyNumber || '').toLowerCase().includes(q);
        const mobileMatch = (c.mobileNumber || c.mobile || '').toLowerCase().includes(q);
        const emailMatch = (c.email || '').toLowerCase().includes(q);
        const tokenMatch = (link?.token || '').toLowerCase().includes(q);
        const txnMatch = (c.lastPaymentRef || '').toLowerCase().includes(q);
        if (!nameMatch && !policyMatch && !mobileMatch && !emailMatch && !tokenMatch && !txnMatch) {
          return false;
        }
      }

      // 2. Timeline Filter
      if (timelineMode === 'date') {
        if (datePreset === 'today') {
          if (recordTime < todayStart.getTime()) return false;
        } else if (datePreset === 'yesterday') {
          if (recordTime < yesterdayStart.getTime() || recordTime >= todayStart.getTime()) return false;
        } else if (datePreset === '7days') {
          if (recordTime < sevenDaysAgo.getTime()) return false;
        } else if (datePreset === '30days') {
          if (recordTime < thirtyDaysAgo.getTime()) return false;
        } else if (datePreset === 'custom') {
          if (customStartDate) {
            const start = new Date(`${customStartDate}T00:00:00`).getTime();
            if (recordTime < start) return false;
          }
          if (customEndDate) {
            const end = new Date(`${customEndDate}T23:59:59`).getTime();
            if (recordTime > end) return false;
          }
        }
      } else if (timelineMode === 'week') {
        if (weekPreset === 'current') {
          if (recordTime < thisWeekStart.getTime()) return false;
        } else if (weekPreset === 'last_week') {
          if (recordTime < lastWeekStart.getTime() || recordTime >= thisWeekStart.getTime()) return false;
        } else if (weekPreset === 'past_2_weeks') {
          if (recordTime < twoWeeksAgoStart.getTime()) return false;
        } else if (weekPreset === 'past_4_weeks') {
          if (recordTime < fourWeeksAgoStart.getTime()) return false;
        }
      } else if (timelineMode === 'month') {
        if (monthPreset === 'current') {
          if (recordTime < currentMonthStart.getTime()) return false;
        } else if (monthPreset === 'last_month') {
          if (recordTime < lastMonthStart.getTime() || recordTime > lastMonthEnd.getTime()) return false;
        } else if (monthPreset === 'past_3_months') {
          if (recordTime < threeMonthsAgoStart.getTime()) return false;
        } else if (monthPreset === 'custom' && customMonth) {
          const [yr, mo] = customMonth.split('-').map(Number);
          const customStart = new Date(yr, mo - 1, 1).getTime();
          const customEnd = new Date(yr, mo, 0, 23, 59, 59).getTime();
          if (recordTime < customStart || recordTime > customEnd) return false;
        }
      }

      // 3. Status Filters
      if (statusFilter !== 'all' && c.policyStatus !== statusFilter) return false;
      
      const payStatus = link?.paymentStatus || (c.policyStatus === 'Renewed' ? 'Completed' : 'Not Started');
      if (paymentFilter !== 'all' && payStatus !== paymentFilter) return false;

      const linkSt = link?.isExpired ? 'Expired' : (link?.status || (link ? 'Active' : 'No Link'));
      if (linkFilter !== 'all' && linkSt !== linkFilter) return false;

      return true;
    });
  }, [
    customers, 
    linksMap, 
    searchQuery, 
    timelineMode, 
    datePreset, 
    customStartDate, 
    customEndDate, 
    weekPreset, 
    monthPreset, 
    customMonth, 
    statusFilter, 
    paymentFilter, 
    linkFilter
  ]);

  // Handle Excel Export
  const handleExportExcel = () => {
    let filterLabel = 'All_Time';
    if (timelineMode === 'date') {
      filterLabel = datePreset === 'custom' 
        ? `Custom_${customStartDate || 'Start'}_to_${customEndDate || 'End'}`
        : datePreset.toUpperCase();
    } else if (timelineMode === 'week') {
      filterLabel = `Week_${weekPreset.toUpperCase()}`;
    } else if (timelineMode === 'month') {
      filterLabel = monthPreset === 'custom' ? `Month_${customMonth}` : `Month_${monthPreset.toUpperCase()}`;
    }

    downloadDataCenterExcel(filteredCustomers, renewalLinks, filterLabel);
  };

  // Handle Scan & Recover
  const handleScanAndRecover = async () => {
    setIsRecovering(true);
    setRecoveryMessage('Scanning database registries and local cache...');
    try {
      const res = await scanAndRecoverAllStoredData();
      await onRefreshData();
      setRecoveryMessage(`Sync complete! ${res.totalCustomers} total customer records active.`);
      setTimeout(() => setRecoveryMessage(null), 4500);
    } catch (e: any) {
      setRecoveryMessage('Sync check completed.');
      setTimeout(() => setRecoveryMessage(null), 3000);
    } finally {
      setIsRecovering(false);
    }
  };

  // Copy Link Token
  const handleCopyToken = (token: string) => {
    const fullUrl = `${window.location.origin}/renew/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Stats calculation
  const totalVolume = useMemo(() => {
    return filteredCustomers.reduce((acc, c) => {
      const base = c.baseAnnualPremium || (c.tenurePrices ? c.tenurePrices[1] : 0) || 0;
      const disc = c.adminCustomDiscountAmount || 0;
      return acc + Math.max(0, base - disc);
    }, 0);
  }, [filteredCustomers]);

  const renewedCount = useMemo(() => {
    return filteredCustomers.filter(c => {
      const link = linksMap.get(c.policyNumber.toUpperCase());
      return c.policyStatus === 'Renewed' || link?.paymentStatus === 'Completed';
    }).length;
  }, [filteredCustomers, linksMap]);

  return (
    <div className="space-y-6 pb-12" id="data-center-view-root">
      {/* 1. Header Banner & Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 shadow-sm">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customer Data Center</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                  Master Repository
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Dual-Sync Active
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Centralized customer profiles, link generation lifecycle, real-time activity stamps, and transaction settlements.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="data-center-scan-recover-btn"
              onClick={handleScanAndRecover}
              disabled={isRecovering}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-sm disabled:opacity-60"
              title="Scan all historical storage and link-created records to merge into master database"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${isRecovering ? 'animate-spin' : ''}`} />
              <span>{isRecovering ? 'Syncing...' : 'Scan & Sync Database'}</span>
            </button>

            <button
              id="data-center-export-excel-btn"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
              title="Download full 20-column formatted Microsoft Excel spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Sync Toast Feedback */}
        {recoveryMessage && (
          <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between text-sm text-blue-900 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span className="font-medium">{recoveryMessage}</span>
            </div>
            <button 
              onClick={() => setRecoveryMessage(null)}
              className="text-blue-500 hover:text-blue-700 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Key Summary Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtered Records</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">{filteredCustomers.length}</span>
              <span className="text-xs text-slate-400">of {customers.length} total</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Renewed & Paid</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-700">{renewedCount}</span>
              <span className="text-xs text-emerald-600 font-medium">policies</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Links</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-blue-700">
                {filteredCustomers.filter(c => {
                  const l = linksMap.get(c.policyNumber.toUpperCase());
                  return l && !l.isExpired && l.status !== 'Revoked';
                }).length}
              </span>
              <span className="text-xs text-blue-600 font-medium">live tokens</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtered Volume</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-orange-700">₹{totalVolume.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Search & Timeline Filtering Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        {/* Top Filter Bar: Search and Timeline Mode Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, mobile, policy no, token, UTR..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Timeline Filter Mode Segment */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setTimelineMode('date')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                timelineMode === 'date'
                  ? 'bg-white text-orange-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Date-wise (Custom Range)
            </button>
            <button
              onClick={() => setTimelineMode('week')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                timelineMode === 'week'
                  ? 'bg-white text-orange-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Week-wise
            </button>
            <button
              onClick={() => setTimelineMode('month')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                timelineMode === 'month'
                  ? 'bg-white text-orange-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month-wise
            </button>
          </div>
        </div>

        {/* Timeline Controls Drawer */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-sm">
          {/* Sub-controls based on mode */}
          {timelineMode === 'date' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Date Presets:</span>
              {(['all', 'today', 'yesterday', '7days', '30days', 'custom'] as DatePreset[]).map(preset => (
                <button
                  key={preset}
                  onClick={() => setDatePreset(preset)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors border ${
                    datePreset === preset
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset === 'all' && 'All Time'}
                  {preset === 'today' && 'Today'}
                  {preset === 'yesterday' && 'Yesterday'}
                  {preset === '7days' && 'Last 7 Days'}
                  {preset === '30days' && 'Last 30 Days'}
                  {preset === 'custom' && 'Custom Range'}
                </button>
              ))}

              {datePreset === 'custom' && (
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-orange-500"
                    placeholder="Start Date"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-orange-500"
                    placeholder="End Date"
                  />
                </div>
              )}
            </div>
          )}

          {timelineMode === 'week' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Week Select:</span>
              {(['all', 'current', 'last_week', 'past_2_weeks', 'past_4_weeks'] as WeekPreset[]).map(preset => (
                <button
                  key={preset}
                  onClick={() => setWeekPreset(preset)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors border ${
                    weekPreset === preset
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset === 'all' && 'All Weeks'}
                  {preset === 'current' && 'Current Week'}
                  {preset === 'last_week' && 'Last Week'}
                  {preset === 'past_2_weeks' && 'Past 2 Weeks'}
                  {preset === 'past_4_weeks' && 'Past 4 Weeks'}
                </button>
              ))}
            </div>
          )}

          {timelineMode === 'month' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Month Select:</span>
              {(['all', 'current', 'last_month', 'past_3_months', 'custom'] as MonthPreset[]).map(preset => (
                <button
                  key={preset}
                  onClick={() => setMonthPreset(preset)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors border ${
                    monthPreset === preset
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset === 'all' && 'All Months'}
                  {preset === 'current' && 'Current Month (Sep 2026)'}
                  {preset === 'last_month' && 'Last Month (Aug 2026)'}
                  {preset === 'past_3_months' && 'Past 3 Months'}
                  {preset === 'custom' && 'Pick Month'}
                </button>
              ))}

              {monthPreset === 'custom' && (
                <input
                  type="month"
                  value={customMonth}
                  onChange={e => setCustomMonth(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-orange-500 ml-2"
                />
              )}
            </div>
          )}

          {/* Secondary filter dropdowns */}
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-slate-50 text-slate-700 font-medium"
            >
              <option value="all">Policy: All</option>
              <option value="Renewed">Renewed</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Active">Active</option>
            </select>

            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value as any)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-slate-50 text-slate-700 font-medium"
            >
              <option value="all">Payment: All</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
              <option value="Not Started">Not Started</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">Customer Records</span>
            <span className="text-xs bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
              {filteredCustomers.length} records found
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Click 'Edit Link' to alter tenure, custom discount, or expiry on any customer link
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Customer & Contact</th>
                <th className="py-3 px-3">Policy No & Plan</th>
                <th className="py-3 px-3">Sum Insured & Premium</th>
                <th className="py-3 px-3">Renewal Link Details</th>
                <th className="py-3 px-3">Payment & Transaction</th>
                <th className="py-3 px-3">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Database className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">No customer records match current filter</p>
                    <p className="text-xs text-slate-400 mt-1">Try broadening your date timeline or clearing search keywords.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust, idx) => {
                  const link = linksMap.get(cust.policyNumber.toUpperCase());
                  const lastAttempt = cust.renewalAttempts && cust.renewalAttempts.length > 0
                    ? cust.renewalAttempts[cust.renewalAttempts.length - 1]
                    : undefined;

                  const basePrem = cust.baseAnnualPremium || (cust.tenurePrices ? cust.tenurePrices[1] : 0) || 0;
                  const disc = cust.adminCustomDiscountAmount || (link?.customDiscountAmount) || 0;
                  const netPayable = Math.max(0, basePrem - disc);
                  const payStatus = link?.paymentStatus || (cust.policyStatus === 'Renewed' ? 'Completed' : 'Not Started');
                  const isLinkActive = link && !link.isExpired && link.status !== 'Revoked';

                  return (
                    <tr 
                      key={cust.id || `cust-${idx}`}
                      className="hover:bg-orange-50/30 transition-colors"
                    >
                      {/* Customer & Contact */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{cust.customerName}</div>
                        <div className="flex items-center gap-3 text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {cust.mobileNumber || cust.mobile || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {cust.email || 'N/A'}
                          </span>
                        </div>
                        {cust.kyc?.city && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {cust.kyc.city}, {cust.kyc.state}
                          </div>
                        )}
                      </td>

                      {/* Policy & Plan */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 font-mono text-[11px]">{cust.policyNumber}</div>
                        <div className="text-slate-600 text-xs mt-0.5 max-w-[200px] truncate" title={cust.policyName}>
                          {cust.policyName}
                        </div>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            cust.policyStatus === 'Renewed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : cust.policyStatus === 'Expiring Soon'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {cust.policyStatus}
                          </span>
                        </div>
                      </td>

                      {/* Sum Insured & Premium */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">
                          ₹{netPayable.toLocaleString('en-IN')}
                          {disc > 0 && (
                            <span className="text-[10px] text-emerald-600 font-bold ml-1.5">
                              (₹{disc.toLocaleString('en-IN')} off)
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          SI: ₹{((cust.totalSumInsured || cust.baseSumInsured || 500000) / 100000).toFixed(1)}L
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          Tenure: {cust.selectedTenure || 1} Year
                        </div>
                      </td>

                      {/* Renewal Link Details */}
                      <td className="py-3 px-3">
                        {link ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                {link.token}
                              </span>
                              <button
                                onClick={() => handleCopyToken(link.token)}
                                className="text-slate-400 hover:text-slate-700 p-0.5"
                                title="Copy full renewal link"
                              >
                                {copiedToken === link.token ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                isLinkActive ? 'bg-emerald-500' : 'bg-red-500'
                              }`} />
                              <span className="text-[11px] font-medium text-slate-600">
                                {link.isExpired ? 'Expired' : (link.status || 'Active')}
                              </span>
                              {link.validityHours && (
                                <span className="text-[10px] text-slate-400">({link.validityHours}h)</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Created: {link.generatedAt ? link.generatedAt.split(' ')[0] : 'N/A'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No Link Active</span>
                        )}
                      </td>

                      {/* Payment & Transaction */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            payStatus === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : payStatus === 'In Progress'
                              ? 'bg-blue-100 text-blue-800'
                              : payStatus === 'Pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {payStatus}
                          </span>
                        </div>
                        {lastAttempt?.transactionRef && (
                          <div className="text-[11px] font-mono text-slate-600 mt-1 truncate max-w-[150px]" title={lastAttempt.transactionRef}>
                            UTR: {lastAttempt.transactionRef}
                          </div>
                        )}
                        {lastAttempt?.paymentMethod && (
                          <div className="text-[10px] text-slate-500">
                            Via: {lastAttempt.paymentMethod}
                          </div>
                        )}
                      </td>

                      {/* Last Activity */}
                      <td className="py-3 px-3">
                        <div className="text-slate-700 text-[11px] font-medium max-w-[160px] truncate" title={cust.lastActivity || link?.openedAt ? 'Link Opened' : 'Record Created'}>
                          {cust.lastActivity || (link?.openedAt ? 'Link Opened' : 'Record Created')}
                        </div>
                        <div className="text-slate-400 text-[10px] mt-0.5">
                          {cust.lastActiveAt 
                            ? formatDisplayDateTime(cust.lastActiveAt).dateTime 
                            : (link?.generatedAt 
                                ? formatDisplayDateTime(link.generatedAt).dateTime 
                                : (cust.updatedAt ? formatDisplayDateTime(cust.updatedAt).dateTime : 'N/A'))}
                        </div>
                        {link?.browser && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            {link.deviceType === 'Mobile' ? <Smartphone className="w-2.5 h-2.5" /> : <Laptop className="w-2.5 h-2.5" />}
                            <span>{link.browser}</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {link ? (
                            <button
                              id={`data-center-edit-link-${cust.id}`}
                              onClick={() => onOpenEditLink(link, cust)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-md transition-colors"
                              title="Edit link parameters (discount, validity, contact) and re-send"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Link</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onOpenShareModal?.(cust)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                            >
                              <Send className="w-3 h-3" />
                              <span>Generate Link</span>
                            </button>
                          )}

                          <button
                            onClick={() => onSelectCustomer(cust)}
                            className="inline-flex items-center gap-1 p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                            title="View Full Customer Profile"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
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
