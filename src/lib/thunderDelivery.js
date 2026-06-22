// Thunder (Olivery) delivery helpers for the admin handoff UI.
//
// The backend reference-data resolvers (myAppAdminGetThunderAreas /
// SubAreas / OrderTypes) proxy Thunder's JSON-RPC responses verbatim. The
// EXACT shape of those responses could not be confirmed against the live
// sandbox (the supplied credentials are placeholders that fail Odoo auth), so
// `toOptions` is intentionally defensive — it accepts every common Odoo shape
// (array of objects, array of [id, name] tuples, an {id: "Name"} map, or a
// wrapper like { result | data | areas: [...] }) and normalizes to
// `[{ value, label }]` for a <select>. If the real shape turns out narrower,
// this still works; if it's wider, extend the key lists below.

// `response` is first because Thunder's get_areas nests its array under
// result.response (confirmed live), while get_sub_areas returns the array as
// result directly — the backend resolver already unwraps the JSON-RPC `result`,
// so here we may receive EITHER a bare array OR a { response: [...] } object.
const WRAPPER_KEYS = ["response", "result", "data", "areas", "sub_areas", "subAreas", "order_types", "orderTypes", "items", "records"];
// Thunder area/sub-area rows are { id, name, code }. We use the numeric `id`
// as the option value (Odoo record id) and `name` as the label.
const ID_KEYS = ["id", "value", "area_id", "sub_area_id", "order_type_id", "key"];
const NAME_KEYS = ["name", "label", "area_name", "sub_area_name", "title", "text", "display_name", "ar_name", "en_name"];

function firstKey(obj, keys) {
  for (const k of keys) {
    if (obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
  }
  return undefined;
}

// Unwrap a JSON-RPC-ish payload down to the array (or object map) of options.
function unwrap(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const k of WRAPPER_KEYS) {
      if (Array.isArray(data[k])) return data[k];
      if (data[k] && typeof data[k] === "object") return data[k];
    }
    return data; // treat the object itself as an {id: name} map
  }
  return [];
}

// Normalize an arbitrary Thunder reference-data payload into select options.
export function toOptions(data) {
  const unwrapped = unwrap(data);

  if (Array.isArray(unwrapped)) {
    return unwrapped
      .map((row, i) => {
        if (row == null) return null;
        // Odoo many2one / tuple: [id, "Name"]
        if (Array.isArray(row)) {
          const value = row[0];
          const label = row.find((x) => typeof x === "string") ?? String(row[0]);
          return value != null ? { value: String(value), label: String(label) } : null;
        }
        if (typeof row === "object") {
          const value = firstKey(row, ID_KEYS);
          const label = firstKey(row, NAME_KEYS) ?? value;
          return value != null ? { value: String(value), label: String(label) } : null;
        }
        // Bare scalar — use it as both value and label.
        return { value: String(row), label: String(row), _i: i };
      })
      .filter(Boolean);
  }

  // Object map { "1": "Nablus", "2": "Ramallah" }
  if (unwrapped && typeof unwrapped === "object") {
    return Object.entries(unwrapped).map(([value, label]) => ({
      value: String(value),
      label: typeof label === "string" ? label : String(value),
    }));
  }

  return [];
}

// Currency formatter aligned with the rest of the admin (JOD). Kept local so
// this module has no admin-mock dependency.
export function formatThunderFee(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `JOD ${v.toFixed(2)}`;
}
