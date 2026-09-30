import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_CHANGELOG } from './changelog';

const root = join(__dirname, '..', '..');
const { version } = JSON.parse(
	readFileSync(join(root, 'package.json'), 'utf8'),
) as { version: string };
const [release] = version.split('-');

describe('changelogs', () => {
	it('CHANGELOG.md has a section for the version in package.json', () => {
		const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
		expect(changelog).toContain(`\n## v ${release} - `);
	});

	it('the app changelog has it too, first', () => {
		expect(APP_CHANGELOG).toContain(`\n## v ${release} - `);
		expect(APP_CHANGELOG.trimStart().startsWith(`## v ${release} - `)).toBe(
			true,
		);
	});
});
