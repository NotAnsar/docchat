import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { IndexNotReadyError, storeChunks } from '@/lib/retrieval';
import { chunkPages, extractPdfPages } from '@/lib/pdf';

const MAX_FILE_SIZE = 4 * 1024 * 1024;

const fileSchema = z
	.instanceof(File, { message: 'No file was uploaded.' })
	.refine((file) => file.size > 0, 'The file is empty.')
	.refine(
		(file) => file.type === 'application/pdf',
		'Only PDF files are accepted.',
	);

export async function POST(request: Request) {
	const formData = await request.formData();
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

	let chunks;
	let pageCount;

	try {
		const pages = await extractPdfPages(
			new Uint8Array(await file.arrayBuffer()),
		);
		chunks = chunkPages(pages);
		pageCount = pages.length;
	} catch (error) {
		console.error('[upload] extraction failed', error);

		// The request was well formed, but this file cannot be read: a scan, or
		// a damaged PDF. That is 422, not 500 — nothing is broken on our side.
		return Response.json(
			{
				error:
					error instanceof Error ? error.message : 'Could not read this PDF.',
			},
			{ status: 422 },
		);
	}

	// The id ties every passage to this upload, so a question searches only
	// the document it was asked about.
	const documentId = randomUUID();

	try {
		await storeChunks(documentId, chunks);
	} catch (error) {
		console.error('[upload] embedding or storage failed', error);

		// Temporary: the document is stored, the index just lagged.
		if (error instanceof IndexNotReadyError) {
			return Response.json({ error: error.message }, { status: 503 });
		}

		// Here the file was fine and we broke: the embedding API or the database.
		return Response.json(
			{ error: 'Could not process this document. Please try again.' },
			{ status: 500 },
		);
	}

	return Response.json({
		documentId,
		filename: file.name,
		pageCount,
		chunkCount: chunks.length,
	});
}
