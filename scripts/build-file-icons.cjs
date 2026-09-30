/**
 * Renders the icons of the files Karbonized opens (`.kproject`, `.kbrand`):
 * a dark page with the logo and a colored tab with the extension.
 *
 *   yarn file-icons
 *
 * Runs in Electron (the only SVG renderer the repo already has): each size is
 * drawn by Chromium on a canvas, then packed into the formats the installers
 * take, next to the app icon in src-electron/assets:
 *
 *   file-<ext>.ico   Windows (16–256)
 *   file-<ext>.icns  macOS (16–1024)
 *   file-<ext>.png   Linux and previews (512)
 *   file-<ext>.svg   the source
 *
 * electron-builder.json points `fileAssociations` at them.
 */

const { app, BrowserWindow } = require('electron');
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'src-electron', 'assets');

const FILES = [
	{ ext: 'kproject', label: 'PROJECT', color: '#f43f5e' },
	{ ext: 'kbrand', label: 'BRAND', color: '#8b5cf6' },
];

/** The logo path of logo.svg, drawn in a 480.629 box. */
const LOGO = /\sd="([^"]+)"/.exec(
	readFileSync(path.join(ROOT, 'logo.svg'), 'utf8'),
)[1];
const LOGO_BOX = 480.629;

const PAGE = '#1c1b1b';
const FOLD = '#3a3737';

/**
 * The icon at one size. Under 48 px the label cannot be read, so the tab is a
 * plain band and the logo takes the room.
 */
const svg = ({ label, color }, size) => {
	const small = size < 48;
	const logoSize = small ? 250 : 196;
	const logoX = 264 - logoSize / 2;
	const logoY = small ? 150 : 108;
	const scale = logoSize / LOGO_BOX;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
	<path d="M132 24H316L440 148V444A44 44 0 0 1 396 488H132A44 44 0 0 1 88 444V68A44 44 0 0 1 132 24Z" fill="${PAGE}"/>
	<path d="M316 24V112A36 36 0 0 0 352 148H440Z" fill="${FOLD}"/>
	<path d="${LOGO}" fill="#ffffff" fill-rule="evenodd" transform="translate(${logoX} ${logoY}) scale(${scale})"/>
	${
		small
			? `<path d="M88 404H440V444A44 44 0 0 1 396 488H132A44 44 0 0 1 88 444Z" fill="${color}"/>`
			: `<rect x="128" y="352" width="272" height="84" rx="22" fill="${color}"/>
	<text x="264" y="408" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="44" font-weight="700" letter-spacing="3">${label}</text>`
	}
</svg>`;
};

/** PNG bytes of each size, rendered by the page. */
const render = async (win, file, sizes) => {
	const images = await win.webContents.executeJavaScript(`
		Promise.all(${JSON.stringify(sizes.map((size) => [size, svg(file, size)]))}.map(
			([size, markup]) => new Promise((resolve, reject) => {
				const image = new Image();
				image.onload = () => {
					const canvas = document.createElement('canvas');
					canvas.width = canvas.height = size;
					canvas.getContext('2d').drawImage(image, 0, 0, size, size);
					resolve(canvas.toDataURL('image/png').split(',')[1]);
				};
				image.onerror = () => reject(new Error('Could not draw ' + size));
				image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
			}),
		))
	`);
	return new Map(
		sizes.map((size, i) => [size, Buffer.from(images[i], 'base64')]),
	);
};

/** ICO with PNG entries (Windows Vista and later read them). */
const ico = (pngs) => {
	const entries = [...pngs.entries()];
	const header = Buffer.alloc(6 + entries.length * 16);
	header.writeUInt16LE(0, 0);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(entries.length, 4);
	let offset = header.length;
	entries.forEach(([size, png], i) => {
		const at = 6 + i * 16;
		header.writeUInt8(size >= 256 ? 0 : size, at);
		header.writeUInt8(size >= 256 ? 0 : size, at + 1);
		header.writeUInt16LE(1, at + 4); // color planes
		header.writeUInt16LE(32, at + 6); // bits per pixel
		header.writeUInt32LE(png.length, at + 8);
		header.writeUInt32LE(offset, at + 12);
		offset += png.length;
	});
	return Buffer.concat([header, ...entries.map(([, png]) => png)]);
};

/** ICNS with the PNG types macOS reads. */
const ICNS_TYPES = {
	16: 'icp4',
	32: 'icp5',
	64: 'icp6',
	128: 'ic07',
	256: 'ic08',
	512: 'ic09',
	1024: 'ic10',
};
const icns = (pngs) => {
	const chunks = [...pngs.entries()].map(([size, png]) => {
		const head = Buffer.alloc(8);
		head.write(ICNS_TYPES[size], 0, 'ascii');
		head.writeUInt32BE(png.length + 8, 4);
		return Buffer.concat([head, png]);
	});
	const body = Buffer.concat(chunks);
	const head = Buffer.alloc(8);
	head.write('icns', 0, 'ascii');
	head.writeUInt32BE(body.length + 8, 4);
	return Buffer.concat([head, body]);
};

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
const ICNS_SIZES = [16, 32, 64, 128, 256, 512, 1024];

app.whenReady().then(async () => {
	const win = new BrowserWindow({ show: false });
	await win.loadURL('about:blank');
	mkdirSync(OUT, { recursive: true });

	for (const file of FILES) {
		const name = path.join(OUT, `file-${file.ext}`);
		const icoPngs = await render(win, file, ICO_SIZES);
		const icnsPngs = await render(win, file, ICNS_SIZES);
		writeFileSync(`${name}.ico`, ico(icoPngs));
		writeFileSync(`${name}.icns`, icns(icnsPngs));
		writeFileSync(`${name}.png`, icnsPngs.get(512));
		writeFileSync(`${name}.svg`, svg(file, 512));
		console.log(`file-${file.ext}: ico, icns, png, svg`);
	}

	app.quit();
});
