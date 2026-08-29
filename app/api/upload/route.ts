import { randomUUID } from 'node:crypto';
import { z } from 'zod';
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
	const formData = await request.formData().catch(() => null);
	if (!formData) {
		return Response.json(
			{ error: 'Send the PDF as form data.' },
			{ status: 400 },
		);
	}

	const parsed = fileSchema.safeParse(formData.get('file'));
	if (!parsed.success) {
		return Response.json(
			{ error: parsed.error.issues[0].message },
			{ status: 400 },
		);
	}

	const file = parsed.data;

	if (file.size > MAX_FILE_SIZE) {
		return Response.json(
			{ error: 'The file is larger than 4 MB.' },
			{ status: 413 },
		);
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
				const pages = await extractPdfPages(bytes);

				if (pages.length > MAX_PAGES) {
					throw new Error(
						`This PDF has ${pages.length} pages and the limit is ${MAX_PAGES}.`,
					);
				}

				send({ stage: 'chunking' });
				const chunks = chunkPages(pages);

				if (chunks.length > MAX_PASSAGES) {
					throw new Error(
						`This document produces ${chunks.length} passages and the limit is ${MAX_PASSAGES}. Please try a shorter document.`,
					);
				}

				send({ stage: 'embedding' });
				await storeChunks(documentId, chunks);

				send({
					documentId,
					filename: file.name,
					pageCount: pages.length,
					chunkCount: chunks.length,
				});
			} catch (error) {
				console.error('[upload] failed', error);
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
