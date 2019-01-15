import { Literal, Record, Runtype, Static, Union } from "runtypes";

const NotImplemented = Union(
	Record({ tag: Literal("instanceof") }),
	Record({ tag: Literal("intersect") }),
	Record({ tag: Literal("function") }),
	Record({ tag: Literal("unknown") })
);

const notImplementedTags = NotImplemented.alternatives.map(
	x => x.fields.tag.value
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

export function filter<T, R extends Runtype<T>>(t: R, x: T): T {
	const r = t.reflect;

	if (isNotImplemented(r)) {
		throw new Error(`Type "${r.tag}" is not filterable`);
	}

	switch (r.tag) {
		case "literal":
		case "boolean":
		case "number":
		case "string":
		case "void":
		case "symbol":
		case "never":
			return x;
		case "array":
			return (x as any).map((v: any) => filter(r.element, v));
		case "tuple":
			return (x as any).map((v: any, i: number) => filter(r.components[i], v));
		case "dictionary":
			return Object.keys(x).reduce(
				(acc, k) => ({
					...acc,
					[k]: filter(r.value, (x as any)[k])
				}),
				<T>{}
			);
		case "partial":
		case "record":
			return Object.keys(r.fields)
				.filter(k => x.hasOwnProperty(k))
				.reduce(
					(acc, k) => ({
						...acc,
						[k]: filter(r.fields[k], (x as any)[k] as any)
					}),
					<T>{}
				);
		case "union":
			const alt = r.alternatives.find(a => a.guard(x));

			return filter(<any>alt, x);
		case "constraint":
			return filter(<any>r.underlying, x);
		case "brand":
			return filter(<any>r.entity, x);
		// Exhaustiveness checking
		/* istanbul ignore next */
		default:
			throw new UnreachableCaseError(r);
	}
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
			case "number":
			case "string":
			case "void":
			case "symbol":
				return;
			case "array":
				return check(r.element);
			case "tuple":
				return r.components.forEach(check);
			case "dictionary":
				return check(r.value);
			case "partial":
			case "record":
				return Object.keys(r.fields).forEach(k => check(r.fields[k]));
			case "union":
				return r.alternatives.forEach(check);
			case "constraint":
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

	return <any>((x: unknown) => filter(rt, rt.check(x)));
}
