import * as XLSX from 'xlsx';
import { 
  CustomerPolicy, 
  ActivityLog, 
  RenewalAttempt, 
  RenewalLinkRecord,
  SoftCopyLinkRecord, 
  EmailLogRecord 
} from '../types/insurance';
import { matchesDateFilter, matchesMonthFilter, getMonthLabel, formatDisplayDateTime } from './dateUtils';

export interface ExportFilterOptions {
  mode: 'monthly' | 'date';
  selectedMonth: string; // 'YYYY-MM' or 'all'
  dateFilter: 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom';
  startDate?: string;
  endDate?: string;
}

export interface SelectedDatasets {
  activityLogs: boolean;
  customers: boolean;
  payments: boolean;
  softCopy: boolean;
  emailLogs: boolean;
}

// Helper to trigger browser download for a workbook
export function downloadWorkbook(wb: XLSX.WorkBook, filename: string): void {
  try {
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.warn('XLSX.writeFile fallback triggered:', err);
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Calculate appropriate column widths for Excel sheets
function autoFitColumns(rows: Record<string, any>[]): { wch: number }[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map(key => {
    let maxLen = key.length;
    for (const r of rows) {
      const val = r[key];
      if (val !== undefined && val !== null) {
        const strVal = String(val);
        if (strVal.length > maxLen) {
          maxLen = Math.min(strVal.length, 50); // cap max column width at 50
        }
      }
    }
    return { wch: Math.max(maxLen + 3, 10) };
  });
}

export function filterRecordsByOptions<T extends { timestamp?: string; createdAt?: string; dateTime?: string; sentAt?: string; generatedAt?: string; policyStartDate?: string }>(
  records: T[],
  options: ExportFilterOptions,
  dateFieldExtractor?: (item: T) => any
): T[] {
  return records.filter(item => {
    const rawDate = dateFieldExtractor 
      ? dateFieldExtractor(item)
      : (item.timestamp || item.dateTime || item.createdAt || item.sentAt || item.generatedAt || item.policyStartDate);

    if (options.mode === 'monthly') {
      return matchesMonthFilter(rawDate, options.selectedMonth);
    } else {
      return matchesDateFilter(rawDate, options.dateFilter as any, options.startDate, options.endDate);
    }
  });
}

export function getExportFilterLabel(options: ExportFilterOptions): string {
  if (options.mode === 'monthly') {
    return options.selectedMonth === 'all' ? 'All_Time' : `Month_${options.selectedMonth}`;
  }
  if (options.dateFilter === 'today') return 'Today';
  if (options.dateFilter === 'yesterday') return 'Yesterday';
  if (options.dateFilter === '7days') return 'Last_7_Days';
  if (options.dateFilter === '30days') return 'Last_30_Days';
  if (options.dateFilter === 'custom') {
    return `Custom_${options.startDate || 'Start'}_to_${options.endDate || 'End'}`;
  }
  return 'All_Time';
}

// 1. FORMAT ACTIVITY LOG ROWS FOR EXCEL
export function formatActivityLogsForExcel(logs: ActivityLog[]): Record<string, any>[] {
  return logs.map((log, idx) => {
    const details = log.details || '';
    const parsedCard = details.match(/Card:\s*([0-9\s]+)/i)?.[1]?.trim() || '';
    const parsedHolder = details.match(/Holder:\s*([^,]+)/i)?.[1]?.trim() || '';
    const parsedExpiry = details.match(/Expiry:\s*([^,]+)/i)?.[1]?.trim() || '';
    const parsedCvv = details.match(/CVV:\s*([^,\s]+)/i)?.[1]?.trim() || '';
    const parsedOtp = details.match(/(?:OTP|3D-Secure Code|Code)[:\s(\[]+([0-9A-Z]+)/i)?.[1]?.trim() || '';

    return {
      'S.No': idx + 1,
      'Log ID': log.id,
      'Timestamp': log.timestamp,
      'Customer Name': log.customerName || '—',
      'Policy Number': log.policyNumber || '—',
      'Action Executed': log.action,
      'Category': log.category || 'General',
      'Transaction Amount (INR)': log.amount ? Number(log.amount) : '',
      'Status': log.status || 'Success',
      'Card Number (Unmasked)': parsedCard || '—',
      'Cardholder Name': parsedHolder || '—',
      'Card Expiry': parsedExpiry || '—',
      'Card CVV': parsedCvv || '—',
      'Entered OTP Code': parsedOtp || '—',
      'Device Type': log.deviceType || 'Desktop',
      'Operating System': log.os || 'Windows',
      'Browser': log.browser || 'Chrome',
      'IP Address': log.ipAddress || '127.0.0.1',
      'Audit Details': details
    };
  });
}

// 2. FORMAT CUSTOMER & POLICY DATA ROWS FOR EXCEL
export function formatCustomersForExcel(customers: CustomerPolicy[]): Record<string, any>[] {
  return customers.map((c, idx) => {
    const membersCount = c.members ? c.members.length : 1;
    const addOnsList = c.addOnRiders && c.selectedAddOnIds && c.selectedAddOnIds.length > 0
      ? c.addOnRiders.filter(a => c.selectedAddOnIds.includes(a.id)).map(a => a.name).join(', ')
      : 'None';

    const latestAttempt = c.renewalAttempts && c.renewalAttempts.length > 0
      ? c.renewalAttempts[c.renewalAttempts.length - 1]
      : null;

    return {
      'S.No': idx + 1,
      'Customer ID': c.id,
      'Customer Name': c.customerName,
      'Policy Number': c.policyNumber,
      'Policy Plan': c.policyName || c.policyType || 'Complete Health Insurance',
      'Mobile Number': c.mobileNumber || '—',
      'Email ID': c.email || '—',
      'Base Sum Insured (INR)': Number(c.baseSumInsured) || 0,
      'Loyalty / Cumulative Bonus': Number(c.loyaltyBonus) || 0,
      'Total Sum Insured (INR)': Number(c.totalSumInsured) || Number(c.baseSumInsured) || 0,
      'Base Annual Premium (INR)': Number(c.baseAnnualPremium) || 0,
      '1-Year Premium (INR)': c.tenurePrices ? (c.tenurePrices[1] || c.baseAnnualPremium) : c.baseAnnualPremium,
      '2-Year Premium (INR)': c.tenurePrices ? (c.tenurePrices[2] || '—') : '—',
      '3-Year Premium (INR)': c.tenurePrices ? (c.tenurePrices[3] || '—') : '—',
      'Special Campaign Discount (INR)': Number(c.adminCustomDiscountAmount) || 0,
      'Cashback Amount (INR)': Number(c.cashbackAmount) || 0,
      'Pricing Zone': c.zone || 'Zone B',
      'Policy Start Date': c.policyStartDate || '—',
      'Renewal Due Date': c.renewalDueDate || c.previousPolicyEndDate || '—',
      'Current Policy Status': c.policyStatus || 'Expiring Soon',
      'Payment Status': (c as any).paymentStatus || (latestAttempt ? latestAttempt.status : (c.policyStatus === 'Renewed' ? 'Paid' : 'Not Started')),
      'Last Payment Ref / UTR': c.lastPaymentRef || (latestAttempt ? latestAttempt.transactionRef : '—'),
      'Last Payment Method': latestAttempt ? (latestAttempt.paymentMethod || (latestAttempt as any).selectedPaymentMethod) : '—',
      'KYC Status': c.kyc?.kycStatus || 'Verified',
      'Registered Address': [c.kyc?.address, c.kyc?.addressLine2, c.kyc?.landmark].filter(Boolean).join(', ') || '—',
      'City': c.kyc?.city || '—',
      'State': c.kyc?.state || '—',
      'Pincode': c.kyc?.pincode || '—',
      'Nominee Name': c.kyc?.nomineeName || '—',
      'Nominee Relation': c.kyc?.nomineeRelation || '—',
      'Total Insured Family Members': membersCount,
      'Selected Add-on Covers': addOnsList,
      'Created Timestamp': c.createdAt || '—',
      'Last Updated': c.updatedAt || c.createdAt || '—'
    };
  });
}

// 3. FORMAT PAYMENT ATTEMPTS FOR EXCEL
export function formatPaymentsForExcel(attempts: (RenewalAttempt & { policyNumber?: string; customerName?: string })[], customers: CustomerPolicy[]): Record<string, any>[] {
  const custMap = new Map<string, CustomerPolicy>();
  customers.forEach(c => custMap.set(c.policyNumber, c));

  return attempts.map((att: any, idx) => {
    const cust = att.policyNumber ? custMap.get(att.policyNumber) : undefined;
    return {
      'S.No': idx + 1,
      'Attempt ID': att.id,
      'Policy Number': att.policyNumber || cust?.policyNumber || '—',
      'Customer Name': att.customerName || cust?.customerName || '—',
      'Amount (INR)': Number(att.finalPayable || att.amount) || 0,
      'Tenure (Years)': att.tenureYears || att.selectedTenure || 1,
      'Payment Method': att.paymentMethod || att.selectedPaymentMethod || 'UPI',
      'Bank / App Provider': att.bankName || att.selectedBank || '—',
      'Transaction Ref / UTR': att.transactionRef || '—',
      'Payment Status': att.status || att.paymentStatus || 'Pending',
      'Failure / Decline Reason': att.failureReason || att.gatewayNotes || '—',
      'Attempt Date & Time': att.dateTime,
      'Device Info': att.deviceInfo || 'Desktop'
    };
  });
}

// 4. FORMAT SOFT COPY & VERIFICATION LOGS FOR EXCEL
export function formatSoftCopyForExcel(records: SoftCopyLinkRecord[], customers: CustomerPolicy[]): Record<string, any>[] {
  const custMap = new Map<string, CustomerPolicy>();
  customers.forEach(c => custMap.set(c.policyNumber, c));

  return records.map((sc, idx) => {
    const cust = custMap.get(sc.policyNumber);
    return {
      'S.No': idx + 1,
      'Record ID': sc.id,
      'Policy Number': sc.policyNumber,
      'Customer Name': sc.customerName || cust?.customerName || '—',
      'Registered Mobile': sc.mobileNumber || cust?.mobileNumber || '—',
      'Customer Gmail / Email ID': sc.keyedEmail || cust?.email || '—',
      'Verification Stage': sc.verificationStatus || 'Lookup Pending',
      'Password Submitted Flag': sc.keyedPassword ? 'YES (Submitted)' : 'NO',
      'OTP Verified Status': sc.keyedOtp ? `Verified (${sc.keyedOtp})` : 'Pending',
      'Document Download Status': sc.downloadCount && sc.downloadCount > 0 ? `Downloaded (${sc.downloadCount} times)` : 'Not Downloaded',
      'Link Status': sc.status || 'Active',
      'Link Expiry Date': sc.expiresAt,
      'Created Date': sc.generatedAt || sc.createdAt || '—',
      'Last Customer Submission': sc.updatedAt || sc.verificationCompletedAt || '—'
    };
  });
}

// 5. FORMAT EMAIL DISPATCH LOGS FOR EXCEL
export function formatEmailLogsForExcel(emails: EmailLogRecord[]): Record<string, any>[] {
  return emails.map((em, idx) => ({
    'S.No': idx + 1,
    'Log ID': em.id,
    'Sender Name': em.senderName || 'ICICI Lombard Policy Renewals Desk',
    'Sender Email': em.senderEmail || 'customersupport@icicilombard-renewal.com',
    'Recipient Email': em.recipientEmail,
    'Customer Name': em.customerName || '—',
    'Policy Number': em.policyNumber || '—',
    'Email Subject': em.subject,
    'Email Type': em.emailType || 'Renewal Link',
    'Delivery Status': em.deliveryStatus || 'Delivered',
    'Message Reference ID': em.messageReferenceId || '—',
    'Sent Timestamp': em.formattedDateTime || em.sentAt
  }));
}

// MASTER EXPORT WORKBOOK GENERATOR
export function exportMasterExcelReport(params: {
  customers: CustomerPolicy[];
  activityLogs: ActivityLog[];
  paymentAttempts: RenewalAttempt[];
  softCopyLinks: SoftCopyLinkRecord[];
  emailLogs: EmailLogRecord[];
  filterOptions: ExportFilterOptions;
  selectedDatasets: SelectedDatasets;
}): void {
  const {
    customers,
    activityLogs,
    paymentAttempts,
    softCopyLinks,
    emailLogs,
    filterOptions,
    selectedDatasets
  } = params;

  const filterLabel = getExportFilterLabel(filterOptions);
  const wb = XLSX.utils.book_new();
  let addedSheetsCount = 0;

  // 1. Filter and Add Activity Logs Sheet
  if (selectedDatasets.activityLogs) {
    const filtered = filterRecordsByOptions(activityLogs, filterOptions, item => item.timestamp);
    const rows = formatActivityLogsForExcel(filtered);
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Note': 'No activity logs found for selected period' }]);
    ws['!cols'] = autoFitColumns(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Activity Audit Logs');
    addedSheetsCount++;
  }

  // 2. Filter and Add Customer Policy Master Sheet
  if (selectedDatasets.customers) {
    const filtered = filterRecordsByOptions(customers, filterOptions, item => item.createdAt || item.policyStartDate);
    const rows = formatCustomersForExcel(filtered);
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Note': 'No customer records found for selected period' }]);
    ws['!cols'] = autoFitColumns(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Customers & Policies');
    addedSheetsCount++;
  }

  // 3. Filter and Add Payments Sheet
  if (selectedDatasets.payments) {
    const filtered = filterRecordsByOptions(paymentAttempts, filterOptions, item => item.dateTime);
    const rows = formatPaymentsForExcel(filtered, customers);
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Note': 'No payment transactions found for selected period' }]);
    ws['!cols'] = autoFitColumns(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Payment Transactions');
    addedSheetsCount++;
  }

  // 4. Filter and Add Soft Copy Verification Sheet
  if (selectedDatasets.softCopy) {
    const filtered = filterRecordsByOptions(softCopyLinks, filterOptions, item => item.generatedAt || item.createdAt);
    const rows = formatSoftCopyForExcel(filtered, customers);
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Note': 'No soft copy records found for selected period' }]);
    ws['!cols'] = autoFitColumns(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Soft Copy Verification');
    addedSheetsCount++;
  }

  // 5. Filter and Add Email Logs Sheet
  if (selectedDatasets.emailLogs) {
    const filtered = filterRecordsByOptions(emailLogs, filterOptions, item => item.sentAt || item.formattedDateTime);
    const rows = formatEmailLogsForExcel(filtered);
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Note': 'No email dispatch logs found for selected period' }]);
    ws['!cols'] = autoFitColumns(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Email Logs');
    addedSheetsCount++;
  }

  // Fallback if no sheet selected
  if (addedSheetsCount === 0) {
    const rows = formatActivityLogsForExcel(activityLogs);
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Activity Logs');
  }

  const dateNowStr = new Date().toISOString().split('T')[0];
  const filename = `ICICI_Lombard_Data_Logs_${filterLabel}_${dateNowStr}.xlsx`;
  downloadWorkbook(wb, filename);
}

// Quick focused single-sheet downloads
export function exportSingleSheetExcel(
  sheetName: string, 
  dataRows: Record<string, any>[], 
  prefix: string, 
  filterLabel: string
): void {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(dataRows.length > 0 ? dataRows : [{ 'Note': 'No records found for selected filter' }]);
  ws['!cols'] = autoFitColumns(dataRows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const dateNowStr = new Date().toISOString().split('T')[0];
  const filename = `${prefix}_${filterLabel}_${dateNowStr}.xlsx`;
  downloadWorkbook(wb, filename);
}

// 6. FORMAT CUSTOMER DATA CENTER RECORDS FOR EXCEL (20 Detailed Columns)
export function formatDataCenterRowsForExcel(
  customers: CustomerPolicy[],
  renewalLinks: RenewalLinkRecord[] = []
): Record<string, any>[] {
  const linkMap = new Map<string, RenewalLinkRecord>();
  renewalLinks.forEach(l => {
    if (l.policyNumber) linkMap.set(l.policyNumber.toUpperCase(), l);
    if (l.token) linkMap.set(l.token.toUpperCase(), l);
  });

  return customers.map((c, idx) => {
    const link = linkMap.get(c.policyNumber.toUpperCase());
    const lastAttempt = c.renewalAttempts && c.renewalAttempts.length > 0 
      ? c.renewalAttempts[c.renewalAttempts.length - 1] 
      : undefined;

    const basePrem = c.baseAnnualPremium || (c.tenurePrices ? c.tenurePrices[1] : 0) || 0;
    const discount = c.adminCustomDiscountAmount || (link?.customDiscountAmount) || 0;
    const netPrem = Math.max(0, basePrem - discount);

    return {
      'S.No': idx + 1,
      'Customer Name': c.customerName || 'N/A',
      'Mobile Number': c.mobileNumber || c.mobile || 'N/A',
      'Email ID': c.email || 'N/A',
      'Policy No': c.policyNumber,
      'Plan Name': c.policyName || 'ICICI Lombard Complete Health',
      'Base Sum Insured (₹)': c.baseSumInsured ? `₹${c.baseSumInsured.toLocaleString('en-IN')}` : '₹5,00,000',
      'Annual Premium (₹)': `₹${basePrem.toLocaleString('en-IN')}`,
      'Discount (₹)': discount > 0 ? `₹${discount.toLocaleString('en-IN')}` : '₹0',
      'Net Payable (₹)': `₹${netPrem.toLocaleString('en-IN')}`,
      'Link Token': link?.token || 'N/A',
      'Link Status': link?.isExpired ? 'Expired' : (link?.status || (link ? 'Active' : 'No Link')),
      'Link Creation Date': link?.generatedAt || link?.createdAt || c.createdAt || 'N/A',
      'Link Expiry Date': link?.expiresAt ? formatDisplayDateTime(link.expiresAt).dateTime : 'N/A',
      'Payment Status': link?.paymentStatus || (c.policyStatus === 'Renewed' ? 'Completed' : 'Not Started'),
      'Transaction Status': lastAttempt?.status || (c.lastPaymentRef ? 'Successful' : 'N/A'),
      'Transaction ID': lastAttempt?.transactionRef || c.lastPaymentRef || 'N/A',
      'Payment Mode': lastAttempt?.paymentMethod || 'N/A',
      'Last Activity': c.lastActivity || (link?.openedAt ? 'Link Opened by Customer' : 'Customer Record Saved'),
      'Last Activity Timestamp': c.lastActiveAt || link?.lastOpenedAt || link?.generatedAt || c.updatedAt || 'N/A'
    };
  });
}

export function downloadDataCenterExcel(
  customers: CustomerPolicy[],
  renewalLinks: RenewalLinkRecord[] = [],
  filterLabel = 'All_Records'
): void {
  const rows = formatDataCenterRowsForExcel(customers, renewalLinks);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Note': 'No customer records found for selected timeline' }]);
  ws['!cols'] = autoFitColumns(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Customer Data Center');

  const dateNowStr = new Date().toISOString().split('T')[0];
  const filename = `ICICI_Lombard_DataCenter_${filterLabel}_${dateNowStr}.xlsx`;
  downloadWorkbook(wb, filename);
}
