#!/usr/bin/env node
/**
 * The one thing about this package that can rot silently.
 *
 * Attribution is a string in a header. Nothing about a wrong string fails a
 * build, a lint or a search: the request still returns fares, and the call is
 * simply filed under a name nobody is looking at. Between 0.1.0 and 0.2.2 the
 * name was absent entirely and nobody noticed for weeks, which is the whole
 * reason this file exists.
 *
 * So the three ways it can go wrong are checked here, against the built `dist`
 * rather than the TypeScript source, because `dist` is what n8n loads:
 *
 *   1. `CLIENT_NAME` drifts away from `package.json`'s `version` on a release.
 *   2. The name stops being a value the FlightPowers front will accept, and is
 *      dropped in favour of `api-front` -- an anonymous call wearing a name.
 *   3. Somebody removes the header from the node or the credential test.
 *
 * Run with `npm test` (which builds first).
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const failures = [];
const check = (ok, message) => {
	if (!ok) failures.push(message);
};

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const { CLIENT_HEADER, CLIENT_NAME } = require('../dist/nodes/FlightPowers/attribution.js');

// 1. The version half of the name is the release it was published as.
check(
	CLIENT_NAME === `n8n-node/${pkg.version}`,
	`CLIENT_NAME is "${CLIENT_NAME}" but package.json says version ${pkg.version}. ` +
		'Bump nodes/FlightPowers/attribution.ts in the same commit as the version, or ' +
		'releases get filed under the previous one.',
);

// 2. The front's own validation, copied from its source. A name that fails it is
//    not cleaned up, it is replaced by `api-front`, so this has to hold exactly.
check(CLIENT_NAME.length <= 32, `CLIENT_NAME is ${CLIENT_NAME.length} characters; the front caps at 32.`);
check(
	/^[a-z0-9][a-z0-9._/-]*$/.test(CLIENT_NAME),
	`CLIENT_NAME "${CLIENT_NAME}" is not a plain token. The front accepts lower-case ` +
		'letters, digits, dash, dot, underscore and slash, starting with a letter or digit.',
);

// 3. The header is actually attached, in both places that make a request.
const { FlightPowers } = require('../dist/nodes/FlightPowers/FlightPowers.node.js');
const nodeHeaders = new FlightPowers().description.requestDefaults?.headers ?? {};
check(
	nodeHeaders[CLIENT_HEADER] === CLIENT_NAME,
	`The node's requestDefaults do not send ${CLIENT_HEADER}: ${CLIENT_NAME}. ` +
		'Every flight and hotel search would be counted as an anonymous marketplace call.',
);

const { FlightPowersApi } = require('../dist/credentials/FlightPowersApi.credentials.js');
const testHeaders = new FlightPowersApi().test?.request?.headers ?? {};
check(
	testHeaders[CLIENT_HEADER] === CLIENT_NAME,
	`The credential test request does not send ${CLIENT_HEADER}: ${CLIENT_NAME}. ` +
		'Every "Test connection" click would be counted as an anonymous marketplace call.',
);

// A declarative node routes through `requestDefaults`, so a `body` written here
// would reach the front -- where `_fp_source` and `_fp_tool` are overwritten.
// Sending them would look like attribution and do nothing. See attribution.ts.
const defaultBody = new FlightPowers().description.requestDefaults?.body;
check(
	defaultBody === undefined ||
		(typeof defaultBody === 'object' &&
			!('_fp_source' in defaultBody) &&
			!('_fp_tool' in defaultBody)),
	'requestDefaults.body sets _fp_source or _fp_tool. The front overwrites both; ' +
		'the caller names itself in the X-FP-Client header instead.',
);

if (failures.length > 0) {
	console.error('Attribution check FAILED:\n');
	for (const failure of failures) console.error(`  - ${failure}\n`);
	process.exit(1);
}

console.log(`Attribution check passed: ${CLIENT_HEADER}: ${CLIENT_NAME}`);
console.log('  - node requestDefaults, credential test request');
console.log(`  - matches package.json version ${pkg.version}`);
console.log("  - passes the front's client-name validation");
