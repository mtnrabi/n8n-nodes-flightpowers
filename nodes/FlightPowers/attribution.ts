/**
 * How a call made by this node gets counted.
 *
 * Every request this node sends goes to `https://api.flightpowers.com`, and
 * until 0.2.3 it arrived there anonymous: the backend files a request with no
 * caller name as a direct marketplace user, so a year of n8n traffic was
 * indistinguishable from someone calling the RapidAPI listing by hand. The
 * install count on the n8n Creator Portal said the node was being installed;
 * nothing anywhere said it was being *used*.
 *
 * The fix is one request header. The FlightPowers front reads `X-FP-Client`,
 * validates it, and writes the result into the upstream request body as
 * `_fp_source`, together with a `_fp_tool` it derives from the path
 * (`oneway`, `roundtrip`, `hotels-search`, `hotels-by-name`). The body is used
 * rather than a header because the hop between the front and the backend drops
 * custom headers; a body field survives it.
 *
 * Two consequences worth knowing before editing this file:
 *
 *  - **Do not put `_fp_source` or `_fp_tool` in the request body from here.**
 *    The front overwrites both, on purpose: what gets reported is what the
 *    front concluded about its caller, not what the caller asked to be called.
 *    A body field added here would be silently discarded, and the node would
 *    look attributed while staying invisible -- the exact bug this change fixes.
 *
 *  - **The name is validated, not sanitised.** The front accepts lower-case
 *    letters, digits, dash, dot, underscore and slash, up to 32 characters, and
 *    attributes anything else to the front itself rather than mangling it into a
 *    source name nobody chose. `CLIENT_NAME` has to keep passing that.
 *
 * Verified against production on 2026-09-09: a real `POST /v1/hotels/by-name`
 * carrying this header produced, in the hotels backend's CloudWatch log,
 * `[source] source=n8n-node/0.2.3 tool=hotels-by-name endpoint=hotel_by_name`.
 */

/** The header the FlightPowers front reads a caller's own name from. */
export const CLIENT_HEADER = 'X-FP-Client';

/**
 * What this package calls itself in the backend's `source=` field.
 *
 * **Bump this with `version` in package.json.** `npm test` fails if the two
 * disagree, because a stale version here silently files new releases under an
 * old one and makes "did the 0.2.4 upgrade change anything" unanswerable.
 */
export const CLIENT_NAME = 'n8n-node/0.2.4';
