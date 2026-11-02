/** Wrong OTP entries allowed before the recycler must cancel and send the vehicle again (new OTP). */
export const MAX_OTP_ATTEMPTS = 5;

export type DispatchStatus = "ON_THE_WAY" | "PICKED_UP" | "CANCELLED";
export type VehicleState = "EMPTY" | "ON_THE_WAY" | "LOADED";

/** "mh 01-ab 1234 " -> "MH 01-AB 1234". Returns null when it does not look like a vehicle number. */
export function normalizeVehicleNumber(raw: string): string | null {
  const value = (raw || "").trim().toUpperCase().replace(/\s+/g, " ");
  if (!/^[A-Z0-9][A-Z0-9 -]{2,12}[A-Z0-9]$/.test(value)) return null;
  if (!/[0-9]/.test(value)) return null;
  return value;
}

export function normalizeVehicleName(raw: string): string | null {
  const value = (raw || "").trim().replace(/\s+/g, " ");
  return value.length >= 2 && value.length <= 40 ? value : null;
}

/**
 * A vehicle's state from its dispatches: on the way to a pickup, loaded (picked up, not yet
 * unloaded at the yard) or empty. On the way wins over loaded.
 */
export function vehicleState(dispatches: Array<{ status: string; unloadedAt: Date | null }>): {
  state: VehicleState;
  onTheWay: number;
  loaded: number;
} {
  const onTheWay = dispatches.filter((d) => d.status === "ON_THE_WAY").length;
  const loaded = dispatches.filter((d) => d.status === "PICKED_UP" && !d.unloadedAt).length;
  return { state: onTheWay > 0 ? "ON_THE_WAY" : loaded > 0 ? "LOADED" : "EMPTY", onTheWay, loaded };
}

/** OTP check: exactly the 4 digits, compared without short-circuiting. */
export function otpMatches(expected: string, entered: string): boolean {
  const value = (entered || "").trim();
  if (!/^\d{4}$/.test(value) || expected.length !== 4) return false;
  let diff = 0;
  for (let i = 0; i < 4; i++) diff |= expected.charCodeAt(i) ^ value.charCodeAt(i);
  return diff === 0;
}
