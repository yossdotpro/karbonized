import path from 'path';
import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so tests don't load the PWA/Tailwind plugins.
export default defineConfig({
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.{ts,tsx}'],
		restoreMocks: true,
	},
});
