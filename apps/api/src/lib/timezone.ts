/**
 * Lightweight timezone helpers built on Intl (no extra deps). Good enough
 * for "what is the wall-clock HH:mm and date in a user's tz right now".
 */
export interface LocalTimeParts {
  hhmm: string; // "HH:mm"
  dateKey: string; // "YYYY-MM-DD"
}

export function getLocalTimeParts(timezone: string, at: Date = new Date()): LocalTimeParts {
  let tz = timezone;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(at);
  } catch {
    // Invalid tz → fall back to UTC.
    tz = 'UTC';
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(at);
  }

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  let hour = get('hour');
  if (hour === '24') hour = '00';
  const hhmm = `${hour}:${get('minute')}`;
  const dateKey = `${get('year')}-${get('month')}-${get('day')}`;
  return { hhmm, dateKey };
}
