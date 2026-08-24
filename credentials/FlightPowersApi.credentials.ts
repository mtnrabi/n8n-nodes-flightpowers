import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

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
				'Your FlightPowers API key, sent as the x-api-key header. If you subscribed through RapidAPI, use that RapidAPI key here; the same key covers both the flight and the hotel operations.',
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
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.flightpowers.com',
			url: '/v1/verify',
			method: 'GET',
		},
	};
}
