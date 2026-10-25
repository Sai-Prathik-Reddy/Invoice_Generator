import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Users,
  Package,
  Plus,
  Trash2,
  ShieldCheck,
  Lock,
  Unlock,
  Download,
  Upload,
  Fingerprint,
  AlertTriangle,
  Barcode as BarcodeIcon,
  Camera,
  Edit2,
  Sparkles,
  Search,
  Check,
  Layers,
  X,
} from 'lucide-react';
import { db, type VaultSettingsValue } from '../../db/schema';
import { useAppStore } from '../../app/useAppStore';
import {
  BarcodeScannerModal,
  BrandColorCustomizer,
  Button,
  GlassCard,
  IngenLogo,
  Input,
  MoneyText,
  PageHeader,
  Select,
} from '../../design-system/components';
import type { Item } from '../../core/schema/types';
import { INDIAN_STATES, validateAndParseGstin } from '../../core/validate/gstin';
import { newId } from '../../core/id';
import {
  createVaultVerifier,
  enrollBiometricQuickUnlock,
  verifyBiometricAssertion,
  verifyVaultPassword,
} from '../../security/crypto';
import { getVaultSettings, setSetting } from '../../db/repos';
import {
  exportEncryptedBackup,
  importEncryptedBackup,
  type BackupScope,
} from '../../backup/backupService';
import { downloadBlob } from '../share/sharePdf';
import { CompanyProfileForm } from '../onboarding/OnboardingPage';
import { toast } from 'sonner';

