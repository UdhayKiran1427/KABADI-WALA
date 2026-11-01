/**
 * Row ceilings for queries on tables that only grow. One place, so a list never loads an unbounded
 * result set and the numbers are easy to tune.
 */

/** Default ceiling for list endpoints and admin tables. */
export const LIST_MAX_ROWS = 200;
/** Price history returned to the app (already limited to 7-90 days). */
export const PRICE_HISTORY_MAX_ROWS = 5000;
/** CSV exports. */
export const EXPORT_MAX_ROWS = 50_000;
/** A collector's ledger. `truncated: true` is returned when this is hit. */
export const LEDGER_MAX_LOTS = 2000;
