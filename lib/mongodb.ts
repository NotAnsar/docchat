import { MongoClient, type Collection, type Document } from 'mongodb';

const DB_NAME = 'docchat';

// Global variable to hold the MongoClient promise, so it can be reused across function calls.
const globalForMongo = globalThis as { mongo?: Promise<MongoClient> };

function getClient(): Promise<MongoClient> {
	const uri = process.env.MONGO_URI;
	if (!uri) throw new Error('MONGO_URI is not set.');

	globalForMongo.mongo ??= new MongoClient(uri).connect();
	return globalForMongo.mongo;
}

export async function getCollection<T extends Document>(
	name: string,
): Promise<Collection<T>> {
	return getClient().then((client) => client.db(DB_NAME).collection<T>(name));
}
