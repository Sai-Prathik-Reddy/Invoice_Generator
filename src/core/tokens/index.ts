import type { Client, Company, ComputedResult } from '../schema/types';
import { amountInWords, formatDate, formatIndianNumber, formatMoney } from '../format';

export interface TokenResolutionContext {
  company?: Company;
  client?: Client;
  doc?: {
    number?: string;
    issue_date?: string;
    due_date?: string;
    place_of_supply?: string;
    status?: string;
    type_label?: string;
  };
  values?: Record<string, string>;
  computed?: ComputedResult;
  row?: Record<string, string>;
  rowIndex?: number;
  pageNumber?: number;
  totalPages?: number;
  isInsideViewRender?: boolean;
}

function lookupPath(key: string, ctx: TokenResolutionContext): string {
  const k = key.trim();
  if (k === 'serial' || k === 'sno') {
    return ctx.rowIndex !== undefined ? String(ctx.rowIndex + 1) : '1';
  }
  if (k === 'page.number') {
    return ctx.pageNumber !== undefined ? String(ctx.pageNumber) : '1';
  }
  if (k === 'page.total') {
    return ctx.totalPages !== undefined ? String(ctx.totalPages) : '1';
  }
  if (ctx.row && k in ctx.row) {
    return ctx.row[k] ?? '';
  }
  if (ctx.computed?.doc && k in ctx.computed.doc) {
    return String(ctx.computed.doc[k] ?? '');
  }
  if (ctx.values && k in ctx.values) {
    return ctx.values[k] ?? '';
  }
  if (k.startsWith('company.') && ctx.company) {
    const sub = k.slice('company.'.length);
    if (sub.startsWith('custom.')) {
      const ck = sub.slice('custom.'.length);
      return ctx.company.custom_fields.find((f) => f.key === ck)?.value ?? '';
    }
    if (sub === 'address.full') {
      const a = ctx.company.address;
      return [a.line1, a.line2, a.city, `${a.state} (${a.state_code}) - ${a.pincode}`]
        .filter(Boolean)
        .join(', ');
    }
    return getNestedProp(ctx.company, sub);
  }
  if (k.startsWith('client.') && ctx.client) {
    const sub = k.slice('client.'.length);
    if (sub.startsWith('custom.')) {
      const ck = sub.slice('custom.'.length);
      return ctx.client.custom_fields.find((f) => f.key === ck)?.value ?? '';
    }
    return getNestedProp(ctx.client, sub);
  }
  if (k.startsWith('doc.') && ctx.doc) {
    const sub = k.slice('doc.'.length);
    return getNestedProp(ctx.doc, sub);
  }
  return '';
}

function getNestedProp(obj: unknown, path: string): string {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return '';
    }
  }
  return cur === null || cur === undefined ? '' : String(cur);
}

function applyPipe(raw: string, pipeExpr: string): string {
  const [pipeNameRaw = '', argRaw] = pipeExpr.split(':');
  const pipeName = pipeNameRaw.trim().toLowerCase();
  const arg = argRaw?.trim().replace(/^['"]|['"]$/g, '');

  switch (pipeName) {
    case 'money':
      return formatMoney(raw, { symbol: arg !== 'nosymbol' });
    case 'number':
      return formatIndianNumber(raw, arg ? Number(arg) : 2);
    case 'percent':
      return `${raw || '0'}%`;
    case 'words':
      return amountInWords(raw);
    case 'date':
      return formatDate(raw, arg || 'DD MMM YYYY');
    case 'upper':
      return raw.toUpperCase();
    case 'lower':
      return raw.toLowerCase();
    case 'default':
      return raw.trim() ? raw : arg ?? '—';
    default:
      return raw;
  }
}

export function resolveTokens(templateStr: string, ctx: TokenResolutionContext): string {
  if (!templateStr || !templateStr.includes('{{')) return templateStr;
  return templateStr.replace(/\{\{([^}]+)\}\}/g, (_, expr: string) => {
    const segments = expr.split('|').map((s) => s.trim());
    const key = segments[0] ?? '';
    let val = lookupPath(key, ctx);
    for (let i = 1; i < segments.length; i++) {
      val = applyPipe(val, segments[i]!);
    }
    return val;
  });
}
