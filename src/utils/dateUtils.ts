// Accurate Date & Time Utilities for Souq Al-Wali (سوق الولي)

/**
 * Robustly parses any timestamp representation (ms number, Firestore Timestamp, ISO string, or numeric string)
 * into a valid epoch millisecond number.
 */
export function parseExactTimestamp(timeVal: any): number {
  if (timeVal === null || timeVal === undefined) {
    return Date.now();
  }

  // Already a valid millisecond number
  if (typeof timeVal === 'number' && !isNaN(timeVal) && timeVal > 0) {
    // If it's in seconds instead of milliseconds (e.g. unix epoch < 10000000000)
    if (timeVal < 10000000000) {
      return timeVal * 1000;
    }
    return timeVal;
  }

  // Firestore Timestamp object: { seconds, nanoseconds }
  if (typeof timeVal === 'object') {
    if (typeof timeVal.seconds === 'number') {
      return timeVal.seconds * 1000;
    }
    if (typeof timeVal._seconds === 'number') {
      return timeVal._seconds * 1000;
    }
    if (timeVal instanceof Date) {
      return timeVal.getTime();
    }
  }

  // String representation (number string or ISO 8601 string)
  if (typeof timeVal === 'string') {
    const trimmed = timeVal.trim();
    const asNum = Number(trimmed);
    if (!isNaN(asNum) && asNum > 0) {
      if (asNum < 10000000000) {
        return asNum * 1000;
      }
      return asNum;
    }
    const parsed = new Date(trimmed).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return Date.now();
}

/**
 * Computes highly accurate elapsed relative time in proper Arabic grammar.
 * Handles singular, dual, and plural accurately without random or approximated artifacts.
 */
export function formatAccurateTimeAgo(timeVal: any): string {
  const timestamp = parseExactTimestamp(timeVal);
  const now = Date.now();
  const diffMs = now - timestamp;

  // If timestamp is slightly in the future due to clock drift (e.g. < 10 seconds), treat as now
  if (diffMs < 60 * 1000) {
    return 'الآن';
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  // Minutes (1 - 59)
  if (diffMinutes < 60) {
    if (diffMinutes === 1) return 'منذ دقيقة واحدة';
    if (diffMinutes === 2) return 'منذ دقيقتين';
    if (diffMinutes >= 3 && diffMinutes <= 10) return `منذ ${diffMinutes} دقائق`;
    return `منذ ${diffMinutes} دقيقة`;
  }

  // Hours (1 - 23)
  if (diffHours < 24) {
    if (diffHours === 1) return 'منذ ساعة واحدة';
    if (diffHours === 2) return 'منذ ساعتين';
    if (diffHours >= 3 && diffHours <= 10) return `منذ ${diffHours} ساعات`;
    return `منذ ${diffHours} ساعة`;
  }

  // Days (1 - 29)
  if (diffDays < 30) {
    if (diffDays === 1) return 'منذ يوم واحد (أمس)';
    if (diffDays === 2) return 'منذ يومين';
    if (diffDays >= 3 && diffDays <= 10) return `منذ ${diffDays} أيام`;
    return `منذ ${diffDays} يوماً`;
  }

  // Months (1 - 11)
  if (diffMonths < 12) {
    if (diffMonths === 1) return 'منذ شهر واحد';
    if (diffMonths === 2) return 'منذ شهرين';
    if (diffMonths >= 3 && diffMonths <= 10) return `منذ ${diffMonths} أشهر`;
    return `منذ ${diffMonths} شهراً`;
  }

  // Years (1+)
  if (diffYears === 1) return 'منذ سنة واحدة';
  if (diffYears === 2) return 'منذ سنتين';
  if (diffYears >= 3 && diffYears <= 10) return `منذ ${diffYears} سنوات`;
  return `منذ ${diffYears} سنة`;
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const ARABIC_DAYS = [
  'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
];

/**
 * Returns exact full Arabic date and time string:
 * e.g. "الأحد 23 أغسطس 2026 - الساعة 10:30 صباحاً"
 */
export function formatExactArabicDateTime(timeVal: any): string {
  const timestamp = parseExactTimestamp(timeVal);
  const date = new Date(timestamp);

  const dayName = ARABIC_DAYS[date.getDay()];
  const dayNum = date.getDate();
  const monthName = ARABIC_MONTHS[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const isPm = hours >= 12;
  const period = isPm ? 'مساءً' : 'صباحاً';

  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${dayName} ${dayNum} ${monthName} ${year} - الساعة ${hours}:${minutes} ${period}`;
}

/**
 * Returns clean short date string: e.g. "23 أغسطس 2026"
 */
export function formatShortArabicDate(timeVal: any): string {
  const timestamp = parseExactTimestamp(timeVal);
  const date = new Date(timestamp);
  const dayNum = date.getDate();
  const monthName = ARABIC_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${dayNum} ${monthName} ${year}`;
}
