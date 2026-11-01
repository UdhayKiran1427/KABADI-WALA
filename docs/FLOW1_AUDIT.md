# Flow 1 audit (Flutter + Next.js vs flow1_direct_spec) — 2026-11-02

Evidence: `npx tsc --noEmit`, `npx tsx --test` (127 pass), `flutter test` on the rule tests. Items not run are marked UNVERIFIED.

## Fixed in this pass
| Area | Before | After |
|---|---|---|
| Amount formula | `Math.round(a*b/1000)` copied in 10 places (TS); `double.round()` in Dart estimator/ranker | One integer half-up function: `amountPaise` (`src/lib/domain/money.ts`) and `finalPrice` (`weight_rules.dart`); all call sites use it |
| Weight tolerance (TS) | Float percentage compare | Integer `diff*100 <= declared*5` (`isWithinTolerance`) |
| Config constants | Scattered literals | `src/lib/domain/config.ts` (TS) and `app_config.dart` (adds `RATE_LOCK_HOURS`); matching imports radii from config |
| QUOTED -> SAVED (change recycler) | Missing in both client tables (server already allowed MATCHED -> READY) | Added in `lotStatusMapping.ts` and `lot_state.dart` |
| Shared test vectors | Only handover-code vectors | `tests/fixtures/contract/flow1_rules.json` (copied to `E_waste/test/fixtures/contract/`), asserted in `tests/domain/flow1Rules.test.ts` and `E_waste/test/flow1_rules_test.dart` |
| AuditLog (spec s10) | No model, nothing written | `AuditLog` model, `auditService.writeAudit`, called from every admin action |
| M6 Disputes | No page or resolve | `/admin/disputes`, `resolveDispute` (DISPUTED -> HANDED_OVER/CONFIRMED or CANCELLED, note required, audit + notifications) |

Run `npm run db:push` once so the `AuditLog` collection and indexes exist.

## Deviations kept on purpose (update the spec, or tell me to change the code)
1. **Handover code hash**: both sides use `sha256("<handoverRef>:<code>")` (cross-tested in `handover_code_vectors.json`). Spec says `sha256(salt + lotRef + code)`. Changing it breaks every stored hash and QR, so not done.
2. **EXPIRED -> QUOTED** (re-quote an expired lot) exists on both sides; spec says EXPIRED is terminal.
3. Web recycler/admin use server actions, and the mobile API has different paths than spec s10 (`/lots/[id]/select`, `/lots/[id]/handover`, `/recyclers/match`, ...). `docs/API.md` is the real contract.
4. The web portal also has a broadcast / offers / bargain flow that Flow 1 does not describe.

## Open issues (not fixed)
- **Prices are deleted**: `deletePriceRecordAction` hard-deletes a `PricePoint`; spec rule 6 says append-only. Now audit-logged with the old values, but still a delete.
- **Invented fallback rates**: `|| 3000` (recycler/actions.ts) and `|| 4000` (handover route, field/actions.ts) make up a rate when none exists. Spec: show "price not available".
- **Rate lock expiry**: the quote is locked (`quotedRatePaise`) and never changes, but nothing happens after `RATE_LOCK_HOURS`. `isRateLockActive` exists and is tested; no endpoint uses it. Spec does not say what happens after the window.
- **Concurrent edits (not mine)** break the build right now: Flutter `http_remote_api.dart` (`_resolveUri`, `_tokenProvider`, `_processResponse` undefined), `reference_data_syncer.dart` and `offline_full_flow_integration_test.dart` (`latitude`/`longitude` params), and TS `src/app/api/v1/sync/my-data/route.ts` (`mode`, `referenceNumber` not on Payment).

## UNVERIFIED (not run)
Full `flutter test` (blocked by the compile errors above), `/admin/disputes` in a browser (needs MongoDB replica set), idempotent `/sync/push` double-push, role x route matrix, airplane-mode journey, clock skew.
