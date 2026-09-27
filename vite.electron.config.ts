import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from "path"
import tailwindcss from '@tailwindcss/vite';

// vite-plugin-electron defaults to `formats: ['es']` (package.json is
// "type": "module") and Vite concatenates arrays when merging configs, so
// `formats: ['cjs']` becomes ['es', 'cjs']. Both builds would then be written
// to the same `.cjs` file at once and corrupt it.
const cjsOnly = (): Plugin => ({
	name: 'karbonized:cjs-only',
	config(config) {
		if (config.build?.lib) config.build.lib.formats = ['cjs'];
	},
});

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
					plugins: [cjsOnly()],
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
					plugins: [cjsOnly()],
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
