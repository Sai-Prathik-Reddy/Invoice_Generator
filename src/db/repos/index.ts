import { db, type BackupSettingsValue, type SessionSettingsValue, type UiSettingsValue, type VaultSettingsValue } from '../schema';
import { newId } from '../../core/id';
import type {
  Asset,
  Client,
  Company,
  DocumentRecord,
  Item,
  Template,
  TemplateDefinition,
  TemplateVersion,
} from '../../core/schema/types';
import { evaluateDocument } from '../../core/formula';
import { formatSequencePattern, resolveSequencePeriod } from '../../core/sequence';
import { createStarterTemplateRecords } from '../../templates/starters';
import { toBig } from '../../core/format';

export async function ensureStarterTemplates(): Promise<void> {
  const count = await db.templates.count();
  if (count > 0) return;
  const { templates, versions } = createStarterTemplateRecords();
  await db.transaction('rw', db.templates, db.templateVersions, async () => {
    await db.templates.bulkPut(templates);
    await db.templateVersions.bulkPut(versions);
  });
}

export async function getSetting<T>(key: 'ui' | 'session' | 'vault' | 'backup' | 'onboarding', fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row ? (row.value as T) : fallback;
}

export async function setSetting<T>(key: 'ui' | 'session' | 'vault' | 'backup' | 'onboarding', value: T): Promise<void> {
  await db.settings.put({ key, value, updated_at: Date.now() });
}

export async function getUiSettings(): Promise<UiSettingsValue> {
  return getSetting<UiSettingsValue>('ui', {
    theme: 'dark',
    density: 'comfortable',
    reduce_motion: false,
  });
}

export async function getBackupSettings(): Promise<BackupSettingsValue> {
  return getSetting<BackupSettingsValue>('backup', {
    reminder_days: 7,
  });
}

export async function getVaultSettings(): Promise<VaultSettingsValue | null> {
  return getSetting<VaultSettingsValue | null>('vault', null);
}

export async function getActiveCompany(): Promise<Company | null> {
  const session = await getSetting<SessionSettingsValue>('session', {});
  if (session.active_company_id) {
    const found = await db.companies.get(session.active_company_id);
    if (found && !found.archived) return found;
  }
  const first = await db.companies.filter((c) => !c.archived).first();
  if (first) {
    await setSetting<SessionSettingsValue>('session', { active_company_id: first.id });
    return first;
  }
  return null;
}

export async function setActiveCompanyId(companyId: string): Promise<void> {
  await setSetting<SessionSettingsValue>('session', { active_company_id: companyId });
}

