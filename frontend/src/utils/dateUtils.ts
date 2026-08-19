// frontend-web/src/utils/dateUtils.ts
/**
 * Date utility functions
 */

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export function formatDistanceToNow(date: Date, locale: string = 'en'): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffSeconds < 60) {
    return rtf.format(-diffSeconds, 'second');
  } else if (diffMinutes < 60) {
    return rtf.format(-diffMinutes, 'minute');
  } else if (diffHours < 24) {
    return rtf.format(-diffHours, 'hour');
  } else if (diffDays < 7) {
    return rtf.format(-diffDays, 'day');
  } else if (diffWeeks < 4) {
    return rtf.format(-diffWeeks, 'week');
  } else {
    return rtf.format(-diffMonths, 'month');
  }
}

/**
 * Format a date to locale string
 */
export function formatDate(date: Date, locale: string = 'en'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Format a date to time string
 */
export function formatTime(date: Date, locale: string = 'en'): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
