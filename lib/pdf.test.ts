import { describe, expect, it } from 'vitest';
import { chunkPages, type PageText } from '@/lib/pdf';

// A page of `lines` lines, each about `lineLength` characters.
function page(pageNumber: number, lines: number, lineLength = 80): PageText {
	const line = 'word '.repeat(Math.ceil(lineLength / 5)).slice(0, lineLength);
	return { pageNumber, text: Array(lines).fill(line).join('\n') };
}

describe('chunkPages', () => {
	it('keeps every chunk within the size limit', () => {
		const chunks = chunkPages([page(1, 60)]);

		expect(chunks.length).toBeGreaterThan(1);
		for (const chunk of chunks) {
			expect(chunk.text.length).toBeLessThanOrEqual(1000);
		}
	});

	it('cuts a line that has no break to split on', () => {
		// One long line with no break to split on, so it is cut by length.
		const chunks = chunkPages([
			{ pageNumber: 1, text: 'abcdefghij'.repeat(250) },
		]);

		expect(chunks.length).toBeGreaterThan(1);
		for (const chunk of chunks) {
			expect(chunk.text.length).toBeLessThanOrEqual(1000);
		}
	});

	it('never lets a chunk span two pages', () => {
		const chunks = chunkPages([page(1, 20), page(2, 20)]);

		expect(chunks.some((chunk) => chunk.pageNumber === 1)).toBe(true);
		expect(chunks.some((chunk) => chunk.pageNumber === 2)).toBe(true);
		expect(
			chunks.every((chunk) => chunk.pageNumber === 1 || chunk.pageNumber === 2),
		).toBe(true);
	});

	it('numbers chunks continuously across pages', () => {
		const chunks = chunkPages([page(1, 20), page(2, 20)]);
		expect(chunks.map((chunk) => chunk.index)).toEqual(chunks.map((_, i) => i));
	});

	it('drops blank pages instead of storing empty chunks', () => {
		const chunks = chunkPages([
			{ pageNumber: 1, text: 'Some real text.' },
			{ pageNumber: 2, text: '   \n  \n ' },
		]);

		expect(chunks).toHaveLength(1);
		expect(chunks[0].pageNumber).toBe(1);
	});

	it('returns nothing for no pages', () => {
		expect(chunkPages([])).toEqual([]);
	});
});
