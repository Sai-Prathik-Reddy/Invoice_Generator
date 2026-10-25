import React from 'react';
import { createRoot } from 'react-dom/client';
import './design-system/tokens.css';
import { App } from './App';
import { ensureStarterTemplates } from './db/repos';

async function bootstrap() {
  try {
    await ensureStarterTemplates();
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
  } catch (err) {
    console.error('INGEN bootstrap warning:', err);
  }

  const rootEl = document.getElementById('root');
  if (rootEl) {
    createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

bootstrap();
