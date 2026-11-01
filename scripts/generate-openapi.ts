/**
 * Writes one OpenAPI document per role to docs/openapi/<slug>.json.
 * Usage: npm run docs:openapi
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { buildSpec, SPEC_SLUGS } from "../src/lib/openapi";

const outDir = path.join(__dirname, "..", "docs", "openapi");
mkdirSync(outDir, { recursive: true });

for (const slug of SPEC_SLUGS) {
  const spec = buildSpec(slug);
  const file = path.join(outDir, `${slug}.json`);
  writeFileSync(file, JSON.stringify(spec, null, 2) + "\n");
  const opCount = Object.values(spec.paths as Record<string, object>).reduce((n, p) => n + Object.keys(p).length, 0);
  console.log(`${slug.padEnd(12)} ${String(opCount).padStart(2)} operations -> ${path.relative(process.cwd(), file)}`);
}
