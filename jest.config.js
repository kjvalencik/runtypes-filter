const jestConf = {
	testEnvironment: "node",
	transform: {
		"^.+\\.ts$": "ts-jest",
	},
	testRegex: ".*\\.test\\.ts$",
	roots: ["<rootDir>/test/"],
	moduleFileExtensions: ["ts", "js", "json", "node"],
	collectCoverageFrom: ["<rootDir>/src/**/*.ts"],
	coverageThreshold: {
		global: {
			branches: 100,
			functions: 100,
			lines: 100,
		},
	},
	coverageReporters: ["text", "text-summary", "html"],
};

// optimize to not crawl src folder unless in watch mode
if (process.argv.some((x) => x === "--watch" || x === "--watchAll")) {
	jestConf.roots.push("<rootDir>/src/");
}

module.exports = jestConf;
