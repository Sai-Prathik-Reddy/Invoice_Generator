import Big from 'big.js';
import type {
  Company,
  ComputedResult,
  HsnSummaryRow,
  TaxSummaryRow,
  TemplateDefinition,
} from '../schema/types';
import { toBig } from '../format';

export interface EvaluationInput {
  definition: TemplateDefinition;
  company: Company;
  placeOfSupply?: string;
  values: Record<string, string>;
  items: Array<Record<string, string>>;
}

function roundModeToBig(mode: 'half_up' | 'half_even' | 'down' | 'up'): 0 | 1 | 2 | 3 {
  switch (mode) {
    case 'down':
      return Big.roundDown;
    case 'up':
      return Big.roundUp;
    case 'half_even':
      return Big.roundHalfEven;
    case 'half_up':
    default:
      return Big.roundHalfUp;
  }
}

/**
 * Safe arithmetic expression evaluator supporting:
 * - field identifiers (`qty`, `rate`, `discount_pct`, `gst_rate`)
 * - aggregates (`sum(items.taxable)`, `sum(items.line_tax)`, `count(items.qty)`)
 * - functions (`round(x, dp)`, `min(a, b)`, `max(a, b)`, `abs(x)`)
 * - operators `+`, `-`, `*`, `/`, parentheses
 */
export function evalSimpleExpr(
  expr: string,
  scopeVars: Record<string, string | number>,
  itemRows: Array<Record<string, string>>,
  rm: 0 | 1 | 2 | 3 = Big.roundHalfUp
): string {
  const trimmed = expr.trim();
  if (!trimmed) return '0.00';

  // Boolean inequality check (e.g. doc.place_of_supply != company.address.state_code)
  if (trimmed.includes('!=') || trimmed.includes('==')) {
    const isNeq = trimmed.includes('!=');
    const [lhsRaw = '', rhsRaw = ''] = trimmed.split(isNeq ? '!=' : '==');
    const resolveToken = (s: string) => {
      const k = s.trim().replace(/^['"]|['"]$/g, '');
      return String(scopeVars[k] ?? k);
    };
    const eq = resolveToken(lhsRaw) === resolveToken(rhsRaw);
    return (isNeq ? !eq : eq) ? 'true' : 'false';
  }

  // Replace sum(items.<key>) and count(items.<key>)
  let processed = trimmed.replace(/sum\(\s*items\.([a-zA-Z0-9_]+)\s*\)/g, (_, key: string) => {
    let total = new Big(0);
    for (const row of itemRows) {
      total = total.plus(toBig(row[key]));
    }
    return total.toFixed(4);
  });

  processed = processed.replace(/count\(\s*items\.([a-zA-Z0-9_]+)\s*\)/g, () => {
    return String(itemRows.length);
  });

  // Replace identifiers from scopeVars
  processed = processed.replace(/\b([a-zA-Z_][a-zA-Z0-9_.]*)\b/g, (ident) => {
    if (['round', 'min', 'max', 'abs', 'floor', 'ceil'].includes(ident)) {
      return ident;
    }
    const val = scopeVars[ident];
    return toBig(val).toFixed(6);
  });

  return evaluateNumericExpression(processed, rm);
}

function evaluateNumericExpression(expr: string, rm: 0 | 1 | 2 | 3): string {
  let current = expr.trim();

  // Resolve innermost function calls: round(a, b), abs(a), floor(a), ceil(a)
  const fnRegex = /\b(round|abs|floor|ceil)\(([^()]+)\)/;
  let guard = 0;
  while (fnRegex.test(current) && guard < 30) {
    guard++;
    current = current.replace(fnRegex, (_, fn: string, argsStr: string) => {
      const args = argsStr.split(',').map((a) => evaluateFlatArithmetic(a.trim(), rm));
      const first = args[0] ?? new Big(0);
      if (fn === 'round') {
        const dp = Math.max(0, Math.min(6, Number(args[1]?.toFixed(0) ?? 2)));
        return first.round(dp, rm).toFixed(dp);
      }
      if (fn === 'abs') return first.abs().toFixed(4);
      if (fn === 'floor') return first.round(0, Big.roundDown).toFixed(0);
      if (fn === 'ceil') return first.round(0, Big.roundUp).toFixed(0);
      return first.toFixed(4);
    });
  }

  // Resolve innermost parentheses
  const parenRegex = /\(([^()]+)\)/;
  while (parenRegex.test(current) && guard < 60) {
    guard++;
    current = current.replace(parenRegex, (_, inner: string) =>
      evaluateFlatArithmetic(inner, rm).toFixed(6)
    );
  }

  return evaluateFlatArithmetic(current, rm).round(2, rm).toFixed(2);
}

function evaluateFlatArithmetic(expr: string, rm: 0 | 1 | 2 | 3): Big {
  const tokens = expr
    .replace(/\s+/g, '')
    .match(/([+-]?\d+(?:\.\d+)?|[+\-*/])/g);

  if (!tokens || tokens.length === 0) return new Big(0);

  // Pass 1: * and /
  const values: Big[] = [];
  const ops: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i]!;
    if (tok === '+' || tok === '-' || tok === '*' || tok === '/') {
      ops.push(tok);
      i++;
    } else {
      let num = toBig(tok);
      while (ops.length > 0 && (ops[ops.length - 1] === '*' || ops[ops.length - 1] === '/')) {
        const op = ops.pop()!;
        const prev = values.pop() ?? new Big(0);
        if (op === '*') {
          num = prev.times(num);
        } else {
          num = num.eq(0) ? new Big(0) : prev.div(num).round(8, rm);
        }
      }
      values.push(num);
      i++;
    }
  }

  // Pass 2: + and -
  let result = values[0] ?? new Big(0);
  for (let j = 0; j < ops.length; j++) {
    const op = ops[j]!;
    const nextVal = values[j + 1] ?? new Big(0);
    if (op === '+') result = result.plus(nextVal);
    if (op === '-') result = result.minus(nextVal);
  }
  return result;
}

