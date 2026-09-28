import type { IExecuteSingleFunctions, IHttpRequestOptions, PreSendAction } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Why a declarative node checks its own required fields.
 *
 * `required: true` on a parameter is an editor-time check. n8n's
 * `getParameterIssues` looks at the RAW value a field holds and flags a literal
 * empty string, so a blank box shows "Parameter is required" and the editor
 * refuses to run the node by hand. It never looks at what an expression
 * resolves to: `{{ $json.origin }}` on an item that has no `origin`, or a
 * `$fromAI(...)` an agent left unfilled, is a non-empty string in the editor
 * and an empty string on the wire, and nothing on the execution path checks it
 * again. So the node sent `""` for the origin, the destination and the date.
 *
 * On 2026-09-28 one user's workflow did exactly that seven times in six
 * minutes. Each call went through api.flightpowers.com to RapidAPI, was
 * metered against his free plan, and came back 422 fifty-nine milliseconds
 * later. His ten free requests were gone before one real search had run.
 *
 * A `preSend` hook is the declarative node's one chance to see the resolved
 * value before the request exists. Each required field carries one. It reads
 * the field through `getNodeParameter` (which resolves the expression for the
 * current item) and throws a `NodeOperationError` -- shown on the node in the
 * workflow, returned to an agent as the tool's error -- when the value is
 * blank or, for a date, is not a real calendar date. No request is made, so
 * nothing is billed.
 *
 * Deliberately nothing more. The API's own rules (a date must be today or
 * later, an airport is three letters, a return after a departure) stay the
 * API's: it answers them with a 422 that names the field, and a copy of them
 * here would drift the day one changes. Blank and not-a-date are the two
 * checks whose answer cannot change.
 */

/** The example every date message shows. Kept well in the future on purpose:
 * the placeholders used to say `2026-06-15`, which became a past date and a
 * guaranteed 422 for anyone who copied it. */
export const DATE_EXAMPLE = '2027-03-15';

// `YYYY-M-D` is accepted on purpose. The API parses dates with Python's
// `strptime('%Y-%m-%d')`, which takes a one-digit month or day, and this check
// must never refuse a value the API would have accepted.
const DATE_SHAPE = /^\d{4}-\d{1,2}-\d{1,2}$/;

/** True for a `YYYY-MM-DD` string naming a day that exists (not 2027-02-30). */
export function isRealCalendarDate(value: string): boolean {
	if (!DATE_SHAPE.test(value)) return false;
	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
}

export type RequiredKind = 'text' | 'date';

const HOW_TO_FILL =
	'Fill in From Airport, To Airport and Departure Date (and Return Date on a round trip), ' +
	'as fixed values or as expressions that resolve to a value for this item. ' +
	'Dates are YYYY-MM-DD, for example ' +
	DATE_EXAMPLE +
	'. No request was sent and nothing was charged to your plan.';

/**
 * The `preSend` for one required field: returns the request untouched when the
 * field holds a usable value, throws before any request otherwise.
 *
 * A factory rather than one shared function so that each field's hook knows
 * which parameter to read and what to call it in the message; n8n calls every
 * `preSend` on the node in turn, so the first empty field is the one reported.
 */
export function requireField(name: string, displayName: string, kind: RequiredKind): PreSendAction {
	return async function (
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const raw = this.getNodeParameter(name, '');
		const value = raw === undefined || raw === null ? '' : String(raw).trim();

		if (value === '') {
			throw new NodeOperationError(this.getNode(), `${displayName} is empty`, {
				itemIndex: this.getItemIndex(),
				description: HOW_TO_FILL,
			});
		}
		if (kind === 'date' && !isRealCalendarDate(value)) {
			throw new NodeOperationError(
				this.getNode(),
				`${displayName} must be a real calendar date in YYYY-MM-DD format (e.g. ${DATE_EXAMPLE}), got '${value}'`,
				{ itemIndex: this.getItemIndex(), description: HOW_TO_FILL },
			);
		}
		return requestOptions;
	};
}
