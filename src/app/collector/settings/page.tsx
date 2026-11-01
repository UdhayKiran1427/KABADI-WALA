import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { collectorLogoutAction } from "../actions";
import { CollectorSettingsClient } from "./CollectorSettingsClient";

export default async function CollectorSettingsPage() {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);

  const collector = await prisma.collector.findFirst({
    where: { userId: user.userId },
    select: {
      id: true,
      name: true,
      shortCode: true,
      operatingArea: true,
      preferredLanguage: true,
    },
  });

  return (
    <CollectorSettingsClient
      phone={user.phone}
      shortCode={collector?.shortCode || "KW01"}
      name={collector?.name || "Collector"}
      operatingArea={collector?.operatingArea || "Mumbai"}
      logoutAction={collectorLogoutAction}
    />
  );
}