export function evaluateDocument(input: EvaluationInput): ComputedResult {
  const { definition, company, values, items } = input;
  const rm = roundModeToBig(definition.config.rounding.mode);
  const lineDp = definition.config.rounding.line_dp ?? 2;
  const taxMode = definition.config.tax_mode;

  const companyState = (company.address.state_code || '36').padStart(2, '0');
  const placeOfSupply = (
    input.placeOfSupply ||
    values['place_of_supply'] ||
    companyState
  ).padStart(2, '0');
  const isInterState = placeOfSupply !== companyState;

  const computedItems: Array<Record<string, string>> = [];
  const taxMap = new Map<string, { taxable: Big; cgst: Big; sgst: Big; igst: Big }>();
  const hsnMap = new Map<string, { hsn: string; rate: string; taxable: Big; cgst: Big; sgst: Big; igst: Big }>();

  let subtotal = new Big(0);
  let discountTotal = new Big(0);
  let cgstTotal = new Big(0);
  let sgstTotal = new Big(0);
  let igstTotal = new Big(0);
  let totalTax = new Big(0);

  for (const rawRow of items) {
    const qty = toBig(rawRow['qty'] || '1');
    const rate = toBig(rawRow['rate'] || '0');
    const discPct = toBig(rawRow['discount_pct'] || '0');
    const gstRate =
      taxMode === 'none' || definition.config.gst_preset === 'none'
        ? new Big(0)
        : toBig(rawRow['gst_rate'] ?? '18');

    const gross = qty.times(rate).round(lineDp, rm);
    const discAmt = gross.times(discPct).div(100).round(lineDp, rm);
    const afterDisc = gross.minus(discAmt);

    let taxable: Big;
    let lineTax: Big;

    if (taxMode === 'inclusive' && gstRate.gt(0)) {
      taxable = afterDisc.times(100).div(new Big(100).plus(gstRate)).round(lineDp, rm);
      lineTax = afterDisc.minus(taxable).round(lineDp, rm);
    } else {
      taxable = afterDisc;
      lineTax = taxable.times(gstRate).div(100).round(lineDp, rm);
    }

    let cgst = new Big(0);
    let sgst = new Big(0);
    let igst = new Big(0);

    if (lineTax.gt(0)) {
      if (isInterState) {
        igst = lineTax;
      } else {
        cgst = lineTax.div(2).round(lineDp, rm);
        sgst = lineTax.minus(cgst);
      }
    }

    const lineTotal = taxable.plus(lineTax).round(lineDp, rm);

    const rowOut: Record<string, string> = {
      ...rawRow,
      gross: gross.toFixed(lineDp),
      discount_amount: discAmt.toFixed(lineDp),
      taxable: taxable.toFixed(lineDp),
      cgst_rate: isInterState ? '0' : gstRate.div(2).toString(),
      sgst_rate: isInterState ? '0' : gstRate.div(2).toString(),
      igst_rate: isInterState ? gstRate.toString() : '0',
      cgst: cgst.toFixed(lineDp),
      sgst: sgst.toFixed(lineDp),
      igst: igst.toFixed(lineDp),
      line_tax: lineTax.toFixed(lineDp),
      line_total: lineTotal.toFixed(lineDp),
    };

    // Evaluate any custom line_item computed fields from definition.computed
    for (const cDef of definition.computed.filter((c) => c.scope === 'line_item' && !c.system)) {
      rowOut[cDef.key] = evalSimpleExpr(cDef.expr, rowOut, [], rm);
    }

    computedItems.push(rowOut);

    subtotal = subtotal.plus(taxable);
    discountTotal = discountTotal.plus(discAmt);
    cgstTotal = cgstTotal.plus(cgst);
    sgstTotal = sgstTotal.plus(sgst);
    igstTotal = igstTotal.plus(igst);
    totalTax = totalTax.plus(lineTax);

    const rateKey = gstRate.toFixed(0);
    const prevTax = taxMap.get(rateKey) ?? {
      taxable: new Big(0),
      cgst: new Big(0),
      sgst: new Big(0),
      igst: new Big(0),
    };
    prevTax.taxable = prevTax.taxable.plus(taxable);
    prevTax.cgst = prevTax.cgst.plus(cgst);
    prevTax.sgst = prevTax.sgst.plus(sgst);
    prevTax.igst = prevTax.igst.plus(igst);
    taxMap.set(rateKey, prevTax);

    const hsnCode = (rawRow['hsn_sac'] || '—').trim() || '—';
    const hsnKey = `${hsnCode}|${rateKey}`;
    const prevHsn = hsnMap.get(hsnKey) ?? {
      hsn: hsnCode,
      rate: rateKey,
      taxable: new Big(0),
      cgst: new Big(0),
      sgst: new Big(0),
      igst: new Big(0),
    };
    prevHsn.taxable = prevHsn.taxable.plus(taxable);
    prevHsn.cgst = prevHsn.cgst.plus(cgst);
    prevHsn.sgst = prevHsn.sgst.plus(sgst);
    prevHsn.igst = prevHsn.igst.plus(igst);
    hsnMap.set(hsnKey, prevHsn);
  }

  const shipping = toBig(values['shipping_charges'] || '0');
  const extraDiscount = toBig(values['invoice_discount'] || '0');
  const rawGrandTotal = subtotal.plus(totalTax).plus(shipping).minus(extraDiscount);

  let grandTotal = rawGrandTotal;
  let roundOff = new Big(0);

  if (definition.config.rounding.grand_total === 'nearest_1') {
    grandTotal = rawGrandTotal.round(0, rm);
    roundOff = grandTotal.minus(rawGrandTotal);
  } else if (definition.config.rounding.grand_total === 'nearest_0_50') {
    grandTotal = rawGrandTotal.times(2).round(0, rm).div(2);
    roundOff = grandTotal.minus(rawGrandTotal);
  }

  const docOut: Record<string, string> = {
    subtotal: subtotal.toFixed(2),
    discount_total: discountTotal.plus(extraDiscount).toFixed(2),
    shipping_charges: shipping.toFixed(2),
    cgst_total: cgstTotal.toFixed(2),
    sgst_total: sgstTotal.toFixed(2),
    igst_total: igstTotal.toFixed(2),
    tax_total: totalTax.toFixed(2),
    raw_total: rawGrandTotal.toFixed(2),
    round_off: roundOff.toFixed(2),
    grand_total: grandTotal.toFixed(2),
    is_igst: isInterState ? 'true' : 'false',
    'doc.place_of_supply': placeOfSupply,
    'company.address.state_code': companyState,
  };

  // Evaluate any custom document-level computed formulas
  for (const cDef of definition.computed.filter((c) => c.scope === 'document' && !c.system)) {
    docOut[cDef.key] = evalSimpleExpr(
      cDef.expr,
      { ...values, ...docOut },
      computedItems,
      rm
    );
  }

  const taxSummary: TaxSummaryRow[] = Array.from(taxMap.entries()).map(([rate, v]) => ({
    rate,
    taxable: v.taxable.toFixed(2),
    cgst: v.cgst.toFixed(2),
    sgst: v.sgst.toFixed(2),
    igst: v.igst.toFixed(2),
    total_tax: v.cgst.plus(v.sgst).plus(v.igst).toFixed(2),
  }));

  const hsnSummary: HsnSummaryRow[] = Array.from(hsnMap.values()).map((v) => ({
    hsn_sac: v.hsn,
    rate: v.rate,
    taxable: v.taxable.toFixed(2),
    cgst: v.cgst.toFixed(2),
    sgst: v.sgst.toFixed(2),
    igst: v.igst.toFixed(2),
    total_tax: v.cgst.plus(v.sgst).plus(v.igst).toFixed(2),
  }));

  return {
    doc: docOut,
    items: computedItems,
    summaries: {
      tax: taxSummary,
      hsn: hsnSummary,
    },
  };
}
