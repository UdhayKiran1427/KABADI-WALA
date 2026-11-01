// Presentation-layer conversions only. Storage and APIs stay in integer paise / grams.

/** Paise -> rupees as a fixed-decimals string, e.g. rupees(12550) -> "126". */
export const rupees = (paise: number, digits = 0): string => (paise / 100).toFixed(digits);

/** Paise -> rupees with Indian digit grouping, e.g. rupeesIN(1234500) -> "12,345". */
export const rupeesIN = (paise: number): string => (paise / 100).toLocaleString("en-IN");

/** Grams -> kilograms as a fixed-decimals string, e.g. kg(5250) -> "5.3". */
export const kg = (grams: number, digits = 1): string => (grams / 1000).toFixed(digits);

/** Paise -> "₹1,234.5" (up to 2 decimals, Indian grouping). */
export const inr = (paise: number): string =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
