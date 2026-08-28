import { extractText } from 'unpdf';

// ~250 tokens: small enough that one chunk is about one idea, big enough to keep context.
const CHUNK_SIZE = 1000;
// The last CHUNK_OVERLAP characters of a chunk are repeated at the start of the next chunk. to give context
const CHUNK_OVERLAP = 200;

export type PageText = {
	pageNumber: number;
	text: string;
};

export type Chunk = {
	index: number;
	text: string;
	pageNumber: number;
};

/**
 * Reads a PDF page by page, so every chunk keeps the page it came from.
 * Throws on scanned PDFs, where the pages are images and would need OCR.
 */
export async function extractPdfPages(data: Uint8Array): Promise<PageText[]> {
	// mergePages: false gives one string per page instead of one long string.
	const { text } = await extractText(data, { mergePages: false });

	const pages = text
		.map((raw, index) => ({
			pageNumber: index + 1,
			// Collapse layout spacing, but keep line breaks: chunking splits on them.
			text: raw
				.replace(/\r\n/g, '\n')
				.replace(/[ \t]+/g, ' ')
				.trim(),
		}))
		.filter((page) => page.text.length > 0);

	if (pages.length === 0) {
		throw new Error(
			'This PDF has no selectable text. It is probably a scan, which would need OCR.',
		);
	}

	return pages;
}

/**
 * Splits pages into overlapping chunks. Chunks never span two pages, so every
 * page number stays exact; the cost is no overlap across a page break.
 */
export function chunkPages(pages: PageText[]): Chunk[] {
	const chunks: Chunk[] = [];

	for (const page of pages) {
		for (const text of splitPage(page.text)) {
			chunks.push({ index: chunks.length, text, pageNumber: page.pageNumber });
		}
	}

	return chunks;
}

function splitPage(text: string): string[] {
	// Split on line breaks, then hard split long lines. Filter out empty segments.
	const segments = text
		.split('\n')
		.flatMap((line) =>
			line.length <= CHUNK_SIZE ? [line] : hardSplit(line, CHUNK_SIZE),
		)
		.filter((segment) => segment.trim().length > 0);

	const chunks: string[] = [];
	let current = '';

	for (const segment of segments) {
		const wouldExceed = current.length + segment.length + 1 > CHUNK_SIZE;

		if (wouldExceed && current.length > 0) {
			chunks.push(current);
			current = overlapTail(current);
		}

		current = current.length > 0 ? `${current}\n${segment}` : segment;
	}

	if (current.trim().length > 0) chunks.push(current);

	return chunks;
}

function hardSplit(line: string, size: number): string[] {
	const pieces: string[] = [];
	for (let i = 0; i < line.length; i += size) {
		pieces.push(line.slice(i, i + size));
	}
	return pieces;
}

function overlapTail(text: string): string {
	if (text.length <= CHUNK_OVERLAP) return text;

	const tail = text.slice(-CHUNK_OVERLAP);
	const firstSpace = tail.search(/\s/);

	return firstSpace === -1 ? tail : tail.slice(firstSpace + 1);
}
