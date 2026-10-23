#!/usr/bin/env node
/**
 * The required fields are checked before a request exists, or not at all.
 *
 * `required: true` is an editor decoration; the hook in
 * nodes/FlightPowers/validation.ts is what stops an empty origin, destination
 * or date from becoming a billed 422 (see the comment there for the 2026-09-28
 * incident). Like the attribution header, a missing hook fails no build and no
 * search -- the request simply goes out with `""` in it -- so it is checked
 * here against the built `dist`, which is what n8n loads.
 *
 * Run with `npm test` (which builds first).
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const failures = [];
const check = (ok, message) => {
	if (!ok) failures.push(message);
};

const { FlightPowers } = require('../dist/nodes/FlightPowers/FlightPowers.node.js');
const { isRealCalendarDate } = require('../dist/nodes/FlightPowers/validation.js');
const properties = new FlightPowers().description.properties;

const REQUIRED = [
	['flight', 'from_airport', 'text'],
	['flight', 'to_airport', 'text'],
	['flight', 'departure_date', 'date'],
	['flight', 'return_date', 'date'],
	['airbnb', 'destination', 'text'],
	['airbnb', 'checkin_date', 'date'],
	['airbnb', 'checkout_date', 'date'],
];

// Several resources reuse a parameter name (`destination`, `checkin_date`), so a
// property is looked up by name AND by the resource it is shown for.
const shownFor = (p, resource) => (p.displayOptions?.show?.resource ?? []).includes(resource);
const findProperty = (resource, name) =>
	properties.find((p) => p.name === name && shownFor(p, resource));

// A stand-in for n8n's IExecuteSingleFunctions: the hook reads one parameter,
// the node and the item index, nothing else.
const context = (value) => ({
	getNodeParameter: () => value,
	getNode: () => ({ name: 'FlightPowers', type: 'flightPowers' }),
	getItemIndex: () => 0,
});

const REQUEST = { method: 'POST', url: 'https://api.flightpowers.com/v1/flights/oneway' };

async function expectThrow(hook, value, fragment) {
	try {
		await hook.call(context(value), REQUEST);
	} catch (error) {
		return String(error.message).includes(fragment)
			? undefined
			: `threw "${error.message}", which does not mention ${fragment}`;
	}
	return `did not throw for ${JSON.stringify(value)}`;
}

async function expectPass(hook, value) {
	try {
		const result = await hook.call(context(value), REQUEST);
		return result === REQUEST ? undefined : 'returned a different request object';
	} catch (error) {
		return `threw for ${JSON.stringify(value)}: ${error.message}`;
	}
}

for (const [resource, name, kind] of REQUIRED) {
	const property = findProperty(resource, name);
	check(property !== undefined, `No ${resource} property named ${name} on the node.`);
	if (!property) continue;

	check(property.required === true, `${name} is not marked required.`);
	const hooks = property.routing?.send?.preSend ?? [];
	check(
		hooks.length === 1 && typeof hooks[0] === 'function',
		`${name} has no preSend hook: an empty value would be sent and billed.`,
	);
	if (hooks.length !== 1) continue;
	const hook = hooks[0];

	for (const empty of ['', '   ', undefined, null]) {
		const problem = await expectThrow(hook, empty, property.displayName);
		check(problem === undefined, `${name} with ${JSON.stringify(empty)}: ${problem}`);
	}

	if (kind === 'date') {
		for (const bad of ['15/03/2027', '2027-13-01', '2027-02-30', 'tomorrow', '20270315']) {
			const problem = await expectThrow(hook, bad, 'real calendar date');
			check(problem === undefined, `${name} with ${JSON.stringify(bad)}: ${problem}`);
		}
		for (const good of ['2027-03-15', '2027-3-5', ' 2027-03-15 ']) {
			const problem = await expectPass(hook, good);
			check(problem === undefined, `${name} with ${JSON.stringify(good)}: ${problem}`);
		}
	} else {
		for (const good of ['BER', 'ber', ' CDG ', 'Rome, Italy']) {
			const problem = await expectPass(hook, good);
			check(problem === undefined, `${name} with ${JSON.stringify(good)}: ${problem}`);
		}
	}
}

// The date helper on its own, so a regression is named by value rather than
// by which field happened to trip first.
check(isRealCalendarDate('2027-03-15'), 'isRealCalendarDate rejects 2027-03-15');
check(!isRealCalendarDate('2027-02-30'), 'isRealCalendarDate accepts 2027-02-30');
check(!isRealCalendarDate(''), 'isRealCalendarDate accepts an empty string');

// The placeholders must not rot into the past again: `e.g. 2026-06-15` was a
// guaranteed 422 for anyone who copied it after that date.
const thisYear = new Date().getUTCFullYear();
const DATE_PLACEHOLDERS = [
	['flight', 'departure_date'],
	['flight', 'return_date'],
	['hotel', 'checkin_date'],
	['hotel', 'checkout_date'],
	['airbnb', 'checkin_date'],
	['airbnb', 'checkout_date'],
];
for (const [resource, name] of DATE_PLACEHOLDERS) {
	const placeholder = findProperty(resource, name)?.placeholder ?? '';
	const year = Number((placeholder.match(/(\d{4})-\d{2}-\d{2}/) ?? [])[1]);
	check(
		year > thisYear,
		`${resource} ${name} placeholder "${placeholder}" is not in a future year; a copied example must not 422.`,
	);
}

// The Airbnb search is the hotels route with `provider: airbnb` in the body.
// Without it the front searches Booking.com and bills the Booking listing: a
// right-looking answer from the wrong source. And the two option lists are
// the API's own vocabularies, where any other value is a (metered) 400.
const airbnbOperation = properties
	.find((p) => p.name === 'operation' && shownFor(p, 'airbnb'))
	?.options?.find((o) => o.value === 'searchStays');
check(
	airbnbOperation?.routing?.request?.body?.provider === 'airbnb',
	'The Airbnb search does not send provider: airbnb in the body; it would search Booking.com.',
);
check(
	airbnbOperation?.routing?.request?.url === 'https://api.flightpowers.com/v1/hotels/search',
	'The Airbnb search does not call POST https://api.flightpowers.com/v1/hotels/search.',
);
const airbnbOptions = findProperty('airbnb', 'options')?.options ?? [];
const optionValues = (name) =>
	(airbnbOptions.find((o) => o.name === name)?.options ?? []).map((o) => o.value).sort();
check(
	JSON.stringify(optionValues('room_types')) ===
		JSON.stringify(['Entire home/apt', 'Hotel room', 'Private room', 'Shared room']),
	`Airbnb room_types options are ${JSON.stringify(optionValues('room_types'))}, not the four the API accepts.`,
);
check(
	JSON.stringify(optionValues('sort')) === JSON.stringify(['price_asc', 'price_desc', 'rating_desc']),
	`Airbnb sort options are ${JSON.stringify(optionValues('sort'))}, not the three the API accepts.`,
);
check(
	!airbnbOptions.some((o) => o.name === 'filters' || o.name === 'budget_per_night'),
	'The Airbnb search offers a Booking-only field (filters / budget_per_night).',
);

if (failures.length > 0) {
	console.error('Required-field check FAILED:\n');
	for (const failure of failures) console.error(`  - ${failure}\n`);
	process.exit(1);
}

console.log(
	'Required-field check passed: from_airport, to_airport, departure_date, return_date; ' +
		'airbnb destination, checkin_date, checkout_date',
);
console.log('  - each carries a preSend hook that throws on an empty value before any request');
console.log('  - the date hooks refuse a value that is not a real YYYY-MM-DD calendar date');
console.log('  - the date placeholders are in a future year (flight, hotel, airbnb)');
console.log('  - the Airbnb search sends provider: airbnb and only the API\'s own option values');
