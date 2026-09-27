#!/usr/bin/env node
/**
 * Build a Karbonized icon pack (.kcomponent) from a folder of SVG files.
 *
 *   node scripts/build-icon-pack.mjs <folder> --name "Acme Icons" \
 *     [--prefix acme] [--author "Acme"] [--license MIT] [--version 1.0.0] \
 *     [--description "…"] [--out acme-icons.kcomponent]
 *
 * Each `*.svg` becomes an icon named after its file (`Arrow Right.svg` →
 * `arrow-right`). The app checks and cleans every icon again on import; this
 * script only reports what would obviously fail. See docs/icon-packs.md.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import yaml from 'js-yaml';

const LIMITS = { icons: 2000, iconBytes: 16 * 1024, fileBytes: 1024 * 1024 };

const slug = (value) =>
	value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

const parseArgs = (argv) => {
	const args = { _: [] };
	for (let index = 0; index < argv.length; index += 1) {
		const value = argv[index];
		if (value.startsWith('--')) args[value.slice(2)] = argv[(index += 1)];
		else args._.push(value);
	}
	return args;
};

const args = parseArgs(process.argv.slice(2));
const folder = args._[0];
if (!folder || !args.name) {
	console.error(
		'Usage: node scripts/build-icon-pack.mjs <folder> --name "Pack name" [--prefix id] [--author …] [--license …] [--version …] [--description …] [--out file]',
	);
	process.exit(1);
}

const prefix = args.prefix ?? slug(args.name);
if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(prefix)) {
	console.error(`Invalid prefix "${prefix}": start with a letter, then lowercase letters, digits and dashes.`);
	process.exit(1);
}

const files = (await readdir(folder))
	.filter((file) => extname(file).toLowerCase() === '.svg')
	.sort((a, b) => a.localeCompare(b));

const icons = {};
const problems = [];

for (const file of files) {
	const name = slug(basename(file, extname(file)));
	const svg = (await readFile(join(folder, file), 'utf8'))
		.replace(/<\?xml[^>]*>/g, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\s+/g, ' ')
		.trim();

	if (!name) problems.push(`${file}: the file name gives no icon name`);
	else if (icons[name]) problems.push(`${file}: "${name}" is already taken`);
	else if (!/^<svg[\s>]/i.test(svg)) problems.push(`${file}: not an <svg> file`);
	else if (!/viewBox=/i.test(svg) && !/width=.*height=/i.test(svg))
		problems.push(`${file}: needs a viewBox`);
	else if (Buffer.byteLength(svg) > LIMITS.iconBytes)
		problems.push(`${file}: larger than 16 KB, simplify it (e.g. with SVGO)`);
	else icons[name] = svg;
}

const count = Object.keys(icons).length;
if (count === 0) {
	console.error(`No usable SVG files in ${folder}.`);
	problems.forEach((problem) => console.error(`  - ${problem}`));
	process.exit(1);
}
if (count > LIMITS.icons) {
	console.error(`${count} icons: a pack holds up to ${LIMITS.icons}. Split it in several packs.`);
	process.exit(1);
}

const manifest = { name: args.name, type: 'icon-pack', prefix };
for (const key of ['author', 'description', 'version', 'license']) {
	if (args[key]) manifest[key] = args[key];
}
manifest.category = 'Icons';
manifest.tags = ['icons', prefix];

const text = yaml.dump({ manifest, icons }, { lineWidth: -1, noRefs: true });
if (Buffer.byteLength(text) > LIMITS.fileBytes) {
	console.error('The pack is larger than 1 MB. Simplify the SVGs or split the pack.');
	process.exit(1);
}

const out = resolve(args.out ?? `${prefix}.kcomponent`);
await writeFile(out, text);

console.log(`${out}: ${count} icons, named ${prefix}:<name>.`);
if (problems.length > 0) {
	console.log(`Skipped ${problems.length}:`);
	problems.forEach((problem) => console.log(`  - ${problem}`));
}
