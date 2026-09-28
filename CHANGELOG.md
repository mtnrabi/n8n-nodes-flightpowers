# Changelog

Versions before 0.2.3 were recorded only in GitHub releases and commit
messages; they are summarised here from those.

## 0.2.4 — 2026-09-28

### Fixed

- **An empty origin, destination or date was sent, and billed.** `required:
  true` on a field is checked by the n8n editor against the raw value, never
  against what an expression resolves to, so a mapped field that came up empty
  for an item (`{{ $json.origin }}` with no `origin`, an unfilled `$fromAI`)
  went out as `""`. The API rejects that with a 422 in under a second, and
  RapidAPI meters the request all the same. On 2026-09-28 one workflow made
  seven such calls in six minutes and used up a free plan without a single
  real search.

  Each required field now carries a `preSend` hook
  (`nodes/FlightPowers/validation.ts`) that reads the resolved value and stops
  the node with a `NodeOperationError` -- named field, how to fill it, "no
  request was sent" -- when it is blank, or, for `departure_date` and
  `return_date`, is not a real calendar date. Nothing is sent, nothing is
  charged. Valid requests are untouched: same body, same headers.

- The date placeholders said `e.g. 2026-06-15` and `2026-06-19`, which became
  past dates and a guaranteed 422 for anyone who copied them. They now read
  `2027-03-15` / `2027-03-19`, and `npm test` fails when a placeholder's year
  is not in the future.

### Added

- `scripts/check-required.mjs`, run from `npm test` and `prepublishOnly`:
  every required field has exactly one hook, the hooks refuse blank values
  and non-dates and pass real ones, and the placeholders are in the future.

## 0.2.3 — 2026-09-09

### Fixed

- **Calls made by this node were not counted as n8n calls.** Every request went
  to `https://api.flightpowers.com` with nothing naming the caller, and the
  FlightPowers backend files a request with no caller name as a direct
  marketplace call. So the node's traffic has been indistinguishable from
  someone calling the RapidAPI listing by hand since the first release: the
  Creator Portal install count said the node was being installed, and nothing
  anywhere said whether it was being used.

  Every request now carries `X-FP-Client: n8n-node/0.2.3`, which the
  FlightPowers front validates and turns into the `_fp_source` and `_fp_tool`
  fields the backend counts. Nothing about a search changes: no new parameter,
  no new option, no change to any request body or response. The header is added
  in one place for the four operations (the node's `requestDefaults`) and once
  more on the credential's "Test connection" probe, which is also a call.

### Added

- `npm test` — a check that the client name matches `package.json`'s version,
  still passes the front's validation, and is actually attached to both the
  node and the credential test. Attribution is a string in a header: a wrong
  one fails no build and no search, it just files calls under a name nobody is
  looking at, which is how the bug above survived three releases. It also runs
  from `prepublishOnly`.

## 0.2.2 — 2026-08

- Stopped presenting one call per country as a rate-parity check. `proxy_country`
  gaps are real but modest, and rates move between identical calls, so the
  README now documents repeat sampling against a pinned property (#3).
- Stopped telling users `sort_type` was broken on one-way searches. It was fixed
  upstream and both flight operations honour it (#2).
- Pointed `author.url` at flightpowers.com rather than the RapidAPI marketplace.

## 0.2.1 — 2026-08-24

- Fixed the defects raised by n8n's community-node review: node description,
  README and parameter placeholders.

## 0.2.0

- Renamed the package to `n8n-nodes-flightpowers` and pointed it at the
  FlightPowers API directly instead of the RapidAPI host (#1).

## 0.1.2 — 2026-08-17

- Fixed the four checks n8n's verification scanner gates on.
- First published version.
