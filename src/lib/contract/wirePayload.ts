/**
 * Sync payloads arrive as JSON and are validated per entity by `syncContract.ts`; handlers then read fields by
 * name. This is the one deliberate `any` for that boundary; everything else should use real types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WirePayload = Record<string, any>;
