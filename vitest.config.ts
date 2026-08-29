import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		// Vitest does not read the "paths" alias from tsconfig.json, so the same
		// "@/..." mapping is repeated here or every import in a test fails.
		alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
	},
});
