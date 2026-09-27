import { describe, expect, it } from 'vitest';
import { BLOCK_TYPES } from './catalog';
import { BLOCKS, INSERTABLE_BLOCKS, blockIcon, getBlock } from './registry';

/**
 * The editor takes the block types from the registry and Agent and the MCP
 * server take them from the catalog: a type missing from either side is a
 * block nobody can reach.
 */
describe('the block registry and the catalog', () => {
	it('can render every type the tools can create', () => {
		BLOCK_TYPES.forEach((spec) => {
			expect(getBlock(spec.type), spec.type).toBeDefined();
		});
	});

	it('describes every type the toolbar offers', () => {
		const catalog = BLOCK_TYPES.map((spec) => spec.type);

		INSERTABLE_BLOCKS.forEach((block) => {
			expect(catalog, block.type).toContain(block.type);
		});
	});

	it('leaves out of the catalog only what nobody can create', () => {
		const catalog = BLOCK_TYPES.map((spec) => spec.type);
		const missing = BLOCKS.filter((block) => !catalog.includes(block.type)).map(
			(block) => block.type,
		);

		// Custom blocks come from imported components, never from a tool.
		expect(missing).toEqual(['custom']);
	});

	it('agree on the label of every type', () => {
		BLOCK_TYPES.forEach((spec) => {
			expect(getBlock(spec.type)?.label).toBe(spec.label);
		});
	});

	it('offers in the toolbar every type but the ones made another way', () => {
		const insertable = INSERTABLE_BLOCKS.map((block) => block.type);

		expect(insertable).toContain('text');
		// Strokes come from the brush, custom blocks from an import.
		expect(insertable).not.toContain('drawing');
		expect(insertable).not.toContain('custom');
	});

	it('has an icon for every type, and one for anything else', () => {
		BLOCKS.forEach((block) => {
			expect(blockIcon(block.type)).toBeTruthy();
		});
		expect(blockIcon('group')).toBeTruthy();
		expect(blockIcon('nonsense')).toBeTruthy();
	});
});
