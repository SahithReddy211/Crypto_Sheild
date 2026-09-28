// Time formatting utilities for Authoritative UTC + Asia/Kolkata (IST) Display
// Ensures deterministic timezone representation across all browser and client environments.

/**
 * Formats an ISO datetime string into Asia/Kolkata (IST) time string.
 * Example: "2026-09-03T04:20:00Z" -> "09:50 AM IST" (or "09:50 AM")
 */
export const formatIST = (dateStr, includeTzLabel = true) => {
  if (!dateStr) return '—';
  try {
    let iso = typeof dateStr === 'string' ? dateStr.trim() : dateStr;
    // If string has no timezone indicator, ensure it's treated as UTC
    if (typeof iso === 'string' && !iso.endsWith('Z') && !iso.includes('+') && !iso.includes('-') && iso.length >= 19) {
      iso = iso + 'Z';
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';

    const timePart = d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return includeTzLabel ? `${timePart} IST` : timePart;
  } catch (e) {
    return '—';
  }
};

/**
 * Formats an ISO datetime string into Asia/Kolkata (IST) date string (DD/MM/YYYY).
 * Example: "2026-09-03T04:20:00Z" -> "03/09/2026"
 */
export const formatDateIST = (dateStr) => {
  if (!dateStr) return '—';
  try {
    let iso = typeof dateStr === 'string' ? dateStr.trim() : dateStr;
    if (typeof iso === 'string' && !iso.endsWith('Z') && !iso.includes('+') && !iso.includes('-') && iso.length >= 19) {
      iso = iso + 'Z';
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';

    return d.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return '—';
  }
};

/**
 * Returns UTC instant representation for development, debugging, and security audits.
 * Example: "2026-09-03T04:20:00Z" -> "04:20:00 UTC"
 */
export const formatUTC = (dateStr) => {
  if (!dateStr) return '—';
  try {
    let iso = typeof dateStr === 'string' ? dateStr.trim() : dateStr;
    if (typeof iso === 'string' && !iso.endsWith('Z') && !iso.includes('+') && !iso.includes('-') && iso.length >= 19) {
      iso = iso + 'Z';
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';

    return `${d.toLocaleTimeString('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })} UTC`;
  } catch (e) {
    return '—';
  }
};

/**
 * Formats an examination window derived from start and end UTC timestamps.
 * Example: start="2026-09-03T04:25:00Z", end="2026-09-03T05:30:00Z"
 * -> "09:55 AM – 11:00 AM IST"
 */
export const formatExamWindowIST = (startUtc, endUtc) => {
  if (!startUtc) return '—';
  const startStr = formatIST(startUtc, false);
  if (!endUtc) return `${startStr} IST`;
  const endStr = formatIST(endUtc, true);
  return `${startStr} – ${endStr}`;
};

/**
 * Converts entered IST date ("YYYY-MM-DD") and time ("HH:mm") to ISO string with +05:30 offset.
 * Example: dateStr="2026-09-03", timeStr="09:50" -> "2026-09-03T09:50:00+05:30"
 * When parsed by server, accurately produces the 04:20:00 UTC instant.
 */
export const istToOffsetIso = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const t = timeStr.trim();
  const timeWithSeconds = t.length === 5 ? `${t}:00` : t;
  return `${dateStr.trim()}T${timeWithSeconds}+05:30`;
};

/**
 * Returns 24-hour "HH:mm" in Asia/Kolkata for HTML <input type="time">
 */
export const getIST24h = (dateStr) => {
  if (!dateStr) return '09:55';
  try {
    let iso = typeof dateStr === 'string' ? dateStr.trim() : dateStr;
    if (typeof iso === 'string' && !iso.endsWith('Z') && !iso.includes('+') && !iso.includes('-') && iso.length >= 19) {
      iso = iso + 'Z';
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '09:55';
    return d.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (e) {
    return '09:55';
  }
};
