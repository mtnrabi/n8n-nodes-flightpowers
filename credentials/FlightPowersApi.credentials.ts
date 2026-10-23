import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

import { CLIENT_NAME } from '../nodes/FlightPowers/attribution';

/**
 * A single FlightPowers API key authenticates every operation in this node.
 *
 * All requests go to the FlightPowers API at https://api.flightpowers.com and
 * are authenticated with the `x-api-key` header.
 *
 * FlightPowers distributes the same key through the RapidAPI marketplace, so a
 * RapidAPI subscription key for the FlightPowers APIs works here unchanged, and
 * usage stays billed to that subscription.
 */
export class FlightPowersApi implements ICredentialType {
	name = 'flightPowersApi';

	displayName = 'FlightPowers API';

	icon: Icon = {
		light: 'file:flightPowersApi.svg',
		dark: 'file:flightPowersApi.dark.svg',
	};

	documentationUrl = 'https://api.flightpowers.com/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your FlightPowers API key, sent as the x-api-key header. If you subscribed through RapidAPI, use that RapidAPI key here; one key covers every operation, as long as it is subscribed to the listing behind it: Google Flights Live API for flights, Booking Live API for hotels, Airbnb Live API for Airbnb stays (BASIC is free, 100 searches a month).',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	/**
	 * `GET /v1/verify` exists for exactly this purpose: it validates the key and
	 * reports remaining quota without running a billable flight or hotel search.
	 * A wrong or missing key returns 401 before anything reaches the backend.
	 *
	 * It carries `X-FP-Client` for the same reason the four operations do: the
	 * front forwards `/v1/verify` upstream as a POST and attributes it, so a
	 * "Test connection" click without the header is counted as an anonymous
	 * marketplace call rather than as an n8n user setting the node up.
	 *
	 * Known gap: `/v1/verify` asks the flights and Booking listings only, so a
	 * key subscribed to the Airbnb Live API and nothing else fails this test
	 * while its Airbnb searches work. The README says so; the fix belongs in
	 * the front's verify handler, not here.
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.flightpowers.com',
			url: '/v1/verify',
			method: 'GET',
			headers: {
				'X-FP-Client': CLIENT_NAME,
			},
		},
	};
}
