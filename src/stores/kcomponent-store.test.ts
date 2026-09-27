import { beforeEach, describe, expect, it } from 'vitest';
import { useKComponentStore } from './kcomponent-store';
import { parseKComponent } from '@/utils/kcomponentParser';

const pack = (name: string, prefix: string) =>
	parseKComponent(`
manifest:
  name: "${name}"
  author: "Tests"
  type: icon-pack
  prefix: ${prefix}
icons:
  dot: '<svg viewBox="0 0 2 2"><circle cx="1" cy="1" r="1"/></svg>'
`);

beforeEach(() => {
	useKComponentStore.setState({ importedComponents: [] });
});

describe('icon packs in the library', () => {
	it('refuses a second pack with the same prefix', () => {
		const store = useKComponentStore.getState();
		const [first] = store.importComponents([pack('One', 'dots')]);
		const [second] = store.importComponents([pack('Two', 'dots')]);

		expect(first.outcome).toBe('added');
		expect(second).toMatchObject({ outcome: 'prefix-taken', id: first.id });
		expect(useKComponentStore.getState().importedComponents).toHaveLength(1);
	});

	it('lets the same pack be replaced', () => {
		const store = useKComponentStore.getState();
		store.importComponents([pack('One', 'dots')]);
		const [again] = store.importComponents([pack('One', 'dots')], {
			replace: true,
		});
		expect(again.outcome).toBe('replaced');
	});

	it('keeps the icons of a persisted pack', () => {
		useKComponentStore.getState().importComponents([pack('One', 'dots')]);
		const stored = JSON.parse(
			JSON.stringify(useKComponentStore.getState().importedComponents),
		);
		const merged = useKComponentStore.persist
			.getOptions()
			.merge?.({ importedComponents: stored }, useKComponentStore.getState());
		expect(merged?.importedComponents[0].component.icons?.dot).toContain(
			'<circle',
		);
	});
});
