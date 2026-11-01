import { prisma } from "../prisma";

/**
 * Generates an alphanumeric 4-character shortCode for a collector (e.g. "AB12").
 * Used directly in offline lotRef: LOT-{shortCode}-{yyMMdd}-{seq}
 */
export async function generateUniqueShortCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // unambiguous characters
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    const existing = await prisma.collector.findUnique({
      where: { shortCode: code },
    });
    if (!existing) {
      return code;
    }
  }

  // Fallback to timestamp based
  return `C${Date.now().toString().slice(-3)}`;
}

