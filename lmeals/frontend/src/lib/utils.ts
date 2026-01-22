export const isRtlLang = (text: string): boolean => {
  const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return rtlRegex.test(text);
};

/**
 * Parses a time string (e.g., "1 hr", "20 mins", "1 day") into total minutes.
 */
export const parseTimeToMinutes = (timeStr: string | null | undefined): number => {
  if (!timeStr) return 0;

  const str = timeStr.toLowerCase().trim();
  const num = parseInt(str) || 0;

  if (str.includes('day') || str.endsWith('d')) {
    return num * 1440; // 24 * 60
  }
  if (str.includes('hour') || str.includes('hr') || str.endsWith('h')) {
    return num * 60;
  }

  return num; // Default to minutes
};

/**
 * Formats a total number of minutes into a human-readable string.
 * Example: 1500 -> "1 day 1 hr", 720 -> "12 hrs", 45 -> "45 mins"
 */
export const formatMinutes = (totalMinutes: number): string => {
  if (totalMinutes <= 0) return '';

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} day${days > 1 ? 's' : ''}`);
  }
  if (hours > 0) {
    parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
  }
  if (mins > 0 || parts.length === 0) {
    parts.push(`${mins} min${mins !== 1 ? 's' : ''}`);
  }

  // For long duration, skip minutes if we have days and hours
  if (days > 0 && hours > 0 && parts.length > 2) {
    return `${parts[0]} ${parts[1]}`;
  }

  return parts.join(' ');
};
