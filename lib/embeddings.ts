import { google } from '@ai-sdk/google';
import { embed, embedMany } from 'ai';

const MODEL = 'gemini-embedding-001';

export const EMBEDDING_DIMENSIONS = 1536;

export async function embedPassages(texts: string[]): Promise<number[][]> {
	const { embeddings } = await embedMany({
		model: google.embeddingModel(MODEL),
		values: texts,
		providerOptions: {
			google: {
				outputDimensionality: EMBEDDING_DIMENSIONS,
				taskType: 'RETRIEVAL_DOCUMENT',
			},
		},
	});

	return embeddings;
}

export async function embedQuestion(question: string): Promise<number[]> {
	const { embedding } = await embed({
		model: google.embeddingModel(MODEL),
		value: question,
		providerOptions: {
			google: {
				outputDimensionality: EMBEDDING_DIMENSIONS,
				taskType: 'RETRIEVAL_QUERY',
			},
		},
	});

	return embedding;
}
