// One-time setup: creates the Atlas vector search index used by lib/retrieval.ts.
// Run with: node --env-file=.env scripts/create-vector-index.mjs
import { MongoClient } from 'mongodb';

const DB_NAME = 'docchat';
const COLLECTION = 'chunks';
const INDEX_NAME = 'chunks_vector_index';

const client = new MongoClient(process.env.MONGO_URI);

try {
	await client.connect();
	const db = client.db(DB_NAME);

	// $vectorSearch needs the collection to exist before the index can be built.
	const existing = await db.listCollections({ name: COLLECTION }).toArray();
	if (existing.length === 0) {
		await db.createCollection(COLLECTION);
		console.log(`created collection "${COLLECTION}"`);
	}

	const collection = db.collection(COLLECTION);
	const indexes = await collection.listSearchIndexes().toArray();

	if (indexes.some((i) => i.name === INDEX_NAME)) {
		console.log(`index "${INDEX_NAME}" already exists`);
	} else {
		await collection.createSearchIndex({
			name: INDEX_NAME,
			type: 'vectorSearch',
			definition: {
				fields: [
					{
						type: 'vector',
						path: 'embedding',
						numDimensions: 1536,
						// Cosine compares direction (meaning), not magnitude (length).
						similarity: 'cosine',
					},
					// Declared so a search can be limited to one document.
					{ type: 'filter', path: 'documentId' },
				],
			},
		});
		console.log(`created index "${INDEX_NAME}" — Atlas builds it in the background`);
	}

	// The index is only usable once its status reaches READY.
	for (let i = 0; i < 30; i++) {
		const [index] = await collection.listSearchIndexes(INDEX_NAME).toArray();
		if (index?.status === 'READY') {
			console.log('index status: READY');
			break;
		}
		console.log(`index status: ${index?.status ?? 'PENDING'} — waiting...`);
		await new Promise((r) => setTimeout(r, 3000));
	}
} finally {
	await client.close();
}
