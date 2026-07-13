import { json } from '@sveltejs/kit';
import { getRawgStats, verifyRawgConnection } from '$lib/server/rawg';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const result = await verifyRawgConnection();
	return json(
		{ ...result, stats: getRawgStats() },
		{ status: result.ok ? 200 : 503 }
	);
};
