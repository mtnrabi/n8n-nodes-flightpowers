import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

import { flightFields, flightOperations } from './FlightDescription';
import { hotelFields, hotelOperations } from './HotelDescription';

/**
 * Declarative-style node for the FlightPowers travel-data API.
 *
 * Every operation calls https://api.flightpowers.com and authenticates with the
 * `x-api-key` header injected by the credential.
 *
 * Prices returned by these APIs are live and go stale within minutes. Do not
 * cache or reuse an earlier result; re-run the search and record when it ran.
 *
 * This is an independent API that returns publicly available flight and hotel
 * pricing. It is not affiliated with, endorsed by, or sponsored by Google or
 * Booking.com.
 */
export class FlightPowers implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FlightPowers',
		name: 'flightPowers',
		icon: {
			light: 'file:flightPowers.svg',
			dark: 'file:flightPowers.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Search real-time flight fares and hotel prices through the RapidAPI Flight & Hotel Data APIs',
		defaults: {
			name: 'FlightPowers',
		},
		// Cast keeps this source compatible with both the enum-based and the
		// string-literal-union definitions of connection types in n8n-workflow.
		inputs: ['main'] as INodeTypeDescription['inputs'],
		outputs: ['main'] as INodeTypeDescription['outputs'],
		usableAsTool: true,
		credentials: [
			{
				name: 'flightPowersApi',
				required: true,
			},
		],
		requestDefaults: {
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			json: true,
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Flight',
						value: 'flight',
					},
					{
						name: 'Hotel',
						value: 'hotel',
					},
				],
				default: 'flight',
			},
			...flightOperations,
			...flightFields,
			...hotelOperations,
			...hotelFields,
		],
	};
}
