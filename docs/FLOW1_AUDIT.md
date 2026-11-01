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

## Fixed in the second pass
| Area | Before | After |
|---|---|---|
| `POST/GET /lots/{id}/handover` | Any signed-in user could read any lot's code (derived from the lot id) and complete + pay any lot; code check optional; wrong code returned the expected code | GET only for the lot's collector / chosen recycler / admin and never returns the code or hash; POST only for the chosen recycler, code required and checked against the stored hash, nothing leaked |
| Outside-tolerance weight | R2 web action and REST route confirmed or paid regardless | Outside tolerance -> handover `WEIGHED`, nothing paid; the collector accepts or disputes (existing sync handler) |
| Invented rates | `|| 3000` / `|| 4000` in 4 places | `firstPositiveRate` returns null -> error / "price not available". Only the rate locked at selection is used (no fallback to the recycler's current rate) |
| Recycler payment | R2 set `confirmedByCollector: true`, so the collector's "Money received" push created a duplicate payment | Created unconfirmed; sync handler matches it when the collector confirms |
| Duplicate anomaly flags | R2 created weight/price flags twice | Once (de-duplicated by rule code) |
| Prices append-only | `deletePriceRecordAction` hard-deleted | Removed (action and button). Correct a wrong price by adding a new one |
| Field-agent doorstep | Fake `"1234"` code stored, no check | Code verified against an existing handover; no default code |

## Deviations kept on purpose
Handover hash `sha256(ref:code)`: not changed. Batch handovers have no single lotRef, there are 8 call sites, and stored hashes/QRs would break; a global salt adds no real protection. Update the spec instead.

## Open issues
- **Rate lock**: the quote is immutable once chosen (`quotedRatePaise`), which is what spec rule 3 asks. What happens after `RATE_LOCK_HOURS` is not defined by the spec, so nothing is enforced; `isRateLockActive` exists and is tested.
- **Default PIN**: `field/actions.ts` onboarding falls back to PIN `1234` when none is given.
- **Pickup-agent flow** (`agentCompleteDoorstepHandoverAction`) pays and completes in one step. Out of scope per spec s15; left as is.
- `next lint` is not configured (no ESLint config; it prompts interactively).

## Verification (2026-11-02, latest run)
- Backend: `tsc --noEmit` clean, `tsx --test` 137/137 pass.
- Flutter: `flutter analyze` 0 errors; `flutter test` 728 pass, 3 fail (R2 / R4 recycler screens and C14), all in files another session was editing during the run (`lib/screens/recycler/r2_*`, `r4_*`). Run alone, only R2 (overflow 480px at 360dp / text scale 1.3) still fails.
- Full `flutter test` can show different failures on each run while other `flutter` processes use the same `build/` folder.

## UNVERIFIED (not run)
`/admin/disputes` and the rewritten `/lots/{id}/handover` against a real MongoDB replica set, idempotent `/sync/push` double-push, role x route matrix, airplane-mode journey, clock skew.
