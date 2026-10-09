import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Calendar, 
  Download, 
  X, 
  CheckSquare, 
  Square, 
  ShieldCheck, 
  Filter, 
  Clock, 
  Users, 
  CreditCard, 
  FileText, 
  Mail,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  CustomerPolicy, 
  ActivityLog, 
  RenewalAttempt, 
  SoftCopyLinkRecord, 
  EmailLogRecord 
} from '../types/insurance';
import { 
  ExportFilterOptions, 
  SelectedDatasets, 
  exportMasterExcelReport, 
  exportSingleSheetExcel, 
  filterRecordsByOptions, 
  formatActivityLogsForExcel, 
  formatCustomersForExcel, 
  formatPaymentsForExcel, 
  formatSoftCopyForExcel, 
  getExportFilterLabel 
} from '../utils/excelExport';
import { getMonthLabel } from '../utils/dateUtils';

export interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerPolicy[];
  activityLogs: ActivityLog[];
  paymentAttempts: RenewalAttempt[];
  softCopyLinks: SoftCopyLinkRecord[];
  emailLogs: EmailLogRecord[];
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  customers,
  activityLogs,
  paymentAttempts,
  softCopyLinks,
  emailLogs
}) => {
  if (!isOpen) return null;

  // Filter mode: 'monthly' vs 'date'
  const [filterMode, setFilterMode] = useState<'monthly' | 'date'>('monthly');

  // Month selector
  const currentYearMonth = new Date().toISOString().substring(0, 7); // e.g. "2026-09"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);

  // Date selector
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Selected datasets to include
  const [selectedDatasets, setSelectedDatasets] = useState<SelectedDatasets>({
    activityLogs: true,
    customers: true,
    payments: true,
    softCopy: true,
    emailLogs: true
  });

  const toggleDataset = (key: keyof SelectedDatasets) => {
    setSelectedDatasets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllDatasets = () => {
    setSelectedDatasets({
      activityLogs: true,
      customers: true,
      payments: true,
      softCopy: true,
      emailLogs: true
    });
  };

  const filterOptions: ExportFilterOptions = useMemo(() => ({
    mode: filterMode,
    selectedMonth,
    dateFilter,
    startDate,
    endDate
  }), [filterMode, selectedMonth, dateFilter, startDate, endDate]);

  // Compute matching counts live
  const matchingActivity = useMemo(() => 
    filterRecordsByOptions(activityLogs, filterOptions, item => item.timestamp),
    [activityLogs, filterOptions]
  );

  const matchingCustomers = useMemo(() => 
    filterRecordsByOptions(customers, filterOptions, item => item.createdAt || item.policyStartDate),
    [customers, filterOptions]
  );

  const matchingPayments = useMemo(() => 
    filterRecordsByOptions(paymentAttempts, filterOptions, item => item.dateTime),
    [paymentAttempts, filterOptions]
  );

  const matchingSoftCopy = useMemo(() => 
    filterRecordsByOptions(softCopyLinks, filterOptions, item => item.generatedAt || item.createdAt),
    [softCopyLinks, filterOptions]
  );

  const matchingEmails = useMemo(() => 
    filterRecordsByOptions(emailLogs, filterOptions, item => item.sentAt || (item as any).formattedDateTime),
    [emailLogs, filterOptions]
  );

  // Available past months (last 12 months)
  const availableMonths = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      list.push({
        value: val,
        label: i === 0 ? `${getMonthLabel(val)} (Current Month)` : getMonthLabel(val)
      });
    }
    return list;
  }, []);

  const handleDownloadMaster = () => {
    exportMasterExcelReport({
      customers,
      activityLogs,
      paymentAttempts,
      softCopyLinks,
      emailLogs,
      filterOptions,
      selectedDatasets
    });
  };

  const handleDownloadSingle = (type: 'logs' | 'customers' | 'payments' | 'softcopy') => {
    const label = getExportFilterLabel(filterOptions);
    if (type === 'logs') {
      const rows = formatActivityLogsForExcel(matchingActivity);
      exportSingleSheetExcel('Activity Logs', rows, 'ICICI_Lombard_Activity_Logs', label);
    } else if (type === 'customers') {
      const rows = formatCustomersForExcel(matchingCustomers);
      exportSingleSheetExcel('Customer Master', rows, 'ICICI_Lombard_Customer_Directory', label);
    } else if (type === 'payments') {
      const rows = formatPaymentsForExcel(matchingPayments, customers);
      exportSingleSheetExcel('Payment Transactions', rows, 'ICICI_Lombard_Payment_Transactions', label);
    } else if (type === 'softcopy') {
      const rows = formatSoftCopyForExcel(matchingSoftCopy, customers);
      exportSingleSheetExcel('Soft Copy Logs', rows, 'ICICI_Lombard_SoftCopy_Verification_Logs', label);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-auto">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-[#00264A] to-[#0A3D68] text-white p-5 sm:p-6 flex items-start justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">Download Data Logs (Excel)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white tracking-wider uppercase">
                  .XLSX Native
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                Export complete audit logs, customer registry, and transaction reports monthly-wise or date-wise.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto text-slate-800">
          
          {/* 1. FILTER MODE SELECTION: MONTHLY WISE VS DATE WISE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#EA580C]" />
                <span>1. Select Export Timeline Filter</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterMode('monthly')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  filterMode === 'monthly'
                    ? 'bg-white text-[#EA580C] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Monthly-Wise Export</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('date')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  filterMode === 'date'
                    ? 'bg-white text-[#EA580C] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Date-Wise / Period Export</span>
              </button>
            </div>

            {/* MONTHLY PICKER */}
            {filterMode === 'monthly' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <label className="block text-xs font-bold text-slate-700">Select Month to Export</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#EA580C] outline-none"
                    >
                      <option value="all">Complete Database (All Months / All-Time)</option>
                      {availableMonths.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center text-xs text-slate-500 bg-white px-3 py-2 rounded-xl border border-slate-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 mr-2 shrink-0" />
                    <span>Includes all logs, new customers & payments for {selectedMonth === 'all' ? 'All Months' : getMonthLabel(selectedMonth)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* DATE PICKER */}
            {filterMode === 'date' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <label className="block text-xs font-bold text-slate-700">Select Date Range</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: '7days', label: 'Last 7 Days' },
                    { id: '30days', label: 'Last 30 Days' },
                    { id: 'custom', label: 'Custom Range' },
                    { id: 'all', label: 'All-Time' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDateFilter(opt.id as any)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer text-center ${
                        dateFilter === opt.id
                          ? 'border-[#EA580C] bg-orange-50 text-[#EA580C]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {dateFilter === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#EA580C] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#EA580C] outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. DATASETS TO INCLUDE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>2. Select Data Sheets to Include</span>
              </label>
              <button
                type="button"
                onClick={selectAllDatasets}
                className="text-[11px] text-[#EA580C] hover:underline font-bold cursor-pointer"
              >
                Select All Sheets
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* SHEET: ACTIVITY AUDIT LOGS */}
              <div 
                onClick={() => toggleDataset('activityLogs')}
                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  selectedDatasets.activityLogs
                    ? 'border-emerald-500 bg-emerald-50/40 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="text-emerald-600">
                    {selectedDatasets.activityLogs ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Activity & Security Logs</span>
                    <span className="text-[10px] text-slate-500">{matchingActivity.length} records matching</span>
                  </div>
                </div>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>

              {/* SHEET: CUSTOMER DIRECTORY */}
              <div 
                onClick={() => toggleDataset('customers')}
                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  selectedDatasets.customers
                    ? 'border-blue-500 bg-blue-50/40 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="text-blue-600">
                    {selectedDatasets.customers ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Customer & Policy Master</span>
                    <span className="text-[10px] text-slate-500">{matchingCustomers.length} customers (Never Deleted)</span>
                  </div>
                </div>
                <Users className="w-4 h-4 text-slate-400" />
              </div>

              {/* SHEET: PAYMENT ATTEMPTS */}
              <div 
                onClick={() => toggleDataset('payments')}
                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  selectedDatasets.payments
                    ? 'border-amber-500 bg-amber-50/40 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="text-amber-600">
                    {selectedDatasets.payments ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Payment Attempts & Transactions</span>
                    <span className="text-[10px] text-slate-500">{matchingPayments.length} transactions logged</span>
                  </div>
                </div>
                <CreditCard className="w-4 h-4 text-slate-400" />
              </div>

              {/* SHEET: SOFT COPY & VERIFICATIONS */}
              <div 
                onClick={() => toggleDataset('softCopy')}
                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  selectedDatasets.softCopy
                    ? 'border-orange-500 bg-orange-50/40 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="text-[#EA580C]">
                    {selectedDatasets.softCopy ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Soft Copy & Verification Logs</span>
                    <span className="text-[10px] text-slate-500">{matchingSoftCopy.length} verification records</span>
                  </div>
                </div>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>

              {/* SHEET: EMAIL LOGS */}
              <div 
                onClick={() => toggleDataset('emailLogs')}
                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between sm:col-span-2 ${
                  selectedDatasets.emailLogs
                    ? 'border-indigo-500 bg-indigo-50/40 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="text-indigo-600">
                    {selectedDatasets.emailLogs ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Email Dispatch Logs</span>
                    <span className="text-[10px] text-slate-500">{matchingEmails.length} dispatched emails</span>
                  </div>
                </div>
                <Mail className="w-4 h-4 text-slate-400" />
              </div>

            </div>
          </div>

          {/* PERMANENT STORAGE GUARANTEE NOTICE */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-900">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-extrabold block">Permanent Data Preservation Guaranteed</strong>
              <span>
                All new customer entries and system activity logs are permanently archived in the central database registry and browser cache. Records are never deleted or purged.
              </span>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Quick Downloads:</span>
            <button
              type="button"
              onClick={() => handleDownloadSingle('logs')}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              Activity Only
            </button>
            <button
              type="button"
              onClick={() => handleDownloadSingle('customers')}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              Customers Only
            </button>
            <button
              type="button"
              onClick={() => handleDownloadSingle('payments')}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              Payments Only
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="download-master-excel-btn"
              onClick={handleDownloadMaster}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Master Excel (.xlsx)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
