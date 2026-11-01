import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { uploadTrainingPhotoAction } from "../actions";

export default async function TrainingPhotoCapturePage(props: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await requireRole(["FIELD_AGENT", "ADMIN"]);
  const searchParams = await props.searchParams;

  const categories = await prisma.materialCategory.findMany({
    orderBy: { id: "asc" },
  });

  const recentSamples = await prisma.trainingSample.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      category: true,
      image: true,
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Link href="/field" style={{ fontSize: "1.2rem", textDecoration: "none" }}>
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
            F3: AI Dataset Training Photo Capture
          </h1>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>मशीन लर्निंग मॉडल फोटो लेबलिंग</div>
        </div>
      </div>

      {searchParams.success && (
        <div
          style={{
            padding: "0.875rem",
            backgroundColor: "#ecfdf5",
            color: "#065f46",
            borderRadius: "10px",
            border: "1px solid #a7f3d0",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          ✓ {searchParams.success}
        </div>
      )}

      {searchParams.error && (
        <div
          style={{
            padding: "0.875rem",
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            borderRadius: "10px",
            fontSize: "0.85rem",
          }}
        >
          ⚠️ {searchParams.error}
        </div>
      )}

      {/* Upload & Label Form */}
      <form
        action={uploadTrainingPhotoAction}
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "1.5rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              Material Category *
            </label>
            <select name="categoryId" className="input" style={{ padding: "0.75rem" }} required>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nameHi} ({cat.nameEn})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              Sub-Category / Item Name
            </label>
            <input
              type="text"
              name="subCategory"
              defaultValue="Desktop Motherboard (Green)"
              placeholder="e.g. Copper Cable, Laptop Battery"
              className="input"
              style={{ padding: "0.75rem" }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              Physical Condition
            </label>
            <select name="condition" className="input" defaultValue="DAMAGED" style={{ padding: "0.75rem" }}>
              <option value="WORKING">Working (चालू)</option>
              <option value="DAMAGED">Damaged (क्षतिग्रस्त)</option>
              <option value="BROKEN">Broken / Scrapped (टूटा हुआ)</option>
              <option value="UNKNOWN">Unknown (अज्ञात)</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              Dataset Split
            </label>
            <select name="split" className="input" defaultValue="TRAIN" style={{ padding: "0.75rem" }}>
              <option value="TRAIN">Training Set (80%)</option>
              <option value="VALIDATION">Validation Set (10%)</option>
              <option value="TEST">Test Set (10%)</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
            Camera Photo / File
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="input"
            style={{ padding: "0.6rem" }}
          />
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            Uses mobile camera in field or file selector on desktop. SHA256 duplicate detection is automatic.
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{
            padding: "0.875rem",
            fontSize: "1.05rem",
            fontWeight: 800,
            borderRadius: "10px",
            backgroundColor: "#2563eb",
          }}
        >
          Submit Labeled Sample to AI Dataset (M4) &rarr;
        </button>
      </form>

      {/* Recent Training Samples */}
      <div className="card">
        <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          हाल के AI ट्रेनिंग सैंपल्स / Recent Training Samples
        </h2>

        {recentSamples.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>
            No training samples logged yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Split</th>
                  <th>Source</th>
                  <th>Quality</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSamples.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700 }}>{s.category.nameHi} ({s.category.nameEn})</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: "#f1f5f9", color: "#334155" }}>
                        {s.split || "TRAIN"}
                      </span>
                    </td>
                    <td>{s.labelSource}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: "#ecfdf5", color: "#065f46" }}>
                        {s.quality}
                      </span>
                    </td>
                    <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
