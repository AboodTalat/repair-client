// Minimal server-side helper for talking to the `repair` GraphQL sub-server.
//
// Every repair operation uses the same MyAppInput → MyAppResponse envelope,
// with the actual payload JSON-encoded inside `strObjectInput` and the
// response payload JSON-encoded inside `serverResponse`. This helper hides
// that envelope so callers can pass a plain object in and get a plain
// object back.
//
// Public reads only for now (categories tree). When auth-bearing calls show
// up, add an `Authorization` header path here rather than duplicating fetch
// logic in components.

const DEFAULT_URL = "http://localhost:3000/repair/graphql";

// Single source of truth for the GraphQL endpoint, in priority order:
//   1. REPAIR_API_URL                 — optional server-only override (e.g. an
//                                       internal Docker/host name unreachable
//                                       from the browser).
//   2. NEXT_PUBLIC_REPAIR_GRAPHQL_URL — the SAME var the client transport
//                                       (repairClientApi.js) uses, so server-
//                                       and client-side calls never target
//                                       different ports. Readable server-side
//                                       in Next.js.
//   3. DEFAULT_URL                    — last-resort local default.
// Without #2, server-rendered fetches (the nav category tree) silently fell
// back to localhost:3000 — the frontend's own port — and 404'd, so the nav
// dropped to its hardcoded fallback categories instead of the live DB tree.
function endpoint() {
  return (
    process.env.REPAIR_API_URL ||
    process.env.NEXT_PUBLIC_REPAIR_GRAPHQL_URL ||
    DEFAULT_URL
  );
}

export async function repairQuery(operationName, variables = {}, { revalidate = 300, tags } = {}) {
  const query = `query ${operationName}($appInput: MyAppInput) {
    ${operationName}(appInput: $appInput) {
      blnRequestSuccessful
      serverResponse
    }
  }`;

  const appInput = {
    strObjectInput: JSON.stringify(variables ?? {}),
  };

  // `revalidate` is the time-based ISR fallback; `tags` enable on-demand
  // invalidation via revalidateTag(...) so admin edits surface immediately
  // instead of waiting out the revalidate window.
  const next = { revalidate };
  if (Array.isArray(tags) && tags.length) next.tags = tags;

  const res = await fetch(endpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { appInput } }),
    next,
  });

  if (!res.ok) {
    throw new Error(`repairQuery ${operationName} HTTP ${res.status}`);
  }
  const body = await res.json();
  const op = body?.data?.[operationName];
  if (!op?.blnRequestSuccessful) {
    throw new Error(`repairQuery ${operationName}: ${op?.serverResponse ?? "Request failed"}`);
  }
  return safeParse(op.serverResponse);
}

function safeParse(s) {
  if (typeof s !== "string") return s;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
