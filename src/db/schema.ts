import Dexie, { type Table } from 'dexie';
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

export interface SettingRecord<T = unknown> {
  key: 'ui' | 'session' | 'vault' | 'backup' | 'onboarding';
  value: T;
  updated_at: number;
}

export interface UiSettingsValue {
  theme: 'dark' | 'light' | 'system';
  density: 'comfortable' | 'compact';
  reduce_motion: boolean;
}

export interface SessionSettingsValue {
  active_company_id?: string;
}

export interface BackupSettingsValue {
  last_backup_at?: number;
  reminder_days: number;
}

export interface VaultSettingsValue {
  enabled: boolean;
  salt: string;
  iterations: number;
  verifier_iv: string;
  verifier_ct: string;
  auto_lock_minutes: number;
  biometric_credential_id?: string;
}

export class IngenDatabase extends Dexie {
  companies!: Table<Company, string>;
  clients!: Table<Client, string>;
  items!: Table<Item, string>;
  templates!: Table<Template, string>;
  templateVersions!: Table<TemplateVersion, string>;
  documents!: Table<DocumentRecord, string>;
  sequences!: Table<Sequence, string>;
  assets!: Table<Asset, string>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super('ingen_local_db');
    this.version(1).stores({
      companies: 'id, archived, updated_at',
      clients: 'id, company_id, [company_id+updated_at], [company_id+use_count]',
      items: 'id, company_id, [company_id+updated_at], [company_id+use_count]',
      templates: 'id, company_id, doc_type, archived, updated_at',
      templateVersions: 'id, template_id, [template_id+version_no]',
      documents:
        'id, company_id, status, doc_type, [company_id+status], [company_id+issue_date], [company_id+doc_type+issue_date], template_version_id, client_id, number',
      sequences: 'id, company_id',
      assets: 'id, kind, hash, created_at',
      settings: 'key',
    });
    this.version(2).stores({
      items: 'id, company_id, barcode, [company_id+barcode], [company_id+updated_at], [company_id+use_count]',
    });
  }
}

export const db = new IngenDatabase();
