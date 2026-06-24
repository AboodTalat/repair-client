// Jordan's 12 governorate cities — the controlled set the storefront + account
// address forms offer in a dropdown and store in ENGLISH.
//
// The stored value is English; the backend converts it to the exact Arabic
// Thunder area name at the Prepared → With Delivery handoff (see
// `Server/servers/repair/src/integrations/jordanCities.ts`, which owns the
// canonical EN → Arabic+area-id mapping). The frontend only needs the English
// list, so that's all that lives here.
//
// IMPORTANT: keep these English values BYTE-IDENTICAL to the `en` fields in the
// backend file above — a mismatch means a stored city won't translate at dispatch
// and Thunder gets the raw English / falls back to the default area.
// `Server/src/__tests__/thunderMapping.test.ts` guards the two lists against drift.

export const JORDAN_CITIES = [
  "Amman",
  "Irbid",
  "Zarqa",
  "Mafraq",
  "Ajloun",
  "Jerash",
  "Madaba",
  "Salt",
  "Karak",
  "Tafilah",
  "Ma'an",
  "Aqaba",
];
