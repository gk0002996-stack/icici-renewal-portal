export function parseFlexibleDate(dateInput: any): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  
  const str = String(dateInput).trim();
  if (!str) return null;

  // 1. YYYY-MM-DD or YYYY-MM-DD HH:mm:ss or YYYY-MM-DDTHH:mm:ss
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hours = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const minutes = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const seconds = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    const d = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const d = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Fallback to native Date construction (for ISO strings with Z or offsets)
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

export function matchesDateFilter(
  rawDate: any, 
  filter: 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom' | 'last7' | 'last30', 
  startDate?: string, 
  endDate?: string
): boolean {
  if (!filter || filter === 'all') return true;
  
  const parsed = parseFlexibleDate(rawDate);
  if (!parsed) return false;

  const now = new Date();

  if (filter === 'today') {
    return isSameDay(parsed, now);
  }

  if (filter === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return isSameDay(parsed, yesterday);
  }

  if (filter === '7days' || filter === 'last7') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
    return parsed >= sevenDaysAgo && parsed <= startOfToday;
  }

  if (filter === '30days' || filter === 'last30') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
    return parsed >= thirtyDaysAgo && parsed <= startOfToday;
  }

  if (filter === 'custom') {
    if (!startDate && !endDate) return true;
    const start = startDate ? parseFlexibleDate(startDate + ' 00:00:00') : new Date(0);
    const end = endDate ? parseFlexibleDate(endDate + ' 23:59:59') : new Date();
    if (!start || !end) return true;
    return parsed >= start && parsed <= end;
  }

  return true;
}

export function matchesMonthFilter(rawDate: any, yearMonth: string): boolean {
  if (!yearMonth || yearMonth === 'all') return true;
  const parsed = parseFlexibleDate(rawDate);
  if (!parsed) return false;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}` === yearMonth;
}

export function getMonthLabel(yearMonth: string): string {
  if (!yearMonth || yearMonth === 'all') return 'All Months';
  const parts = yearMonth.split('-');
  if (parts.length !== 2) return yearMonth;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${monthNames[m] || parts[1]} ${y}`;
}

export function formatDisplayDateTime(dateInput: any): { 
  date: string; 
  time: string; 
  time24: string; 
  dateTime: string; 
  toString: () => string; 
} {
  const d = parseFlexibleDate(dateInput);
  if (!d) {
    const na = { date: 'N/A', time: '', time24: '', dateTime: 'N/A' };
    return { ...na, toString: () => 'N/A' };
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = d.getDate();
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  const dateStr = `${day} ${monthName} ${year}`;
  
  const rawHours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = rawHours >= 12 ? 'PM' : 'AM';
  const hours12 = rawHours % 12 || 12;
  const timeStr = `${String(hours12).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  const timeStr24 = `${String(rawHours).padStart(2, '0')}:${minutes}:${seconds}`;

  const res = {
    date: dateStr,
    time: timeStr,
    time24: timeStr24,
    dateTime: `${dateStr}, ${timeStr}`
  };

  return {
    ...res,
    toString: () => `${dateStr}, ${timeStr}`
  };
}
