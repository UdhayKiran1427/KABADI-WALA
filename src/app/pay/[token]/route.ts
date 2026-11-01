import { type NextRequest, NextResponse } from "next/server";
import { completeDemoPayment } from "@/lib/services/lotFlowService";

/**
 * Target of the DEMO payment QR. Records the demo payment, then shows the invoice.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await completeDemoPayment(token);

  if (result === "NOT_FOUND") {
    return new NextResponse("Payment link not found or expired", { status: 404 });
  }

  return NextResponse.redirect(new URL(`/invoice/${token}`, req.url), 303);
}
