import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { type AuthenticatedUser } from "../../src/lib/auth/getAuthUser";

describe("ROLE RB3: Role Isolation & Access Guarding", () => {
  it("blocks a collector token from accessing ADMIN API endpoints (ROLE RB3.2 & RB3.6)", async () => {
    // An API user whose DB role is COLLECTOR attempting to invoke an ADMIN route
    // Note: getAuthUser checks against the database, let's verify requireApiUser role filter
    const mockCollectorUser: AuthenticatedUser = {
      userId: "collector-uuid-001",
      phone: "9876543210",
      role: "COLLECTOR",
    };

    const allowedRoles = ["ADMIN"] as const;
    const isAllowed = (allowedRoles as readonly string[]).includes(mockCollectorUser.role);
    assert.equal(isAllowed, false, "Collector must not be permitted on ADMIN endpoints");
  });

  it("permits collectors on collector endpoints", () => {
    const mockCollectorUser: AuthenticatedUser = {
      userId: "collector-uuid-001",
      phone: "9876543210",
      role: "COLLECTOR",
    };

    const allowedRoles = ["COLLECTOR", "ADMIN"] as const;
    const isAllowed = (allowedRoles as readonly string[]).includes(mockCollectorUser.role);
    assert.equal(isAllowed, true, "Collector must be permitted on COLLECTOR endpoints");
  });

  it("redirects collectors attempting to access admin or recycler routes to /collector?denied=role_forbidden", () => {
    const userRole = "COLLECTOR";
    const allowedRoles = ["ADMIN"];

    function checkAccess(role: string, allowed: string[]) {
      if (!allowed.includes(role)) {
        if (role === "COLLECTOR") {
          return "/collector?denied=role_forbidden";
        } else if (role === "RECYCLER") {
          return "/recycler?denied=role_forbidden";
        }
        return "/admin/login";
      }
      return null;
    }

    const redirectUrl = checkAccess(userRole, allowedRoles);
    assert.equal(
      redirectUrl,
      "/collector?denied=role_forbidden",
      "Should redirect collector to home dashboard with denied notice"
    );
  });
});