export function CatalogPage() {
  const { activeCompany } = useAppStore();
  const [tab, setTab] = useState<'clients' | 'items'>('clients');

  // Client Form State
  const [clientName, setClientName] = useState('');
  const [clientGstin, setClientGstin] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientState, setClientState] = useState('36');
  const [clientPhone, setClientPhone] = useState('');

  // Item Form State (Single Item Add & Edit)
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemBarcode, setItemBarcode] = useState('');
  const [itemHsn, setItemHsn] = useState('');
  const [itemUnit, setItemUnit] = useState('NOS');
  const [itemRate, setItemRate] = useState('100');
  const [itemTax, setItemTax] = useState('5');

  // Multi-Row Bulk Add State
  const [itemAddMode, setItemAddMode] = useState<'single' | 'bulk'>('single');
  const [bulkRows, setBulkRows] = useState<
    Array<{ name: string; barcode: string; rate: string; tax: string; unit: string; hsn: string }>
  >([
    { name: '', barcode: '', rate: '', tax: '5', unit: 'NOS', hsn: '' },
    { name: '', barcode: '', rate: '', tax: '5', unit: 'NOS', hsn: '' },
    { name: '', barcode: '', rate: '', tax: '5', unit: 'NOS', hsn: '' },
  ]);

  // Scanner Modal State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'single' | number>('single');

  // Items List Filter State
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemGstFilter, setItemGstFilter] = useState('all');

  const clients =
    useLiveQuery(
      async () =>
        activeCompany
          ? db.clients.where('company_id').equals(activeCompany.id).reverse().sortBy('use_count')
          : [],
      [activeCompany?.id]
    ) ?? [];

  const items =
    useLiveQuery(
      async () =>
        activeCompany
          ? db.items.where('company_id').equals(activeCompany.id).reverse().sortBy('use_count')
          : [],
      [activeCompany?.id]
    ) ?? [];

  const filteredItems = useMemo(() => {
    const q = itemSearchQuery.trim().toLowerCase();
    return items.filter((it) => {
      if (itemGstFilter !== 'all' && it.tax_rate !== itemGstFilter) return false;
      if (!q) return true;
      const matchName = it.name.toLowerCase().includes(q);
      const matchBarcode = it.barcode ? it.barcode.toLowerCase().includes(q) : false;
      const matchHsn = it.hsn_sac ? it.hsn_sac.toLowerCase().includes(q) : false;
      return matchName || matchBarcode || matchHsn;
    });
  }, [items, itemSearchQuery, itemGstFilter]);

  if (!activeCompany) {
    return <GlassCard className="p-6">Please configure a company first.</GlassCard>;
  }

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    const now = Date.now();
    const stateObj = INDIAN_STATES.find((s) => s.code === clientState);
    await db.clients.put({
      id: newId('cli'),
      company_id: activeCompany.id,
      name: clientName.trim(),
      gstin: clientGstin.trim().toUpperCase(),
      phone: clientPhone.trim(),
      billing_address: {
        line1: clientAddress.trim(),
        city: '',
        state: stateObj?.name ?? 'Telangana',
        state_code: clientState,
        pincode: '',
        country: 'India',
      },
      custom_fields: [],
      use_count: 1,
      last_used_at: now,
      created_at: now,
      updated_at: now,
    });
    setClientName('');
    setClientGstin('');
    setClientAddress('');
    setClientPhone('');
    toast.success('Saved client to autocomplete directory');
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !activeCompany) return;
    const now = Date.now();

    if (editingItemId) {
      const existing = await db.items.get(editingItemId);
      if (existing) {
        await db.items.put({
          ...existing,
          name: itemName.trim(),
          barcode: itemBarcode.trim() || undefined,
          hsn_sac: itemHsn.trim() || undefined,
          unit: itemUnit.trim() || 'NOS',
          rate: itemRate || '0',
          tax_rate: itemTax || '5',
          updated_at: now,
        });
        toast.success(`Updated "${itemName.trim()}" in catalog`);
      }
      setEditingItemId(null);
    } else {
      await db.items.put({
        id: newId('itm'),
        company_id: activeCompany.id,
        name: itemName.trim(),
        barcode: itemBarcode.trim() || undefined,
        hsn_sac: itemHsn.trim() || undefined,
        unit: itemUnit.trim() || 'NOS',
        rate: itemRate || '0',
        tax_rate: itemTax || '5',
        price_includes_tax: false,
        stock_qty: 0,
        low_stock_threshold: 5,
        custom_fields: [],
        use_count: 1,
        last_used_at: now,
        created_at: now,
        updated_at: now,
      });
      toast.success(`Saved "${itemName.trim()}" to catalog`);
    }

    setItemName('');
    setItemBarcode('');
    setItemHsn('');
    setItemRate('100');
    setItemTax('5');
    setItemUnit('NOS');
  };

  const handleStartEditItem = (it: Item) => {
    setEditingItemId(it.id);
    setItemName(it.name);
    setItemBarcode(it.barcode || '');
    setItemHsn(it.hsn_sac || '');
    setItemUnit(it.unit || 'NOS');
    setItemRate(it.rate || '0');
    setItemTax(it.tax_rate || '5');
    setItemAddMode('single');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setItemName('');
    setItemBarcode('');
    setItemHsn('');
    setItemRate('100');
    setItemTax('5');
    setItemUnit('NOS');
  };

  const handleSaveBulkRows = async () => {
    if (!activeCompany) return;
    const validRows = bulkRows.filter((r) => r.name.trim().length > 0);
    if (validRows.length === 0) {
      toast.error('Please enter at least one item name to save');
      return;
    }
    const now = Date.now();
    for (const r of validRows) {
      await db.items.put({
        id: newId('itm'),
        company_id: activeCompany.id,
        name: r.name.trim(),
        barcode: r.barcode.trim() || undefined,
        hsn_sac: r.hsn.trim() || undefined,
        unit: r.unit.trim() || 'NOS',
        rate: r.rate.trim() || '0',
        tax_rate: r.tax.trim() || '5',
        price_includes_tax: false,
        stock_qty: 0,
        low_stock_threshold: 5,
        custom_fields: [],
        use_count: 1,
        last_used_at: now,
        created_at: now,
        updated_at: now,
      });
    }
    toast.success(`Saved ${validRows.length} items to catalog!`);
    setBulkRows([
      { name: '', barcode: '', rate: '', tax: '5', unit: 'NOS', hsn: '' },
      { name: '', barcode: '', rate: '', tax: '5', unit: 'NOS', hsn: '' },
      { name: '', barcode: '', rate: '', tax: '5', unit: 'NOS', hsn: '' },
    ]);
  };

  const handleLoadGrocerySamplePack = () => {
    setBulkRows([
      { name: 'Nandini / Amul Fresh Milk 500ml', barcode: '8901262010101', rate: '28', tax: '0', unit: 'PKT', hsn: '0401' },
      { name: 'Daawat Rozana Basmati Rice 1kg', barcode: '8901537001021', rate: '95', tax: '5', unit: 'KG', hsn: '1006' },
      { name: 'Fortune Sunlite Refined Sunflower Oil 1L', barcode: '8906007281056', rate: '155', tax: '5', unit: 'LTR', hsn: '1512' },
      { name: 'Aashirvaad Shudh Chakki Atta 5kg', barcode: '8901725131012', rate: '235', tax: '5', unit: 'PKT', hsn: '1101' },
      { name: 'Tata Salt Vacuum Evaporated 1kg', barcode: '8901030383015', rate: '28', tax: '0', unit: 'PKT', hsn: '2501' },
      { name: 'Tata Sampann High Protein Toor Dal 1kg', barcode: '8901030384022', rate: '165', tax: '5', unit: 'KG', hsn: '0713' },
      { name: 'Dettol Original Germ Protection Soap 100g', barcode: '8901396112018', rate: '40', tax: '18', unit: 'NOS', hsn: '3401' },
    ]);
    toast.success('Loaded 7 sample retail grocery products into the batch table!');
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    if (scannerTarget === 'single') {
      setItemBarcode(scannedCode);
      toast.success(`Barcode scanned: ${scannedCode}`);
    } else if (typeof scannerTarget === 'number') {
      const idx = scannerTarget;
      setBulkRows((prev) => {
        const next = [...prev];
        if (next[idx]) {
          next[idx] = { ...next[idx], barcode: scannedCode };
        }
        return next;
      });
      toast.success(`Barcode scanned for row #${idx + 1}: ${scannedCode}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients & Items Catalog"
        subtitle="Auto-completes client GSTIN, address, place of supply, and product HSN/rates as you type."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={tab === 'clients' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTab('clients')}
              className="shrink-0"
            >
              <Users className="w-4 h-4" />
              <span>
                <span className="sm:hidden">Clients</span>
                <span className="hidden sm:inline">Clients ({clients.length})</span>
              </span>
            </Button>
            <Button
              variant={tab === 'items' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTab('items')}
              className="shrink-0"
            >
              <Package className="w-4 h-4" />
              <span>
                <span className="sm:hidden">Items</span>
                <span className="hidden sm:inline">Items ({items.length})</span>
              </span>
            </Button>
          </div>
        }
      />

      {tab === 'clients' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <GlassCard className="lg:col-span-5 p-5 space-y-4">
            <h2 className="font-display text-base font-bold">Add Client</h2>
            <form onSubmit={handleAddClient} className="space-y-3">
              <Input
                required
                placeholder="Client / Business Name *"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
              <Input
                placeholder="GSTIN (Optional — auto-detects state)"
                value={clientGstin}
                maxLength={15}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  setClientGstin(v);
                  const res = validateAndParseGstin(v);
                  if (res.stateCode) setClientState(res.stateCode);
                }}
              />
              <Input
                placeholder="Billing Address"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <Select value={clientState} onChange={(e) => setClientState(e.target.value)}>
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="Phone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
              <Button type="submit" variant="gold" className="w-full">
                <Plus className="w-4 h-4" />
                <span>Save Client</span>
              </Button>
            </form>
          </GlassCard>

          <GlassCard className="lg:col-span-7 p-5 space-y-3">
            <h2 className="font-display text-base font-bold">Saved Clients</h2>
            {clients.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No saved clients yet. Clients are also auto-saved when you finalize invoices.
              </p>
            ) : (
              <div className="space-y-2">
                {clients.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3.5 py-2.5"
                  >
                    <div>
                      <div className="text-sm font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        GSTIN: {c.gstin || 'B2C'} • State {c.billing_address.state_code} • Used{' '}
                        {c.use_count}×
                      </div>
                    </div>
                    <button
                      onClick={() => db.clients.delete(c.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Single Product Form or Multi-Item Batch Entry */}
          <GlassCard className="lg:col-span-5 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h2 className="font-display text-base font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-gold" />
                <span>
                  {editingItemId
                    ? 'Edit Catalog Product'
                    : itemAddMode === 'single'
                    ? 'Add Product / Service'
                    : 'Multi-Item Quick Batch'}
                </span>
              </h2>

              {!editingItemId && (
                <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setItemAddMode('single')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      itemAddMode === 'single'
                        ? 'bg-gold text-slate-950 font-bold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemAddMode('bulk')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      itemAddMode === 'bulk'
                        ? 'bg-gold text-slate-950 font-bold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    ⚡ Bulk Batch
                  </button>
                </div>
              )}
            </div>

            {itemAddMode === 'single' ? (
              <form onSubmit={handleAddItem} className="space-y-3">
                {editingItemId && (
                  <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-gold/15 border border-gold/30 text-gold font-medium">
                    <span>Editing existing product</span>
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
                    placeholder="e.g. Amul Butter 500g, Basmati Rice 1kg"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Barcode / EAN / SKU (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <BarcodeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Scan or type barcode number"
                        value={itemBarcode}
                        onChange={(e) => setItemBarcode(e.target.value)}
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
                      title="Scan product barcode using camera"
                    >
                      <Camera className="w-3.5 h-3.5 mr-1" />
                      <span>Scan</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      HSN / SAC Code
                    </label>
                    <Input
                      placeholder="e.g. 0401, 8471"
                      value={itemHsn}
                      onChange={(e) => setItemHsn(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Unit
                    </label>
                    <Select value={itemUnit} onChange={(e) => setItemUnit(e.target.value)}>
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

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Rate / Price (₹) *
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 150.00"
                      value={itemRate}
                      onChange={(e) => setItemRate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      GST Rate
                    </label>
                    <Select value={itemTax} onChange={(e) => setItemTax(e.target.value)}>
                      {['0', '5', '12', '18', '28'].map((r) => (
                        <option key={r} value={r}>
                          GST {r}%
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button type="submit" variant="gold" className="flex-1 font-semibold">
                    <Plus className="w-4 h-4 mr-1" />
                    <span>{editingItemId ? 'Update Product' : 'Save Product to Catalog'}</span>
                  </Button>
                  {editingItemId && (
                    <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            ) : (
              /* Multi-Row Batch Entry Form */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <p className="text-xs text-muted-foreground">
                    Add multiple store products at once into your catalog.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleLoadGrocerySamplePack}
                    className="text-[11px] h-7 px-2 border-gold/40 text-gold bg-gold/10"
                    title="Populate common grocery staples to test"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    <span>Grocery Samples</span>
                  </Button>
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {bulkRows.map((r, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-2.5 rounded-xl border border-border/80 bg-muted/20 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono text-gold font-bold">
                          #{rIdx + 1}
                        </span>
                        {bulkRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setBulkRows((prev) => prev.filter((_, i) => i !== rIdx))
                            }
                            className="text-muted-foreground hover:text-rose-400 text-xs cursor-pointer p-0.5"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <Input
                        placeholder="Item Name (e.g. Basmati Rice 1kg)"
                        value={r.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBulkRows((prev) => {
                            const next = [...prev];
                            next[rIdx] = { ...next[rIdx], name: val };
                            return next;
                          });
                        }}
                        className="text-xs h-8"
                      />

                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <Input
                            placeholder="Barcode (optional)"
                            value={r.barcode}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBulkRows((prev) => {
                                const next = [...prev];
                                next[rIdx] = { ...next[rIdx], barcode: val };
                                return next;
                              });
                            }}
                            className="font-mono text-xs h-8 pr-7"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setScannerTarget(rIdx);
                              setScannerOpen(true);
                            }}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gold hover:text-white p-1 cursor-pointer"
                            title="Scan barcode for this item"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <Input
                          type="number"
                          step="any"
                          placeholder="Rate (₹)"
                          value={r.rate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBulkRows((prev) => {
                              const next = [...prev];
                              next[rIdx] = { ...next[rIdx], rate: val };
                              return next;
                            });
                          }}
                          className="w-20 text-xs h-8 font-mono"
                        />

                        <Select
                          value={r.tax}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBulkRows((prev) => {
                              const next = [...prev];
                              next[rIdx] = { ...next[rIdx], tax: val };
                              return next;
                            });
                          }}
                          className="w-20 text-xs h-8"
                        >
                          {['0', '5', '12', '18', '28'].map((t) => (
                            <option key={t} value={t}>
                              {t}%
                            </option>
                          ))}
                        </Select>

                        <Select
                          value={r.unit}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBulkRows((prev) => {
                              const next = [...prev];
                              next[rIdx] = { ...next[rIdx], unit: val };
                              return next;
                            });
                          }}
                          className="w-18 text-xs h-8"
                        >
                          {['NOS', 'KG', 'GM', 'LTR', 'PKT', 'BTL', 'BOX'].map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setBulkRows((prev) => [
                        ...prev,
                        { name: '', barcode: '', rate: '', tax: '5', unit: 'NOS', hsn: '' },
                      ])
                    }
                    className="text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Add Row</span>
                  </Button>

                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    onClick={handleSaveBulkRows}
                    className="flex-1 text-xs h-8 font-semibold"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    <span>Save All Items to Catalog</span>
                  </Button>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Right Column: Searchable Saved Products Directory */}
          <GlassCard className="lg:col-span-7 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-3">
              <div>
                <h2 className="font-display text-base font-bold flex items-center gap-2">
                  <span>Saved Items Directory</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30 font-mono">
                    {items.length}
                  </span>
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Available for 1-click selection and barcode lookups in the invoice generator
                </p>
              </div>

              {/* GST Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
                {['all', '0', '5', '12', '18', '28'].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setItemGstFilter(rate)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border cursor-pointer transition-all shrink-0 ${
                      itemGstFilter === rate
                        ? 'border-gold bg-gold/25 text-gold'
                        : 'border-border/80 bg-muted/30 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {rate === 'all' ? 'All' : `${rate}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Instant Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search products by name, barcode, or HSN..."
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                className="pl-9 text-xs h-8.5"
              />
            </div>

            {filteredItems.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">
                {items.length === 0
                  ? 'No saved items yet. Add products using the form on the left or auto-save them when billing.'
                  : 'No items match your search filter.'}
              </p>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {filteredItems.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 hover:border-primary/40 transition-all"
                  >
                    <div className="space-y-1 truncate pr-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm font-semibold truncate">{it.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted/80 text-muted-foreground font-mono">
                          {it.unit}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px]">
                          GST {it.tax_rate}%
                        </span>
                        {it.hsn_sac ? <span>HSN: {it.hsn_sac}</span> : null}
                        {it.barcode ? (
                          <span className="flex items-center gap-1 font-mono text-[10px] text-sky-300 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-400/30">
                            <BarcodeIcon className="w-3 h-3" />
                            <span>{it.barcode}</span>
                          </span>
                        ) : null}
                        <span>• Used {it.use_count}×</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-semibold text-gold text-sm font-mono">
                        <MoneyText value={it.rate} />
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEditItem(it)}
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
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Barcode Scanner Modal for Catalog */}
      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title={
          typeof scannerTarget === 'number'
            ? `Scan Barcode for Row #${scannerTarget + 1}`
            : editingItemId
            ? 'Scan Barcode to Update Product'
            : 'Scan Product Barcode to Save'
        }
        subtitle="Align product barcode (EAN-13, UPC, Code-128, QR) inside camera"
        continuous={false}
      />
    </div>
  );
}

export function BackupAndVaultPage() {
  const { vaultEnabled, setVaultStatus, activeCompany } = useAppStore();
  const vaultSetting = useLiveQuery(() => getVaultSettings(), []);

  // Backup Export State
  const [scope, setScope] = useState<BackupScope>('everything');
  const [includePdfs, setIncludePdfs] = useState(true);
  const [backupPass, setBackupPass] = useState('');
  const [backupPassConfirm, setBackupPassConfirm] = useState('');
  const [exporting, setExporting] = useState(false);

  // Backup Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPass, setImportPass] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importing, setImporting] = useState(false);

  // Vault Setup State
  const [vaultPass, setVaultPass] = useState('');
  const [vaultPassConfirm, setVaultPassConfirm] = useState('');
  const [understoodNoRecovery, setUnderstoodNoRecovery] = useState(false);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (backupPass.length < 4) {
      toast.error('Enter a password of at least 4 characters to encrypt the backup');
      return;
    }
    if (backupPass !== backupPassConfirm) {
      toast.error('Backup passwords do not match');
      return;
    }
    setExporting(true);
    try {
      const { blob, filename, manifest } = await exportEncryptedBackup({
        scope,
        includePdfs,
        password: backupPass,
      });
      downloadBlob(blob, filename);
      toast.success(
        `Exported encrypted ${filename} (${manifest.counts.documents} docs, ${manifest.counts.templates} templates)`
      );
      setBackupPass('');
      setBackupPassConfirm('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('Select a .ingen backup file first');
      return;
    }
    if (!importPass) {
      toast.error('Enter the backup decryption password');
      return;
    }
    setImporting(true);
    try {
      const manifest = await importEncryptedBackup({
        file: importFile,
        password: importPass,
        mode: importMode,
      });
      toast.success(
        `Restored ${manifest.counts.documents} documents & ${manifest.counts.templates} templates!`
      );
      setImportPass('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const handleEnableVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!understoodNoRecovery) {
      toast.error('Please confirm that you understand forgotten passwords cannot be recovered');
      return;
    }
    if (vaultPass.length < 4 || vaultPass !== vaultPassConfirm) {
      toast.error('Passwords must match and be at least 4 characters');
      return;
    }
    const verifier = await createVaultVerifier(vaultPass);
    const cfg: VaultSettingsValue = {
      enabled: true,
      salt: verifier.salt,
      iterations: verifier.iterations,
      verifier_iv: verifier.verifier_iv,
      verifier_ct: verifier.verifier_ct,
      auto_lock_minutes: 5,
    };
    await setSetting('vault', cfg);
    setVaultStatus(true, true);
    setVaultPass('');
    setVaultPassConfirm('');
    toast.success('Secure Vault enabled! You can also enroll Fingerprint/Touch ID below.');
  };

  const handleEnrollBiometric = async () => {
    if (!vaultSetting) return;
    const credId = await enrollBiometricQuickUnlock(activeCompany?.name || 'INGEN User');
    if (!credId) {
      toast.error('Platform biometric authenticator was cancelled or unavailable on this device');
      return;
    }
    await setSetting<VaultSettingsValue>('vault', {
      ...vaultSetting,
      biometric_credential_id: credId,
    });
    toast.success('Fingerprint / Face ID enrolled for instant offline unlock!');
  };

  const handleDisableVault = async () => {
    await setSetting('vault', null);
    setVaultStatus(false, true);
    toast.success('Secure Vault disabled');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Encrypted Backup & Secure Vault"
        subtitle="AES-256-GCM password-encrypted .ingen archives (Templates + Data + Blobs) and optional Password/Fingerprint App Lock."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Encrypted Export */}
        <GlassCard className="lg:col-span-6 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Download className="w-5 h-5 text-gold" />
            <h2 className="font-display text-lg font-bold">
              Export Encrypted Backup (.ingen)
            </h2>
          </div>

          <form onSubmit={handleExport} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                What to Export
              </label>
              <Select
                value={scope}
                onChange={(e) => setScope(e.target.value as BackupScope)}
              >
                <option value="everything">
                  Everything (Templates + Invoices + Clients + Image/PDF Blobs)
                </option>
                <option value="templates">
                  Templates Pack Only (Shareable template layouts & designs)
                </option>
                <option value="data">
                  Business Data Only (Companies, Invoices, Clients & Items)
                </option>
              </Select>
            </div>

            <label className="flex items-center gap-2.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={includePdfs}
                onChange={(e) => setIncludePdfs(e.target.checked)}
                className="rounded border-border"
              />
              <span>Include archived PDF Blobs inside ZIP</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input
                type="password"
                required
                placeholder="Encryption Password *"
                value={backupPass}
                onChange={(e) => setBackupPass(e.target.value)}
              />
              <Input
                type="password"
                required
                placeholder="Confirm Password *"
                value={backupPassConfirm}
                onChange={(e) => setBackupPassConfirm(e.target.value)}
              />
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Encrypted with AES-256-GCM + PBKDF2. If you forget this password, the backup file cannot be decrypted.
              </span>
            </div>

            <Button type="submit" variant="gold" className="w-full" disabled={exporting}>
              <Download className="w-4 h-4" />
              <span>{exporting ? 'Encrypting & Compressing…' : 'Download Encrypted .ingen Backup'}</span>
            </Button>
          </form>
        </GlassCard>

        {/* Encrypted Restore */}
        <GlassCard className="lg:col-span-6 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Upload className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-bold">
              Decrypt & Restore Backup
            </h2>
          </div>

          <form onSubmit={handleImport} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Select .ingen Archive File
              </label>
              <Input
                type="file"
                accept=".ingen,application/octet-stream"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input
                type="password"
                required
                placeholder="Decryption Password *"
                value={importPass}
                onChange={(e) => setImportPass(e.target.value)}
              />
              <Select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
              >
                <option value="merge">Merge Safely (Keep existing + update)</option>
                <option value="replace">Replace Local Data</option>
              </Select>
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={importing}>
              <Upload className="w-4 h-4" />
              <span>{importing ? 'Decrypting & Restoring…' : 'Decrypt & Restore Archive'}</span>
            </Button>
          </form>
        </GlassCard>

        {/* Secure Vault (Password + Fingerprint Lock) */}
        <GlassCard className="lg:col-span-12 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-gold" />
              <div>
                <h2 className="font-display text-lg font-bold">
                  Optional Secure Vault (Password & Fingerprint / Touch ID)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Zero-knowledge PBKDF2-SHA-256 verification + WebAuthn platform biometric unlock.
                </p>
              </div>
            </div>
          </div>

          {vaultEnabled ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-emerald-400">
                  Secure Vault is Active
                </div>
                <div className="text-xs text-muted-foreground">
                  {vaultSetting?.biometric_credential_id
                    ? 'Fingerprint / Face ID quick unlock is enrolled.'
                    : 'Password protection active. You can also enroll Fingerprint/Touch ID.'}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button variant="secondary" onClick={handleEnrollBiometric}>
                  <Fingerprint className="w-4 h-4 text-gold" />
                  <span>Enroll Fingerprint / Touch ID</span>
                </Button>
                <Button
                  variant="gold"
                  onClick={() => setVaultStatus(true, false)}
                >
                  <Lock className="w-4 h-4" />
                  <span>Lock App Now</span>
                </Button>
                <Button variant="danger" onClick={handleDisableVault}>
                  Disable Vault
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEnableVault} className="space-y-3.5 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="password"
                  required
                  placeholder="Set Vault Password *"
                  value={vaultPass}
                  onChange={(e) => setVaultPass(e.target.value)}
                />
                <Input
                  type="password"
                  required
                  placeholder="Confirm Vault Password *"
                  value={vaultPassConfirm}
                  onChange={(e) => setVaultPassConfirm(e.target.value)}
                />
              </div>

              <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={understoodNoRecovery}
                  onChange={(e) => setUnderstoodNoRecovery(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I understand INGEN has no server and no password reset. Forgetting my Vault password means permanent loss of access to my local data.
                </span>
              </label>

              <Button type="submit" variant="primary">
                <Lock className="w-4 h-4" />
                <span>Enable Secure Vault</span>
              </Button>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

export function VaultLockScreen() {
  const { setVaultStatus } = useAppStore();
  const vaultSetting = useLiveQuery(() => getVaultSettings(), []);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultSetting) {
      setVaultStatus(false, true);
      return;
    }
    setChecking(true);
    setError('');
    const key = await verifyVaultPassword(password, vaultSetting);
    setChecking(false);
    if (key) {
      setVaultStatus(true, true);
      toast.success('Vault unlocked');
    } else {
      setError('Incorrect Vault password');
    }
  };

  const handleBiometricUnlock = async () => {
    if (!vaultSetting?.biometric_credential_id) return;
    const ok = await verifyBiometricAssertion(vaultSetting.biometric_credential_id);
    if (ok) {
      setVaultStatus(true, true);
      toast.success('Unlocked with Biometrics');
    } else {
      setError('Biometric verification failed — please use your password');
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background text-foreground">
      <GlassCard className="w-full max-w-md p-6 sm:p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <IngenLogo size={48} showWordmark />
        </div>
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold">Secure Vault Locked</h1>
          <p className="text-xs text-muted-foreground">
            Enter your password or use Fingerprint / Touch ID to unlock your local database.
          </p>
        </div>

        <form onSubmit={handlePasswordUnlock} className="space-y-3 text-left">
          <Input
            type="password"
            autoFocus
            placeholder="Vault Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button type="submit" variant="gold" className="w-full" disabled={checking}>
            <Unlock className="w-4 h-4" />
            <span>{checking ? 'Verifying…' : 'Unlock with Password'}</span>
          </Button>
        </form>

        {vaultSetting?.biometric_credential_id ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleBiometricUnlock}
          >
            <Fingerprint className="w-4 h-4 text-gold" />
            <span>Unlock with Fingerprint / Face ID</span>
          </Button>
        ) : null}
      </GlassCard>
    </div>
  );
}

export function SettingsPage() {
  const { activeCompany } = useAppStore();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Profile & Settings"
        subtitle="Changes to your business profile apply to new documents; past finalized invoices preserve their historical snapshot."
      />
      <CompanyProfileForm initialCompany={activeCompany} />
      <BrandColorCustomizer />
    </div>
  );
}
