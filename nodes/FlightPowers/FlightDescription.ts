import type { INodeProperties } from 'n8n-workflow';

const FLIGHTS_BASE = 'https://api.flightpowers.com';

// Comma-separated user input -> JSON array of trimmed strings.
const CSV_TO_STRING_ARRAY =
	'={{ $value.split(",").map(item => item.trim()).filter(item => item !== "") }}';

// Comma-separated user input -> JSON array of numbers.
const CSV_TO_NUMBER_ARRAY =
	'={{ $value.split(",").map(item => Number(item.trim())).filter(item => !isNaN(item)) }}';

const PASSENGERS_DESCRIPTION =
	'Comma-separated passenger type codes, one entry per traveller. 1 = adult, 2 = child, 3 = infant on lap, 4 = infant in seat. Example: 1,1,2 for two adults and one child.';

const SEAT_TYPE_OPTIONS = [
	{ name: 'Economy', value: 1 },
	{ name: 'Business', value: 3 },
];

const SORT_TYPE_OPTIONS = [
	{ name: 'Overall', value: 'Overall' },
	{ name: 'Price', value: 'Price' },
	{ name: 'Duration', value: 'Duration' },
];

export const flightOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['flight'],
			},
		},
		options: [
			{
				name: 'Search One-Way',
				value: 'searchOneWay',
				description: 'Search live one-way fares for one route and one departure date',
				action: 'Search one way flights',
				routing: {
					request: {
						method: 'POST',
						url: `${FLIGHTS_BASE}/v1/flights/oneway`,
					},
				},
			},
			{
				name: 'Search Round-Trip',
				value: 'searchRoundTrip',
				description: 'Search live round-trip fares for one route, one departure date and one return date',
				action: 'Search round trip flights',
				routing: {
					request: {
						method: 'POST',
						url: `${FLIGHTS_BASE}/v1/flights/roundtrip`,
					},
				},
			},
		],
		default: 'searchOneWay',
	},
];

