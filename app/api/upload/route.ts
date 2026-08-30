import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { storeChunks } from '@/lib/retrieval';
import { chunkPages, extractPdfPages } from '@/lib/pdf';

const MAX_FILE_SIZE = 4 * 1024 * 1024;

const MAX_PAGES = 50;

// Embeddings are capped at 100 per minute, so dense PDFs can hit the limit
// before the page cap.
const MAX_PASSAGES = 100;

// Embedding a document and waiting for the search index can take close to a minute.
export const maxDuration = 60;

const fileSchema = z
	.instanceof(File, { message: 'No file was uploaded.' })
	.refine((file) => file.size > 0, 'The file is empty.')
	.refine(
		(file) => file.type === 'application/pdf',
		'Only PDF files are accepted.',
	);

export async function POST(request: Request) {
	const started = Date.now();

	// Logs the refusal and returns it, so no request leaves without a trace.
	const reject = (reason: string, status: number) => {
		log('upload.rejected', { reason, status, ms: Date.now() - started });
		return Response.json({ error: reason }, { status });
	};

	const formData = await request.formData().catch(() => null);
	if (!formData) {
		return reject('Send the PDF as form data.', 400);
	}

	const parsed = fileSchema.safeParse(formData.get('file'));
	if (!parsed.success) {
		return reject(parsed.error.issues[0].message, 400);
	}

	const file = parsed.data;

	if (file.size > MAX_FILE_SIZE) {
		return reject('The file is larger than 4 MB.', 413);
	}

	const bytes = new Uint8Array(await file.arrayBuffer());
	const documentId = randomUUID();

	// Stream the stages of processing to the client, so it can show the progress.
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			const send = (data: object) =>
				controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));

			try {
				send({ stage: 'parsing' });
				const parseStart = Date.now();
				const pages = await extractPdfPages(bytes);
				const parseMs = Date.now() - parseStart;

				if (pages.length > MAX_PAGES) {
					throw new Error(
						`This PDF has ${pages.length} pages and the limit is ${MAX_PAGES}.`,
					);
				}

				send({ stage: 'chunking' });
				const chunkStart = Date.now();
				const chunks = chunkPages(pages);
				const chunkMs = Date.now() - chunkStart;

				if (chunks.length > MAX_PASSAGES) {
					throw new Error(
						`This document produces ${chunks.length} passages and the limit is ${MAX_PASSAGES}. Please try a shorter document.`,
					);
				}

				send({ stage: 'embedding' });
				const embedStart = Date.now();
				await storeChunks(documentId, chunks);
				const embedMs = Date.now() - embedStart;

				// Per stage, because a slow upload is otherwise a guess between
				// extraction, embedding, and waiting on the Atlas index.
				log('upload.stored', {
					documentId,
					pages: pages.length,
					chunks: chunks.length,
					parseMs,
					chunkMs,
					embedMs,
					ms: Date.now() - started,
				});

				send({
					documentId,
					filename: file.name,
					pageCount: pages.length,
					chunkCount: chunks.length,
				});
			} catch (error) {
				log('upload.failed', {
					documentId,
					ms: Date.now() - started,
					error: error instanceof Error ? error.message : 'unknown',
				});

				send({
					error:
						error instanceof Error ? error.message : 'Could not read this PDF.',
				});
			} finally {
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'application/x-ndjson',
			'Cache-Control': 'no-store',
		},
	});
}
