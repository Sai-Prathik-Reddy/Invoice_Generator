export interface IndianStateInfo {
  code: string;
  name: string;
}

export const INDIAN_STATES: IndianStateInfo[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export function getStateByCode(code: string): IndianStateInfo | undefined {
  return INDIAN_STATES.find((s) => s.code === code.padStart(2, '0'));
}

const BASE36_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export interface GstinParseResult {
  valid: boolean;
  error?: string;
  stateCode?: string;
  stateName?: string;
  pan?: string;
}

export function validateAndParseGstin(raw: string): GstinParseResult {
  const gstin = raw.trim().toUpperCase();
  if (!gstin) {
    return { valid: true };
  }
  if (gstin.length !== 15) {
    return { valid: false, error: 'GSTIN must be 15 characters long' };
  }
  const regex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!regex.test(gstin)) {
    return { valid: false, error: 'Invalid GSTIN format' };
  }

  const stateCode = gstin.slice(0, 2);
  const stateInfo = getStateByCode(stateCode);
  if (!stateInfo) {
    return { valid: false, error: `Unknown GST state code ${stateCode}` };
  }

  // Mod-36 checksum calculation on first 14 chars
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const codePoint = BASE36_CHARS.indexOf(gstin[i]!);
    const factor = i % 2 === 0 ? 1 : 2;
    const product = codePoint * factor;
    const quotient = Math.floor(product / 36);
    const remainder = product % 36;
    sum += quotient + remainder;
  }
  const checkIndex = (36 - (sum % 36)) % 36;
  const expectedCheckChar = BASE36_CHARS[checkIndex];

  if (gstin[14] !== expectedCheckChar) {
    return {
      valid: false,
      error: `Checksum mismatch (expected ${expectedCheckChar} at position 15)`,
      stateCode,
      stateName: stateInfo.name,
      pan: gstin.slice(2, 12),
    };
  }

  return {
    valid: true,
    stateCode,
    stateName: stateInfo.name,
    pan: gstin.slice(2, 12),
  };
}
