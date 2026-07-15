import type { RawgGame } from '@tgif/db';
import { env } from '$env/dynamic/private';
import { hasRawgApiKey, searchGames } from './rawg';

const RAWG_BASE = 'https://api.rawg.io/api';
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_RESULTS = 4;
const FETCH_TIMEOUT_MS = 8_000;

export type RecommendationReason = 'similar' | 'series' | 'genre' | 'platform' | 'community';

export type RecommendedGame = {
	id: number;
	name: string;
	backgroundImage?: string;
	released?: string;
	reason: RecommendationReason;
};

export type RecommendationInput = {
	gameTitle: string;
	rawgId?: number;
	platforms?: string[];
	/** Titles the user already logged — skip these. */
	excludeTitles?: string[];
	limit?: number;
};

/**
 * Pluggable source. Today: RAWG suggested/genre.
 * Later: swap or compose with a community-behavior provider.
 */
export interface RecommendationProvider {
	readonly id: string;
	suggest(input: RecommendationInput): Promise<RecommendedGame[]>;
}

type CacheEntry = { items: RecommendedGame[]; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(input: RecommendationInput): string {
	return [
		input.rawgId ?? 'no-id',
		input.gameTitle.trim().toLowerCase(),
		(input.platforms ?? []).join(','),
		(input.excludeTitles ?? []).join('|'),
		input.limit ?? MAX_RESULTS
	].join('::');
}

async function rawgFetch(path: string, params: URLSearchParams): Promise<Response | null> {
	const key = env.RAWG_API_KEY?.trim();
	if (!key) return null;

	params.set('key', key);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		return await fetch(`${RAWG_BASE}${path}?${params}`, {
			signal: controller.signal,
			headers: { Accept: 'application/json' }
		});
	} catch (error) {
		console.warn('RAWG recommendations fetch failed:', error);
		return null;
	} finally {
		clearTimeout(timer);
	}
}

type RawgDetail = {
	id: number;
	name: string;
	background_image?: string;
	released?: string;
	genres?: Array<{ id: number; name: string }>;
	tags?: Array<{ id: number; name: string; slug?: string }>;
};

async function fetchGameDetail(rawgId: number): Promise<RawgDetail | null> {
	const response = await rawgFetch(`/games/${rawgId}`, new URLSearchParams());
	if (!response?.ok) return null;
	return (await response.json()) as RawgDetail;
}

type RawgListGame = RawgGame & { ratings_count?: number };

/**
 * Juegos de la misma saga — el mejor señalador disponible en el plan gratis.
 * (El endpoint /suggested responde 401: es solo del plan Business.)
 */
async function fetchSeries(rawgId: number): Promise<RawgGame[]> {
	const response = await rawgFetch(
		`/games/${rawgId}/game-series`,
		new URLSearchParams({ page_size: '20' })
	);
	if (!response?.ok) return [];
	const data = (await response.json()) as { results?: RawgListGame[] };
	// Los populares primero; fuera demos/mods casi sin votos.
	return (data.results ?? [])
		.filter((g) => (g.ratings_count ?? 0) >= 20)
		.sort((a, b) => (b.ratings_count ?? 0) - (a.ratings_count ?? 0));
}

async function fetchByGenres(genreIds: number[], excludeId: number): Promise<RawgGame[]> {
	if (genreIds.length === 0) return [];
	const response = await rawgFetch(
		'/games',
		new URLSearchParams({
			genres: genreIds.slice(0, 3).join(','),
			page_size: '12',
			// Metacritic alto evita que juegos oscuros con 3 votos de 5★ dominen la lista.
			metacritic: '75,100',
			ordering: '-metacritic'
		})
	);
	if (!response?.ok) return [];
	const data = (await response.json()) as { results?: RawgListGame[] };
	return (data.results ?? []).filter((g) => g.id !== excludeId);
}

function toRecommended(
	game: Pick<RawgGame, 'id' | 'name' | 'background_image' | 'released'>,
	reason: RecommendationReason
): RecommendedGame {
	return {
		id: game.id,
		name: game.name,
		backgroundImage: game.background_image,
		released: game.released,
		reason
	};
}

function dedupeAndFilter(
	items: RecommendedGame[],
	excludeIds: Set<number>,
	excludeTitles: Set<string>,
	limit: number
): RecommendedGame[] {
	const seen = new Set<number>();
	const out: RecommendedGame[] = [];
	for (const item of items) {
		if (excludeIds.has(item.id) || seen.has(item.id)) continue;
		if (excludeTitles.has(item.name.trim().toLowerCase())) continue;
		seen.add(item.id);
		out.push(item);
		if (out.length >= limit) break;
	}
	return out;
}

export const rawgRecommendationProvider: RecommendationProvider = {
	id: 'rawg',

	async suggest(input) {
		if (!hasRawgApiKey()) return [];

		const limit = input.limit ?? MAX_RESULTS;
		const excludeTitles = new Set(
			(input.excludeTitles ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)
		);
		excludeTitles.add(input.gameTitle.trim().toLowerCase());

		let rawgId = input.rawgId;
		if (rawgId == null || !Number.isFinite(rawgId)) {
			const hits = await searchGames(input.gameTitle);
			rawgId = hits[0]?.id;
		}
		if (rawgId == null) return [];

		const excludeIds = new Set<number>([rawgId]);
		const pooled: RecommendedGame[] = [];

		const series = await fetchSeries(rawgId);
		for (const game of series) {
			pooled.push(toRecommended(game, 'series'));
		}

		if (pooled.length < limit) {
			const detail = await fetchGameDetail(rawgId);
			const genreIds = (detail?.genres ?? []).map((g) => g.id).filter(Boolean);
			const byGenre = await fetchByGenres(genreIds, rawgId);
			for (const game of byGenre) {
				pooled.push(toRecommended(game, 'genre'));
			}
		}

		return dedupeAndFilter(pooled, excludeIds, excludeTitles, limit);
	}
};

/** Active provider — swap this (or compose) when community behavior is ready. */
let activeProvider: RecommendationProvider = rawgRecommendationProvider;

export function setRecommendationProvider(provider: RecommendationProvider): void {
	activeProvider = provider;
}

export async function getRecommendationsForCompletion(
	input: RecommendationInput
): Promise<RecommendedGame[]> {
	const key = cacheKey(input);
	const hit = cache.get(key);
	if (hit && Date.now() < hit.expiresAt) return hit.items;

	try {
		const items = await activeProvider.suggest(input);
		cache.set(key, { items, expiresAt: Date.now() + CACHE_TTL_MS });
		return items;
	} catch (error) {
		console.warn('Recommendations failed:', error);
		return [];
	}
}
