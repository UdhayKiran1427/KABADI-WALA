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
    take: 8,
    include: {
      category: true,
      image: true,
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Link
          href="/field"
          className="btn btn-secondary btn-sm"
          style={{ width: "36px", height: "36px", padding: 0, borderRadius: "50%" }}
        >
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--slate-900)", margin: 0, letterSpacing: "-0.01em" }}>
            F3: AI Dataset Training Photo Capture &bull; ML Annotation
          </h1>
          <div style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>
            मशीन लर्निंग मॉडल फोटो लेबलिंग &bull; Visual Quality &amp; Categorization Classifier
          </div>
        </div>
      </div>

      {searchParams.success && (
        <div className="alert alert-success">
          ✓ {searchParams.success}
        </div>
      )}

      {searchParams.error && (
        <div className="alert alert-danger">
          ⚠️ {searchParams.error}
        </div>
      )}

      {/* 2-Column Responsive Dashboard Grid (Fills 100% of desktop screens!) */}
      <div className="dashboard-grid">
        {/* LEFT COLUMN: Upload & Label Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          <form
            action={uploadTrainingPhotoAction}
            className="card"
            style={{
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--slate-900)" }}>
              Capture &amp; Annotate Waste Sample
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Material Category *
                </label>
                <select name="categoryId" className="form-control" style={{ padding: "0.75rem" }} required>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nameHi} ({cat.nameEn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Sub-Category / Item Description
                </label>
                <input
                  type="text"
                  name="subCategory"
                  defaultValue="Desktop Motherboard (Green FR4)"
                  placeholder="e.g. Telecom PCB, Li-ion pouch"
                  className="form-control"
                  style={{ padding: "0.75rem" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Physical Condition *
                </label>
                <select name="condition" className="form-control" defaultValue="DAMAGED" style={{ padding: "0.75rem" }}>
                  <option value="WORKING">Working (चालू हालत)</option>
                  <option value="DAMAGED">Damaged (क्षतिग्रस्त / आंशिक टूटा)</option>
                  <option value="BROKEN">Broken / Scrapped (पूर्ण कबाड़)</option>
                  <option value="UNKNOWN">Unknown (अज्ञात)</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Dataset Partition
                </label>
                <select name="split" className="form-control" defaultValue="TRAIN" style={{ padding: "0.75rem" }}>
                  <option value="TRAIN">Training Set (80%)</option>
                  <option value="VALIDATION">Validation Set (10%)</option>
                  <option value="TEST">Test Benchmark (10%)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Camera Snapshot / File Upload *
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="form-control"
                style={{ padding: "0.6rem" }}
              />
              <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
                Auto-generates SHA256 perceptual hash to prevent duplicate entries in Module M4.
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              style={{ padding: "0.85rem", backgroundColor: "#4f46e5" }}
            >
              ✓ Submit Labeled Sample to AI Dataset (M4) &rarr;
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Recent AI Samples & Annotation SOP (Fills Desktop Space!) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* Recent Training Gallery Card */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)" }}>
                🖼️ Recent Training Samples
              </h3>
              <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>M4 Feed</span>
            </div>

            {recentSamples.length === 0 ? (
              <div style={{ color: "var(--slate-500)", fontSize: "0.825rem", textAlign: "center", padding: "1.5rem" }}>
                No training samples uploaded yet.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
                {recentSamples.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      border: "1px solid var(--slate-200)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.6rem",
                      backgroundColor: "var(--slate-50)",
                    }}
                  >
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--slate-900)" }}>
                      {s.category.nameHi}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--slate-500)", marginTop: "0.1rem" }}>
                      {s.category.nameEn}
                    </div>
                    <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.4rem" }}>
                      <span className="badge badge-neutral" style={{ fontSize: "0.65rem", padding: "0.1rem 0.35rem" }}>
                        {s.quality}
                      </span>
                      {s.split && (
                        <span className="badge badge-info" style={{ fontSize: "0.65rem", padding: "0.1rem 0.35rem" }}>
                          {s.split}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Training Protocol Guidelines */}
          <div className="card" style={{ padding: "1.25rem", backgroundColor: "#f8fafc" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--slate-800)", marginBottom: "0.4rem" }}>
              🎯 Quality Labeling Guidelines
            </h3>
            <ul style={{ fontSize: "0.775rem", color: "var(--slate-600)", paddingLeft: "1.1rem", lineHeight: 1.6 }}>
              <li>Photograph in natural daylight without direct flashlight glare.</li>
              <li>Include visible scale indicators where possible (hand or scale platform).</li>
              <li>Ensure component serial numbers or markings are legible if visible.</li>
              <li>Tag burnt or swollen Li-ion cells accurately as <strong>DAMAGED</strong>.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
