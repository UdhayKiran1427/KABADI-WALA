import { NextRequest } from "next/server";
import { prisma } from "../prisma";
import { apiError } from "../apiResponse";
import { AuthenticatedUser, requireApiUser } from "./getAuthUser";

/**
 * Authenticates a collector (or admin) and loads a lot they own.
 * Returns the user and lot, or the error response to send back.
 */
export async function requireOwnedLot(req: NextRequest, lotId: string) {
  const { user, response } = await requireApiUser(req, ["COLLECTOR", "ADMIN"]);
  if (response) return { response };

  const lot = await prisma.lot.findUnique({ where: { id: lotId } });
  if (!lot || (user.role !== "ADMIN" && lot.collectorId !== user.collectorId)) {
    return { response: apiError("NOT_FOUND", "Lot not found", 404) };
  }
  return { user, lot };
}

/**
 * True when the user may see a lot's deal: its collector, the selected recycler, or an admin.
 */
export function canSeeDeal(user: AuthenticatedUser, lot: { collectorId: string; chosenRecyclerId: string | null }) {
  return (
    user.role === "ADMIN" ||
    (user.collectorId !== undefined && user.collectorId === lot.collectorId) ||
    (user.recyclerId !== undefined && user.recyclerId === lot.chosenRecyclerId)
  );
}
