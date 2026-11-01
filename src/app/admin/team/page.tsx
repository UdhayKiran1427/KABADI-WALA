import { requireRole } from "@/lib/auth/session";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createTeamUserAction } from "../actions";
import { LIST_MAX_ROWS } from "@/lib/limits";

export default async function AdminTeamPage() {
  await requireRole(["ADMIN"]);

  const teamUsers = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "FIELD_AGENT"] },
    },
    orderBy: { createdAt: "desc" },
    take: LIST_MAX_ROWS,
  });

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 className="r-page-title">Team</h1>
      </div>

      <div className="grid-2">
        {/* Create Member Form */}
        <div className="card">
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Add Team Member</h2>
          <form action={createTeamUserAction}>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone</label>
              <input id="phone" name="phone" type="text" placeholder="10-digit phone" className="form-control" required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pin">Password or PIN</label>
              <input id="pin" name="pin" type="password" placeholder="Password or 4-digit PIN" className="form-control" required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="role">Role</label>
              <select id="role" name="role" className="form-control" defaultValue="FIELD_AGENT">
                <option value="FIELD_AGENT">Field agent</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              <Plus size={16} aria-hidden="true" /> Add member
            </button>
          </form>
        </div>

        {/* Members List */}
        <div className="card">
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Members ({teamUsers.length})</h2>
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

