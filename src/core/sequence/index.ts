import { getFiscalYearLabels } from '../format';

export interface SequenceContext {
  series: string;
  issueDate: string;
  fyStartMonth?: number;
  seq: number;
}

export function resolveSequencePeriod(
  issueDate: string,
  reset: 'never' | 'fiscal_year' | 'monthly',
  fyStartMonth = 4
): string {
  if (reset === 'never') return 'all';
  if (reset === 'monthly') {
    return issueDate.slice(0, 7); // YYYY-MM
  }
  return getFiscalYearLabels(issueDate, fyStartMonth).fyFull; // e.g. 2026-27
}

export function formatSequencePattern(pattern: string, ctx: SequenceContext): string {
  const { fyShort, fyFull } = getFiscalYearLabels(ctx.issueDate, ctx.fyStartMonth ?? 4);
  const [yyyy = '2026', mm = '01', dd = '01'] = ctx.issueDate.split('-');
  const yy = yyyy.slice(-2);

  return pattern
    .replace(/\{SERIES\}/g, ctx.series)
    .replace(/\{FY4\}/g, fyFull)
    .replace(/\{FY\}/g, fyShort)
    .replace(/\{YYYY\}/g, yyyy)
    .replace(/\{YY\}/g, yy)
    .replace(/\{MM\}/g, mm)
    .replace(/\{DD\}/g, dd)
    .replace(/\{SEQ:(\d+)\}/g, (_, widthStr) => {
      const width = Math.max(1, Math.min(8, Number(widthStr) || 4));
      return String(ctx.seq).padStart(width, '0');
    })
    .replace(/\{\{(\d+)\}\}/g, (_, zeros: string) => {
      return String(ctx.seq).padStart(zeros.length, '0');
    });
}
