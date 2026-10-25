import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Svg,
  Path,
  Image,
  Font,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import type {
  Block,
  BlockStyle,
  Client,
  Company,
  ComputedResult,
  TemplateDefinition,
  Theme,
} from '../core/schema/types';
import { resolveTokens, type TokenResolutionContext } from '../core/tokens';
import { amountInWords, formatMoney } from '../core/format';
import { generateUpiQrVector } from '../core/upi';

export interface PdfRenderInput {
  definition: TemplateDefinition;
  company: Company;
  client?: Client;
  docMeta: {
    number: string;
    status: 'draft' | 'finalized' | 'cancelled';
    issue_date: string;
    due_date?: string;
    place_of_supply?: string;
    type_label: string;
  };
  values: Record<string, string>;
  items: Array<Record<string, string>>;
  computed: ComputedResult;
  assetDataUrls?: Record<string, string>;
}

/**
 * Valid fallback 48x48 PNG INGEN monogram (Amethyst background with Champagne Gold border & monogram)
 * Guarantees that logo blocks always render a crisp brand badge even if the user hasn't uploaded a logo.
 */
export const DEFAULT_COMPANY_LOGO_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAxElEQVR4nO3VwQmAMBQDUCdyBQdxIsGBXEX38Kx4EERr/a2lP4EcchFb/msobaah3ZjTeA9QDNB3M1UE8I4A3hHgzLqMAlQFHAOH8ucAcvYSoBRCgBKA63d6QCoCBpDbAiQgBQEFyGkBFmAdBA6Q2gIkIAUBD/gaCBZgbYECYP0HDmBpgQZguSuQgK8WKAAxBB0g9nJDA95aoARc11ABQi3QAs51dIB7C5SAt30EqAmIIQSomdwDEMA7AnhHAO88AKyhB+xURUEiYACyfgAAAABJRU5ErkJggg==';

/**
 * Strips extraneous MIME parameters (like ;charset=utf-8) and whitespace/newlines from base64 data URLs
 * to ensure strict compatibility with @react-pdf/image.
 */
export function cleanDataUrlForPdf(dataUrl?: string): string | undefined {
  if (!dataUrl || typeof dataUrl !== 'string') return undefined;
  const trimmed = dataUrl.trim();
  if (!trimmed.startsWith('data:image/')) return trimmed;

  const match = /^data:image\/([a-zA-Z0-9+.-]+)(?:;[^,]*)?;base64,(.+)$/s.exec(trimmed);
  if (!match) return trimmed;

  let rawFormat = match[1].toLowerCase();
  const base64Payload = match[2].replace(/\s+/g, '');

  if (rawFormat === 'jpg') rawFormat = 'jpeg';
  if (rawFormat === 'svg+xml') rawFormat = 'svg';

  return `data:image/${rawFormat};base64,${base64Payload}`;
}

/**
 * Converts any image blob (WebP, SVG, AVIF, BMP, GIF, PNG, JPEG) into a normalized PNG data URL
 * via an in-memory HTMLCanvasElement in browser environments, or Buffer in Node.js.
 */
