import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
} from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppShell } from './design-system/AppShell';
import { DesignSystemShowcasePage } from './design-system/DesignSystemShowcasePage';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import {
  DashboardPage,
  DocumentsListPage,
  DocumentDetailPage,
} from './features/dashboard/DashboardAndDocuments';
import { DocumentGeneratorPage } from './features/generator/DocumentGeneratorPage';
import {
  TemplatesGalleryPage,
  CreateTemplateWizardPage,
  TemplateBuilderPage,
} from './features/builder/TemplatesAndBuilder';
import {
  CatalogPage,
  BackupAndVaultPage,
  SettingsPage,
  VaultLockScreen,
} from './features/catalog/CatalogBackupAndSettings';
import { InventoryPage } from './features/catalog/InventoryPage';
import { ClientsPage } from './features/catalog/ClientsPage';
import { useAppStore } from './app/useAppStore';

function DocumentDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <DocumentDetailPage docId={id || ''} />;
}

function DocumentEditRoute() {
  const { id } = useParams<{ id: string }>();
  return <DocumentGeneratorPage editDocId={id} />;
}

function TemplateBuilderRoute() {
  const { id } = useParams<{ id: string }>();
  return <TemplateBuilderPage templateId={id || ''} />;
}

export function App() {
  const { initialized, initSession, vaultEnabled, vaultUnlocked, theme } = useAppStore();

  useEffect(() => {
    if (!initialized) {
      initSession();
    }
  }, [initialized, initSession]);

  if (!initialized) {
    return null;
  }

  if (vaultEnabled && !vaultUnlocked) {
    return (
      <>
        <VaultLockScreen />
        <Toaster richColors position="top-right" theme={theme} />
      </>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/documents" element={<DocumentsListPage />} />
          <Route path="/documents/new" element={<DocumentGeneratorPage />} />
          <Route path="/documents/:id" element={<DocumentDetailRoute />} />
          <Route path="/documents/:id/edit" element={<DocumentEditRoute />} />
          <Route path="/templates" element={<TemplatesGalleryPage />} />
          <Route path="/templates/new" element={<CreateTemplateWizardPage />} />
          <Route path="/templates/:id/builder" element={<TemplateBuilderRoute />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/catalog" element={<InventoryPage />} />
          <Route path="/backup" element={<BackupAndVaultPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/dev/design" element={<DesignSystemShowcasePage />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-right" theme={theme} />
    </BrowserRouter>
  );
}
