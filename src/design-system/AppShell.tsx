import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Home,
  FileText,
  LayoutTemplate,
  Users,
  ShieldCheck,
  Settings,
  Plus,
  Sun,
  Moon,
  Lock,
  Building2,
  Palette,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { db } from '../db/schema';
import { useAppStore } from '../app/useAppStore';
import { AuroraBackground, Button, IngenLogo } from './components';
import { cn } from '../lib/utils';
import { usePwaInstall } from '../pwa/usePwaInstall';
import { PwaInstallPromptModal } from '../pwa/PwaInstallPromptModal';

const DESKTOP_NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/catalog', label: 'Clients & Items', icon: Users },
  { to: '/backup', label: 'Backup & Vault', icon: ShieldCheck },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/dev/design', label: 'Design System', icon: Palette },
];

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    theme,
    toggleTheme,
    activeCompany,
    switchCompany,
    vaultEnabled,
    setVaultStatus,
    sidebarCollapsed,
    toggleSidebar,
  } = useAppStore();

  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const {
    device,
    isStandalone,
    canInstallDirectly,
    triggerInstall,
    isPromptOpen,
    openPrompt,
    closePrompt,
  } = usePwaInstall();

  const companies = useLiveQuery(() => db.companies.filter((c) => !c.archived).toArray(), []) ?? [];
  const templates = useLiveQuery(() => db.templates.filter((t) => !t.archived).toArray(), []) ?? [];

  const isBuilderRoute = location.pathname.includes('/builder');

  return (
    <div className="min-h-dvh flex flex-col md:flex-row bg-background text-foreground">
      <AuroraBackground />

      {/* Desktop Left Glass Sidebar */}
      {!isBuilderRoute ? (
        <aside
          className={cn(
            'hidden md:flex md:flex-col md:shrink-0 glass-chrome border-r border-border sticky top-0 h-dvh transition-all duration-200 z-30',
            sidebarCollapsed ? 'w-[74px]' : 'w-[252px]'
          )}
        >
          <div className="flex items-center justify-between px-4 h-16 border-b border-border">
            <IngenLogo size={32} showWordmark={!sidebarCollapsed} />
            <button
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Company Switcher + New Invoice CTA */}
          <div className="p-3 space-y-2.5 border-b border-border">
            {!sidebarCollapsed && companies.length > 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-2.5 py-1.5">
                <Building2 className="w-4 h-4 text-gold shrink-0" />
                <select
                  aria-label="Active Company"
                  value={activeCompany?.id ?? ''}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      navigate('/settings?newCompany=1');
                    } else {
                      switchCompany(e.target.value);
                    }
                  }}
                  className="w-full bg-transparent text-xs font-semibold text-foreground focus:outline-none truncate cursor-pointer"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id} className="bg-popover text-popover-foreground">
                      {c.name}
                    </option>
                  ))}
                  <option value="__new__" className="bg-popover text-gold">
                    + Add Another Business…
                  </option>
                </select>
              </div>
            ) : null}

            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => navigate('/documents/new')}
            >
              <Plus className="w-4 h-4" />
              {!sidebarCollapsed ? <span>New Document</span> : null}
            </Button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
            {DESKTOP_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary/15 text-primary border border-primary/30 shadow-xs'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent',
                      sidebarCollapsed && 'justify-center px-2'
                    )
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed ? <span>{item.label}</span> : null}
                </NavLink>
              );
            })}
          </nav>

          {/* Desktop PWA App Install Banner / Button */}
          {!isStandalone ? (
            <div className="px-3 pb-2">
              <button
                type="button"
                onClick={openPrompt}
                title="Install INGEN as a Standalone App"
                className={cn(
                  'flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/20 w-full transition-all cursor-pointer shadow-xs',
                  sidebarCollapsed && 'justify-center px-2'
                )}
              >
                <Download className="w-4 h-4 shrink-0 text-gold" />
                {!sidebarCollapsed ? <span>Install Desktop App</span> : null}
              </button>
            </div>
          ) : null}

          {/* Bottom Controls: Theme Toggle & Vault Lock */}
          <div className="p-3 border-t border-border flex items-center justify-between gap-2">
            <button
              onClick={toggleTheme}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
              title="Switch Obsidian / Pearl Theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-gold" />
                  {!sidebarCollapsed ? <span>Pearl Light</span> : null}
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-primary" />
                  {!sidebarCollapsed ? <span>Obsidian Dark</span> : null}
                </>
              )}
            </button>

            {vaultEnabled ? (
              <button
                onClick={() => setVaultStatus(true, false)}
                title="Lock Vault Now"
                className="p-2 rounded-xl border border-gold/30 bg-gold-surface text-gold hover:opacity-90 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </aside>
      ) : null}

      {/* Mobile Top Glass Bar */}
      {!isBuilderRoute ? (
        <header className="flex md:hidden items-center justify-between px-3 h-14 glass-chrome border-b border-border sticky top-0 z-30">
          <div className="shrink-0 flex items-center">
            <IngenLogo size={26} showWordmark={false} className="sm:hidden" />
            <IngenLogo size={28} showWordmark className="hidden sm:inline-flex" />
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            {!isStandalone ? (
              <button
                type="button"
                onClick={openPrompt}
                aria-label="Install App"
                title="Install INGEN App on this device"
                className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold hover:bg-gold/25 cursor-pointer shadow-xs shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-gold shrink-0" />
                <span className="hidden xs:inline">Install</span>
              </button>
            ) : null}
            {activeCompany ? (
              <button
                onClick={() => navigate('/settings')}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium max-w-[85px] xs:max-w-[110px] sm:max-w-[140px] truncate shrink-0"
              >
                <Building2 className="w-3 h-3 text-gold shrink-0" />
                <span className="truncate">{activeCompany.name}</span>
              </button>
            ) : null}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-1.5 rounded-lg border border-border bg-muted/50 text-foreground shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-gold" /> : <Moon className="w-3.5 h-3.5 text-primary" />}
            </button>
            {vaultEnabled ? (
              <button
                onClick={() => setVaultStatus(true, false)}
                aria-label="Lock Vault"
                className="p-1.5 rounded-lg border border-gold/30 bg-gold-surface text-gold shrink-0"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </header>
      ) : null}

      {/* Main Content Viewport */}
      <main
        className={cn(
          'flex-1 min-w-0',
          isBuilderRoute ? 'p-0' : 'px-4 pt-4 pb-28 md:px-8 md:py-6 max-w-7xl w-full mx-auto'
        )}
      >
        <Outlet />
      </main>

      {/* Mobile Floating Glass Bottom Navigation */}
      {!isBuilderRoute ? (
        <nav
          aria-label="Mobile Bottom Navigation"
          className="fixed bottom-3 inset-x-3 md:hidden glass-chrome border border-border rounded-2xl shadow-xl px-2 py-1.5 z-40 flex items-center justify-around"
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/documents"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <FileText className="w-5 h-5" />
            <span>Documents</span>
          </NavLink>

          {/* Center Raised Gold-Ringed Create Button */}
          <button
            onClick={() => setCreateSheetOpen(true)}
            aria-label="Create Document"
            className="-mt-6 flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-br from-[#7C5CFF] to-[#5B3FD9] text-white shadow-lg ring-2 ring-gold transition-transform active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>

          <NavLink
            to="/templates"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <LayoutTemplate className="w-5 h-5" />
            <span>Templates</span>
          </NavLink>

          <button
            onClick={() => setMoreSheetOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-medium text-muted-foreground"
          >
            <Menu className="w-5 h-5" />
            <span>More</span>
          </button>
        </nav>
      ) : null}

      {/* Mobile Quick Create Sheet */}
      {createSheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-md rounded-2xl glass-chrome border border-border p-4 space-y-3 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Create Document</h3>
              <button onClick={() => setCreateSheetOpen(false)} className="p-1 text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid gap-2">
              {templates.slice(0, 5).map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    setCreateSheetOpen(false);
                    navigate(`/documents/new?templateId=${tpl.id}`);
                  }}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-left hover:border-primary/40"
                >
                  <div className="min-w-0 mr-2">
                    <div className="text-sm font-semibold truncate">{tpl.name}</div>
                    <div className="text-xs text-muted-foreground uppercase">{tpl.doc_type.replace('_', ' ')}</div>
                  </div>
                  <Plus className="w-4 h-4 text-gold" />
                </button>
              ))}
              <button
                onClick={() => {
                  setCreateSheetOpen(false);
                  navigate('/templates/new');
                }}
                className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2.5 text-left hover:bg-primary/20"
              >
                <div>
                  <div className="text-sm font-semibold text-primary">Design Template from Scratch</div>
                  <div className="text-xs text-muted-foreground">Choose page size & slice Blue/Emerald zones</div>
                </div>
                <LayoutTemplate className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Mobile "More" Drawer Sheet */}
      {moreSheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-md rounded-2xl glass-chrome border border-border p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-base font-bold">More Modules</span>
              <button onClick={() => setMoreSheetOpen(false)} className="p-1 text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            {[
              { to: '/catalog', label: 'Clients & Items Directory', icon: Users },
              { to: '/backup', label: 'Encrypted Backup & Secure Vault', icon: ShieldCheck },
              { to: '/settings', label: 'Business Profile & Settings', icon: Settings },
              { to: '/dev/design', label: 'Design System Showcase', icon: Palette },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.to}
                  onClick={() => {
                    setMoreSheetOpen(false);
                    navigate(m.to);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-sm font-medium"
                >
                  <Icon className="w-4 h-4 text-primary" />
                  <span>{m.label}</span>
                </button>
              );
            })}

            {!isStandalone ? (
              <button
                type="button"
                onClick={() => {
                  setMoreSheetOpen(false);
                  openPrompt();
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 px-3.5 py-3 text-sm font-semibold text-gold cursor-pointer"
              >
                <Download className="w-4 h-4 text-gold" />
                <span>Install App on this Device (PWA)</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* PWA Installation & Device Guide Modal */}
      <PwaInstallPromptModal
        isOpen={isPromptOpen}
        onClose={closePrompt}
        device={device}
        canInstallDirectly={canInstallDirectly}
        onDirectInstall={triggerInstall}
      />
    </div>
  );
}
