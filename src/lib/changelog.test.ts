import { describe, expect, it } from 'vitest';
// Through Vite, so the app's tsconfig (no Node types) checks this file too.
import changelog from '../../CHANGELOG.md?raw';
import packageJson from '../../package.json?raw';
import { APP_CHANGELOG } from './changelog';

const { version } = JSON.parse(packageJson) as { version: string };
const [release] = version.split('-');

describe('changelogs', () => {
	it('CHANGELOG.md has a section for the version in package.json', () => {
		expect(changelog).toContain(`\n## v ${release} - `);
	});

	it('the app changelog has it too, first', () => {
		expect(APP_CHANGELOG).toContain(`\n## v ${release} - `);
		expect(APP_CHANGELOG.trimStart().startsWith(`## v ${release} - `)).toBe(
			true,
		);
	});
});
