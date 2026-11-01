/**
 * Pure domain logic: Lot reference generation and validation.
 * Format: LOT-{shortCode}-{yyMMdd}-{seq}
 * Example: LOT-AB12-261101-0001
 */

export function generateLotRef(shortCode: string, date: Date, seq: number): string {
  const cleanCode = shortCode.toUpperCase().trim();
  const yy = String(date.getUTCFullYear()).slice(-2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const seqStr = String(seq).padStart(4, "0");
  return `LOT-${cleanCode}-${yy}${mm}${dd}-${seqStr}`;
}

export function validateLotRef(lotRef: string, expectedShortCode: string): { valid: boolean; reason?: string } {
  if (!lotRef || typeof lotRef !== "string") {
    return { valid: false, reason: "Missing or invalid lotRef" };
  }

  const parts = lotRef.trim().split("-");
  if (parts.length !== 4) {
    return { valid: false, reason: "lotRef must have 4 segments separated by hyphens (LOT-{shortCode}-{yyMMdd}-{seq})" };
  }

  const [prefix, code, dateStr, seq] = parts;
  if (prefix !== "LOT") {
    return { valid: false, reason: "lotRef prefix must be LOT" };
  }

  if (code.toUpperCase() !== expectedShortCode.toUpperCase().trim()) {
    return { valid: false, reason: `lotRef shortCode '${code}' does not match collector shortCode '${expectedShortCode}'` };
  }

  if (!/^\d{6}$/.test(dateStr)) {
    return { valid: false, reason: "lotRef date part must be exactly 6 digits (yyMMdd)" };
  }

  if (!/^\d{1,6}$/.test(seq)) {
    return { valid: false, reason: "lotRef seq part must be numeric" };
  }

  return { valid: true };
}

