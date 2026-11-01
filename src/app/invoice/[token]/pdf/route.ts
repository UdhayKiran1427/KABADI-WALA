import { NextResponse } from "next/server";
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { getInvoice, Invoice } from "@/lib/services/invoiceService";

const GREEN = rgb(0.02, 0.47, 0.34);
const DARK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.39, 0.45, 0.55);
const LINE = rgb(0.89, 0.91, 0.94);

// Standard PDF fonts only cover Latin text, so "₹" becomes "Rs." and other scripts are dropped.
const latin = (text: string) => text.replace(/₹/g, "Rs. ").replace(/[^\x20-\x7E\xA0-\xFF]/g, "").replace(/\s+/g, " ").trim();
const rs = (paise: number) => `Rs. ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const kg = (grams: number) => `${(grams / 1000).toFixed(1)} kg`;
const when = (date: Date) => date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

function text(page: PDFPage, value: string, x: number, y: number, font: PDFFont, size: number, color = DARK, align: "left" | "right" = "left") {
  const clean = latin(value);
  const width = font.widthOfTextAtSize(clean, size);
  page.drawText(clean, { x: align === "right" ? x - width : x, y, size, font, color });
}

/** Wraps text to fit a width; returns the lines. */
function wrap(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = latin(value).split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function renderInvoicePdf(invoice: Invoice): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${invoice.lotRef}`);
  pdf.setAuthor("Kabadi Wala");
  const page = pdf.addPage([595.28, 841.89]); // A4
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const left = 48;
  const right = 547;

  // Header
  page.drawRectangle({ x: 0, y: 762, width: 595.28, height: 80, color: GREEN });
  text(page, "Kabadi Wala", left, 806, bold, 20, rgb(1, 1, 1));
  text(page, "E-waste purchase invoice", left, 786, regular, 10, rgb(0.85, 0.96, 0.91));
  text(page, invoice.isPaid ? "PAID" : "PAYMENT PENDING", right, 806, bold, 14, rgb(1, 1, 1), "right");
  text(page, `Invoice ${invoice.lotRef}`, right, 786, regular, 10, rgb(0.85, 0.96, 0.91), "right");

  // Date and payment
  let y = 732;
  text(page, `Date: ${when(invoice.issuedAt)}`, left, y, regular, 10, MUTED);
  if (invoice.payment) {
    text(page, `${invoice.payment.method} · Ref ${invoice.payment.reference ?? "-"}`, right, y, regular, 10, MUTED, "right");
  }

  // Seller and buyer
  y -= 34;
  const colWidth = (right - left - 24) / 2;
  const party = (title: string, lines: string[], x: number) => {
    let py = y;
    text(page, title.toUpperCase(), x, py, bold, 9, MUTED);
    py -= 16;
    lines.forEach((line, i) => {
      for (const part of wrap(line, i === 0 ? bold : regular, i === 0 ? 12 : 10, colWidth)) {
        text(page, part, x, py, i === 0 ? bold : regular, i === 0 ? 12 : 10);
        py -= i === 0 ? 16 : 14;
      }
    });
    return py;
  };
  const sellerEnd = party(
    "Seller (collector)",
    [invoice.seller.name, `Phone ${invoice.seller.phone}`, invoice.seller.area, `Collector code ${invoice.seller.code}`],
    left
  );
  const buyerEnd = party(
    "Buyer (recycler)",
    [invoice.buyer.name, invoice.buyer.address, `Phone ${invoice.buyer.phone}`, `Authorization ${invoice.buyer.authorizationNo}`],
    left + colWidth + 24
  );
  y = Math.min(sellerEnd, buyerEnd) - 18;

  // Items table
  const cols = { material: left + 10, weight: 330, rate: 435, amount: right - 10 };
  page.drawRectangle({ x: left, y: y - 6, width: right - left, height: 22, color: rgb(0.95, 0.97, 0.96) });
  text(page, "Material", cols.material, y, bold, 10, MUTED);
  text(page, "Weight", cols.weight, y, bold, 10, MUTED, "right");
  text(page, "Rate / kg", cols.rate, y, bold, 10, MUTED, "right");
  text(page, "Amount", cols.amount, y, bold, 10, MUTED, "right");
  y -= 26;

  for (const line of invoice.lines) {
    const nameLines = wrap(line.nameEn, regular, 11, cols.weight - cols.material - 70);
    nameLines.forEach((part, i) => text(page, part, cols.material, y - i * 14, regular, 11));
    text(page, kg(line.weightGrams), cols.weight, y, regular, 11, DARK, "right");
    text(page, rs(line.ratePerKgPaise), cols.rate, y, regular, 11, DARK, "right");
    text(page, rs(line.amountPaise), cols.amount, y, regular, 11, DARK, "right");
    const dividerY = y - 14 * (nameLines.length - 1) - 9;
    page.drawLine({ start: { x: left, y: dividerY }, end: { x: right, y: dividerY }, thickness: 0.5, color: LINE });
    y = dividerY - 17;
  }

  // Total
  y -= 6;
  text(page, `Total weight ${kg(invoice.totalWeightGrams)}`, cols.material, y, regular, 10, MUTED);
  text(page, "Total", cols.rate, y, bold, 13, DARK, "right");
  text(page, rs(invoice.amountPaise), cols.amount, y, bold, 13, GREEN, "right");

  // Footer
  text(page, "Demo payment - no real money was transferred.", left, 60, regular, 9, MUTED);
  text(page, "Generated by Kabadi Wala", right, 60, regular, 9, MUTED, "right");

  return pdf.save();
}

/**
 * Downloads the invoice as a PDF (same data as /invoice/{token}).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = await getInvoice(token);
  if (!invoice) {
    return new NextResponse("Invoice not found", { status: 404 });
  }

  const bytes = await renderInvoicePdf(invoice);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.lotRef}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
