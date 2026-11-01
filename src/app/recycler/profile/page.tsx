import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Save } from "lucide-react";
import { updateProfileAction } from "../actions";

export default async function RecyclerProfilePage() {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const recyclerId = dbUser.recyclerId;

  if (!recyclerId) {
    return <div className="card">No facility linked to your account.</div>;
  }

  const facility = await prisma.recycler.findUnique({
    where: { id: recyclerId },
  });

  if (!facility) {
    return <div className="card">Facility not found.</div>;
  }

  const validTillStr = facility.authorizationValidTill
    ? facility.authorizationValidTill.toISOString().split("T")[0]
    : "";

  const status = facility.authorizationStatus;

  return (
    <div className="r-stack" style={{ maxWidth: "640px", margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 className="r-page-title">Profile</h1>
        <span className={`badge ${status === "VERIFIED" ? "badge-success" : status === "PENDING" ? "badge-warning" : "badge-danger"}`}>
          {status === "VERIFIED" ? "Approved" : status === "PENDING" ? "Waiting for approval" : status}
        </span>
      </div>

      <form action={updateProfileAction} className="card" style={{ padding: "1.25rem" }}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">Business name</label>
          <input id="name" name="name" type="text" defaultValue={facility.name} className="form-control" required />
        </div>

        <div className="r-grid-2" style={{ gap: "0 1rem" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="contactPhone">Phone</label>
            <input id="contactPhone" name="contactPhone" type="tel" defaultValue={facility.contactPhone} className="form-control" required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="serviceRadiusKm">Service radius (km)</label>
            <input
              id="serviceRadiusKm"
              name="serviceRadiusKm"
              type="number"
              step="1"
              defaultValue={facility.serviceRadiusKm}
              className="form-control"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="address">Address</label>
          <textarea id="address" name="address" rows={2} defaultValue={facility.address} className="form-control" required />
        </div>

        <div className="r-grid-2" style={{ gap: "0 1rem" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="authorizationNo">Authorization no.</label>
            <input
              id="authorizationNo"
              name="authorizationNo"
              type="text"
              defaultValue={facility.authorizationNo}
              className="form-control"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="validTill">Valid till</label>
            <input id="validTill" name="validTill" type="date" defaultValue={validTillStr} className="form-control" required />
          </div>
        </div>
        <p className="r-muted" style={{ marginBottom: "1rem" }}>
          Changing the authorization sends your account for admin approval again.
        </p>

        <button type="submit" className="btn btn-primary btn-block btn-lg">
          <Save size={18} aria-hidden="true" /> Save
        </button>
      </form>
    </div>
  );
}
