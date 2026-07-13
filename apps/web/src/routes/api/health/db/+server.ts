import { getDb } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const db = await getDb();
		const ping = await db.command({ ping: 1 });
		const collections = await db.listCollections().toArray();

		return json({
			ok: true,
			database: db.databaseName,
			ping,
			collections: collections.map((c) => c.name)
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ ok: false, error: message }, { status: 500 });
	}
};
