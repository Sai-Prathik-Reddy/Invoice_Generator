import { create } from 'zustand';
import { getActiveCompany, getUiSettings, getVaultSettings, setActiveCompanyId, setSetting } from '../db/repos';
import type { Company } from '../core/schema/types';

export interface BrandColorConfig {
  primary?: string; // hex color for main brand / buttons / active states
  gold?: string;    // hex color for accent / highlight / badges
}

interface AppSessionState {
  initialized: boolean;
  theme: 'dark' | 'light';
  activeCompany: Company | null;
  vaultEnabled: boolean;
  vaultUnlocked: boolean;
  sidebarCollapsed: boolean;
  brandColors: BrandColorConfig | null;
  setTheme: (theme: 'dark' | 'light') => Promise<void>;
  toggleTheme: () => Promise<void>;
  setBrandColors: (colors: BrandColorConfig | null) => Promise<void>;
  refreshCompany: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  setVaultStatus: (enabled: boolean, unlocked: boolean) => void;
  toggleSidebar: () => void;
  initSession: () => Promise<void>;
}

export function applyDomCustomColors(colors?: BrandColorConfig | null) {
  const root = document.documentElement;
  if (!colors || (!colors.primary && !colors.gold)) {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--ring');
    root.style.removeProperty('--gold');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--gold-surface');
    return;
  }
  if (colors.primary) {
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--ring', colors.primary);
  } else {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--ring');
  }
  if (colors.gold) {
    root.style.setProperty('--gold', colors.gold);
    root.style.setProperty('--accent', colors.gold);
    root.style.setProperty('--gold-surface', `${colors.gold}24`);
  } else {
    root.style.removeProperty('--gold');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--gold-surface');
  }
}

function applyDomTheme(theme: 'dark' | 'light') {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#0B0B14' : '#F8F7FC');
  }
}

export const useAppStore = create<AppSessionState>((set, get) => ({
  initialized: false,
  theme: 'dark',
  activeCompany: null,
  vaultEnabled: false,
  vaultUnlocked: true,
  sidebarCollapsed: false,
  brandColors: null,

  setTheme: async (theme) => {
    applyDomTheme(theme);
    set({ theme });
    await setSetting('ui', { theme, density: 'comfortable', reduce_motion: false });
  },

  toggleTheme: async () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    await get().setTheme(next);
  },

  setBrandColors: async (colors) => {
    applyDomCustomColors(colors);
    set({ brandColors: colors });
    try {
      if (colors && (colors.primary || colors.gold)) {
        localStorage.setItem('ingen_custom_colors', JSON.stringify(colors));
      } else {
        localStorage.removeItem('ingen_custom_colors');
      }
    } catch {
      // ignore
    }
  },

  refreshCompany: async () => {
    const company = await getActiveCompany();
    set({ activeCompany: company });
  },

  switchCompany: async (companyId) => {
    await setActiveCompanyId(companyId);
    const company = await getActiveCompany();
    set({ activeCompany: company });
  },

  setVaultStatus: (enabled, unlocked) => {
    set({ vaultEnabled: enabled, vaultUnlocked: unlocked });
  },

  toggleSidebar: () => {
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }));
  },

  initSession: async () => {
    const [ui, vault, company] = await Promise.all([
      getUiSettings(),
      getVaultSettings(),
      getActiveCompany(),
    ]);
    const resolvedTheme: 'dark' | 'light' =
      ui.theme === 'light' ? 'light' : 'dark';
    applyDomTheme(resolvedTheme);

    let savedColors: BrandColorConfig | null = null;
    try {
      const raw = localStorage.getItem('ingen_custom_colors');
      if (raw) savedColors = JSON.parse(raw);
    } catch {
      // ignore
    }
    if (savedColors) {
      applyDomCustomColors(savedColors);
    }

    const isVaultEnabled = Boolean(vault?.enabled);
    set({
      initialized: true,
      theme: resolvedTheme,
      brandColors: savedColors,
      activeCompany: company,
      vaultEnabled: isVaultEnabled,
      vaultUnlocked: !isVaultEnabled,
    });
  },
}));
