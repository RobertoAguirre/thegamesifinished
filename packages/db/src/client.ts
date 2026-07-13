import { MongoClient, type Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb(uri: string): Promise<Db> {
	if (db) return db;

	client = new MongoClient(uri);
	await client.connect();
	db = client.db();
	return db;
}

export async function disconnectDb(): Promise<void> {
	if (client) {
		await client.close();
		client = null;
		db = null;
	}
}
