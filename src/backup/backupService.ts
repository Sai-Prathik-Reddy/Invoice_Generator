import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { db } from '../db/schema';
import { setSetting } from '../db/repos';
import { decryptBytesWithPassword, encryptBytesWithPassword } from '../security/crypto';
import type {
  Asset,
  Client,
  Company,
  DocumentRecord,
  Item,
  Sequence,
  Template,
  TemplateVersion,
} from '../core/schema/types';

export type BackupScope = 'everything' | 'templates' | 'data';

export interface ExportBackupOptions {
  scope: BackupScope;
  includePdfs: boolean;
  password: string;
}

export interface BackupManifest {
  app: 'INGEN';
  format_version: 1;
  scope: BackupScope;
  include_pdfs: boolean;
  created_at: number;
  counts: {
    companies: number;
    templates: number;
    templateVersions: number;
    documents: number;
    sequences: number;
    clients: number;
    items: number;
    assets: number;
  };
}

export async function exportEncryptedBackup(opts: ExportBackupOptions): Promise<{
  blob: Blob;
  filename: string;
  manifest: BackupManifest;
}> {
  if (!opts.password || opts.password.length < 4) {
    throw new Error('Backup password must be at least 4 characters');
  }

  const includeTemplates = opts.scope === 'everything' || opts.scope === 'templates';
  const includeData = opts.scope === 'everything' || opts.scope === 'data';

  const companies = includeData ? await db.companies.toArray() : [];
  const clients = includeData ? await db.clients.toArray() : [];
  const items = includeData ? await db.items.toArray() : [];
  const documents = includeData ? await db.documents.toArray() : [];
  const sequences = includeData ? await db.sequences.toArray() : [];
  const templates = includeTemplates ? await db.templates.toArray() : [];
  const templateVersions = includeTemplates ? await db.templateVersions.toArray() : [];

  const allAssets = await db.assets.toArray();
  const filteredAssets = allAssets.filter((a) => {
    if (a.kind === 'pdf' && !opts.includePdfs) return false;
    if (opts.scope === 'templates' && a.kind === 'pdf') return false;
    return true;
  });

  const assetMeta = filteredAssets.map((a) => ({
    id: a.id,
    kind: a.kind,
    mime: a.mime,
    size: a.size,
    hash: a.hash,
    width: a.width,
    height: a.height,
    created_at: a.created_at,
  }));

  const manifest: BackupManifest = {
    app: 'INGEN',
    format_version: 1,
    scope: opts.scope,
    include_pdfs: opts.includePdfs,
    created_at: Date.now(),
    counts: {
      companies: companies.length,
      templates: templates.length,
      templateVersions: templateVersions.length,
      documents: documents.length,
      sequences: sequences.length,
      clients: clients.length,
      items: items.length,
      assets: filteredAssets.length,
    },
  };

  const files: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    'data/companies.json': strToU8(JSON.stringify(companies)),
    'data/clients.json': strToU8(JSON.stringify(clients)),
    'data/items.json': strToU8(JSON.stringify(items)),
    'data/documents.json': strToU8(JSON.stringify(documents)),
    'data/sequences.json': strToU8(JSON.stringify(sequences)),
    'data/templates.json': strToU8(JSON.stringify(templates)),
    'data/templateVersions.json': strToU8(JSON.stringify(templateVersions)),
    'data/assets.json': strToU8(JSON.stringify(assetMeta)),
  };

  for (const asset of filteredAssets) {
    const buf = await asset.blob.arrayBuffer();
    files[`assets/${asset.id}.bin`] = new Uint8Array(buf);
  }

  const zipped = zipSync(files, { level: 6 });
  const encrypted = await encryptBytesWithPassword(zipped, opts.password);

  await setSetting('backup', {
    last_backup_at: Date.now(),
    reminder_days: 7,
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `INGEN_${opts.scope}_${dateStr}.ingen`;

  return {
    blob: new Blob([encrypted as unknown as BlobPart], { type: 'application/octet-stream' }),
    filename,
    manifest,
  };
}

export async function importEncryptedBackup(params: {
  file: File;
  password: string;
  mode: 'merge' | 'replace';
}): Promise<BackupManifest> {
  const fileBuf = await params.file.arrayBuffer();
  const decryptedZip = await decryptBytesWithPassword(new Uint8Array(fileBuf), params.password);
  const unzipped = unzipSync(decryptedZip);

  const manifestRaw = unzipped['manifest.json'];
  if (!manifestRaw) {
    throw new Error('Archive is missing manifest.json');
  }
  const manifest = JSON.parse(strFromU8(manifestRaw)) as BackupManifest;

  const parseJsonEntry = <T>(path: string): T[] => {
    const entry = unzipped[path];
    if (!entry) return [];
    return JSON.parse(strFromU8(entry)) as T[];
  };

  const companies = parseJsonEntry<Company>('data/companies.json');
  const clients = parseJsonEntry<Client>('data/clients.json');
  const items = parseJsonEntry<Item>('data/items.json');
  const documents = parseJsonEntry<DocumentRecord>('data/documents.json');
  const sequences = parseJsonEntry<Sequence>('data/sequences.json');
  const templates = parseJsonEntry<Template>('data/templates.json');
  const templateVersions = parseJsonEntry<TemplateVersion>('data/templateVersions.json');
  const assetMeta = parseJsonEntry<Omit<Asset, 'blob'>>('data/assets.json');

  const reconstructedAssets: Asset[] = [];
  for (const meta of assetMeta) {
    const bin = unzipped[`assets/${meta.id}.bin`];
    if (bin) {
      reconstructedAssets.push({
        ...meta,
        blob: new Blob([bin as unknown as BlobPart], { type: meta.mime }),
      });
    }
  }

  await db.transaction(
    'rw',
    [
      db.companies,
      db.clients,
      db.items,
      db.documents,
      db.sequences,
      db.templates,
      db.templateVersions,
      db.assets,
    ],
    async () => {
      if (params.mode === 'replace') {
        if (companies.length > 0) await db.companies.clear();
        if (clients.length > 0) await db.clients.clear();
        if (items.length > 0) await db.items.clear();
        if (documents.length > 0) await db.documents.clear();
        if (sequences.length > 0) await db.sequences.clear();
        if (templates.length > 0) await db.templates.clear();
        if (templateVersions.length > 0) await db.templateVersions.clear();
      }

      if (companies.length > 0) await db.companies.bulkPut(companies);
      if (clients.length > 0) await db.clients.bulkPut(clients);
      if (items.length > 0) await db.items.bulkPut(items);
      if (templates.length > 0) await db.templates.bulkPut(templates);
      if (templateVersions.length > 0) await db.templateVersions.bulkPut(templateVersions);
      if (documents.length > 0) await db.documents.bulkPut(documents);
      if (reconstructedAssets.length > 0) await db.assets.bulkPut(reconstructedAssets);

      for (const seq of sequences) {
        const cur = await db.sequences.get(seq.id);
        if (!cur || seq.last_value > cur.last_value) {
          await db.sequences.put(seq);
        }
      }
    }
  );

  return manifest;
}
