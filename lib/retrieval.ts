import { embedPassages, embedQuestion } from '@/lib/embeddings';
import { getCollection } from '@/lib/mongodb';
import type { Chunk } from '@/lib/pdf';

const COLLECTION = 'chunks';
const VECTOR_INDEX = 'chunks_vector_index';
const TOP_K = 5;

type StoredChunk = {
	documentId: string;
	index: number;
	text: string;
	pageNumber: number;
	embedding: number[];
};

export type Match = {
	text: string;
	pageNumber: number;
	score: number;
};

export async function storeChunks(documentId: string, chunks: Chunk[]) {
	const [embeddings, collection] = await Promise.all([
		embedPassages(chunks.map((chunk) => chunk.text)),
		getCollection<StoredChunk>(COLLECTION),
	]);

	await collection.insertMany(
		chunks.map((chunk, i) => ({
			documentId,
			index: chunk.index,
			text: chunk.text,
			pageNumber: chunk.pageNumber,
			embedding: embeddings[i],
		})),
	);

	// Atlas indexes new documents asynchronously, so a question asked right
	// after an upload would find nothing.
	try {
		await waitUntilSearchable(documentId, embeddings[0]);
	} catch (error) {
		// Stored but unusable, so remove them: a retry would otherwise duplicate.
		await collection.deleteMany({ documentId });
		throw error;
	}
}

export class IndexNotReadyError extends Error {}

async function waitUntilSearchable(documentId: string, probe: number[]) {
	const collection = await getCollection<StoredChunk>(COLLECTION);

	for (let attempt = 0; attempt < 60; attempt++) {
		const found = await collection
			.aggregate([
				{
					$vectorSearch: {
						index: VECTOR_INDEX,
						path: 'embedding',
						queryVector: probe,
						numCandidates: 10,
						limit: 1,
						filter: { documentId },
					},
				},
				{ $project: { _id: 1 } },
			])
			.toArray();

		if (found.length > 0) return;
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	throw new IndexNotReadyError(
		'The search index did not update in time. Please try again in a moment.',
	);
}

export async function findRelevantChunks(
	documentId: string,
	question: string,
): Promise<Match[]> {
	const queryVector = await embedQuestion(question);
	const collection = await getCollection<StoredChunk>(COLLECTION);

	return collection
		.aggregate<Match>([
			{
				$vectorSearch: {
					index: VECTOR_INDEX,
					path: 'embedding',
					queryVector,
					// Scan wider than we keep: the index is approximate, so more
					// candidates means better matches and a slower query.
					numCandidates: TOP_K * 10,
					limit: TOP_K,
					filter: { documentId },
				},
			},
			{
				$project: {
					_id: 0,
					text: 1,
					pageNumber: 1,
					score: { $meta: 'vectorSearchScore' },
				},
			},
		])
		.toArray();
}
