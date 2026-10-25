import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus,
  Copy,
  Edit3,
  Eye,
  CheckCircle2,
  ArrowLeft,
  Trash2,
  Sparkles,
  FileSpreadsheet,
  Maximize2,
  Layers,
  Grid,
  Move,
  Sliders,
  Loader2,
  ExternalLink,
  Download,
  RefreshCw,
  FileText,
  Type,
  Image as ImageIcon,
  Table as TableIcon,
  Calculator,
  QrCode,
  Landmark,
  PenTool,
  Square,
  Tag,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Search,
  Check,
  Scissors,
  Columns,
  Rows,
  Palette,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Upload,
} from 'lucide-react';
import { db } from '../../db/schema';
import { useAppStore } from '../../app/useAppStore';
import {
  Button,
  CloudTooltip,
  GlassCard,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  Textarea,
  TruncatedTextWithReadMore,
} from '../../design-system/components';

import { cloneTemplateForCompany, publishTemplateDraft } from '../../db/repos';
import {
  DOC_TYPE_LABELS,
  type Block,
  type BodyRow,
  type DocType,
  type FixedBlock,
  type Template,
  type TemplateDefinition,
  type TemplateVersion,
} from '../../core/schema/types';
import { newId } from '../../core/id';
import { evaluateDocument } from '../../core/formula';
import { compilePdfToBlob } from '../share/sharePdf';
import { buildGstClassicDefinition } from '../../templates/starters';
import { toast } from 'sonner';

import { compressAndNormalizeImage } from '../../core/assets/compress';
export { compressAndNormalizeImage };

// ============================================================================
// 1. TEMPLATES GALLERY PAGE (with "Create from Scratch" CTA)
// ============================================================================

