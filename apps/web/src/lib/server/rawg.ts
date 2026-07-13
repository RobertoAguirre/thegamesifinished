import type { RawgGame } from '@tgif/db';
import { env } from '$env/dynamic/private';

const RAWG_BASE = 'https://api.rawg.io/api';

export async function searchGames(query: string): Promise<RawgGame[]> {
	if (!query.trim()) return [];

	const params = new URLSearchParams({
		search: query.trim(),
		page_size: '8'
	});

	if (env.RAWG_API_KEY) {
		params.set('key', env.RAWG_API_KEY);
	}

	const response = await fetch(`${RAWG_BASE}/games?${params}`);

	if (!response.ok) {
		console.error('RAWG search failed:', response.status);
		return [];
	}

	const data = (await response.json()) as { results?: RawgGame[] };
	return data.results ?? [];
}
