import { connectDb } from '@tgif/db';
import { env } from '$env/dynamic/private';

let dbPromise: ReturnType<typeof connectDb> | null = null;

export function getDb() {
	const uri = env.MONGODB_URI;
	if (!uri) {
		throw new Error('MONGODB_URI is not configured');
	}
	if (!dbPromise) {
		dbPromise = connectDb(uri);
	}
	return dbPromise;
}
