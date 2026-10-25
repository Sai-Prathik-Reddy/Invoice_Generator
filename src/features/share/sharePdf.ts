import { compilePdfToBlob, type PdfRenderInput } from '../../pdf/renderer';

export function sanitizePdfFilename(parts: {
  number?: string;
  clientName?: string;
  issueDate?: string;
}): string {
  const num = (parts.number || 'DRAFT').replace(/[^a-zA-Z0-9\-_]/g, '-');
  const client = (parts.clientName || 'Customer')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_]/g, '')
    .slice(0, 32);
  const date = parts.issueDate || new Date().toISOString().slice(0, 10);
  return `${num}_${client || 'Customer'}_${date}.pdf`;
}

export function canNativeSharePdf(file: File): boolean {
  try {
    return typeof navigator !== 'undefined' && Boolean(navigator.canShare?.({ files: [file] }));
  } catch {
    return false;
  }
}

/**
 * Must be called synchronously inside a user click handler with an already-compiled Blob/File
 * so transient user activation is preserved on iOS Safari & Android Chrome.
 */
export async function shareReadyPdfFile(params: {
  blob: Blob;
  filename: string;
  title: string;
  text: string;
}): Promise<'shared' | 'downloaded'> {
  const file = new File([params.blob], params.filename, { type: 'application/pdf' });
  if (canNativeSharePdf(file)) {
    await navigator.share({
      files: [file],
      title: params.title,
      text: params.text,
    });
    return 'shared';
  }
  downloadBlob(params.blob, params.filename);
  return 'downloaded';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function printPdfBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => {
      win.print();
    });
  }
}

export { compilePdfToBlob, type PdfRenderInput };
