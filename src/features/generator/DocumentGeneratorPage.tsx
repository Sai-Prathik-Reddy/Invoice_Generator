import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  Eye,
  Sparkles,
  FileText,
  Barcode as BarcodeIcon,
  ShoppingBag,
  Camera,
} from 'lucide-react';
import { db } from '../../db/schema';
import { useAppStore } from '../../app/useAppStore';
import {
  BarcodeScannerModal,
  CatalogItemPickerModal,
  playScanFeedback,
  Button,
  GlassCard,
  Input,
  MoneyText,
  PageHeader,
  Select,
  Textarea,
} from '../../design-system/components';
import { INDIAN_STATES, validateAndParseGstin } from '../../core/validate/gstin';
import { addDaysIsoDate, amountInWords, todayIsoDate } from '../../core/format';
import { evaluateDocument } from '../../core/formula';
import { previewNextDocumentNumber, saveOrFinalizeDocument } from '../../db/repos';
import { DOC_TYPE_LABELS, type Item } from '../../core/schema/types';
import { compilePdfToBlob } from '../share/sharePdf';
import { toast } from 'sonner';

export function DocumentGeneratorPage({ editDocId }: { editDocId?: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeCompany } = useAppStore();

  const templates = useLiveQuery(() => db.templates.filter((t) => !t.archived).toArray(), []) ?? [];
  const savedClients =
    useLiveQuery(
      async () =>
        activeCompany
          ? db.clients.where('company_id').equals(activeCompany.id).toArray()
          : [],
      [activeCompany?.id]
    ) ?? [];
  const savedItems =
    useLiveQuery(
      async () =>
        activeCompany
          ? db.items.where('company_id').equals(activeCompany.id).toArray()
          : [],
      [activeCompany?.id]
    ) ?? [];

  const requestedTemplateId = searchParams.get('templateId');
  const duplicateId = searchParams.get('duplicateId');

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(todayIsoDate());
  const [dueDate, setDueDate] = useState<string>(addDaysIsoDate(todayIsoDate(), 15));
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(
    activeCompany?.address.state_code ?? '36'
  );
  const [values, setValues] = useState<Record<string, string>>({
    client_name: '',
    client_gstin: '',
    client_address: '',
    client_phone: '',
    po_number: '',
    shipping_charges: '0',
    invoice_discount: '0',
    notes: '1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.',
  });

  const [items, setItems] = useState<Array<Record<string, string>>>([
    {
      item_name: '',
      hsn_sac: '',
      qty: '1',
      unit: 'NOS',
      rate: '1000',
      discount_pct: '0',
      gst_rate: '18',
    },
  ]);

  const [nextNumPreview, setNextNumPreview] = useState<string>('INV/26-27/0001');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [customPropLabel, setCustomPropLabel] = useState('');

  // POS Barcode Scanner & Visual Catalog Picker Modals
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [catalogPickerOpen, setCatalogPickerOpen] = useState(false);
  const [activeRowScanIdx, setActiveRowScanIdx] = useState<number | null>(null);

  // Select default template
  useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) {
      const target =
        templates.find((t) => t.id === requestedTemplateId) ?? templates[0]!;
      setSelectedTemplateId(target.id);
    }
  }, [templates, requestedTemplateId, selectedTemplateId]);

  // Load existing draft or duplicate
  useEffect(() => {
    const loadId = editDocId || duplicateId;
    if (!loadId) return;
    db.documents.get(loadId).then((doc) => {
      if (!doc) return;
      setSelectedTemplateId(doc.template_id);
      if (editDocId) {
        setIssueDate(doc.issue_date);
        setDueDate(doc.due_date || addDaysIsoDate(doc.issue_date, 15));
      }
      setPlaceOfSupply(doc.place_of_supply || activeCompany?.address.state_code || '36');
      setValues(doc.values);
      setItems(doc.items.length > 0 ? doc.items : items);
    });
  }, [editDocId, duplicateId]);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? templates[0],
    [templates, selectedTemplateId]
  );

  // Sync default values for any custom template variable fields
  useEffect(() => {
    if (!activeTemplate || editDocId || duplicateId) return;
    const fields = activeTemplate.draft_definition.fields ?? [];
    setValues((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const f of fields) {
        if (f.scope === 'document' && next[f.key] === undefined && f.default !== undefined) {
          next[f.key] = f.default;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [activeTemplate, editDocId, duplicateId]);

  // Preview next sequence number
  useEffect(() => {
    if (!activeCompany || !activeTemplate) return;
    previewNextDocumentNumber(activeCompany, activeTemplate.draft_definition, issueDate).then(
      setNextNumPreview
    );
  }, [activeCompany, activeTemplate, issueDate]);

  const computed = useMemo(() => {
    if (!activeCompany || !activeTemplate) return null;
    return evaluateDocument({
      definition: activeTemplate.draft_definition,
      company: activeCompany,
      placeOfSupply,
      values,
      items,
    });
  }, [activeCompany, activeTemplate, placeOfSupply, values, items]);

  if (!activeCompany || !activeTemplate || !computed) {
    return (
      <GlassCard className="p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Please configure your Business Profile first before generating invoices.
        </p>
        <Button variant="gold" onClick={() => navigate('/onboarding')}>
          Set Up Business Profile
        </Button>
      </GlassCard>
    );
  }

  const docFields = activeTemplate.draft_definition.fields.filter(
    (f) => f.scope === 'document'
  );

  const handleSelectClientSuggestion = (clientName: string) => {
    const found = savedClients.find(
      (c) => c.name.toLowerCase() === clientName.toLowerCase()
    );
    if (!found) return;
    setValues((prev) => ({
      ...prev,
      client_name: found.name,
      client_gstin: found.gstin || '',
      client_address: found.billing_address.line1 || '',
      client_phone: found.phone || '',
    }));
    if (found.billing_address.state_code) {
      setPlaceOfSupply(found.billing_address.state_code);
    }
    toast.success(`Auto-filled details for ${found.name}`);
  };

  const handleSelectItemSuggestion = (rowIdx: number, itemNameOrBarcode: string) => {
    const q = itemNameOrBarcode.trim().toLowerCase();
    const found = savedItems.find(
      (i) => i.name.toLowerCase() === q || (i.barcode && i.barcode.toLowerCase() === q)
    );
    if (!found) return;
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = {
        ...next[rowIdx],
        item_name: found.name,
        barcode: found.barcode || '',
        hsn_sac: found.hsn_sac || '',
        unit: found.unit || 'NOS',
        rate: found.rate || '0',
        gst_rate: found.tax_rate || '18',
      };
      return next;
    });
    toast.success(`Selected ${found.name} (₹${found.rate}, GST ${found.tax_rate}%)`);
  };

  /**
   * Supermarket POS continuous barcode scanning handler.
   * If item exists in catalog, adds it to invoice (or increments quantity if already present).
   */
  const handleScanBarcodeOnInvoice = (scannedCode: string) => {
    const code = scannedCode.trim();
    if (!code) return;

    // Single-row scan mode (when user tapped the camera button inside a specific row)
    if (activeRowScanIdx !== null) {
      const targetIdx = activeRowScanIdx;
      setActiveRowScanIdx(null);
      const found = savedItems.find(
        (i) =>
          (i.barcode && i.barcode.toLowerCase() === code.toLowerCase()) ||
          i.name.toLowerCase() === code.toLowerCase()
      );
      if (found) {
        setItems((prev) => {
          const next = [...prev];
          if (next[targetIdx]) {
            next[targetIdx] = {
              ...next[targetIdx],
              item_name: found.name,
              barcode: found.barcode || code,
              hsn_sac: found.hsn_sac || '',
              unit: found.unit || 'NOS',
              rate: found.rate || '0',
              gst_rate: found.tax_rate || '18',
            };
          }
          return next;
        });
        toast.success(`Scanned & matched: ${found.name} (₹${found.rate})`);
      } else {
        setItems((prev) => {
          const next = [...prev];
          if (next[targetIdx]) {
            next[targetIdx] = { ...next[targetIdx], barcode: code };
          }
          return next;
        });
        toast.info(`Assigned barcode "${code}" to row #${targetIdx + 1}`);
      }
      return;
    }

    // Continuous POS Checkout Mode
    const found = savedItems.find(
      (i) =>
        (i.barcode && i.barcode.toLowerCase() === code.toLowerCase()) ||
        i.name.toLowerCase() === code.toLowerCase()
    );

    if (found) {
      setItems((prev) => {
        // Find existing matching row in current bill
        const existingIdx = prev.findIndex(
          (r) =>
            (r['barcode'] && r['barcode'].toLowerCase() === code.toLowerCase()) ||
            (r['item_name'] && r['item_name'].toLowerCase() === found.name.toLowerCase())
        );

        if (existingIdx >= 0) {
          const next = [...prev];
          const curQty = parseFloat(next[existingIdx]['qty'] || '1') || 1;
          const nextQty = String(curQty + 1);
          next[existingIdx] = { ...next[existingIdx], qty: nextQty };
          toast.success(`Incremented ${found.name} (Qty: ${nextQty})`, {
            id: `scan-${found.id}`,
          });
          return next;
        }

        // Overwrite if only 1 empty placeholder row exists
        if (
          prev.length === 1 &&
          !prev[0]['item_name'] &&
          (prev[0]['rate'] === '0' || prev[0]['rate'] === '1000') &&
          prev[0]['qty'] === '1'
        ) {
          toast.success(`Added ${found.name} (₹${found.rate})`, {
            id: `scan-${found.id}`,
          });
          return [
            {
              item_name: found.name,
              barcode: found.barcode || code,
              hsn_sac: found.hsn_sac || '',
              unit: found.unit || 'NOS',
              rate: found.rate || '0',
              discount_pct: '0',
              gst_rate: found.tax_rate || '18',
              qty: '1',
            },
          ];
        }

        toast.success(`Added ${found.name} (₹${found.rate})`, {
          id: `scan-${found.id}`,
        });
        return [
          ...prev,
          {
            item_name: found.name,
            barcode: found.barcode || code,
            hsn_sac: found.hsn_sac || '',
            unit: found.unit || 'NOS',
            rate: found.rate || '0',
            discount_pct: '0',
            gst_rate: found.tax_rate || '18',
            qty: '1',
          },
        ];
      });
    } else {
      // Unrecognized barcode
      playScanFeedback(false);
      toast.info(`Barcode "${code}" not found in catalog. Added to bill as new item.`, {
        description: 'You can adjust its name & price on the bill.',
        duration: 3500,
      });
      setItems((prev) => [
        ...prev,
        {
          item_name: `Product (${code})`,
          barcode: code,
          hsn_sac: '',
          unit: 'NOS',
          rate: '0',
          discount_pct: '0',
          gst_rate: '18',
          qty: '1',
        },
      ]);
    }
  };

  /**
   * Adds or increments a catalog product into the invoice line items
   */
  const handleAddCatalogItemToInvoice = (item: Item, qtyDelta: number = 1) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex(
        (r) =>
          (item.barcode && r['barcode'] && r['barcode'].toLowerCase() === item.barcode.toLowerCase()) ||
          (r['item_name'] && r['item_name'].toLowerCase() === item.name.toLowerCase())
      );

      if (existingIdx >= 0) {
        const next = [...prev];
        const cur = parseFloat(next[existingIdx]['qty'] || '1') || 1;
        const nextQty = String(Math.max(1, cur + qtyDelta));
        next[existingIdx] = { ...next[existingIdx], qty: nextQty };
        return next;
      }

      if (
        prev.length === 1 &&
        !prev[0]['item_name'] &&
        (prev[0]['rate'] === '0' || prev[0]['rate'] === '1000') &&
        prev[0]['qty'] === '1'
      ) {
        return [
          {
            item_name: item.name,
            barcode: item.barcode || '',
            hsn_sac: item.hsn_sac || '',
            unit: item.unit || 'NOS',
            rate: item.rate || '0',
            discount_pct: '0',
            gst_rate: item.tax_rate || '18',
            qty: String(qtyDelta),
          },
        ];
      }

      return [
        ...prev,
        {
          item_name: item.name,
          barcode: item.barcode || '',
          hsn_sac: item.hsn_sac || '',
          unit: item.unit || 'NOS',
          rate: item.rate || '0',
          discount_pct: '0',
          gst_rate: item.tax_rate || '18',
          qty: String(qtyDelta),
        },
      ];
    });
  };

  /**
   * Decrements or removes a catalog product from the invoice line items
   */
  const handleDecrementCatalogItemFromInvoice = (item: Item) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex(
        (r) =>
          (item.barcode && r['barcode'] && r['barcode'].toLowerCase() === item.barcode.toLowerCase()) ||
          (r['item_name'] && r['item_name'].toLowerCase() === item.name.toLowerCase())
      );
      if (existingIdx < 0) return prev;

      const next = [...prev];
      const cur = parseFloat(next[existingIdx]['qty'] || '1') || 1;
      if (cur <= 1) {
        if (next.length > 1) {
          return next.filter((_, i) => i !== existingIdx);
        }
        next[0] = { ...next[0], item_name: '', rate: '0', qty: '1', barcode: '' };
        return next;
      }
      next[existingIdx] = { ...next[existingIdx], qty: String(cur - 1) };
      return next;
    });
  };

  const handleAddCustomFieldToTemplate = async () => {
    if (!customPropLabel.trim()) return;
    const key = customPropLabel
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    if (!key) return;

    const updatedDef = JSON.parse(
      JSON.stringify(activeTemplate.draft_definition)
    );
    if (!updatedDef.fields.some((f: { key: string }) => f.key === key)) {
      updatedDef.fields.push({
        key,
        label: customPropLabel.trim(),
        type: 'text',
        scope: 'document',
        required: false,
        group: 'Custom Fields',
        order: updatedDef.fields.length + 1,
      });
      await db.templates.update(activeTemplate.id, {
        draft_definition: updatedDef,
        has_unpublished_changes: true,
        updated_at: Date.now(),
      });
    }
    setCustomPropLabel('');
    toast.success(`Added custom field "${customPropLabel.trim()}"`);
  };

  const handleRefreshPdfPreview = async () => {
    try {
      const blob = await compilePdfToBlob({
        definition: activeTemplate.draft_definition,
        company: activeCompany,
        docMeta: {
          number: nextNumPreview,
          status: 'draft',
          issue_date: issueDate,
          due_date: dueDate,
          place_of_supply: placeOfSupply,
          type_label: DOC_TYPE_LABELS[activeTemplate.doc_type],
        },
        values,
        items,
        computed,
      });
      const oldUrl = previewPdfUrl;
      const nextUrl = URL.createObjectURL(blob);
      setPreviewPdfUrl(nextUrl);
      if (oldUrl) setTimeout(() => URL.revokeObjectURL(oldUrl), 1000);
      toast.success('Vector PDF preview updated');
    } catch (err) {
      toast.error(`PDF preview error: ${(err as Error).message}`);
    }
  };


  const handleSave = async (finalize: boolean) => {
    if (!values['client_name']?.trim()) {
      toast.error('Please enter Client / Customer Name');
      return;
    }
    if (items.every((r) => !r['item_name']?.trim())) {
      toast.error('Please enter at least one line item');
      return;
    }

    setSubmitting(true);
    try {
      let pdfBlob: Blob | undefined;
      if (finalize) {
        pdfBlob = await compilePdfToBlob({
          definition: activeTemplate.draft_definition,
          company: activeCompany,
          docMeta: {
            number: nextNumPreview,
            status: 'finalized',
            issue_date: issueDate,
            due_date: dueDate,
            place_of_supply: placeOfSupply,
            type_label: DOC_TYPE_LABELS[activeTemplate.doc_type],
          },
          values,
          items,
          computed,
        });
      }

      const saved = await saveOrFinalizeDocument({
        id: editDocId,
        company: activeCompany,
        template: activeTemplate,
        definition: activeTemplate.draft_definition,
        issueDate,
        dueDate,
        placeOfSupply,
        values,
        items,
        finalize,
        saveToCatalog: true,
        pdfBlob,
      });

      toast.success(
        finalize
          ? `Finalized ${saved.number} & archived PDF Blob!`
          : 'Draft saved locally'
      );
      navigate(finalize ? `/documents/${saved.id}` : '/documents');
    } finally {
      setSubmitting(false);
    }
  };

  const isInterState = computed.doc['is_igst'] === 'true';

  return (
    <div className="space-y-6">
      <PageHeader
        title={editDocId ? 'Edit Draft Document' : 'Create Document'}
        subtitle={`Next Number: ${nextNumPreview} • ${
          isInterState ? 'Inter-State Supply (IGST)' : 'Intra-State Supply (CGST + SGST)'
        }`}
        actions={
          <>
            <Button variant="outline" onClick={handleRefreshPdfPreview} className="shrink-0">
              <Eye className="w-4 h-4" />
              <span className="sm:hidden">Preview</span>
              <span className="hidden sm:inline">Preview Vector PDF</span>
            </Button>
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={() => handleSave(false)}
              className="shrink-0"
            >
              <Save className="w-4 h-4" />
              <span className="sm:hidden">Draft</span>
              <span className="hidden sm:inline">Save Draft</span>
            </Button>
            <Button
              variant="gold"
              disabled={submitting}
              onClick={() => handleSave(true)}
              className="shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="sm:hidden">Finalize</span>
              <span className="hidden sm:inline">Finalize & Generate PDF</span>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Template & Dates Row */}
          <GlassCard className="p-5 grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Template
              </label>
              <Select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Issue Date
              </label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Place of Supply
              </label>
              <Select
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.code} - {st.name}
                  </option>
                ))}
              </Select>
            </div>
          </GlassCard>

          {/* Dynamic Document Fields (from Field Registry) */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-base font-bold">
                Customer & Document Fields
              </h2>
              <span className="text-xs text-muted-foreground">
                Auto-completes from saved Clients
              </span>
            </div>

            <datalist id="ingen-clients-list">
              {savedClients.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {docFields.map((field) => (
                <div
                  key={field.key}
                  className={field.type === 'multiline' ? 'sm:col-span-2' : ''}
                >
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    {field.label} {field.required ? '*' : ''}
                  </label>
                  {field.type === 'multiline' ? (
                    <Textarea
                      value={values[field.key] ?? field.default ?? ''}
                      placeholder={field.placeholder}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.key]: e.target.value }))
                      }
                    />
                  ) : (
                    <Input
                      list={
                        field.catalog?.source === 'clients'
                          ? 'ingen-clients-list'
                          : undefined
                      }
                      value={values[field.key] ?? field.default ?? ''}
                      placeholder={field.placeholder}
                      onChange={(e) => {
                        const val = e.target.value;
                        setValues((v) => ({ ...v, [field.key]: val }));
                        if (field.catalog?.source === 'clients') {
                          handleSelectClientSuggestion(val);
                        }
                        if (field.type === 'gstin' && val.length === 15) {
                          const parsed = validateAndParseGstin(val);
                          if (parsed.stateCode) {
                            setPlaceOfSupply(parsed.stateCode);
                          }
                        }
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Generic Proprietary Custom Text Box Adder */}
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row gap-2 items-center">
              <Input
                value={customPropLabel}
                onChange={(e) => setCustomPropLabel(e.target.value)}
                placeholder="Add proprietary field to this template (e.g. Vehicle No., Doctor Name, LR No.)…"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={handleAddCustomFieldToTemplate}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Field</span>
              </Button>
            </div>
          </GlassCard>

          {/* Line Items Repeater */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border pb-3">
              <div className="space-y-0.5">
                <h2 className="font-display text-base font-bold flex items-center gap-2">
                  <span>Line Items & Products</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30 font-mono">
                    {items.length}
                  </span>
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Scan barcodes with camera, pick from catalog, or type custom products
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setActiveRowScanIdx(null);
                    setBarcodeScannerOpen(true);
                  }}
                  className="h-8 text-xs border border-gold/50 text-gold bg-gold/15 hover:bg-gold/25 cursor-pointer font-semibold shadow-xs"
                  title="Open live camera barcode scanner (continuous POS mode)"
                >
                  <BarcodeIcon className="w-3.5 h-3.5 mr-1" />
                  <span>Scan Barcode</span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCatalogPickerOpen(true)}
                  className="h-8 text-xs border border-primary/40 text-primary hover:bg-primary/10 cursor-pointer font-semibold"
                  title="Browse and 1-tap select products from your catalog"
                >
                  <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                  <span>Pick from Catalog ({savedItems.length})</span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setItems((prev) => [
                      ...prev,
                      {
                        item_name: '',
                        hsn_sac: '',
                        qty: '1',
                        unit: 'NOS',
                        rate: '0',
                        discount_pct: '0',
                        gst_rate:
                          activeTemplate.draft_definition.config.tax_mode === 'none'
                            ? '0'
                            : '18',
                      },
                    ])
                  }
                  className="h-8 text-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Row</span>
                </Button>
              </div>
            </div>

            <datalist id="ingen-items-list">
              {savedItems.map((it) => (
                <option key={it.id} value={it.name} />
              ))}
            </datalist>

            <div className="space-y-3">
              {items.map((row, idx) => {
                const compRow = computed.items[idx] ?? {};
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-border bg-muted/25 p-3.5 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-4">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] text-muted-foreground">
                            Item / Description #{idx + 1}
                          </label>
                          {row['barcode'] ? (
                            <span className="text-[10px] text-sky-300 font-mono bg-sky-500/15 px-1.5 py-0.2 rounded border border-sky-400/30 flex items-center gap-0.5">
                              <BarcodeIcon className="w-2.5 h-2.5" />
                              <span>{row['barcode']}</span>
                            </span>
                          ) : null}
                        </div>
                        <div className="relative">
                          <Input
                            list="ingen-items-list"
                            placeholder="Product name or scan barcode"
                            value={row['item_name'] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItems((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], item_name: val };
                                return next;
                              });
                              handleSelectItemSuggestion(idx, val);
                            }}
                            className="pr-8 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRowScanIdx(idx);
                              setBarcodeScannerOpen(true);
                            }}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold p-1 cursor-pointer transition-colors"
                            title="Scan barcode for this specific row"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] text-muted-foreground block mb-1">
                          HSN/SAC
                        </label>
                        <Input
                          placeholder="8471"
                          value={row['hsn_sac'] ?? ''}
                          onChange={(e) =>
                            setItems((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], hsn_sac: e.target.value };
                              return next;
                            })
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                        <div>
                          <label className="text-[11px] text-muted-foreground block mb-1">
                            Qty
                          </label>
                          <Input
                            type="number"
                            step="any"
                            value={row['qty'] ?? '1'}
                            onChange={(e) =>
                              setItems((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], qty: e.target.value };
                                return next;
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-muted-foreground block mb-1">
                            Rate (₹)
                          </label>
                          <Input
                            type="number"
                            step="any"
                            value={row['rate'] ?? '0'}
                            onChange={(e) =>
                              setItems((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], rate: e.target.value };
                                return next;
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:col-span-3">
                        <div>
                          <label className="text-[11px] text-muted-foreground block mb-1">
                            Disc %
                          </label>
                          <Input
                            type="number"
                            step="any"
                            value={row['discount_pct'] ?? '0'}
                            onChange={(e) =>
                              setItems((prev) => {
                                const next = [...prev];
                                next[idx] = {
                                  ...next[idx],
                                  discount_pct: e.target.value,
                                };
                                return next;
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-muted-foreground block mb-1">
                            GST %
                          </label>
                          <Select
                            value={row['gst_rate'] ?? '18'}
                            onChange={(e) =>
                              setItems((prev) => {
                                const next = [...prev];
                                next[idx] = {
                                  ...next[idx],
                                  gst_rate: e.target.value,
                                };
                                return next;
                              })
                            }
                          >
                            {['0', '5', '12', '18', '28'].map((g) => (
                              <option key={g} value={g}>
                                {g}%
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>

                      <div className="sm:col-span-1 flex items-center justify-between sm:justify-end">
                        <button
                          type="button"
                          disabled={items.length <= 1}
                          onClick={() =>
                            setItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="p-2 text-muted-foreground hover:text-destructive disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
                      <span>
                        Taxable: <MoneyText value={compRow['taxable']} /> • Tax:{' '}
                        <MoneyText value={compRow['line_tax']} />
                      </span>
                      <span className="font-semibold text-foreground">
                        Line Total: <MoneyText value={compRow['line_total']} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Sticky Live Math Breakdown & PDF Preview Rail */}
        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Sparkles className="w-4 h-4 text-gold" />
              <h3 className="font-display text-base font-bold">
                big.js Precision Breakdown
              </h3>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxable Subtotal</span>
                <MoneyText value={computed.doc['subtotal']} />
              </div>

              {isInterState ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGST (Inter-state)</span>
                  <MoneyText value={computed.doc['igst_total']} />
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CGST</span>
                    <MoneyText value={computed.doc['cgst_total']} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SGST</span>
                    <MoneyText value={computed.doc['sgst_total']} />
                  </div>
                </>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Round Off</span>
                <MoneyText value={computed.doc['round_off']} />
              </div>

              <div className="border-t border-border pt-3 flex justify-between items-baseline">
                <span className="font-display font-bold text-base">Grand Total</span>
                <span className="font-display text-2xl font-bold text-gold">
                  <MoneyText value={computed.doc['grand_total']} />
                </span>
              </div>

              <div className="rounded-xl bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
                {amountInWords(computed.doc['grand_total'])}
              </div>
            </div>
          </GlassCard>

          {previewPdfUrl ? (
            <GlassCard className="p-3 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>Vector PDF Preview</span>
                </span>
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-gold underline"
                >
                  Open Full Tab
                </a>
              </div>
              <iframe
                title="PDF Preview"
                src={`${previewPdfUrl}#toolbar=0&navpanes=0`}
                allow="fullscreen"
                className="w-full h-[460px] rounded-xl border border-border bg-white shadow-inner"
              />
            </GlassCard>
          ) : null}

        </div>
      </div>

      {/* POS Barcode Camera Scanner Modal */}
      <BarcodeScannerModal
        open={barcodeScannerOpen}
        onClose={() => {
          setBarcodeScannerOpen(false);
          setActiveRowScanIdx(null);
        }}
        onScan={handleScanBarcodeOnInvoice}
        title={
          activeRowScanIdx !== null
            ? `Scan Barcode for Row #${activeRowScanIdx + 1}`
            : 'Continuous POS Barcode Scanner'
        }
        subtitle={
          activeRowScanIdx !== null
            ? 'Align product barcode to fill this line item'
            : 'Scan products sequentially — auto-adds & increments quantity'
        }
        continuous={activeRowScanIdx === null}
        getItemNameByBarcode={(code) =>
          savedItems.find((i) => i.barcode?.toLowerCase() === code.toLowerCase())?.name
        }
      />

      {/* 1-Tap Visual Catalog Product Picker Modal */}
      <CatalogItemPickerModal
        open={catalogPickerOpen}
        onClose={() => setCatalogPickerOpen(false)}
        catalogItems={savedItems}
        invoiceRows={items}
        onAddItem={handleAddCatalogItemToInvoice}
        onDecrementItem={handleDecrementCatalogItemFromInvoice}
        onOpenBarcodeScanner={() => {
          setActiveRowScanIdx(null);
          setBarcodeScannerOpen(true);
        }}
      />
    </div>
  );
}
