import { responses, schemas, securitySchemes } from "./components";
import { operations, type DocRole } from "./paths";

type Json = Record<string, any>;

export const SPEC_SLUGS = ["collector", "recycler", "admin", "field-agent", "all"] as const;
export type SpecSlug = (typeof SPEC_SLUGS)[number];

const SLUG_TO_ROLE: Record<Exclude<SpecSlug, "all">, DocRole> = {
  collector: "COLLECTOR",
  recycler: "RECYCLER",
  admin: "ADMIN",
  "field-agent": "FIELD_AGENT",
};

export const SPEC_TITLES: Record<SpecSlug, string> = {
  collector: "Collector",
  recycler: "Recycler",
  admin: "Admin",
  "field-agent": "Field Agent",
  all: "All roles",
};

const ROLE_BLURBS: Record<SpecSlug, string> = {
  collector:
    "Informal e-waste collectors using the mobile app. Flow: check today's price → create a lot → confirm (broadcast to recyclers within 5 km) → see interested recyclers → select one → pay via QR. Also ledger, pickup requests and offline sync.",
  recycler:
    "Authorized recycler staff (sign in with `POST /auth/staff-login`): see open lot requests within 5 km, answer INTERESTED / DECLINED with a rate, list won deals, view the deal, and record the scale-weight handover. Rates / profile / pickup dispatch in the web portal run through server actions and are not REST endpoints.",
  admin:
    "Platform administrators: set today's prices, add / approve / suspend recyclers, oversee lots and deals, field-agent datasets, price export and the maintenance cron jobs. Other admin screens (team, anomalies) are web-portal server actions, not REST endpoints.",
  "field-agent":
    "Field agents who onboard collectors, log ground market prices and capture ML training photos.",
  all: "Every REST endpoint in the platform, each tagged with the roles that may call it (`x-roles`).",
};

const TAG_DESCRIPTIONS: Record<string, string> = {
  System: "Health checks",
  Auth: "Phone + 4-digit PIN authentication",
  "Reference & Pricing": "Categories, price board / history, estimates and public receipts",
  Matching: "Recycler matching and nearby search",
  Lots: "E-waste lot lifecycle",
  "Lot Flow": "Confirm → recycler offers → select → deal → demo payment",
  Recycler: "Recycler staff: lot requests, responses and won deals",
  Bargaining: "Price negotiation between collector and recycler",
  Handover: "Verification code, scale weighing, location proof and payment",
  "Collector Services": "Ledger, pickup requests and coverage-gap requests",
  Sync: "Offline-first push / pull protocol",
  Uploads: "Photo upload helpers",
  Notifications: "In-app notifications (all roles)",
  "Field Agent": "Field agent tooling (F1–F3)",
  Admin: "Admin-only endpoints",
  "Cron / Maintenance": "Scheduler endpoints secured by CRON_SECRET",
};

/** Collect every `#/components/<kind>/<name>` referenced anywhere inside `node`. */
function collectRefs(node: unknown, out: Set<string>) {
  if (Array.isArray(node)) {
    node.forEach((n) => collectRefs(n, out));
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "$ref" && typeof v === "string") out.add(v);
      else collectRefs(v, out);
    }
  }
}

/** Keep only the components reachable from the included operations. */
function pruneComponents(paths: Json): Json {
  const seen = new Set<string>();
  let frontier = new Set<string>();
  collectRefs(paths, frontier);

  const pool: Json = { schemas, responses };
  while (frontier.size) {
    const next = new Set<string>();
    for (const refStr of frontier) {
      if (seen.has(refStr)) continue;
      seen.add(refStr);
      const [, , kind, name] = refStr.split("/");
      collectRefs(pool[kind]?.[name], next);
    }
    frontier = next;
  }

  const pick = (kind: "schemas" | "responses") =>
    Object.fromEntries(
      Object.entries(pool[kind] as Json).filter(([name]) => seen.has(`#/components/${kind}/${name}`))
    );

  return { securitySchemes, schemas: pick("schemas"), responses: pick("responses") };
}

export function buildSpec(slug: SpecSlug): Json {
  const role = slug === "all" ? null : SLUG_TO_ROLE[slug];
  const included = operations.filter((o) => role === null || o.roles.includes(role) || o.roles.includes("PUBLIC"));

  const paths: Json = {};
  const usedTags = new Set<string>();
  for (const { path, method, roles, operation } of included) {
    const tags = (operation.tags as string[]) ?? [];
    tags.forEach((t) => usedTags.add(t));
    paths[path] ??= {};
    paths[path][method] = { ...operation, "x-roles": roles };
  }

  const title = slug === "all" ? "Kabadi-Wala API — all roles" : `Kabadi-Wala API — ${SPEC_TITLES[slug]}`;

  return {
    openapi: "3.0.3",
    info: {
      title,
      version: "1.0.0",
      description: [
        ROLE_BLURBS[slug],
        "",
        "**Conventions** — money is integer **paise**, weight is integer **grams**, timestamps are ISO-8601 UTC.",
        "Success: `{ \"data\": ... }` · Failure: `{ \"error\": { \"code\", \"message\", \"details?\" } }`.",
        "",
        "**Auth** — mobile clients send `Authorization: Bearer <JWT>` (from `POST /api/v1/auth/login`); the web portal uses the `ewaste_session` cookie.",
        role ? `Endpoints marked \`x-roles\` containing \`PUBLIC\` need no sign-in; the rest require the **${role}** role.` : "",
      ]
        .filter((l) => l !== "")
        .join("\n\n"),
    },
    servers: [{ url: "/", description: "This server" }],
    tags: [...usedTags].map((name) => ({ name, description: TAG_DESCRIPTIONS[name] ?? "" })),
    paths,
    components: pruneComponents(paths),
    ...(role ? { "x-role": role } : {}),
  };
}

export function isSpecSlug(value: string): value is SpecSlug {
  return (SPEC_SLUGS as readonly string[]).includes(value);
}
