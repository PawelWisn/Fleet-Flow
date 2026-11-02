import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
	...nextVitals,
	...nextTypescript,
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
			"react/no-unescaped-entities": "off",
			// React Compiler advisories: fetch-on-mount effects are used throughout, keep them visible without failing lint
			"react-hooks/set-state-in-effect": "warn",
			"react-hooks/purity": "warn",
			"react-hooks/immutability": "warn",
		},
	},
	{
		// Playwright fixtures expose `use`, which is not a React hook
		files: ["e2e/**"],
		rules: { "react-hooks/rules-of-hooks": "off" },
	},
	{ ignores: [".next/**", "node_modules/**", "coverage/**", ".vitest/**", "test-results/**", "playwright-report/**", "next-env.d.ts"] },
];

export default eslintConfig;
