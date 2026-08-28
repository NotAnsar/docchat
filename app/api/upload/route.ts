import { z } from 'zod';
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

	try {
		// uint8array is needed because the PDF library expects a byte array, not a blob.
		const pages = await extractPdfPages(
			new Uint8Array(await file.arrayBuffer()),
		);

		const chunks = chunkPages(pages);

		return Response.json({
			filename: file.name,
			pageCount: pages.length,
			chunkCount: chunks.length,
		});
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
}
