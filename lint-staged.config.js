export default {
	"*": (files) => {
		const applicationFiles = files.filter((filename) => {
			const normalized = filename.replaceAll("\\", "/");
			return ![
				"/automation-runtime/",
				"/research-library/douyin-source/",
				"/research-library/douyin-source-manifest.json",
			].some(part => normalized.includes(part));
		});
		return applicationFiles.length
			? [`eslint --fix ${applicationFiles.map(filename => JSON.stringify(filename)).join(" ")}`]
			: [];
	},
};
