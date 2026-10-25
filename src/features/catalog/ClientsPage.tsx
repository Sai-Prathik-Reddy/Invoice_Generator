import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit2,
  Download,
  Upload,
  Phone,
  Building,
  FileSpreadsheet,
  X,
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
} from '../../design-system/components';
import { INDIAN_STATES, validateAndParseGstin } from '../../core/validate/gstin';
import {
  exportClientsToCsv,
  parseClientsCsv,
  downloadFile,
} from './csvService';
import { toast } from 'sonner';

export function ClientsPage() {
  const { activeCompany } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [stateCode, setStateCode] = useState('36'); // Telangana default

  // CSV Import State
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [csvParsedCount, setCsvParsedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Query clients scoped to active company
  const clients =
    useLiveQuery(
      async () =>
        activeCompany
          ? db.clients.where('company_id').equals(activeCompany.id).reverse().sortBy('use_count')
          : [],
      [activeCompany?.id]
    ) ?? [];

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.gstin && c.gstin.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }, [clients, searchQuery]);

  if (!activeCompany) {
    return (
      <GlassCard className="p-6 text-center space-y-2">
        <Users className="w-8 h-8 text-gold mx-auto" />
        <h3 className="font-bold text-base">No Business Configured</h3>
        <p className="text-xs text-muted-foreground">Please configure or select a business profile first.</p>
      </GlassCard>
    );
  }

  const handleStartEdit = (c: (typeof clients)[0]) => {
    setEditingClientId(c.id);
    setName(c.name);
    setGstin(c.gstin || '');
    setPhone(c.phone || '');
    setAddress(c.billing_address?.line1 || '');
    setStateCode(c.billing_address?.state_code || '36');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingClientId(null);
    setName('');
    setGstin('');
    setPhone('');
    setAddress('');
    setStateCode('36');
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const now = Date.now();
    const stateObj = INDIAN_STATES.find((s) => s.code === stateCode);

    if (editingClientId) {
      await db.clients.update(editingClientId, {
        name: name.trim(),
        gstin: gstin.trim().toUpperCase() || undefined,
        phone: phone.trim() || undefined,
        billing_address: {
          line1: address.trim(),
          city: '',
          state: stateObj?.name ?? 'Telangana',
          state_code: stateCode,
          pincode: '',
          country: 'India',
        },
        updated_at: now,
      });
      toast.success('Updated client details');
      handleCancelEdit();
    } else {
      await db.clients.put({
        id: newId('cli'),
        company_id: activeCompany.id,
        name: name.trim(),
        gstin: gstin.trim().toUpperCase() || undefined,
        phone: phone.trim() || undefined,
        billing_address: {
          line1: address.trim(),
          city: '',
          state: stateObj?.name ?? 'Telangana',
          state_code: stateCode,
          pincode: '',
          country: 'India',
        },
        custom_fields: [],
        use_count: 0,
        last_used_at: now,
        created_at: now,
        updated_at: now,
      });
      toast.success('Saved new client');
      setName('');
      setGstin('');
      setPhone('');
      setAddress('');
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (clients.length === 0) {
      toast.error('No clients to export');
      return;
    }
    const csv = exportClientsToCsv(clients);
    const filename = `clients_${activeCompany.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csv, filename);
    toast.success(`Exported ${clients.length} clients to CSV`);
  };

  // CSV Import
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvRawText(content);
        const parsed = parseClientsCsv(content);
        setCsvParsedCount(parsed.length);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmCsvImport = async () => {
    const parsed = parseClientsCsv(csvRawText);
    if (parsed.length === 0) {
      toast.error('No valid clients found in CSV');
      return;
    }
    const now = Date.now();
    for (const c of parsed) {
      const stateObj = INDIAN_STATES.find((s) => s.code === (c.state_code || '36'));
      await db.clients.put({
        id: newId('cli'),
        company_id: activeCompany.id,
        name: c.name,
        gstin: c.gstin,
        phone: c.phone,
        billing_address: {
          line1: c.address || '',
          city: '',
          state: stateObj?.name ?? 'Telangana',
          state_code: c.state_code || '36',
          pincode: '',
          country: 'India',
        },
        custom_fields: [],
        use_count: 0,
        last_used_at: now,
        created_at: now,
        updated_at: now,
      });
    }
    toast.success(`Imported ${parsed.length} clients!`);
    setCsvModalOpen(false);
    setCsvRawText('');
  };

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Clients Directory"
        subtitle={`Customers & accounts for ${activeCompany.name} • ${clients.length} Saved`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="border-gold/40 text-gold text-xs h-9"
              title="Export Clients to CSV"
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
                setCsvModalOpen(true);
              }}
              className="border-primary/40 text-primary text-xs h-9"
              title="Import Clients from CSV"
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">Import CSV</span>
              <span className="sm:hidden">Import</span>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Add / Edit Client Form */}
        <GlassCard className="lg:col-span-5 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <h2 className="font-display text-sm sm:text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-gold" />
              <span>{editingClientId ? 'Edit Client' : 'Add New Client'}</span>
            </h2>
          </div>

          <form onSubmit={handleSaveClient} className="space-y-3">
            {editingClientId && (
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-gold/15 border border-gold/30 text-gold font-medium">
                <span>Editing existing client</span>
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
                Client / Business Name *
              </label>
              <Input
                required
                placeholder="e.g. Ramesh Trading Co, Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                GSTIN (Optional — auto-detects state)
              </label>
              <Input
                placeholder="15-character GSTIN (leave blank for B2C)"
                value={gstin}
                maxLength={15}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  setGstin(v);
                  const res = validateAndParseGstin(v);
                  if (res.stateCode) setStateCode(res.stateCode);
                }}
                className="font-mono text-xs uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Phone / WhatsApp
                </label>
                <Input
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  State
                </label>
                <Select value={stateCode} onChange={(e) => setStateCode(e.target.value)}>
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Billing Address
              </label>
              <Input
                placeholder="Shop/Street address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <Button type="submit" variant="gold" className="w-full mt-2">
              <Plus className="w-4 h-4 mr-1" />
              <span>{editingClientId ? 'Update Client' : 'Save Client'}</span>
            </Button>
          </form>
        </GlassCard>

        {/* Right Column: Clients List */}
        <GlassCard className="lg:col-span-7 p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm sm:text-base font-bold flex items-center gap-2">
              <span>Saved Clients</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gold/20 text-gold font-mono">
                {filteredClients.length}
              </span>
            </h2>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search clients by name, GSTIN, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {filteredClients.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Users className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p className="text-xs">
                {clients.length === 0
                  ? 'No clients saved yet. Add a client using the form on the left or auto-save them during billing.'
                  : 'No clients match your search.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredClients.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3 hover:border-primary/40 transition-all"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm font-semibold text-foreground truncate">{c.name}</span>
                      {c.gstin ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gold/15 text-gold border border-gold/30">
                          {c.gstin}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                          B2C
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {c.phone && (
                        <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                          <Phone className="w-3 h-3" />
                          <span>{c.phone}</span>
                        </span>
                      )}
                      <span>State: {c.billing_address?.state_code || '36'}</span>
                      {c.billing_address?.line1 && (
                        <span className="truncate max-w-[200px]">
                          • {c.billing_address.line1}
                        </span>
                      )}
                      <span>• Used {c.use_count}×</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(c)}
                      className="p-1.5 text-muted-foreground hover:text-gold cursor-pointer transition-colors"
                      title="Edit client"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => db.clients.delete(c.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                      title="Delete client"
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

      {/* CSV Import Modal */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl glass-chrome border border-border p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <h3 className="font-display font-bold text-base flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span>Import Clients from CSV</span>
              </h3>
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Select or paste a CSV file containing columns like <code className="text-gold">Client Name, GSTIN, Phone, Address, State Code</code>.
            </p>

            <div className="flex items-center gap-3">
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
                className="text-xs"
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                <span>Upload CSV File</span>
              </Button>
              {csvParsedCount > 0 && (
                <span className="text-xs text-emerald-400 font-semibold font-mono">
                  ✓ {csvParsedCount} valid clients parsed
                </span>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Or paste CSV contents directly:
              </label>
              <textarea
                rows={6}
                value={csvRawText}
                onChange={(e) => {
                  setCsvRawText(e.target.value);
                  const parsed = parseClientsCsv(e.target.value);
                  setCsvParsedCount(parsed.length);
                }}
                placeholder="Client Name,GSTIN,Phone Number,Billing Address,State Code..."
                className="w-full rounded-xl border border-border bg-muted/40 p-3 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCsvModalOpen(false)}
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
                Import {csvParsedCount} Clients
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
