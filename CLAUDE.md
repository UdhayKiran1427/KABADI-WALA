# KABADI-WALA — Claude rules (short). Full spec: PROJECT.md, docs/API.md (read a section only when needed).

Next.js 15 App Router + TypeScript strict + Prisma 6 on MongoDB (replica set `rs0`). Backend/web for the Flutter app in `../E_waste`.

## Hard rules
- Money = integer paise, weight = integer grams, ids = UUID strings. Convert to ₹/kg only in the UI layer.
- `prisma/schema.prisma` mirrors the Drift v3 contract (`docs/local_db.dart`). Never rename/drop fields; additive changes only, log them in `docs/schema-changes.md`.
- `src/lib/domain/` is pure business logic (no DB imports). DB access lives in `src/lib/services/`.
- Lot status only via `lotStateMachine.ts`. Never write `status` directly.
- Every page and server action re-checks role against the DB (`src/lib/auth/`). Never trust cookies/middleware alone.
- No collector PII. Public receipts expose no collector phone. Round analytics coords to 3 decimals.
- API responses go through `src/lib/apiResponse.ts`. New/changed endpoint -> update `src/lib/openapi/paths.ts`, then `npm run docs:openapi`.

## Token-light workflow
- Never read: `node_modules/`, `.next/`, `package-lock.json`, `*.tsbuildinfo`, `docs/openapi/*.json` (generated), `docs/*.xlsx`, `*.pptx`, `.env`. Regenerate instead of reading.
- Start with `docs/INDEX.md` (all routes, pages, exports, prisma models, ~10KB). Never dump many route files with a shell loop. After adding/removing routes or exports: `python3 -I scripts/gen-index.py`.
- A hook blocks whole-file Reads over 250 lines / 12KB. Grep, then Read with `offset`+`limit` (<=150 lines).
- Search with Grep first, then Read only the needed line range. Don't read whole `syncEngine.ts` / `paths.ts` / `schema.prisma` / `PROJECT.md`; grep for the symbol or section.
- Verify with `npx tsc --noEmit` and `npx tsx --test "tests/unit/**/*.test.ts"` (domain tests: `tests/domain`). Pipe output through `tail -30`; run `npm run build` only when asked. Don't start `next dev` just to check types.
- Don't re-explain unchanged code; keep replies short.
- Shell: `cat` is aliased to `bat` (not installed); use the Read tool or `command cat`.

## Where things are
- Mobile REST: `src/app/api/v1/` · Recycler portal: `src/app/recycler/` · Admin: `src/app/admin/` · Field agent: `src/app/field/`
- Sync engine: `src/lib/services/syncEngine.ts` · Auth: `src/lib/auth/` · Storage (S3/local): `src/lib/storage/`
