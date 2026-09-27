/**
 * Writes the notes of a GitHub release from its section of CHANGELOG.md.
 *
 *   node scripts/release-notes.mjs v2.0.0 notes.md
 *
 * The section is the `## v 2.0.0 - …` heading whose release label matches the
 * tag (`v2.0.0` → "Release", `v2.0.0-beta1` → "Beta 1", `v2.0.0-rc` →
 * "Release Candidate"). Its body goes to the notes file as it is, followed by a
 * link to the changes since the previous tag; the heading, without the `## `,
 * is printed so it can be the release title. Exits with an error when the
 * changelog has no section for the tag, so a release never goes out without
 * notes.
 */

import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'https://github.com/yossdotpro/karbonized';

const [tag, output] = process.argv.slice(2);
if (!tag || !output) {
	console.error('Usage: node scripts/release-notes.mjs <tag> <notes file>');
	process.exit(1);
}

const match = /^v(\d+\.\d+\.\d+)(?:-(.+))?$/.exec(tag);
if (!match) {
	console.error(`${tag} is not a version tag (v1.2.3 or v1.2.3-beta1)`);
	process.exit(1);
}
const [, version, pre] = match;

/** "beta1" → "Beta 1", "rc" → "Release Candidate", none → "Release". */
function label(pre) {
	if (!pre) return 'Release';
	if (/^rc\d*$/i.test(pre)) return 'Release Candidate';
	const [, word, number] = /^([a-z]+)\.?(\d*)$/i.exec(pre) ?? [, pre, ''];
	const name = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
	return number ? `${name} ${number}` : name;
}

const changelog = await readFile(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
const lines = changelog.split('\n');
const prefix = `## v ${version} - ${label(pre)}`;
const start = lines.findIndex(
	(line) =>
		line === prefix ||
		line.startsWith(`${prefix} (`) ||
		line.startsWith(`${prefix} -`),
);
if (start === -1) {
	console.error(`CHANGELOG.md has no "${prefix}" section for ${tag}`);
	process.exit(1);
}
let end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
if (end === -1) end = lines.length;

const body = lines
	.slice(start + 1, end)
	.join('\n')
	.trim();

let previous = '';
try {
	previous = execFileSync(
		'git',
		['describe', '--tags', '--abbrev=0', '--match', 'v*', `${tag}^`],
		{ cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
	).trim();
} catch {
	// No earlier tag (or a shallow clone): the notes go without the link.
}

const notes = previous
	? `${body}\n\n**Full Changelog**: ${REPO}/compare/${previous}...${tag}\n`
	: `${body}\n`;

await writeFile(output, notes);
console.log(lines[start].slice(3));
