import { Literal, Record, Runtype, Static, Union } from "runtypes";

const NotImplemented = Union(
	Record({ tag: Literal("instanceof") }),
	Record({ tag: Literal("intersect") }),
	Record({ tag: Literal("function") })
);

const notImplementedTags = NotImplemented.alternatives.map(
	(x) => x.fields.tag.value
);

type NotImplemented = Static<typeof NotImplemented>;

function isNotImplemented(r: any): r is NotImplemented {
	return r && notImplementedTags.indexOf(<any>r.tag) >= 0;
}

// This shouldn't be ever run because it's only used for exhaustiveness
/* istanbul ignore next */
class UnreachableCaseError extends Error {
	constructor(val: never) {
		super(`Unreachable case: ${val}`);
	}
}

function filterInternal<T, R extends Runtype<T>>(
	t: R,
	x: T,
	parentContext: { isPartial: boolean }
): T {
	if (parentContext.isPartial && x === undefined) {
		return x;
	}

	const r = t.reflect;

	if (isNotImplemented(r)) {
		throw new Error(`Type "${r.tag}" is not filterable`);
	}

	const context = { isPartial: r.tag === "record" && r.isPartial };

	switch (r.tag) {
		case "literal":
		case "boolean":
		case "bigint":
		case "number":
		case "string":
		case "void":
		case "symbol":
		case "never":
		case "unknown":
			return x;
		case "array":
			return (x as any).map((v: any) => filterInternal(r.element, v, context));
		case "tuple":
			return (x as any).map((v: any, i: number) =>
				filterInternal(r.components[i], v, context)
			);
		case "dictionary":
			return Object.keys(x).reduce(
				(acc, k) => ({
					...acc,
					[k]: filterInternal(r.value, (x as any)[k], context),
				}),
				<T>{}
			);
		case "record":
			return Object.keys(r.fields)
				.filter((k) => Object.prototype.hasOwnProperty.call(x, k))
				.reduce(
					(acc, k) => ({
						...acc,
						[k]: filterInternal(r.fields[k], (x as any)[k] as any, context),
					}),
					<T>{}
				);
		case "union":
			const alt = r.alternatives.find((a) => a.guard(x));

			return filterInternal(<any>alt, x, context);
		case "constraint":
		case "optional":
			return filterInternal(<any>r.underlying, x, context);
		case "brand":
			return filterInternal(<any>r.entity, x, context);
		// Exhaustiveness checking
		/* istanbul ignore next */
		default:
			throw new UnreachableCaseError(r);
	}
}

export function filter<T, R extends Runtype<T>>(t: R, x: T): T {
	return filterInternal(t, x, { isPartial: false });
}

export function validate<T, R extends Runtype<T>>(t: R): R {
	const visited = new Set();

	function check<R1 extends Runtype<unknown>>(r1: R1): void {
		const r = r1.reflect;

		if (isNotImplemented(r)) {
			throw new Error(`Type "${r.tag}" is not filterable`);
		}

		if (visited.has(r)) {
			return;
		}

		visited.add(r);

		switch (r.tag) {
			case "never":
			case "literal":
			case "boolean":
			case "bigint":
			case "number":
			case "string":
			case "void":
			case "symbol":
			case "unknown":
				return;
			case "array":
				return check(r.element);
			case "tuple":
				return r.components.forEach(check);
			case "dictionary":
				return check(r.value);
			case "record":
				return Object.keys(r.fields).forEach((k) => check(r.fields[k]));
			case "union":
				return r.alternatives.forEach(check);
			case "constraint":
			case "optional":
				return check(r.underlying);
			case "brand":
				return check(r.entity);
			// Exhaustiveness checking
			/* istanbul ignore next */
			default:
				throw new UnreachableCaseError(r);
		}
	}

	check(t.reflect);

	return t;
}

export default function CheckFilter<T, R extends Runtype<T>>(
	t: R
): (x: unknown) => Static<R> {
	const rt = validate(t);

	return (x) => filter(rt, rt.check(x)) as Static<R>;
}
