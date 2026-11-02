import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { RecyclerForm } from "../RecyclerForm";

export default async function AdminEditRecyclerPage(props: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN"]);
  const { id } = await props.params;

  const r = await prisma.recycler.findUnique({
    where: { id },
    include: { staff: { include: { user: { select: { phone: true } } }, take: 1 } },
  });
  if (!r) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <Link href="/admin/recyclers" className="r-inline r-muted">
          <ArrowLeft size={16} aria-hidden="true" /> Recyclers
        </Link>
        <h1 className="r-page-title r-inline" style={{ marginTop: "0.25rem" }}>
          <Pencil size={20} aria-hidden="true" /> Edit {r.name}
        </h1>
      </div>

      <div className="card">
        <RecyclerForm
          recyclerId={r.id}
          initial={{
            name: r.name,
            contactPhone: r.contactPhone,
            authorizationNo: r.authorizationNo,
            validTill: r.authorizationValidTill ? r.authorizationValidTill.toISOString().split("T")[0] : "",
            serviceRadiusKm: String(r.serviceRadiusKm),
            address: r.address,
            area: r.area,
            district: r.district,
            latitude: String(r.latitude),
            longitude: String(r.longitude),
            staffPhone: r.staff[0]?.user.phone ?? "",
          }}
        />
      </div>
    </div>
  );
}