export async function blobToPdfDataUrl(blob: Blob, maxDim = 1200): Promise<string> {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const objectUrl = URL.createObjectURL(blob);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new (window as any).Image();
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/png'));
            } else {
              reject(new Error('Canvas 2D context not available'));
            }
          } catch (e) {
            reject(e);
          } finally {
            URL.revokeObjectURL(objectUrl);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Image failed to load for canvas decode'));
        };
        img.src = objectUrl;
      });
      return cleanDataUrlForPdf(dataUrl) || dataUrl;
    } catch (err) {
      console.warn('Canvas decode failed, falling back to FileReader:', err);
    }
  }

  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(cleanDataUrlForPdf(reader.result) || reader.result);
        } else {
          reject(new Error('Failed to convert blob to data url'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const mime = blob.type && (blob.type.includes('png') || blob.type.includes('jpeg')) ? blob.type : 'image/png';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function resolveColor(color: string | undefined, theme: Theme, fallback = '#111827'): string {
  if (!color) return fallback;
  if (!theme?.colors) return color;
  if (color === 'theme.primary') return theme.colors.primary ?? '#5B3FD9';
  if (color === 'theme.accent') return theme.colors.accent ?? '#B8892E';
  if (color === 'theme.text') return theme.colors.text ?? '#111827';
  if (color === 'theme.muted') return theme.colors.muted ?? '#6B7280';
  if (color === 'theme.border') return theme.colors.border ?? '#E5E7EB';
  if (color === 'theme.table_header_bg') return theme.colors.table_header_bg ?? '#F3F4F6';
  if (color === 'theme.table_stripe_bg') return theme.colors.table_stripe_bg ?? '#FAFAFA';
  return color;
}

export function resolvePdfFontFamily(family?: string): string {
  if (!family) return 'Helvetica';
  const clean = family.trim();
  if (clean === 'Courier' || clean === 'monospace' || clean === 'Roboto Mono') return 'Courier';
  if (clean === 'Times-Roman' || clean === 'serif' || clean === 'Times') return 'Times-Roman';
  if (clean === 'Helvetica' || clean === 'sans-serif' || clean === 'Inter' || clean === 'Roboto' || clean === 'NotoSans') return 'Helvetica';

  try {
    const registered = Font.getRegisteredFontFamilies();
    if (registered.includes(clean)) return clean;
  } catch {
    // ignore
  }

  // Gracefully falls back to standard Helvetica, which never throws Font family not registered
  return 'Helvetica';
}

function mapBlockStyleToPdf(style: BlockStyle | undefined, theme: Theme) {
  if (!style) return {};
  const pad = style.padding;
  const baseFontSize = theme?.base_font_size ?? 9;
  return {
    fontSize: style.font_size ?? baseFontSize,
    fontWeight: style.font_weight ? (style.font_weight >= 600 ? 'bold' : 'normal') : undefined,
    color: style.color ? resolveColor(style.color, theme) : (theme?.colors?.text ?? '#111827'),
    textAlign: style.align ?? 'left',
    lineHeight: style.line_height ?? 1.35,
    fontFamily: resolvePdfFontFamily(style.font_family),
    backgroundColor: style.background ? resolveColor(style.background, theme, 'transparent') : undefined,
    paddingTop: pad ? pad[0] : undefined,
    paddingRight: pad ? pad[1] : undefined,
    paddingBottom: pad ? pad[2] : undefined,
    paddingLeft: pad ? pad[3] : undefined,
    borderWidth: style.border?.width,
    borderColor: style.border?.color ? resolveColor(style.border.color, theme) : undefined,
    borderRadius: style.border?.radius,
    opacity: style.opacity,
  } as const;
}

const styles = StyleSheet.create({
  watermarkWrapper: {
    position: 'absolute',
    top: 320,
    left: 110,
    right: 110,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.08,
    transform: 'rotate(-32deg)',
  },
  watermarkText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#DC2626',
    letterSpacing: 6,
  },
});

function renderSingleBlock(
  block: Block,
  ctx: TokenResolutionContext,
  input: PdfRenderInput
): React.ReactNode {
  const { definition, company, computed, assetDataUrls } = input;
  const theme = definition.theme;
  const baseStyle = mapBlockStyleToPdf(block.style, theme);

  switch (block.type) {
    case 'text': {
      const content = String(block.content ?? '');
      const hasPageToken =
        content.includes('{{page.number}}') || content.includes('{{page.total}}');
      if (hasPageToken && !ctx.isInsideViewRender) {
        return (
          <Text
            key={block.id}
            style={baseStyle}
            render={({ pageNumber, totalPages }) =>
              resolveTokens(content, { ...ctx, pageNumber, totalPages })
            }
          />
        );
      }
      return (
        <Text key={block.id} style={baseStyle}>
          {resolveTokens(content, ctx)}
        </Text>
      );
    }

    case 'field_pair': {
      const label = resolveTokens(String(block.label ?? ''), ctx);
      const val = resolveTokens(String(block.value ?? ''), ctx);
      return (
        <View
          key={block.id}
          style={{
            ...baseStyle,
            flexDirection: block.layout === 'stacked' ? 'column' : 'row',
            justifyContent: 'space-between',
            marginBottom: 3,
          }}
        >
          <Text style={{ fontSize: baseStyle.fontSize ?? 9, color: theme?.colors?.muted ?? '#6B7280' }}>
            {label}
          </Text>
          <Text style={{ fontSize: baseStyle.fontSize ?? 9, fontWeight: 'bold', color: theme?.colors?.text ?? '#111827' }}>
            {val}
          </Text>
        </View>
      );
    }

    case 'divider':
      return (
        <View
          key={block.id}
          style={{
            borderBottomWidth: block.thickness || 1,
            borderBottomColor: resolveColor(block.color, theme, theme.colors.border),
            marginVertical: 4,
          }}
        />
      );

    case 'spacer':
      return <View key={block.id} style={{ height: block.height || 12 }} />;

    case 'shape':
      return (
        <View
          key={block.id}
          style={{
            ...baseStyle,
            backgroundColor: block.fill ? resolveColor(block.fill, theme) : undefined,
            borderWidth: block.stroke_width ?? 1,
            borderColor: block.stroke ? resolveColor(block.stroke, theme) : theme.colors.border,
          }}
        />
      );

    case 'image': {
      let dataUrl: string | undefined;
      if (block.source.kind === 'company_logo') {
        dataUrl =
          (company?.logo_asset_id ? assetDataUrls?.[company.logo_asset_id] : undefined) ||
          (company as any)?.logo_data_url ||
          assetDataUrls?.['company_logo'] ||
          DEFAULT_COMPANY_LOGO_DATA_URL;
      } else if (block.source.kind === 'company_signature') {
        dataUrl =
          (company?.signature_asset_id ? assetDataUrls?.[company.signature_asset_id] : undefined) ||
          (company as any)?.signature_data_url ||
          assetDataUrls?.['company_signature'];
      } else if (block.source.kind === 'data_url' && block.source.data_url) {
        dataUrl = block.source.data_url;
      } else if (block.source.kind === 'asset') {
        dataUrl = assetDataUrls?.[block.source.asset_id];
      } else if (block.source.kind === 'field') {
        dataUrl = input.values[block.source.field_key];
      }

      dataUrl = cleanDataUrlForPdf(dataUrl);

      const blockFrame = (block as any).frame;
      const blockRelFrame = (block as any).rel_frame;
      const blockW = blockFrame?.w ?? blockRelFrame?.w ?? (block.style as any)?.width ?? '100%';
      const blockH = blockFrame?.h ?? blockRelFrame?.h ?? (block.style as any)?.height ?? 48;
      const align = block.style?.align ?? 'left';
      const objPosX = align === 'center' ? '50%' : align === 'right' ? '100%' : '0%';
      const alignSelf = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

      if (!dataUrl) {
        return (
          <View
            key={block.id}
            style={{
              ...baseStyle,
              width: blockW,
              height: blockH,
              borderWidth: 1,
              borderColor: theme?.colors?.border ?? '#E5E7EB',
              borderStyle: 'dashed',
              borderRadius: 6,
              backgroundColor: '#F9FAFB',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 4,
              alignSelf,
            }}
          >
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: theme?.colors?.muted ?? '#9CA3AF' }}>
              {block.source.kind === 'company_logo'
                ? '[Company Logo]'
                : block.source.kind === 'company_signature'
                ? '[Signature / Stamp]'
                : '[Image / Photo]'}
            </Text>
          </View>
        );
      }
      return (
        <Image
          key={block.id}
          src={dataUrl}
          style={{
            ...baseStyle,
            width: blockW,
            height: blockH,
            objectFit: block.fit ?? 'contain',
            alignSelf,
            objectPositionX: objPosX,
          }}
        />
      );
    }

    case 'custom_kv': {
      const list =
        block.source === 'company'
          ? company.custom_fields.filter((f) => f.show_on_pdf && f.value)
          : (input.client?.custom_fields ?? []).filter((f) => f.show_on_pdf && f.value);
      if (list.length === 0) return null;
      return (
        <View key={block.id} style={{ ...baseStyle, marginTop: 4 }}>
          {list.map((cf) => (
            <Text key={cf.key} style={{ fontSize: baseStyle.fontSize ?? 8, color: theme.colors.muted }}>
              {cf.label}: {cf.value}
            </Text>
          ))}
        </View>
      );
    }

    case 'bank_details': {
      const bank = company.bank;
      if (!bank || (!bank.account_no && !bank.bank_name)) return null;
      return (
        <View key={block.id} style={{ ...baseStyle, marginTop: 4 }}>
          <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: theme.colors.text, marginBottom: 2 }}>
            {block.title}
          </Text>
          <Text style={{ fontSize: 8, color: theme.colors.muted }}>
            Bank: {bank.bank_name} {bank.branch ? `(${bank.branch})` : ''}
          </Text>
          <Text style={{ fontSize: 8, color: theme.colors.muted }}>
            A/C No: {bank.account_no} • IFSC: {bank.ifsc}
          </Text>
          {bank.account_name ? (
            <Text style={{ fontSize: 8, color: theme.colors.muted }}>
              A/C Name: {bank.account_name}
            </Text>
          ) : null}
        </View>
      );
    }

    case 'upi_qr': {
      const vpa = company.upi?.vpa?.trim();
      if (!vpa) return null;
      const amt = String(computed.doc[block.amount_key] ?? computed.doc['grand_total'] ?? '0');
      const qr = generateUpiQrVector({
        vpa,
        payeeName: company.upi?.payee_name || company.name,
        amount: amt,
        transactionNote: `Invoice ${input.docMeta.number}`,
        transactionRef: input.docMeta.number,
      });
      const qrSize = Math.max(64, block.size || 84);
      return (
        <View key={block.id} style={{ ...baseStyle, alignItems: 'flex-start' }}>
          <View
            style={{
              padding: 6,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 6,
              backgroundColor: '#FFFFFF',
            }}
          >
            <Svg
              width={qrSize}
              height={qrSize}
              viewBox={`0 0 ${qr.viewBoxSize} ${qr.viewBoxSize}`}
            >
              <Path d={qr.pathD} fill="#111827" />
            </Svg>
          </View>
          <Text style={{ fontSize: 7.5, color: theme.colors.muted, marginTop: 3 }}>
            {block.caption || 'Scan to pay via UPI'} ({vpa})
          </Text>
        </View>
      );
    }

    case 'table': {
      const cols = block.columns ?? [];
      const sumColWeights = cols.reduce((acc, c) => acc + (c.width || 1), 0);
      const isPercentageScale = sumColWeights > 50;
      const serialWeight = block.show_serial ? (isPercentageScale ? 6 : 0.6) : 0;
      const totalWeight = serialWeight + sumColWeights;
      const pct = (w: number) => `${((w / (totalWeight || 1)) * 100).toFixed(2)}%`;
      const items = computed?.items ?? [];

      const design = block.table_design ?? 'card';
      const isCard = design === 'card';
      const isGrid = design === 'grid';
      const isHorizontalOnly = design === 'horizontal_only';
      const isInvisible = design === 'invisible';
      const isMinimalist = design === 'minimalist';

      const borderColor = block.border_color
        ? resolveColor(block.border_color, theme)
        : block.style?.border?.color
        ? resolveColor(block.style.border.color, theme)
        : (theme?.colors?.border ?? '#E5E7EB');

      const headerBg = block.header_style?.background
        ? resolveColor(block.header_style.background, theme)
        : isInvisible || isMinimalist
        ? 'transparent'
        : (theme?.colors?.table_header_bg ?? '#F3F4F6');

      const headerTextColor = block.header_style?.color
        ? resolveColor(block.header_style.color, theme)
        : (theme?.colors?.primary ?? '#5B3FD9');

      const headerFontSize = block.header_style?.font_size ?? 8;
      const rowFontSize = block.row_style?.font_size ?? 8.5;
      const rowPadY = block.row_style?.padding ? block.row_style.padding[0] : 5;
      const rowPadX = block.row_style?.padding ? block.row_style.padding[1] : 6;
      const fontFamily = resolvePdfFontFamily(block.style?.font_family);

      const stripeBg = block.row_style?.background
        ? resolveColor(block.row_style.background, theme)
        : (theme?.colors?.table_stripe_bg ?? '#FAFAFA');

      // Outer container styling based on design
      const containerBorderWidth = isCard || isGrid ? 1 : 0;
      const containerBorderRadius = isCard ? 6 : 0;

      // Header bottom border
      const headerBorderBottomWidth = isInvisible
        ? 0
        : isMinimalist
        ? 2
        : isHorizontalOnly
        ? 1.5
        : 1;
      const headerBorderBottomColor = isMinimalist
        ? (headerTextColor !== '#FFFFFF' ? headerTextColor : theme?.colors?.primary ?? '#5B3FD9')
        : borderColor;

      // Row bottom border
      const rowBorderBottomWidth = isInvisible || isMinimalist ? 0 : 0.5;

      return (
        <View
          key={block.id}
          style={{
            borderWidth: containerBorderWidth,
            borderColor,
            borderRadius: containerBorderRadius,
            overflow: 'hidden',
            fontFamily,
          }}
        >
          {/* Repeating Table Header */}
          <View
            fixed={ctx.isInsideViewRender ? false : block.repeat_header}
            style={{
              flexDirection: 'row',
              backgroundColor: headerBg,
              borderBottomWidth: headerBorderBottomWidth,
              borderBottomColor: headerBorderBottomColor,
              paddingVertical: isMinimalist ? 7 : 6,
              paddingHorizontal: 6,
            }}
          >
            {block.show_serial ? (
              <Text
                style={{
                  width: pct(serialWeight),
                  fontSize: headerFontSize,
                  fontWeight: 'bold',
                  color: headerTextColor,
                  borderRightWidth: isGrid ? 0.5 : 0,
                  borderRightColor: borderColor,
                  paddingRight: isGrid ? 4 : 0,
                }}
              >
                #
              </Text>
            ) : null}
            {cols.map((col, cIdx) => (
              <Text
                key={col.id}
                style={{
                  width: pct(col.width || 1),
                  fontSize: headerFontSize,
                  fontWeight: 'bold',
                  color: headerTextColor,
                  textAlign: col.align,
                  borderRightWidth: isGrid && cIdx < cols.length - 1 ? 0.5 : 0,
                  borderRightColor: borderColor,
                  paddingHorizontal: isGrid ? 4 : 0,
                }}
              >
                {col.header}
              </Text>
            ))}
          </View>

          {/* Table Rows */}
          {items.map((row, idx) => (
            <View
              key={idx}
              wrap={false}
              style={{
                flexDirection: 'row',
                backgroundColor:
                  block.striped && idx % 2 === 1 && !isInvisible
                    ? stripeBg
                    : '#FFFFFF',
                borderBottomWidth: idx === items.length - 1 && isCard ? 0 : rowBorderBottomWidth,
                borderBottomColor: borderColor,
                paddingVertical: rowPadY,
                paddingHorizontal: rowPadX,
              }}
            >
              {block.show_serial ? (
                <Text
                  style={{
                    width: pct(serialWeight),
                    fontSize: rowFontSize,
                    color: theme?.colors?.muted ?? '#6B7280',
                    borderRightWidth: isGrid ? 0.5 : 0,
                    borderRightColor: borderColor,
                    paddingRight: isGrid ? 4 : 0,
                  }}
                >
                  {idx + 1}
                </Text>
              ) : null}
              {cols.map((col, cIdx) => (
                <Text
                  key={col.id}
                  style={{
                    width: pct(col.width || 1),
                    fontSize: rowFontSize,
                    color: theme?.colors?.text ?? '#111827',
                    textAlign: col.align,
                    borderRightWidth: isGrid && cIdx < cols.length - 1 ? 0.5 : 0,
                    borderRightColor: borderColor,
                    paddingHorizontal: isGrid ? 4 : 0,
                  }}
                >
                  {resolveTokens(col.value, { ...ctx, row, rowIndex: idx })}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    }

    case 'totals': {
      const grandTotal = String(computed?.doc?.['grand_total'] ?? '0.00');
      const prefix = definition?.config?.amount_words?.prefix ?? 'Rupees ';
      const suffix = definition?.config?.amount_words?.suffix ?? ' Only';
      const words = amountInWords(grandTotal, { prefix, suffix });

      const visibleRows = (block.rows ?? []).filter((r) => {
        const resolved = resolveTokens(r.value, ctx);
        // Hide zero CGST/SGST/IGST/Shipping/Discount rows automatically unless it's Subtotal or Grand Total
        if (
          !r.emphasis &&
          !r.label?.toLowerCase()?.includes('subtotal') &&
          (resolved === '₹0.00' || resolved === '0.00' || resolved === '-₹0.00')
        ) {
          return false;
        }
        return true;
      });

      return (
        <View
          key={block.id}
          wrap={true}
          style={{
            borderWidth: 1,
            borderColor: theme?.colors?.border ?? '#E5E7EB',
            borderRadius: 6,
            padding: 8,
            backgroundColor: '#FAFAFC',
          }}
        >
          {visibleRows.map((r, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: r.emphasis ? 5 : 2.5,
                borderTopWidth: r.emphasis ? 1 : 0,
                borderTopColor: theme?.colors?.border ?? '#E5E7EB',
                marginTop: r.emphasis ? 3 : 0,
              }}
            >
              <Text
                style={{
                  fontSize: r.emphasis ? 10.5 : 8.5,
                  fontWeight: r.emphasis ? 'bold' : 'normal',
                  color: r.emphasis ? (theme?.colors?.primary ?? '#5B3FD9') : (theme?.colors?.muted ?? '#6B7280'),
                }}
              >
                {r.label}
              </Text>
              <Text
                style={{
                  fontSize: r.emphasis ? 10.5 : 8.5,
                  fontWeight: r.emphasis ? 'bold' : 'normal',
                  color: r.emphasis ? (theme?.colors?.primary ?? '#5B3FD9') : (theme?.colors?.text ?? '#111827'),
                }}
              >
                {resolveTokens(r.value, ctx)}
              </Text>
            </View>
          ))}
          {block.show_amount_in_words && definition?.config?.amount_words?.enabled !== false ? (
            <View
              style={{
                marginTop: 6,
                paddingTop: 5,
                borderTopWidth: 0.5,
                borderTopColor: theme?.colors?.border ?? '#E5E7EB',
              }}
            >
              <Text style={{ fontSize: 7.5, color: theme?.colors?.muted ?? '#6B7280' }}>Amount in Words:</Text>
              <Text style={{ fontSize: 8, fontWeight: 'bold', color: theme?.colors?.text ?? '#111827' }}>
                {words}
              </Text>
            </View>
          ) : null}
        </View>
      );
    }

    case 'hsn_summary':
    case 'tax_summary': {
      const hsnRows = computed?.summaries?.hsn ?? [];
      if (hsnRows.length === 0 || definition?.config?.tax_mode === 'none') return null;
      return (
        <View
          key={block.id}
          wrap={true}
          style={{
            borderWidth: 0.8,
            borderColor: theme?.colors?.border ?? '#E5E7EB',
            borderRadius: 4,
            padding: 6,
          }}
        >
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: theme?.colors?.muted ?? '#6B7280', marginBottom: 4 }}>
            HSN/SAC Tax Summary
          </Text>
          <View
            style={{
              flexDirection: 'row',
              borderBottomWidth: 0.5,
              borderBottomColor: theme?.colors?.border ?? '#E5E7EB',
              paddingBottom: 3,
              marginBottom: 3,
            }}
          >
            <Text style={{ width: '20%', fontSize: 7.5, fontWeight: 'bold' }}>HSN/SAC</Text>
            <Text style={{ width: '22%', fontSize: 7.5, fontWeight: 'bold', textAlign: 'right' }}>
              Taxable
            </Text>
            <Text style={{ width: '12%', fontSize: 7.5, fontWeight: 'bold', textAlign: 'right' }}>
              Rate
            </Text>
            <Text style={{ width: '15%', fontSize: 7.5, fontWeight: 'bold', textAlign: 'right' }}>
              CGST
            </Text>
            <Text style={{ width: '15%', fontSize: 7.5, fontWeight: 'bold', textAlign: 'right' }}>
              SGST
            </Text>
            <Text style={{ width: '16%', fontSize: 7.5, fontWeight: 'bold', textAlign: 'right' }}>
              IGST
            </Text>
          </View>
          {hsnRows.map((h, i) => (
            <View key={i} style={{ flexDirection: 'row', paddingVertical: 1.5 }}>
              <Text style={{ width: '20%', fontSize: 7.5 }}>{h.hsn_sac}</Text>
              <Text style={{ width: '22%', fontSize: 7.5, textAlign: 'right' }}>
                {formatMoney(h.taxable, { symbol: false })}
              </Text>
              <Text style={{ width: '12%', fontSize: 7.5, textAlign: 'right' }}>{h.rate}%</Text>
              <Text style={{ width: '15%', fontSize: 7.5, textAlign: 'right' }}>
                {formatMoney(h.cgst, { symbol: false })}
              </Text>
              <Text style={{ width: '15%', fontSize: 7.5, textAlign: 'right' }}>
                {formatMoney(h.sgst, { symbol: false })}
              </Text>
              <Text style={{ width: '16%', fontSize: 7.5, textAlign: 'right' }}>
                {formatMoney(h.igst, { symbol: false })}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    case 'signature': {
      const rawSig =
        (company?.signature_asset_id ? assetDataUrls?.[company.signature_asset_id] : undefined) ||
        (company as any)?.signature_data_url ||
        assetDataUrls?.['company_signature'];
      const sigUrl = cleanDataUrlForPdf(rawSig);
      return (
        <View
          key={block.id}
          wrap={true}
          style={{
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            minHeight: 68,
            paddingTop: 8,
          }}
        >
          {sigUrl ? (
            <Image src={sigUrl} style={{ width: 96, height: 36, objectFit: 'contain', marginBottom: 4 }} />
          ) : (
            <View style={{ height: 32 }} />
          )}
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: theme?.colors?.text ?? '#111827', textAlign: 'right' }}>
            {resolveTokens(String(block.caption ?? ''), ctx)}
          </Text>
        </View>
      );
    }

    default:
      return null;
  }
}

export function IngenPdfDocument({ input }: { input: PdfRenderInput }) {
  const { definition, company, client, values, computed } = input;
  const docMeta = input.docMeta ?? {
    number: 'DRAFT',
    status: 'draft',
    issue_date: new Date().toISOString().slice(0, 10),
    type_label: 'TAX INVOICE',
  };
  const { page, layout, theme } = definition;
  const header = layout?.zones?.header ?? { height: 0, blocks: [] };
  const footer = layout?.zones?.footer ?? { height: 0, blocks: [] };
  const left = layout?.zones?.left ?? { width: 0, blocks: [] };
  const right = layout?.zones?.right ?? { width: 0, blocks: [] };

  const hasCustomPage2 =
    layout?.continuation?.mode === 'custom_page_2' && Boolean(layout.continuation.zones);
  const page2Header = hasCustomPage2 ? (layout.continuation!.zones!.header ?? header) : header;
  const page2Footer = hasCustomPage2 ? (layout.continuation!.zones!.footer ?? footer) : footer;

  // Defensive bounds: clamp fixed header/footer paddings so body always gets at least 40% page height
  const maxAllowedHeaderPad = Math.round(page.height * 0.48);
  const maxAllowedFooterPad = Math.round(page.height * 0.28);

  const safeHeaderH = Math.min(header.height, maxAllowedHeaderPad);
  const safePage2HeaderH = Math.min(page2Header.height, maxAllowedHeaderPad);
  const safeFooterH = Math.min(footer.height, maxAllowedFooterPad);
  const safePage2FooterH = Math.min(page2Footer.height, maxAllowedFooterPad);

  const effectivePadHeaderH = hasCustomPage2
    ? Math.min(safeHeaderH, safePage2HeaderH)
    : safeHeaderH;
  const page1ExtraHeaderSpacer = hasCustomPage2
    ? Math.max(0, safeHeaderH - effectivePadHeaderH)
    : 0;

  const padTop = page.margin + effectivePadHeaderH;
  const padBottom = page.margin + Math.max(safeFooterH, safePage2FooterH);
  const padLeft = page.margin + left.width;
  const padRight = page.margin + right.width;

  const ctx: TokenResolutionContext = {
    company,
    client,
    doc: docMeta,
    values,
    computed,
    pageNumber: 1,
    totalPages: 1,
  };

  const showWatermark =
    (docMeta.status === 'draft' && definition?.config?.watermark?.draft !== false) ||
    docMeta.status === 'cancelled';

  return (
    <Document
      title={`${docMeta.type_label} ${docMeta.number}`}
      author={company.name}
      creator="INGEN Invoice Studio"
    >
      <Page
        size={[page.width, page.height]}
        style={{
          paddingTop: padTop,
          paddingBottom: padBottom,
          paddingLeft: padLeft,
          paddingRight: padRight,
          fontFamily: 'Helvetica',
          fontSize: theme?.base_font_size ?? 9,
          color: theme?.colors?.text ?? '#111827',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Fixed Header Zone (Static by default; dynamic only when custom Page 2+ continuation is defined) */}
        {header.height > 0 || (hasCustomPage2 && page2Header.height > 0) ? (
          hasCustomPage2 ? (
            <View
              fixed
              style={{
                position: 'absolute',
                top: page.margin,
                left: padLeft,
                right: padRight,
                height: Math.max(header.height, page2Header.height),
              }}
              render={(renderProps) => {
                const pageNumber = renderProps.pageNumber;
                const activeHeader = pageNumber === 1 ? header : page2Header;
                if (!activeHeader || activeHeader.height <= 0) return null;
                const pageCtx: TokenResolutionContext = {
                  ...ctx,
                  pageNumber,
                  isInsideViewRender: true,
                };
                return (
                  <View style={{ position: 'relative', height: activeHeader.height }}>
                    {(activeHeader.blocks ?? []).map((fb) => (
                      <View
                        key={fb.id}
                        style={{
                          position: 'absolute',
                          left: fb.frame?.x ?? 0,
                          top: fb.frame?.y ?? 0,
                          width: fb.frame?.w ?? 200,
                          height: fb.frame?.h ?? 24,
                        }}
                      >
                        {renderSingleBlock(fb, pageCtx, input)}
                      </View>
                    ))}
                  </View>
                );
              }}
            />
          ) : (
            <View
              fixed
              style={{
                position: 'absolute',
                top: page.margin,
                left: padLeft,
                right: padRight,
                height: header.height,
              }}
            >
              {(header.blocks ?? []).map((fb) => (
                <View
                  key={fb.id}
                  style={{
                    position: 'absolute',
                    left: fb.frame?.x ?? 0,
                    top: fb.frame?.y ?? 0,
                    width: fb.frame?.w ?? 200,
                    height: fb.frame?.h ?? 24,
                  }}
                >
                  {renderSingleBlock(fb, ctx, input)}
                </View>
              ))}
            </View>
          )
        ) : null}

        {/* Fixed Footer Zone (Static by default; dynamic only when custom Page 2+ continuation is defined) */}
        {footer.height > 0 || (hasCustomPage2 && page2Footer.height > 0) ? (
          hasCustomPage2 ? (
            <View
              fixed
              style={{
                position: 'absolute',
                bottom: page.margin,
                left: padLeft,
                right: padRight,
                height: Math.max(footer.height, page2Footer.height),
              }}
              render={(renderProps) => {
                const pageNumber = renderProps.pageNumber;
                const activeFooter = pageNumber === 1 ? footer : page2Footer;
                if (!activeFooter || activeFooter.height <= 0) return null;
                const pageCtx: TokenResolutionContext = {
                  ...ctx,
                  pageNumber,
                  isInsideViewRender: true,
                };
                return (
                  <View style={{ position: 'relative', height: activeFooter.height }}>
                    {(activeFooter.blocks ?? []).map((fb) => (
                      <View
                        key={fb.id}
                        style={{
                          position: 'absolute',
                          left: fb.frame?.x ?? 0,
                          top: fb.frame?.y ?? 0,
                          width: fb.frame?.w ?? 200,
                          height: fb.frame?.h ?? 24,
                        }}
                      >
                        {renderSingleBlock(fb, pageCtx, input)}
                      </View>
                    ))}
                  </View>
                );
              }}
            />
          ) : (
            <View
              fixed
              style={{
                position: 'absolute',
                bottom: page.margin,
                left: padLeft,
                right: padRight,
                height: footer.height,
              }}
            >
              {(footer.blocks ?? []).map((fb) => (
                <View
                  key={fb.id}
                  style={{
                    position: 'absolute',
                    left: fb.frame?.x ?? 0,
                    top: fb.frame?.y ?? 0,
                    width: fb.frame?.w ?? 200,
                    height: fb.frame?.h ?? 24,
                  }}
                >
                  {renderSingleBlock(fb, ctx, input)}
                </View>
              ))}
            </View>
          )
        ) : null}

        {/* Watermark for Draft / Cancelled */}
        {showWatermark ? (
          <View fixed style={styles.watermarkWrapper}>
            <Text style={styles.watermarkText}>
              {docMeta.status === 'cancelled' ? 'CANCELLED' : 'DRAFT'}
            </Text>
          </View>
        ) : null}

        {/* Paginating Flow Body (Starts after Page 1 Header on Page 1, and continues after Page 2+ Header on Page 2, 3, ...) */}
        <View style={{ flexDirection: 'column' }}>
          {page1ExtraHeaderSpacer > 0 ? (
            <View style={{ height: page1ExtraHeaderSpacer }} />
          ) : null}
          {(layout.body?.rows ?? []).map((row) => (
            <View
              key={row.id}
              wrap={true}
              style={{
                flexDirection: 'row',
                marginBottom: layout.body?.row_gap ?? 0,
              }}
            >
              {(row.cols ?? []).map((col, colIdx) => {
                const span = col.span || 12;
                const widthPct = `${((span / 12) * 100).toFixed(2)}%`;
                const colBlocks = col.blocks ?? [];
                const hasTable = colBlocks.some((b) => b.type === 'table');
                const allHaveRelFrame =
                  !hasTable && colBlocks.length > 0 && colBlocks.every((b) => Boolean(b.rel_frame));
                const containerH = allHaveRelFrame
                  ? Math.max(
                      ...colBlocks.map((b) =>
                        Math.max(
                          b.rel_frame?.container_h ?? 40,
                          (b.rel_frame?.y ?? 0) + (b.rel_frame?.h ?? 24)
                        )
                      ),
                      36
                    )
                  : 0;

                return (
                  <View
                    key={col.id}
                    style={{
                      width: widthPct,
                      paddingRight: colIdx < (row.cols?.length ?? 1) - 1 ? (row.gap ?? 0) : 0,
                    }}
                  >
                    {allHaveRelFrame ? (
                      <View style={{ position: 'relative', height: containerH }}>
                        {colBlocks.map((b) => (
                          <View
                            key={b.id}
                            style={{
                              position: 'absolute',
                              left: b.rel_frame!.x,
                              top: b.rel_frame!.y,
                              width: b.rel_frame!.w,
                              height: b.rel_frame!.h,
                            }}
                          >
                            {renderSingleBlock(b, ctx, input)}
                          </View>
                        ))}
                      </View>
                    ) : (
                      colBlocks.map((b) => renderSingleBlock(b, ctx, input))
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return blobToPdfDataUrl(blob);
}

export async function compilePdfToBlob(input: PdfRenderInput): Promise<Blob> {
  const assetDataUrls: Record<string, string> = { ...(input.assetDataUrls ?? {}) };
  const neededAssetIds = new Set<string>();

  let company = input.company;
  if (!company?.logo_asset_id) {
    try {
      const { getActiveCompany } = await import('../db/repos');
      const activeCmp = await getActiveCompany();
      if (activeCmp?.logo_asset_id) {
        if (!company) company = activeCmp;
        else company = { ...company, logo_asset_id: activeCmp.logo_asset_id };
        neededAssetIds.add(activeCmp.logo_asset_id);
      }
    } catch {
      // ignore
    }
  }

  if (company?.logo_asset_id && !assetDataUrls[company.logo_asset_id]) {
    neededAssetIds.add(company.logo_asset_id);
  }
  if (company?.signature_asset_id && !assetDataUrls[company.signature_asset_id]) {
    neededAssetIds.add(company.signature_asset_id);
  }

  let needsCompanyLogo = false;
  let needsCompanySignature = false;

  const scanBlocks = (blocks: Block[] | undefined) => {
    if (!blocks) return;
    for (const b of blocks) {
      if (b.type === 'image') {
        if (b.source.kind === 'asset' && b.source.asset_id && !assetDataUrls[b.source.asset_id]) {
          neededAssetIds.add(b.source.asset_id);
        } else if (b.source.kind === 'company_logo') {
          needsCompanyLogo = true;
          if (company?.logo_asset_id && !assetDataUrls[company.logo_asset_id]) {
            neededAssetIds.add(company.logo_asset_id);
          }
        } else if (b.source.kind === 'company_signature') {
          needsCompanySignature = true;
          if (company?.signature_asset_id && !assetDataUrls[company.signature_asset_id]) {
            neededAssetIds.add(company.signature_asset_id);
          }
        }
      } else if (b.type === 'signature') {
        needsCompanySignature = true;
        if (company?.signature_asset_id && !assetDataUrls[company.signature_asset_id]) {
          neededAssetIds.add(company.signature_asset_id);
        }
      }
    }
  };

  const zones = input.definition?.layout?.zones;
  if (zones) {
    scanBlocks(zones.header?.blocks);
    scanBlocks(zones.footer?.blocks);
    scanBlocks(zones.left?.blocks);
    scanBlocks(zones.right?.blocks);
  }
  const contZones = input.definition?.layout?.continuation?.zones;
  if (contZones) {
    scanBlocks(contZones.header?.blocks);
    scanBlocks(contZones.footer?.blocks);
  }
  const bodyRows = input.definition?.layout?.body?.rows ?? [];
  for (const row of bodyRows) {
    for (const col of row.cols ?? []) {
      scanBlocks(col.blocks);
    }
  }

  if (neededAssetIds.size > 0) {
    try {
      const { db } = await import('../db/schema');
      for (const assetId of neededAssetIds) {
        if (!assetDataUrls[assetId]) {
          const asset = await db.assets.get(assetId);
          if (asset?.blob) {
            const dataUrl = await blobToPdfDataUrl(asset.blob);
            assetDataUrls[assetId] = dataUrl;
            if (assetId === company?.logo_asset_id) {
              assetDataUrls['company_logo'] = dataUrl;
            }
            if (assetId === company?.signature_asset_id) {
              assetDataUrls['company_signature'] = dataUrl;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Asset resolution note:', e);
    }
  }

  // Handle direct company logo/signature data URLs
  if ((company as any)?.logo_data_url && !assetDataUrls['company_logo']) {
    assetDataUrls['company_logo'] =
      cleanDataUrlForPdf((company as any).logo_data_url) || (company as any).logo_data_url;
  }
  if ((company as any)?.signature_data_url && !assetDataUrls['company_signature']) {
    assetDataUrls['company_signature'] =
      cleanDataUrlForPdf((company as any).signature_data_url) || (company as any).signature_data_url;
  }

  // If company logo is needed but still missing, attempt fallback to any image asset in db.assets
  if (needsCompanyLogo && !assetDataUrls['company_logo']) {
    try {
      const { db } = await import('../db/schema');
      const lastImageAsset = await db.assets.where('kind').equals('image').last();
      if (lastImageAsset?.blob) {
        const dataUrl = await blobToPdfDataUrl(lastImageAsset.blob);
        assetDataUrls['company_logo'] = dataUrl;
        assetDataUrls[lastImageAsset.id] = dataUrl;
      }
    } catch {
      // ignore
    }
  }

  // If company logo is still missing, fallback to DEFAULT_COMPANY_LOGO_DATA_URL so PDF renders a crisp monogram
  if (needsCompanyLogo && !assetDataUrls['company_logo']) {
    assetDataUrls['company_logo'] = DEFAULT_COMPANY_LOGO_DATA_URL;
  }

  const effectiveInput: PdfRenderInput = {
    ...input,
    company: company ?? input.company,
    assetDataUrls,
  };

  const instance = pdf(<IngenPdfDocument input={effectiveInput} />);
  return instance.toBlob();
}
