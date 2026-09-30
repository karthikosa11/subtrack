const formatters = new Map<string, Intl.NumberFormat>();

export function money(value: number, currency = 'USD'): string {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat('en-US', { style: 'currency', currency });
    formatters.set(currency, f);
  }
  return f.format(value);
}

/** Today's date on the user's device, as YYYY-MM-DD. */
export function localISODate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse YYYY-MM-DD as a local calendar date (not UTC midnight). */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shortDate(s: string): string {
  return parseISODate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function longDate(s: string): string {
  return parseISODate(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function renewsIn(days: number): string {
  if (days <= 0) return 'Renews today';
  if (days === 1) return 'Renews tomorrow';
  return `Renews in ${days} days`;
}

export const RENEWAL_WARNING_DAYS = 7;
