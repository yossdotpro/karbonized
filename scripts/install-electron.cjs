#!/usr/bin/env node
/**
 * Installs the Electron binary used by `yarn electron:dev`.
 *
 * Yarn 4 does not run install scripts of dependencies by default, so the
 * `electron` package never downloads its binary. Its own install script also
 * hangs while unzipping on Node 24 (extract-zip), so this script downloads the
 * archive with @electron/get (reusing its cache) and extracts it with the
 * system `tar`/`unzip` instead.
 *
 * Skipped on CI (electron-builder downloads its own copy) and when
 * ELECTRON_SKIP_BINARY_DOWNLOAD is set.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

if (process.env.ELECTRON_SKIP_BINARY_DOWNLOAD || process.env.CI) {
	process.exit(0);
}

let electronDir;
try {
	electronDir = path.dirname(require.resolve('electron/package.json'));
} catch {
	// Dependencies not installed (e.g. a production-only install).
	process.exit(0);
}

const { version } = require(path.join(electronDir, 'package.json'));
const distDir = path.join(electronDir, 'dist');
const platform = process.platform;

const executable = {
	win32: 'electron.exe',
	darwin: 'Electron.app/Contents/MacOS/Electron',
	linux: 'electron',
}[platform];

if (!executable) {
	console.warn(`[install-electron] Unsupported platform ${platform}.`);
	process.exit(0);
}

const isInstalled = () => {
	try {
		return (
			fs.readFileSync(path.join(distDir, 'version'), 'utf-8').replace(/^v/, '') ===
				version &&
			fs.readFileSync(path.join(electronDir, 'path.txt'), 'utf-8') ===
				executable &&
			fs.existsSync(path.join(distDir, executable))
		);
	} catch {
		return false;
	}
};

const extract = (zipPath) => {
	fs.rmSync(distDir, { recursive: true, force: true });
	fs.mkdirSync(distDir, { recursive: true });

	if (platform === 'win32') {
		// bsdtar ships with Windows 10+ and reads zip files. Use it explicitly:
		// the GNU tar of Git Bash may come first in PATH and cannot.
		const tar = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe');
		execFileSync(tar, ['-xf', zipPath, '-C', distDir], { stdio: 'inherit' });
	} else if (platform === 'darwin') {
		// ditto keeps the symlinks and permissions of the app bundle.
		execFileSync('ditto', ['-x', '-k', zipPath, distDir], { stdio: 'inherit' });
	} else {
		execFileSync('unzip', ['-q', '-o', zipPath, '-d', distDir], {
			stdio: 'inherit',
		});
	}
};

const main = async () => {
	if (isInstalled()) return;

	const { downloadArtifact } = require(
		require.resolve('@electron/get', { paths: [electronDir] }),
	);

	console.log(`[install-electron] Installing Electron ${version}…`);
	const zipPath = await downloadArtifact({
		version,
		artifactName: 'electron',
		platform,
		arch: process.arch,
		checksums: require(path.join(electronDir, 'checksums.json')),
	});

	extract(zipPath);
	fs.writeFileSync(path.join(electronDir, 'path.txt'), executable);

	if (!isInstalled()) {
		throw new Error('The Electron archive did not contain the executable.');
	}
	console.log('[install-electron] Done.');
};

main().catch((error) => {
	// Don't fail the whole install: only the desktop app needs the binary.
	console.warn(
		`[install-electron] Could not install Electron: ${error.message}\n` +
			'Run `node scripts/install-electron.cjs` to try again.',
	);
});
