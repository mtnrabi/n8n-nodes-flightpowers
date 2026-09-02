# n8n-nodes-flightpowers

An [n8n](https://n8n.io/) community node for the
[FlightPowers](https://api.flightpowers.com/docs) travel-data API: real-time
flight fares and hotel prices from one vendor, one credential, one node.

One node, two resources, four operations: one-way flight search, round-trip
flight search, hotel destination search, and hotel-by-name lookup.

> **Not affiliated.** This is an independent API that returns publicly
> available flight and hotel pricing. It is not affiliated with, endorsed by,
> or sponsored by Google or Booking.com.

[Installation](#installation) · [Credentials](#credentials) ·
[Operations](#operations) · [Working with the results](#working-with-the-results) ·
[Compatibility](#compatibility) · [Development](#development) · [License](#license)

---

## Installation

Unverified community nodes install on **self-hosted n8n only**. They are not
available on n8n Cloud.

### From the n8n editor

1. Go to **Settings > Community nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-flightpowers`.
4. Agree to the risks of using community nodes and select **Install**.

### Manually

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-flightpowers
```

Restart n8n. The node appears in the nodes panel as **FlightPowers**.

Full n8n guide: <https://docs.n8n.io/integrations/community-nodes/installation-and-management>

---

## Credentials

The node authenticates with a single **FlightPowers API** credential: your API
key, sent as the `x-api-key` header to `https://api.flightpowers.com`.

If you subscribed through the RapidAPI marketplace, use that RapidAPI key here
unchanged — the same key authorises both the flight and the hotel operations,
and your usage stays billed to that subscription.

Saving the credential calls `GET /v1/verify`, which validates the key and
reports remaining quota without running a billable search.

Get a key: <https://api.flightpowers.com/docs>

---

## Operations

### Flight → Search One-Way

`POST https://api.flightpowers.com/v1/flights/oneway`

**Required:** From Airport (IATA), To Airport (IATA), Departure Date
(`YYYY-MM-DD`).

**Options:** Airline Codes, Arrival Time Min/Max, Currency (default `USD`),
Departure Time Min/Max, Exclude Airline Codes, Limit, Max Price, Max Stops,
Passengers, Seat Type, Sort Type, Use External Proxy (default `true`), Use
Fallback (default `false`, slower but better on hard routes).

> **Known API defect, stated rather than hidden:** `sort_type` is accepted by
> the one-way schema but is **not** applied to one-way searches. It does work on
> round-trip. Sort one-way results yourself with a **Sort** node after this one.

### Flight → Search Round-Trip

`POST https://api.flightpowers.com/v1/flights/roundtrip`

**Required:** From Airport, To Airport, Departure Date, Return Date.

**Options:** Currency, Limit, Max Departure Stops, Max Price, Max Return Stops,
Outbound Airline Codes, Outbound Arrival Time Min/Max, Outbound Departure Time
Min/Max, Outbound Exclude Airline Codes, Passengers, Return Airline Codes,
Return Arrival Time Min/Max, Return Departure Time Min/Max, Return Exclude
Airline Codes, Seat Type, Sort Type, Use External Proxy, Use Fallback.

The "Outbound …" options map to the API's `departure_*` parameters; the
"Return …" options map to the `return_*` parameters.

### Hotel → Search Destination

`POST https://api.flightpowers.com/v1/hotels/search`

**Required:** Destination (free text — `Paris`, `Tokyo Shibuya`, `Hilton NYC`),
Check-in Date, Check-out Date.

**Options:** Adults (default `2`), Budget per Night, Children (default `0`),
Currency (default `USD`), Filters, Proxy Country.

**Filters** are picked from a fixed list: Accepts Online Payment, Adults Only,
Air Conditioning, All Inclusive, All Meals Included, Breakfast and Dinner,
Breakfast and Lunch, Breakfast Included, Free Cancellation, Free WiFi, Front
Desk 24h, Gym, Parking, Pets Allowed, Private Bathroom, Review Score 7/8/9,
Sauna, Stars 3/4/5, Swimming Pool, Very Good Breakfast.

### Hotel → Get by Name

`POST https://api.flightpowers.com/v1/hotels/by-name`

**Required:** Hotel Name, Check-in Date, Check-out Date.

**Options:** Adults, Area (disambiguates generic names), Children, Currency,
Free Cancellation, Proxy Country.

When the property is sold out for those dates the API returns
`available: false` with null price fields. **That is a valid answer, not an
error** — branch on `available` with an **If** node rather than treating it as
a failure.

### Field formats

- All dates are plain `YYYY-MM-DD` strings.
- **Airline code** fields take a comma-separated list (`LH,BA`) and are sent as
  a JSON array.
- **Passengers** takes comma-separated type codes, one per traveller:
  `1` adult, `2` child, `3` infant on lap, `4` infant in seat. Two adults and a
  child is `1,1,2`.
- **Seat Type** offers Economy (`1`) and Business (`3`).
- **Limit** follows the n8n convention and pre-fills `50`. Leave the option off
  entirely and the API applies its own default of `10`.
- The time-window options (`departure_time_min`, `departure_arrival_time_max`
  and friends) are passed through to the API unchanged. See the FlightPowers
  API docs for the format those parameters accept.

---

## Working with the results

### Fares go stale in minutes — never cache them

Do not store a fare and reuse it on a later run, and do not build a workflow
that reads a previous execution's price as if it were current. Re-run the
search, and always record and display **when** the data was fetched. A cached
fare is a wrong fare.

### Flight responses

Both flight operations return a **bare JSON array**, so this node emits one n8n
item per itinerary. An empty result is `[]` with **HTTP 200** — that means "no
flights on this route and date", not an error, and it produces zero output
items. Guard downstream branches accordingly (for example with an **If** or
**No Operation** path).

Every one-way item carries, among other fields: `price`, `price_as_number`,
`duration`, `duration_seconds`, `airline`, `stops`, `stops_info`,
`departure_description`, `arrival_description`, `buy_link`.

Round-trip items carry `total_price`, `total_price_as_number`,
`total_duration_seconds`, `total_stops`, `buy_link`, plus per-leg fields
prefixed `departure_flight_*` / `return_flight_*` and the
`departure_stops_info` / `return_stops_info` arrays. Stop entries look like
`{"stop_airport": "AUH", "stop_duration_seconds": 5700}` and the array is empty
for non-stop.

**The fields worth building on:** `price_insights_low`, `price_insights_high`
and `price_range_in_relation_to_other_periods` (`low` | `typical` | `high`).
They are the historical price range for that route and period, which is what
lets a workflow say *"$209 is typical for this route, don't rush"* instead of
just quoting a number.

### Hotel responses

**Search Destination** returns a single object per input item:
`destination`, `checkin_date`, `checkout_date`, `applied_filters`,
`budget_per_night`, and `properties` — an array of
`{name, price_string, price, review_score, review_count, room_type, location,
image_url, link}`. To get one n8n item per property, add a **Split Out** node on
the `properties` field.

**Get by Name** returns one object: `name`, `available`, `price_string`,
`price`, `review_score`, `review_count`, `room_type`, `image_url`, `link`,
`nights`, `adults`, `children`.

### Proxy Country, the option most people miss

`proxy_country` routes the request through a residential proxy in the country
you name (a two-letter code such as `de`, `jp`, `il`), so the same room on the
same dates is priced the way a resident of that country would be quoted it.
That is what makes **rate-parity and geo-pricing monitoring** possible, and it
is a business use case rather than a hobby one.

Two things to build into the workflow, or it will report gaps that are not
there:

- **Sample each country more than once.** Rates move between identical calls. A
  workflow that makes one call per country and diffs the prices will find a
  difference nearly every time, and most of those are the rate moving rather
  than the country. Run the country list three times, treat the spread inside a
  single country as your noise floor, and only report a gap that is larger than
  that floor and points the same way on every pass.
- **Pin the property and the currency.** Use **Get by Name** with a fixed Hotel
  Name and Area, not the first row of a **Search Destination** result: the order
  of `properties` is not stable across identical requests, so row 1 is a
  different hotel from one call to the next. Send the same Currency to every
  country, or you are measuring the FX rate instead of the hotel.

Real gaps are modest and depend on the property. In a controlled test on
2026-08-28, three independent Rome guest houses came back about 4% cheaper from
Japan than from Germany, holding across repeated samples, while a chain hotel
returned the same price from every country tried. "No gap" is a valid result,
not a failed check.

`proxy_country` is an input only. Nothing in the response says which country a
price came from, so carry the country code through the workflow yourself, for
example with a **Set** node alongside the FlightPowers node.

---

## Compatibility

- Requires Node.js **20.15 or newer**, matching current n8n requirements.
- Built as a declarative-style node against `n8n-nodes-api-version 1`.
- **Zero runtime dependencies.** `n8n-workflow` is a peer dependency supplied by
  n8n itself.
- Tested n8n versions: none recorded yet. If you hit an incompatibility, please
  open an issue with your n8n version.

---

## Development

```bash
npm install
npm run lint      # eslint-plugin-n8n-nodes-base, community ruleset
npm run build     # tsc + gulp build:icons -> dist/
```

To try it in a local n8n instance:

```bash
npm run build
npm link
cd ~/.n8n/nodes && npm link n8n-nodes-flightpowers
```

Publishing is handled by `.github/workflows/publish.yml`, which runs on a
GitHub release and publishes with `--provenance`. Register that workflow as a
**Trusted Publisher** in the npm package settings; no npm token is stored in the
repository. Do not publish by hand — n8n's verification process requires a
GitHub Action with a provenance statement.

**Never commit a real key.** The credential field is the only place an API key
belongs; use `YOUR_FLIGHTPOWERS_API_KEY` in docs, issues and screenshots.

---

## Resources

- n8n community nodes documentation: <https://docs.n8n.io/integrations/community-nodes/>
- FlightPowers API docs: <https://api.flightpowers.com/docs>
- Buy a key on the RapidAPI marketplace — flights:
  <https://rapidapi.com/mtnrabi/api/google-flights-live-api>
- Buy a key on the RapidAPI marketplace — hotels:
  <https://rapidapi.com/mtnrabi/api/booking-live-api>

## License

[MIT](LICENSE)
