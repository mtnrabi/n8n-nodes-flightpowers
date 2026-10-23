import type { INodeProperties } from 'n8n-workflow';

import { DATE_EXAMPLE, requireField } from './validation';

const AIRBNB_BASE = 'https://api.flightpowers.com';

/**
 * Airbnb is served by the same `/v1/hotels/search` route as Booking.com; the
 * FlightPowers front picks the source from the `provider` body field and bills
 * the call to the caller's Airbnb Live API subscription on RapidAPI. It is its
 * own resource here, not a switch on the Hotel resource, because the two share
 * almost no filters: Booking's `filters` list is refused on an Airbnb search,
 * and Airbnb's bedroom / room-type / rating filters mean nothing to Booking.
 */
const HOW_TO_FILL_AIRBNB =
	'Fill in Destination, Check-In Date and Check-Out Date, as fixed values or as ' +
	'expressions that resolve to a value for this item. Dates are YYYY-MM-DD, for example ' +
	DATE_EXAMPLE +
	'. No request was sent and nothing was charged to your plan.';

/** Airbnb's own room-type vocabulary. Any other value is refused by the API with a 400. */
const ROOM_TYPE_OPTIONS = [
	{ name: 'Entire Home/Apt', value: 'Entire home/apt' },
	{ name: 'Hotel Room', value: 'Hotel room' },
	{ name: 'Private Room', value: 'Private room' },
	{ name: 'Shared Room', value: 'Shared room' },
];

const SORT_OPTIONS = [
	{ name: 'Price, High to Low', value: 'price_desc' },
	{ name: 'Price, Low to High', value: 'price_asc' },
	{ name: 'Rating, High to Low', value: 'rating_desc' },
];

const SHOW = {
	show: {
		resource: ['airbnb'],
		operation: ['searchStays'],
	},
};

export const airbnbOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['airbnb'],
			},
		},
		options: [
			{
				name: 'Search Stays',
				value: 'searchStays',
				description: 'Search live Airbnb listings and prices at a destination',
				action: 'Search airbnb stays at a destination',
				routing: {
					request: {
						method: 'POST',
						url: `${AIRBNB_BASE}/v1/hotels/search`,
						body: {
							provider: 'airbnb',
						},
					},
				},
			},
		],
		default: 'searchStays',
	},
];

export const airbnbFields: INodeProperties[] = [
	// ---------------------------------------------------------------------
	//                      airbnb:searchStays required
	// ---------------------------------------------------------------------
	{
		displayName: 'Destination',
		name: 'destination',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Rome, Italy',
		description:
			'City or area, for example Rome, Italy or Lisbon. A place Airbnb does not recognise returns no listings rather than an error. An empty value stops the node before any request is sent.',
		displayOptions: SHOW,
		routing: {
			send: {
				type: 'body',
				property: 'destination',
				preSend: [requireField('destination', 'Destination', 'text', HOW_TO_FILL_AIRBNB)],
			},
		},
	},
	{
		displayName: 'Check-In Date',
		name: 'checkin_date',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 2027-06-15',
		description:
			'Check-in date in YYYY-MM-DD format. An empty value or a date that does not exist stops the node before any request is sent.',
		displayOptions: SHOW,
		routing: {
			send: {
				type: 'body',
				property: 'checkin_date',
				preSend: [requireField('checkin_date', 'Check-In Date', 'date', HOW_TO_FILL_AIRBNB)],
			},
		},
	},
	{
		displayName: 'Check-Out Date',
		name: 'checkout_date',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 2027-06-18',
		description:
			'Check-out date in YYYY-MM-DD format. An empty value or a date that does not exist stops the node before any request is sent.',
		displayOptions: SHOW,
		routing: {
			send: {
				type: 'body',
				property: 'checkout_date',
				preSend: [requireField('checkout_date', 'Check-Out Date', 'date', HOW_TO_FILL_AIRBNB)],
			},
		},
	},

	// ---------------------------------------------------------------------
	//                       airbnb:searchStays options
	// ---------------------------------------------------------------------
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: SHOW,
		options: [
			{
				displayName: 'Adults',
				name: 'adults',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 2,
				description: 'Number of adults',
				routing: {
					send: { type: 'body', property: 'adults' },
				},
			},
			{
				displayName: 'Children',
				name: 'children',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description: 'Number of children',
				routing: {
					send: { type: 'body', property: 'children' },
				},
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: 'USD',
				description: 'Currency the prices are returned in. API default is USD.',
				routing: {
					send: { type: 'body', property: 'currency' },
				},
			},
			{
				displayName: 'Infants',
				name: 'infants',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description: 'Number of infants',
				routing: {
					send: { type: 'body', property: 'infants' },
				},
			},
			{
				displayName: 'Max Price per Night',
				name: 'price_max',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description:
					'Highest price PER NIGHT, in the selected currency. Applied by Airbnb itself, before the results page is built.',
				routing: {
					send: { type: 'body', property: 'price_max' },
				},
			},
			{
				displayName: 'Min Bathrooms',
				name: 'min_bathrooms',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 1,
				description: 'Fewest bathrooms a listing may have',
				routing: {
					send: { type: 'body', property: 'min_bathrooms' },
				},
			},
			{
				displayName: 'Min Bedrooms',
				name: 'min_bedrooms',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 1,
				description: 'Fewest bedrooms a listing may have',
				routing: {
					send: { type: 'body', property: 'min_bedrooms' },
				},
			},
			{
				displayName: 'Min Beds',
				name: 'min_beds',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 1,
				description: 'Fewest beds a listing may have',
				routing: {
					send: { type: 'body', property: 'min_beds' },
				},
			},
			{
				displayName: 'Min Price per Night',
				name: 'price_min',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description: 'Lowest price PER NIGHT, in the selected currency',
				routing: {
					send: { type: 'body', property: 'price_min' },
				},
			},
			{
				displayName: 'Min Rating',
				name: 'min_rating',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 5, numberPrecision: 2 },
				default: 4.5,
				description:
					'Lowest guest rating, 0 to 5 (Airbnb rates out of 5). Listings with no rating yet are left out when this is set. Applied to the returned page of results.',
				routing: {
					send: { type: 'body', property: 'min_rating' },
				},
			},
			{
				displayName: 'Pets',
				name: 'pets',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description: 'Number of pets coming along',
				routing: {
					send: { type: 'body', property: 'pets' },
				},
			},
			{
				displayName: 'Room Types',
				name: 'room_types',
				type: 'multiOptions',
				options: ROOM_TYPE_OPTIONS,
				default: [],
				description: 'Only return these kinds of listing. Leave empty for every kind.',
				routing: {
					send: { type: 'body', property: 'room_types' },
				},
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				options: SORT_OPTIONS,
				default: 'price_asc',
				description:
					"Order of the returned listings. Airbnb has no sort control of its own, so this orders the page of results the search returned; without it the listings come back in Airbnb's relevance order.",
				routing: {
					send: { type: 'body', property: 'sort' },
				},
			},
		],
	},
];
