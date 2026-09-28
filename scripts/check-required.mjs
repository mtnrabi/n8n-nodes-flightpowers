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
	['from_airport', 'text'],
	['to_airport', 'text'],
	['departure_date', 'date'],
	['return_date', 'date'],
];

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

for (const [name, kind] of REQUIRED) {
	const property = properties.find((p) => p.name === name);
	check(property !== undefined, `No property named ${name} on the node.`);
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
		for (const good of ['BER', 'ber', ' CDG ']) {
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
for (const name of ['departure_date', 'return_date']) {
	const placeholder = properties.find((p) => p.name === name)?.placeholder ?? '';
	const year = Number((placeholder.match(/(\d{4})-\d{2}-\d{2}/) ?? [])[1]);
	check(
		year > thisYear,
		`${name} placeholder "${placeholder}" is not in a future year; a copied example must not 422.`,
	);
}

if (failures.length > 0) {
	console.error('Required-field check FAILED:\n');
	for (const failure of failures) console.error(`  - ${failure}\n`);
	process.exit(1);
}

console.log('Required-field check passed: from_airport, to_airport, departure_date, return_date');
console.log('  - each carries a preSend hook that throws on an empty value before any request');
console.log('  - the date hooks refuse a value that is not a real YYYY-MM-DD calendar date');
console.log('  - the date placeholders are in a future year');