export const flightFields: INodeProperties[] = [
	// ---------------------------------------------------------------------
	//                        flight: shared required fields
	// ---------------------------------------------------------------------
	{
		displayName: 'From Airport',
		name: 'from_airport',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. BER',
		description: 'Origin airport IATA code',
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['searchOneWay', 'searchRoundTrip'],
			},
		},
		routing: {
			send: { type: 'body', property: 'from_airport' },
		},
	},
	{
		displayName: 'To Airport',
		name: 'to_airport',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. CDG',
		description: 'Destination airport IATA code',
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['searchOneWay', 'searchRoundTrip'],
			},
		},
		routing: {
			send: { type: 'body', property: 'to_airport' },
		},
	},
	{
		displayName: 'Departure Date',
		name: 'departure_date',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 2026-06-15',
		description: 'Outbound date in YYYY-MM-DD format',
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['searchOneWay', 'searchRoundTrip'],
			},
		},
		routing: {
			send: { type: 'body', property: 'departure_date' },
		},
	},
	{
		displayName: 'Return Date',
		name: 'return_date',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 2026-06-19',
		description: 'Return date in YYYY-MM-DD format',
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['searchRoundTrip'],
			},
		},
		routing: {
			send: { type: 'body', property: 'return_date' },
		},
	},

	// ---------------------------------------------------------------------
	//                        flight:searchOneWay options
	// ---------------------------------------------------------------------
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['searchOneWay'],
			},
		},
		options: [
			{
				displayName: 'Airline Codes',
				name: 'airline_codes',
				type: 'string',
				default: '',
				placeholder: 'e.g. LH,BA',
				description:
					'Comma-separated airline codes to restrict the search to. Sent as the airline_codes array.',
				routing: {
					send: { type: 'body', property: 'airline_codes', value: CSV_TO_STRING_ARRAY },
				},
			},
			{
				displayName: 'Arrival Time Max',
				name: 'departure_arrival_time_max',
				type: 'string',
				default: '',
				description:
					'Latest acceptable arrival time. Maps to the departure_arrival_time_max parameter and is passed through unchanged; see the FlightPowers API docs for the accepted format.',
				routing: {
					send: { type: 'body', property: 'departure_arrival_time_max' },
				},
			},
			{
				displayName: 'Arrival Time Min',
				name: 'departure_arrival_time_min',
				type: 'string',
				default: '',
				description:
					'Earliest acceptable arrival time. Maps to the departure_arrival_time_min parameter and is passed through unchanged; see the FlightPowers API docs for the accepted format.',
				routing: {
					send: { type: 'body', property: 'departure_arrival_time_min' },
				},
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: 'USD',
				description: 'Currency the fares are returned in. API default is USD.',
				routing: {
					send: { type: 'body', property: 'currency' },
				},
			},
			{
				displayName: 'Departure Time Max',
				name: 'departure_time_max',
				type: 'string',
				default: '',
				description:
					'Latest acceptable departure time. Maps to the departure_time_max parameter and is passed through unchanged; see the FlightPowers API docs for the accepted format.',
				routing: {
					send: { type: 'body', property: 'departure_time_max' },
				},
			},
			{
				displayName: 'Departure Time Min',
				name: 'departure_time_min',
				type: 'string',
				default: '',
				description:
					'Earliest acceptable departure time. Maps to the departure_time_min parameter and is passed through unchanged; see the FlightPowers API docs for the accepted format.',
				routing: {
					send: { type: 'body', property: 'departure_time_min' },
				},
			},
			{
				displayName: 'Exclude Airline Codes',
				name: 'exclude_airline_codes',
				type: 'string',
				default: '',
				placeholder: 'e.g. FR,W6',
				description:
					'Comma-separated airline codes to exclude. Sent as the exclude_airline_codes array.',
				routing: {
					send: { type: 'body', property: 'exclude_airline_codes', value: CSV_TO_STRING_ARRAY },
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				routing: {
					send: { type: 'body', property: 'limit' },
				},
			},
			{
				displayName: 'Max Price',
				name: 'max_price',
				type: 'number',
				default: 0,
				description: 'Drop itineraries priced above this value, in the selected currency',
				routing: {
					send: { type: 'body', property: 'max_price' },
				},
			},
			{
				displayName: 'Max Stops',
				name: 'max_stops',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description: 'Maximum number of stops. 0 means non-stop only.',
				routing: {
					send: { type: 'body', property: 'max_stops' },
				},
			},
			{
				displayName: 'Passengers',
				name: 'passengers',
				type: 'string',
				default: '',
				placeholder: 'e.g. 1,1,2',
				description: PASSENGERS_DESCRIPTION,
				routing: {
					send: { type: 'body', property: 'passengers', value: CSV_TO_NUMBER_ARRAY },
				},
			},
			{
				displayName: 'Seat Type',
				name: 'seat_type',
				type: 'options',
				options: SEAT_TYPE_OPTIONS,
				default: 1,
				description: 'Cabin class to search',
				routing: {
					send: { type: 'body', property: 'seat_type' },
				},
			},
			{
				displayName: 'Sort Type',
				name: 'sort_type',
				type: 'options',
				options: SORT_TYPE_OPTIONS,
				default: 'Overall',
				description:
					'Known API defect: sort_type is accepted by the one-way schema but is NOT applied to one-way searches. It does work on round-trip. Sort one-way results yourself with a Sort node.',
				routing: {
					send: { type: 'body', property: 'sort_type' },
				},
			},
			{
				displayName: 'Use External Proxy',
				name: 'use_ext_proxy',
				type: 'boolean',
				default: true,
				description: 'Whether to route the upstream request through an external proxy. API default is true.',
				routing: {
					send: { type: 'body', property: 'use_ext_proxy' },
				},
			},
			{
				displayName: 'Use Fallback',
				name: 'use_fallback',
				type: 'boolean',
				default: false,
				description:
					'Whether to use the fallback collection path. Slower, but better on hard routes. API default is false.',
				routing: {
					send: { type: 'body', property: 'use_fallback' },
				},
			},
		],
	},

	// ---------------------------------------------------------------------
	//                       flight:searchRoundTrip options
	// ---------------------------------------------------------------------
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['searchRoundTrip'],
			},
		},
		options: [
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: 'USD',
				description: 'Currency the fares are returned in. API default is USD.',
				routing: {
					send: { type: 'body', property: 'currency' },
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				routing: {
					send: { type: 'body', property: 'limit' },
				},
			},
			{
				displayName: 'Max Departure Stops',
				name: 'max_departure_stops',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description: 'Maximum number of stops on the outbound leg. 0 means non-stop only.',
				routing: {
					send: { type: 'body', property: 'max_departure_stops' },
				},
			},
			{
				displayName: 'Max Price',
				name: 'max_price',
				type: 'number',
				default: 0,
				description: 'Drop itineraries priced above this value, in the selected currency',
				routing: {
					send: { type: 'body', property: 'max_price' },
				},
			},
			{
				displayName: 'Max Return Stops',
				name: 'max_return_stops',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description: 'Maximum number of stops on the return leg. 0 means non-stop only.',
				routing: {
					send: { type: 'body', property: 'max_return_stops' },
				},
			},
			{
				displayName: 'Outbound Airline Codes',
				name: 'departure_airline_codes',
				type: 'string',
				default: '',
				placeholder: 'e.g. LH,BA',
				description:
					'Comma-separated airline codes for the outbound leg. Sent as the departure_airline_codes array.',
				routing: {
					send: { type: 'body', property: 'departure_airline_codes', value: CSV_TO_STRING_ARRAY },
				},
			},
			{
				displayName: 'Outbound Arrival Time Max',
				name: 'departure_arrival_time_max',
				type: 'string',
				default: '',
				description:
					'Latest acceptable outbound arrival time. Maps to departure_arrival_time_max and is passed through unchanged; see the FlightPowers API docs for the accepted format.',
				routing: {
					send: { type: 'body', property: 'departure_arrival_time_max' },
				},
			},
			{
				displayName: 'Outbound Arrival Time Min',
				name: 'departure_arrival_time_min',
				type: 'string',
				default: '',
				description:
					'Earliest acceptable outbound arrival time. Maps to departure_arrival_time_min and is passed through unchanged; see the FlightPowers API docs for the accepted format.',
				routing: {
					send: { type: 'body', property: 'departure_arrival_time_min' },
				},
			},
			{
				displayName: 'Outbound Departure Time Max',
				name: 'departure_departure_time_max',
				type: 'string',
				default: '',
				description:
					'Latest acceptable outbound departure time. Maps to departure_departure_time_max and is passed through unchanged; see the FlightPowers API docs for the accepted format.',
				routing: {
					send: { type: 'body', property: 'departure_departure_time_max' },
				},
			},
			{
				displayName: 'Outbound Departure Time Min',
				name: 'departure_departure_time_min',
				type: 'string',
				default: '',
				description:
					'Earliest acceptable outbound departure time. Maps to departure_departure_time_min and is passed through unchanged; see the FlightPowers API docs for the accepted format.',
				routing: {
					send: { type: 'body', property: 'departure_departure_time_min' },
				},
			},
			{
				displayName: 'Outbound Exclude Airline Codes',
				name: 'departure_exclude_airline_codes',
				type: 'string',
				default: '',
				placeholder: 'e.g. FR,W6',
				description:
					'Comma-separated airline codes to exclude on the outbound leg. Sent as the departure_exclude_airline_codes array.',
				routing: {
					send: {
						type: 'body',
						property: 'departure_exclude_airline_codes',
						value: CSV_TO_STRING_ARRAY,
					},
				},
			},
			{
				displayName: 'Passengers',
				name: 'passengers',
				type: 'string',
				default: '',
				placeholder: 'e.g. 1,1,2',
				description: PASSENGERS_DESCRIPTION,
				routing: {
					send: { type: 'body', property: 'passengers', value: CSV_TO_NUMBER_ARRAY },
				},
			},
			{
				displayName: 'Return Airline Codes',
				name: 'return_airline_codes',
				type: 'string',
				default: '',
				placeholder: 'e.g. LH,BA',
				description:
					'Comma-separated airline codes for the return leg. Sent as the return_airline_codes array.',
				routing: {
					send: { type: 'body', property: 'return_airline_codes', value: CSV_TO_STRING_ARRAY },
				},
			},
			{
				displayName: 'Return Arrival Time Max',
				name: 'return_arrival_time_max',
				type: 'string',
				default: '',
				description:
					'Latest acceptable return arrival time. Maps to return_arrival_time_max and is passed through unchanged; see the FlightPowers API docs for the accepted format.',
				routing: {
					send: { type: 'body', property: 'return_arrival_time_max' },
				},
			},
			{
				displayName: 'Return Arrival Time Min',
				name: 'return_arrival_time_min',
				type: 'string',
				default: '',
				description:
					'Earliest acceptable return arrival time. Maps to return_arrival_time_min and is passed through unchanged; see the FlightPowers API docs for the accepted format.',
				routing: {
					send: { type: 'body', property: 'return_arrival_time_min' },
				},
			},
			{
				displayName: 'Return Departure Time Max',
				name: 'return_departure_time_max',
				type: 'string',
				default: '',
				description:
					'Latest acceptable return departure time. Maps to return_departure_time_max and is passed through unchanged; see the FlightPowers API docs for the accepted format.',
				routing: {
					send: { type: 'body', property: 'return_departure_time_max' },
				},
			},
			{
				displayName: 'Return Departure Time Min',
				name: 'return_departure_time_min',
				type: 'string',
				default: '',
				description:
					'Earliest acceptable return departure time. Maps to return_departure_time_min and is passed through unchanged; see the FlightPowers API docs for the accepted format.',
				routing: {
					send: { type: 'body', property: 'return_departure_time_min' },
				},
			},
			{
				displayName: 'Return Exclude Airline Codes',
				name: 'return_exclude_airline_codes',
				type: 'string',
				default: '',
				placeholder: 'e.g. FR,W6',
				description:
					'Comma-separated airline codes to exclude on the return leg. Sent as the return_exclude_airline_codes array.',
				routing: {
					send: {
						type: 'body',
						property: 'return_exclude_airline_codes',
						value: CSV_TO_STRING_ARRAY,
					},
				},
			},
			{
				displayName: 'Seat Type',
				name: 'seat_type',
				type: 'options',
				options: SEAT_TYPE_OPTIONS,
				default: 1,
				description: 'Cabin class to search',
				routing: {
					send: { type: 'body', property: 'seat_type' },
				},
			},
			{
				displayName: 'Sort Type',
				name: 'sort_type',
				type: 'options',
				options: SORT_TYPE_OPTIONS,
				default: 'Overall',
				description: 'How the API sorts the returned itineraries',
				routing: {
					send: { type: 'body', property: 'sort_type' },
				},
			},
			{
				displayName: 'Use External Proxy',
				name: 'use_ext_proxy',
				type: 'boolean',
				default: true,
				description: 'Whether to route the upstream request through an external proxy. API default is true.',
				routing: {
					send: { type: 'body', property: 'use_ext_proxy' },
				},
			},
			{
				displayName: 'Use Fallback',
				name: 'use_fallback',
				type: 'boolean',
				default: false,
				description:
					'Whether to use the fallback collection path. Slower, but better on hard routes. API default is false.',
				routing: {
					send: { type: 'body', property: 'use_fallback' },
				},
			},
		],
	},
];
