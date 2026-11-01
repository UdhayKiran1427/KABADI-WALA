import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageTitle, PageVoice } from "../ui";
import { DropPointsClient } from "./DropPointsClient";

export default async function DropPointsPage() {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);

  const collector = await prisma.collector.findFirst({
    where: { userId: user.userId },
  });

  let defaultLat = 19.0434;
  let defaultLng = 72.8567;

  if (collector?.operatingArea) {
    const centroid = await prisma.areaCentroid.findFirst({
      where: { area: { equals: collector.operatingArea.trim(), mode: "insensitive" } },
    });
    if (centroid) {
      defaultLat = centroid.latitude;
      defaultLng = centroid.longitude;
    }
  }

  const points = await prisma.collectionPoint.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="c-page">
      <PageVoice
        en={`Drop points. ${points.length} places near you where you can drop small items like batteries, cables and phones.`}
        hi={`ड्रॉप पॉइंट। आपके पास ${points.length} जगह हैं जहाँ बैटरी, तार और फोन जैसा छोटा सामान जमा कर सकते हैं।`}
        mr={`ड्रॉप पॉइंट. तुमच्या जवळ ${points.length} ठिकाणे आहेत जिथे बॅटरी, वायर आणि फोन सारख्या लहान वस्तू जमा करू शकता.`}
      />
      <PageTitle title={{ hi: "ड्रॉप पॉइंट", en: "Drop points", mr: "ड्रॉप पॉइंट" }} back="/collector" />

      <DropPointsClient
        points={points.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          latitude: p.latitude,
          longitude: p.longitude,
          address: p.address,
          operatingHours: p.operatingHours,
          operatingDates: p.operatingDates,
          contactPhone: p.contactPhone,
        }))}
        defaultLat={defaultLat}
        defaultLng={defaultLng}
        defaultAreaName={collector?.operatingArea || "Mumbai Central"}
      />
    </div>
  );
}
