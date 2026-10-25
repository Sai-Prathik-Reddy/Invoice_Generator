import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Package,
  Plus,
  Search,
  Barcode as BarcodeIcon,
  Trash2,
  Edit2,
  Camera,
  Download,
  Upload,
  AlertTriangle,
  Boxes,
  Layers,
  Sparkles,
  CheckCircle2,
  X,
  FileSpreadsheet,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileDown,
  Check,
  Info,
} from 'lucide-react';
import { db } from '../../db/schema';
import { useAppStore } from '../../app/useAppStore';
import { newId } from '../../core/id';
import {
  GlassCard,
  Button,
  Input,
  Select,
  PageHeader,
  MoneyText,
  BarcodeScannerModal,
} from '../../design-system/components';
import {
  exportInventoryToCsv,
  parseInventoryCsv,
  downloadFile,
  downloadInventorySampleCsv,
  getInventorySampleCsvTemplate,
  INVENTORY_CSV_COLUMNS,
} from './csvService';
import { toast } from 'sonner';

export function InventoryPage() {
  const { activeCompany } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [gstFilter, setGstFilter] = useState('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Form Mode: 'single' | 'bulk'
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Single Item Form State
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [rate, setRate] = useState('');
  const [taxRate, setTaxRate] = useState('5');
  const [unit, setUnit] = useState('NOS');
  const [hsn, setHsn] = useState('');
  const [stockQty, setStockQty] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');

  // Bulk Entry State
  const [bulkRows, setBulkRows] = useState<
    Array<{ name: string; barcode: string; rate: string; tax: string; unit: string; hsn: string; stock: string }>
  >([
    { name: '', barcode: '', rate: '', tax: '5', unit: 'NOS', hsn: '', stock: '20' },
    { name: '', barcode: '', rate: '', tax: '5', unit: 'NOS', hsn: '', stock: '20' },
    { name: '', barcode: '', rate: '', tax: '5', unit: 'NOS', hsn: '', stock: '20' },
  ]);

  // Barcode Scanner Modal State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'single' | number>('single');

  // CSV Import Modal State
  const [csvImportModalOpen, setCsvImportModalOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [csvParsedCount, setCsvParsedCount] = useState(0);
  const [showColumnSpecs, setShowColumnSpecs] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parsedPreviewItems = useMemo(() => {
    if (!csvRawText.trim()) return [];
    return parseInventoryCsv(csvRawText).slice(0, 4);
  }, [csvRawText]);

  // Query Items scoped to active company
  const items =
    useLiveQuery(
      async () =>
        activeCompany
          ? db.items.where('company_id').equals(activeCompany.id).reverse().sortBy('use_count')
          : [],
      [activeCompany?.id]
    ) ?? [];

  // Computed metrics
  const totalSkuCount = items.length;
  const totalStockUnits = items.reduce((acc, it) => acc + (it.stock_qty || 0), 0);
  const lowStockItems = items.filter(
    (it) => typeof it.stock_qty === 'number' && it.stock_qty <= (it.low_stock_threshold ?? 5)
  );

  // Filtered Items List
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((it) => {
      if (filterLowStockOnly) {
        const isLow = typeof it.stock_qty === 'number' && it.stock_qty <= (it.low_stock_threshold ?? 5);
        if (!isLow) return false;
      }
      if (gstFilter !== 'all' && it.tax_rate !== gstFilter) return false;
      if (!q) return true;
      const matchName = it.name.toLowerCase().includes(q);
      const matchBarcode = it.barcode ? it.barcode.toLowerCase().includes(q) : false;
      const matchHsn = it.hsn_sac ? it.hsn_sac.toLowerCase().includes(q) : false;
      return matchName || matchBarcode || matchHsn;
    });
  }, [items, searchQuery, gstFilter, filterLowStockOnly]);

  if (!activeCompany) {
    return (
      <GlassCard className="p-6 text-center space-y-2">
        <Package className="w-8 h-8 text-gold mx-auto" />
        <h3 className="font-bold text-base">No Business Configured</h3>
        <p className="text-xs text-muted-foreground">Please configure or select a business profile first.</p>
      </GlassCard>
    );
  }

  // --- Handlers ---

  const handleStartEdit = (it: (typeof items)[0]) => {
    setEditingItemId(it.id);
    setName(it.name);
    setBarcode(it.barcode || '');
    setRate(it.rate || '0');
    setTaxRate(it.tax_rate || '5');
    setUnit(it.unit || 'NOS');
    setHsn(it.hsn_sac || '');
    setStockQty(String(it.stock_qty ?? 0));
    setLowStockThreshold(String(it.low_stock_threshold ?? 5));
    setAddMode('single');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setName('');
    setBarcode('');
    setRate('');
    setTaxRate('5');
    setUnit('NOS');
    setHsn('');
    setStockQty('0');
    setLowStockThreshold('5');
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const now = Date.now();

    if (editingItemId) {
      await db.items.update(editingItemId, {
        name: name.trim(),
        barcode: barcode.trim() || undefined,
        rate: rate.trim() || '0',
        tax_rate: taxRate,
        unit,
        hsn_sac: hsn.trim() || undefined,
        stock_qty: Number(stockQty) || 0,
        low_stock_threshold: Number(lowStockThreshold) || 5,
        updated_at: now,
      });
      toast.success('Updated inventory product');
      handleCancelEdit();
    } else {
      await db.items.put({
        id: newId('itm'),
        company_id: activeCompany.id,
        name: name.trim(),
        barcode: barcode.trim() || undefined,
        rate: rate.trim() || '0',
        tax_rate: taxRate,
        unit,
        hsn_sac: hsn.trim() || undefined,
        stock_qty: Number(stockQty) || 0,
        low_stock_threshold: Number(lowStockThreshold) || 5,
        price_includes_tax: false,
        custom_fields: [],
        use_count: 0,
        last_used_at: now,
        created_at: now,
        updated_at: now,
      });
      toast.success('Added product to inventory');
      setName('');
      setBarcode('');
      setRate('');
      setHsn('');
      setStockQty('0');
    }
  };

  // Adjust stock directly with +/-
  const handleAdjustStock = async (itemId: string, delta: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const current = item.stock_qty || 0;
    const nextVal = Math.max(0, current + delta);
    await db.items.update(itemId, {
      stock_qty: nextVal,
      updated_at: Date.now(),
    });
  };

  // Bulk Batch Add
  const handleAddBulkRow = () => {
    setBulkRows((prev) => [
      ...prev,
      { name: '', barcode: '', rate: '', tax: '5', unit: 'NOS', hsn: '', stock: '20' },
    ]);
  };

  const handleRemoveBulkRow = (idx: number) => {
    setBulkRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleBulkRowChange = (idx: number, field: string, val: string) => {
    setBulkRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx]!, [field]: val };
      return copy;
    });
  };

  const handleSaveBulkBatch = async () => {
    const validRows = bulkRows.filter((r) => r.name.trim().length > 0);
    if (validRows.length === 0) {
      toast.error('Please enter at least one product name');
      return;
    }
    const now = Date.now();
    for (const r of validRows) {
      await db.items.put({
        id: newId('itm'),
        company_id: activeCompany.id,
        name: r.name.trim(),
        barcode: r.barcode.trim() || undefined,
        rate: r.rate.trim() || '0',
        tax_rate: r.tax,
        unit: r.unit || 'NOS',
        hsn_sac: r.hsn.trim() || undefined,
        stock_qty: Number(r.stock) || 0,
        low_stock_threshold: 5,
        price_includes_tax: false,
        custom_fields: [],
        use_count: 0,
        last_used_at: now,
        created_at: now,
        updated_at: now,
      });
    }
    toast.success(`Successfully saved ${validRows.length} products to inventory!`);
    setBulkRows([
      { name: '', barcode: '', rate: '', tax: '5', unit: 'NOS', hsn: '', stock: '20' },
      { name: '', barcode: '', rate: '', tax: '5', unit: 'NOS', hsn: '', stock: '20' },
    ]);
  };

  const handleLoadGroceryStarter = () => {
    setBulkRows([
      { name: 'Amul Taaza Milk 500ml', barcode: '8901262150056', rate: '27', tax: '0', unit: 'PKT', hsn: '0401', stock: '40' },
      { name: 'India Gate Basmati Rice 1kg', barcode: '8901030383700', rate: '145', tax: '5', unit: 'KG', hsn: '1006', stock: '25' },
      { name: 'Fortune Sunlite Sunflower Oil 1L', barcode: '8906007281058', rate: '155', tax: '5', unit: 'PKT', hsn: '1512', stock: '30' },
      { name: 'Aashirvaad Shudh Chakki Atta 5kg', barcode: '8901030467891', rate: '275', tax: '0', unit: 'PKT', hsn: '1101', stock: '15' },
      { name: 'Tata Salt Vacuum Evaporated 1kg', barcode: '8901262010054', rate: '28', tax: '0', unit: 'PKT', hsn: '2501', stock: '50' },
      { name: 'Tata Sampann Toor Dal Unpolished 1kg', barcode: '8901058852394', rate: '185', tax: '5', unit: 'PKT', hsn: '0713', stock: '20' },
      { name: 'Lifebuoy Total Soap 125g', barcode: '8901030383701', rate: '42', tax: '18', unit: 'NOS', hsn: '3401', stock: '35' },
    ]);
    toast.success('Loaded common Indian grocery starter items');
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    if (scannerTarget === 'single') {
      setBarcode(scannedCode);
      toast.success(`Barcode captured: ${scannedCode}`);
    } else if (typeof scannerTarget === 'number') {
      handleBulkRowChange(scannerTarget, 'barcode', scannedCode);
      toast.success(`Row #${scannerTarget + 1} barcode captured: ${scannedCode}`);
    }
  };

  // CSV Export & Import Handlers
  const handleExportCsv = () => {
    if (items.length === 0) {
      toast.error('No inventory items to export');
      return;
    }
    const csvData = exportInventoryToCsv(items);
    const filename = `inventory_${activeCompany.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csvData, filename);
    toast.success(`Exported ${items.length} items to CSV`);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvRawText(content);
        const parsed = parseInventoryCsv(content);
        setCsvParsedCount(parsed.length);
        toast.success(`Loaded ${file.name} (${parsed.length} products found)`);
      }
    };
    reader.readAsText(file);
  };

  const handleFillSampleCsv = () => {
    const sample = getInventorySampleCsvTemplate();
    setCsvRawText(sample);
    setSelectedFileName('sample_inventory_template.csv');
    const parsed = parseInventoryCsv(sample);
    setCsvParsedCount(parsed.length);
    toast.success('Loaded sample grocery inventory (8 items)');
  };

  const handleConfirmCsvImport = async () => {
    const parsed = parseInventoryCsv(csvRawText);
    if (parsed.length === 0) {
      toast.error('No valid products found in CSV');
      return;
    }
    const now = Date.now();
    for (const it of parsed) {
      await db.items.put({
        id: newId('itm'),
        company_id: activeCompany.id,
        name: it.name,
        barcode: it.barcode,
        rate: it.rate || '0',
        tax_rate: it.tax_rate || '18',
        unit: it.unit || 'NOS',
        hsn_sac: it.hsn_sac,
        stock_qty: it.stock_qty || 0,
        low_stock_threshold: it.low_stock_threshold || 5,
        price_includes_tax: false,
        custom_fields: [],
        use_count: 0,
        last_used_at: now,
        created_at: now,
        updated_at: now,
      });
    }
    toast.success(`Imported ${parsed.length} products into inventory!`);
    setCsvImportModalOpen(false);
    setCsvRawText('');
    setSelectedFileName(null);
  };

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Inventory & Stock"
        subtitle={`Managing items for ${activeCompany.name} • ${totalSkuCount} SKUs`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="border-gold/40 text-gold text-xs h-9"
              title="Export Inventory as CSV / Excel"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCsvRawText('');
                setCsvParsedCount(0);
                setCsvImportModalOpen(true);
              }}
              className="border-primary/40 text-primary text-xs h-9"
              title="Import Items from CSV"
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">Import CSV</span>
              <span className="sm:hidden">Import</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards: SKU Count, Total Units, Low Stock Alert */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Total SKUs</span>
            <Boxes className="w-4 h-4 text-primary" />
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl mt-1 text-foreground">
            {totalSkuCount}
          </div>
        </GlassCard>

        <GlassCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Total Stock</span>
            <Layers className="w-4 h-4 text-gold" />
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl mt-1 text-gold">
            {totalStockUnits} <span className="text-xs font-normal text-muted-foreground font-sans">units</span>
          </div>
        </GlassCard>

        <GlassCard
          className={`p-3.5 flex flex-col justify-between transition-all cursor-pointer ${
            filterLowStockOnly ? 'border-amber-400 bg-amber-500/10' : ''
          }`}
          onClick={() => setFilterLowStockOnly((prev) => !prev)}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Low Stock</span>
            <AlertTriangle className={`w-4 h-4 ${lowStockItems.length > 0 ? 'text-amber-400' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className={`font-display font-bold text-xl sm:text-2xl ${lowStockItems.length > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
              {lowStockItems.length}
            </span>
            <span className="text-[10px] text-muted-foreground underline">
              {filterLowStockOnly ? 'Show All' : 'Filter'}
            </span>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Add / Edit Product Form (Single or Batch) */}
        <GlassCard className="lg:col-span-5 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <h2 className="font-display text-sm sm:text-base font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-gold" />
              <span>
                {editingItemId
                  ? 'Edit Product'
                  : addMode === 'single'
                  ? 'Add New Item'
                  : '⚡ Bulk Batch Entry'}
              </span>
            </h2>

            {!editingItemId && (
              <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setAddMode('single')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    addMode === 'single'
                      ? 'bg-gold text-slate-950 font-bold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Single
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('bulk')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    addMode === 'bulk'
                      ? 'bg-gold text-slate-950 font-bold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  ⚡ Bulk Batch
                </button>
              </div>
            )}
          </div>

          {addMode === 'single' ? (
            <form onSubmit={handleSaveItem} className="space-y-3">
              {editingItemId && (
                <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-gold/15 border border-gold/30 text-gold font-medium">
                  <span>Editing existing item</span>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-[11px] underline cursor-pointer text-foreground hover:text-gold"
                  >
                    Cancel Edit
                  </button>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Product / Item Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Basmati Rice 1kg, Parle-G 100g"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Barcode / EAN (Scan with Camera or Type)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <BarcodeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="e.g. 8901262010054"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="pl-9 font-mono text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setScannerTarget('single');
                      setScannerOpen(true);
                    }}
                    className="h-9 px-3 shrink-0 border border-gold/40 text-gold bg-gold/10 hover:bg-gold/20"
                    title="Scan barcode with camera"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1" />
                    <span>Scan</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Selling Rate (₹) *
                  </label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    GST Rate (%)
                  </label>
                  <Select value={taxRate} onChange={(e) => setTaxRate(e.target.value)}>
                    <option value="0">0% (Nil / Exempt)</option>
                    <option value="5">5% (Grocery / Essentials)</option>
                    <option value="12">12% (Packaged Foods / Goods)</option>
                    <option value="18">18% (Standard / Services)</option>
                    <option value="28">28% (Luxury / Aerated)</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Stock Quantity
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Low Stock Alert At
                  </label>
                  <Input
                    type="number"
                    placeholder="5"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    HSN / SAC Code
                  </label>
                  <Input
                    placeholder="e.g. 1006, 0401"
                    value={hsn}
                    onChange={(e) => setHsn(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Unit
                  </label>
                  <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                    {['NOS', 'KG', 'GM', 'LTR', 'ML', 'PKT', 'BTL', 'BOX', 'DOZ', 'SET', 'MTR', 'HRS'].map(
                      (u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      )
                    )}
                  </Select>
                </div>
              </div>

              <Button type="submit" variant="gold" className="w-full mt-2">
                <Plus className="w-4 h-4 mr-1" />
                <span>{editingItemId ? 'Update Inventory Product' : 'Add to Inventory'}</span>
              </Button>
            </form>
          ) : (
            /* Bulk Batch Entry */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Add multiple items at once:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLoadGroceryStarter}
                  className="h-7 text-[11px] border-gold/40 text-gold bg-gold/5 hover:bg-gold/15"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  <span>Grocery Samples</span>
                </Button>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {bulkRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-border bg-muted/20 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                        #{idx + 1}
                      </span>
                      <Input
                        placeholder="Product Name *"
                        value={row.name}
                        onChange={(e) => handleBulkRowChange(idx, 'name', e.target.value)}
                        className="h-7 text-xs flex-1"
                      />
                      {bulkRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBulkRow(idx)}
                          className="text-muted-foreground hover:text-rose-400 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-12 gap-1.5">
                      <div className="col-span-5 relative">
                        <Input
                          placeholder="Barcode"
                          value={row.barcode}
                          onChange={(e) => handleBulkRowChange(idx, 'barcode', e.target.value)}
                          className="h-7 text-[11px] font-mono pr-6"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setScannerTarget(idx);
                            setScannerOpen(true);
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gold hover:text-foreground"
                          title="Scan barcode with camera"
                        >
                          <Camera className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="col-span-3">
                        <Input
                          placeholder="Rate ₹"
                          type="number"
                          value={row.rate}
                          onChange={(e) => handleBulkRowChange(idx, 'rate', e.target.value)}
                          className="h-7 text-[11px]"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          placeholder="Stock"
                          type="number"
                          value={row.stock}
                          onChange={(e) => handleBulkRowChange(idx, 'stock', e.target.value)}
                          className="h-7 text-[11px]"
                        />
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={row.tax}
                          onChange={(e) => handleBulkRowChange(idx, 'tax', e.target.value)}
                          className="h-7 text-[10px] px-1"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddBulkRow}
                  className="flex-1 h-8 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Another Row</span>
                </Button>
                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={handleSaveBulkBatch}
                  className="flex-1 h-8 text-xs font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span>Save Batch</span>
                </Button>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Right Column: Inventory Items List with Real-time Stock Controls */}
        <GlassCard className="lg:col-span-7 p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <h2 className="font-display text-sm sm:text-base font-bold flex items-center gap-2">
              <span>Catalog Products</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gold/20 text-gold font-mono">
                {filteredItems.length}
              </span>
            </h2>

            {/* Quick GST filter chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              {['all', '0', '5', '12', '18', '28'].map((rateVal) => (
                <button
                  key={rateVal}
                  type="button"
                  onClick={() => setGstFilter(rateVal)}
                  className={`px-2 py-0.5 rounded-lg border font-mono transition-all cursor-pointer whitespace-nowrap ${
                    gstFilter === rateVal
                      ? 'border-gold bg-gold/25 text-gold font-bold'
                      : 'border-border/80 bg-muted/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {rateVal === 'all' ? 'All Rates' : `${rateVal}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search products by name, barcode, or HSN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Items List */}
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Package className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p className="text-xs">
                {items.length === 0
                  ? 'No inventory products yet. Add your first item using the form.'
                  : 'No products match your filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredItems.map((it) => {
                const stock = it.stock_qty ?? 0;
                const isLowStock = stock <= (it.low_stock_threshold ?? 5);

                return (
                  <div
                    key={it.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3 hover:border-primary/40 transition-all"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm font-semibold text-foreground truncate">{it.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted/80 text-muted-foreground font-mono">
                          {it.unit}
                        </span>
                        {isLowStock ? (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-medium shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Low: {stock} left</span>
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-gold font-mono">
                          <MoneyText value={it.rate} />
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px]">
                          GST {it.tax_rate}%
                        </span>
                        {it.barcode ? (
                          <span className="flex items-center gap-1 font-mono text-[10px] text-sky-300 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-400/30">
                            <BarcodeIcon className="w-3 h-3" />
                            <span>{it.barcode}</span>
                          </span>
                        ) : null}
                        {it.hsn_sac ? <span>HSN: {it.hsn_sac}</span> : null}
                      </div>
                    </div>

                    {/* Stock Stepper & Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Stock Stepper */}
                      <div className="flex items-center border border-border rounded-lg bg-slate-900/60 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(it.id, -1)}
                          className="w-6 h-6 rounded bg-muted/40 hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
                          title="Decrease stock by 1"
                        >
                          -
                        </button>
                        <span className={`px-2 text-xs font-mono font-bold ${isLowStock ? 'text-amber-400' : 'text-foreground'}`}>
                          {stock}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(it.id, 1)}
                          className="w-6 h-6 rounded bg-muted/40 hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
                          title="Increase stock by 1"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(it)}
                        className="p-1.5 text-muted-foreground hover:text-gold cursor-pointer transition-colors"
                        title="Edit product"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => db.items.delete(it.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                        title="Delete product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title={
          typeof scannerTarget === 'number'
            ? `Scan Barcode for Row #${scannerTarget + 1}`
            : editingItemId
            ? 'Scan Barcode to Update Product'
            : 'Scan Product Barcode'
        }
        subtitle="Align product barcode (EAN-13, UPC, Code-128, QR) inside camera"
        continuous={false}
      />

      {/* CSV Import Modal */}
      {csvImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl glass-chrome border border-border p-5 space-y-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="font-display font-bold text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <span>Import Inventory Products from CSV</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCsvImportModalOpen(false);
                  setSelectedFileName(null);
                }}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
              {/* Quick Template Download Banner */}
              <div className="rounded-xl border border-gold/30 bg-gold/5 p-3.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-gold" />
                      <span>Ready-to-use CSV Sample Template</span>
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Download our pre-structured template formatted for Microsoft Excel, Google Sheets, or Apple Numbers.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="gold"
                      size="sm"
                      onClick={downloadInventorySampleCsv}
                      className="text-xs h-8"
                    >
                      <FileDown className="w-3.5 h-3.5 mr-1" />
                      <span>Download Template (.csv)</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleFillSampleCsv}
                      className="text-xs h-8 border-gold/40 text-gold hover:bg-gold/10"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-gold" />
                      <span>Fill Sample Data</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Column Structure Guidelines Accordion */}
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    <span>Expected Columns</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowColumnSpecs(!showColumnSpecs)}
                    className="flex items-center gap-1 text-[11px] text-gold hover:underline cursor-pointer"
                  >
                    <span>{showColumnSpecs ? 'Hide Guidelines' : 'View Guidelines & Examples'}</span>
                    {showColumnSpecs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* Column Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {INVENTORY_CSV_COLUMNS.map((col) => (
                    <span
                      key={col.key}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] ${
                        col.required
                          ? 'bg-gold/15 text-gold border border-gold/40 font-semibold'
                          : 'bg-muted text-muted-foreground border border-border/80'
                      }`}
                    >
                      <span>{col.label}</span>
                      {col.required && <span className="text-amber-400 font-bold">*</span>}
                    </span>
                  ))}
                </div>

                {/* Collapsible Column Guide Table */}
                {showColumnSpecs && (
                  <div className="mt-2.5 overflow-x-auto rounded-lg border border-border bg-black/40 p-2">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-border/60 text-muted-foreground">
                          <th className="pb-1.5 font-semibold">Column Name</th>
                          <th className="pb-1.5 font-semibold">Requirement</th>
                          <th className="pb-1.5 font-semibold">Example</th>
                          <th className="pb-1.5 font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-mono text-[10px]">
                        {INVENTORY_CSV_COLUMNS.map((col) => (
                          <tr key={col.key}>
                            <td className="py-1.5 font-semibold text-foreground">{col.label}</td>
                            <td className="py-1.5">
                              {col.required ? (
                                <span className="text-emerald-400 font-sans font-bold">Required</span>
                              ) : (
                                <span className="text-muted-foreground font-sans">Optional</span>
                              )}
                            </td>
                            <td className="py-1.5 text-gold">{col.example}</td>
                            <td className="py-1.5 font-sans text-muted-foreground">{col.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Upload File and Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Upload CSV File</label>
                  {selectedFileName && (
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>{selectedFileName}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileSelected}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs h-9"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    <span>Choose CSV File from Computer / Phone</span>
                  </Button>
                </div>
              </div>

              {/* Direct Paste Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Or Paste CSV Data Directly:
                  </label>
                  {csvParsedCount > 0 && (
                    <span className="text-[11px] text-emerald-400 font-semibold font-mono">
                      ✓ {csvParsedCount} items parsed
                    </span>
                  )}
                </div>
                <textarea
                  rows={5}
                  value={csvRawText}
                  onChange={(e) => {
                    setCsvRawText(e.target.value);
                    const parsed = parseInventoryCsv(e.target.value);
                    setCsvParsedCount(parsed.length);
                  }}
                  placeholder="Item Name,Barcode,Selling Rate,GST Rate (%),Unit,HSN/SAC,Stock Quantity,Low Stock Alert Level&#10;India Gate Basmati Rice 1kg,8901030383700,145.00,5,KG,1006,50,10"
                  className="w-full rounded-xl border border-border bg-black/30 p-2.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-gold"
                />
              </div>

              {/* Live Parsed Preview Table */}
              {parsedPreviewItems.length > 0 && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Data Preview (First {parsedPreviewItems.length} of {csvParsedCount} Items)</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Ready to import
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border/80 bg-black/40">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-border/80 text-muted-foreground text-[10px]">
                          <th className="p-2">Item Name</th>
                          <th className="p-2">Barcode</th>
                          <th className="p-2">Rate</th>
                          <th className="p-2">GST</th>
                          <th className="p-2">Unit</th>
                          <th className="p-2">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-mono text-[10px]">
                        {parsedPreviewItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="p-2 font-medium text-foreground truncate max-w-[150px]">{item.name}</td>
                            <td className="p-2 text-sky-300">{item.barcode || '—'}</td>
                            <td className="p-2 text-gold font-bold">₹{item.rate}</td>
                            <td className="p-2">{item.tax_rate}%</td>
                            <td className="p-2">{item.unit}</td>
                            <td className="p-2 text-emerald-400 font-bold">{item.stock_qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border/80 shrink-0">
              <span className="text-xs text-muted-foreground font-mono">
                {csvParsedCount > 0 ? `${csvParsedCount} items ready` : 'No items yet'}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCsvImportModalOpen(false);
                    setSelectedFileName(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  disabled={csvParsedCount === 0}
                  onClick={handleConfirmCsvImport}
                >
                  Import {csvParsedCount > 0 ? `${csvParsedCount} Products` : 'Products'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
