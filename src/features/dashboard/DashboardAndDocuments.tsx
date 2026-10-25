import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus,
  FileText,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  ArrowUpRight,
  Search,
  Download,
  Share2,
  Printer,
  CheckCircle2,
  XCircle,
  Copy,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { db } from '../../db/schema';
import { useAppStore } from '../../app/useAppStore';
import {
  Button,
  GlassCard,
  Input,
  Modal,
  MoneyText,
  PageHeader,
  Select,
  StatCard,
  StatusPill,
  TruncatedTextWithReadMore,
} from '../../design-system/components';
import { formatDate, toBig, todayIsoDate } from '../../core/format';
import { DOC_TYPE_LABELS } from '../../core/schema/types';
import { cancelDocument, recordDocumentPayment } from '../../db/repos';
import {
  compilePdfToBlob,
  downloadBlob,
  printPdfBlob,
  sanitizePdfFilename,
  shareReadyPdfFile,
} from '../share/sharePdf';
import { toast } from 'sonner';

export function DashboardPage() {
  const navigate = useNavigate();
  const { activeCompany } = useAppStore();

  const docs =
    useLiveQuery(
      async () =>
        activeCompany
          ? db.documents.where('company_id').equals(activeCompany.id).reverse().sortBy('created_at')
          : [],
      [activeCompany?.id]
    ) ?? [];

  const backupSetting = useLiveQuery(() => db.settings.get('backup'), []);

  const stats = useMemo(() => {
    const currentMonthPrefix = todayIsoDate().slice(0, 7);
    let monthRevenue = toBig(0);
    let unpaidBalance = toBig(0);
    let finalizedCount = 0;
    let gstCollected = toBig(0);

    for (const d of docs) {
      if (d.status !== 'finalized') continue;
      finalizedCount++;

      const isBill = ['tax_invoice', 'bill_of_supply'].includes(d.doc_type);
      if (isBill && d.issue_date.startsWith(currentMonthPrefix)) {
        monthRevenue = monthRevenue.plus(toBig(d.grand_total));
        const taxTot = d.computed?.doc['tax_total'] ?? '0';
        gstCollected = gstCollected.plus(toBig(taxTot));
      }

      if (isBill && d.payment.status !== 'paid' && d.payment.status !== 'na') {
        const due = toBig(d.grand_total).minus(toBig(d.payment.paid_amount));
        if (due.gt(0)) unpaidBalance = unpaidBalance.plus(due);
      }
    }

    return {
      monthRevenue: monthRevenue.toFixed(2),
      unpaidBalance: unpaidBalance.toFixed(2),
      finalizedCount,
      gstCollected: gstCollected.toFixed(2),
    };
  }, [docs]);

  if (!activeCompany) {
    return (
      <GlassCard className="p-8 text-center space-y-4">
        <h2 className="font-display text-2xl font-bold">Welcome to INGEN Studio</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Configure your business details, GSTIN, and UPI ID once to start generating vector PDFs offline.
        </p>
        <Button variant="gold" size="lg" onClick={() => navigate('/onboarding')}>
          <Sparkles className="w-4 h-4" />
          <span>Set Up My Business Profile</span>
        </Button>
      </GlassCard>
    );
  }

  const lastBackupAt = (backupSetting?.value as { last_backup_at?: number } | undefined)?.last_backup_at;
  const daysSinceBackup = lastBackupAt
    ? Math.floor((Date.now() - lastBackupAt) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good evening, ${activeCompany.name}`}
        subtitle={`GSTIN: ${activeCompany.gstin || 'Unregistered / Composition'} • State Code: ${activeCompany.address.state_code}`}
        actions={
          <>
            <button
              onClick={() => navigate('/backup')}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 sm:px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-gold/40 cursor-pointer shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-gold shrink-0" />
              <span>
                {daysSinceBackup === null ? (
                  <>
                    <span className="sm:hidden">No backup</span>
                    <span className="hidden sm:inline">Not backed up yet</span>
                  </>
                ) : daysSinceBackup === 0 ? (
                  <>
                    <span className="sm:hidden">Backed up</span>
                    <span className="hidden sm:inline">Backed up today</span>
                  </>
                ) : (
                  <>Backed up {daysSinceBackup}d ago</>
                )}
              </span>
            </button>
            <Button variant="primary" onClick={() => navigate('/documents/new')} className="shrink-0">
              <Plus className="w-4 h-4" />
              <span>New Invoice</span>
            </Button>
          </>
        }
      />

      {/* 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="This Month Revenue"
          value={stats.monthRevenue}
          sublabel="Finalized invoices this month"
          icon={<Sparkles className="w-4 h-4" />}
        />
        <StatCard
          label="Unpaid Balance"
          value={stats.unpaidBalance}
          sublabel="Pending receivables"
          accentGold
          icon={<AlertCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Finalized Documents"
          value={stats.finalizedCount}
          isMoney={false}
          sublabel={`${docs.filter((d) => d.status === 'draft').length} active drafts`}
          icon={<FileText className="w-4 h-4" />}
        />
        <StatCard
          label="GST Collected (Month)"
          value={stats.gstCollected}
          sublabel="CGST + SGST + IGST"
          accentGold
          icon={<ShieldCheck className="w-4 h-4" />}
        />
      </div>

      {/* Recent Documents Table */}
      <GlassCard className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-bold">Recent Documents</h2>
            <p className="text-xs text-muted-foreground">
              Click any document to preview PDF, share to WhatsApp, or record payment
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/documents')}>
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {docs.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No invoices or documents created yet for {activeCompany.name}.
            </p>
            <Button variant="gold" onClick={() => navigate('/documents/new')}>
              <Plus className="w-4 h-4" />
              <span>Create Your First GST Invoice</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="py-2.5 pr-3">Number / Type</th>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Issue Date</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 pl-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {docs.slice(0, 8).map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() =>
                      navigate(
                        doc.status === 'draft'
                          ? `/documents/${doc.id}/edit`
                          : `/documents/${doc.id}`
                      )
                    }
                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-3">
                      <div className="font-mono font-semibold text-foreground">
                        {doc.number || 'DRAFT'}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium">
                      {doc.client_name || 'Walk-in Customer'}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {formatDate(doc.issue_date)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold">
                      <MoneyText value={doc.grand_total} />
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <StatusPill
                        status={
                          doc.status === 'draft'
                            ? 'draft'
                            : doc.status === 'cancelled'
                            ? 'cancelled'
                            : doc.payment.status === 'na'
                            ? 'finalized'
                            : doc.payment.status
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export function DocumentsListPage() {
  const navigate = useNavigate();
  const { activeCompany } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const docs =
    useLiveQuery(
      async () =>
        activeCompany
          ? db.documents.where('company_id').equals(activeCompany.id).reverse().sortBy('created_at')
          : [],
      [activeCompany?.id]
    ) ?? [];

  const filtered = docs.filter((d) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'unpaid' && d.payment.status !== 'unpaid' && d.payment.status !== 'partial') {
        return false;
      } else if (statusFilter !== 'unpaid' && d.status !== statusFilter) {
        return false;
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNum = (d.number || 'draft').toLowerCase().includes(q);
      const matchClient = (d.client_name || '').toLowerCase().includes(q);
      return matchNum || matchClient;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents Ledger"
        subtitle="Manage all finalized invoices, quotations, receipts, and drafts."
        actions={
          <Button variant="primary" onClick={() => navigate('/documents/new')}>
            <Plus className="w-4 h-4" />
            <span>New Document</span>
          </Button>
        }
      />

      <GlassCard className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice # or client…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'finalized', label: 'Finalized' },
            { id: 'unpaid', label: 'Unpaid / Partial' },
            { id: 'draft', label: 'Drafts' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer transition-all ${
                statusFilter === tab.id
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-muted/40 text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-4 sm:p-6">
        {filtered.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">No matching documents found.</p>
            <Button variant="outline" onClick={() => navigate('/documents/new')}>
              <Plus className="w-4 h-4" />
              <span>Create Document</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                onClick={() =>
                  navigate(
                    doc.status === 'draft'
                      ? `/documents/${doc.id}/edit`
                      : `/documents/${doc.id}`
                  )
                }
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 hover:border-primary/40 cursor-pointer transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">
                      {doc.number || 'DRAFT'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {DOC_TYPE_LABELS[doc.doc_type]}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {doc.client_name || 'Walk-in Customer'} • Issued {formatDate(doc.issue_date)}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right">
                    <div className="font-display text-base font-bold">
                      <MoneyText value={doc.grand_total} />
                    </div>
                    {doc.payment.status === 'partial' ? (
                      <div className="text-[11px] text-gold">
                        Paid: <MoneyText value={doc.payment.paid_amount} />
                      </div>
                    ) : null}
                  </div>
                  <StatusPill
                    status={
                      doc.status === 'draft'
                        ? 'draft'
                        : doc.status === 'cancelled'
                        ? 'cancelled'
                        : doc.payment.status === 'na'
                        ? 'finalized'
                        : doc.payment.status
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export function DocumentDetailPage({ docId }: { docId: string }) {
  const navigate = useNavigate();
  const doc = useLiveQuery(() => db.documents.get(docId), [docId]);
  const template = useLiveQuery(
    () => (doc ? db.templates.get(doc.template_id) : undefined),
    [doc?.template_id]
  );
  const pdfAsset = useLiveQuery(
    () => (doc?.pdf_asset_id ? db.assets.get(doc.pdf_asset_id) : undefined),
    [doc?.pdf_asset_id]
  );
  const { activeCompany } = useAppStore();

  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<'upi' | 'cash' | 'bank' | 'card'>('upi');
  const [compiledBlob, setCompiledBlob] = useState<Blob | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const readyBlob = pdfAsset?.blob ?? compiledBlob;

  const handlePreview = async () => {
    const blob = await ensurePdfBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setPreviewModalOpen(true);
  };

  const ensurePdfBlob = async (): Promise<Blob | null> => {
    if (readyBlob) return readyBlob;
    if (!doc || !template) return null;
    const company = doc.snapshot?.company ?? activeCompany;
    if (!company) return null;
    setCompiling(true);
    try {
      const blob = await compilePdfToBlob({
        definition: template.draft_definition,
        company,
        client: doc.snapshot?.client,
        docMeta: {
          number: doc.number || 'DRAFT',
          status: doc.status,
          issue_date: doc.issue_date,
          due_date: doc.due_date,
          place_of_supply: doc.place_of_supply,
          type_label: DOC_TYPE_LABELS[doc.doc_type],
        },
        values: doc.values,
        items: doc.items,
        computed: doc.computed!,
      });
      setCompiledBlob(blob);
      return blob;
    } finally {
      setCompiling(false);
    }
  };

  if (!doc) {
    return <GlassCard className="p-6">Loading document…</GlassCard>;
  }

  const filename = sanitizePdfFilename({
    number: doc.number,
    clientName: doc.client_name,
    issueDate: doc.issue_date,
  });

  const handleShare = async () => {
    const blob = await ensurePdfBlob();
    if (!blob) return;
    const res = await shareReadyPdfFile({
      blob,
      filename,
      title: `${doc.number || 'Invoice'} from ${doc.snapshot?.company.name || activeCompany?.name}`,
      text: `Please find attached ${doc.number || 'Document'} for Rs. ${doc.grand_total}.`,
    });
    toast.success(res === 'shared' ? 'Shared via native sheet' : 'PDF downloaded');
  };

  const handleDownload = async () => {
    const blob = await ensurePdfBlob();
    if (!blob) return;
    downloadBlob(blob, filename);
    toast.success(`Downloaded ${filename}`);
  };

  const handlePrint = async () => {
    const blob = await ensurePdfBlob();
    if (!blob) return;
    printPdfBlob(blob);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || toBig(payAmount).lte(0)) return;
    await recordDocumentPayment(doc.id, {
      date: todayIsoDate(),
      amount: toBig(payAmount).toFixed(2),
      mode: payMode,
    });
    setPayAmount('');
    toast.success('Payment recorded in ledger');
  };

  const remainingBalance = toBig(doc.grand_total).minus(toBig(doc.payment.paid_amount));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${doc.number || 'DRAFT'} • ${doc.client_name || 'Customer'}`}
        subtitle={`${DOC_TYPE_LABELS[doc.doc_type]} • Issued ${formatDate(doc.issue_date)} • Snapshot Frozen`}
        actions={
          <>
            <Button variant="outline" onClick={handlePreview} disabled={compiling} className="shrink-0">
              <Eye className="w-4 h-4 text-gold" />
              <span>{compiling ? 'Rendering…' : <><span className="sm:hidden">View</span><span className="hidden sm:inline">View PDF</span></>}</span>
            </Button>
            <Button variant="gold" onClick={handleShare} disabled={compiling} className="shrink-0">
              <Share2 className="w-4 h-4" />
              <span>{compiling ? 'Preparing…' : <><span className="sm:hidden">Share</span><span className="hidden sm:inline">Share PDF</span></>}</span>
            </Button>
            <Button variant="primary" onClick={handleDownload} disabled={compiling} className="shrink-0">
              <Download className="w-4 h-4" />
              <span><span className="sm:hidden">Download</span><span className="hidden sm:inline">Download PDF</span></span>
            </Button>
            <Button variant="secondary" onClick={handlePrint} disabled={compiling} className="shrink-0">
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Summary & Line Items */}
        <div className="lg:col-span-8 space-y-6">
          <GlassCard className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
              <div className="min-w-0 max-w-full">
                <div className="text-xs text-muted-foreground uppercase">Billed To</div>
                <div className="font-display text-lg font-bold break-words">{doc.client_name}</div>
                <div className="text-xs text-muted-foreground break-words">
                  GSTIN: {doc.values['client_gstin'] || 'B2C / Unregistered'} • Place of Supply:{' '}
                  {doc.place_of_supply}
                </div>
                {doc.values['client_address'] ? (
                  <div className="text-xs text-muted-foreground mt-1">
                    <TruncatedTextWithReadMore text={doc.values['client_address']} maxChars={80} />
                  </div>
                ) : null}
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground uppercase">Grand Total</div>
                <div className="font-display text-2xl font-bold text-gold">
                  <MoneyText value={doc.grand_total} />
                </div>
                <StatusPill
                  status={
                    doc.status === 'cancelled'
                      ? 'cancelled'
                      : doc.payment.status === 'na'
                      ? 'finalized'
                      : doc.payment.status
                  }
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-2">#</th>
                    <th className="py-2">Item</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">GST</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(doc.computed?.items ?? doc.items).map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2.5 font-medium max-w-[200px]">
                        <TruncatedTextWithReadMore text={row['item_name']} maxChars={40} />
                      </td>
                      <td className="py-2.5 text-right">
                        {row['qty']} {row['unit']}
                      </td>
                      <td className="py-2.5 text-right">
                        <MoneyText value={row['rate']} symbol={false} />
                      </td>
                      <td className="py-2.5 text-right">{row['gst_rate']}%</td>
                      <td className="py-2.5 text-right font-semibold">
                        <MoneyText value={row['line_total'] ?? row['taxable']} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {doc.values['terms'] || doc.values['notes'] ? (
              <div className="text-xs text-muted-foreground pt-3 border-t border-border/60">
                <span className="font-semibold text-foreground">Terms / Notes: </span>
                <TruncatedTextWithReadMore
                  text={doc.values['terms'] || doc.values['notes']}
                  maxChars={90}
                />
              </div>
            ) : null}
          </GlassCard>
        </div>

        {/* Right Payment Ledger & Lifecycle Actions */}
        <div className="lg:col-span-4 space-y-6">
          {doc.status === 'finalized' && doc.payment.status !== 'na' ? (
            <GlassCard className="p-5 space-y-4">
              <h3 className="font-display text-base font-bold">Payment Ledger</h3>
              <div className="rounded-xl border border-border bg-muted/40 p-3 flex items-center justify-between text-xs">
                <span>Balance Due:</span>
                <span className="font-display text-base font-bold text-gold">
                  <MoneyText value={remainingBalance.gt(0) ? remainingBalance.toFixed(2) : '0.00'} />
                </span>
              </div>

              {remainingBalance.gt(0) ? (
                <form onSubmit={handleRecordPayment} className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={remainingBalance.toFixed(2)}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                    />
                    <Select
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value as 'upi' | 'cash' | 'bank' | 'card')}
                    >
                      <option value="upi">UPI</option>
                      <option value="bank">Bank NEFT/IMPS</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (!payAmount) setPayAmount(remainingBalance.toFixed(2));
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </Button>
                </form>
              ) : null}

              {doc.payment.entries.length > 0 ? (
                <div className="space-y-1.5 pt-2 border-t border-border text-xs">
                  {doc.payment.entries.map((e) => (
                    <div key={e.id} className="flex justify-between text-muted-foreground">
                      <span>
                        {formatDate(e.date)} ({e.mode.toUpperCase()})
                      </span>
                      <span className="text-emerald-400 font-medium">
                        +<MoneyText value={e.amount} />
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </GlassCard>
          ) : null}

          <GlassCard className="p-5 space-y-2.5">
            <h3 className="font-display text-base font-bold">Document Actions</h3>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => navigate(`/documents/new?duplicateId=${doc.id}`)}
            >
              <Copy className="w-4 h-4" />
              <span>Duplicate as New Draft</span>
            </Button>

            {doc.status === 'finalized' ? (
              <Button
                variant="danger"
                size="sm"
                className="w-full justify-start"
                onClick={async () => {
                  const reason = window.prompt('Reason for cancelling this invoice (sequence number is preserved):');
                  if (reason !== null) {
                    await cancelDocument(doc.id, reason);
                    toast.success('Invoice marked Cancelled');
                  }
                }}
              >
                <XCircle className="w-4 h-4" />
                <span>Cancel Document (Keep Sequence #)</span>
              </Button>
            ) : null}
          </GlassCard>
        </div>
      </div>

      {/* PDF View Modal */}
      <Modal
        open={previewModalOpen && Boolean(previewUrl)}
        onClose={() => {
          setPreviewModalOpen(false);
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
        }}
        title={
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gold" />
            <span>{doc.number || 'Invoice'} — Vector PDF Document</span>
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
              <Button
                variant="gold"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </Button>
            </div>
          ) : null
        }
      >
        {previewUrl ? (
          <div className="flex flex-col items-center w-full space-y-3">
            <iframe
              title={`${doc.number || 'Document'} PDF Preview`}
              src={`${previewUrl}#toolbar=1&navpanes=0`}
              className="w-full h-[76vh] rounded-xl border border-border bg-white shadow-inner"
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
