import antfu from "@antfu/eslint-config";

export default antfu({
	react: true,
	ignores: [
		"**/*.sh",
		"**/*.md",
		"**/Makefile",
		"deploy.sh",
		"deploy-config.sh",
		"scripts/**",
		".github/**",
		"**/*.css",
		"public/research-library/content/**",
		"public/research-library/catalog.json",
		"public/research-library/.sync-manifest.json",
		"research-library/sync-report.json",
	],
	rules: {
		"style/quotes": ["error", "double"],
		"style/semi": ["error", "always"],
		"style/indent": ["error", "tab"],
		"jsonc/indent": ["error", "tab"],
		"style/no-tabs": "off",
		"style/jsx-indent-props": ["error", "tab"],
		"react-hooks/exhaustive-deps": "off",
	},
});
