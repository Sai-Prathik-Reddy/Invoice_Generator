import Big from 'big.js';
import QRCode from 'qrcode';

export interface UpiPaymentParams {
  vpa: string;
  payeeName: string;
  amount?: string;
  transactionNote?: string;
  transactionRef?: string;
}

export function isValidUpiVpa(vpa: string): boolean {
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(vpa.trim());
}

export function buildUpiUri(params: UpiPaymentParams): string {
  const vpa = params.vpa.trim();
  const pn = encodeURIComponent(params.payeeName.trim() || 'Merchant');
  const queryParts = [`pa=${encodeURIComponent(vpa)}`, `pn=${pn}`, 'cu=INR'];

  if (params.amount) {
    try {
      const amt = new Big(params.amount);
      if (amt.gt(0)) {
        queryParts.push(`am=${amt.toFixed(2)}`);
      }
    } catch {
      // ignore invalid amount
    }
  }

  if (params.transactionNote) {
    const note = params.transactionNote.slice(0, 50);
    queryParts.push(`tn=${encodeURIComponent(note)}`);
  }

  if (params.transactionRef) {
    queryParts.push(`tr=${encodeURIComponent(params.transactionRef.slice(0, 35))}`);
  }

  return `upi://pay?${queryParts.join('&')}`;
}

export interface VectorQrData {
  viewBoxSize: number;
  pathD: string;
  uri: string;
}

export function generateUpiQrVector(params: UpiPaymentParams, quietZone = 2): VectorQrData {
  const uri = buildUpiUri(params);
  const qr = QRCode.create(uri, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const viewBoxSize = size + quietZone * 2;

  const commands: string[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (data[r * size + c]) {
        const x = c + quietZone;
        const y = r + quietZone;
        commands.push(`M${x} ${y}h1v1h-1z`);
      }
    }
  }

  return {
    viewBoxSize,
    pathD: commands.join(''),
    uri,
  };
}
