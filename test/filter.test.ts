import {
	Array,
	BigInt as BigIntT,
	Boolean,
	Dictionary,
	Intersect,
	Lazy,
	Literal,
	Never,
	Null,
	Number,
	Optional,
	Partial,
	Record,
	String,
	Tuple,
	Union,
	Unknown,
	ValidationError,
} from "runtypes";

import FilterCheck, { filter } from "../src";

describe("FilterCheck", () => {
	it("should handle simple values", () => {
		expect(() => FilterCheck(Never)(null)).toThrowError(ValidationError);
		expect(FilterCheck(Literal("a"))("a")).toEqual("a");
		expect(FilterCheck(Boolean)(true)).toEqual(true);
		expect(
			FilterCheck(BigIntT)(BigInt("9007199254740993"))
		).toMatchInlineSnapshot(`9007199254740993n`);
		expect(FilterCheck(Number)(5)).toEqual(5);
		expect(FilterCheck(String)("a")).toEqual("a");
		expect(FilterCheck(Null)(null)).toEqual(null);
		expect(FilterCheck(Unknown)({ a: "a", b: 1 })).toEqual({ a: "a", b: 1 });
	});

	it("should handle tuples", () => {
		const check = FilterCheck(Tuple(Literal("a"), String));

		expect(check(["a", "b"])).toEqual(["a", "b"]);
	});

	it("should handle dictionaries", () => {
		const check = FilterCheck(Dictionary(Boolean));

		expect(check({ a: true, b: false })).toEqual({ a: true, b: false });
	});

	it("should handle partial records", () => {
		const check = FilterCheck(
			Partial({
				a: String,
				b: String,
				d: Array(String),
				e: Tuple(Literal("a")),
				f: Union(Literal("a"), Literal("b")),
			})
		);

		expect(
			check({ a: "aaa", c: "ccc", d: undefined, e: undefined, f: undefined })
		).toEqual({
			a: "aaa",
		});
	});

	it("should handle unions", () => {
		const check = FilterCheck(Union(String, Number));

		expect(check("a")).toEqual("a");
		expect(check(5)).toEqual(5);
	});

	it("should handle constraints", () => {
		const check = FilterCheck(Number.withConstraint((n) => n > 5));

		expect(check(10)).toEqual(10);
	});

	it("should handle optionals", () => {
		const checkWrapper = FilterCheck(
			Optional(Number.withConstraint((n) => n > 5))
		);

		expect(checkWrapper(10)).toEqual(10);

		const checkChain = FilterCheck(
			Number.optional().withConstraint((n) => typeof n === "undefined" || n > 5)
		);

		expect(checkChain(10)).toEqual(10);
	});

	it("should handle brands", () => {
		const check = FilterCheck(Number.withBrand("num"));

		expect(check(10)).toEqual(10);
	});

	it("should reject on unhandled types", () => {
		const A = Record({ a: String });
		const B = Record({ b: String });
		const AB = Intersect(A, B);

		expect(() => FilterCheck(AB)).toThrow();
		expect(() => filter(AB, { a: "a", b: "b" })).toThrow();
	});

	it("should handle recursive definitions", () => {
		const Tree: any = Lazy(() =>
			Record({
				name: String,
				children: Array(Tree),
			})
		);

		const filter = FilterCheck(Tree);
		const tree = filter({
			name: "root",
			extra: "read, all about it",
			children: [
				{
					name: "Top 1",
					children: [
						{
							name: "leaf",
							ignore: "me",
							children: [],
						},
					],
				},
				{
					name: "Top 2",
					children: [],
				},
			],
		});

		expect(tree).toEqual({
			name: "root",
			children: [
				{
					name: "Top 1",
					children: [
						{
							name: "leaf",
							children: [],
						},
					],
				},
				{
					name: "Top 2",
					children: [],
				},
			],
		});
	});
});
