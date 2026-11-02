import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Save } from "lucide-react";
import { updateProfileAction } from "../actions";
import { CoordinateInputs } from "../../admin/recyclers/CoordinateInputs";
import { T } from "@/app/collector/ui";

export default async function RecyclerProfilePage() {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const recyclerId = dbUser.recyclerId;

  if (!recyclerId) {
    return (
      <div className="card">
        <T hi="आपके खाते से कोई फ़ैसिलिटी नहीं जुड़ी।" en="No facility linked to your account." mr="तुमच्या खात्याशी फॅसिलिटी जोडलेली नाही." />
      </div>
    );
  }

  const facility = await prisma.recycler.findUnique({
    where: { id: recyclerId },
  });

  if (!facility) {
    return (
      <div className="card">
        <T hi="फ़ैसिलिटी नहीं मिली।" en="Facility not found." mr="फॅसिलिटी सापडली नाही." />
      </div>
    );
  }

  const validTillStr = facility.authorizationValidTill
    ? facility.authorizationValidTill.toISOString().split("T")[0]
    : "";

  const status = facility.authorizationStatus;

  return (
    <div className="r-stack" style={{ maxWidth: "640px", margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 className="r-page-title">
          <T hi="प्रोफ़ाइल" en="Profile" mr="प्रोफाइल" />
        </h1>
        <span className={`badge ${status === "VERIFIED" ? "badge-success" : status === "PENDING" ? "badge-warning" : "badge-danger"}`}>
          {status === "VERIFIED" ? (
            <T hi="मंज़ूर" en="Approved" mr="मंजूर" />
          ) : status === "PENDING" ? (
            <T hi="मंज़ूरी का इंतज़ार" en="Waiting for approval" mr="मंजुरीची वाट" />
          ) : (
            status
          )}
        </span>
      </div>

      <form action={updateProfileAction} className="card" style={{ padding: "1.25rem" }}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">
            <T hi="व्यापार का नाम" en="Business name" mr="व्यवसायाचे नाव" />
          </label>
          <input id="name" name="name" type="text" defaultValue={facility.name} className="form-control" required />
        </div>

        <div className="r-grid-2" style={{ gap: "0 1rem" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="contactPhone">
              <T hi="फ़ोन" en="Phone" mr="फोन" />
            </label>
            <input id="contactPhone" name="contactPhone" type="tel" defaultValue={facility.contactPhone} className="form-control" required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="serviceRadiusKm">
              <T hi="सेवा दायरा (km)" en="Service radius (km)" mr="सेवा परिघ (km)" />
            </label>
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
          <label className="form-label" htmlFor="address">
            <T hi="पता" en="Address" mr="पत्ता" />
          </label>
          <textarea id="address" name="address" rows={2} defaultValue={facility.address} className="form-control" required />
        </div>

        <CoordinateInputs
          defaultLatitude={facility.latitude}
          defaultLongitude={facility.longitude}
          label="Facility GPS Coordinates (Latitude, Longitude)"
          helpText="Collectors within 5 km of this point receive broadcast notifications when lots are created."
          required={true}
        />

        <div className="r-grid-2" style={{ gap: "0 1rem" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="authorizationNo">
              <T hi="मंज़ूरी नंबर" en="Authorization no." mr="मंजुरी क्रमांक" />
            </label>
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
            <label className="form-label" htmlFor="validTill">
              <T hi="कब तक मान्य" en="Valid till" mr="कधीपर्यंत वैध" />
            </label>
            <input id="validTill" name="validTill" type="date" defaultValue={validTillStr} className="form-control" required />
          </div>
        </div>
        <p className="r-muted" style={{ marginBottom: "1rem" }}>
          <T
            hi="मंज़ूरी बदलने पर आपका खाता फिर से एडमिन की मंज़ूरी के लिए जाएगा।"
            en="Changing the authorization sends your account for admin approval again."
            mr="मंजुरी बदलल्यास तुमचे खाते पुन्हा अॅडमिनच्या मंजुरीसाठी जाईल."
          />
        </p>

        <button type="submit" className="btn btn-primary btn-block btn-lg">
          <Save size={18} aria-hidden="true" /> <T hi="सेव करें" en="Save" mr="सेव्ह करा" />
        </button>
      </form>
    </div>
  );
}
