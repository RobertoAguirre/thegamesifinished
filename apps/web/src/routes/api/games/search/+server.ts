import { json } from '@sveltejs/kit';
import { searchGames } from '$lib/server/rawg';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	const results = await searchGames(q);
	return json({ results });
};
