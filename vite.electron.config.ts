import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from "path"
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		electron([
			{
				entry: 'src-electron/main.ts',
				vite: {
					publicDir: 'src-electron/assets/',
					build: {
						outDir: 'dist-electron',
					},
				},
			},
			{
				entry: 'src-electron/preload.ts',
				onstart(args) {
					args.reload();
				},
				vite: {
					build: {
						outDir: 'dist-electron',
						lib: {
							entry: 'src-electron/preload.ts',
							formats: ['cjs'],
							fileName: () => 'preload.cjs',
						},
					},
				},
			},
			{
				// stdio bridge for MCP clients; runs outside Electron, nothing to start.
				entry: 'src-electron/mcp/stdio-proxy.ts',
				onstart() {},
				vite: {
					build: {
						outDir: 'dist-electron',
						lib: {
							entry: 'src-electron/mcp/stdio-proxy.ts',
							formats: ['cjs'],
							fileName: () => 'mcp-stdio.cjs',
						},
					},
				},
			},
		]),
	],
	
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},

	// The web config has different plugins, so sharing the dependency cache
	// makes every switch between `dev` and `electron:dev` re-optimize all deps
	// from scratch, which leaves the first load stuck for a long time.
	cacheDir: 'node_modules/.vite-electron',

	server: {
		watch: {
			usePolling: true,
		},
	},
});
