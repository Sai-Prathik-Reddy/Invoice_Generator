import Big from 'big.js';

export function toBig(val: string | number | undefined | null): Big {
  if (val === undefined || val === null || val === '') {
    return new Big(0);
  }
  try {
    const cleaned = String(val).replace(/,/g, '').trim();
    return cleaned ? new Big(cleaned) : new Big(0);
  } catch {
    return new Big(0);
  }
}

export function formatIndianNumber(
  value: string | number | undefined | null,
  dp = 2
): string {
  const b = toBig(value);
  const isNeg = b.lt(0);
  const absFixed = b.abs().toFixed(dp);
  const [intPartRaw, decPart] = absFixed.split('.');
  const intPart = intPartRaw ?? '0';

  let grouped = intPart;
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }

  const formatted = dp > 0 && decPart !== undefined ? `${grouped}.${decPart}` : grouped;
  return isNeg ? `-${formatted}` : formatted;
}

export function formatMoney(
  value: string | number | undefined | null,
  opts?: { symbol?: boolean; dp?: number }
): string {
  const symbol = opts?.symbol ?? true;
  const dp = opts?.dp ?? 2;
  const b = toBig(value);
  const isNeg = b.lt(0);
  const absFormatted = formatIndianNumber(b.abs().toFixed(dp), dp);
  if (!symbol) {
    return isNeg ? `-${absFormatted}` : absFormatted;
  }
  return isNeg ? `-₹${absFormatted}` : `₹${absFormatted}`;
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function twoDigitWords(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n]!;
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o > 0 ? `${TENS[t]}-${ONES[o]}` : TENS[t]!;
}

function threeDigitWords(n: number): string {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const rem = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(`${ONES[h]} Hundred`);
  if (rem > 0) parts.push(twoDigitWords(rem));
  return parts.join(' ');
}

function indianIntegerToWords(num: number): string {
  if (num === 0) return 'Zero';
  let n = Math.floor(Math.abs(num));
  const parts: string[] = [];

  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  if (crore > 0) {
    parts.push(`${indianIntegerToWords(crore)} Crore`);
  }

  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  if (lakh > 0) {
    parts.push(`${twoDigitWords(lakh)} Lakh`);
  }

  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand > 0) {
    parts.push(`${twoDigitWords(thousand)} Thousand`);
  }

  if (n > 0) {
    parts.push(threeDigitWords(n));
  }

  return parts.join(' ').trim();
}

export function amountInWords(
  value: string | number | undefined | null,
  opts?: { prefix?: string; suffix?: string }
): string {
  const prefix = opts?.prefix ?? 'Rupees';
  const suffix = opts?.suffix ?? 'Only';
  const b = toBig(value).abs();
  const fixed = b.toFixed(2);
  const [rupeeStr, paiseStr] = fixed.split('.');
  const rupees = Number(rupeeStr ?? '0');
  const paise = Number(paiseStr ?? '0');

  const rupeeWords = indianIntegerToWords(rupees);
  if (paise > 0) {
    const paiseWords = twoDigitWords(paise);
    return `${prefix} ${rupeeWords} and ${paiseWords} Paise ${suffix}`.replace(/\s+/g, ' ').trim();
  }
  return `${prefix} ${rupeeWords} ${suffix}`.replace(/\s+/g, ' ').trim();
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(isoDate: string | undefined, pattern = 'DD MMM YYYY'): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!year || !month || !day) return isoDate;

  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const mmm = MONTHS_SHORT[month - 1] ?? mm;
  const yyyy = String(year);
  const yy = yyyy.slice(-2);

  return pattern
    .replace('YYYY', yyyy)
    .replace('YY', yy)
    .replace('MMM', mmm)
    .replace('MM', mm)
    .replace('DD', dd);
}

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysIsoDate(isoDate: string, days: number): string {
  const parts = isoDate.split('-').map(Number);
  const dt = new Date(parts[0] || 2026, (parts[1] || 1) - 1, parts[2] || 1);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getFiscalYearLabels(isoDate: string, fyStartMonth = 4): { fyShort: string; fyFull: string } {
  const parts = isoDate.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = parts[1] || new Date().getMonth() + 1;
  const startYear = month >= fyStartMonth ? year : year - 1;
  const endYear = startYear + 1;
  const s2 = String(startYear).slice(-2);
  const e2 = String(endYear).slice(-2);
  return {
    fyShort: `${s2}-${e2}`,
    fyFull: `${startYear}-${e2}`,
  };
}
