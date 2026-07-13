import { json } from '@sveltejs/kit';
import { hasRawgApiKey, searchGames } from '$lib/server/rawg';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, setHeaders }) => {
	const q = (url.searchParams.get('q') ?? '').trim();
	const enabled = hasRawgApiKey();

	if (!enabled) {
		return json({ enabled: false, results: [] });
	}

	if (q.length < 2) {
		return json({ enabled: true, results: [] });
	}

	const results = await searchGames(q);

	setHeaders({
		'Cache-Control': 'private, max-age=60'
	});

	return json({ enabled: true, results });
};
