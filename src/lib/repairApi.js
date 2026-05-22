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

function endpoint() {
  return process.env.REPAIR_API_URL || DEFAULT_URL;
}

export async function repairQuery(operationName, variables = {}, { revalidate = 300 } = {}) {
  const query = `query ${operationName}($appInput: MyAppInput) {
    ${operationName}(appInput: $appInput) {
      blnRequestSuccessful
      serverResponse
    }
  }`;

  const appInput = {
    strObjectInput: JSON.stringify(variables ?? {}),
  };

  const res = await fetch(endpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { appInput } }),
    next: { revalidate },
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