export function TemplatesGalleryPage() {
  const navigate = useNavigate();
  const { activeCompany } = useAppStore();

  const templates = useLiveQuery(() => db.templates.filter((t) => !t.archived).toArray(), []) ?? [];

  const handleClone = async (tplId: string, name: string) => {
    if (!activeCompany) {
      toast.error('Please set up your Business Profile first');
      navigate('/onboarding');
      return;
    }
    const copy = await cloneTemplateForCompany(
      tplId,
      activeCompany.id,
      `${name} (Custom)`
    );
    toast.success(`Cloned "${copy.name}" — you can resize every section freely`);
    navigate(`/templates/${copy.id}/builder`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates & Visual Page Studio"
        subtitle="Create a custom template from scratch by slicing the page into Fixed & Variable parts, or customize a starter."
        actions={
          <Button variant="gold" size="lg" onClick={() => navigate('/templates/new')}>
            <Plus className="w-4 h-4" />
            <span>Create Template from Scratch</span>
          </Button>
        }
      />

      {/* Hero Create-From-Scratch Banner */}
      <GlassCard className="p-5 sm:p-6 border-gold/30 bg-gradient-to-r from-[#7C5CFF]/15 via-transparent to-[#E8C27A]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold">
            <Grid className="w-3.5 h-3.5" />
            <span>Interactive Page Architect</span>
          </div>
          <h2 className="font-display text-lg font-bold">
            Design Your Own Layout From Scratch
          </h2>
          <p className="text-xs text-muted-foreground max-w-2xl">
            <TruncatedTextWithReadMore
              text="Pick A4, A5, or Thermal 80mm → Paint & slice the page into as many Blue (Fixed) and Variable (Flow) parts as you need → Assign tables, text, logos, UPI QR, or custom fields to each part."
              maxChars={115}
            />
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/templates/new')} className="shrink-0">
          <Sparkles className="w-4 h-4" />
          <span>Launch Scratch Architect</span>
        </Button>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map((tpl) => {
          const def = tpl.draft_definition;
          return (
            <GlassCard key={tpl.id} className="p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0"
                      style={{ backgroundColor: def.theme.colors.primary }}
                    >
                      {def.config.sequence.series}
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold">{tpl.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {DOC_TYPE_LABELS[tpl.doc_type]} • {def.config.sequence.pattern}
                      </span>
                    </div>
                  </div>
                  <StatusPill status={tpl.has_unpublished_changes ? 'draft' : 'finalized'} />
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs space-y-1 text-muted-foreground">
                  <div>
                    Page: <strong className="text-foreground">{def.page.size}</strong> (
                    {Math.round(def.page.width)} × {Math.round(def.page.height)} pt)
                  </div>
                  <div>
                    Header: <strong className="text-foreground">{def.layout.zones.header.height}pt</strong> • Footer:{' '}
                    <strong className="text-foreground">{def.layout.zones.footer.height}pt</strong> • Body Rows:{' '}
                    <strong className="text-foreground">{def.layout.body.rows.length}</strong>
                  </div>
                  <div>
                    Tax Mode: <strong className="text-foreground uppercase">{def.config.tax_mode}</strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/documents/new?templateId=${tpl.id}`)}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Use</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/templates/${tpl.id}/builder`)}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Full Studio</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleClone(tpl.id, tpl.name)}
                  title="Duplicate Template"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 2. CREATE TEMPLATE FROM SCRATCH — 3-STEP VISUAL ARCHITECT (/templates/new)
// ============================================================================

type CommonSizeId = 'A4' | 'A5' | 'THERMAL_80';

const COMMON_PAGE_SIZES: Array<{
  id: CommonSizeId;
  title: string;
  subtitle: string;
  dimensionsLabel: string;
  width: number;
  height: number;
  margin: number;
}> = [
  {
    id: 'A4',
    title: 'A4 Standard Sheet',
    subtitle: 'Most popular for GST Tax Invoices, Quotations & B2B Bills',
    dimensionsLabel: '210 × 297 mm (595 × 842 pt)',
    width: 595.28,
    height: 841.89,
    margin: 24,
  },
  {
    id: 'A5',
    title: 'A5 Compact Sheet (Half-A4)',
    subtitle: 'Ideal for Medical Prescriptions, Retail Counters & Delivery Challans',
    dimensionsLabel: '148 × 210 mm (420 × 595 pt)',
    width: 419.53,
    height: 595.28,
    margin: 20,
  },
  {
    id: 'THERMAL_80',
    title: '80mm Thermal POS Roll',
    subtitle: 'Fast-moving Cash Memos, Restaurant Bills & Quick Receipts',
    dimensionsLabel: '80 mm Roll (227 × 640 pt)',
    width: 226.77,
    height: 640,
    margin: 12,
  },
];

export type PartContentKind =
  | 'company_header'
  | 'logo_and_title'
  | 'client_bill_to'
  | 'patient_vitals'
  | 'invoice_meta'
  | 'items_table'
  | 'upi_and_bank'
  | 'totals_box'
  | 'hsn_summary'
  | 'signature_box'
  | 'terms_notes'
  | 'custom_text'
  | 'empty';

export type PartKind =
  | 'text'
  | 'image'
  | 'items_table'
  | 'totals_box'
  | 'upi_qr'
  | 'bank_details'
  | 'signature'
  | 'hsn_summary'
  | 'spacer';

export interface ComponentKindOption {
  kind: PartKind;
  title: string;
  badge: string;
  emoji: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  recommendedMode: 'fixed' | 'variable';
}

export const COMPONENT_KIND_OPTIONS: ComponentKindOption[] = [
  {
    kind: 'text',
    title: 'Custom Text Field (with Variables)',
    badge: 'Text & Variables',
    emoji: '🔤',
    desc: 'Completely customizable text box with attached dynamic company, document, client, or custom variables',
    icon: Type,
    recommendedMode: 'fixed',
  },
  {
    kind: 'image',
    title: 'Company Logo or Graphic Image',
    badge: 'Logo / Graphic',
    emoji: '🏢',
    desc: 'Displays your business logo or custom graphic/stamp',
    icon: ImageIcon,
    recommendedMode: 'fixed',
  },
  {
    kind: 'items_table',
    title: 'Expanding Line Items / Rx Table',
    badge: 'Items Table',
    emoji: '📊',
    desc: 'Multi-row table with multiple colors, invisible lines, and customizable columns',
    icon: TableIcon,
    recommendedMode: 'variable',
  },
  {
    kind: 'totals_box',
    title: 'Tax & Grand Total Summary Box',
    badge: 'Calculations',
    emoji: '🧮',
    desc: 'Subtotal, CGST, SGST, IGST, Round-Off, Grand Total & Amount in Words',
    icon: Calculator,
    recommendedMode: 'variable',
  },
  {
    kind: 'upi_qr',
    title: 'Dynamic UPI QR Code',
    badge: 'Instant Pay',
    emoji: '📱',
    desc: 'Scannable vector QR code dynamically linked to Grand Total & VPA',
    icon: QrCode,
    recommendedMode: 'variable',
  },
  {
    kind: 'bank_details',
    title: 'Bank & Payment Details',
    badge: 'Bank Details',
    emoji: '🏛️',
    desc: 'Company Bank Name, Account Number, IFSC Code & Branch',
    icon: Landmark,
    recommendedMode: 'variable',
  },
  {
    kind: 'signature',
    title: 'Authorised Signatory / Doctor Stamp',
    badge: 'Stamp / Sign',
    emoji: '✍️',
    desc: 'Signature image / stamp block + "For {{company.name}}"',
    icon: PenTool,
    recommendedMode: 'fixed',
  },
  {
    kind: 'hsn_summary',
    title: 'HSN / SAC Tax Breakdown',
    badge: 'GST Table',
    emoji: '🏷️',
    desc: 'Grouped GST rate summary breakdown table by HSN/SAC code',
    icon: Tag,
    recommendedMode: 'variable',
  },
  {
    kind: 'spacer',
    title: 'Blank Spacer / Open Area',
    badge: 'Spacer',
    emoji: '⬜',
    desc: 'Leave space or reserve for later layout adjustments',
    icon: Square,
    recommendedMode: 'fixed',
  },
];

export interface VariableTokenOption {
  token: string;
  label: string;
  desc: string;
  category: 'company' | 'doc' | 'client' | 'financials' | 'custom';
}

export const SYSTEM_VARIABLES: VariableTokenOption[] = [
  // Company
  { token: '{{company.name}}', label: 'Company Name', desc: 'Registered business name', category: 'company' },
  { token: '{{company.address.full}}', label: 'Full Address', desc: 'Street, City, State & Pincode', category: 'company' },
  { token: '{{company.gstin}}', label: 'GSTIN', desc: '15-digit GST identification number', category: 'company' },
  { token: '{{company.phone}}', label: 'Phone Number', desc: 'Business contact phone', category: 'company' },
  { token: '{{company.email}}', label: 'Email', desc: 'Business email address', category: 'company' },
  { token: '{{company.pan}}', label: 'PAN', desc: 'Income tax PAN number', category: 'company' },
  { token: '{{company.bank.bank_name}}', label: 'Bank Name', desc: 'Company bank name', category: 'company' },
  { token: '{{company.bank.account_no}}', label: 'Bank A/C No', desc: 'Bank account number', category: 'company' },
  { token: '{{company.bank.ifsc}}', label: 'Bank IFSC', desc: 'IFSC code for NEFT/RTGS', category: 'company' },

  // Document Meta
  { token: '{{doc.number}}', label: 'Document Number', desc: 'Sequential invoice or Rx number', category: 'doc' },
  { token: '{{doc.issue_date | date:"DD MMM YYYY"}}', label: 'Issue Date', desc: 'Formatted issue date (e.g. 20 Oct 2026)', category: 'doc' },
  { token: '{{doc.due_date | date:"DD MMM YYYY"}}', label: 'Due Date', desc: 'Formatted payment due date', category: 'doc' },
  { token: '{{doc.place_of_supply}}', label: 'Place of Supply', desc: '2-digit state code (e.g. 36)', category: 'doc' },
  { token: '{{doc.type_label}}', label: 'Document Type', desc: 'e.g. TAX INVOICE, BILL OF SUPPLY', category: 'doc' },
  { token: 'Page {{page.number}} of {{page.total}}', label: 'Page Number', desc: 'Current page of total pages', category: 'doc' },

  // Client / Patient
  { token: '{{client_name}}', label: 'Client / Patient Name', desc: 'Customer name or patient name', category: 'client' },
  { token: '{{client_address}}', label: 'Client Address', desc: 'Full billing or residential address', category: 'client' },
  { token: '{{client_gstin}}', label: 'Client GSTIN', desc: 'Customer GSTIN (if B2B registered)', category: 'client' },
  { token: '{{client_phone}}', label: 'Client Phone', desc: 'Customer contact phone number', category: 'client' },
  { token: '{{patient_age}}', label: 'Age / Gender', desc: 'Patient age & gender (e.g. 34 Yrs / M)', category: 'client' },
  { token: '{{patient_vitals}}', label: 'Medical Vitals', desc: 'BP, Pulse, SpO2, Temperature, Weight', category: 'client' },
  { token: '{{po_number}}', label: 'PO / Ref Number', desc: 'Client Purchase Order or reference #', category: 'client' },
  { token: '{{notes}}', label: 'Notes / Instructions', desc: 'Terms, conditions, or doctor advice', category: 'client' },

  // Financials
  { token: '{{grand_total | money}}', label: 'Grand Total (₹)', desc: 'Final invoice total with ₹ symbol', category: 'financials' },
  { token: '{{subtotal | money}}', label: 'Subtotal (₹)', desc: 'Taxable value before taxes', category: 'financials' },
  { token: '{{tax_total | money}}', label: 'Tax Total (₹)', desc: 'Total GST amount (CGST + SGST or IGST)', category: 'financials' },
  { token: '{{grand_total | words}}', label: 'Amount in Words', desc: 'Indian currency words (e.g. Rupees ... Only)', category: 'financials' },
];

export const STARTER_TEXT_PRESETS: Array<{
  id: string;
  label: string;
  icon: string;
  template: (docType: DocType) => string;
}> = [
  {
    id: 'company_header',
    label: 'Company Header',
    icon: '🏢',
    template: () =>
      '{{company.name}}\n{{company.address.full}}\nGSTIN: {{company.gstin | default:"Unregistered"}} • Ph: {{company.phone}}',
  },
  {
    id: 'doc_title_meta',
    label: 'Doc Title & No.',
    icon: '📄',
    template: (dt) =>
      `${DOC_TYPE_LABELS[dt].toUpperCase()}\nNo: {{doc.number}}\nDate: {{doc.issue_date | date:"DD MMM YYYY"}}`,
  },
  {
    id: 'bill_to',
    label: 'Bill To Customer',
    icon: '👤',
    template: () =>
      'BILL TO:\n{{client_name}}\n{{client_address}}\nGSTIN: {{client_gstin | default:"—"}} • Ph: {{client_phone | default:"—"}}',
  },
  {
    id: 'patient_vitals',
    label: 'Patient & Vitals',
    icon: '🩺',
    template: () =>
      'Patient: {{client_name}} | Age/Sex: {{patient_age | default:"—"}}\nVitals: {{patient_vitals | default:"BP: 120/80 • Pulse: 72 bpm"}}',
  },
  {
    id: 'terms_notes',
    label: 'Terms & Notes',
    icon: '📝',
    template: () =>
      'Terms & Conditions:\n1. Payment due within 15 days of invoice date.\n2. Goods once sold will not be taken back.',
  },
  {
    id: 'blank',
    label: 'Blank Text Box',
    icon: '🔲',
    template: () => '',
  },
];

export interface SlicedTableColumn {
  id: string;
  header: string;
  value: string;
  width: number;
  align: 'left' | 'center' | 'right';
  enabled: boolean;
}

export const DEFAULT_TABLE_COLUMNS: SlicedTableColumn[] = [
  { id: 'col_desc', header: 'Item Description', value: '{{item_name}}', width: 40, align: 'left', enabled: true },
  { id: 'col_hsn', header: 'HSN/SAC', value: '{{hsn_sac}}', width: 15, align: 'center', enabled: true },
  { id: 'col_qty', header: 'Qty', value: '{{qty}} {{unit}}', width: 10, align: 'right', enabled: true },
  { id: 'col_rate', header: 'Rate (₹)', value: '{{rate | money:nosymbol}}', width: 15, align: 'right', enabled: true },
  { id: 'col_amt', header: 'Amount (₹)', value: '{{line_total | money:nosymbol}}', width: 20, align: 'right', enabled: true },
];

/**
 * Normalizes enabled column widths so their sum is strictly 100%.
 */
export function normalizeColumnsTo100(columns: SlicedTableColumn[]): SlicedTableColumn[] {
  const enabled = columns.filter((c) => c.enabled !== false);
  if (enabled.length === 0) return columns;

  const currentTotal = enabled.reduce((acc, c) => acc + (c.width > 0 ? c.width : 10), 0);
  if (currentTotal <= 0) return columns;

  let allocated = 0;
  const updatedEnabled = enabled.map((c, i) => {
    if (i === enabled.length - 1) {
      const remaining = Math.max(5, 100 - allocated);
      return { ...c, width: remaining };
    }
    const proportional = Math.max(5, Math.round(((c.width > 0 ? c.width : 10) / currentTotal) * 100));
    allocated += proportional;
    return { ...c, width: proportional };
  });

  return columns.map((col) => {
    const match = updatedEnabled.find((u) => u.id === col.id);
    return match ? match : col;
  });
}

export type SectionItemType =
  | 'text'
  | 'image'
  | 'items_table'
  | 'totals_box'
  | 'upi_qr'
  | 'bank_details'
  | 'signature'
  | 'hsn_summary';

export interface SectionItem {
  id: string;
  type: SectionItemType;
  label: string;
  /**
   * Freeform position & size INSIDE the parent Layout Section (0..100% of the section's width & height)
   */
  x: number; // 0..95 (% from left of section)
  y: number; // 0..95 (% from top of section)
  w: number; // 5..100 (% width of section)
  h: number; // 5..100 (% height of section)

  // --- Text Field Properties ('text') ---
  textMode?: 'fixed' | 'variable';
  fixedText?: string;
  variableKey?: string;
  variableLabel?: string;
  variablePrefix?: string;
  variableValue?: string;
  fieldType?: 'text' | 'multiline' | 'number' | 'money' | 'date' | 'phone' | 'gstin';

  // Typography & Box Styling
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 400 | 600 | 700;
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  backgroundColor?: string;
  hasBorder?: boolean;
  borderColor?: string;
  borderRadius?: number;

  // --- Image / Photo Properties ('image') ---
  imageSource?: 'custom_upload' | 'company_logo' | 'company_signature';
  imageDataUrl?: string;
  imageFit?: 'contain' | 'cover';

  // --- Table Properties ('items_table') ---
  tableDesign?: 'card' | 'horizontal_only' | 'grid' | 'invisible' | 'minimalist';
  tableHeaderBg?: string;
  tableHeaderTextColor?: string;
  tableHeaderFontSize?: number;
  tableBorderColor?: string;
  tableStriped?: boolean;
  tableStripeBg?: string;
  tableFontSize?: number;
  tableDensity?: 'compact' | 'normal' | 'relaxed';
  tableShowSerial?: boolean;
  tableColumns?: SlicedTableColumn[];

  // --- QR & Signature Captions ---
  qrCaption?: string;
  signatureCaption?: string;
}

export interface SlicedPart {
  id: string;
  name: string;
  /** Grid coordinates on a 12-col × 12-row page blueprint (0-indexed: 0..11) */
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
  mode: 'fixed' | 'variable';
  /** Freeform items (text fields, images, tables, QR, etc.) placed inside this layout section */
  items?: SectionItem[];
  content?: PartContentKind;
  kind?: PartKind;
  textTemplate?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 400 | 600 | 700;
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  backgroundColor?: string;
  hasBorder?: boolean;
  borderColor?: string;
  borderRadius?: number;
  imageSource?: 'company_logo' | 'company_signature';
  imageFit?: 'contain' | 'cover';
  qrCaption?: string;
  signatureCaption?: string;
  customText?: string;
  // Dynamic Table Customizations (Multiple colors, invisible lines, density, columns):
  tableDesign?: 'card' | 'horizontal_only' | 'grid' | 'invisible' | 'minimalist';
  tableHeaderBg?: string;
  tableHeaderTextColor?: string;
  tableHeaderFontSize?: number;
  tableBorderColor?: string;
  tableStriped?: boolean;
  tableStripeBg?: string;
  tableFontSize?: number;
  tableDensity?: 'compact' | 'normal' | 'relaxed';
  tableShowSerial?: boolean;
  tableColumns?: SlicedTableColumn[];
}

export function getPartKind(part: Partial<SlicedPart>): PartKind {
  if (part.items && part.items.length > 0) {
    if (part.items.some((i) => i.type === 'items_table')) return 'items_table';
    return part.items[0]!.type;
  }
  if (part.kind) return part.kind;
  if (part.content === 'items_table') return 'items_table';
  if (part.content === 'totals_box') return 'totals_box';
  if (part.content === 'upi_and_bank') return 'upi_qr';
  if (part.content === 'signature_box') return 'signature';
  if (part.content === 'hsn_summary') return 'hsn_summary';
  if (part.content === 'empty') return 'spacer';
  return 'text';
}

export function getDefaultTextForContent(content?: PartContentKind, docType: DocType = 'tax_invoice'): string {
  switch (content) {
    case 'company_header':
      return '{{company.name}}\n{{company.address.full}}\nGSTIN: {{company.gstin | default:"Unregistered"}} • Ph: {{company.phone}}';
    case 'logo_and_title':
      return `${DOC_TYPE_LABELS[docType].toUpperCase()}\nNo: {{doc.number}}\nDate: {{doc.issue_date | date:"DD MMM YYYY"}}`;
    case 'client_bill_to':
      return 'BILL TO:\n{{client_name}}\n{{client_address}}\nGSTIN: {{client_gstin | default:"—"}} • Ph: {{client_phone | default:"—"}}';
    case 'patient_vitals':
      return 'Patient: {{client_name}} | Age/Sex: {{patient_age | default:"—"}}\nVitals: {{patient_vitals | default:"BP: 120/80 • Pulse: 72 bpm"}}';
    case 'invoice_meta':
      return 'Place of Supply: State Code {{doc.place_of_supply}}\nRef / PO #: {{po_number | default:"—"}}\nDate: {{doc.issue_date | date:"DD MMM YYYY"}}';
    case 'terms_notes':
      return 'Notes & Instructions:\n{{notes}}';
    default:
      return '{{client_name}}';
  }
}

export function getPartText(part: Partial<SlicedPart>, docType: DocType = 'tax_invoice'): string {
  if (typeof part.textTemplate === 'string') return part.textTemplate;
  if (typeof part.customText === 'string') return part.customText;
  return getDefaultTextForContent(part.content, docType);
}

export function getItemCompiledText(item: SectionItem): string {
  if (item.textMode === 'variable') {
    const key = (item.variableKey || 'custom_field').trim();
    const prefix = item.variablePrefix ?? '';
    const fallback = (item.variableValue ?? '—').replace(/"/g, "'");
    if (key.includes('.')) {
      return `${prefix}{{${key}}}`;
    }
    return `${prefix}{{${key} | default:"${fallback}"}}`;
  }
  return item.fixedText ?? '';
}

export function getPartItems(part: SlicedPart, docType: DocType = 'tax_invoice'): SectionItem[] {
  if (Array.isArray(part.items)) {
    return part.items;
  }
  const kind = getPartKind(part);
  if (kind === 'spacer') return [];

  if (kind === 'items_table') {
    return [
      {
        id: `${part.id}_tbl`,
        type: 'items_table',
        label: 'Items Table',
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        tableDesign: part.tableDesign ?? 'card',
        tableHeaderBg: part.tableHeaderBg ?? 'theme.primary',
        tableHeaderTextColor: part.tableHeaderTextColor ?? '#FFFFFF',
        tableBorderColor: part.tableBorderColor,
        tableStriped: part.tableStriped ?? true,
        tableStripeBg: part.tableStripeBg,
        tableFontSize: part.tableFontSize ?? 8.5,
        tableDensity: part.tableDensity ?? 'normal',
        tableShowSerial: part.tableShowSerial ?? true,
        tableColumns: part.tableColumns ?? DEFAULT_TABLE_COLUMNS,
      },
    ];
  }

  if (kind === 'image') {
    return [
      {
        id: `${part.id}_img`,
        type: 'image',
        label: part.imageSource === 'company_signature' ? 'Signature / Stamp' : 'Company Logo',
        x: 5,
        y: 5,
        w: 90,
        h: 90,
        imageSource: part.imageSource ?? 'company_logo',
        imageFit: part.imageFit ?? 'contain',
      },
    ];
  }

  if (kind === 'text') {
    const rawText = getPartText(part, docType);
    return [
      {
        id: `${part.id}_txt`,
        type: 'text',
        label: part.name || 'Text Field',
        x: 2,
        y: 4,
        w: 96,
        h: 92,
        textMode: 'fixed',
        fixedText: rawText,
        fontFamily: part.fontFamily ?? 'Inter',
        fontSize: part.fontSize ?? 9,
        fontWeight: part.fontWeight ?? 400,
        textAlign: part.textAlign ?? 'left',
        textColor: part.textColor,
        backgroundColor: part.backgroundColor,
        hasBorder: part.hasBorder,
        borderColor: part.borderColor,
        borderRadius: part.borderRadius,
      },
    ];
  }

  return [
    {
      id: `${part.id}_item`,
      type: kind as SectionItemType,
      label: part.name || kind,
      x: 2,
      y: 4,
      w: 96,
      h: 92,
      qrCaption: part.qrCaption,
      signatureCaption: part.signatureCaption,
    },
  ];
}

export function VariableTokenInserter({
  onInsertToken,
  customVariables = [],
  onAddCustomVariable,
}: {
  onInsertToken: (token: string) => void;
  customVariables?: Array<{ key: string; label: string }>;
  onAddCustomVariable?: (label: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newVarLabel, setNewVarLabel] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Deduplicate tokens by unique token string so React child keys are strictly unique
  const seenTokens = new Set<string>();
  const allVars: VariableTokenOption[] = [];
  for (const v of [
    ...SYSTEM_VARIABLES,
    ...(customVariables ?? []).map((cv) => ({
      token: `{{${cv.key}}}`,
      label: cv.label,
      desc: `Custom user variable {{${cv.key}}}`,
      category: 'custom' as const,
    })),
  ]) {
    if (!seenTokens.has(v.token)) {
      seenTokens.add(v.token);
      allVars.push(v);
    }
  }

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'company', label: '🏢 Company' },
    { id: 'doc', label: '📄 Document' },
    { id: 'client', label: '👤 Client' },
    { id: 'financials', label: '💰 Financials' },
    { id: 'custom', label: '🏷️ Custom' },
  ];

  const filtered = allVars.filter((v) => {
    if (selectedCategory !== 'all' && v.category !== selectedCategory) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.label.toLowerCase().includes(q) ||
      v.token.toLowerCase().includes(q) ||
      v.desc.toLowerCase().includes(q)
    );
  });

  return (
    <div className="rounded-xl border border-border bg-card/70 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-gold" />
          <span className="text-xs font-bold uppercase tracking-wider text-gold">
            Dynamic Variable Palette
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">Click variable to insert</span>
      </div>

      {/* Search and Category Filter */}
      <div className="space-y-1.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search variables (name, address, GSTIN, vitals, total...)"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-gold text-gold-foreground shadow-xs'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Variables Chip Grid */}
      <div className="max-h-[150px] overflow-y-auto pr-1 grid grid-cols-2 gap-1.5">
        {filtered.map((item) => (
          <button
            key={`${item.category}_${item.token}`}
            type="button"
            onClick={() => onInsertToken(item.token)}
            title={`${item.desc}\nClick to insert: ${item.token}`}
            className="group flex flex-col items-start rounded-lg border border-border/80 bg-background/50 hover:bg-gold-surface hover:border-gold/60 p-2 text-left transition-all cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-foreground group-hover:text-gold truncate">
                {item.label}
              </span>
              <Plus className="w-3 h-3 text-muted-foreground group-hover:text-gold shrink-0 ml-1" />
            </div>
            <code className="text-[9.5px] font-mono text-muted-foreground group-hover:text-gold/90 truncate w-full mt-0.5">
              {item.token}
            </code>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 py-3 text-center text-xs text-muted-foreground">
            No variables matching &ldquo;{search}&rdquo;
          </div>
        )}
      </div>

      {/* Inline Add Custom Variable Box */}
      {onAddCustomVariable ? (
        <div className="pt-2 border-t border-border">
          {!isAddingNew ? (
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Define New Custom Variable (e.g. Doctor Reg #, Vehicle No)</span>
            </button>
          ) : (
            <div className="space-y-1.5 bg-muted/30 p-2 rounded-lg border border-border">
              <div className="text-[11px] font-semibold text-foreground">
                Define & Attach New Custom Variable
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newVarLabel}
                  onChange={(e) => setNewVarLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newVarLabel.trim()) {
                        onAddCustomVariable(newVarLabel);
                        setNewVarLabel('');
                        setIsAddingNew(false);
                      }
                    }
                  }}
                  placeholder="e.g. Doctor Reg No, Vehicle Number"
                  className="flex-1 px-2.5 py-1 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-gold"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newVarLabel.trim()) {
                      onAddCustomVariable(newVarLabel);
                      setNewVarLabel('');
                      setIsAddingNew(false);
                    }
                  }}
                  className="px-2.5 py-1 text-xs font-bold rounded-md bg-gold text-gold-foreground cursor-pointer hover:opacity-90"
                >
                  Attach
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewVarLabel('');
                    setIsAddingNew(false);
                  }}
                  className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Variable will be attached and automatically asked in the document creation form!
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function TextStylingBar({
  fontFamily = 'Inter',
  onFontFamilyChange,
  fontSize = 9,
  onFontSizeChange,
  fontWeight = 400,
  onFontWeightChange,
  textAlign = 'left',
  onTextAlignChange,
  textColor,
  onTextColorChange,
  hasBorder,
  onHasBorderChange,
  borderColor,
  onBorderColorChange,
  backgroundColor,
  onBackgroundColorChange,
}: {
  fontFamily?: string;
  onFontFamilyChange?: (font: string) => void;
  fontSize?: number;
  onFontSizeChange: (size: number) => void;
  fontWeight?: 400 | 600 | 700;
  onFontWeightChange: (weight: 400 | 600 | 700) => void;
  textAlign?: 'left' | 'center' | 'right';
  onTextAlignChange: (align: 'left' | 'center' | 'right') => void;
  textColor?: string;
  onTextColorChange: (color?: string) => void;
  hasBorder?: boolean;
  onHasBorderChange: (hasBorder: boolean) => void;
  borderColor?: string;
  onBorderColorChange?: (color?: string) => void;
  backgroundColor?: string;
  onBackgroundColorChange: (bg?: string) => void;
}) {
  const [showCustomColor, setShowCustomColor] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-2.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gold flex items-center gap-1">
          <Palette className="w-3 h-3 text-gold" />
          <span>Figma-Style Text Typography & Colors</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Font Family Selector */}
        {onFontFamilyChange ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground font-medium">Font:</span>
            <select
              value={fontFamily || 'Inter'}
              onChange={(e) => onFontFamilyChange(e.target.value)}
              className="h-7 px-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-gold cursor-pointer"
            >
              <option value="Inter">Inter (Clean Modern Sans)</option>
              <option value="Helvetica">Helvetica (Standard Sans)</option>
              <option value="Times-Roman">Times (Classic Serif)</option>
              <option value="Courier">Courier (Monospace / Ledger)</option>
            </select>
          </div>
        ) : null}

        {/* Font Size & Weight */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">Size:</span>
          <select
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            className="h-7 px-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-gold cursor-pointer"
          >
            {[7, 7.5, 8, 8.5, 9, 9.5, 10, 11, 12, 14, 16, 18, 20, 24].map((s) => (
              <option key={s} value={s}>
                {s} pt
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onFontWeightChange(fontWeight === 700 ? 400 : 700)}
            title="Toggle Bold"
            className={`h-7 px-2 rounded-md border text-xs font-bold cursor-pointer transition-all ${
              fontWeight >= 600
                ? 'bg-gold text-gold-foreground border-gold'
                : 'bg-background text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center rounded-md border border-border bg-background p-0.5">
          <button
            type="button"
            onClick={() => onTextAlignChange('left')}
            title="Align Left"
            className={`p-1 rounded cursor-pointer ${
              textAlign === 'left' ? 'bg-gold/20 text-gold font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onTextAlignChange('center')}
            title="Align Center"
            className={`p-1 rounded cursor-pointer ${
              textAlign === 'center' ? 'bg-gold/20 text-gold font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onTextAlignChange('right')}
            title="Align Right"
            className={`p-1 rounded cursor-pointer ${
              textAlign === 'right' ? 'bg-gold/20 text-gold font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Color presets + Custom Color Picker */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">Color:</span>
          {[
            { id: undefined, label: 'Charcoal', bg: '#111827' },
            { id: 'theme.primary', label: 'Primary', bg: '#5B3FD9' },
            { id: '#0F766E', label: 'Teal Forest', bg: '#0F766E' },
            { id: '#B8892E', label: 'Gold', bg: '#B8892E' },
            { id: '#DC2626', label: 'Ruby', bg: '#DC2626' },
            { id: '#1E3A8A', label: 'Navy', bg: '#1E3A8A' },
            { id: 'theme.muted', label: 'Muted', bg: '#6B7280' },
          ].map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onTextColorChange(c.id)}
              title={c.label}
              style={{ backgroundColor: c.bg }}
              className={`w-4 h-4 rounded-full border cursor-pointer transition-transform ${
                textColor === c.id ? 'ring-2 ring-gold scale-110 border-white' : 'border-transparent opacity-80 hover:opacity-100'
              }`}
            />
          ))}

          {/* Native HTML5 Color Picker */}
          <label className="relative cursor-pointer flex items-center justify-center w-5 h-5 rounded-full border border-border bg-background text-[10px] hover:border-gold" title="Custom Hex Color">
            <span className="text-[9px] font-bold">🎨</span>
            <input
              type="color"
              value={textColor?.startsWith('#') ? textColor : '#5B3FD9'}
              onChange={(e) => onTextColorChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>
      </div>

      {/* Card Border & Light Background Pill Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(hasBorder)}
            onChange={(e) => {
              const checked = e.target.checked;
              onHasBorderChange(checked);
              if (checked && !backgroundColor) {
                onBackgroundColorChange('#F9FAFB');
              } else if (!checked && backgroundColor === '#F9FAFB') {
                onBackgroundColorChange(undefined);
              }
            }}
            className="rounded border-border text-gold focus:ring-gold"
          />
          <span className="text-muted-foreground text-[11px]">Enclose in Boxed Card (Border & Background)</span>
        </label>

        {hasBorder || backgroundColor ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Bg Tint:</span>
            {[
              { id: '#F9FAFB', label: 'Gray', bg: '#F9FAFB' },
              { id: '#F0F9FF', label: 'Sky', bg: '#F0F9FF' },
              { id: '#FEF3C7', label: 'Amber', bg: '#FEF3C7' },
              { id: '#F5F3FF', label: 'Lavender', bg: '#F5F3FF' },
              { id: '#ECFDF5', label: 'Mint', bg: '#ECFDF5' },
              { id: undefined, label: 'Clear', bg: 'transparent' },
            ].map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onBackgroundColorChange(t.id)}
                title={t.label}
                style={{ backgroundColor: t.bg }}
                className={`w-3.5 h-3.5 rounded-full border border-border cursor-pointer ${
                  backgroundColor === t.id ? 'ring-2 ring-gold' : 'opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TableStylingBar({
  tableDesign = 'card',
  onTableDesignChange,
  tableHeaderBg,
  onTableHeaderBgChange,
  tableHeaderTextColor,
  onTableHeaderTextColorChange,
  tableBorderColor,
  onTableBorderColorChange,
  tableStriped = true,
  onTableStripedChange,
  tableStripeBg,
  onTableStripeBgChange,
  tableFontSize = 8.5,
  onTableFontSizeChange,
  tableDensity = 'normal',
  onTableDensityChange,
  tableShowSerial = true,
  onTableShowSerialChange,
  columns = DEFAULT_TABLE_COLUMNS,
  onColumnsChange,
}: {
  tableDesign?: 'card' | 'horizontal_only' | 'grid' | 'invisible' | 'minimalist';
  onTableDesignChange: (design: 'card' | 'horizontal_only' | 'grid' | 'invisible' | 'minimalist') => void;
  tableHeaderBg?: string;
  onTableHeaderBgChange: (bg?: string) => void;
  tableHeaderTextColor?: string;
  onTableHeaderTextColorChange: (color?: string) => void;
  tableBorderColor?: string;
  onTableBorderColorChange?: (color?: string) => void;
  tableStriped?: boolean;
  onTableStripedChange: (striped: boolean) => void;
  tableStripeBg?: string;
  onTableStripeBgChange?: (bg?: string) => void;
  tableFontSize?: number;
  onTableFontSizeChange: (size: number) => void;
  tableDensity?: 'compact' | 'normal' | 'relaxed';
  onTableDensityChange: (density: 'compact' | 'normal' | 'relaxed') => void;
  tableShowSerial?: boolean;
  onTableShowSerialChange: (show: boolean) => void;
  columns?: SlicedTableColumn[];
  onColumnsChange?: (cols: SlicedTableColumn[]) => void;
}) {
  const [activeTab, setActiveTab] = useState<'design' | 'colors' | 'columns'>('design');
  const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null);

  const normalizedCols = useMemo(() => normalizeColumnsTo100(columns), [columns]);
  const enabledCols = normalizedCols.filter((c) => c.enabled !== false);
  const totalWidthPct = enabledCols.reduce((sum, c) => sum + (c.width || 0), 0);

  const COLOR_PALETTE = [
    'bg-emerald-500',
    'bg-sky-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-teal-500',
    'bg-indigo-500',
  ];

  const handleColumnWidthSlider = (targetId: string, newWidthVal: number) => {
    if (!onColumnsChange) return;
    const currentEnabled = normalizedCols.filter((c) => c.enabled !== false);
    const targetCol = currentEnabled.find((c) => c.id === targetId);
    if (!targetCol || currentEnabled.length <= 1) return;

    const otherCols = currentEnabled.filter((c) => c.id !== targetId);
    const MIN_W = 5;
    const maxAllowed = 100 - otherCols.length * MIN_W;
    const clampedTarget = Math.max(MIN_W, Math.min(maxAllowed, Math.round(newWidthVal)));
    const delta = clampedTarget - targetCol.width;
    if (delta === 0) return;

    const sumOtherCurrent = otherCols.reduce((sum, c) => sum + c.width, 0);

    let newOtherCols = otherCols.map((col) => {
      const proportion = sumOtherCurrent > 0 ? col.width / sumOtherCurrent : 1 / otherCols.length;
      const rawNew = col.width - delta * proportion;
      const clamped = Math.max(MIN_W, Math.round(rawNew));
      return { ...col, width: clamped };
    });

    const currentTotal = clampedTarget + newOtherCols.reduce((sum, c) => sum + c.width, 0);
    const residual = 100 - currentTotal;
    if (residual !== 0 && newOtherCols.length > 0) {
      let maxIdx = 0;
      for (let i = 1; i < newOtherCols.length; i++) {
        if (newOtherCols[i].width > newOtherCols[maxIdx].width) {
          maxIdx = i;
        }
      }
      newOtherCols[maxIdx].width = Math.max(MIN_W, newOtherCols[maxIdx].width + residual);
    }

    const finalCols = columns.map((col) => {
      if (col.id === targetId) {
        return { ...col, width: clampedTarget };
      }
      const updatedOther = newOtherCols.find((oc) => oc.id === col.id);
      if (updatedOther) {
        return updatedOther;
      }
      return col;
    });

    onColumnsChange(finalCols);
  };

  const handleResetEqualWidths = () => {
    if (!onColumnsChange) return;
    const currentEnabled = columns.filter((c) => c.enabled !== false);
    if (currentEnabled.length === 0) return;
    const count = currentEnabled.length;
    const base = Math.floor(100 / count);
    let remainder = 100 - base * count;

    const updatedEnabled = currentEnabled.map((c, i) => {
      const extra = i < remainder ? 1 : 0;
      return { ...c, width: base + extra };
    });

    const next = columns.map((col) => {
      const match = updatedEnabled.find((u) => u.id === col.id);
      return match ? match : col;
    });
    onColumnsChange(next);
  };

  const handleMoveColumn = (fromIdx: number, toIdx: number) => {
    if (!onColumnsChange || fromIdx < 0 || toIdx < 0 || toIdx >= columns.length) return;
    const next = [...columns];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onColumnsChange(next);
  };

  const handleAddColumn = () => {
    if (!onColumnsChange) return;
    const newCol: SlicedTableColumn = {
      id: `col_${Date.now()}`,
      header: 'New Column',
      value: '{{custom}}',
      width: 10,
      align: 'left',
      enabled: true,
    };
    onColumnsChange(normalizeColumnsTo100([...columns, newCol]));
  };

  const handleDeleteColumn = (colId: string) => {
    if (!onColumnsChange || columns.length <= 1) return;
    const next = columns.filter((c) => c.id !== colId);
    onColumnsChange(normalizeColumnsTo100(next));
  };

  const DESIGN_OPTIONS: Array<{
    id: 'card' | 'horizontal_only' | 'grid' | 'invisible' | 'minimalist';
    title: string;
    badge: string;
    desc: string;
    icon: string;
  }> = [
    {
      id: 'invisible',
      title: 'Invisible Lines',
      badge: 'Borderless',
      desc: 'Zero borders, clean modern open whitespace with elegant typography',
      icon: '◻️',
    },
    {
      id: 'horizontal_only',
      title: 'Horizontal Lines',
      badge: 'Classic Ledger',
      desc: 'Clean row divider lines and header underline only, no vertical lines',
      icon: '📄',
    },
    {
      id: 'grid',
      title: 'Full Boxed Grid',
      badge: 'Matrix Grid',
      desc: 'Horizontal and vertical grid lines dividing all columns and cells',
      icon: '⊞',
    },
    {
      id: 'card',
      title: 'Rounded Card Box',
      badge: 'Card Box',
      desc: 'Rounded outer border with subtle divider lines and shaded header',
      icon: '🔲',
    },
    {
      id: 'minimalist',
      title: 'Minimalist Underline',
      badge: 'Header Accent',
      desc: 'Bold accent line under header, borderless rows for maximum clarity',
      icon: '➖',
    },
  ];

  const HEADER_COLOR_PRESETS = [
    { id: 'theme.primary', label: 'Brand Violet', bg: '#5B3FD9', text: '#FFFFFF' },
    { id: '#111827', label: 'Obsidian Charcoal', bg: '#111827', text: '#FFFFFF' },
    { id: '#0F766E', label: 'Teal Forest', bg: '#0F766E', text: '#FFFFFF' },
    { id: '#B8892E', label: 'Champagne Gold', bg: '#B8892E', text: '#111827' },
    { id: '#DC2626', label: 'Crimson Ruby', bg: '#DC2626', text: '#FFFFFF' },
    { id: '#1E3A8A', label: 'Midnight Navy', bg: '#1E3A8A', text: '#FFFFFF' },
    { id: '#475569', label: 'Slate Gray', bg: '#475569', text: '#FFFFFF' },
    { id: 'transparent', label: 'Transparent Clean', bg: '#FFFFFF', text: '#111827' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card/70 p-3 space-y-3">
      {/* Sub-Header Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Table Architecture & Visual Styles
          </span>
        </div>
        <div className="flex items-center gap-1">
          {[
            { id: 'design' as const, label: 'Line Design' },
            { id: 'colors' as const, label: 'Header & Colors' },
            { id: 'columns' as const, label: 'Columns & Density' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: LINE & BORDER DESIGN */}
      {activeTab === 'design' ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Choose Table Line Design</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              Selected: {DESIGN_OPTIONS.find((d) => d.id === tableDesign)?.badge}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DESIGN_OPTIONS.map((opt) => {
              const active = tableDesign === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onTableDesignChange(opt.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                    active
                      ? 'border-emerald-400 bg-emerald-500/20 text-foreground ring-2 ring-emerald-400/30 shadow-xs'
                      : 'border-border bg-muted/20 text-muted-foreground hover:text-foreground hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <span>{opt.icon}</span>
                      <span>{opt.title}</span>
                    </span>
                    <span className="text-[9.5px] uppercase font-mono px-1.5 py-0.5 rounded bg-background/50 border border-border">
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                    {opt.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* TAB 2: TABLE HEADER COLOR SCHEME & STRIPING */}
      {activeTab === 'colors' ? (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-foreground">Header Background Color</span>
              <span className="text-[10px] text-muted-foreground">Pick a swatch or custom hex</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {HEADER_COLOR_PRESETS.map((p, idx) => {
                const active = tableHeaderBg === p.id || (!tableHeaderBg && p.id === 'theme.primary');
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onTableHeaderBgChange(p.id);
                      if (p.text) onTableHeaderTextColorChange?.(p.text);
                    }}
                    title={p.label}
                    className={`h-7 rounded-lg border flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer ${
                      active ? 'ring-2 ring-gold scale-105 border-white' : 'border-border/70 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: p.bg === 'transparent' ? '#FFFFFF' : p.bg, color: p.text }}
                  >
                    {active ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Hex Color Inputs */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
            <div>
              <span className="text-[11px] text-muted-foreground block mb-1">Custom Header Bg:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={tableHeaderBg?.startsWith('#') ? tableHeaderBg : '#5B3FD9'}
                  onChange={(e) => onTableHeaderBgChange(e.target.value)}
                  className="w-7 h-7 rounded border border-border cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={tableHeaderBg || ''}
                  onChange={(e) => onTableHeaderBgChange(e.target.value)}
                  placeholder="e.g. #5B3FD9"
                  className="flex-1 px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-gold"
                />
              </div>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground block mb-1">Header Text Color:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={tableHeaderTextColor?.startsWith('#') ? tableHeaderTextColor : '#FFFFFF'}
                  onChange={(e) => onTableHeaderTextColorChange?.(e.target.value)}
                  className="w-7 h-7 rounded border border-border cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={tableHeaderTextColor || ''}
                  onChange={(e) => onTableHeaderTextColorChange?.(e.target.value)}
                  placeholder="e.g. #FFFFFF"
                  className="flex-1 px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-gold"
                />
              </div>
            </div>
          </div>

          {/* Zebra Striping Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tableStriped}
                onChange={(e) => onTableStripedChange(e.target.checked)}
                className="rounded border-border text-emerald-400 focus:ring-emerald-400"
              />
              <span className="text-foreground text-[11px] font-medium">Alternating Row Zebra Stripes</span>
            </label>
            {tableStriped && onTableStripeBgChange ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Tint:</span>
                <input
                  type="color"
                  value={tableStripeBg?.startsWith('#') ? tableStripeBg : '#FAFAFA'}
                  onChange={(e) => onTableStripeBgChange(e.target.value)}
                  className="w-5 h-5 rounded border border-border cursor-pointer p-0"
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* TAB 3: COLUMNS & DENSITY */}
      {activeTab === 'columns' ? (
        <div className="space-y-3.5">
          {/* Density & Font Size */}
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-border/50">
            <div>
              <span className="text-[11px] text-muted-foreground block mb-1">Row Density:</span>
              <div className="flex rounded-md border border-border bg-background p-0.5">
                {[
                  { id: 'compact' as const, label: 'Compact' },
                  { id: 'normal' as const, label: 'Normal' },
                  { id: 'relaxed' as const, label: 'Spacious' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onTableDensityChange(d.id)}
                    className={`flex-1 py-1 text-[10px] font-semibold rounded cursor-pointer ${
                      tableDensity === d.id ? 'bg-emerald-500/25 text-emerald-300 font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground block mb-1">Font Size:</span>
              <select
                value={tableFontSize}
                onChange={(e) => onTableFontSizeChange(Number(e.target.value))}
                className="w-full h-7 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
              >
                {[7, 7.5, 8, 8.5, 9, 9.5, 10, 11].map((s) => (
                  <option key={s} value={s}>
                    {s} pt
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 100% Visual Proportion Segment Bar */}
          <div className="space-y-1.5 bg-muted/20 p-2.5 rounded-xl border border-border/60">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <span>100% Width Allocation:</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                  Total: {totalWidthPct}% {totalWidthPct === 100 ? '✓' : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetEqualWidths}
                className="text-[10px] font-semibold text-gold hover:underline cursor-pointer"
              >
                Reset Equal Widths
              </button>
            </div>

            {/* Segmented Bar */}
            <div className="w-full h-4 rounded-lg overflow-hidden flex bg-slate-900 border border-border/80">
              {enabledCols.map((col, cIdx) => (
                <div
                  key={col.id}
                  style={{ width: `${col.width}%` }}
                  title={`${col.header}: ${col.width}%`}
                  className={`${COLOR_PALETTE[cIdx % COLOR_PALETTE.length]} h-full transition-all flex items-center justify-center text-[8.5px] font-mono text-white font-bold truncate px-0.5`}
                >
                  {col.width >= 10 ? `${col.width}%` : ''}
                </div>
              ))}
            </div>

            {/* Legend Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {enabledCols.map((col, cIdx) => (
                <div key={col.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className={`w-2 h-2 rounded-full ${COLOR_PALETTE[cIdx % COLOR_PALETTE.length]}`} />
                  <span className="font-medium text-foreground truncate max-w-[95px]">{col.header || 'Column'}</span>
                  <span className="font-mono text-xs font-bold text-foreground">({col.width}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Columns Configurator Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <div className="flex items-center gap-1.5">
                <span>Columns Reorder & Sliders</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  (Drag <GripVertical className="w-3 h-3 inline text-muted-foreground" /> to reorder)
                </span>
              </div>
              <label className="flex items-center gap-1 cursor-pointer text-[10px] text-muted-foreground font-normal">
                <input
                  type="checkbox"
                  checked={tableShowSerial}
                  onChange={(e) => onTableShowSerialChange(e.target.checked)}
                  className="rounded border-border text-emerald-400 focus:ring-emerald-400"
                />
                <span>Include Serial # Column</span>
              </label>
            </div>

            {/* Reorderable Column Cards */}
            <div className="space-y-2">
              {columns.map((col, idx) => {
                const isEnabled = col.enabled !== false;
                const enabledIdx = enabledCols.findIndex((c) => c.id === col.id);
                const colorClass = enabledIdx >= 0 ? COLOR_PALETTE[enabledIdx % COLOR_PALETTE.length] : 'bg-muted';

                return (
                  <div
                    key={col.id}
                    draggable={true}
                    onDragStart={(e) => {
                      setDraggedColIdx(idx);
                      e.dataTransfer.setData('text/plain', String(idx));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIdx = draggedColIdx ?? Number(e.dataTransfer.getData('text/plain'));
                      if (!isNaN(fromIdx) && fromIdx !== idx) {
                        handleMoveColumn(fromIdx, idx);
                      }
                      setDraggedColIdx(null);
                    }}
                    className={`p-2 rounded-xl border transition-all ${
                      draggedColIdx === idx
                        ? 'border-gold bg-gold/15 shadow-md'
                        : isEnabled
                        ? 'border-border/80 bg-muted/20 hover:border-border'
                        : 'border-border/40 bg-muted/10 opacity-60'
                    }`}
                  >
                    {/* Row 1: Drag handle, Order arrows, Enabled checkbox, Header input, Align, Delete */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted/50"
                        title="Drag to reorder column"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Order arrow buttons */}
                      <div className="flex flex-col -space-y-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveColumn(idx, idx - 1)}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer p-0 leading-none"
                          title="Move column up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === columns.length - 1}
                          onClick={() => handleMoveColumn(idx, idx + 1)}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer p-0 leading-none"
                          title="Move column down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      <div className={`w-2 h-2 rounded-full ${colorClass} shrink-0`} />

                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          if (!onColumnsChange) return;
                          const next = [...columns];
                          next[idx] = { ...col, enabled: e.target.checked };
                          onColumnsChange(normalizeColumnsTo100(next));
                        }}
                        title={isEnabled ? 'Column enabled' : 'Column disabled'}
                        className="rounded border-border text-emerald-400 focus:ring-emerald-400"
                      />

                      <input
                        type="text"
                        value={col.header}
                        onChange={(e) => {
                          if (!onColumnsChange) return;
                          const next = [...columns];
                          next[idx] = { ...col, header: e.target.value };
                          onColumnsChange(next);
                        }}
                        placeholder="Header Title"
                        className="flex-1 px-2 py-0.5 text-xs rounded border border-border bg-background font-medium focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />

                      <select
                        value={col.align}
                        onChange={(e) => {
                          if (!onColumnsChange) return;
                          const next = [...columns];
                          next[idx] = { ...col, align: e.target.value as 'left' | 'center' | 'right' };
                          onColumnsChange(next);
                        }}
                        className="h-6 px-1.5 text-[10px] rounded border border-border bg-background focus:outline-none cursor-pointer"
                        title="Text alignment"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>

                      {columns.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteColumn(col.id)}
                          className="w-5 h-5 rounded hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 flex items-center justify-center cursor-pointer text-xs"
                          title="Delete column"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>

                    {/* Row 2: 100% Width Auto-Balancing Slider (only shown when enabled) */}
                    {isEnabled ? (
                      <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center gap-2 text-xs">
                        <span className="text-[10px] text-muted-foreground font-mono w-12 shrink-0">
                          Width:
                        </span>
                        <input
                          type="range"
                          min={5}
                          max={80}
                          step={1}
                          value={col.width}
                          onChange={(e) => handleColumnWidthSlider(col.id, Number(e.target.value))}
                          className="flex-1 accent-emerald-400 h-1.5 cursor-pointer bg-slate-800 rounded-lg"
                        />
                        <span className="text-[11px] font-mono font-bold text-emerald-400 w-11 text-right shrink-0">
                          {col.width}%
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddColumn}
              className="w-full text-xs h-7 border-dashed border-border hover:border-emerald-400 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              + Add Custom Column
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const GRID_COLS = 12;
const GRID_ROWS = 12;

/**
 * Cleanly trims or splits existing parts when a new rectangle [c1..c2, r1..r2] is painted over them.
 * Never shifts or corrupts unrelated parts, and preserves the non-overlapping remainder of partially overlapped parts.
 */
function carveOutOverlappingParts(
  existing: SlicedPart[],
  c1: number,
  c2: number,
  r1: number,
  r2: number
): SlicedPart[] {
  const result: SlicedPart[] = [];

  for (const p of existing) {
    const horizOverlap = p.colStart <= c2 && p.colEnd >= c1;
    const vertOverlap = p.rowStart <= r2 && p.rowEnd >= r1;

    if (!horizOverlap || !vertOverlap) {
      // Completely disjoint — keep untouched!
      result.push(p);
      continue;
    }

    // If the new selection completely covers `p`, drop `p`
    if (c1 <= p.colStart && c2 >= p.colEnd && r1 <= p.rowStart && r2 >= p.rowEnd) {
      continue;
    }

    // Trim `p` along whichever edge leaves the largest clean rectangle remainder
    const candidates: Array<{ colStart: number; colEnd: number; rowStart: number; rowEnd: number }> = [];
    if (p.rowStart < r1) {
      candidates.push({
        colStart: p.colStart,
        colEnd: p.colEnd,
        rowStart: p.rowStart,
        rowEnd: r1 - 1,
      });
    }
    if (p.rowEnd > r2) {
      candidates.push({
        colStart: p.colStart,
        colEnd: p.colEnd,
        rowStart: r2 + 1,
        rowEnd: p.rowEnd,
      });
    }
    if (p.colStart < c1) {
      candidates.push({
        colStart: p.colStart,
        colEnd: c1 - 1,
        rowStart: Math.max(p.rowStart, r1),
        rowEnd: Math.min(p.rowEnd, r2),
      });
    }
    if (p.colEnd > c2) {
      candidates.push({
        colStart: c2 + 1,
        colEnd: p.colEnd,
        rowStart: Math.max(p.rowStart, r1),
        rowEnd: Math.min(p.rowEnd, r2),
      });
    }

    if (candidates.length >= 1) {
      candidates.sort(
        (a, b) =>
          (b.colEnd - b.colStart + 1) * (b.rowEnd - b.rowStart + 1) -
          (a.colEnd - a.colStart + 1) * (a.rowEnd - a.rowStart + 1)
      );
      result.push({ ...p, ...candidates[0]! });
    }
  }

  return result;
}

const DEFAULT_PAGE1_PARTS: SlicedPart[] = [
  {
    id: 'part_1',
    name: 'Section 1 (Top Left Header)',
    colStart: 0,
    colEnd: 5,
    rowStart: 0,
    rowEnd: 1,
    mode: 'fixed',
    kind: 'text',
    items: [],
  },
  {
    id: 'part_2',
    name: 'Section 2 (Top Right Header)',
    colStart: 6,
    colEnd: 11,
    rowStart: 0,
    rowEnd: 1,
    mode: 'fixed',
    kind: 'text',
    items: [],
  },
  {
    id: 'part_3',
    name: 'Section 3 (Middle Left)',
    colStart: 0,
    colEnd: 5,
    rowStart: 2,
    rowEnd: 3,
    mode: 'fixed',
    kind: 'text',
    items: [],
  },
  {
    id: 'part_4',
    name: 'Section 4 (Middle Right)',
    colStart: 6,
    colEnd: 11,
    rowStart: 2,
    rowEnd: 3,
    mode: 'fixed',
    kind: 'text',
    items: [],
  },
  {
    id: 'part_5',
    name: 'Section 5 (Body & Tables Area)',
    colStart: 0,
    colEnd: 11,
    rowStart: 4,
    rowEnd: 8,
    mode: 'variable',
    kind: 'text',
    items: [],
  },
  {
    id: 'part_6',
    name: 'Section 6 (Bottom Footer)',
    colStart: 0,
    colEnd: 11,
    rowStart: 9,
    rowEnd: 11,
    mode: 'fixed',
    kind: 'text',
    items: [],
  },
];

const DEFAULT_PAGE2_CONTINUATION_PARTS: SlicedPart[] = [
  {
    id: 'p2_part_1',
    name: 'Page 2+ Compact Header Bar',
    colStart: 0,
    colEnd: 7,
    rowStart: 0,
    rowEnd: 1,
    mode: 'fixed',
    kind: 'text',
    textTemplate: '',
    items: [],
  },
  {
    id: 'p2_part_2',
    name: 'Page 2+ Continuation Meta',
    colStart: 8,
    colEnd: 11,
    rowStart: 0,
    rowEnd: 1,
    mode: 'fixed',
    kind: 'text',
    textTemplate: '',
    items: [],
  },
  {
    id: 'p2_part_3',
    name: 'Page 2+ Continuing Flexible Area',
    colStart: 0,
    colEnd: 11,
    rowStart: 2,
    rowEnd: 10,
    mode: 'variable',
    kind: 'text',
    textTemplate: '',
    items: [],
  },
  {
    id: 'p2_part_4',
    name: 'Page 2+ Fixed Footer Area',
    colStart: 0,
    colEnd: 11,
    rowStart: 11,
    rowEnd: 11,
    mode: 'fixed',
    kind: 'text',
    textTemplate: '',
    items: [],
  },
];

export function CreateTemplateWizardPage() {
  const navigate = useNavigate();
  const { activeCompany } = useAppStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templateName, setTemplateName] = useState('My Custom GST Invoice');
  const [docType, setDocType] = useState<DocType>('tax_invoice');
  const [sizeId, setSizeId] = useState<CommonSizeId>('A4');

  // Continuation Page Mode:
  // - 'repeat_page_1': Page 1 Fixed sections repeat on Page 2, Page 3+, while Variable data continues.
  // - 'custom_page_2': User designs Page 1 AND a dedicated Page 2+ Continuation template (which also repeats on Page 3+).
  const [continuationMode, setContinuationMode] = useState<'repeat_page_1' | 'custom_page_2'>(
    'repeat_page_1'
  );
  const [editingPage, setEditingPage] = useState<'page1' | 'page2'>('page1');

  const [page1Parts, setPage1Parts] = useState<SlicedPart[]>(DEFAULT_PAGE1_PARTS);
  const [page2Parts, setPage2Parts] = useState<SlicedPart[]>(DEFAULT_PAGE2_CONTINUATION_PARTS);

  const [activePage1PartId, setActivePage1PartId] = useState<string>('part_1');
  const [activePage2PartId, setActivePage2PartId] = useState<string>('p2_part_1');

  // Selected Individual Item inside the Active Layout Section (starts plain/empty)
  const [activeItemId, setActiveItemId] = useState<string>('');

  // Custom User-Defined Variables created on the fly
  const [customVariables, setCustomVariables] = useState<Array<{ key: string; label: string }>>([
    { key: 'patient_age', label: 'Age / Gender' },
    { key: 'patient_vitals', label: 'Medical Vitals' },
    { key: 'doctor_reg_no', label: 'Doctor Reg. No.' },
    { key: 'vehicle_no', label: 'Vehicle / Delivery #' },
    { key: 'po_number', label: 'PO / Ref Number' },
    { key: 'department', label: 'Department / Unit' },
  ]);

  const [dragHoverPartId, setDragHoverPartId] = useState<string | null>(null);

  const partTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sectionCanvasRef = useRef<HTMLDivElement | null>(null);
  const customImageInputRef = useRef<HTMLInputElement | null>(null);

  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [companySignatureUrl, setCompanySignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCompanyAssets() {
      if (!activeCompany) return;
      if (activeCompany.logo_asset_id) {
        try {
          const asset = await db.assets.get(activeCompany.logo_asset_id);
          if (asset?.blob && !cancelled) {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (!cancelled && typeof reader.result === 'string') {
                setCompanyLogoUrl(reader.result);
              }
            };
            reader.readAsDataURL(asset.blob);
          }
        } catch (e) {
          console.warn('Failed to load logo asset:', e);
        }
      }
      if (activeCompany.signature_asset_id) {
        try {
          const asset = await db.assets.get(activeCompany.signature_asset_id);
          if (asset?.blob && !cancelled) {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (!cancelled && typeof reader.result === 'string') {
                setCompanySignatureUrl(reader.result);
              }
            };
            reader.readAsDataURL(asset.blob);
          }
        } catch (e) {
          console.warn('Failed to load signature asset:', e);
        }
      }
    }
    loadCompanyAssets();
    return () => {
      cancelled = true;
    };
  }, [activeCompany]);

  const isEditingPage2 = continuationMode === 'custom_page_2' && editingPage === 'page2';
  const parts = isEditingPage2 ? page2Parts : page1Parts;
  const setParts: React.Dispatch<React.SetStateAction<SlicedPart[]>> = isEditingPage2
    ? setPage2Parts
    : setPage1Parts;
  const activePartId = isEditingPage2 ? activePage2PartId : activePage1PartId;
  const setActivePartId = isEditingPage2 ? setActivePage2PartId : setActivePage1PartId;

  const activePart = parts.find((p) => p.id === activePartId) ?? parts[0];
  const activePartItems = activePart ? getPartItems(activePart, docType) : [];
  const activeItem =
    activePartItems.find((it) => it.id === activeItemId) ?? activePartItems[0] ?? null;

  // Keep activeItemId in sync when switching activePart
  useEffect(() => {
    if (!activePart) return;
    const items = getPartItems(activePart, docType);
    if (items.length > 0 && !items.some((it) => it.id === activeItemId)) {
      setActiveItemId(items[0]!.id);
    }
  }, [activePart?.id, editingPage]);

  const updateActivePart = (updater: (p: SlicedPart) => SlicedPart) => {
    if (!activePart) return;
    setParts((prev) => prev.map((p) => (p.id === activePart.id ? updater(p) : p)));
  };

  const updatePartItems = (partId: string, updater: (items: SectionItem[]) => SectionItem[]) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id !== partId) return p;
        const current = getPartItems(p, docType);
        const nextItems = updater(current);
        return {
          ...p,
          items: nextItems,
        };
      })
    );
  };

  const updateActiveItem = (updater: (item: SectionItem) => SectionItem) => {
    if (!activePart || !activeItem) return;
    updatePartItems(activePart.id, (items) =>
      items.map((it) => (it.id === activeItem.id ? updater(it) : it))
    );
  };

  const handleInsertToken = (token: string) => {
    if (!activePart || !activeItem) return;
    const currentText =
      activeItem.textMode === 'variable'
        ? activeItem.variableValue ?? ''
        : activeItem.fixedText ?? getItemCompiledText(activeItem);
    const el = partTextareaRef.current;
    if (!el) {
      updateActiveItem((it) => ({
        ...it,
        type: 'text',
        textMode: 'fixed',
        fixedText: currentText ? `${currentText} ${token}` : token,
      }));
      return;
    }
    const start = el.selectionStart ?? currentText.length;
    const end = el.selectionEnd ?? currentText.length;
    const nextText = currentText.substring(0, start) + token + currentText.substring(end);
    updateActiveItem((it) => ({
      ...it,
      type: 'text',
      textMode: 'fixed',
      fixedText: nextText,
    }));
    requestAnimationFrame(() => {
      el.focus();
      const nextPos = start + token.length;
      el.setSelectionRange(nextPos, nextPos);
    });
  };

  const handleAddCustomVariable = (label: string) => {
    if (!label.trim()) return;
    const key = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!key) return;
    if (!customVariables.some((v) => v.key === key)) {
      setCustomVariables((prev) => [...prev, { key, label: label.trim() }]);
    }
    if (activeItem && activeItem.type === 'text' && activeItem.textMode === 'variable') {
      updateActiveItem((it) => ({
        ...it,
        variableKey: key,
        variableLabel: label.trim(),
      }));
    } else {
      handleInsertToken(`{{${key}}}`);
    }
    toast.success(`Defined & attached variable {{${key}}}`);
  };

  // Live Blueprint PDF Preview in Wizard
  const [wizardPreviewUrl, setWizardPreviewUrl] = useState<string | null>(null);
  const [isWizardCompiling, setIsWizardCompiling] = useState(false);
  const [isWizardPreviewOpen, setIsWizardPreviewOpen] = useState(false);
  const wizardPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (wizardPreviewUrlRef.current) {
        URL.revokeObjectURL(wizardPreviewUrlRef.current);
        wizardPreviewUrlRef.current = null;
      }
    };
  }, []);

  // Section-Internal Freeform Item Drag & Resize State (0..100% coordinates inside active section)
  const [itemDrag, setItemDrag] = useState<{
    partId: string;
    itemId: string;
    mode: 'move' | 'resize';
    startClientX: number;
    startClientY: number;
    containerWidth: number;
    containerHeight: number;
    orig: { x: number; y: number; w: number; h: number };
  } | null>(null);

  // Figma-Style Context Menu for Individual Items inside a Section
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    partId: string;
    itemId: string;
  } | null>(null);

  // Global pointermove / pointerup listeners for smooth Section-Internal Item dragging & resizing
  useEffect(() => {
    if (!itemDrag) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      const dxPct = ((e.clientX - itemDrag.startClientX) / Math.max(1, itemDrag.containerWidth)) * 100;
      const dyPct = ((e.clientY - itemDrag.startClientY) / Math.max(1, itemDrag.containerHeight)) * 100;

      updatePartItems(itemDrag.partId, (items) =>
        items.map((it) => {
          if (it.id !== itemDrag.itemId) return it;
          if (itemDrag.mode === 'move') {
            let nextX = Math.round(Math.max(0, Math.min(100 - itemDrag.orig.w, itemDrag.orig.x + dxPct)));
            let nextY = Math.round(Math.max(0, Math.min(100 - itemDrag.orig.h, itemDrag.orig.y + dyPct)));
            // Edge snapping: snap snugly to 0% or bottom/right boundary when within 4%
            if (nextX <= 4) nextX = 0;
            if (nextX + itemDrag.orig.w >= 96) nextX = 100 - itemDrag.orig.w;
            if (nextY <= 4) nextY = 0;
            if (nextY + itemDrag.orig.h >= 96) nextY = 100 - itemDrag.orig.h;
            return { ...it, x: nextX, y: nextY };
          } else {
            let nextW = Math.round(Math.max(4, Math.min(100 - itemDrag.orig.x, itemDrag.orig.w + dxPct)));
            let nextH = Math.round(Math.max(4, Math.min(100 - itemDrag.orig.y, itemDrag.orig.h + dyPct)));
            if (itemDrag.orig.x + nextW >= 96) nextW = 100 - itemDrag.orig.x;
            if (itemDrag.orig.y + nextH >= 96) nextH = 100 - itemDrag.orig.y;
            return { ...it, w: nextW, h: nextH };
          }
        })
      );
    };

    const handleWindowPointerUp = () => {
      setItemDrag(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [itemDrag, docType, isEditingPage2]);

  // Mathematical Pointer Drag state on the 12x12 Blueprint Board (Step 2 Slicing Only)
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [dragStart, setDragStart] = useState<{ c: number; r: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ c: number; r: number } | null>(null);
  const [hasDraggedAcrossCells, setHasDraggedAcrossCells] = useState(false);

  const selectedSize = COMMON_PAGE_SIZES.find((s) => s.id === sizeId) ?? COMMON_PAGE_SIZES[0]!;

  /**
   * Computes exact 0..11 (col, row) coordinates from pointer clientX/clientY
   * relative to the Blueprint Board bounding box. Works in ALL directions (left, right, up, down)
   * with both Mouse and Touch!
   */
  const getCellFromClientXY = (clientX: number, clientY: number): { c: number; r: number } | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const relX = Math.max(0, Math.min(0.9999, (clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(0.9999, (clientY - rect.top) / rect.height));
    return {
      c: Math.floor(relX * GRID_COLS),
      r: Math.floor(relY * GRID_ROWS),
    };
  };

  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-part-delete="true"]')) {
      return;
    }
    const cell = getCellFromClientXY(e.clientX, e.clientY);
    if (!cell) return;

    // In Step 3, layout sections are LOCKED in their grid positions. Clicking selects the section.
    if (step === 3) {
      const hit = [...parts]
        .reverse()
        .find(
          (p) =>
            cell.c >= p.colStart &&
            cell.c <= p.colEnd &&
            cell.r >= p.rowStart &&
            cell.r <= p.rowEnd
        );
      if (hit) setActivePartId(hit.id);
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unavailable
    }
    setDragStart(cell);
    setDragCurrent(cell);
    setHasDraggedAcrossCells(false);
  };

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart || step !== 2) return;
    const cell = getCellFromClientXY(e.clientX, e.clientY);
    if (!cell) return;
    if (cell.c !== dragStart.c || cell.r !== dragStart.r) {
      setHasDraggedAcrossCells(true);
    }
    if (!dragCurrent || cell.c !== dragCurrent.c || cell.r !== dragCurrent.r) {
      setDragCurrent(cell);
    }
  };

  const finishDragSelection = () => {
    if (!dragStart || !dragCurrent) return;
    const c1 = Math.min(dragStart.c, dragCurrent.c);
    const c2 = Math.max(dragStart.c, dragCurrent.c);
    const r1 = Math.min(dragStart.r, dragCurrent.r);
    const r2 = Math.max(dragStart.r, dragCurrent.r);

    const wasSingleCellTap = !hasDraggedAcrossCells && c1 === c2 && r1 === r2;
    setDragStart(null);
    setDragCurrent(null);
    setHasDraggedAcrossCells(false);

    // If user simply clicked/tapped a single cell that already belongs to an existing part,
    // select that part so they can inspect/edit it without accidentally destroying it!
    if (wasSingleCellTap) {
      const existingAtCell = [...parts]
        .reverse()
        .find((p) => c1 >= p.colStart && c1 <= p.colEnd && r1 >= p.rowStart && r1 <= p.rowEnd);
      if (existingAtCell) {
        setActivePartId(existingAtCell.id);
        return;
      }
    }

    const carved = carveOutOverlappingParts(parts, c1, c2, r1, r2);
    const newPartId = `part_${Date.now().toString().slice(-4)}_${Math.floor(Math.random() * 90 + 10)}`;
    const newPart: SlicedPart = {
      id: newPartId,
      name: `${isEditingPage2 ? 'Page 2+ ' : ''}Section ${carved.length + 1}`,
      colStart: c1,
      colEnd: c2,
      rowStart: r1,
      rowEnd: r2,
      mode: 'fixed',
      kind: 'text',
      textTemplate: '',
      items: [],
      fontSize: 9,
      fontWeight: 400,
      textAlign: 'left',
      tableDesign: 'card',
      tableHeaderBg: 'theme.primary',
      tableHeaderTextColor: '#FFFFFF',
      tableBorderColor: '#E5E7EB',
      tableStriped: true,
      tableFontSize: 8.5,
      tableDensity: 'normal',
      tableShowSerial: true,
      tableColumns: DEFAULT_TABLE_COLUMNS,
    };

    const next = [...carved, newPart];
    setParts(next);
    setActivePartId(newPartId);
    setActiveItemId('');
  };

  const handleSplitHorizontally = (partId: string) => {
    const p = parts.find((x) => x.id === partId);
    if (!p) return;
    if (p.rowEnd - p.rowStart < 1) {
      toast.info('Section must be at least 2 grid rows high to split horizontally');
      return;
    }
    const midRow = Math.floor((p.rowStart + p.rowEnd) / 2);
    const pA: SlicedPart = {
      ...p,
      name: `${p.name} (Top)`,
      rowEnd: midRow,
    };
    const pB: SlicedPart = {
      ...p,
      id: `part_${Date.now()}_b`,
      name: `${p.name} (Bottom)`,
      rowStart: midRow + 1,
    };
    const next = parts.map((x) => (x.id === partId ? pA : x)).concat(pB);
    setParts(next);
    setActivePartId(pA.id);
    toast.success('Section split horizontally into 2 parts');
  };

  const handleSplitVertically = (partId: string) => {
    const p = parts.find((x) => x.id === partId);
    if (!p) return;
    if (p.colEnd - p.colStart < 1) {
      toast.info('Section must be at least 2 grid columns wide to split vertically');
      return;
    }
    const midCol = Math.floor((p.colStart + p.colEnd) / 2);
    const pA: SlicedPart = {
      ...p,
      name: `${p.name} (Left)`,
      colEnd: midCol,
    };
    const pB: SlicedPart = {
      ...p,
      id: `part_${Date.now()}_b`,
      name: `${p.name} (Right)`,
      colStart: midCol + 1,
    };
    const next = parts.map((x) => (x.id === partId ? pA : x)).concat(pB);
    setParts(next);
    setActivePartId(pA.id);
    toast.success('Section split vertically into 2 parts');
  };

  const handleFillRemainingSpace = () => {
    const occupied = new Set<string>();
    for (const p of parts) {
      for (let r = p.rowStart; r <= p.rowEnd; r++) {
        for (let c = p.colStart; c <= p.colEnd; c++) {
          occupied.add(`${r}_${c}`);
        }
      }
    }
    const newParts: SlicedPart[] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      let unassignedStart: number | null = null;
      for (let c = 0; c < GRID_COLS; c++) {
        const isOcc = occupied.has(`${r}_${c}`);
        if (!isOcc && unassignedStart === null) {
          unassignedStart = c;
        } else if (isOcc && unassignedStart !== null) {
          const id = `part_fill_${r}_${unassignedStart}`;
          newParts.push({
            id,
            name: `Section (Filled R${r + 1})`,
            colStart: unassignedStart,
            colEnd: c - 1,
            rowStart: r,
            rowEnd: r,
            mode: 'fixed',
            kind: 'text',
            items: [],
          });
          unassignedStart = null;
        }
      }
      if (unassignedStart !== null) {
        const id = `part_fill_${r}_${unassignedStart}`;
        newParts.push({
          id,
          name: `Section (Filled R${r + 1})`,
          colStart: unassignedStart,
          colEnd: GRID_COLS - 1,
          rowStart: r,
          rowEnd: r,
          mode: 'fixed',
          kind: 'text',
          items: [],
        });
      }
    }
    if (newParts.length === 0) {
      toast.info('100% of the page is already sliced into sections!');
      return;
    }
    setParts((prev) => [...prev, ...newParts]);
    toast.success(`Created ${newParts.length} section(s) to cover 100% of the page`);
  };

  // Close context menu on outside clicks
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Keyboard shortcut: Delete / Backspace removes the selected ITEM inside the active section
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (step !== 3) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeEl = document.activeElement;
        const isInput =
          activeEl instanceof HTMLInputElement ||
          activeEl instanceof HTMLTextAreaElement ||
          activeEl instanceof HTMLSelectElement ||
          (activeEl && (activeEl as HTMLElement).isContentEditable);
        if (isInput) return;

        if (activePart && activeItem) {
          e.preventDefault();
          handleDeleteItemFromSection(activePart.id, activeItem.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, activePart?.id, activeItem?.id, parts]);

  const handleAddItemToSection = (
    targetPartId: string,
    type: SectionItemType,
    textMode: 'fixed' | 'variable' = 'fixed',
    dropCoords?: { x: number; y: number }
  ) => {
    const targetPart = parts.find((p) => p.id === targetPartId);
    if (!targetPart) return;
    const existingItems = getPartItems(targetPart, docType);
    const newItemId = `item_${Date.now().toString().slice(-4)}_${Math.floor(Math.random() * 90 + 10)}`;
    const stagger = (existingItems.length * 6) % 30;

    let newItem: SectionItem;

    if (type === 'text' && textMode === 'variable') {
      const idx = existingItems.filter((i) => i.type === 'text' && i.textMode === 'variable').length + 1;
      const defaultKey = `custom_field_${idx}`;
      newItem = {
        id: newItemId,
        type: 'text',
        label: `Variable Field #${idx}`,
        x: dropCoords ? Math.min(60, Math.max(0, dropCoords.x)) : Math.min(52, 4 + stagger),
        y: dropCoords ? Math.min(84, Math.max(0, dropCoords.y)) : Math.min(80, 4 + stagger),
        w: 46,
        h: 15,
        textMode: 'variable',
        variableKey: defaultKey,
        variableLabel: `Custom Field ${idx}`,
        variablePrefix: `Custom Field ${idx}: `,
        variableValue: 'Sample Value',
        fieldType: 'text',
        fontFamily: 'Inter',
        fontSize: 9,
        fontWeight: 600,
        textAlign: 'left',
      };
      if (!customVariables.some((v) => v.key === defaultKey)) {
        setCustomVariables((prev) => [...prev, { key: defaultKey, label: `Custom Field ${idx}` }]);
      }
    } else if (type === 'text') {
      newItem = {
        id: newItemId,
        type: 'text',
        label: 'Fixed Text Box',
        x: dropCoords ? Math.min(60, Math.max(0, dropCoords.x)) : Math.min(52, 4 + stagger),
        y: dropCoords ? Math.min(84, Math.max(0, dropCoords.y)) : Math.min(80, 4 + stagger),
        w: 46,
        h: 15,
        textMode: 'fixed',
        fixedText: 'Static / Fixed Text',
        fontFamily: 'Inter',
        fontSize: 9.5,
        fontWeight: 600,
        textAlign: 'left',
      };
    } else if (type === 'image') {
      newItem = {
        id: newItemId,
        type: 'image',
        label: 'Photo / Logo',
        x: dropCoords ? Math.min(70, Math.max(0, dropCoords.x)) : Math.min(65, 4 + stagger),
        y: dropCoords ? Math.min(50, Math.max(0, dropCoords.y)) : Math.min(45, 8 + stagger),
        w: 28,
        h: 52,
        imageSource: 'company_logo',
        imageFit: 'contain',
      };
    } else if (type === 'items_table') {
      newItem = {
        id: newItemId,
        type: 'items_table',
        label: 'Items Table',
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        tableDesign: 'card',
        tableHeaderBg: 'theme.primary',
        tableHeaderTextColor: '#FFFFFF',
        tableBorderColor: '#E5E7EB',
        tableStriped: true,
        tableFontSize: 8.5,
        tableDensity: 'normal',
        tableShowSerial: true,
        tableColumns: DEFAULT_TABLE_COLUMNS,
      };
    } else if (type === 'upi_qr') {
      newItem = {
        id: newItemId,
        type: 'upi_qr',
        label: 'UPI Payment QR',
        x: dropCoords ? Math.min(70, Math.max(0, dropCoords.x)) : 4,
        y: dropCoords ? Math.min(40, Math.max(0, dropCoords.y)) : 8,
        w: 28,
        h: 82,
        qrCaption: 'Scan to pay via UPI',
      };
    } else if (type === 'totals_box') {
      newItem = {
        id: newItemId,
        type: 'totals_box',
        label: 'Totals Summary Box',
        x: dropCoords ? Math.min(55, Math.max(0, dropCoords.x)) : 52,
        y: dropCoords ? Math.min(30, Math.max(0, dropCoords.y)) : 6,
        w: 46,
        h: 88,
      };
    } else if (type === 'signature') {
      newItem = {
        id: newItemId,
        type: 'signature',
        label: 'Authorised Signatory',
        x: dropCoords ? Math.min(65, Math.max(0, dropCoords.x)) : 66,
        y: dropCoords ? Math.min(40, Math.max(0, dropCoords.y)) : 12,
        w: 32,
        h: 80,
        signatureCaption: 'For {{company.name}}\nAuthorised Signatory',
        textAlign: 'right',
      };
    } else if (type === 'bank_details') {
      newItem = {
        id: newItemId,
        type: 'bank_details',
        label: 'Bank Details Box',
        x: 4,
        y: 8,
        w: 46,
        h: 80,
      };
    } else {
      newItem = {
        id: newItemId,
        type: 'hsn_summary',
        label: 'HSN Tax Breakdown',
        x: 4,
        y: 8,
        w: 92,
        h: 80,
      };
    }

    updatePartItems(targetPartId, (items) => [...items, newItem]);
    setActivePartId(targetPartId);
    setActiveItemId(newItemId);
    toast.success(`Added "${newItem.label}" inside ${targetPart.name}! Drag & resize freely.`);
  };

  const handleDuplicateItemInSection = (partId: string, itemId: string) => {
    const targetPart = parts.find((p) => p.id === partId);
    if (!targetPart) return;
    const currentItems = getPartItems(targetPart, docType);
    const orig = currentItems.find((it) => it.id === itemId);
    if (!orig) return;

    const newItemId = `item_${Date.now().toString().slice(-4)}_${Math.floor(Math.random() * 90 + 10)}`;
    const copy: SectionItem = {
      ...orig,
      id: newItemId,
      label: `${orig.label} (Copy)`,
      x: Math.min(100 - orig.w, orig.x + 5),
      y: Math.min(100 - orig.h, orig.y + 5),
    };
    updatePartItems(partId, (items) => [...items, copy]);
    setActivePartId(partId);
    setActiveItemId(newItemId);
    toast.success(`Duplicated "${orig.label}"`);
  };

  const handleDeleteItemFromSection = (partId: string, itemId: string) => {
    const targetPart = parts.find((p) => p.id === partId);
    if (!targetPart) return;
    const currentItems = getPartItems(targetPart, docType);
    const nextItems = currentItems.filter((it) => it.id !== itemId);
    updatePartItems(partId, () => nextItems);
    if (activeItemId === itemId) {
      setActiveItemId(nextItems[0]?.id ?? '');
    }
    toast.info('Removed item from section');
  };

  const handleStartItemPointerDrag = (
    e: React.PointerEvent,
    partId: string,
    item: SectionItem,
    mode: 'move' | 'resize',
    containerEl: HTMLElement | null
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setActivePartId(partId);
    setActiveItemId(item.id);
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    setItemDrag({
      partId,
      itemId: item.id,
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      containerWidth: rect.width,
      containerHeight: rect.height,
      orig: { x: item.x, y: item.y, w: item.w, h: item.h },
    });
  };

  const handleCustomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeItem) return;
    try {
      const dataUrl = await compressAndNormalizeImage(file);
      if (dataUrl) {
        updateActiveItem((it) => ({
          ...it,
          type: 'image',
          imageSource: 'custom_upload',
          imageDataUrl: dataUrl,
          label: file.name.replace(/\.[^.]+$/, '') || 'Custom Image',
        }));
        toast.success(`Uploaded image "${file.name}" into section!`);
      }
    } catch (err) {
      toast.error('Failed to process image');
    }
    e.target.value = '';
  };

  const applyQuickGridPreset = (
    preset:
      | 'standard_5'
      | '6_parts'
      | 'rx_prescription'
      | '3_rows'
      | '4_rows'
      | '9_parts'
      | 'rx_continuation'
      | 'clear'
  ) => {
    if (preset === 'clear') {
      setParts([]);
      setActivePartId('');
      setActiveItemId('');
      toast.info('Canvas cleared! Click and drag in any direction to slice new sections.');
      return;
    }
    if (preset === '6_parts') {
      const next = DEFAULT_PAGE1_PARTS.map((p) => ({
        ...p,
        items: [],
      }));
      setParts(next);
      setActivePartId(next[0]?.id ?? '');
      setActiveItemId('');
      toast.success('Loaded 6-Section Layout (Plain sections ready for your custom items)');
      return;
    }
    if (preset === 'standard_5') {
      const next: SlicedPart[] = [
        {
          id: 's1',
          name: 'Section 1 (Full Header & Meta)',
          colStart: 0,
          colEnd: 11,
          rowStart: 0,
          rowEnd: 2,
          mode: 'fixed',
          kind: 'text',
          items: [
            {
              id: 's1_logo',
              type: 'image',
              label: 'Company Logo',
              x: 2,
              y: 10,
              w: 16,
              h: 80,
              imageSource: 'company_logo',
              imageFit: 'contain',
            },
            {
              id: 's1_comp',
              type: 'text',
              label: 'Company Details (Fixed)',
              x: 20,
              y: 10,
              w: 46,
              h: 80,
              textMode: 'fixed',
              fixedText:
                '{{company.name}}\n{{company.address.full}}\nGSTIN: {{company.gstin | default:"Unregistered"}} • Ph: {{company.phone}}',
              fontSize: 9.5,
              fontWeight: 600,
              textAlign: 'left',
              textColor: 'theme.primary',
            },
            {
              id: 's1_meta',
              type: 'text',
              label: 'Invoice Title & No (Fixed)',
              x: 68,
              y: 10,
              w: 30,
              h: 80,
              textMode: 'fixed',
              fixedText:
                'TAX INVOICE\nNo: {{doc.number}}\nDate: {{doc.issue_date | date:"DD MMM YYYY"}}',
              fontSize: 10,
              fontWeight: 700,
              textAlign: 'right',
              textColor: 'theme.primary',
            },
          ],
        },
        {
          id: 's2',
          name: 'Section 2 (Customer Bill-To)',
          colStart: 0,
          colEnd: 5,
          rowStart: 3,
          rowEnd: 4,
          mode: 'fixed',
          kind: 'text',
          textTemplate:
            'BILL TO:\n{{client_name}}\n{{client_address}}\nGSTIN: {{client_gstin | default:"—"}} • Ph: {{client_phone | default:"—"}}',
          fontSize: 9,
          fontWeight: 400,
          textAlign: 'left',
          hasBorder: true,
          backgroundColor: '#FFFFFF',
        },
        {
          id: 's3',
          name: 'Section 3 (Document Parameters & Vitals)',
          colStart: 6,
          colEnd: 11,
          rowStart: 3,
          rowEnd: 4,
          mode: 'fixed',
          kind: 'text',
          textTemplate:
            'Place of Supply: State {{doc.place_of_supply}}\nRef / PO #: {{po_number | default:"—"}}\nPatient Vitals: {{patient_vitals | default:"BP: 120/80 • Pulse: 72"}}',
          fontSize: 9,
          fontWeight: 400,
          textAlign: 'left',
          hasBorder: true,
          backgroundColor: '#FFFFFF',
        },
        {
          id: 's4',
          name: 'Section 4 (Expanding Line Items Table)',
          colStart: 0,
          colEnd: 11,
          rowStart: 5,
          rowEnd: 9,
          mode: 'variable',
          kind: 'items_table',
          textTemplate: '',
          tableDesign: 'card',
          tableHeaderBg: 'theme.primary',
          tableHeaderTextColor: '#FFFFFF',
          tableStriped: true,
          tableFontSize: 8.5,
          tableDensity: 'normal',
          tableShowSerial: true,
          tableColumns: DEFAULT_TABLE_COLUMNS,
        },
        {
          id: 's5',
          name: 'Section 5 (Totals, UPI QR & Signatory Footer)',
          colStart: 0,
          colEnd: 11,
          rowStart: 10,
          rowEnd: 11,
          mode: 'fixed',
          kind: 'totals_box',
          textTemplate: '',
        },
      ];
      setParts(next);
      setActivePartId('s1');
      toast.success('Loaded Standard 5-Section Layout (100% Full Page Coverage)');
      return;
    }
    if (preset === 'rx_prescription') {
      const next: SlicedPart[] = [
        {
          id: 'rx_1',
          name: 'Clinic Letterhead & Doctor Profile',
          colStart: 0,
          colEnd: 6,
          rowStart: 0,
          rowEnd: 2,
          mode: 'fixed',
          kind: 'text',
          textTemplate:
            '{{company.name}}\n{{company.address.full}}\nReg No: {{doctor_reg_no | default:"DOC-REG-84729"}} • Ph: {{company.phone}}',
          fontSize: 10,
          fontWeight: 700,
          textAlign: 'left',
          textColor: 'theme.primary',
        },
        {
          id: 'rx_2',
          name: 'Rx Reference & Date',
          colStart: 7,
          colEnd: 11,
          rowStart: 0,
          rowEnd: 2,
          mode: 'fixed',
          kind: 'text',
          textTemplate:
            'PRESCRIPTION\nRx No: {{doc.number}}\nDate: {{doc.issue_date | date:"DD MMM YYYY"}}',
          fontSize: 10,
          fontWeight: 700,
          textAlign: 'right',
          textColor: 'theme.primary',
        },
        {
          id: 'rx_3',
          name: 'Patient Name & Medical Vitals Bar',
          colStart: 0,
          colEnd: 11,
          rowStart: 3,
          rowEnd: 4,
          mode: 'fixed',
          kind: 'text',
          textTemplate:
            'Patient: {{client_name}} | Age/Sex: {{patient_age | default:"—"}}\nVitals: {{patient_vitals | default:"BP: 120/80 • Pulse: 72 bpm • SpO2: 99%"}}',
          fontSize: 9.5,
          fontWeight: 600,
          textAlign: 'left',
          hasBorder: true,
          backgroundColor: '#F0F9FF',
        },
        {
          id: 'rx_4',
          name: 'Prescriptions & Medication Table (Invisible Lines)',
          colStart: 0,
          colEnd: 11,
          rowStart: 5,
          rowEnd: 9,
          mode: 'variable',
          kind: 'items_table',
          textTemplate: '',
          tableDesign: 'invisible',
          tableHeaderBg: 'transparent',
          tableHeaderTextColor: '#111827',
          tableStriped: false,
          tableFontSize: 9,
          tableDensity: 'relaxed',
          tableShowSerial: true,
          tableColumns: [
            { id: 'c1', header: 'Prescribed Medicine / Drug', value: '{{item_name}}', width: 4, align: 'left', enabled: true },
            { id: 'c2', header: 'Dosage', value: '{{qty}} {{unit}}', width: 1.5, align: 'center', enabled: true },
            { id: 'c3', header: 'Frequency / Timing', value: '1-0-1 (After Food)', width: 2.5, align: 'left', enabled: true },
            { id: 'c4', header: 'Duration', value: '5 Days', width: 1.5, align: 'center', enabled: true },
            { id: 'c5', header: 'Instructions', value: 'Drink warm water', width: 2.5, align: 'left', enabled: true },
          ],
        },
        {
          id: 'rx_5',
          name: 'Doctor Signature & Clinic Stamp',
          colStart: 0,
          colEnd: 11,
          rowStart: 10,
          rowEnd: 11,
          mode: 'fixed',
          kind: 'signature',
          textTemplate: '',
          signatureCaption: 'Doctor Signature & Clinic Stamp\n{{company.name}}',
        },
      ];
      setParts(next);
      setActivePartId('rx_1');
      toast.success('Loaded Doctor Clinic Prescription (Rx) Layout');
      return;
    }
    if (preset === '3_rows') {
      const next: SlicedPart[] = [
        {
          id: 'r1',
          name: 'Section 1 (Top Header)',
          colStart: 0,
          colEnd: 11,
          rowStart: 0,
          rowEnd: 2,
          mode: 'fixed',
          kind: 'text',
          textTemplate:
            '{{company.name}}\n{{company.address.full}}\nTAX INVOICE • No: {{doc.number}} • Date: {{doc.issue_date | date:"DD MMM YYYY"}}',
          fontSize: 10,
          fontWeight: 700,
          textAlign: 'center',
          textColor: 'theme.primary',
          hasBorder: true,
          backgroundColor: '#F9FAFB',
        },
        {
          id: 'r2',
          name: 'Section 2 (Full Body Table)',
          colStart: 0,
          colEnd: 11,
          rowStart: 3,
          rowEnd: 9,
          mode: 'variable',
          kind: 'items_table',
          textTemplate: '',
          tableDesign: 'horizontal_only',
          tableHeaderBg: 'theme.primary',
          tableHeaderTextColor: '#FFFFFF',
          tableStriped: true,
          tableFontSize: 8.5,
          tableDensity: 'normal',
          tableShowSerial: true,
          tableColumns: DEFAULT_TABLE_COLUMNS,
        },
        {
          id: 'r3',
          name: 'Section 3 (Footer Totals & Sign)',
          colStart: 0,
          colEnd: 11,
          rowStart: 10,
          rowEnd: 11,
          mode: 'fixed',
          kind: 'totals_box',
          textTemplate: '',
        },
      ];
      setParts(next);
      setActivePartId('r1');
      toast.success('Loaded Clean 3-Row Layout');
      return;
    }
    if (preset === '4_rows') {
      const next: SlicedPart[] = [
        {
          id: 'row1',
          name: 'Section 1 (Top Header)',
          colStart: 0,
          colEnd: 11,
          rowStart: 0,
          rowEnd: 1,
          mode: 'fixed',
          kind: 'text',
          textTemplate: '{{company.name}} • GSTIN: {{company.gstin | default:"Unregistered"}}',
          fontSize: 9.5,
          fontWeight: 700,
          textAlign: 'left',
          textColor: 'theme.primary',
        },
        {
          id: 'row2',
          name: 'Section 2 (Bill-To & Invoice Meta)',
          colStart: 0,
          colEnd: 11,
          rowStart: 2,
          rowEnd: 3,
          mode: 'fixed',
          kind: 'text',
          textTemplate: 'Bill To: {{client_name}} | Place of Supply: {{doc.place_of_supply}} | Invoice #: {{doc.number}}',
          fontSize: 9,
          fontWeight: 400,
          textAlign: 'left',
          hasBorder: true,
          backgroundColor: '#F9FAFB',
        },
        {
          id: 'row3',
          name: 'Section 3 (Items Table)',
          colStart: 0,
          colEnd: 11,
          rowStart: 4,
          rowEnd: 9,
          mode: 'variable',
          kind: 'items_table',
          textTemplate: '',
          tableDesign: 'card',
          tableHeaderBg: '#111827',
          tableHeaderTextColor: '#FFFFFF',
          tableStriped: true,
          tableFontSize: 8.5,
          tableDensity: 'normal',
          tableShowSerial: true,
          tableColumns: DEFAULT_TABLE_COLUMNS,
        },
        {
          id: 'row4',
          name: 'Section 4 (Footer Totals)',
          colStart: 0,
          colEnd: 11,
          rowStart: 10,
          rowEnd: 11,
          mode: 'fixed',
          kind: 'totals_box',
          textTemplate: '',
        },
      ];
      setParts(next);
      setActivePartId('row1');
      toast.success('Loaded 4-Row Structured Layout');
      return;
    }
    if (preset === 'rx_continuation') {
      const next = DEFAULT_PAGE2_CONTINUATION_PARTS.map((p) => ({ ...p }));
      setParts(next);
      setActivePartId(next[0]?.id ?? '');
      toast.success('Loaded Compact Continuation Page layout (Patient/Client Info + Large Flexible Area)');
      return;
    }
    if (preset === '9_parts') {
      const next: SlicedPart[] = [];
      const defaultKinds: PartKind[] = [
        'text',
        'text',
        'image',
        'text',
        'text',
        'upi_qr',
        'items_table',
        'totals_box',
        'signature',
      ];
      const defaultTemplates: string[] = [
        '{{company.name}}\n{{company.address.full}}\nGSTIN: {{company.gstin}}',
        `${DOC_TYPE_LABELS[docType].toUpperCase()}\nNo: {{doc.number}}\nDate: {{doc.issue_date | date:"DD MMM YYYY"}}`,
        '',
        'BILL TO:\n{{client_name}}\n{{client_address}}',
        'Vitals: {{patient_vitals | default:"BP: 120/80"}}',
        '',
        '',
        '',
        '',
      ];
      let idx = 0;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const id = `p_${idx + 1}`;
          const k = defaultKinds[idx] ?? 'text';
          next.push({
            id,
            name: `Part ${idx + 1} (R${r + 1}C${c + 1})`,
            colStart: c * 4,
            colEnd: c * 4 + 3,
            rowStart: r * 4,
            rowEnd: r * 4 + 3,
            mode: r === 0 || r === 2 ? 'fixed' : 'variable',
            kind: k,
            textTemplate: defaultTemplates[idx] ?? '',
            fontSize: 9,
            fontWeight: 400,
            textAlign: 'left',
          });
          idx++;
        }
      }
      setParts(next);
      setActivePartId('p_1');
    }
  };

  const compilePartsIntoTemplateDefinition = (): TemplateDefinition => {
    const base = buildGstClassicDefinition({
      primaryColor: '#5B3FD9',
      accentColor: '#B8892E',
      title: DOC_TYPE_LABELS[docType].toUpperCase(),
      series:
        docType === 'quotation'
          ? 'QTN'
          : docType === 'receipt'
          ? 'RCPT'
          : docType === 'prescription'
          ? 'RX'
          : 'INV',
      taxMode: docType === 'bill_of_supply' || docType === 'prescription' ? 'none' : 'exclusive',
    });

    const extraFields = [
      {
        key: 'patient_age',
        label: 'Age / Gender',
        type: 'text' as const,
        scope: 'document' as const,
        required: false,
        default: '34 Yrs / M',
        group: 'Client / Patient Details',
        order: 5,
      },
      {
        key: 'patient_vitals',
        label: 'Vitals (BP / Pulse / Temp / SpO2 / Weight)',
        type: 'text' as const,
        scope: 'document' as const,
        required: false,
        default: 'BP: 120/80 • Pulse: 74 bpm • SpO2: 99% • Wt: 70 kg',
        group: 'Client / Patient Details',
        order: 6,
      },
    ];
    for (const ef of extraFields) {
      if (!base.fields.some((f) => f.key === ef.key)) {
        base.fields.push(ef);
      }
    }

    base.page = {
      size: sizeId,
      orientation: 'portrait',
      width: selectedSize.width,
      height: selectedSize.height,
      margin: selectedSize.margin,
    };

    const innerW = selectedSize.width - selectedSize.margin * 2;
    const innerH = selectedSize.height - selectedSize.margin * 2;
    const cellW = innerW / GRID_COLS;
    const cellH = innerH / GRID_ROWS;

    const makeBlockForSectionItem = (item: SectionItem): Block => {
      const id = newId('blk');

      switch (item.type) {
        case 'text': {
          const text = getItemCompiledText(item);
          return {
            id,
            name: item.label,
            type: 'text',
            content: text,
            style: {
              font_family: item.fontFamily || undefined,
              font_size: item.fontSize ?? 9,
              font_weight: item.fontWeight ?? 400,
              align: item.textAlign ?? 'left',
              color: item.textColor || undefined,
              background: item.backgroundColor || undefined,
              line_height: 1.35,
              padding: item.hasBorder || item.backgroundColor ? [4, 6, 4, 6] : undefined,
              border: item.hasBorder
                ? { width: 1, color: item.borderColor || '#E5E7EB', radius: 4 }
                : undefined,
            },
          };
        }
        case 'image': {
          if (item.imageDataUrl) {
            return {
              id,
              name: item.label,
              type: 'image',
              source: { kind: 'data_url', data_url: item.imageDataUrl },
              fit: item.imageFit ?? 'contain',
              style: { align: item.textAlign ?? 'left' },
            };
          }
          if (item.imageSource === 'company_signature') {
            return {
              id,
              name: item.label,
              type: 'image',
              source: { kind: 'company_signature' },
              fit: item.imageFit ?? 'contain',
              style: { align: item.textAlign ?? 'left' },
            };
          }
          return {
            id,
            name: item.label,
            type: 'image',
            source: { kind: 'company_logo' },
            fit: item.imageFit ?? 'contain',
            style: { align: item.textAlign ?? 'left' },
          };
        }
        case 'items_table': {
          const colsToUse =
            item.tableColumns && item.tableColumns.length > 0
              ? item.tableColumns
                  .filter((c) => c.enabled !== false)
                  .map((c) => ({
                    id: c.id || newId('col'),
                    header: c.header,
                    value: c.value,
                    width: c.width,
                    align: c.align,
                  }))
              : [
                  { id: newId('col'), header: 'Item Description', value: '{{item_name}}', width: 4, align: 'left' as const },
                  { id: newId('col'), header: 'HSN/SAC', value: '{{hsn_sac}}', width: 1.5, align: 'center' as const },
                  { id: newId('col'), header: 'Qty', value: '{{qty}} {{unit}}', width: 1.2, align: 'right' as const },
                  { id: newId('col'), header: 'Rate (₹)', value: '{{rate | money:nosymbol}}', width: 1.8, align: 'right' as const },
                  { id: newId('col'), header: 'Amount (₹)', value: '{{line_total | money:nosymbol}}', width: 2, align: 'right' as const },
                ];

          return {
            id,
            name: item.label,
            type: 'table',
            columns: colsToUse,
            show_serial: item.tableShowSerial ?? true,
            striped: item.tableStriped ?? true,
            repeat_header: true,
            table_design: item.tableDesign ?? 'card',
            border_color: item.tableBorderColor || undefined,
            header_style: {
              background: item.tableHeaderBg || undefined,
              color: item.tableHeaderTextColor || undefined,
              font_size: 8,
              font_weight: 700,
            },
            row_style: {
              background: item.tableStripeBg || undefined,
              font_size: item.tableFontSize ?? 8.5,
              padding:
                item.tableDensity === 'compact'
                  ? [3, 4, 3, 4]
                  : item.tableDensity === 'relaxed'
                  ? [8, 8, 8, 8]
                  : [5, 6, 5, 6],
            },
            style: {
              font_family: item.fontFamily || undefined,
            },
          };
        }
        case 'totals_box':
          return {
            id,
            name: item.label,
            type: 'totals',
            rows: [
              { label: 'Subtotal', value: '{{subtotal | money}}' },
              { label: 'CGST', value: '{{cgst_total | money}}' },
              { label: 'SGST', value: '{{sgst_total | money}}' },
              { label: 'IGST', value: '{{igst_total | money}}' },
              { label: 'Grand Total', value: '{{grand_total | money}}', emphasis: true },
            ],
            show_amount_in_words: true,
            style: {
              font_family: item.fontFamily || undefined,
              background: item.backgroundColor || undefined,
              border: item.hasBorder
                ? { width: 1, color: item.borderColor || '#E5E7EB', radius: 6 }
                : undefined,
            },
          };
        case 'upi_qr':
          return {
            id,
            name: item.label,
            type: 'upi_qr',
            amount_key: 'grand_total',
            size: 74,
            caption: item.qrCaption || 'Scan to pay via UPI',
            style: { align: item.textAlign ?? 'left' },
          };
        case 'bank_details':
          return {
            id,
            name: item.label,
            type: 'bank_details',
            title: 'Bank & Payment Details',
            style: {},
          };
        case 'signature':
          return {
            id,
            name: item.label,
            type: 'signature',
            source: 'company_signature',
            caption: item.signatureCaption || 'For {{company.name}}\nAuthorised Signatory',
            style: { align: item.textAlign ?? 'right' },
          };
        case 'hsn_summary':
        default:
          return {
            id,
            name: item.label,
            type: 'hsn_summary',
            style: { font_size: 8 },
          };
      }
    };

    const compileFixedZonesForParts = (sourceParts: SlicedPart[]) => {
      const varRows = sourceParts.filter((p) => p.mode === 'variable');
      const firstVarRowStart =
        varRows.length > 0 ? Math.min(...varRows.map((p) => p.rowStart)) : 6;

      const topFixedParts = sourceParts.filter(
        (p) => p.mode === 'fixed' && p.rowStart < Math.max(firstVarRowStart, 7) && p.rowStart < 9
      );
      const bottomFixedParts = sourceParts.filter(
        (p) => p.mode === 'fixed' && !topFixedParts.includes(p)
      );

      const maxHeaderGridRow =
        topFixedParts.length > 0 ? Math.max(...topFixedParts.map((p) => p.rowEnd + 1)) : 0;
      const minFooterGridRow =
        bottomFixedParts.length > 0 ? Math.min(...bottomFixedParts.map((p) => p.rowStart)) : 11;

      const headerHeight =
        topFixedParts.length > 0 ? Math.round(maxHeaderGridRow * cellH) : 0;
      const footerHeight =
        bottomFixedParts.length > 0
          ? Math.round((GRID_ROWS - minFooterGridRow) * cellH)
          : 0;

      const headerBlocks: FixedBlock[] = [];
      let zCounter = 1;
      for (const p of topFixedParts) {
        const secX = p.colStart * cellW;
        const secY = p.rowStart * cellH;
        const secW = (p.colEnd - p.colStart + 1) * cellW;
        const secH = Math.max(10, Math.round((p.rowEnd - p.rowStart + 1) * cellH));
        const sectionItems = getPartItems(p, docType);

        for (const item of sectionItems) {
          const blockW = Math.max(16, Math.round((item.w / 100) * secW));
          const blockH = Math.max(8, Math.round((item.h / 100) * secH));
          const isNearBottom = item.y + item.h >= 96;
          const isNearTop = item.y <= 4;
          const blockY = isNearBottom
            ? Math.max(0, Math.round(secY + secH - blockH))
            : isNearTop
            ? Math.round(secY)
            : Math.round(secY + (item.y / 100) * secH);
          const blockX = item.x <= 4
            ? Math.round(secX)
            : item.x + item.w >= 96
            ? Math.max(0, Math.round(secX + secW - blockW))
            : Math.round(secX + (item.x / 100) * secW);

          headerBlocks.push({
            ...makeBlockForSectionItem(item),
            frame: {
              x: blockX,
              y: blockY,
              w: blockW,
              h: blockH,
            },
            z: zCounter++,
          });
        }
      }

      const footerBlocks: FixedBlock[] = [];
      let fzCounter = 1;
      for (const p of bottomFixedParts) {
        const secX = p.colStart * cellW;
        const secY = (p.rowStart - minFooterGridRow) * cellH;
        const secW = (p.colEnd - p.colStart + 1) * cellW;
        const secH = Math.max(10, Math.round((p.rowEnd - p.rowStart + 1) * cellH));
        const sectionItems = getPartItems(p, docType);

        for (const item of sectionItems) {
          const blockW = Math.max(16, Math.round((item.w / 100) * secW));
          const blockH = Math.max(8, Math.round((item.h / 100) * secH));
          const isNearBottom = item.y + item.h >= 96;
          const isNearTop = item.y <= 4;
          const blockY = isNearBottom
            ? Math.max(0, Math.round(secY + secH - blockH))
            : isNearTop
            ? Math.round(secY)
            : Math.round(secY + (item.y / 100) * secH);
          const blockX = item.x <= 4
            ? Math.round(secX)
            : item.x + item.w >= 96
            ? Math.max(0, Math.round(secX + secW - blockW))
            : Math.round(secX + (item.x / 100) * secW);

          footerBlocks.push({
            ...makeBlockForSectionItem(item),
            frame: {
              x: blockX,
              y: blockY,
              w: blockW,
              h: blockH,
            },
            z: fzCounter++,
          });
        }
      }

      if (footerHeight > 0) {
        footerBlocks.push({
          id: newId('blk'),
          name: 'Page Number',
          type: 'text',
          content: 'Page {{page.number}} of {{page.total}}',
          style: { font_size: 7.5, color: 'theme.muted', align: 'right' },
          frame: { x: Math.max(0, innerW - 140), y: Math.max(4, footerHeight - 16), w: 140, h: 14 },
          z: footerBlocks.length + 1,
        });
      }

      return {
        header: { height: headerHeight, blocks: headerBlocks },
        footer: { height: footerHeight, blocks: footerBlocks },
      };
    };

    const page1Zones = compileFixedZonesForParts(page1Parts);
    const page2Zones =
      continuationMode === 'custom_page_2'
        ? compileFixedZonesForParts(page2Parts)
        : page1Zones;

    const variableParts = page1Parts.filter((p) => p.mode === 'variable');
    const rowGroups = new Map<number, SlicedPart[]>();
    for (const vp of [...variableParts].sort(
      (a, b) => a.rowStart - b.rowStart || a.colStart - b.colStart
    )) {
      const list = rowGroups.get(vp.rowStart) ?? [];
      list.push(vp);
      rowGroups.set(vp.rowStart, list);
    }

    const bodyRows: BodyRow[] = [];
    for (const [, group] of rowGroups.entries()) {
      const hasTable = group.some((g) =>
        getPartItems(g, docType).some((it) => it.type === 'items_table')
      );
      bodyRows.push({
        id: newId('row'),
        gap: 0,
        keep_together: !hasTable,
        cols: group.map((g) => {
          const secW = (g.colEnd - g.colStart + 1) * cellW;
          const secH = Math.max(10, Math.round((g.rowEnd - g.rowStart + 1) * cellH));
          const sectionItems = getPartItems(g, docType);

          const colBlocks: Block[] = sectionItems.map((it) => {
            const blk = makeBlockForSectionItem(it);
            if (it.type === 'items_table') {
              return blk;
            }
            const blockW = Math.max(16, Math.round((it.w / 100) * secW));
            const blockH = Math.max(8, Math.round((it.h / 100) * secH));
            const isNearBottom = it.y + it.h >= 96;
            const isNearTop = it.y <= 4;
            const blockY = isNearBottom
              ? Math.max(0, Math.round(secH - blockH))
              : isNearTop
              ? 0
              : Math.round((it.y / 100) * secH);
            const blockX = it.x <= 4
              ? 0
              : it.x + it.w >= 96
              ? Math.max(0, Math.round(secW - blockW))
              : Math.round((it.x / 100) * secW);

            return {
              ...blk,
              rel_frame: {
                x: blockX,
                y: blockY,
                w: blockW,
                h: blockH,
                container_h: secH,
              },
            };
          });

          return {
            id: newId('col'),
            span: Math.max(1, Math.min(12, g.colEnd - g.colStart + 1)),
            blocks: colBlocks,
          };
        }),
      });
    }

    base.layout = {
      zones: {
        header: page1Zones.header,
        footer: page1Zones.footer,
        left: { width: 0, blocks: [] },
        right: { width: 0, blocks: [] },
      },
      body: {
        row_gap: 0,
        rows: bodyRows.length > 0 ? bodyRows : base.layout.body.rows,
      },
      continuation: {
        mode: continuationMode,
        zones: {
          header: page2Zones.header,
          footer: page2Zones.footer,
        },
      },
    };

    // 1. Register all explicit Variable Text Field items into base.fields with their key, label & default value
    const allSectionItems = [...page1Parts, ...page2Parts].flatMap((p) =>
      getPartItems(p, docType)
    );
    for (const item of allSectionItems) {
      if (item.type === 'text' && item.textMode === 'variable' && item.variableKey) {
        const cleanKey = item.variableKey
          .trim()
          .replace(/[^a-zA-Z0-9_]/g, '_')
          .replace(/^_+|_+$/g, '');
        if (!cleanKey) continue;
        const existingIdx = base.fields.findIndex((f) => f.key === cleanKey);
        if (existingIdx >= 0) {
          const existing = base.fields[existingIdx]!;
          base.fields[existingIdx] = {
            ...existing,
            label: item.variableLabel?.trim() || existing.label,
            default: item.variableValue ?? existing.default,
          };
        } else {
          base.fields.push({
            key: cleanKey,
            label:
              item.variableLabel?.trim() ||
              cleanKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            type: item.fieldType ?? 'text',
            scope: 'document',
            required: false,
            default: item.variableValue ?? '',
            group: 'Custom Template Variables',
            order: base.fields.length + 1,
          });
        }
      }
    }

    // 2. Also auto-discover any {{token}} inside fixed/compiled text
    const allTexts = allSectionItems.map((it) => getItemCompiledText(it)).join(' ');
    const tokenRegex = /\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|[^}]*)?\}\}/g;
    const matches = Array.from(allTexts.matchAll(tokenRegex));
    const systemNames = new Set([
      'company',
      'client',
      'doc',
      'page',
      'grand_total',
      'subtotal',
      'tax_total',
      'round_off',
      'cgst_total',
      'sgst_total',
      'igst_total',
      'serial',
      'sno',
      'line_total',
      'taxable_amount',
      'item_name',
      'hsn_sac',
      'qty',
      'rate',
      'unit',
      'discount_pct',
      'gst_rate',
      'client_name',
      'client_gstin',
      'client_address',
      'client_phone',
      'po_number',
      'notes',
      'patient_age',
      'patient_vitals',
    ]);

    for (const match of matches) {
      const varKey = match[1]?.trim();
      if (varKey && !systemNames.has(varKey) && !base.fields.some((f) => f.key === varKey)) {
        base.fields.push({
          key: varKey,
          label: varKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          type: 'text',
          scope: 'document',
          required: false,
          group: 'Custom Template Variables',
          order: base.fields.length + 1,
        });
      }
    }

    return base;
  };

  const handleWizardPreviewPdf = async () => {
    const trimmed = templateName.trim();
    if (!trimmed || trimmed.length < 2) {
      toast.error('Please enter a template name with at least 2 characters');
      setStep(1);
      return;
    }
    if (page1Parts.length === 0 || isWizardCompiling) {
      toast.error('Please slice at least one section on Page 1 first');
      setStep(2);
      return;
    }
    if (continuationMode === 'custom_page_2' && page2Parts.length === 0) {
      toast.error('Please slice at least one section on Page 2+ Continuation');
      setStep(2);
      return;
    }

    // Validate variable keys across all sections
    const allSecItems = [...page1Parts, ...page2Parts].flatMap((p) => getPartItems(p, docType));
    const seenPreviewKeys = new Set<string>();
    for (const it of allSecItems) {
      if (it.type === 'text' && it.textMode === 'variable') {
        const k = (it.variableKey || '').trim().toLowerCase();
        if (!k) {
          toast.error(`Variable item "${it.label}" has an empty variable key`);
          return;
        }
        if (!/^[a-z][a-z0-9_]*$/.test(k)) {
          toast.error(`Variable key "${k}" is invalid. It must start with a lowercase letter and contain only letters, numbers, and underscores.`);
          return;
        }
        if (seenPreviewKeys.has(k)) {
          toast.error(`Duplicate variable key "${k}". Each variable field must have a unique key.`);
          return;
        }
        seenPreviewKeys.add(k);
      }
    }

    setIsWizardCompiling(true);
    await new Promise((r) => setTimeout(r, 50));
    try {
      const def = compilePartsIntoTemplateDefinition();
      const sampleCompany = activeCompany ?? {
        id: 'cmp_demo',
        name: 'INGEN Demo Enterprise',
        gstin: '36AABCU9603R1ZO',
        address: {
          line1: 'Jubilee Hills, Road 36',
          city: 'Hyderabad',
          state: 'Telangana',
          state_code: '36',
          pincode: '500033',
          country: 'India',
        },
        phone: '+91 98765 43210',
        email: 'billing@ingen-demo.in',
        upi: { vpa: 'ingen@okicici', payee_name: 'INGEN Demo' },
        currency: 'INR' as const,
        locale: 'en-IN' as const,
        fy_start_month: 4,
        custom_fields: [],
        archived: false,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      const sampleValues: Record<string, string> = {
        client_name: 'Apex Global Solutions Pvt Ltd',
        client_gstin: '36AABCU9603R1ZO',
        client_address: 'HITEC City, Madhapur, Hyderabad - 500081',
        patient_age: '34 Yrs / M',
        patient_vitals: 'BP: 120/80 • Pulse: 74 bpm • SpO2: 99%',
        notes: 'Thank you for your business. Terms: Payment due within 15 days.',
      };
      for (const f of def.fields) {
        if (!sampleValues[f.key]) {
          sampleValues[f.key] = f.default ?? (f.type === 'number' ? '1' : f.label);
        }
      }
      const sampleItems = [
        {
          item_name: 'Consultation & Initial Assessment',
          hsn_sac: '9983',
          qty: '1',
          unit: 'NOS',
          rate: '15000',
          discount_pct: '0',
          gst_rate: '18',
        },
      ];
      const comp = evaluateDocument({
        definition: def,
        company: sampleCompany,
        values: sampleValues,
        items: sampleItems,
      });
      (sampleCompany as any).logo_data_url = companyLogoUrl || undefined;
      (sampleCompany as any).signature_data_url = companySignatureUrl || undefined;
      const blob = await compilePdfToBlob({
        definition: def,
        company: sampleCompany,
        docMeta: {
          number: 'DRAFT/001',
          status: 'draft',
          issue_date: new Date().toISOString().slice(0, 10),
          place_of_supply: '36',
          type_label: DOC_TYPE_LABELS[docType],
        },
        values: sampleValues,
        items: sampleItems,
        computed: comp,
        assetDataUrls: {
          ...(companyLogoUrl ? { company_logo: companyLogoUrl } : {}),
          ...(companySignatureUrl ? { company_signature: companySignatureUrl } : {}),
        },
      });

      const oldUrl = wizardPreviewUrlRef.current;
      const nextUrl = URL.createObjectURL(blob);
      wizardPreviewUrlRef.current = nextUrl;
      setWizardPreviewUrl(nextUrl);
      setIsWizardPreviewOpen(true);
      if (oldUrl) {
        setTimeout(() => URL.revokeObjectURL(oldUrl), 5000);
      }
      toast.success('Live PDF Blueprint generated!');
    } catch (err) {
      console.error('Wizard PDF preview error:', err);
      toast.error(`PDF Preview error: ${(err as Error).message}`);
    } finally {
      setIsWizardCompiling(false);
    }
  };

  const handleFinishAndOpenStudio = async () => {
    const trimmed = templateName.trim();
    if (!trimmed || trimmed.length < 2) {
      toast.error('Please enter a template name with at least 2 characters');
      setStep(1);
      return;
    }
    if (page1Parts.length === 0) {
      toast.error('Please slice at least one section on Page 1 first');
      setStep(2);
      return;
    }
    if (continuationMode === 'custom_page_2' && page2Parts.length === 0) {
      toast.error('Please slice at least one section on Page 2+ Continuation');
      setStep(2);
      return;
    }

    const allSecItems = [...page1Parts, ...page2Parts].flatMap((p) => getPartItems(p, docType));
    const seenStudioKeys = new Set<string>();
    for (const it of allSecItems) {
      if (it.type === 'text' && it.textMode === 'variable') {
        const k = (it.variableKey || '').trim().toLowerCase();
        if (!k) {
          toast.error(`Variable item "${it.label}" has an empty variable key`);
          return;
        }
        if (!/^[a-z][a-z0-9_]*$/.test(k)) {
          toast.error(`Variable key "${k}" is invalid. It must start with a lowercase letter and contain only letters, numbers, and underscores.`);
          return;
        }
        if (seenStudioKeys.has(k)) {
          toast.error(`Duplicate variable key "${k}". Each variable field must have a unique key.`);
          return;
        }
        seenStudioKeys.add(k);
      }
    }

    const now = Date.now();
    const tplId = newId('tpl');
    const verId = newId('tpv');
    const definition = compilePartsIntoTemplateDefinition();

    const tpl: Template = {
      id: tplId,
      company_id: activeCompany?.id ?? null,
      name: trimmed,
      doc_type: docType,
      draft_definition: definition,
      current_version_id: verId,
      has_unpublished_changes: false,
      archived: false,
      created_at: now,
      updated_at: now,
    };

    const ver: TemplateVersion = {
      id: verId,
      template_id: tplId,
      version_no: 1,
      definition,
      definition_hash: `scratch_${now}`,
      created_at: now,
    };

    await db.transaction('rw', db.templates, db.templateVersions, async () => {
      await db.templates.put(tpl);
      await db.templateVersions.put(ver);
    });

    toast.success('Custom template created! Opening Full-Page Studio…');
    navigate(`/templates/${tplId}/builder`);
  };

  const handleProceedToStep2 = () => {
    const trimmed = templateName.trim();
    if (!trimmed || trimmed.length < 2) {
      toast.error('Please enter a template name with at least 2 characters');
      return;
    }
    if (trimmed.length > 80) {
      toast.error('Template name is too long (max 80 characters)');
      return;
    }
    setStep(2);
  };

  const handleProceedToStep3 = () => {
    if (page1Parts.length === 0) {
      toast.error('Please slice at least one layout section on Page 1 first (or pick a 1-click preset)');
      return;
    }
    const blankPart1 = page1Parts.find((p) => !p.name || !p.name.trim());
    if (blankPart1) {
      toast.error('Please ensure all sections on Page 1 have a valid name');
      return;
    }
    if (continuationMode === 'custom_page_2') {
      if (page2Parts.length === 0) {
        toast.error('Please slice at least one layout section on Page 2+ Continuation (or uncheck Page 2 opt-in)');
        return;
      }
      const blankPart2 = page2Parts.find((p) => !p.name || !p.name.trim());
      if (blankPart2) {
        toast.error('Please ensure all sections on Page 2+ have a valid name');
        return;
      }
    }
    setStep(3);
  };

  const dragRect =
    dragStart && dragCurrent
      ? {
          c1: Math.min(dragStart.c, dragCurrent.c),
          c2: Math.max(dragStart.c, dragCurrent.c),
          r1: Math.min(dragStart.r, dragCurrent.r),
          r2: Math.max(dragStart.r, dragCurrent.r),
        }
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Template from Scratch"
        subtitle="Step-by-step Page Architect: 1. Size & Continuation Mode → 2. Slice Page into Parts → 3. Assign Content, Tables & Styles"
        actions={
          <Button variant="ghost" onClick={() => navigate('/templates')}>
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Templates</span>
          </Button>
        }
      />

      {/* Stepper Indicator */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { n: 1, title: '1. Format & Mode', sub: 'Size & Continuation Mode' },
          { n: 2, title: '2. Slice Layout', sub: 'Partition Page into Sections' },
          { n: 3, title: '3. Assign Content', sub: 'Text Fields, Photos & Tables' },
        ].map((s) => (
          <button
            key={s.n}
            onClick={() => {
              if (s.n === 2) handleProceedToStep2();
              else if (s.n === 3) handleProceedToStep3();
              else setStep(1);
            }}
            className={`rounded-xl sm:rounded-2xl border p-2.5 sm:p-3.5 text-left transition-all cursor-pointer ${
              step === s.n
                ? 'border-gold bg-gold-surface shadow-sm'
                : 'border-border bg-card hover:border-primary/40'
            }`}
          >
            <div className="text-[11px] sm:text-xs font-bold uppercase text-gold truncate">{s.title}</div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 hidden sm:block truncate">{s.sub}</div>
          </button>
        ))}
      </div>

      {/* STEP 1: PAGE SIZE, DOCUMENT TYPE & CONTINUATION PAGE MODE */}
      {step === 1 ? (
        <GlassCard className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Template Name *
              </label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. My 6-Part GST Tax Invoice or Clinic Prescription"
                className={templateName.trim().length < 2 ? 'border-amber-400/80 focus:border-amber-400' : ''}
              />
              {templateName.trim().length < 2 && (
                <span className="text-[11px] text-amber-400 block mt-1">
                  Template name must be at least 2 characters
                </span>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Document Category
              </label>
              <Select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocType)}
              >
                {Object.entries(DOC_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <h3 className="font-display text-base font-bold mb-3">
              1. Select Common Invoice / Document Size
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {COMMON_PAGE_SIZES.map((sz) => {
                const active = sz.id === sizeId;
                return (
                  <div
                    key={sz.id}
                    onClick={() => setSizeId(sz.id)}
                    className={`rounded-2xl border p-5 cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                      active
                        ? 'border-gold bg-gold-surface ring-2 ring-gold/40'
                        : 'border-border bg-muted/30 hover:border-primary/40'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-lg font-bold">{sz.title}</span>
                        <FileSpreadsheet className="w-5 h-5 text-gold" />
                      </div>
                      <p className="text-xs text-muted-foreground">{sz.subtitle}</p>
                    </div>
                    <div className="rounded-xl bg-background/60 px-3 py-2 text-xs font-mono text-foreground">
                      {sz.dimensionsLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multi-Page Continuation Opt-In */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-4 rounded-2xl border border-border bg-muted/20">
              <div className="space-y-1 pr-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold">
                    Multi-Page Continuation (Optional)
                  </h3>
                  <span className="rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Optional Opt-In
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  By default, all templates are <strong>Single-Page Documents</strong>. If your invoices have many items that overflow onto Page 2 and Page 3+, INGEN automatically flows the line items table cleanly across pages.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                  Check this box only if you want to design a <strong>separate, customized Page 2+ blueprint</strong> (for example, a condensed header with only invoice number and date).
                </p>
              </div>

              <CloudTooltip
                title="Custom Page 2+ (Optional Opt-In)"
                content="By default, single-page invoices repeat Page 1's header on extra pages. Check this box if you want to design a dedicated, streamlined header and footer specifically for Page 2 and beyond."
              >
                <label className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none bg-background/80 hover:bg-background p-3 rounded-xl border border-border transition-all">
                  <input
                    type="checkbox"
                    checked={continuationMode === 'custom_page_2'}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setContinuationMode(enabled ? 'custom_page_2' : 'repeat_page_1');
                      if (!enabled) setEditingPage('page1');
                    }}
                    className="w-4 h-4 rounded text-gold accent-gold focus:ring-gold cursor-pointer"
                  />
                  <span className="text-xs font-bold text-foreground whitespace-nowrap">
                    Opt-in for Custom Page 2+
                  </span>
                </label>
              </CloudTooltip>
            </div>

            {continuationMode === 'custom_page_2' ? (
              <div className="p-3 rounded-xl border border-gold/40 bg-gold/10 text-xs text-foreground flex items-center gap-2">
                <span className="text-gold font-bold">✓ Opted-in:</span>
                <span>You will be able to switch between <strong>Page 1</strong> and <strong>Page 2+ Continuation</strong> in Steps 2 & 3.</span>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-border bg-muted/10 text-xs text-muted-foreground flex items-center gap-2">
                <span>📄 <strong>Single-Page Mode (Active):</strong> You only need to design Page 1. Clean and simple.</span>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="gold" size="lg" onClick={handleProceedToStep2}>
              <span>Next: Slice Page into Parts →</span>
            </Button>
          </div>
        </GlassCard>
      ) : null}

      {/* STEP 2 & STEP 3: INTERACTIVE BLUEPRINT SLICER + SECTION-INTERNAL FREEFORM CONTENT EDITOR */}
      {step === 2 || step === 3 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/*Hidden file input for custom image uploads inside a section*/}
          <input
            ref={customImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCustomImageUpload}
          />

          {/* Left Interactive Page Blueprint Grid + Active Section Freeform Canvas */}
          <GlassCard className="lg:col-span-7 p-5 space-y-4">
            {/* Continuation Mode & Page 1 / Page 2+ Switcher Bar */}
            {continuationMode === 'custom_page_2' ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold-surface p-2 sm:p-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gold uppercase tracking-wider hidden sm:inline">Active Page:</span>
                  <div className="inline-flex rounded-lg border border-border bg-background p-0.5 shadow-xs">
                    <CloudTooltip
                      title="Page 1 Primary Blueprint"
                      content="The primary first page of your invoice. Includes your business logo, header, client details, and initial line items. For short invoices, this is the only page printed."
                    >
                      <button
                        type="button"
                        onClick={() => setEditingPage('page1')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                          !isEditingPage2
                            ? 'bg-primary text-white shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span>📄 Page 1 Layout ({page1Parts.length})</span>
                      </button>
                    </CloudTooltip>
                    <CloudTooltip
                      title="Page 2+ Continuation Layout"
                      content="Used when invoices have multiple pages of line items. Features a streamlined header to maximize table space for your items."
                    >
                      <button
                        type="button"
                        onClick={() => setEditingPage('page2')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                          isEditingPage2
                            ? 'bg-gold text-gold-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span>📑 Page 2+ Continuation ({page2Parts.length})</span>
                      </button>
                    </CloudTooltip>
                  </div>
                </div>

                <CloudTooltip
                  title="Multi-Page Continuation Active"
                  content="Custom Page 2+ is enabled. Uncheck if you prefer a standard single-page blueprint where Page 1 repeats."
                >
                  <label className="flex items-center gap-2 text-xs font-semibold text-gold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={(e) => {
                        if (!e.target.checked) {
                          setContinuationMode('repeat_page_1');
                          setEditingPage('page1');
                          toast.info('Switched to Single-Page Template.');
                        }
                      }}
                      className="w-4 h-4 rounded text-gold accent-gold focus:ring-gold cursor-pointer"
                    />
                    <span className="text-[11px]">Custom Page 2+ Active</span>
                  </label>
                </CloudTooltip>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 p-2 sm:p-2.5">
                <div className="flex items-center gap-2">
                  <CloudTooltip
                    title="Page 1 Primary Blueprint"
                    content="The primary first page of your invoice. Includes your business logo, header, client details, and initial line items."
                  >
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-white flex items-center gap-1.5 shadow-xs">
                      📄 Page 1 Blueprint ({page1Parts.length} Sections)
                    </span>
                  </CloudTooltip>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Single-Page Template (Standard)
                  </span>
                </div>

                <CloudTooltip
                  title="Opt-in for Custom Page 2+"
                  content="Check this box to design a dedicated, compact layout specifically for multi-page invoices with many items."
                >
                  <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setContinuationMode('custom_page_2');
                          setEditingPage('page2');
                          toast.info('Enabled Page 2+ Continuation Template! You can now switch tabs to design Page 2+.');
                        }
                      }}
                      className="w-4 h-4 rounded text-gold accent-gold focus:ring-gold cursor-pointer"
                    />
                    <span>Opt-in for Custom Page 2+</span>
                  </label>
                </CloudTooltip>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="font-display text-base font-bold">
                  {step === 2
                    ? isEditingPage2
                      ? 'Slice Page 2+ Layout Sections'
                      : 'Slice Page 1 Layout Sections'
                    : isEditingPage2
                    ? 'Place & Customize Page 2+ Content'
                    : 'Place & Customize Page 1 Content'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {step === 2
                    ? 'Partition the page into layout sections. Use presets below or split sections.'
                    : 'Select any layout section on the overview below to add and position text, photos, or tables.'}
                </p>
              </div>

              {step === 2 ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFillRemainingSpace}
                    title="Fill any unassigned grid cells to cover 100% of the page"
                    className="shrink-0 text-xs"
                  >
                    ➕ Fill Space (100%)
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Step 2 1-Click Slicing Presets Bar */}
            {step === 2 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap text-xs">
                  <span className="text-muted-foreground text-[11px] font-medium shrink-0 mr-0.5">Presets:</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => applyQuickGridPreset('6_parts')}
                    className="text-xs h-7 px-2.5 border border-gold/40 text-gold shrink-0 whitespace-nowrap"
                  >
                    📑 6-Section
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => applyQuickGridPreset('standard_5')}
                    className="text-xs h-7 px-2.5 shrink-0 whitespace-nowrap"
                  >
                    ⚡ 5-Section
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => applyQuickGridPreset('rx_prescription')}
                    className="text-xs h-7 px-2.5 shrink-0 whitespace-nowrap"
                  >
                    💊 Rx Prescription
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => applyQuickGridPreset('3_rows')}
                    className="text-xs h-7 px-2.5 shrink-0 whitespace-nowrap"
                  >
                    ☰ 3 Rows
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => applyQuickGridPreset('4_rows')}
                    className="text-xs h-7 px-2.5 shrink-0 whitespace-nowrap"
                  >
                    🗂️ 4 Rows
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => applyQuickGridPreset('9_parts')}
                    className="text-xs h-7 px-2.5 shrink-0 whitespace-nowrap"
                  >
                    ⊞ 9-Section
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickGridPreset('clear')}
                    className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive shrink-0 whitespace-nowrap"
                  >
                    🗑️ Clear
                  </Button>
                </div>

                {/* Slicing tools for active section */}
                {activePart ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-sky-950/20 border border-sky-500/20 text-xs">
                    <span className="text-[11px] text-sky-200 truncate max-w-[200px] sm:max-w-none">
                      Active: <strong>{activePart.name}</strong> (c {activePart.colStart + 1}–{activePart.colEnd + 1}, r {activePart.rowStart + 1}–{activePart.rowEnd + 1})
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSplitHorizontally(activePart.id)}
                        disabled={activePart.rowEnd - activePart.rowStart < 1}
                        className="text-[11px] h-6 px-2 shrink-0 whitespace-nowrap"
                        title="Split this section into top & bottom halves"
                      >
                        <Rows className="w-3 h-3 mr-1" />
                        Split Horiz
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSplitVertically(activePart.id)}
                        disabled={activePart.colEnd - activePart.colStart < 1}
                        className="text-[11px] h-6 px-2 shrink-0 whitespace-nowrap"
                        title="Split this section into left & right halves"
                      >
                        <Columns className="w-3 h-3 mr-1" />
                        Split Vert
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* =====================================================================
                STEP 3: ACTIVE SECTION FREEFORM CANVAS (DRAG & DROP ITEMS INSIDE SECTION)
               ===================================================================== */}
            {step === 3 && activePart ? (
              <div className="rounded-2xl border-2 border-gold/60 bg-slate-950/90 p-3.5 space-y-3 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-gold text-gold-foreground text-[11px] font-bold uppercase tracking-wider shrink-0">
                      Sec #{parts.findIndex((p) => p.id === activePart.id) + 1}
                    </span>
                    <span className="font-display text-sm font-bold text-foreground truncate max-w-[140px] sm:max-w-none">
                      {activePart.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateActivePart((p) => ({
                          ...p,
                          mode: p.mode === 'fixed' ? 'variable' : 'fixed',
                        }))
                      }
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border cursor-pointer transition-all shrink-0 ${
                        activePart.mode === 'fixed'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400/50 hover:bg-sky-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 hover:bg-emerald-500/30'
                      }`}
                      title="Click to toggle whether this layout section is Fixed (repeats on pages) or Variable (dynamic flow)"
                    >
                      {activePart.mode === 'fixed' ? '🔵 Fixed' : '🟢 Variable'}
                    </button>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {activePartItems.length} item(s) in section
                  </span>
                </div>

                {/* Add Item Inside Active Section Toolbar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap">
                  <span className="text-[11px] font-bold text-gold shrink-0 mr-0.5">
                    + Add:
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddItemToSection(activePart.id, 'text', 'fixed')}
                    className="text-xs h-7 px-2.5 bg-sky-500/15 text-sky-200 border border-sky-500/40 hover:bg-sky-500/25 cursor-pointer shrink-0 whitespace-nowrap"
                    title="Add a Fixed Text Field inside this section"
                  >
                    <Type className="w-3.5 h-3.5 mr-1" />
                    <span>+ Fixed Text</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddItemToSection(activePart.id, 'text', 'variable')}
                    className="text-xs h-7 px-2.5 bg-amber-500/15 text-amber-200 border border-amber-500/40 hover:bg-amber-500/25 cursor-pointer shrink-0 whitespace-nowrap"
                    title="Add a Variable Text Field with a Key & Default Value"
                  >
                    <Tag className="w-3.5 h-3.5 mr-1" />
                    <span>+ Variable</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddItemToSection(activePart.id, 'image')}
                    className="text-xs h-7 px-2.5 bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 cursor-pointer shrink-0 whitespace-nowrap"
                    title="Add an Image / Photo / Logo inside this section"
                  >
                    <ImageIcon className="w-3.5 h-3.5 mr-1" />
                    <span>+ Image</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddItemToSection(activePart.id, 'items_table')}
                    className="text-xs h-7 px-2.5 bg-emerald-500/15 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/25 cursor-pointer shrink-0 whitespace-nowrap"
                    title="Add a customizable Line Items Table inside this section"
                  >
                    <TableIcon className="w-3.5 h-3.5 mr-1" />
                    <span>+ Table</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddItemToSection(activePart.id, 'totals_box')}
                    className="text-xs h-7 px-2.5 bg-purple-500/15 text-purple-200 border border-purple-500/40 hover:bg-purple-500/25 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Calculator className="w-3.5 h-3.5 mr-1" />
                    <span>+ Totals</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddItemToSection(activePart.id, 'upi_qr')}
                    className="text-xs h-7 px-2.5 bg-teal-500/15 text-teal-200 border border-teal-500/40 hover:bg-teal-500/25 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <QrCode className="w-3.5 h-3.5 mr-1" />
                    <span>+ UPI QR</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddItemToSection(activePart.id, 'signature')}
                    className="text-xs h-7 px-2.5 bg-indigo-500/15 text-indigo-200 border border-indigo-500/40 hover:bg-indigo-500/25 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <PenTool className="w-3.5 h-3.5 mr-1" />
                    <span>+ Signature</span>
                  </Button>
                </div>

                {/* Zoomed Section-Internal Freeform Drag & Resize Canvas */}
                <div
                  ref={sectionCanvasRef}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const kind =
                      e.dataTransfer.getData('application/ingen-kind') ||
                      e.dataTransfer.getData('text/plain');
                    if (kind && sectionCanvasRef.current) {
                      const rect = sectionCanvasRef.current.getBoundingClientRect();
                      const dropX = Math.round(((e.clientX - rect.left) / Math.max(1, rect.width)) * 100);
                      const dropY = Math.round(((e.clientY - rect.top) / Math.max(1, rect.height)) * 100);
                      handleAddItemToSection(activePart.id, kind as SectionItemType, 'fixed', { x: dropX, y: dropY });
                    }
                  }}
                  style={{
                    height: Math.max(
                      180,
                      Math.min(280, (activePart.rowEnd - activePart.rowStart + 1) * 48)
                    ),
                    touchAction: 'none',
                  }}
                  className={`relative w-full rounded-xl border-2 overflow-hidden select-none shadow-inner ${
                    activePart.mode === 'fixed'
                      ? 'border-sky-400/50 bg-slate-900/90'
                      : 'border-emerald-400/50 bg-slate-900/90'
                  }`}
                >
                  {/* Subtle 10% x 10% alignment guide grid inside section */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, rgba(148,163,184,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.25) 1px, transparent 1px)',
                      backgroundSize: '10% 20%',
                    }}
                  />

                  {activePartItems.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                      <p className="text-xs font-semibold text-foreground">
                        This layout section is currently empty
                      </p>
                      <p className="text-[11px] mt-0.5">
                        Click <strong>+ Fixed Text Field</strong>, <strong>+ Variable Text Field</strong>, <strong>+ Image / Photo</strong>, or <strong>+ Table</strong> above to place items inside this section!
                      </p>
                    </div>
                  ) : (
                    activePartItems.map((item) => {
                      const isItemSelected = activeItem?.id === item.id;
                      const compiledText = getItemCompiledText(item);

                      return (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveItemId(item.id);
                          }}
                          onPointerDown={(e) =>
                            handleStartItemPointerDrag(
                              e,
                              activePart.id,
                              item,
                              'move',
                              sectionCanvasRef.current
                            )
                          }
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveItemId(item.id);
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              partId: activePart.id,
                              itemId: item.id,
                            });
                          }}
                          style={{
                            position: 'absolute',
                            left: `${item.x}%`,
                            top: `${item.y}%`,
                            width: `${item.w}%`,
                            height: `${item.h}%`,
                          }}
                          className={`group rounded-lg border p-1 relative flex flex-col justify-between cursor-grab active:cursor-grabbing transition-shadow overflow-hidden ${
                            isItemSelected
                              ? 'border-gold ring-2 ring-gold/60 bg-slate-950/95 z-30 shadow-xl'
                              : item.type === 'text' && item.textMode === 'variable'
                              ? 'border-amber-400/70 bg-amber-950/35 hover:border-amber-300 z-10'
                              : item.type === 'image'
                              ? 'border-gold/60 bg-amber-950/25 hover:border-gold z-10'
                              : item.type === 'items_table'
                              ? 'border-emerald-400/70 bg-emerald-950/30 hover:border-emerald-300 z-10'
                              : 'border-sky-400/60 bg-sky-950/35 hover:border-sky-300 z-10'
                          }`}
                        >
                          {/* Top mini badge bar on item: subtle overlay for small boxes so it never squashes text */}
                          {item.h > 26 ? (
                            <div className="flex items-center justify-between gap-1 pointer-events-none mb-0.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider truncate px-1 rounded bg-black/50 text-gold">
                                {item.type === 'text'
                                  ? item.textMode === 'variable'
                                    ? `🔤 VAR: ${item.variableKey || 'field'}`
                                    : '📌 FIXED TEXT'
                                  : item.type === 'image'
                                  ? '🖼️ IMAGE'
                                  : item.type === 'items_table'
                                  ? '📊 TABLE'
                                  : item.type.toUpperCase()}
                              </span>
                              <span className="text-[8px] font-mono text-muted-foreground">
                                {item.x}%,{item.y}% ({item.w}×{item.h}%)
                              </span>
                            </div>
                          ) : (
                            <div className="absolute top-0.5 left-1 z-20 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                              <span className="text-[7.5px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-black/75 text-gold border border-white/10">
                                {item.type === 'text'
                                  ? item.textMode === 'variable'
                                    ? `🔤 ${item.variableKey || 'var'}`
                                    : '📌 TEXT'
                                  : item.type.toUpperCase()}
                              </span>
                            </div>
                          )}

                          {/* Item Quick Action Toolbar when Selected */}
                          {isItemSelected ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="absolute top-1 right-1 z-40 flex items-center gap-0.5 bg-slate-900/95 border border-gold/60 rounded px-1 py-0.5 shadow-lg text-[9px]"
                            >
                              <button
                                type="button"
                                onClick={() => handleDuplicateItemInSection(activePart.id, item.id)}
                                className="px-1 py-0.5 rounded hover:bg-white/15 text-sky-300 cursor-pointer flex items-center gap-0.5"
                                title="Duplicate item inside section"
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItemFromSection(activePart.id, item.id)}
                                className="px-1 py-0.5 rounded hover:bg-rose-500/30 text-rose-300 cursor-pointer flex items-center gap-0.5"
                                title="Delete item (Del)"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : null}

                          {/* Live visual content inside item box */}
                          <div className="flex-1 flex flex-col justify-center overflow-hidden my-0.5 pointer-events-none">
                            {item.type === 'text' ? (
                              <div
                                style={{
                                  fontFamily: item.fontFamily || 'inherit',
                                  textAlign: item.textAlign ?? 'left',
                                  color:
                                    item.textColor === 'theme.primary'
                                      ? '#A78BFA'
                                      : item.textColor || '#F8FAFC',
                                  fontWeight: item.fontWeight ?? 400,
                                }}
                                className="text-[10px] leading-snug break-words overflow-hidden"
                              >
                                {item.textMode === 'variable' ? (
                                  <div>
                                    {item.variablePrefix ? (
                                      <span className="text-muted-foreground">
                                        {item.variablePrefix}
                                      </span>
                                    ) : null}
                                    <span className="px-1 py-0.2 rounded bg-amber-500/25 text-amber-200 border border-amber-400/40 font-mono text-[9.5px]">
                                      {item.variableValue || `{{${item.variableKey || 'variable'}}}`}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="whitespace-pre-line">{compiledText}</div>
                                )}
                              </div>
                            ) : item.type === 'image' ? (
                              item.imageDataUrl ? (
                                <img
                                  src={item.imageDataUrl}
                                  alt={item.label}
                                  className="w-full h-full object-contain rounded"
                                />
                              ) : (item.imageSource ?? 'company_logo') === 'company_logo' && companyLogoUrl ? (
                                <img
                                  src={companyLogoUrl}
                                  alt="Company Logo"
                                  className="w-full h-full object-contain rounded"
                                />
                              ) : item.imageSource === 'company_signature' && companySignatureUrl ? (
                                <img
                                  src={companySignatureUrl}
                                  alt="Signature"
                                  className="w-full h-full object-contain rounded"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center text-center text-gold gap-0.5">
                                  <ImageIcon className="w-5 h-5" />
                                  <span className="text-[9px] font-semibold truncate max-w-full">
                                    {item.imageSource === 'company_signature'
                                      ? 'Authorised Signature'
                                      : 'Company Logo'}
                                  </span>
                                </div>
                              )
                            ) : item.type === 'items_table' ? (
                              <div className="w-full h-full flex flex-col justify-between rounded border border-emerald-500/30 bg-slate-950/70 text-[8.5px] p-1">
                                <div className="flex items-center justify-between font-bold text-emerald-300 border-b border-emerald-500/20 pb-0.5">
                                  <span>
                                    {(item.tableColumns ?? DEFAULT_TABLE_COLUMNS)
                                      .filter((c) => c.enabled !== false)
                                      .map((c) => c.header)
                                      .join('  |  ')}
                                  </span>
                                  <span className="text-[7.5px] uppercase text-gold">
                                    {item.tableDesign || 'card'}
                                  </span>
                                </div>
                                <div className="text-muted-foreground flex justify-between">
                                  <span>Sample Line Item 1</span>
                                  <span className="font-mono text-foreground">₹15,000.00</span>
                                </div>
                              </div>
                            ) : item.type === 'upi_qr' ? (
                              <div className="flex items-center gap-1.5 text-teal-300">
                                <QrCode className="w-5 h-5 shrink-0" />
                                <div className="text-[9px] leading-tight truncate">
                                  <div className="font-bold">UPI QR</div>
                                  <div className="opacity-75">{item.qrCaption || 'Scan to pay'}</div>
                                </div>
                              </div>
                            ) : item.type === 'totals_box' ? (
                              <div className="text-[9px] space-y-0.5 px-1">
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Subtotal / GST</span>
                                  <span>₹15,000</span>
                                </div>
                                <div className="flex justify-between font-bold text-gold">
                                  <span>Grand Total</span>
                                  <span>₹17,700</span>
                                </div>
                              </div>
                            ) : item.type === 'signature' ? (
                              <div className="text-[9px] text-right space-y-0.5 pr-1">
                                <div className="ml-auto w-16 border-b border-indigo-400/60" />
                                <div className="text-indigo-200 font-semibold truncate">
                                  {item.signatureCaption || 'Authorised Signatory'}
                                </div>
                              </div>
                            ) : (
                              <div className="text-[9px] text-emerald-300 font-semibold">
                                {item.label}
                              </div>
                            )}
                          </div>

                          {/* Bottom-Right Resize Handle on Item */}
                          <div
                            onPointerDown={(e) =>
                              handleStartItemPointerDrag(
                                e,
                                activePart.id,
                                item,
                                'resize',
                                sectionCanvasRef.current
                              )
                            }
                            title="Drag corner to resize this item inside the section"
                            className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-xs bg-gold border border-black cursor-se-resize z-40 flex items-center justify-center hover:scale-125 transition-transform"
                          >
                            <div className="w-1.5 h-1.5 bg-black/70" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}

            {/*
              MATHEMATICAL 12x12 INTERACTIVE PAGE BLUEPRINT OVERVIEW
              - Step 2: Drag across cells to slice layout sections
              - Step 3: Layout sections are LOCKED in place; clicking a section selects it, and its internal items are rendered proportionally inside!
            */}
            <div className="space-y-1.5">
              {step === 3 ? (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                  <span className="font-semibold text-foreground">
                    🗺️ Full Page Layout Overview (Click any section below to switch active section)
                  </span>
                  <span>Sections are locked in their Step 2 grid coordinates</span>
                </div>
              ) : null}

              <div className="flex justify-center py-1 select-none">
                <div
                  ref={boardRef}
                  onPointerDown={handleBoardPointerDown}
                  onPointerMove={(e) => {
                    if (step === 2) {
                      handleBoardPointerMove(e);
                    }
                  }}
                  onPointerUp={() => {
                    if (step === 2 && dragStart) {
                      finishDragSelection();
                    }
                  }}
                  onPointerCancel={() => {
                    setDragStart(null);
                    setDragCurrent(null);
                    setHasDraggedAcrossCells(false);
                  }}
                  style={{
                    width: sizeId === 'THERMAL_80' ? 276 : 432,
                    height: sizeId === 'A5' ? 460 : 520,
                    touchAction: 'none',
                  }}
                  className={`relative rounded-xl bg-slate-950 border-2 border-sky-500/40 shadow-2xl overflow-hidden ${
                    step === 2 ? 'cursor-crosshair' : 'cursor-pointer'
                  }`}
                >
                  {/* Layer 1: Fixed 12x12 Visual Grid Cells */}
                  <div className="absolute inset-0 pointer-events-none">
                    {Array.from({ length: GRID_ROWS }).map((_, r) =>
                      Array.from({ length: GRID_COLS }).map((__, c) => (
                        <div
                          key={`${r}_${c}`}
                          style={{
                            position: 'absolute',
                            left: `${(c / GRID_COLS) * 100}%`,
                            top: `${(r / GRID_ROWS) * 100}%`,
                            width: `${100 / GRID_COLS}%`,
                            height: `${100 / GRID_ROWS}%`,
                          }}
                          className="border border-sky-500/15 bg-sky-950/15 flex items-center justify-center text-[8px] font-mono text-sky-400/20"
                        >
                          {r + 1},{c + 1}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Layer 2: Sliced Layout Sections (Locked in Step 3; shows internal items) */}
                  {parts.map((part, idx) => {
                    const isSel = part.id === activePart?.id;
                    const isHovered = dragHoverPartId === part.id;
                    const isFixed = part.mode === 'fixed';
                    const sectionItems = getPartItems(part, docType);
                    const colsSpan = part.colEnd - part.colStart + 1;
                    const rowsSpan = part.rowEnd - part.rowStart + 1;
                    const widthPct = Math.round((colsSpan / GRID_COLS) * 100);
                    const heightPct = Math.round((rowsSpan / GRID_ROWS) * 100);

                    return (
                      <div
                        key={part.id}
                        onClick={() => setActivePartId(part.id)}
                        onDragOver={(e) => {
                          if (step === 3) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'copy';
                            if (dragHoverPartId !== part.id) setDragHoverPartId(part.id);
                          }
                        }}
                        onDragLeave={() => {
                          if (step === 3 && dragHoverPartId === part.id) {
                            setDragHoverPartId(null);
                          }
                        }}
                        onDrop={(e) => {
                          if (step === 3) {
                            e.preventDefault();
                            const kind =
                              e.dataTransfer.getData('application/ingen-kind') ||
                              e.dataTransfer.getData('text/plain');
                            if (kind) {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const dropX = Math.round(((e.clientX - rect.left) / Math.max(1, rect.width)) * 100);
                              const dropY = Math.round(((e.clientY - rect.top) / Math.max(1, rect.height)) * 100);
                              handleAddItemToSection(part.id, kind as SectionItemType, 'fixed', { x: dropX, y: dropY });
                            }
                            setDragHoverPartId(null);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: step === 2 ? `calc(${(part.colStart / GRID_COLS) * 100}% + 2px)` : `${(part.colStart / GRID_COLS) * 100}%`,
                          top: step === 2 ? `calc(${(part.rowStart / GRID_ROWS) * 100}% + 2px)` : `${(part.rowStart / GRID_ROWS) * 100}%`,
                          width: step === 2 ? `calc(${(colsSpan / GRID_COLS) * 100}% - 4px)` : `${(colsSpan / GRID_COLS) * 100}%`,
                          height: step === 2 ? `calc(${(rowsSpan / GRID_ROWS) * 100}% - 4px)` : `${(rowsSpan / GRID_ROWS) * 100}%`,
                        }}
                        className={`z-10 transition-all select-none overflow-hidden ${
                          step === 2
                            ? 'rounded-lg border-2 p-1 flex flex-col justify-between bg-slate-900/85 border-sky-400 text-sky-100 hover:border-sky-300 cursor-crosshair'
                            : `relative border ${isFixed ? 'border-sky-400/40 bg-sky-500/10 text-sky-100' : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'} cursor-pointer`
                        } ${
                          isHovered
                            ? 'ring-2 ring-gold bg-gold/20 z-30'
                            : isSel
                            ? 'ring-2 ring-gold shadow-lg z-20 bg-slate-900/90'
                            : 'opacity-90 hover:opacity-100'
                        }`}
                      >
                        {step === 2 ? (
                          <>
                            <div className="flex items-center justify-between gap-1 z-20 pointer-events-none">
                              <span className="text-[9px] font-bold uppercase tracking-wider truncate px-1 rounded bg-black/50">
                                #{idx + 1} {part.name} ({isFixed ? 'FIXED' : 'VAR'})
                              </span>
                              <div className="flex items-center gap-1 pointer-events-auto">
                                <span className="text-[8px] font-mono opacity-80">
                                  {widthPct}%×{heightPct}%
                                </span>
                                <button
                                  type="button"
                                  data-part-delete="true"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const next = parts.filter((p) => p.id !== part.id);
                                    setParts(next);
                                    if (activePart?.id === part.id) {
                                      setActivePartId(next[0]?.id ?? '');
                                    }
                                  }}
                                  title="Remove this layout section"
                                  className="w-4 h-4 rounded bg-black/40 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] leading-none cursor-pointer"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-1">
                              <span className="text-xs font-semibold text-sky-200 truncate max-w-full">
                                {part.name}
                              </span>
                              <span className="text-[9px] text-sky-400/80 font-mono mt-0.5">
                                Cols {part.colStart + 1}–{part.colEnd + 1} • Rows {part.rowStart + 1}–{part.rowEnd + 1} ({part.mode.toUpperCase()})
                              </span>
                            </div>
                          </>
                        ) : (
                          /* Step 3 Miniature Proportional Preview of Section Items (Also Draggable In-Place!) */
                          <>
                            {/* Step 3: Floating Unobtrusive Section Identifier Tag (Does NOT consume vertical layout space) */}
                            <div className="absolute top-1 left-1.5 z-30 pointer-events-none flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                              <span className={`text-[8px] font-bold uppercase tracking-wider truncate px-1 py-0.5 rounded bg-black/75 backdrop-blur-xs border border-white/10 ${isFixed ? 'text-sky-300' : 'text-emerald-300'}`}>
                                #{idx + 1} {part.name}
                              </span>
                            </div>

                            {/* Step 3: 100% Inset-0 Section Canvas (Zero dead space; items placed at 0% reach exact top edge) */}
                            <div className="absolute inset-0 overflow-hidden bg-slate-950/40">
                              {sectionItems.map((it) => {
                                const isItSel = isSel && activeItem?.id === it.id;
                                return (
                                  <div
                                    key={it.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActivePartId(part.id);
                                      setActiveItemId(it.id);
                                    }}
                                    onPointerDown={(e) =>
                                      handleStartItemPointerDrag(
                                        e,
                                        part.id,
                                        it,
                                        'move',
                                        (e.currentTarget as HTMLElement).parentElement
                                      )
                                    }
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setActivePartId(part.id);
                                      setActiveItemId(it.id);
                                      setContextMenu({
                                        x: e.clientX,
                                        y: e.clientY,
                                        partId: part.id,
                                        itemId: it.id,
                                      });
                                    }}
                                    style={{
                                      position: 'absolute',
                                      left: `${it.x}%`,
                                      top: `${it.y}%`,
                                      width: `${it.w}%`,
                                      height: `${it.h}%`,
                                    }}
                                    className={`rounded-xs border px-1 py-0.5 overflow-hidden text-[7.5px] leading-tight transition-all cursor-grab active:cursor-grabbing ${
                                      isItSel
                                        ? 'border-gold bg-gold/25 text-white font-bold z-20'
                                        : it.type === 'text' && it.textMode === 'variable'
                                        ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                                        : it.type === 'image'
                                        ? 'border-gold/50 bg-gold/15 text-gold'
                                        : it.type === 'items_table'
                                        ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                                        : 'border-sky-400/40 bg-sky-500/15 text-sky-100'
                                    }`}
                                  >
                                    {it.type === 'image'
                                      ? `🖼️ ${it.label}`
                                      : it.type === 'items_table'
                                      ? `📊 ${it.label} (${it.tableDesign || 'card'})`
                                      : it.type === 'text' && it.textMode === 'variable'
                                      ? `${it.variablePrefix || ''}${it.variableValue || `{{${it.variableKey}}}`}`
                                      : getItemCompiledText(it)}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Layer 3: Live Drag Selection Overlay (Step 2 Only) */}
                  {dragRect ? (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${(dragRect.c1 / GRID_COLS) * 100}%`,
                        top: `${(dragRect.r1 / GRID_ROWS) * 100}%`,
                        width: `${((dragRect.c2 - dragRect.c1 + 1) / GRID_COLS) * 100}%`,
                        height: `${((dragRect.r2 - dragRect.r1 + 1) / GRID_ROWS) * 100}%`,
                      }}
                      className="z-30 pointer-events-none rounded-lg border-2 border-dashed border-sky-300 bg-sky-500/35 text-white flex items-center justify-center font-mono text-xs font-bold shadow-xl"
                    >
                      ✂️ SLICE ({dragRect.c2 - dragRect.c1 + 1} cols × {dragRect.r2 - dragRect.r1 + 1} rows)
                    </div>
                  ) : null}

                  {/* Layer 4: Right-Click Context Menu for Section Items */}
                  {contextMenu ? (
                    <div
                      style={{
                        position: 'fixed',
                        left: Math.min(window.innerWidth - 220, contextMenu.x),
                        top: Math.min(window.innerHeight - 220, contextMenu.y),
                      }}
                      className="z-50 w-56 rounded-xl border border-gold/40 bg-slate-950/95 backdrop-blur-md p-1.5 shadow-2xl text-xs space-y-0.5 select-none"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <div className="px-2 py-1 text-[10px] font-mono text-gold font-bold uppercase tracking-wider border-b border-border/50">
                        Section Item Options
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleDuplicateItemInSection(contextMenu.partId, contextMenu.itemId);
                          setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/10 text-foreground cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-sky-400" />
                        <span>Duplicate Item</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updatePartItems(contextMenu.partId, (items) =>
                            items.map((it) =>
                              it.id === contextMenu.itemId && it.type === 'text'
                                ? {
                                    ...it,
                                    textMode: it.textMode === 'variable' ? 'fixed' : 'variable',
                                    variableKey: it.variableKey || 'custom_field',
                                    variableLabel: it.variableLabel || 'Custom Field',
                                    variableValue: it.variableValue || 'Sample Value',
                                  }
                                : it
                            )
                          );
                          setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/10 text-foreground cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Toggle Fixed / Variable Text</span>
                      </button>
                      <div className="my-1 border-t border-border/50" />
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteItemFromSection(contextMenu.partId, contextMenu.itemId);
                          setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-rose-500/20 text-rose-400 cursor-pointer font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Delete Item (Del)</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Right Inspector for Selected Section & Selected Item Inside Section */}
          <GlassCard className="lg:col-span-5 p-5 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-display text-base font-bold">
                    {activePart
                      ? step === 2
                        ? `Section Settings: ${activePart.name}`
                        : `Customize Section: ${activePart.name}`
                      : step === 2
                      ? 'Select or Draw a Section'
                      : 'Select a Layout Section'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {step === 2
                      ? 'Configure whether this section is Fixed or Variable, or split it into smaller sections.'
                      : 'Add Fixed/Variable Text Fields, Photos, or Tables inside this section and customize them.'}
                  </p>
                </div>
              </div>

              {activePart ? (
                <div className="space-y-4">
                  {/* Section Name & Fixed/Variable Toggle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1 font-medium">
                        Layout Section Name
                      </label>
                      <Input
                        value={activePart.name}
                        onChange={(e) =>
                          setParts((prev) =>
                            prev.map((p) =>
                              p.id === activePart.id ? { ...p, name: e.target.value } : p
                            )
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1 font-medium">
                        Section Type (Fixed / Variable)
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateActivePart((p) => ({ ...p, mode: 'fixed' }))
                          }
                          className={`px-2.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                            activePart.mode === 'fixed'
                              ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                              : 'border-border bg-muted/30 text-muted-foreground'
                          }`}
                        >
                          🔵 Fixed
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateActivePart((p) => ({ ...p, mode: 'variable' }))
                          }
                          className={`px-2.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                            activePart.mode === 'variable'
                              ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                              : 'border-border bg-muted/30 text-muted-foreground'
                          }`}
                        >
                          🟢 Variable
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* STEP 2 SPECIFIC INSPECTOR */}
                  {step === 2 ? (
                    <div className="space-y-4">
                      {/* Exact Grid Bounds */}
                      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold">Grid Coordinates (12×12 Blueprint)</span>
                          <span className="font-mono text-gold">
                            Cols {activePart.colStart + 1}–{activePart.colEnd + 1} • Rows{' '}
                            {activePart.rowStart + 1}–{activePart.rowEnd + 1}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[11px]">
                          <div>
                            <span className="text-muted-foreground block">Start Col</span>
                            <Input
                              type="number"
                              min={1}
                              max={activePart.colEnd + 1}
                              value={activePart.colStart + 1}
                              onChange={(e) => {
                                const v = Math.max(0, Math.min(activePart.colEnd, Number(e.target.value) - 1));
                                setParts((prev) =>
                                  prev.map((p) => (p.id === activePart.id ? { ...p, colStart: v } : p))
                                );
                              }}
                            />
                          </div>
                          <div>
                            <span className="text-muted-foreground block">End Col</span>
                            <Input
                              type="number"
                              min={activePart.colStart + 1}
                              max={12}
                              value={activePart.colEnd + 1}
                              onChange={(e) => {
                                const v = Math.max(activePart.colStart, Math.min(11, Number(e.target.value) - 1));
                                setParts((prev) =>
                                  prev.map((p) => (p.id === activePart.id ? { ...p, colEnd: v } : p))
                                );
                              }}
                            />
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Start Row</span>
                            <Input
                              type="number"
                              min={1}
                              max={activePart.rowEnd + 1}
                              value={activePart.rowStart + 1}
                              onChange={(e) => {
                                const v = Math.max(0, Math.min(activePart.rowEnd, Number(e.target.value) - 1));
                                setParts((prev) =>
                                  prev.map((p) => (p.id === activePart.id ? { ...p, rowStart: v } : p))
                                );
                              }}
                            />
                          </div>
                          <div>
                            <span className="text-muted-foreground block">End Row</span>
                            <Input
                              type="number"
                              min={activePart.rowStart + 1}
                              max={12}
                              value={activePart.rowEnd + 1}
                              onChange={(e) => {
                                const v = Math.max(activePart.rowStart, Math.min(11, Number(e.target.value) - 1));
                                setParts((prev) =>
                                  prev.map((p) => (p.id === activePart.id ? { ...p, rowEnd: v } : p))
                                );
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section Slicing Actions */}
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground block font-medium">
                          Slicing Tools
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleSplitHorizontally(activePart.id)}
                            disabled={activePart.rowEnd - activePart.rowStart < 1}
                            className="w-full text-xs"
                          >
                            <Rows className="w-3.5 h-3.5 mr-1.5" />
                            Split Horizontally
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleSplitVertically(activePart.id)}
                            disabled={activePart.colEnd - activePart.colStart < 1}
                            className="w-full text-xs"
                          >
                            <Columns className="w-3.5 h-3.5 mr-1.5" />
                            Split Vertically
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleFillRemainingSpace}
                          className="w-full text-xs"
                        >
                          ➕ Fill Any Remaining Space on Page (100% Coverage)
                        </Button>
                      </div>

                      <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-3 text-xs text-sky-200/90 leading-relaxed">
                        💡 <strong>How Layout Sections Work:</strong> Once you slice your page (e.g., into 6 sections), click <strong>Next: Assign Content →</strong>. Your layout sections will stay locked in place while you freely drag & position multiple text fields, variables, photos, and tables inside each section!
                      </div>
                    </div>
                  ) : (
                    /* =====================================================================
                       STEP 3 SPECIFIC INSPECTOR: ITEMS INSIDE THE SELECTED LAYOUT SECTION
                       ===================================================================== */
                    <div className="space-y-4">
                      {/* List of Items Inside Active Section */}
                      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-bold text-foreground">
                            Items in Section ({activePartItems.length})
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Tap item to customize
                          </span>
                        </div>

                        {activePartItems.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {activePartItems.map((it) => {
                              const isItSel = activeItem?.id === it.id;
                              return (
                                <button
                                  key={it.id}
                                  type="button"
                                  onClick={() => setActiveItemId(it.id)}
                                  className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 cursor-pointer transition-all max-w-full ${
                                    isItSel
                                      ? 'border-gold bg-gold-surface text-foreground font-bold ring-1 ring-gold/50'
                                      : 'border-border bg-background/60 text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  <span>
                                    {it.type === 'text'
                                      ? it.textMode === 'variable'
                                        ? '🔤'
                                        : '📌'
                                      : it.type === 'image'
                                      ? '🖼️'
                                      : it.type === 'items_table'
                                      ? '📊'
                                      : '✨'}
                                  </span>
                                  <span className="truncate max-w-[120px] sm:max-w-[180px]">{it.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            No items in this section yet. Use the <strong>+ Add</strong> toolbar above the canvas to add text fields, photos, or tables.
                          </p>
                        )}
                      </div>

                      {/* Inspector for the Selected Item inside the Section */}
                      {activeItem ? (
                        <div className="space-y-4 rounded-xl border border-gold/30 bg-card/60 p-3.5">
                          <div className="flex items-center justify-between border-b border-border pb-2.5">
                            <div className="flex-1 mr-2">
                              <label className="text-[10px] uppercase tracking-wider text-gold font-bold block mb-0.5">
                                Selected Item Label
                              </label>
                              <Input
                                value={activeItem.label}
                                onChange={(e) =>
                                  updateActiveItem((it) => ({ ...it, label: e.target.value }))
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-1 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDuplicateItemInSection(activePart.id, activeItem.id)
                                }
                                className="h-8 px-2 text-xs"
                                title="Duplicate Item"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDeleteItemFromSection(activePart.id, activeItem.id)
                                }
                                className="h-8 px-2 text-xs text-rose-400 hover:bg-rose-500/20"
                                title="Delete Item (Del)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Collapsible Coordinates Inside Section (X%, Y%, Width%, Height%) */}
                          <details className="group rounded-xl border border-border/60 bg-background/40 p-2.5 text-xs">
                            <summary className="flex items-center justify-between font-semibold cursor-pointer select-none text-[11px] text-muted-foreground hover:text-foreground">
                              <span>📐 Fine Position &amp; Size ({activeItem.x}%, {activeItem.y}% • {activeItem.w}×{activeItem.h}%)</span>
                              <span className="text-[10px] text-gold group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="grid grid-cols-4 gap-2 pt-2.5 text-[11px]">
                              <div>
                                <span className="text-muted-foreground block mb-0.5">X (%)</span>
                                <Input
                                  type="number"
                                  min={0}
                                  max={95}
                                  value={activeItem.x}
                                  onChange={(e) => {
                                    const x = Math.max(0, Math.min(95, Number(e.target.value) || 0));
                                    updateActiveItem((it) => ({ ...it, x }));
                                  }}
                                  className="h-7 text-xs font-mono"
                                />
                              </div>
                              <div>
                                <span className="text-muted-foreground block mb-0.5">Y (%)</span>
                                <Input
                                  type="number"
                                  min={0}
                                  max={95}
                                  value={activeItem.y}
                                  onChange={(e) => {
                                    const y = Math.max(0, Math.min(95, Number(e.target.value) || 0));
                                    updateActiveItem((it) => ({ ...it, y }));
                                  }}
                                  className="h-7 text-xs font-mono"
                                />
                              </div>
                              <div>
                                <span className="text-muted-foreground block mb-0.5">Width (%)</span>
                                <Input
                                  type="number"
                                  min={8}
                                  max={100}
                                  value={activeItem.w}
                                  onChange={(e) => {
                                    const w = Math.max(8, Math.min(100, Number(e.target.value) || 20));
                                    updateActiveItem((it) => ({ ...it, w }));
                                  }}
                                  className="h-7 text-xs font-mono"
                                />
                              </div>
                              <div>
                                <span className="text-muted-foreground block mb-0.5">Height (%)</span>
                                <Input
                                  type="number"
                                  min={10}
                                  max={100}
                                  value={activeItem.h}
                                  onChange={(e) => {
                                    const h = Math.max(10, Math.min(100, Number(e.target.value) || 20));
                                    updateActiveItem((it) => ({ ...it, h }));
                                  }}
                                  className="h-7 text-xs font-mono"
                                />
                              </div>
                            </div>
                          </details>

                          {/* ITEM TYPE SPECIFIC CONTROLS */}
                          {activeItem.type === 'text' ? (
                            <div className="space-y-3 pt-2 border-t border-border">
                              {/* Fixed Text Field vs Variable Text Field Toggle */}
                              <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                  Text Field Mode (Fixed vs. Variable)
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateActiveItem((it) => ({
                                        ...it,
                                        textMode: 'fixed',
                                        fixedText:
                                          it.fixedText ||
                                          getItemCompiledText(it) ||
                                          'Static Text',
                                      }))
                                    }
                                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left cursor-pointer transition-all ${
                                      activeItem.textMode !== 'variable'
                                        ? 'border-sky-400 bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/50'
                                        : 'border-border bg-muted/30 text-muted-foreground'
                                    }`}
                                  >
                                    <div>📌 Fixed Text Field</div>
                                    <div className="text-[10px] font-normal opacity-80 mt-0.5">
                                      Stays constant in template (Headings, Company Info, Labels)
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateActiveItem((it) => ({
                                        ...it,
                                        textMode: 'variable',
                                        variableKey: it.variableKey || 'custom_field',
                                        variableLabel: it.variableLabel || it.label || 'Custom Field',
                                        variablePrefix: it.variablePrefix ?? '',
                                        variableValue: it.variableValue || 'Sample Value',
                                      }))
                                    }
                                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left cursor-pointer transition-all ${
                                      activeItem.textMode === 'variable'
                                        ? 'border-amber-400 bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/50'
                                        : 'border-border bg-muted/30 text-muted-foreground'
                                    }`}
                                  >
                                    <div>🔤 Variable Text Field</div>
                                    <div className="text-[10px] font-normal opacity-80 mt-0.5">
                                      Has a Key & Value entered later when generating invoices
                                    </div>
                                  </button>
                                </div>
                              </div>

                              {activeItem.textMode === 'variable' ? (() => {
                                const allOtherVarKeys = [
                                  ...page1Parts.flatMap((p) => p.items || []),
                                  ...page2Parts.flatMap((p) => p.items || []),
                                ]
                                  .filter(
                                    (it) =>
                                      it.id !== activeItem.id &&
                                      it.type === 'text' &&
                                      it.textMode === 'variable'
                                  )
                                  .map((it) => it.variableKey?.trim().toLowerCase());

                                const currentKey = (activeItem.variableKey ?? '').trim().toLowerCase();
                                const isKeyEmpty = !currentKey;
                                const isKeyFormatValid = /^[a-z][a-z0-9_]*$/.test(currentKey);
                                const isKeyDuplicate = Boolean(
                                  currentKey && allOtherVarKeys.includes(currentKey)
                                );

                                return (
                                  /* VARIABLE TEXT FIELD KEY + LABEL + PREFIX + VALUE EDITOR */
                                  <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-amber-300">
                                        🔤 Variable Key & Default Value Configuration
                                      </span>
                                      <span className="text-[10px] font-mono text-amber-200/80">
                                        {`{{${activeItem.variableKey || 'variable'}}}`}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[11px] text-muted-foreground block mb-1">
                                          Variable Key (ID) *
                                        </label>
                                        <Input
                                          value={activeItem.variableKey ?? ''}
                                          onChange={(e) => {
                                            const clean = e.target.value
                                              .toLowerCase()
                                              .replace(/[^a-z0-9_]/g, '_');
                                            updateActiveItem((it) => ({
                                              ...it,
                                              variableKey: clean,
                                            }));
                                          }}
                                          placeholder="e.g. po_number, patient_age"
                                          className={`h-8 text-xs font-mono ${
                                            isKeyEmpty || !isKeyFormatValid
                                              ? 'border-rose-500 focus-visible:ring-rose-400'
                                              : isKeyDuplicate
                                              ? 'border-amber-500 focus-visible:ring-amber-400'
                                              : ''
                                          }`}
                                        />
                                        {isKeyEmpty ? (
                                          <p className="text-[10px] text-rose-400 mt-1">
                                            Required: Variable key is required (e.g. po_number)
                                          </p>
                                        ) : !isKeyFormatValid ? (
                                          <p className="text-[10px] text-rose-400 mt-1">
                                            Key must start with a lowercase letter (a-z) and use only letters, numbers, or _
                                          </p>
                                        ) : isKeyDuplicate ? (
                                          <p className="text-[10px] text-amber-400 mt-1">
                                            Warning: Duplicate key. Another field already uses &ldquo;{currentKey}&rdquo;.
                                          </p>
                                        ) : null}
                                      </div>
                                      <div>
                                        <label className="text-[11px] text-muted-foreground block mb-1">
                                          Form Field Label (Shown in Generator)
                                        </label>
                                        <Input
                                          value={activeItem.variableLabel ?? ''}
                                          onChange={(e) =>
                                            updateActiveItem((it) => ({
                                              ...it,
                                              variableLabel: e.target.value,
                                              label: e.target.value || it.label,
                                            }))
                                          }
                                          placeholder="e.g. PO Number, Patient Age"
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[11px] text-muted-foreground block mb-1">
                                          Optional Prefix on Invoice
                                        </label>
                                        <Input
                                          value={activeItem.variablePrefix ?? ''}
                                          onChange={(e) =>
                                            updateActiveItem((it) => ({
                                              ...it,
                                              variablePrefix: e.target.value,
                                            }))
                                          }
                                          placeholder="e.g. PO #:  or  Age: "
                                          className="h-8 text-xs font-mono"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[11px] text-muted-foreground block mb-1">
                                          Default / Sample Value
                                        </label>
                                        <Input
                                          value={activeItem.variableValue ?? ''}
                                          onChange={(e) =>
                                            updateActiveItem((it) => ({
                                              ...it,
                                              variableValue: e.target.value,
                                            }))
                                          }
                                          placeholder="e.g. PO-2026-089"
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                    </div>

                                    <p className="text-[10px] text-amber-200/80 leading-relaxed">
                                      ✓ This variable key (<code className="text-gold">{activeItem.variableKey || 'custom_field'}</code>) is automatically registered into the template&apos;s Field Registry. When you use this template in the Document Generator, an input box for <strong>{activeItem.variableLabel || activeItem.variableKey}</strong> will appear pre-filled with your default value!
                                    </p>
                                  </div>
                                );
                              })() : (
                                /* FIXED TEXT FIELD EDITOR */
                                <div className="space-y-2.5">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-xs font-semibold text-foreground">
                                        1-Click Starter Text Presets
                                      </label>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {STARTER_TEXT_PRESETS.map((preset) => (
                                        <button
                                          key={preset.id}
                                          type="button"
                                          onClick={() => {
                                            const template = preset.template(docType);
                                            updateActiveItem((it) => ({
                                              ...it,
                                              textMode: 'fixed',
                                              fixedText: template,
                                            }));
                                            toast.success(`Applied "${preset.label}" text`);
                                          }}
                                          className="px-2 py-1 rounded-lg border border-border bg-background hover:bg-gold-surface hover:border-gold/50 text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1"
                                        >
                                          <span>{preset.icon}</span>
                                          <span>{preset.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-xs font-semibold text-foreground">
                                        Fixed Text Content
                                      </label>
                                      <span className="text-[10px] text-gold font-mono">
                                        Supports multi-line text &amp; {'{{tokens}}'}
                                      </span>
                                    </div>
                                    <textarea
                                      ref={partTextareaRef}
                                      rows={3}
                                      value={activeItem.fixedText ?? getItemCompiledText(activeItem)}
                                      placeholder="Type any fixed text, headings, or {{company.name}}..."
                                      onChange={(e) =>
                                        updateActiveItem((it) => ({
                                          ...it,
                                          textMode: 'fixed',
                                          fixedText: e.target.value,
                                        }))
                                      }
                                      className="flex min-h-[76px] w-full rounded-xl border border-input bg-background/60 px-3 py-2 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                  </div>

                                  <VariableTokenInserter
                                    onInsertToken={handleInsertToken}
                                    customVariables={customVariables}
                                    onAddCustomVariable={handleAddCustomVariable}
                                  />
                                </div>
                              )}

                              {/* Typography & Colors for this Text Field Item */}
                              <TextStylingBar
                                fontFamily={activeItem.fontFamily}
                                onFontFamilyChange={(fam) =>
                                  updateActiveItem((it) => ({ ...it, fontFamily: fam }))
                                }
                                fontSize={activeItem.fontSize ?? 9}
                                onFontSizeChange={(size) =>
                                  updateActiveItem((it) => ({ ...it, fontSize: size }))
                                }
                                fontWeight={activeItem.fontWeight ?? 400}
                                onFontWeightChange={(weight) =>
                                  updateActiveItem((it) => ({ ...it, fontWeight: weight }))
                                }
                                textAlign={activeItem.textAlign ?? 'left'}
                                onTextAlignChange={(align) =>
                                  updateActiveItem((it) => ({ ...it, textAlign: align }))
                                }
                                textColor={activeItem.textColor}
                                onTextColorChange={(color) =>
                                  updateActiveItem((it) => ({ ...it, textColor: color }))
                                }
                                hasBorder={activeItem.hasBorder}
                                onHasBorderChange={(b) =>
                                  updateActiveItem((it) => ({ ...it, hasBorder: b }))
                                }
                                backgroundColor={activeItem.backgroundColor}
                                onBackgroundColorChange={(bg) =>
                                  updateActiveItem((it) => ({ ...it, backgroundColor: bg }))
                                }
                              />
                            </div>
                          ) : activeItem.type === 'image' ? (
                            /* IMAGE / PHOTO ITEM INSPECTOR */
                            <div className="space-y-3 pt-2 border-t border-border">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-foreground">
                                  Image / Photo Source
                                </label>
                                <Button
                                  type="button"
                                  variant="gold"
                                  size="sm"
                                  onClick={() => customImageInputRef.current?.click()}
                                  className="h-7 text-xs px-2.5"
                                >
                                  <Upload className="w-3.5 h-3.5 mr-1" />
                                  Upload Custom Photo / Logo
                                </Button>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateActiveItem((it) => ({
                                      ...it,
                                      imageSource: 'company_logo',
                                    }))
                                  }
                                  className={`p-2 rounded-xl border text-xs font-semibold text-left cursor-pointer ${
                                    (activeItem.imageSource ?? 'company_logo') === 'company_logo'
                                      ? 'border-gold bg-gold-surface text-foreground font-bold'
                                      : 'border-border bg-muted/30 text-muted-foreground'
                                  }`}
                                >
                                  <div>🏢 Business Logo</div>
                                  <div className="text-[10px] font-normal opacity-80">Profile Logo</div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateActiveItem((it) => ({
                                      ...it,
                                      imageSource: 'company_signature',
                                    }))
                                  }
                                  className={`p-2 rounded-xl border text-xs font-semibold text-left cursor-pointer ${
                                    activeItem.imageSource === 'company_signature'
                                      ? 'border-gold bg-gold-surface text-foreground font-bold'
                                      : 'border-border bg-muted/30 text-muted-foreground'
                                  }`}
                                >
                                  <div>✍️ Stamp / Sign</div>
                                  <div className="text-[10px] font-normal opacity-80">Profile Sign</div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => customImageInputRef.current?.click()}
                                  className={`p-2 rounded-xl border text-xs font-semibold text-left cursor-pointer ${
                                    activeItem.imageSource === 'custom_upload'
                                      ? 'border-gold bg-gold-surface text-foreground font-bold'
                                      : 'border-border bg-muted/30 text-muted-foreground'
                                  }`}
                                >
                                  <div>📷 Custom Photo</div>
                                  <div className="text-[10px] font-normal opacity-80">From Computer</div>
                                </button>
                              </div>

                              {activeItem.imageDataUrl ? (
                                <div className="rounded-xl border border-gold/40 bg-slate-950 p-2.5 flex items-center gap-3">
                                  <img
                                    src={activeItem.imageDataUrl}
                                    alt={activeItem.label}
                                    className="w-14 h-14 object-contain rounded border border-border bg-white p-1"
                                  />
                                  <div className="flex-1 text-xs">
                                    <div className="font-bold text-foreground">Custom Uploaded Photo</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      Saved directly in this template &amp; invoice blueprint.
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => customImageInputRef.current?.click()}
                                      className="mt-1 text-[10px] text-gold hover:underline font-semibold cursor-pointer"
                                    >
                                      Replace photo…
                                    </button>
                                  </div>
                                </div>
                              ) : (activeItem.imageSource ?? 'company_logo') === 'company_logo' && companyLogoUrl ? (
                                <div className="rounded-xl border border-gold/40 bg-slate-950 p-2.5 flex items-center gap-3">
                                  <img
                                    src={companyLogoUrl}
                                    alt="Business Logo"
                                    className="w-14 h-14 object-contain rounded border border-border bg-white p-1"
                                  />
                                  <div className="flex-1 text-xs">
                                    <div className="font-bold text-foreground">Business Profile Logo</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      Loaded automatically from company settings!
                                    </div>
                                  </div>
                                </div>
                              ) : activeItem.imageSource === 'company_signature' && companySignatureUrl ? (
                                <div className="rounded-xl border border-gold/40 bg-slate-950 p-2.5 flex items-center gap-3">
                                  <img
                                    src={companySignatureUrl}
                                    alt="Signature"
                                    className="w-14 h-14 object-contain rounded border border-border bg-white p-1"
                                  />
                                  <div className="flex-1 text-xs">
                                    <div className="font-bold text-foreground">Business Profile Signature</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      Loaded automatically from company settings!
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-xl border border-border bg-muted/20 p-2.5 text-xs text-muted-foreground flex items-center gap-2">
                                  <ImageIcon className="w-4 h-4 text-gold shrink-0" />
                                  <span>
                                    {activeItem.imageSource === 'company_signature'
                                      ? 'No signature uploaded in profile yet. Click "Upload Custom Photo" to upload directly.'
                                      : 'No business logo uploaded in profile yet. Click "Upload Custom Photo" to upload directly.'}
                                  </span>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-muted-foreground block mb-1">
                                    Image Fit Mode
                                  </label>
                                  <Select
                                    value={activeItem.imageFit ?? 'contain'}
                                    onChange={(e) =>
                                      updateActiveItem((it) => ({
                                        ...it,
                                        imageFit: e.target.value as 'contain' | 'cover',
                                      }))
                                    }
                                  >
                                    <option value="contain">Contain (Preserve Ratio)</option>
                                    <option value="cover">Cover (Fill Box)</option>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground block mb-1">
                                    Alignment
                                  </label>
                                  <div className="flex items-center gap-1">
                                    {(['left', 'center', 'right'] as const).map((al) => (
                                      <button
                                        key={al}
                                        type="button"
                                        onClick={() => updateActiveItem((it) => ({ ...it, textAlign: al }))}
                                        className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold capitalize cursor-pointer text-center ${
                                          (activeItem.textAlign ?? 'left') === al
                                            ? 'border-gold bg-gold-surface text-foreground font-bold'
                                            : 'border-border bg-muted/30 text-muted-foreground'
                                        }`}
                                      >
                                        {al === 'left' ? 'Left' : al === 'center' ? 'Center' : 'Right'}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : activeItem.type === 'items_table' ? (
                            /* TABLE ITEM INSPECTOR */
                            <TableStylingBar
                              tableDesign={activeItem.tableDesign ?? 'card'}
                              onTableDesignChange={(d) =>
                                updateActiveItem((it) => ({ ...it, tableDesign: d }))
                              }
                              tableHeaderBg={activeItem.tableHeaderBg}
                              onTableHeaderBgChange={(bg) =>
                                updateActiveItem((it) => ({ ...it, tableHeaderBg: bg }))
                              }
                              tableHeaderTextColor={activeItem.tableHeaderTextColor}
                              onTableHeaderTextColorChange={(c) =>
                                updateActiveItem((it) => ({ ...it, tableHeaderTextColor: c }))
                              }
                              tableBorderColor={activeItem.tableBorderColor}
                              onTableBorderColorChange={(c) =>
                                updateActiveItem((it) => ({ ...it, tableBorderColor: c }))
                              }
                              tableStriped={activeItem.tableStriped ?? true}
                              onTableStripedChange={(s) =>
                                updateActiveItem((it) => ({ ...it, tableStriped: s }))
                              }
                              tableStripeBg={activeItem.tableStripeBg}
                              onTableStripeBgChange={(bg) =>
                                updateActiveItem((it) => ({ ...it, tableStripeBg: bg }))
                              }
                              tableFontSize={activeItem.tableFontSize ?? 8.5}
                              onTableFontSizeChange={(sz) =>
                                updateActiveItem((it) => ({ ...it, tableFontSize: sz }))
                              }
                              tableDensity={activeItem.tableDensity ?? 'normal'}
                              onTableDensityChange={(dens) =>
                                updateActiveItem((it) => ({ ...it, tableDensity: dens }))
                              }
                              tableShowSerial={activeItem.tableShowSerial ?? true}
                              onTableShowSerialChange={(sh) =>
                                updateActiveItem((it) => ({ ...it, tableShowSerial: sh }))
                              }
                              columns={activeItem.tableColumns ?? DEFAULT_TABLE_COLUMNS}
                              onColumnsChange={(cols) =>
                                updateActiveItem((it) => ({ ...it, tableColumns: cols }))
                              }
                            />
                          ) : activeItem.type === 'upi_qr' ? (
                            <div className="space-y-2 pt-2 border-t border-border">
                              <label className="text-xs font-semibold text-foreground block">
                                UPI QR Caption
                              </label>
                              <Input
                                value={activeItem.qrCaption ?? 'Scan to pay via UPI'}
                                onChange={(e) =>
                                  updateActiveItem((it) => ({ ...it, qrCaption: e.target.value }))
                                }
                              />
                            </div>
                          ) : activeItem.type === 'signature' ? (
                            <div className="space-y-2 pt-2 border-t border-border">
                              <label className="text-xs font-semibold text-foreground block">
                                Signatory Caption
                              </label>
                              <Textarea
                                value={
                                  activeItem.signatureCaption ??
                                  'For {{company.name}}\nAuthorised Signatory'
                                }
                                onChange={(e) =>
                                  updateActiveItem((it) => ({
                                    ...it,
                                    signatureCaption: e.target.value,
                                  }))
                                }
                                className="font-mono text-xs"
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  {step === 2
                    ? 'Click and drag across the grid on the left to slice a layout section, or pick a 1-click preset above.'
                    : 'Click any layout section on the left to customize its internal items.'}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <Button
                variant="outline"
                onClick={() => setStep(step === 3 ? 2 : 1)}
                className="w-full sm:w-auto"
              >
                ← Previous Step
              </Button>
              {step === 2 ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {continuationMode === 'custom_page_2' && !isEditingPage2 ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingPage('page2');
                        toast.info('Now viewing Page 2+ Continuation Blueprint!');
                      }}
                      className="w-full sm:w-auto"
                    >
                      <span className="sm:hidden">Page 2 Layout →</span>
                      <span className="hidden sm:inline">Design Page 2+ Layout →</span>
                    </Button>
                  ) : null}
                  <Button variant="gold" onClick={handleProceedToStep3} className="w-full sm:w-auto">
                    <span>Next: Assign Content →</span>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleWizardPreviewPdf}
                    disabled={isWizardCompiling}
                    className="w-full sm:w-auto"
                  >
                    {isWizardCompiling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-gold" />
                        <span>Compiling Preview…</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 text-gold" />
                        <span className="sm:hidden">Preview Draft</span>
                        <span className="hidden sm:inline">Preview Draft PDF</span>
                      </>
                    )}
                  </Button>
                  <Button variant="gold" size="lg" onClick={handleFinishAndOpenStudio} className="w-full sm:w-auto">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="sm:hidden">Open Full Studio</span>
                    <span className="hidden sm:inline">Generate & Open Full Studio</span>
                  </Button>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      ) : null}

      {/* Live PDF Blueprint Preview Modal */}
      <Modal
        open={isWizardPreviewOpen && Boolean(wizardPreviewUrl)}
        onClose={() => setIsWizardPreviewOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gold" />
            <span>Blueprint Draft PDF Preview — {templateName}</span>
          </div>
        }
        actions={
          wizardPreviewUrl ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(wizardPreviewUrl, '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Full Tab</span>
              </Button>
              <a
                href={wizardPreviewUrl}
                download={`${templateName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'blueprint'}.pdf`}
                className="inline-flex items-center justify-center font-medium transition-all h-8 px-3 text-xs rounded-lg gap-1.5 bg-gradient-to-r from-[#E8C27A] to-[#C69642] text-[#12111A] font-semibold shadow-sm hover:opacity-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </a>
            </div>
          ) : null
        }
      >
        {wizardPreviewUrl ? (
          <div className="flex flex-col items-center w-full space-y-3">
            <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <Eye className="w-3.5 h-3.5 text-gold" />
                <span>High-Definition Vector PDF preview with sample data</span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(wizardPreviewUrl, '_blank')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Full Tab</span>
                </Button>
                <a
                  href={wizardPreviewUrl}
                  download={`${templateName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'blueprint'}.pdf`}
                  className="inline-flex items-center gap-1 text-xs text-gold underline font-semibold px-2 py-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .pdf</span>
                </a>
              </div>
            </div>
            <iframe
              title="Blueprint PDF Preview"
              src={`${wizardPreviewUrl}#toolbar=1&navpanes=0`}
              allow="fullscreen"
              className="w-full h-[76vh] rounded-xl border border-border bg-white shadow-inner"
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

// ============================================================================
// 3. UPGRADED FULL-PAGE TEMPLATE BUILDER (/templates/:id/builder)
//    - Full A4/A5/Thermal sheet view (no cramped small strip!)
//    - Drag-to-resize Header, Footer, Left/Right Sidebar & Body row sizes
//    - Pointer drag-to-move & corner drag-to-resize on blocks in Fixed zones
//    - Add/split/delete Variable Body rows & columns freely
// ============================================================================

function ImageBlockEditor({
  source,
  name,
  fit,
  onSourceChange,
  onFitChange,
  onUploadClick,
  companyLogoUrl,
  companySignatureUrl,
}: {
  source: Extract<Block, { type: 'image' }>['source'];
  name?: string;
  fit?: 'contain' | 'cover';
  onSourceChange: (source: any) => void;
  onFitChange: (fit: 'contain' | 'cover') => void;
  onUploadClick: () => void;
  companyLogoUrl: string | null;
  companySignatureUrl: string | null;
}) {
  const isDataUrl = source.kind === 'data_url';
  const isLogo = source.kind === 'company_logo' || !source.kind;
  const isSignature = source.kind === 'company_signature';

  return (
    <div className="space-y-3 pt-1 border-t border-border">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground">Image / Photo Source</label>
        <Button type="button" variant="gold" size="sm" onClick={onUploadClick} className="h-7 text-xs px-2.5">
          <Upload className="w-3.5 h-3.5 mr-1" />
          Upload Image
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onSourceChange({ kind: 'company_logo' })}
          className={`p-2 rounded-xl border text-xs font-semibold text-left cursor-pointer ${
            isLogo ? 'border-gold bg-gold-surface text-foreground font-bold' : 'border-border bg-muted/30 text-muted-foreground'
          }`}
        >
          <div>🏢 Logo</div>
          <div className="text-[10px] font-normal opacity-80">Profile Logo</div>
        </button>
        <button
          type="button"
          onClick={() => onSourceChange({ kind: 'company_signature' })}
          className={`p-2 rounded-xl border text-xs font-semibold text-left cursor-pointer ${
            isSignature ? 'border-gold bg-gold-surface text-foreground font-bold' : 'border-border bg-muted/30 text-muted-foreground'
          }`}
        >
          <div>✍️ Sign</div>
          <div className="text-[10px] font-normal opacity-80">Profile Sign</div>
        </button>
        <button
          type="button"
          onClick={onUploadClick}
          className={`p-2 rounded-xl border text-xs font-semibold text-left cursor-pointer ${
            isDataUrl ? 'border-gold bg-gold-surface text-foreground font-bold' : 'border-border bg-muted/30 text-muted-foreground'
          }`}
        >
          <div>📷 Upload</div>
          <div className="text-[10px] font-normal opacity-80">Custom Photo</div>
        </button>
      </div>

      {isDataUrl && (source as any).data_url ? (
        <div className="rounded-xl border border-gold/40 bg-slate-950 p-2.5 flex items-center gap-3">
          <img
            src={(source as any).data_url}
            alt={name || 'Custom Image'}
            className="w-14 h-14 object-contain rounded border border-border bg-white p-1"
          />
          <div className="flex-1 text-xs">
            <div className="font-bold text-foreground">{name || 'Custom Image'}</div>
            <div className="text-[10px] text-muted-foreground">Embedded directly in template</div>
            <button
              type="button"
              onClick={onUploadClick}
              className="mt-1 text-[10px] text-gold hover:underline font-semibold cursor-pointer"
            >
              Replace image…
            </button>
          </div>
        </div>
      ) : isLogo && companyLogoUrl ? (
        <div className="rounded-xl border border-gold/40 bg-slate-950 p-2.5 flex items-center gap-3">
          <img
            src={companyLogoUrl}
            alt="Logo"
            className="w-14 h-14 object-contain rounded border border-border bg-white p-1"
          />
          <div className="flex-1 text-xs">
            <div className="font-bold text-foreground">Business Profile Logo</div>
            <div className="text-[10px] text-muted-foreground">Loaded from business settings</div>
          </div>
        </div>
      ) : isSignature && companySignatureUrl ? (
        <div className="rounded-xl border border-gold/40 bg-slate-950 p-2.5 flex items-center gap-3">
          <img
            src={companySignatureUrl}
            alt="Signature"
            className="w-14 h-14 object-contain rounded border border-border bg-white p-1"
          />
          <div className="flex-1 text-xs">
            <div className="font-bold text-foreground">Business Profile Signature</div>
            <div className="text-[10px] text-muted-foreground">Loaded from business settings</div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/20 p-2.5 text-xs text-muted-foreground flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-gold shrink-0" />
          <span>
            {isSignature
              ? 'No signature uploaded in profile yet. Click "Upload Image" to add one directly.'
              : 'No business logo uploaded in profile yet. Click "Upload Image" to add one directly.'}
          </span>
        </div>
      )}

      <div>
        <label className="text-xs text-muted-foreground block mb-1">Image Fit Mode</label>
        <Select value={fit ?? 'contain'} onChange={(e) => onFitChange(e.target.value as 'contain' | 'cover')}>
          <option value="contain">Contain (Keep proportions)</option>
          <option value="cover">Cover (Fill item bounds)</option>
        </Select>
      </div>
    </div>
  );
}

export function TemplateBuilderPage({ templateId }: { templateId: string }) {
  const navigate = useNavigate();
  const { activeCompany } = useAppStore();
  const tpl = useLiveQuery(() => db.templates.get(templateId), [templateId]);

  const [def, setDef] = useState<TemplateDefinition | null>(null);
  const [editingPage, setEditingPage] = useState<'page1' | 'page2'>('page1');
  const [selectedZone, setSelectedZone] = useState<'header' | 'footer'>('header');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedBodyCol, setSelectedBodyCol] = useState<{ rowId: string; colId: string } | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<'canvas' | 'fields' | 'theme' | 'preview'>('canvas');
  const [zoom, setZoom] = useState<number>(1);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldScope, setNewFieldScope] = useState<'document' | 'line_item'>('document');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [showZoneDimensions, setShowZoneDimensions] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  const studioImageInputRef = useRef<HTMLInputElement | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [companySignatureUrl, setCompanySignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCompanyAssets() {
      if (!activeCompany) return;
      if (activeCompany.logo_asset_id) {
        try {
          const asset = await db.assets.get(activeCompany.logo_asset_id);
          if (asset?.blob && !cancelled) {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (!cancelled && typeof reader.result === 'string') {
                setCompanyLogoUrl(reader.result);
              }
            };
            reader.readAsDataURL(asset.blob);
          }
        } catch (e) {
          console.warn('Studio failed to load logo asset:', e);
        }
      }
      if (activeCompany.signature_asset_id) {
        try {
          const asset = await db.assets.get(activeCompany.signature_asset_id);
          if (asset?.blob && !cancelled) {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (!cancelled && typeof reader.result === 'string') {
                setCompanySignatureUrl(reader.result);
              }
            };
            reader.readAsDataURL(asset.blob);
          }
        } catch (e) {
          console.warn('Studio failed to load signature asset:', e);
        }
      }
    }
    loadCompanyAssets();
    return () => {
      cancelled = true;
    };
  }, [activeCompany]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  // Pointer drag/resize interaction state for Fixed blocks
  const dragRef = useRef<{
    zone: 'header' | 'footer';
    blockId: string;
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    origFrame: { x: number; y: number; w: number; h: number };
  } | null>(null);

  useEffect(() => {
    if (tpl && !def) {
      setDef(JSON.parse(JSON.stringify(tpl.draft_definition)));
      const firstId = tpl.draft_definition.layout.zones.header.blocks[0]?.id ?? null;
      setSelectedBlockId(firstId);
    }
  }, [tpl, def]);


  if (!tpl || !def) {
    return <GlassCard className="p-8 m-6">Loading Template Studio…</GlassCard>;
  }

  const persistDraft = async (nextDef: TemplateDefinition) => {
    setDef(nextDef);
    await db.templates.update(tpl.id, {
      draft_definition: nextDef,
      has_unpublished_changes: true,
      updated_at: Date.now(),
    });
  };

  const continuationMode = def.layout.continuation?.mode ?? 'repeat_page_1';
  const isEditingPage2 =
    continuationMode === 'custom_page_2' &&
    editingPage === 'page2' &&
    Boolean(def.layout.continuation?.zones);

  const activeZones = isEditingPage2 ? def.layout.continuation!.zones! : def.layout.zones;
  const zoneBlocks = activeZones[selectedZone].blocks;
  const selectedBlock = zoneBlocks.find((b) => b.id === selectedBlockId) ?? null;

  const getTargetZonesMut = (nextDef: TemplateDefinition) => {
    if (
      nextDef.layout.continuation?.mode === 'custom_page_2' &&
      editingPage === 'page2' &&
      nextDef.layout.continuation.zones
    ) {
      return nextDef.layout.continuation.zones;
    }
    return nextDef.layout.zones;
  };

  const handleToggleContinuationMode = (mode: 'repeat_page_1' | 'custom_page_2') => {
    const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
    const existingContZones = nextDef.layout.continuation?.zones ?? {
      header: {
        height: 68,
        blocks: [
          {
            id: newId('blk'),
            name: 'Page 2+ Compact Continuation Header',
            type: 'text',
            content:
              'Name: {{client_name}}  |  Age/Ref: {{patient_age | default:"—"}}\nVitals / Doc No: {{patient_vitals | default:"—"}} • No: {{doc.number}}',
            style: { font_size: 9, font_weight: 600, color: 'theme.primary', line_height: 1.4 },
            frame: {
              x: 0,
              y: 6,
              w: Math.round(nextDef.page.width - nextDef.page.margin * 2),
              h: 48,
            },
            z: 1,
          },
        ],
      },
      footer: JSON.parse(JSON.stringify(nextDef.layout.zones.footer)),
    };
    nextDef.layout.continuation = {
      mode,
      zones: existingContZones,
    };
    if (mode === 'repeat_page_1') {
      setEditingPage('page1');
    } else {
      setEditingPage('page2');
    }
    persistDraft(nextDef);
    toast.success(
      mode === 'custom_page_2'
        ? 'Enabled Custom Page 2+ Continuation Template (also replicates on Page 3+)'
        : 'Page 1 Fixed sections will now repeat identically on Page 2+'
    );
  };

  const updateSelectedFixedBlock = (updater: (b: FixedBlock) => FixedBlock) => {
    if (!selectedBlockId) return;
    const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
    const zTarget = getTargetZonesMut(nextDef);
    zTarget[selectedZone].blocks = zTarget[selectedZone].blocks.map((b) =>
      b.id === selectedBlockId ? updater(b) : b
    );
    persistDraft(nextDef);
  };

  const handleStudioCustomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !def) return;
    try {
      const dataUrl = await compressAndNormalizeImage(file);
      if (dataUrl) {
        if (selectedZone && selectedBlockId) {
          updateSelectedFixedBlock((b) =>
            b.type === 'image'
              ? {
                  ...b,
                  source: { kind: 'data_url', data_url: dataUrl },
                  name: file.name.replace(/\.[^.]+$/, '') || 'Custom Image',
                }
              : b
          );
          toast.success(`Uploaded image into ${selectedZone} block!`);
        } else if (selectedBodyCol) {
          const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
          const r = nextDef.layout.body.rows.find((row) => row.id === selectedBodyCol.rowId);
          const c = r?.cols.find((col) => col.id === selectedBodyCol.colId);
          if (c && c.blocks[0] && c.blocks[0].type === 'image') {
            c.blocks[0].source = { kind: 'data_url', data_url: dataUrl };
            c.blocks[0].name = file.name.replace(/\.[^.]+$/, '') || 'Custom Image';
            persistDraft(nextDef);
            toast.success(`Uploaded image into body column!`);
          }
        }
      }
    } catch (err) {
      toast.error('Failed to process image');
    }
    e.target.value = '';
  };

  const handleZoneHeightChange = (zone: 'header' | 'footer', newHeight: number) => {
    const pageH = def?.page?.height ?? 842;
    const maxSafe = zone === 'header' ? Math.round(pageH * 0.30) : Math.round(pageH * 0.18);
    const clamped = Math.max(0, Math.min(maxSafe, Math.round(newHeight)));
    const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
    const zTarget = getTargetZonesMut(nextDef);
    zTarget[zone].height = clamped;
    persistDraft(nextDef);
  };

  const handleAddFixedBlock = (kind: 'text' | 'logo' | 'upi_qr' | 'divider') => {
    const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
    const zTarget = getTargetZonesMut(nextDef);
    const zBlocks = zTarget[selectedZone].blocks;
    let blk: FixedBlock;

    if (kind === 'logo') {
      blk = {
        id: newId('blk'),
        name: 'Company Logo',
        type: 'image',
        source: { kind: 'company_logo' },
        fit: 'contain',
        style: {},
        frame: { x: 12, y: 8, w: 96, h: 48 },
        z: zBlocks.length + 1,
      };
    } else if (kind === 'upi_qr') {
      blk = {
        id: newId('blk'),
        name: 'UPI QR Block',
        type: 'upi_qr',
        amount_key: 'grand_total',
        size: 76,
        caption: 'Scan to Pay',
        style: {},
        frame: { x: 16, y: 8, w: 110, h: 96 },
        z: zBlocks.length + 1,
      };
    } else if (kind === 'divider') {
      blk = {
        id: newId('blk'),
        name: 'Divider Line',
        type: 'divider',
        thickness: 1.5,
        color: 'theme.primary',
        style: {},
        frame: { x: 0, y: 24, w: 300, h: 8 },
        z: zBlocks.length + 1,
      };
    } else {
      blk = {
        id: newId('blk'),
        name: 'Custom Text Box',
        type: 'text',
        content: 'Custom Text: {{company.name}}',
        style: { font_size: 10, font_weight: 600, color: 'theme.text', align: 'left' },
        frame: { x: 16, y: 16, w: 220, h: 36 },
        z: zBlocks.length + 1,
      };
    }

    const minNeededHeight = blk.frame.y + blk.frame.h + 12;
    if (zTarget[selectedZone].height < minNeededHeight) {
      zTarget[selectedZone].height = minNeededHeight;
    }

    zBlocks.push(blk);
    setSelectedBlockId(blk.id);
    persistDraft(nextDef);
    toast.success(`Added ${blk.name} to ${isEditingPage2 ? 'Page 2+ ' : ''}Fixed ${selectedZone.toUpperCase()}`);
  };

  const handleAddBodyRow = (colsCount: 1 | 2 | 3) => {
    const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
    const spanEach = Math.floor(12 / colsCount);
    const newRow: BodyRow = {
      id: newId('row'),
      gap: 12,
      keep_together: true,
      cols: Array.from({ length: colsCount }).map((_, idx) => ({
        id: newId('col'),
        span: spanEach,
        blocks: [
          {
            id: newId('blk'),
            name: `Variable Part ${idx + 1}`,
            type: 'text',
            content: `Variable Section Part ${idx + 1}\nClick to customize content or {{tokens}}`,
            style: {
              font_size: 9,
              padding: [8, 10, 8, 10],
              background: '#F9FAFB',
              border: { width: 1, color: '#E5E7EB', radius: 6 },
            },
          },
        ],
      })),
    };
    nextDef.layout.body.rows.push(newRow);
    persistDraft(nextDef);
    toast.success(`Added ${colsCount}-part Variable Row to Body`);
  };

  const handleAssignContentToBodyCol = (
    rowId: string,
    colId: string,
    kind: PartKind
  ) => {
    const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
    const baseStarter = buildGstClassicDefinition();
    const row = nextDef.layout.body.rows.find((r) => r.id === rowId);
    const col = row?.cols.find((c) => c.id === colId);
    if (!col) return;

    const id = newId('blk');
    let newBlock: Block;
    switch (kind) {
      case 'text':
        newBlock = {
          id,
          name: 'Custom Text Block',
          type: 'text',
          content: '{{client_name}}',
          style: {
            font_size: 9,
            padding: [8, 10, 8, 10],
            background: '#F9FAFB',
            border: { width: 1, color: '#E5E7EB', radius: 6 },
          },
        };
        break;
      case 'image':
        newBlock = {
          id,
          name: 'Company Logo',
          type: 'image',
          source: { kind: 'company_logo' },
          fit: 'contain',
          style: {},
        };
        break;
      case 'items_table':
        newBlock = baseStarter.layout.body.rows[1]!.cols[0]!.blocks[0]!;
        if (row) row.keep_together = false;
        break;
      case 'totals_box':
        newBlock = baseStarter.layout.body.rows[2]!.cols[1]!.blocks[0]!;
        break;
      case 'upi_qr':
        newBlock = {
          id,
          name: 'UPI QR Code',
          type: 'upi_qr',
          amount_key: 'grand_total',
          size: 84,
          caption: 'Scan to pay via UPI',
          style: {},
        };
        break;
      case 'bank_details':
        newBlock = { id, name: 'Bank Details', type: 'bank_details', title: 'Bank Details', style: {} };
        break;
      case 'hsn_summary':
        newBlock = { id, name: 'HSN Tax Summary', type: 'hsn_summary', style: { font_size: 8 } };
        break;
      case 'signature':
        newBlock = {
          id,
          name: 'Authorised Signatory',
          type: 'signature',
          source: 'company_signature',
          caption: 'For {{company.name}}\nAuthorised Signatory',
          style: { align: 'right' },
        };
        break;
      case 'spacer':
      default:
        newBlock = { id, name: 'Spacer', type: 'spacer', height: 24, style: {} };
        break;
    }

    col.blocks = [newBlock];
    persistDraft(nextDef);
    toast.success('Updated section component');
  };

  const handleDeleteSelectedBlock = () => {
    if (!selectedBlockId) return;
    const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
    const zTarget = getTargetZonesMut(nextDef);
    zTarget[selectedZone].blocks = zTarget[selectedZone].blocks.filter(
      (b) => b.id !== selectedBlockId
    );
    setSelectedBlockId(zTarget[selectedZone].blocks[0]?.id ?? null);
    persistDraft(nextDef);
  };

  const handlePublish = async () => {
    await persistDraft(def);
    const ver = await publishTemplateDraft(tpl.id);
    toast.success(`Published immutable Template Version v${ver.version_no}`);
  };

  const handlePreviewPdf = async (openModal: boolean = false) => {
    if (!def || isGeneratingPreview) return;
    setIsGeneratingPreview(true);
    // Yield 50ms so UI updates loading spinner
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const sampleCompany = activeCompany ?? {
        id: 'cmp_demo',
        name: 'INGEN Demo Enterprise',
        gstin: '36AABCU9603R1ZO',
        address: {
          line1: 'Jubilee Hills, Road 36',
          city: 'Hyderabad',
          state: 'Telangana',
          state_code: '36',
          pincode: '500033',
          country: 'India',
        },
        phone: '+91 98765 43210',
        email: 'billing@ingen-demo.in',
        upi: { vpa: 'ingen@okicici', payee_name: 'INGEN Demo' },
        currency: 'INR' as const,
        locale: 'en-IN' as const,
        fy_start_month: 4,
        custom_fields: [],
        archived: false,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      const sampleValues: Record<string, string> = {
        client_name: 'Apex Global Solutions Pvt Ltd',
        client_gstin: '36AABCU9603R1ZO',
        client_address: 'HITEC City, Madhapur, Hyderabad - 500081',
        patient_age: '34 Yrs / M',
        patient_vitals: 'BP: 120/80 • Pulse: 74 bpm • SpO2: 99%',
        notes: 'Thank you for your business. Terms: Payment due within 15 days.',
      };
      for (const f of def.fields) {
        if (!sampleValues[f.key]) {
          sampleValues[f.key] = f.default ?? (f.type === 'number' ? '1' : f.label);
        }
      }
      const sampleItems = [
        {
          item_name: 'Enterprise Cloud Consultancy',
          hsn_sac: '9983',
          qty: '2',
          unit: 'NOS',
          rate: '12500',
          discount_pct: '0',
          gst_rate: '18',
        },
        {
          item_name: 'Security Audit & Compliance Report',
          hsn_sac: '9983',
          qty: '1',
          unit: 'NOS',
          rate: '25000',
          discount_pct: '5',
          gst_rate: '18',
        },
      ];
      const comp = evaluateDocument({
        definition: def,
        company: sampleCompany,
        values: sampleValues,
        items: sampleItems,
      });
      (sampleCompany as any).logo_data_url = companyLogoUrl || undefined;
      (sampleCompany as any).signature_data_url = companySignatureUrl || undefined;
      const blob = await compilePdfToBlob({
        definition: def,
        company: sampleCompany,
        docMeta: {
          number: 'INV/26-27/0001',
          status: 'draft',
          issue_date: new Date().toISOString().slice(0, 10),
          due_date: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
          place_of_supply: '36',
          type_label: DOC_TYPE_LABELS[tpl.doc_type],
        },
        values: sampleValues,
        items: sampleItems,
        computed: comp,
        assetDataUrls: {
          ...(companyLogoUrl ? { company_logo: companyLogoUrl } : {}),
          ...(companySignatureUrl ? { company_signature: companySignatureUrl } : {}),
        },
      });

      const oldUrl = previewUrlRef.current;
      const nextUrl = URL.createObjectURL(blob);
      previewUrlRef.current = nextUrl;
      setPreviewUrl(nextUrl);
      if (openModal) {
        setIsPreviewModalOpen(true);
      }

      // Clean up previous blob URL after safe delay to allow iframe to load
      if (oldUrl) {
        setTimeout(() => URL.revokeObjectURL(oldUrl), 5000);
      }
      toast.success('Live Vector PDF compiled successfully!');
    } catch (err) {
      console.error('PDF preview error:', err);
      toast.error(`PDF preview error: ${(err as Error).message}`);
    } finally {
      setIsGeneratingPreview(false);
    }
  };


  // Pointer Move & Up handlers for smooth block dragging and resizing inside Fixed Zones
  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    const st = dragRef.current;
    if (!st || !def) return;
    const dx = Math.round((e.clientX - st.startX) / (zoom * 8)) * 8;
    const dy = Math.round((e.clientY - st.startY) / (zoom * 8)) * 8;

    const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
    const zTarget = getTargetZonesMut(nextDef);
    const targetZone = zTarget[st.zone];
    const maxW = nextDef.page.width - nextDef.page.margin * 2;

    targetZone.blocks = targetZone.blocks.map((b) => {
      if (b.id !== st.blockId) return b;
      if (st.mode === 'move') {
        const nx = Math.max(0, Math.min(maxW - b.frame.w, st.origFrame.x + dx));
        const ny = Math.max(0, Math.min(targetZone.height - 16, st.origFrame.y + dy));
        return { ...b, frame: { ...b.frame, x: nx, y: ny } };
      } else {
        const nw = Math.max(40, Math.min(maxW - st.origFrame.x, st.origFrame.w + dx));
        const nh = Math.max(16, Math.min(targetZone.height - st.origFrame.y, st.origFrame.h + dy));
        return { ...b, frame: { ...b.frame, w: nw, h: nh } };
      }
    });
    setDef(nextDef);
  };

  const handleCanvasPointerUp = () => {
    if (dragRef.current && def) {
      dragRef.current = null;
      persistDraft(def);
    }
  };

  const innerPageWidth = def.page.width - def.page.margin * 2;
  const activeBodyColObj = selectedBodyCol
    ? def.layout.body.rows
        .find((r) => r.id === selectedBodyCol.rowId)
        ?.cols.find((c) => c.id === selectedBodyCol.colId)
    : null;

  return (
    <div
      className="min-h-dvh flex flex-col bg-background text-foreground"
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
    >
      <input
        ref={studioImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleStudioCustomImageUpload}
      />
      {/* Top Studio Bar */}
      <header className="glass-chrome border-b border-border px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 sticky top-0 z-30">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate('/templates')} className="shrink-0 px-2 sm:px-3">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Templates</span>
          </Button>
          <div className="min-w-0">
            <h1 className="font-display text-sm sm:text-base font-bold truncate max-w-[150px] xs:max-w-[200px] sm:max-w-md">{tpl.name}</h1>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate max-w-[200px] xs:max-w-xs sm:max-w-md">
              Full-Page Sheet ({def.page.size} • {Math.round(def.page.width)} × {Math.round(def.page.height)} pt)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
          {(['canvas', 'fields', 'theme', 'preview'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'preview' && !previewUrlRef.current) {
                  handlePreviewPdf(false);
                }
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold uppercase cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'canvas' ? (
                <>
                  <span className="sm:hidden">1. Layout</span>
                  <span className="hidden sm:inline">1. Full Page Layout</span>
                </>
              ) : tab === 'fields' ? (
                '2. Fields'
              ) : tab === 'theme' ? (
                <>
                  <span className="sm:hidden">3. Theme</span>
                  <span className="hidden sm:inline">3. Theme & Size</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span className="sm:hidden">4. Preview</span>
                  <span className="hidden sm:inline">4. Live PDF Preview</span>
                </>
              )}
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePreviewPdf(true)}
            disabled={isGeneratingPreview}
            className="shrink-0 whitespace-nowrap"
          >
            {isGeneratingPreview ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-gold" />
                <span>Compiling…</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Preview PDF (Modal)</span>
                <span className="sm:hidden">Preview</span>
              </>
            )}
          </Button>

          <Button variant="gold" size="sm" onClick={handlePublish} className="shrink-0 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Publish Version</span>
            <span className="sm:hidden">Publish</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {activeTab === 'canvas' ? (
          <>
            {/* Left & Center: Full-Page Sheet Architect */}
            <div className="lg:col-span-8 space-y-4">
              {/* Section Size Sliders, Page 1 vs Page 2+ Continuation Toggle & Add Block Bar */}
              <GlassCard className="p-4 space-y-3">
                {/* Multi-Page Continuation Bar */}
                {continuationMode === 'custom_page_2' ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold-surface p-2 sm:p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gold uppercase tracking-wider hidden sm:inline">Editing Sheet:</span>
                      <div className="inline-flex rounded-lg border border-border bg-background p-0.5 shadow-xs">
                        <CloudTooltip
                          title="Page 1 Primary Sheet"
                          content="Primary sheet blueprint with company branding, header, and line items. Prints on first page of invoices."
                        >
                          <button
                            type="button"
                            onClick={() => setEditingPage('page1')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                              !isEditingPage2
                                ? 'bg-primary text-white shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span>📄 Page 1 Sheet</span>
                          </button>
                        </CloudTooltip>
                        <CloudTooltip
                          title="Page 2+ Continuation Sheet"
                          content="Continuation sheet with compact header, maximizing printable area for multi-page item tables."
                        >
                          <button
                            type="button"
                            onClick={() => setEditingPage('page2')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                              isEditingPage2
                                ? 'bg-gold text-gold-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span>📑 Page 2+ Continuation Sheet</span>
                          </button>
                        </CloudTooltip>
                      </div>
                    </div>

                    <CloudTooltip
                      title="Custom Page 2+ Enabled"
                      content="Custom Page 2+ is active. Uncheck to revert to single-page mode where Page 1 repeats."
                    >
                      <label className="flex items-center gap-2 text-xs font-semibold text-gold cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={true}
                          onChange={(e) => {
                            if (!e.target.checked) {
                              handleToggleContinuationMode('repeat_page_1');
                            }
                          }}
                          className="w-4 h-4 rounded text-gold accent-gold focus:ring-gold cursor-pointer"
                        />
                        <span className="text-[11px]">Custom Page 2+ Enabled</span>
                      </label>
                    </CloudTooltip>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 p-2 sm:p-2.5">
                    <div className="flex items-center gap-2">
                      <CloudTooltip
                        title="Page 1 Primary Sheet"
                        content="Primary sheet blueprint for single-page documents. Tables auto-flow across pages if they exceed 1 page."
                      >
                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-white flex items-center gap-1.5 shadow-xs">
                          📄 Page 1 Sheet (Active)
                        </span>
                      </CloudTooltip>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        Single-Page Template (Table auto-flows across pages)
                      </span>
                    </div>

                    <CloudTooltip
                      title="Opt-in for Custom Page 2+"
                      content="Opt-in to design a specialized, streamlined header and footer specifically for Page 2 and beyond."
                    >
                      <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleToggleContinuationMode('custom_page_2');
                            }
                          }}
                          className="w-4 h-4 rounded text-gold accent-gold focus:ring-gold cursor-pointer"
                        />
                        <span>Opt-in for Custom Page 2+</span>
                      </label>
                    </CloudTooltip>
                  </div>
                )}

                {/* Canvas Toolbar: Zoom & Optional Zone Dimensions Trigger */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowZoneDimensions(!showZoneDimensions)}
                      className="px-2.5 py-1 rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5 text-gold" />
                      <span>{showZoneDimensions ? 'Hide Height Controls ▴' : 'Adjust Zone Heights (Header / Footer) ▾'}</span>
                    </button>
                    <span className="text-[11px] text-muted-foreground hidden md:inline">
                      Header: <strong className="text-foreground">{activeZones.header.height}pt</strong> • Footer: <strong className="text-foreground">{activeZones.footer.height}pt</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Zoom:</span>
                    {[0.75, 0.9, 1].map((z) => (
                      <button
                        key={z}
                        onClick={() => setZoom(z)}
                        className={`px-2 py-0.5 rounded border cursor-pointer ${
                          zoom === z ? 'border-gold text-gold bg-gold-surface' : 'border-border'
                        }`}
                      >
                        {Math.round(z * 100)}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Collapsible Zone Heights Panel */}
                {showZoneDimensions ? (
                  <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3 space-y-3 animate-in fade-in duration-150">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      💡 <strong>Zone Dimensions:</strong> These heights were auto-calculated from your layout sections in the wizard. If your template has no header or no footer, you can set the height to 0 pt. Adjust only if you want to expand or contract the vertical area for the line items table.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Fixed Header Height Slider */}
                      <div className="rounded-lg border border-border bg-background/50 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-sky-300">
                            🔵 {isEditingPage2 ? 'Page 2+ ' : ''}Fixed Header Height
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sky-200">
                              {activeZones.header.height} pt
                            </span>
                            <button
                              type="button"
                              onClick={() => handleZoneHeightChange('header', 0)}
                              className="text-[10px] text-muted-foreground hover:text-gold underline cursor-pointer"
                            >
                              No Header (0 pt)
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={340}
                          step={8}
                          value={activeZones.header.height}
                          onChange={(e) => handleZoneHeightChange('header', Number(e.target.value))}
                          className="w-full accent-sky-400 cursor-pointer"
                        />
                        <div className="text-[10px] text-muted-foreground">
                          {activeZones.header.height === 0
                            ? '✓ No fixed header — Content flows from top of page'
                            : `${activeZones.header.blocks.length} block(s) inside fixed header`}
                        </div>
                      </div>

                      {/* Fixed Footer Height Slider */}
                      <div className="rounded-lg border border-border bg-background/50 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-sky-300">
                            🔵 {isEditingPage2 ? 'Page 2+ ' : ''}Fixed Footer Height
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sky-200">
                              {activeZones.footer.height} pt
                            </span>
                            <button
                              type="button"
                              onClick={() => handleZoneHeightChange('footer', 0)}
                              className="text-[10px] text-muted-foreground hover:text-gold underline cursor-pointer"
                            >
                              No Footer (0 pt)
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={260}
                          step={8}
                          value={activeZones.footer.height}
                          onChange={(e) => handleZoneHeightChange('footer', Number(e.target.value))}
                          className="w-full accent-sky-400 cursor-pointer"
                        />
                        <div className="text-[10px] text-muted-foreground">
                          {activeZones.footer.height === 0
                            ? '✓ No fixed footer — Content extends to bottom margin'
                            : `${activeZones.footer.blocks.length} block(s) inside fixed footer`}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Quick Drop Palette */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground mr-1">
                    Add element to <strong className="text-sky-400 uppercase">{isEditingPage2 ? 'Page 2+ ' : ''}{selectedZone === 'header' ? 'Fixed Header' : 'Fixed Footer'}</strong>:
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => handleAddFixedBlock('text')}>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Text Box</span>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleAddFixedBlock('logo')}>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Logo Image</span>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleAddFixedBlock('upi_qr')}>
                    <Plus className="w-3.5 h-3.5" />
                    <span>UPI QR</span>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleAddFixedBlock('divider')}>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Divider</span>
                  </Button>
                </div>
              </GlassCard>

              {/* FULL PAGE INTERACTIVE SHEET (Header + Variable Body + Footer on one unified page!) */}
              <div className="overflow-x-auto rounded-2xl border border-border bg-slate-950/70 p-6 flex justify-center">
                <div
                  style={{
                    width: def.page.width,
                    minHeight: def.page.height,
                    padding: def.page.margin,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                  }}
                  className="bg-white text-slate-900 rounded-md shadow-2xl border border-slate-300 flex flex-col justify-between shrink-0 select-none"
                >
                  <div>
                    {/* 1. FIXED HEADER ZONE ON FULL SHEET */}
                    {activeZones.header.height === 0 ? (
                      <div
                        onClick={() => {
                          setSelectedZone('header');
                          handleZoneHeightChange('header', 60);
                          toast.info('Enabled Fixed Header (60 pt)');
                        }}
                        className="py-2 px-3 border-2 border-dashed border-sky-400/50 text-[11px] text-sky-600 bg-sky-50/25 font-semibold text-center cursor-pointer hover:bg-sky-50/60 rounded-t-md transition-colors"
                      >
                        + Click to enable Fixed Header Zone (Currently 0 pt / No Header)
                      </div>
                    ) : (
                      <div
                        onClick={() => setSelectedZone('header')}
                        style={{
                          width: innerPageWidth,
                          height: activeZones.header.height,
                          backgroundImage:
                            'radial-gradient(rgba(14,165,233,0.28) 1px, transparent 1px)',
                          backgroundSize: '8px 8px',
                        }}
                        className={`relative rounded-t-md border-2 transition-colors ${
                          selectedZone === 'header'
                            ? 'border-sky-500 bg-sky-50/40'
                            : 'border-sky-300/70 bg-sky-50/15'
                        }`}
                      >
                        <div className="absolute -top-2.5 left-2 px-2 py-0.5 rounded bg-sky-600 text-white text-[9px] font-bold uppercase tracking-wider z-20">
                          🔵 {isEditingPage2 ? 'Page 2+ Continuation ' : 'Page 1 '}Fixed Header ({activeZones.header.height}pt) — Drag blocks to move, bottom-right corner to resize
                        </div>

                        {activeZones.header.blocks.map((b) => {
                          const isSel = selectedZone === 'header' && b.id === selectedBlockId;
                          return (
                            <div
                              key={b.id}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                setSelectedZone('header');
                                setSelectedBlockId(b.id);
                                setSelectedBodyCol(null);
                                dragRef.current = {
                                  zone: 'header',
                                  blockId: b.id,
                                  mode: 'move',
                                  startX: e.clientX,
                                  startY: e.clientY,
                                  origFrame: { ...b.frame },
                                };
                              }}
                              style={{
                                position: 'absolute',
                                left: b.frame.x,
                                top: b.frame.y,
                                width: b.frame.w,
                                height: b.frame.h,
                                fontSize: b.style.font_size ?? 9,
                                fontWeight: b.style.font_weight ?? 400,
                                textAlign: b.style.align ?? 'left',
                              }}
                              className={`group cursor-move p-1.5 rounded transition-shadow overflow-hidden whitespace-pre-wrap ${
                                isSel
                                  ? 'ring-2 ring-sky-600 bg-sky-500/15 z-10'
                                  : 'border border-dashed border-sky-400/60 hover:border-sky-600'
                              }`}
                            >
                              {b.type === 'text' ? (
                                b.content
                              ) : b.type === 'image' ? (
                                b.source.kind === 'data_url' && b.source.data_url ? (
                                  <img
                                    src={b.source.data_url}
                                    alt={b.name}
                                    className="w-full h-full object-contain pointer-events-none"
                                  />
                                ) : (b.source.kind === 'company_logo' || !b.source.kind) && companyLogoUrl ? (
                                  <img
                                    src={companyLogoUrl}
                                    alt="Company Logo"
                                    className="w-full h-full object-contain pointer-events-none"
                                  />
                                ) : b.source.kind === 'company_signature' && companySignatureUrl ? (
                                  <img
                                    src={companySignatureUrl}
                                    alt="Signature"
                                    className="w-full h-full object-contain pointer-events-none"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-sky-600 gap-0.5 pointer-events-none">
                                    <ImageIcon className="w-5 h-5" />
                                    <span className="text-[8px] font-bold">
                                      {b.source.kind === 'company_signature' ? 'SIGNATURE' : 'COMPANY LOGO'}
                                    </span>
                                  </div>
                                )
                              ) : (
                                `[${(b.name || b.type).toUpperCase()}]`
                              )}

                              {/* Bottom-Right Resize Handle */}
                              <div
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedZone('header');
                                  setSelectedBlockId(b.id);
                                  dragRef.current = {
                                    zone: 'header',
                                    blockId: b.id,
                                    mode: 'resize',
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    origFrame: { ...b.frame },
                                  };
                                }}
                                title="Drag to resize block"
                                className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-sky-600 text-white flex items-center justify-center cursor-nwse-resize rounded-tl"
                              >
                                <Maximize2 className="w-2.5 h-2.5" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 2. VARIABLE / FLOW BODY SECTION ON FULL SHEET */}
                    <div className="my-3 rounded-md border-2 border-emerald-500/70 bg-emerald-50/20 p-3 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider">
                          🟢 {isEditingPage2 ? 'Continuing Flexible Area (Flows from Page 1 → Page 2 → Page 3+)' : `Variable / Flow Body (${def.layout.body.rows.length} Rows) — Click any part to change content or split`}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAddBodyRow(1)}
                            className="px-2 py-0.5 rounded bg-emerald-600/15 text-emerald-800 border border-emerald-500/40 text-[10px] font-semibold cursor-pointer hover:bg-emerald-600/25"
                          >
                            + 1-Part Row
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddBodyRow(2)}
                            className="px-2 py-0.5 rounded bg-emerald-600/15 text-emerald-800 border border-emerald-500/40 text-[10px] font-semibold cursor-pointer hover:bg-emerald-600/25"
                          >
                            + 2-Part Row
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddBodyRow(3)}
                            className="px-2 py-0.5 rounded bg-emerald-600/15 text-emerald-800 border border-emerald-500/40 text-[10px] font-semibold cursor-pointer hover:bg-emerald-600/25"
                          >
                            + 3-Part Row
                          </button>
                        </div>
                      </div>

                      {def.layout.body.rows.map((row, rIdx) => (
                        <div
                          key={row.id}
                          className="rounded-lg border border-emerald-400/60 bg-white p-2 space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-semibold">
                              Variable Row #{rIdx + 1} ({row.cols.length}{' '}
                              {row.cols.length === 1 ? 'Part' : 'Parts'})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
                                nextDef.layout.body.rows = nextDef.layout.body.rows.filter(
                                  (r) => r.id !== row.id
                                );
                                persistDraft(nextDef);
                              }}
                              className="text-rose-600 hover:underline cursor-pointer"
                            >
                              Remove Row
                            </button>
                          </div>

                          <div className="grid grid-cols-12 gap-2">
                            {row.cols.map((col) => {
                              const isColSelected =
                                selectedBodyCol?.rowId === row.id &&
                                selectedBodyCol?.colId === col.id;
                              const firstBlk = col.blocks[0];

                              return (
                                <div
                                  key={col.id}
                                  onClick={() => {
                                    setSelectedBodyCol({ rowId: row.id, colId: col.id });
                                    setSelectedBlockId(null);
                                  }}
                                  style={{ gridColumn: `span ${col.span} / span ${col.span}` }}
                                  className={`rounded-md border p-2.5 cursor-pointer transition-all ${
                                    isColSelected
                                      ? 'border-emerald-600 ring-2 ring-emerald-500 bg-emerald-50/60'
                                      : 'border-slate-200 bg-slate-50/70 hover:border-emerald-400'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[10px] font-bold text-emerald-800 mb-1">
                                    <span>Width: {col.span}/12</span>
                                    <span className="uppercase">{firstBlk?.type ?? 'Empty'}</span>
                                  </div>
                                  <div className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-3">
                                    {firstBlk?.type === 'text' ? (
                                      firstBlk.content
                                    ) : firstBlk?.type === 'image' ? (
                                      <div className="flex items-center gap-2">
                                        {firstBlk.source.kind === 'data_url' && firstBlk.source.data_url ? (
                                          <img
                                            src={firstBlk.source.data_url}
                                            alt={firstBlk.name}
                                            className="w-10 h-10 object-contain rounded border border-border bg-white p-0.5"
                                          />
                                        ) : (firstBlk.source.kind === 'company_logo' || !firstBlk.source.kind) && companyLogoUrl ? (
                                          <img
                                            src={companyLogoUrl}
                                            alt="Company Logo"
                                            className="w-10 h-10 object-contain rounded border border-border bg-white p-0.5"
                                          />
                                        ) : (
                                          <ImageIcon className="w-6 h-6 text-emerald-600" />
                                        )}
                                        <div>
                                          <div className="font-semibold text-foreground text-xs">
                                            {firstBlk.name || 'Photo / Logo'}
                                          </div>
                                          <div className="text-[10px] text-muted-foreground">
                                            {firstBlk.source.kind === 'data_url' ? 'Custom image' : 'Profile logo'}
                                          </div>
                                        </div>
                                      </div>
                                    ) : firstBlk?.type === 'table' ? (
                                      '📊 Expanding Line Items / Prescription Table (Continues across Page 1 → Page 2 → Page 3+)'
                                    ) : firstBlk?.type === 'totals' ? (
                                      '🧮 Subtotal, GST Breakdown, Round-Off & Grand Total Box'
                                    ) : firstBlk?.type === 'upi_qr' ? (
                                      '📱 Dynamic Vector UPI QR Code'
                                    ) : (
                                      firstBlk?.name || firstBlk?.type || 'Empty Part'
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. FIXED FOOTER ZONE ON FULL SHEET */}
                  {activeZones.footer.height === 0 ? (
                    <div
                      onClick={() => {
                        setSelectedZone('footer');
                        handleZoneHeightChange('footer', 50);
                        toast.info('Enabled Fixed Footer (50 pt)');
                      }}
                      className="py-2 px-3 border-2 border-dashed border-sky-400/50 text-[11px] text-sky-600 bg-sky-50/25 font-semibold text-center cursor-pointer hover:bg-sky-50/60 rounded-b-md transition-colors"
                    >
                      + Click to enable Fixed Footer Zone (Currently 0 pt / No Footer)
                    </div>
                  ) : (
                    <div
                      onClick={() => setSelectedZone('footer')}
                      style={{
                        width: innerPageWidth,
                        height: activeZones.footer.height,
                        backgroundImage:
                          'radial-gradient(rgba(14,165,233,0.28) 1px, transparent 1px)',
                        backgroundSize: '8px 8px',
                      }}
                      className={`relative rounded-b-md border-2 transition-colors ${
                        selectedZone === 'footer'
                          ? 'border-sky-500 bg-sky-50/40'
                          : 'border-sky-300/70 bg-sky-50/15'
                      }`}
                    >
                      <div className="absolute -top-2.5 left-2 px-2 py-0.5 rounded bg-sky-600 text-white text-[9px] font-bold uppercase tracking-wider z-20">
                        🔵 {isEditingPage2 ? 'Page 2+ Continuation ' : 'Page 1 '}Fixed Footer ({activeZones.footer.height}pt)
                      </div>

                    {activeZones.footer.blocks.map((b) => {
                      const isSel = selectedZone === 'footer' && b.id === selectedBlockId;
                      return (
                        <div
                          key={b.id}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setSelectedZone('footer');
                            setSelectedBlockId(b.id);
                            setSelectedBodyCol(null);
                            dragRef.current = {
                              zone: 'footer',
                              blockId: b.id,
                              mode: 'move',
                              startX: e.clientX,
                              startY: e.clientY,
                              origFrame: { ...b.frame },
                            };
                          }}
                          style={{
                            position: 'absolute',
                            left: b.frame.x,
                            top: b.frame.y,
                            width: b.frame.w,
                            height: b.frame.h,
                            fontSize: b.style.font_size ?? 8,
                            fontWeight: b.style.font_weight ?? 400,
                            textAlign: b.style.align ?? 'left',
                          }}
                          className={`cursor-move p-1 rounded overflow-hidden whitespace-pre-wrap ${
                            isSel
                              ? 'ring-2 ring-sky-600 bg-sky-500/15 z-10'
                              : 'border border-dashed border-sky-400/60 hover:border-sky-600'
                          }`}
                        >
                          {b.type === 'text' ? (
                            b.content
                          ) : b.type === 'image' ? (
                            b.source.kind === 'data_url' && b.source.data_url ? (
                              <img
                                src={b.source.data_url}
                                alt={b.name}
                                className="w-full h-full object-contain pointer-events-none"
                              />
                            ) : (b.source.kind === 'company_logo' || !b.source.kind) && companyLogoUrl ? (
                              <img
                                src={companyLogoUrl}
                                alt="Company Logo"
                                className="w-full h-full object-contain pointer-events-none"
                              />
                            ) : b.source.kind === 'company_signature' && companySignatureUrl ? (
                              <img
                                src={companySignatureUrl}
                                alt="Signature"
                                className="w-full h-full object-contain pointer-events-none"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-sky-600 gap-0.5 pointer-events-none">
                                <ImageIcon className="w-4 h-4" />
                                <span className="text-[7.5px] font-bold">
                                  {b.source.kind === 'company_signature' ? 'SIGNATURE' : 'COMPANY LOGO'}
                                </span>
                              </div>
                            )
                          ) : (
                            `[${(b.name || b.type).toUpperCase()}]`
                          )}

                          <div
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setSelectedZone('footer');
                              setSelectedBlockId(b.id);
                              dragRef.current = {
                                zone: 'footer',
                                blockId: b.id,
                                mode: 'resize',
                                startX: e.clientX,
                                startY: e.clientY,
                                origFrame: { ...b.frame },
                              };
                            }}
                            className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-sky-600 text-white flex items-center justify-center cursor-nwse-resize rounded-tl"
                          >
                            <Maximize2 className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Inspector: Inspect Fixed Block OR Variable Body Part */}
            <div className="lg:col-span-4 space-y-4">
              {selectedBodyCol && activeBodyColObj ? (
                <GlassCard className="p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <h3 className="font-display text-base font-bold">
                        Variable Part Inspector
                      </h3>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Column Width Span (1 to 12)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={activeBodyColObj.span}
                      onChange={(e) => {
                        const span = Math.max(1, Math.min(12, Number(e.target.value) || 6));
                        const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
                        const r = nextDef.layout.body.rows.find(
                          (row) => row.id === selectedBodyCol.rowId
                        );
                        const c = r?.cols.find((col) => col.id === selectedBodyCol.colId);
                        if (c) {
                          c.span = span;
                          persistDraft(nextDef);
                        }
                      }}
                    />
                  </div>

                  {activeBodyColObj.blocks[0]?.type === 'text' ? (
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Part Text & {'{{Tokens}}'}
                      </label>
                      <Textarea
                        value={activeBodyColObj.blocks[0].content}
                        onChange={(e) => {
                          const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
                          const r = nextDef.layout.body.rows.find(
                            (row) => row.id === selectedBodyCol.rowId
                          );
                          const c = r?.cols.find((col) => col.id === selectedBodyCol.colId);
                          const blk = c?.blocks[0];
                          if (blk && blk.type === 'text') {
                            blk.content = e.target.value;
                            persistDraft(nextDef);
                          }
                        }}
                      />
                      <VariableTokenInserter
                        onInsertToken={(tok) => {
                          const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
                          const r = nextDef.layout.body.rows.find(
                            (row) => row.id === selectedBodyCol.rowId
                          );
                          const c = r?.cols.find((col) => col.id === selectedBodyCol.colId);
                          const blk = c?.blocks[0];
                          if (blk && blk.type === 'text') {
                            blk.content = blk.content ? `${blk.content} ${tok}` : tok;
                            persistDraft(nextDef);
                          }
                        }}
                        customVariables={def.fields
                          .filter((f) => f.scope === 'document' && !f.key.startsWith('company.'))
                          .map((f) => ({ key: f.key, label: f.label }))}
                        onAddCustomVariable={(label) => {
                          const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                          const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
                          if (!nextDef.fields.some((f) => f.key === key)) {
                            nextDef.fields.push({
                              key,
                              label,
                              type: 'text',
                              scope: 'document',
                              required: false,
                              order: nextDef.fields.length + 1,
                            });
                          }
                          const r = nextDef.layout.body.rows.find(
                            (row) => row.id === selectedBodyCol.rowId
                          );
                          const c = r?.cols.find((col) => col.id === selectedBodyCol.colId);
                          const blk = c?.blocks[0];
                          if (blk && blk.type === 'text') {
                            blk.content = blk.content ? `${blk.content} {{${key}}}` : `{{${key}}}`;
                          }
                          persistDraft(nextDef);
                          toast.success(`Attached variable {{${key}}}`);
                        }}
                      />
                    </div>
                  ) : null}

                  {activeBodyColObj.blocks[0]?.type === 'image' ? (
                    <ImageBlockEditor
                      source={activeBodyColObj.blocks[0].source}
                      name={activeBodyColObj.blocks[0].name}
                      fit={activeBodyColObj.blocks[0].fit}
                      companyLogoUrl={companyLogoUrl}
                      companySignatureUrl={companySignatureUrl}
                      onUploadClick={() => studioImageInputRef.current?.click()}
                      onSourceChange={(src) => {
                        const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
                        const r = nextDef.layout.body.rows.find((row) => row.id === selectedBodyCol.rowId);
                        const c = r?.cols.find((col) => col.id === selectedBodyCol.colId);
                        const blk = c?.blocks[0];
                        if (blk && blk.type === 'image') {
                          blk.source = src;
                          persistDraft(nextDef);
                        }
                      }}
                      onFitChange={(fit) => {
                        const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
                        const r = nextDef.layout.body.rows.find((row) => row.id === selectedBodyCol.rowId);
                        const c = r?.cols.find((col) => col.id === selectedBodyCol.colId);
                        const blk = c?.blocks[0];
                        if (blk && blk.type === 'image') {
                          blk.fit = fit;
                          persistDraft(nextDef);
                        }
                      }}
                    />
                  ) : null}

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">
                      Replace Content of This Part With:
                    </label>
                    <div className="grid grid-cols-1 gap-1.5 max-h-[280px] overflow-y-auto pr-1">
                      {COMPONENT_KIND_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.kind}
                            type="button"
                            onClick={() =>
                              handleAssignContentToBodyCol(
                                selectedBodyCol.rowId,
                                selectedBodyCol.colId,
                                opt.kind
                              )
                            }
                            className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-left hover:border-emerald-400 cursor-pointer flex items-start gap-2.5 transition-all"
                          >
                            <Icon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs font-semibold text-foreground">{opt.title}</div>
                              <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </GlassCard>
              ) : (
                <GlassCard className="p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <Move className="w-4 h-4 text-sky-400" />
                      <h3 className="font-display text-base font-bold">
                        Fixed Block Inspector ({selectedZone.toUpperCase()})
                      </h3>
                    </div>
                    {selectedBlock ? (
                      <button
                        onClick={handleDeleteSelectedBlock}
                        className="p-1.5 text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Delete Block"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>

                  {!selectedBlock ? (
                    <p className="text-xs text-muted-foreground">
                      Click any block in the Fixed Header/Footer to drag, resize, or edit its text, OR click any green Variable Part in the Body.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedBlock.type === 'text' ? (
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground block mb-1">
                            Content & Dynamic Variables (Click variables below to insert)
                          </label>
                          <Textarea
                            value={selectedBlock.content}
                            onChange={(e) =>
                              updateSelectedFixedBlock((b) =>
                                b.type === 'text' ? { ...b, content: e.target.value } : b
                              )
                            }
                          />
                          <VariableTokenInserter
                            onInsertToken={(tok) => {
                              updateSelectedFixedBlock((b) =>
                                b.type === 'text'
                                  ? { ...b, content: b.content ? `${b.content} ${tok}` : tok }
                                  : b
                              );
                            }}
                            customVariables={def.fields
                              .filter((f) => f.scope === 'document' && !f.key.startsWith('company.'))
                              .map((f) => ({ key: f.key, label: f.label }))}
                            onAddCustomVariable={(label) => {
                              const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                              const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
                              if (!nextDef.fields.some((f) => f.key === key)) {
                                nextDef.fields.push({
                                  key,
                                  label,
                                  type: 'text',
                                  scope: 'document',
                                  required: false,
                                  order: nextDef.fields.length + 1,
                                });
                              }
                              const zTarget = getTargetZonesMut(nextDef);
                              const b = zTarget[selectedZone].blocks.find(
                                (blk) => blk.id === selectedBlock.id
                              );
                              if (b && b.type === 'text') {
                                b.content = b.content ? `${b.content} {{${key}}}` : `{{${key}}}`;
                              }
                              persistDraft(nextDef);
                              toast.success(`Attached variable {{${key}}}`);
                            }}
                          />
                        </div>
                      ) : null}

                      {selectedBlock.type === 'image' ? (
                        <ImageBlockEditor
                          source={selectedBlock.source}
                          name={selectedBlock.name}
                          fit={selectedBlock.fit}
                          companyLogoUrl={companyLogoUrl}
                          companySignatureUrl={companySignatureUrl}
                          onUploadClick={() => studioImageInputRef.current?.click()}
                          onSourceChange={(src) =>
                            updateSelectedFixedBlock((b) =>
                              b.type === 'image' ? { ...b, source: src } : b
                            )
                          }
                          onFitChange={(fit) =>
                            updateSelectedFixedBlock((b) =>
                              b.type === 'image' ? { ...b, fit } : b
                            )
                          }
                        />
                      ) : null}

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">X (pt)</label>
                          <Input
                            type="number"
                            value={selectedBlock.frame.x}
                            onChange={(e) =>
                              updateSelectedFixedBlock((b) => ({
                                ...b,
                                frame: { ...b.frame, x: Number(e.target.value) },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Y (pt)</label>
                          <Input
                            type="number"
                            value={selectedBlock.frame.y}
                            onChange={(e) =>
                              updateSelectedFixedBlock((b) => ({
                                ...b,
                                frame: { ...b.frame, y: Number(e.target.value) },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            Width (pt)
                          </label>
                          <Input
                            type="number"
                            value={selectedBlock.frame.w}
                            onChange={(e) =>
                              updateSelectedFixedBlock((b) => ({
                                ...b,
                                frame: { ...b.frame, w: Number(e.target.value) },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            Height (pt)
                          </label>
                          <Input
                            type="number"
                            value={selectedBlock.frame.h}
                            onChange={(e) =>
                              updateSelectedFixedBlock((b) => ({
                                ...b,
                                frame: { ...b.frame, h: Number(e.target.value) },
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            Font Size (pt)
                          </label>
                          <Input
                            type="number"
                            value={selectedBlock.style.font_size ?? 9}
                            onChange={(e) =>
                              updateSelectedFixedBlock((b) => ({
                                ...b,
                                style: { ...b.style, font_size: Number(e.target.value) },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Align</label>
                          <Select
                            value={selectedBlock.style.align ?? 'left'}
                            onChange={(e) =>
                              updateSelectedFixedBlock((b) => ({
                                ...b,
                                style: {
                                  ...b.style,
                                  align: e.target.value as 'left' | 'center' | 'right',
                                },
                              }))
                            }
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </GlassCard>
              )}
            </div>
          </>

        ) : activeTab === 'fields' ? (
          <GlassCard className="lg:col-span-12 p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">
              Template Field Registry ({def.fields.length} Fields)
            </h2>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Input
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="New custom field label (e.g. Patient Age, Vehicle Number, Batch No.)"
              />
              <Select
                value={newFieldScope}
                onChange={(e) => setNewFieldScope(e.target.value as 'document' | 'line_item')}
                className="sm:w-48"
              >
                <option value="document">Document Header Field</option>
                <option value="line_item">Line Item Column Field</option>
              </Select>
              <Button
                variant="primary"
                onClick={() => {
                  if (!newFieldLabel.trim()) return;
                  const key = newFieldLabel
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '_');
                  const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
                  nextDef.fields.push({
                    key,
                    label: newFieldLabel.trim(),
                    type: 'text',
                    scope: newFieldScope,
                    required: false,
                    order: nextDef.fields.length + 1,
                  });
                  setNewFieldLabel('');
                  persistDraft(nextDef);
                  toast.success(`Registered field {{${key}}}`);
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Add Field</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {def.fields.map((f) => (
                <div
                  key={f.key}
                  className="rounded-xl border border-border bg-muted/30 p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold">{f.label}</div>
                    <div className="font-mono text-xs text-gold">
                      {'{{'}
                      {f.key}
                      {'}}'} • {f.scope}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="lg:col-span-12 p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">Page Size, Theme & Sequence</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Page Size</label>
                <Select
                  value={def.page.size}
                  onChange={(e) => {
                    const chosen = COMMON_PAGE_SIZES.find((s) => s.id === e.target.value);
                    if (!chosen) return;
                    const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
                    nextDef.page.size = chosen.id;
                    nextDef.page.width = chosen.width;
                    nextDef.page.height = chosen.height;
                    nextDef.page.margin = chosen.margin;
                    persistDraft(nextDef);
                  }}
                >
                  {COMMON_PAGE_SIZES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Primary Brand Hex Color
                </label>
                <Input
                  type="color"
                  value={def.theme.colors.primary}
                  onChange={(e) => {
                    const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
                    nextDef.theme.colors.primary = e.target.value;
                    persistDraft(nextDef);
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Sequence Pattern
                </label>
                <Input
                  value={def.config.sequence.pattern}
                  onChange={(e) => {
                    const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
                    nextDef.config.sequence.pattern = e.target.value;
                    persistDraft(nextDef);
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Tax Mode</label>
                <Select
                  value={def.config.tax_mode}
                  onChange={(e) => {
                    const nextDef: TemplateDefinition = JSON.parse(JSON.stringify(def));
                    nextDef.config.tax_mode = e.target.value as 'exclusive' | 'inclusive' | 'none';
                    persistDraft(nextDef);
                  }}
                >
                  <option value="exclusive">GST Exclusive</option>
                  <option value="inclusive">GST Inclusive</option>
                  <option value="none">No GST (Bill of Supply)</option>
                </Select>
              </div>
            </div>
          </GlassCard>
        )}

        {activeTab === 'preview' && (
          <div className="lg:col-span-12 space-y-4">
            <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold">Live Vector PDF Preview Studio</h3>
                  <p className="text-xs text-muted-foreground">
                    Compiled directly in-browser using @react-pdf/renderer ({def.page.size.toUpperCase()} • {Math.round(def.page.width)} × {Math.round(def.page.height)} pt)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreviewPdf(false)}
                  disabled={isGeneratingPreview}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingPreview ? 'animate-spin' : ''}`} />
                  <span>Recompile PDF</span>
                </Button>
                {previewUrl ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(previewUrl, '_blank')}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in Browser Window</span>
                    </Button>
                    <a
                      href={previewUrl}
                      download={`${tpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'invoice-template'}.pdf`}
                      className="inline-flex items-center justify-center font-medium transition-all h-8 px-3 text-xs rounded-lg gap-1.5 bg-gradient-to-r from-[#E8C27A] to-[#C69642] text-[#12111A] font-semibold shadow-sm hover:opacity-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </a>
                  </>
                ) : null}
              </div>
            </GlassCard>

            {isGeneratingPreview ? (
              <GlassCard className="p-16 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-gold" />
                <p className="text-sm font-medium">Compiling Vector PDF Layout…</p>
                <p className="text-xs text-muted-foreground">Evaluating formulas, GST tables, and pagination</p>
              </GlassCard>
            ) : isPreviewModalOpen ? (
              <GlassCard className="p-16 text-center space-y-3">
                <Eye className="w-8 h-8 text-gold mx-auto" />
                <p className="text-sm font-semibold">Live Preview is currently open in the modal viewer.</p>
                <p className="text-xs text-muted-foreground">Close the modal to view the in-page studio canvas.</p>
                <Button variant="outline" size="sm" onClick={() => setIsPreviewModalOpen(false)}>
                  Close Modal & View In-Studio
                </Button>
              </GlassCard>
            ) : previewUrl ? (
              <GlassCard className="p-2 overflow-hidden shadow-2xl">
                <iframe
                  title="Live PDF Preview Studio"
                  src={`${previewUrl}#toolbar=1&navpanes=0`}
                  allow="fullscreen"
                  className="w-full h-[82vh] rounded-lg border border-border bg-white"
                />
              </GlassCard>
            ) : (
              <GlassCard className="p-16 text-center space-y-4">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No preview generated yet.</p>
                <Button variant="gold" onClick={() => handlePreviewPdf(false)}>
                  <Eye className="w-4 h-4" />
                  <span>Generate Live PDF Preview</span>
                </Button>
              </GlassCard>
            )}
          </div>
        )}
      </div>

      {/* Full-Screen PDF Preview Modal */}
      <Modal
        open={isPreviewModalOpen && Boolean(previewUrl)}
        onClose={() => setIsPreviewModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gold" />
            <span>{tpl.name} — Live Vector PDF Preview</span>
            <span className="text-xs text-muted-foreground font-normal">
              ({def.page.size.toUpperCase()} • {Math.round(def.page.width)} × {Math.round(def.page.height)} pt)
            </span>
          </div>
        }
        actions={
          previewUrl ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(previewUrl, '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </Button>
              <a
                href={previewUrl}
                download={`${tpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'invoice-template'}.pdf`}
                className="inline-flex items-center justify-center font-medium transition-all h-8 px-3 text-xs rounded-lg gap-1.5 bg-gradient-to-r from-[#E8C27A] to-[#C69642] text-[#12111A] font-semibold shadow-sm hover:opacity-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </a>
            </div>
          ) : null
        }
      >
        {previewUrl ? (
          <div className="flex flex-col items-center w-full space-y-3">
            <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <Eye className="w-3.5 h-3.5 text-gold" />
                <span>Vector PDF preview rendered in real-time</span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(previewUrl, '_blank')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Full Tab</span>
                </Button>
                <a
                  href={previewUrl}
                  download={`${tpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'invoice-template'}.pdf`}
                  className="inline-flex items-center gap-1 text-xs text-gold underline font-semibold px-2 py-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .pdf</span>
                </a>
              </div>
            </div>
            <iframe
              title={`${tpl.name} PDF Preview`}
              src={`${previewUrl}#toolbar=1&navpanes=0`}
              allow="fullscreen"
              className="w-full h-[76vh] rounded-xl border border-border bg-white shadow-inner"
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