export async function saveCompany(input: Omit<Company, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Company> {
  const now = Date.now();
  const existing = input.id ? await db.companies.get(input.id) : undefined;
  const company: Company = {
    ...input,
    id: existing?.id ?? newId('cmp'),
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  await db.companies.put(company);
  const session = await getSetting<SessionSettingsValue>('session', {});
  if (!session.active_company_id) {
    await setActiveCompanyId(company.id);
  }
  return company;
}

export async function storeAssetBlob(blob: Blob, kind: Asset['kind'] = 'image'): Promise<Asset> {
  const buf = await blob.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  const hashHex = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const existing = await db.assets.where('hash').equals(hashHex).first();
  if (existing) return existing;

  const asset: Asset = {
    id: newId('ast'),
    kind,
    mime: blob.type || 'application/octet-stream',
    size: blob.size,
    hash: hashHex,
    blob,
    created_at: Date.now(),
  };
  await db.assets.put(asset);
  return asset;
}

export async function cloneTemplateForCompany(templateId: string, companyId: string, customName?: string): Promise<Template> {
  const src = await db.templates.get(templateId);
  if (!src) throw new Error('Source template not found');
  const now = Date.now();
  const newTplId = newId('tpl');
  const newVerId = newId('tpv');
  const defCopy: TemplateDefinition = JSON.parse(JSON.stringify(src.draft_definition));

  const tpl: Template = {
    id: newTplId,
    company_id: companyId,
    name: customName || `${src.name} (Copy)`,
    doc_type: src.doc_type,
    draft_definition: defCopy,
    current_version_id: newVerId,
    has_unpublished_changes: false,
    archived: false,
    created_at: now,
    updated_at: now,
  };

  const ver: TemplateVersion = {
    id: newVerId,
    template_id: newTplId,
    version_no: 1,
    definition: defCopy,
    definition_hash: `v1_${now}`,
    created_at: now,
  };

  await db.transaction('rw', db.templates, db.templateVersions, async () => {
    await db.templates.put(tpl);
    await db.templateVersions.put(ver);
  });

  return tpl;
}

export async function publishTemplateDraft(templateId: string): Promise<TemplateVersion> {
  const tpl = await db.templates.get(templateId);
  if (!tpl) throw new Error('Template not found');

  const versions = await db.templateVersions.where('template_id').equals(templateId).toArray();
  const maxVersion = versions.reduce((m, v) => Math.max(m, v.version_no), 0);
  const now = Date.now();
  const frozenDef: TemplateDefinition = JSON.parse(JSON.stringify(tpl.draft_definition));
  const ver: TemplateVersion = {
    id: newId('tpv'),
    template_id: templateId,
    version_no: maxVersion + 1,
    definition: frozenDef,
    definition_hash: `v${maxVersion + 1}_${now}`,
    created_at: now,
  };

  await db.transaction('rw', db.templates, db.templateVersions, async () => {
    await db.templateVersions.put(ver);
    await db.templates.update(templateId, {
      current_version_id: ver.id,
      has_unpublished_changes: false,
      updated_at: now,
    });
  });

  return ver;
}

export async function previewNextDocumentNumber(
  company: Company,
  definition: TemplateDefinition,
  issueDate: string
): Promise<string> {
  const { series, pattern, reset } = definition.config.sequence;
  const period = resolveSequencePeriod(issueDate, reset, company.fy_start_month);
  const seqId = `${company.id}|${series}|${period}`;
  const seqRecord = await db.sequences.get(seqId);
  const nextSeq = (seqRecord?.last_value ?? 0) + 1;
  return formatSequencePattern(pattern, {
    series,
    issueDate,
    fyStartMonth: company.fy_start_month,
    seq: nextSeq,
  });
}

export async function saveOrFinalizeDocument(params: {
  id?: string;
  company: Company;
  template: Template;
  definition: TemplateDefinition;
  issueDate: string;
  dueDate?: string;
  placeOfSupply: string;
  values: Record<string, string>;
  items: Array<Record<string, string>>;
  finalize: boolean;
  saveToCatalog?: boolean;
  pdfBlob?: Blob;
}): Promise<DocumentRecord> {
  const now = Date.now();
  const computed = evaluateDocument({
    definition: params.definition,
    company: params.company,
    placeOfSupply: params.placeOfSupply,
    values: params.values,
    items: params.items,
  });

  let pdfAssetId: string | undefined;
  if (params.pdfBlob) {
    const asset = await storeAssetBlob(params.pdfBlob, 'pdf');
    pdfAssetId = asset.id;
  }

  return db.transaction(
    'rw',
    [db.documents, db.sequences, db.clients, db.items],
    async () => {
      const existing = params.id ? await db.documents.get(params.id) : undefined;
      const docId = existing?.id ?? newId('doc');
      const { series, pattern, reset } = params.definition.config.sequence;

      let number = existing?.number;
      let seqValue = existing?.seq_value;
      let period = existing?.period;

      if (params.finalize && existing?.status !== 'finalized') {
        period = resolveSequencePeriod(params.issueDate, reset, params.company.fy_start_month);
        const seqId = `${params.company.id}|${series}|${period}`;
        const curSeq = await db.sequences.get(seqId);
        seqValue = (curSeq?.last_value ?? 0) + 1;
        await db.sequences.put({
          id: seqId,
          company_id: params.company.id,
          series,
          period,
          last_value: seqValue,
          updated_at: now,
        });
        number = formatSequencePattern(pattern, {
          series,
          issueDate: params.issueDate,
          fyStartMonth: params.company.fy_start_month,
          seq: seqValue,
        });
      }

      // Optionally auto-save Client & Items to Catalog
      const clientName = (params.values['client_name'] || '').trim();
      let clientSnapshot: Client | undefined;
      if (clientName && params.saveToCatalog !== false) {
        const allClients = await db.clients.where('company_id').equals(params.company.id).toArray();
        const foundClient = allClients.find(
          (c) => c.name.toLowerCase() === clientName.toLowerCase()
        );
        if (foundClient) {
          foundClient.use_count = (foundClient.use_count || 0) + (params.finalize ? 1 : 0);
          foundClient.last_used_at = now;
          foundClient.updated_at = now;
          await db.clients.put(foundClient);
          clientSnapshot = JSON.parse(JSON.stringify(foundClient));
        } else {
          const newClient: Client = {
            id: newId('cli'),
            company_id: params.company.id,
            name: clientName,
            gstin: params.values['client_gstin'] || '',
            phone: params.values['client_phone'] || '',
            billing_address: {
              line1: params.values['client_address'] || '',
              city: '',
              state: '',
              state_code: params.placeOfSupply || params.company.address.state_code,
              pincode: '',
              country: 'India',
            },
            custom_fields: [],
            use_count: params.finalize ? 1 : 0,
            last_used_at: now,
            created_at: now,
            updated_at: now,
          };
          await db.clients.put(newClient);
          clientSnapshot = newClient;
        }
      }

      if (params.saveToCatalog !== false) {
        const existingItems = await db.items.where('company_id').equals(params.company.id).toArray();
        for (const row of params.items) {
          const itemName = (row['item_name'] || '').trim();
          if (!itemName) continue;
          const match = existingItems.find((i) => i.name.toLowerCase() === itemName.toLowerCase());
          if (match) {
            match.use_count = (match.use_count || 0) + (params.finalize ? 1 : 0);
            match.last_used_at = now;
            if (!match.barcode && row['barcode']) {
              match.barcode = String(row['barcode']).trim();
            }
            await db.items.put(match);
          } else {
            await db.items.put({
              id: newId('itm'),
              company_id: params.company.id,
              name: itemName,
              barcode: row['barcode'] ? String(row['barcode']).trim() : undefined,
              hsn_sac: row['hsn_sac'] || '',
              unit: row['unit'] || 'NOS',
              rate: row['rate'] || '0',
              tax_rate: row['gst_rate'] || '18',
              price_includes_tax: params.definition.config.tax_mode === 'inclusive',
              custom_fields: [],
              use_count: params.finalize ? 1 : 0,
              last_used_at: now,
              created_at: now,
              updated_at: now,
            });
          }
        }
      }

      const grandTotal = String(computed.doc['grand_total'] || '0.00');
      const isReceivable = ['tax_invoice', 'bill_of_supply'].includes(params.template.doc_type);

      const docRecord: DocumentRecord = {
        id: docId,
        company_id: params.company.id,
        template_id: params.template.id,
        template_version_id: params.template.current_version_id || params.template.id,
        doc_type: params.template.doc_type,
        status: params.finalize ? 'finalized' : 'draft',
        series,
        number,
        seq_value: seqValue,
        period,
        issue_date: params.issueDate,
        due_date: params.dueDate,
        client_id: clientSnapshot?.id,
        place_of_supply: params.placeOfSupply,
        values: params.values,
        items: params.items,
        computed,
        snapshot: params.finalize
          ? {
              company: JSON.parse(JSON.stringify(params.company)),
              client: clientSnapshot,
            }
          : existing?.snapshot,
        pdf_asset_id: pdfAssetId ?? existing?.pdf_asset_id,
        grand_total: grandTotal,
        client_name: clientName || 'Walk-in Customer',
        payment: existing?.payment ?? {
          status: isReceivable ? 'unpaid' : 'na',
          paid_amount: '0.00',
          entries: [],
        },
        finalized_at: params.finalize ? now : existing?.finalized_at,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };

      await db.documents.put(docRecord);
      return docRecord;
    }
  );
}

export async function recordDocumentPayment(
  docId: string,
  entry: { date: string; amount: string; mode: 'cash' | 'upi' | 'bank' | 'card' | 'cheque' | 'other'; reference?: string }
): Promise<DocumentRecord> {
  const doc = await db.documents.get(docId);
  if (!doc) throw new Error('Document not found');

  const newEntries = [
    ...doc.payment.entries,
    {
      id: newId('pay'),
      ...entry,
    },
  ];
  const paidSum = newEntries.reduce((acc, e) => acc.plus(toBig(e.amount)), toBig(0));
  const grand = toBig(doc.grand_total);
  const status: DocumentRecord['payment']['status'] = paidSum.gte(grand)
    ? 'paid'
    : paidSum.gt(0)
    ? 'partial'
    : 'unpaid';

  const updated: DocumentRecord = {
    ...doc,
    payment: {
      status,
      paid_amount: paidSum.toFixed(2),
      entries: newEntries,
    },
    updated_at: Date.now(),
  };
  await db.documents.put(updated);
  return updated;
}

export async function cancelDocument(docId: string, reason: string): Promise<DocumentRecord> {
  const doc = await db.documents.get(docId);
  if (!doc) throw new Error('Document not found');
  const updated: DocumentRecord = {
    ...doc,
    status: 'cancelled',
    cancelled_at: Date.now(),
    cancel_reason: reason || 'Cancelled by user',
    updated_at: Date.now(),
  };
  await db.documents.put(updated);
  return updated;
}
