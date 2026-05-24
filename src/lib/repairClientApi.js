/**
 * repairClientApi — client-side GraphQL transport for the repair sub-server.
 *
 * Two helpers, both store-agnostic so this module has no React or store imports:
 *
 *   graphqlFetch          — raw call.  Caller supplies the token explicitly.
 *   graphqlFetchWithRetry — same call, but auto-refreshes on auth failure and
 *                           retries once.  Caller passes `getToken` / `refresh`
 *                           closures (so the store wiring lives elsewhere).
 *
 * The one-way dependency direction (useRepairStore → repairClientApi) avoids
 * circular-import problems at bundle time.
 *
 * GRAPHQL_URL
 * ───────────
 * Set NEXT_PUBLIC_REPAIR_GRAPHQL_URL in .env.local (dev) or in the Vercel
 * project environment variables (staging / prod).  The fallback is the local
 * dev address — do NOT commit a production URL here.
 *
 * Auth-failure detection
 * ──────────────────────
 * The repair `isAuth` middleware is non-blocking — it sets a flag and lets
 * the request through.  Per-resolver checks return UNAUTH (`fail("Un
 * Authenticated User")`) which arrives as **HTTP 200** with
 * `blnRequestSuccessful: false`.  That's why this helper has to inspect the
 * application-level message and synthesise a `.status === 401` on the error
 * — otherwise the retry layer would never trigger.
 *
 * Wire format
 * ───────────
 *   Input  → MyAppInput { strObjectInput: JSON.stringify(variables) }
 *   Output → MyAppResponse { blnRequestSuccessful, serverResponse }
 * `serverResponse` is a JSON-encoded string on success, a plain message on
 * failure.  This helper decodes the success case.
 */

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_REPAIR_GRAPHQL_URL ?? "/repair/graphql";

// Exact match against helpers.ts UNAUTH = fail("Un Authenticated User").
// FORBIDDEN ("Forbidden") is deliberately NOT here — refresh won't fix a
// role/permission failure, so the retry layer must not loop on it.
const UNAUTH_MESSAGE = "Un Authenticated User";

/**
 * Make a single GraphQL request against the repair sub-server.
 *
 * @param {string}      operationName  Exact resolver name (e.g. "myAppGetCart")
 * @param {object}      variables      Plain object — JSON-encoded into strObjectInput
 * @param {object}      [options]
 * @param {string|null} [options.token]    JWT for the Authorization header
 * @param {boolean}     [options.isQuery]  true → query, false → mutation (default true)
 *
 * @returns {Promise<unknown>}  Parsed serverResponse payload
 * @throws  {Error}             On HTTP failure OR blnRequestSuccessful === false.
 *                              Errors carry `.status` (network status, or 401 synthesized
 *                              from a "Un Authenticated User" application-level message).
 */
export async function graphqlFetch(
  operationName,
  variables = {},
  { token = null, isQuery = true, tableName = null } = {}
) {
  const operationType = isQuery ? "query" : "mutation";

  const gql = `${operationType} ${operationName}($appInput: MyAppInput) {
    ${operationName}(appInput: $appInput) {
      blnRequestSuccessful
      serverResponse
    }
  }`;

  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // `tableName` is required by `myAppSignUp` (the one surviving generic-shaped
  // mutation in the repair sub-server, locked to "users"). All named resolvers
  // ignore it.
  const appInput = { strObjectInput: JSON.stringify(variables ?? {}) };
  if (tableName != null) appInput.tableName = tableName;

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: gql,
      variables: { appInput },
    }),
  });

  if (!res.ok) {
    const err = new Error(`repairClientApi ${operationName} HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const body = await res.json();
  const op = body?.data?.[operationName];

  if (!op?.blnRequestSuccessful) {
    const msg = typeof op?.serverResponse === "string" ? op.serverResponse : "Request failed";
    const err = new Error(`repairClientApi ${operationName}: ${msg}`);
    if (msg === UNAUTH_MESSAGE) err.status = 401;
    throw err;
  }

  const raw = op.serverResponse;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * graphqlFetchWithRetry — same as graphqlFetch, but on a 401 it calls the
 * caller-supplied `refresh()` and retries the request ONCE.
 *
 * Why closures instead of importing the store directly: keeps this module
 * store-free, which avoids a circular import (useRepairStore already imports
 * graphqlFetch from here).
 *
 * @param {string} operationName
 * @param {object} variables
 * @param {object} options
 * @param {() => (string|null)}            options.getToken
 * @param {() => Promise<string|null>}     options.refresh
 * @param {boolean}                        [options.isQuery=true]
 *
 * @returns {Promise<unknown>}
 */
export async function graphqlFetchWithRetry(
  operationName,
  variables = {},
  { getToken, refresh, isQuery = true, tableName = null } = {}
) {
  try {
    return await graphqlFetch(operationName, variables, { token: getToken(), isQuery, tableName });
  } catch (err) {
    if (err?.status !== 401) throw err;

    // Token expired (or never matched).  Try one refresh + retry.
    const newToken = await refresh();
    if (!newToken) throw err; // refresh failed — store has already called clearAuth()

    return await graphqlFetch(operationName, variables, { token: newToken, isQuery, tableName });
  }
}
