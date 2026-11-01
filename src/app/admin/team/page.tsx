import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createTeamUserAction } from "../actions";

export default async function AdminTeamPage() {
  await requireRole(["ADMIN"]);

  const teamUsers = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "FIELD_AGENT"] },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Team &amp; Field Agent Management</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          Create and manage system administrators and field agents (F1–F3 ground collectors and price surveyors).
        </p>
      </div>

      <div className="grid-2">
        {/* Create Member Form */}
        <div className="card">
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Add Team Member</h2>
          <form action={createTeamUserAction}>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone Number / Login ID</label>
              <input id="phone" name="phone" type="text" placeholder="10-digit phone" className="form-control" required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pin">Password / PIN</label>
              <input id="pin" name="pin" type="password" placeholder="Password or 4-digit PIN" className="form-control" required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="role">Role</label>
              <select id="role" name="role" className="form-control" defaultValue="FIELD_AGENT">
                <option value="FIELD_AGENT">FIELD_AGENT (F1 Onboard, F2 Price Log, F3 Photo Capture)</option>
                <option value="ADMIN">ADMIN (Full Platform Superuser Access)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", background: "#0284c7" }}>
              + Create Account
            </button>
          </form>
        </div>

        {/* Members List */}
        <div className="card">
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Active Members ({teamUsers.length})</h2>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Phone / ID</th>
                  <th>Role</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {teamUsers.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.phone}</strong></td>
                    <td>
                      <span className={`badge ${u.role === "ADMIN" ? "badge-danger" : "badge-neutral"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.createdAt.toISOString().split("T")[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

