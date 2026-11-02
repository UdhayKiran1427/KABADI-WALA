/** Fields of the admin add/edit recycler form (the password is never sent back to the browser). */
export const RECYCLER_FORM_FIELDS = [
  "name",
  "contactPhone",
  "authorizationNo",
  "validTill",
  "serviceRadiusKm",
  "address",
  "area",
  "district",
  "latitude",
  "longitude",
  "staffPhone",
] as const;

export type RecyclerFormValues = Record<(typeof RECYCLER_FORM_FIELDS)[number], string>;

export interface RecyclerFormState {
  error: string | null;
  values: RecyclerFormValues;
  /** Bumped on every failed save so the form re-mounts with the returned values. */
  attempt: number;
}

export const EMPTY_RECYCLER_FORM: RecyclerFormValues = {
  name: "",
  contactPhone: "",
  authorizationNo: "",
  validTill: "",
  serviceRadiusKm: "15",
  address: "",
  area: "",
  district: "Mumbai",
  latitude: "",
  longitude: "",
  staffPhone: "",
};
