import type { DocType, FieldDef, Template, TemplateDefinition, TemplateVersion } from '../core/schema/types';

export function buildGstClassicDefinition(opts?: {
  primaryColor?: string;
  accentColor?: string;
  title?: string;
  series?: string;
  taxMode?: 'exclusive' | 'inclusive' | 'none';
}): TemplateDefinition {
  const primary = opts?.primaryColor ?? '#5B3FD9';
  const accent = opts?.accentColor ?? '#B8892E';
  const title = opts?.title ?? 'TAX INVOICE';
  const series = opts?.series ?? 'INV';
  const taxMode = opts?.taxMode ?? 'exclusive';

  const fields: FieldDef[] = [
    {
      key: 'client_name',
      label: 'Client / Customer Name',
      type: 'text',
      scope: 'document',
      required: true,
      group: 'Bill To',
      order: 1,
      placeholder: 'e.g. Apex Enterprises Pvt Ltd',
      catalog: {
        source: 'clients',
        match_on: 'name',
        fills: {
          client_gstin: 'gstin',
          client_address: 'billing_address.line1',
          client_phone: 'phone',
          place_of_supply: 'billing_address.state_code',
        },
      },
    },
    {
      key: 'client_gstin',
      label: 'Client GSTIN',
      type: 'gstin',
      scope: 'document',
      required: false,
      group: 'Bill To',
      order: 2,
      placeholder: '29AABCU9603R1ZJ (Optional for B2C)',
    },
    {
      key: 'client_address',
      label: 'Billing Address',
      type: 'multiline',
      scope: 'document',
      required: false,
      group: 'Bill To',
      order: 3,
      placeholder: 'Street, City, State & PIN',
    },
    {
      key: 'client_phone',
      label: 'Client Phone',
      type: 'phone',
      scope: 'document',
      required: false,
      group: 'Bill To',
      order: 4,
    },
    {
      key: 'po_number',
      label: 'PO / Reference No.',
      type: 'text',
      scope: 'document',
      required: false,
      group: 'Document Info',
      order: 5,
      placeholder: 'Optional PO or Ref #',
    },
    {
      key: 'shipping_charges',
      label: 'Shipping / Packing Charges (₹)',
      type: 'money',
      scope: 'document',
      required: false,
      default: '0',
      group: 'Adjustments & Notes',
      order: 6,
    },
    {
      key: 'invoice_discount',
      label: 'Additional Discount (₹)',
      type: 'money',
      scope: 'document',
      required: false,
      default: '0',
      group: 'Adjustments & Notes',
      order: 7,
    },
    {
      key: 'notes',
      label: 'Terms & Notes',
      type: 'multiline',
      scope: 'document',
      required: false,
      default: '1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.',
      group: 'Adjustments & Notes',
      order: 8,
    },
    // Line item fields
    {
      key: 'item_name',
      label: 'Item / Service Description',
      type: 'text',
      scope: 'line_item',
      required: true,
      order: 1,
      catalog: {
        source: 'items',
        match_on: 'name',
        fills: {
          hsn_sac: 'hsn_sac',
          unit: 'unit',
          rate: 'rate',
          gst_rate: 'tax_rate',
        },
      },
    },
    {
      key: 'hsn_sac',
      label: 'HSN/SAC',
      type: 'text',
      scope: 'line_item',
      required: false,
      default: '',
      order: 2,
    },
    {
      key: 'qty',
      label: 'Qty',
      type: 'number',
      scope: 'line_item',
      required: true,
      default: '1',
      order: 3,
    },
    {
      key: 'unit',
      label: 'Unit',
      type: 'text',
      scope: 'line_item',
      required: false,
      default: 'NOS',
      order: 4,
    },
    {
      key: 'rate',
      label: 'Rate (₹)',
      type: 'money',
      scope: 'line_item',
      required: true,
      default: '0',
      order: 5,
    },
    {
      key: 'discount_pct',
      label: 'Disc %',
      type: 'percent',
      scope: 'line_item',
      required: false,
      default: '0',
      order: 6,
    },
    {
      key: 'gst_rate',
      label: 'GST %',
      type: 'select',
      scope: 'line_item',
      required: true,
      options: ['0', '5', '12', '18', '28'],
      default: taxMode === 'none' ? '0' : '18',
      order: 7,
    },
  ];

  return {
    schema_version: 1,
    page: {
      size: 'A4',
      orientation: 'portrait',
      width: 595.28,
      height: 841.89,
      margin: 28,
    },
    theme: {
      font_family: 'Inter',
      base_font_size: 9,
      colors: {
        primary,
        accent,
        text: '#111827',
        muted: '#6B7280',
        border: '#E5E7EB',
        table_header_bg: '#F3F0FF',
        table_stripe_bg: '#F9FAFB',
      },
    },
    config: {
      currency: 'INR',
      locale: 'en-IN',
      tax_mode: taxMode,
      gst_preset: taxMode === 'none' ? 'none' : 'standard',
      sequence: {
        series,
        pattern: `${series}/{FY}/{SEQ:4}`,
        reset: 'fiscal_year',
      },
      rounding: {
        line_dp: 2,
        mode: 'half_up',
        grand_total: 'nearest_1',
        show_round_off_line: true,
      },
      amount_words: {
        enabled: true,
        style: 'indian',
        prefix: 'Rupees',
        suffix: 'Only',
      },
      due_days: 15,
      watermark: {
        draft: true,
        cancelled: true,
      },
    },
    fields,
    computed: [
      { key: 'taxable', label: 'Taxable Value', scope: 'line_item', expr: 'qty * rate', format: 'money', system: true },
      { key: 'line_tax', label: 'Tax Amount', scope: 'line_item', expr: 'round(taxable * gst_rate / 100, 2)', format: 'money', system: true },
      { key: 'line_total', label: 'Line Total', scope: 'line_item', expr: 'taxable + line_tax', format: 'money', system: true },
      { key: 'subtotal', label: 'Taxable Subtotal', scope: 'document', expr: 'sum(items.taxable)', format: 'money', system: true },
      { key: 'tax_total', label: 'Total GST', scope: 'document', expr: 'sum(items.line_tax)', format: 'money', system: true },
      { key: 'grand_total', label: 'Grand Total', scope: 'document', expr: 'round(subtotal + tax_total + shipping_charges - invoice_discount, 0)', format: 'money', system: true },
    ],
    layout: {
      zones: {
        header: {
          height: 96,
          blocks: [
            {
              id: 'blk_company_name',
              name: 'Company Title',
              type: 'text',
              content: '{{company.name}}',
              style: { font_size: 16, font_weight: 700, color: 'theme.primary' },
              frame: { x: 0, y: 0, w: 320, h: 24 },
              z: 1,
            },
            {
              id: 'blk_company_details',
              name: 'Company Address & GSTIN',
              type: 'text',
              content: '{{company.address.full}}\nGSTIN: {{company.gstin | default:"Unregistered"}} • Phone: {{company.phone}}',
              style: { font_size: 8.5, color: 'theme.muted', line_height: 1.4 },
              frame: { x: 0, y: 26, w: 330, h: 52 },
              z: 2,
            },
            {
              id: 'blk_doc_title',
              name: 'Document Heading',
              type: 'text',
              content: title,
              style: { font_size: 18, font_weight: 700, color: 'theme.primary', align: 'right' },
              frame: { x: 340, y: 0, w: 199, h: 24 },
              z: 3,
            },
            {
              id: 'blk_doc_meta',
              name: 'Invoice Meta',
              type: 'text',
              content: 'No: {{doc.number}}\nDate: {{doc.issue_date | date:"DD MMM YYYY"}}\nDue: {{doc.due_date | date:"DD MMM YYYY"}}',
              style: { font_size: 9, font_weight: 500, align: 'right', line_height: 1.45 },
              frame: { x: 340, y: 28, w: 199, h: 54 },
              z: 4,
            },
          ],
        },
        footer: {
          height: 32,
          blocks: [
            {
              id: 'blk_footer_brand',
              name: 'Footer Tagline',
              type: 'text',
              content: 'Generated locally with INGEN • Computer generated document',
              style: { font_size: 7.5, color: 'theme.muted' },
              frame: { x: 0, y: 8, w: 300, h: 16 },
              z: 1,
            },
            {
              id: 'blk_page_no',
              name: 'Page Counter',
              type: 'text',
              content: 'Page {{page.number}} of {{page.total}}',
              style: { font_size: 8, color: 'theme.muted', align: 'right' },
              frame: { x: 380, y: 8, w: 159, h: 16 },
              z: 2,
            },
          ],
        },
        left: { width: 0, blocks: [] },
        right: { width: 0, blocks: [] },
      },
      body: {
        row_gap: 12,
        rows: [
          {
            id: 'row_billto',
            gap: 12,
            keep_together: true,
            cols: [
              {
                id: 'col_billto',
                span: 7,
                blocks: [
                  {
                    id: 'blk_billto_card',
                    name: 'Bill To Box',
                    type: 'text',
                    content:
                      'BILL TO:\n{{client_name}}\n{{client_address}}\nGSTIN: {{client_gstin | default:"—"}} | Ph: {{client_phone | default:"—"}}',
                    style: {
                      font_size: 9,
                      line_height: 1.45,
                      padding: [8, 10, 8, 10],
                      background: '#F9FAFB',
                      border: { width: 1, color: '#E5E7EB', radius: 6 },
                    },
                  },
                ],
              },
              {
                id: 'col_supply',
                span: 5,
                blocks: [
                  {
                    id: 'blk_supply_card',
                    name: 'Supply Meta Box',
                    type: 'text',
                    content:
                      'Place of Supply: State Code {{doc.place_of_supply}}\nPO / Ref No: {{po_number | default:"—"}}',
                    style: {
                      font_size: 9,
                      line_height: 1.45,
                      padding: [8, 10, 8, 10],
                      background: '#F9FAFB',
                      border: { width: 1, color: '#E5E7EB', radius: 6 },
                    },
                  },
                  {
                    id: 'blk_company_custom',
                    name: 'Company Custom Fields',
                    type: 'custom_kv',
                    source: 'company',
                    columns: 1,
                    style: { font_size: 8, color: 'theme.muted', padding: [4, 2, 0, 2] },
                  },
                ],
              },
            ],
          },
          {
            id: 'row_items_table',
            gap: 0,
            keep_together: false,
            cols: [
              {
                id: 'col_table',
                span: 12,
                blocks: [
                  {
                    id: 'blk_items_table',
                    name: 'Line Items Table',
                    type: 'table',
                    show_serial: true,
                    striped: true,
                    repeat_header: true,
                    style: {},
                    header_style: {
                      font_size: 8.5,
                      font_weight: 700,
                      color: 'theme.primary',
                      background: 'theme.table_header_bg',
                    },
                    row_style: {
                      font_size: 8.5,
                    },
                    columns: [
                      { id: 'c_item', header: 'Item & Description', value: '{{item_name}}', width: 4.2, align: 'left' },
                      { id: 'c_hsn', header: 'HSN/SAC', value: '{{hsn_sac}}', width: 1.4, align: 'center' },
                      { id: 'c_qty', header: 'Qty', value: '{{qty}} {{unit}}', width: 1.2, align: 'right' },
                      { id: 'c_rate', header: 'Rate', value: '{{rate | money:nosymbol}}', width: 1.6, align: 'right' },
                      { id: 'c_taxable', header: 'Taxable', value: '{{taxable | money:nosymbol}}', width: 1.8, align: 'right' },
                      { id: 'c_gst', header: 'GST', value: '{{gst_rate | percent}}', width: 1.0, align: 'right' },
                      { id: 'c_total', header: 'Total', value: '{{line_total | money:nosymbol}}', width: 2.0, align: 'right' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: 'row_totals_and_qr',
            gap: 14,
            keep_together: true,
            cols: [
              {
                id: 'col_payment_qr',
                span: 6,
                blocks: [
                  {
                    id: 'blk_upi_qr',
                    name: 'UPI Payment QR',
                    type: 'upi_qr',
                    amount_key: 'grand_total',
                    size: 84,
                    caption: 'Scan with any UPI App to pay',
                    style: {},
                  },
                  {
                    id: 'blk_bank_details',
                    name: 'Bank Details',
                    type: 'bank_details',
                    title: 'Bank Details',
                    style: { font_size: 8, color: 'theme.muted', padding: [6, 0, 0, 0] },
                  },
                ],
              },
              {
                id: 'col_totals',
                span: 6,
                blocks: [
                  {
                    id: 'blk_totals_box',
                    name: 'Totals Breakdown',
                    type: 'totals',
                    show_amount_in_words: true,
                    style: {},
                    rows: [
                      { label: 'Taxable Subtotal', value: '{{subtotal | money}}' },
                      { label: 'CGST', value: '{{cgst_total | money}}' },
                      { label: 'SGST', value: '{{sgst_total | money}}' },
                      { label: 'IGST', value: '{{igst_total | money}}' },
                      { label: 'Shipping & Packing', value: '{{shipping_charges | money}}' },
                      { label: 'Discount', value: '{{discount_total | money}}' },
                      { label: 'Round Off', value: '{{round_off | money}}' },
                      { label: 'Grand Total', value: '{{grand_total | money}}', emphasis: true },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: 'row_hsn_and_sign',
            gap: 14,
            keep_together: true,
            cols: [
              {
                id: 'col_hsn_notes',
                span: 8,
                blocks: [
                  {
                    id: 'blk_hsn_summary',
                    name: 'HSN Tax Summary',
                    type: 'hsn_summary',
                    style: { font_size: 7.5 },
                  },
                  {
                    id: 'blk_notes',
                    name: 'Notes & Terms',
                    type: 'text',
                    content: 'Terms & Conditions:\n{{notes}}',
                    style: { font_size: 8, color: 'theme.muted', padding: [6, 0, 0, 0] },
                  },
                ],
              },
              {
                id: 'col_sign',
                span: 4,
                blocks: [
                  {
                    id: 'blk_sign',
                    name: 'Authorised Signature',
                    type: 'signature',
                    source: 'company_signature',
                    caption: 'For {{company.name}}\nAuthorised Signatory',
                    style: { align: 'right' },
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  };
}

export interface StarterTemplatePreset {
  id: string;
  versionId: string;
  name: string;
  doc_type: DocType;
  definition: TemplateDefinition;
}

export const STARTER_TEMPLATES: StarterTemplatePreset[] = [
  {
    id: 'tpl_starter_gst_classic',
    versionId: 'tpv_starter_gst_classic_v1',
    name: 'GST Tax Invoice (Obsidian Classic)',
    doc_type: 'tax_invoice',
    definition: buildGstClassicDefinition({
      primaryColor: '#5B3FD9',
      accentColor: '#B8892E',
      title: 'TAX INVOICE',
      series: 'INV',
      taxMode: 'exclusive',
    }),
  },
  {
    id: 'tpl_starter_gst_royal',
    versionId: 'tpv_starter_gst_royal_v1',
    name: 'GST Tax Invoice (Champagne Gold)',
    doc_type: 'tax_invoice',
    definition: buildGstClassicDefinition({
      primaryColor: '#1E1B4B',
      accentColor: '#9A7220',
      title: 'TAX INVOICE',
      series: 'INV',
      taxMode: 'inclusive',
    }),
  },
  {
    id: 'tpl_starter_simple_bill',
    versionId: 'tpv_starter_simple_bill_v1',
    name: 'Simple Bill of Supply (Non-GST)',
    doc_type: 'bill_of_supply',
    definition: buildGstClassicDefinition({
      primaryColor: '#0F766E',
      accentColor: '#B8892E',
      title: 'BILL OF SUPPLY',
      series: 'BOS',
      taxMode: 'none',
    }),
  },
  {
    id: 'tpl_starter_quotation',
    versionId: 'tpv_starter_quotation_v1',
    name: 'Business Quotation / Estimate',
    doc_type: 'quotation',
    definition: buildGstClassicDefinition({
      primaryColor: '#4338CA',
      accentColor: '#B8892E',
      title: 'QUOTATION',
      series: 'QTN',
      taxMode: 'exclusive',
    }),
  },
  {
    id: 'tpl_starter_receipt',
    versionId: 'tpv_starter_receipt_v1',
    name: 'Payment Receipt Voucher',
    doc_type: 'receipt',
    definition: buildGstClassicDefinition({
      primaryColor: '#047857',
      accentColor: '#B8892E',
      title: 'PAYMENT RECEIPT',
      series: 'RCPT',
      taxMode: 'none',
    }),
  },
];

export function createStarterTemplateRecords(now = Date.now()): {
  templates: Template[];
  versions: TemplateVersion[];
} {
  const templates: Template[] = [];
  const versions: TemplateVersion[] = [];

  for (const preset of STARTER_TEMPLATES) {
    templates.push({
      id: preset.id,
      company_id: null,
      name: preset.name,
      doc_type: preset.doc_type,
      draft_definition: preset.definition,
      current_version_id: preset.versionId,
      has_unpublished_changes: false,
      archived: false,
      created_at: now,
      updated_at: now,
    });
    versions.push({
      id: preset.versionId,
      template_id: preset.id,
      version_no: 1,
      definition: preset.definition,
      definition_hash: `starter_${preset.id}_v1`,
      created_at: now,
    });
  }

  return { templates, versions };
}
