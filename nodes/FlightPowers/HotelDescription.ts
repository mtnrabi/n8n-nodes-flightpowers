import type { INodeProperties } from 'n8n-workflow';

const HOTELS_BASE = 'https://api.flightpowers.com';

const PROXY_COUNTRY_DESCRIPTION =
	'Two-letter country code. Routes the request through a residential proxy in that country, so the same hotel and dates are priced the way a user in that country would see them. Useful for rate-parity and geo-pricing checks.';

const FILTER_OPTIONS = [
	{ name: 'Accepts Online Payment', value: 'accepts_online_payment' },
	{ name: 'Adults Only', value: 'adults_only' },
	{ name: 'Air Conditioning', value: 'air_conditioning' },
	{ name: 'All Inclusive', value: 'all_inclusive' },
	{ name: 'All Meals Included', value: 'all_meals_included' },
	{ name: 'Breakfast and Dinner', value: 'breakfast_and_dinner' },
	{ name: 'Breakfast and Lunch', value: 'breakfast_and_lunch' },
	{ name: 'Breakfast Included', value: 'breakfast_included' },
	{ name: 'Free Cancellation', value: 'free_cancellation' },
	{ name: 'Free WiFi', value: 'free_wifi' },
	{ name: 'Front Desk 24h', value: 'front_desk_24h' },
	{ name: 'Gym', value: 'gym' },
	{ name: 'Parking', value: 'parking' },
	{ name: 'Pets Allowed', value: 'pets_allowed' },
	{ name: 'Private Bathroom', value: 'private_bathroom' },
	{ name: 'Review Score 7', value: 'review_score_7' },
	{ name: 'Review Score 8', value: 'review_score_8' },
	{ name: 'Review Score 9', value: 'review_score_9' },
	{ name: 'Sauna', value: 'sauna' },
	{ name: 'Stars 3', value: 'stars_3' },
	{ name: 'Stars 4', value: 'stars_4' },
	{ name: 'Stars 5', value: 'stars_5' },
	{ name: 'Swimming Pool', value: 'swimming_pool' },
	{ name: 'Very Good Breakfast', value: 'very_good_breakfast' },
];

export const hotelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['hotel'],
			},
		},
		options: [
			{
				name: 'Search Destination',
				value: 'searchDestination',
				description: 'Search live availability and prices for properties at a destination',
				action: 'Search hotels at a destination',
				routing: {
					request: {
						method: 'POST',
						url: `${HOTELS_BASE}/v1/hotels/search`,
					},
				},
			},
			{
				name: 'Get by Name',
				value: 'getByName',
				description: 'Get live availability and price for one named hotel',
				action: 'Get a hotel by name',
				routing: {
					request: {
						method: 'POST',
						url: `${HOTELS_BASE}/v1/hotels/by-name`,
					},
				},
			},
		],
		default: 'searchDestination',
	},
];

export const hotelFields: INodeProperties[] = [
	// ---------------------------------------------------------------------
	//                      hotel:searchDestination required
	// ---------------------------------------------------------------------
	{
		displayName: 'Destination',
		name: 'destination',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'Paris',
		description:
			'Free-text destination, for example Paris, Tokyo Shibuya, or Hilton NYC',
		displayOptions: {
			show: {
				resource: ['hotel'],
				operation: ['searchDestination'],
			},
		},
		routing: {
			send: { type: 'body', property: 'destination' },
		},
	},

	// ---------------------------------------------------------------------
	//                        hotel:getByName required
	// ---------------------------------------------------------------------
	{
		displayName: 'Hotel Name',
		name: 'hotel_name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'Hotel Le Meurice',
		description: 'Name of the property to look up',
		displayOptions: {
			show: {
				resource: ['hotel'],
				operation: ['getByName'],
			},
		},
		routing: {
			send: { type: 'body', property: 'hotel_name' },
		},
	},

	// ---------------------------------------------------------------------
	//                        hotel: shared required dates
	// ---------------------------------------------------------------------
	{
		displayName: 'Check-In Date',
		name: 'checkin_date',
		type: 'string',
		required: true,
		default: '',
		placeholder: '2026-06-15',
		description: 'Check-in date in YYYY-MM-DD format',
		displayOptions: {
			show: {
				resource: ['hotel'],
				operation: ['searchDestination', 'getByName'],
			},
		},
		routing: {
			send: { type: 'body', property: 'checkin_date' },
		},
	},
	{
		displayName: 'Check-Out Date',
		name: 'checkout_date',
		type: 'string',
		required: true,
		default: '',
		placeholder: '2026-06-19',
		description: 'Check-out date in YYYY-MM-DD format',
		displayOptions: {
			show: {
				resource: ['hotel'],
				operation: ['searchDestination', 'getByName'],
			},
		},
		routing: {
			send: { type: 'body', property: 'checkout_date' },
		},
	},

	// ---------------------------------------------------------------------
	//                      hotel:searchDestination options
	// ---------------------------------------------------------------------
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['hotel'],
				operation: ['searchDestination'],
			},
		},
		options: [
			{
				displayName: 'Adults',
				name: 'adults',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 2,
				description: 'Number of adults. API default is 2.',
				routing: {
					send: { type: 'body', property: 'adults' },
				},
			},
			{
				displayName: 'Budget per Night',
				name: 'budget_per_night',
				type: 'number',
				default: 0,
				description: 'Nightly budget cap, in the selected currency',
				routing: {
					send: { type: 'body', property: 'budget_per_night' },
				},
			},
			{
				displayName: 'Children',
				name: 'children',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description: 'Number of children. API default is 0.',
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
				displayName: 'Filters',
				name: 'filters',
				type: 'multiOptions',
				options: FILTER_OPTIONS,
				default: [],
				description: 'Property filters to apply to the search',
				routing: {
					send: { type: 'body', property: 'filters' },
				},
			},
			{
				displayName: 'Proxy Country',
				name: 'proxy_country',
				type: 'string',
				default: '',
				placeholder: 'de',
				description: PROXY_COUNTRY_DESCRIPTION,
				routing: {
					send: { type: 'body', property: 'proxy_country' },
				},
			},
		],
	},

	// ---------------------------------------------------------------------
	//                         hotel:getByName options
	// ---------------------------------------------------------------------
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['hotel'],
				operation: ['getByName'],
			},
		},
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
				displayName: 'Area',
				name: 'area',
				type: 'string',
				default: '',
				placeholder: 'Paris',
				description: 'Area or city used to disambiguate a generic hotel name',
				routing: {
					send: { type: 'body', property: 'area' },
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
				description: 'Currency the price is returned in',
				routing: {
					send: { type: 'body', property: 'currency' },
				},
			},
			{
				displayName: 'Free Cancellation',
				name: 'free_cancellation',
				type: 'boolean',
				default: false,
				description: 'Whether to restrict the result to free-cancellation rates',
				routing: {
					send: { type: 'body', property: 'free_cancellation' },
				},
			},
			{
				displayName: 'Proxy Country',
				name: 'proxy_country',
				type: 'string',
				default: '',
				placeholder: 'de',
				description: PROXY_COUNTRY_DESCRIPTION,
				routing: {
					send: { type: 'body', property: 'proxy_country' },
				},
			},
		],
	},
];
