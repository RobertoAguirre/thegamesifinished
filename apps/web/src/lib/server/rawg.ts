import type { RawgGame } from '@tgif/db';
import { env } from '$env/dynamic/private';

const RAWG_BASE = 'https://api.rawg.io/api';

/** Free plan: 20,000 requests / period — cache hard, fetch sparingly. */
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const MAX_CONCURRENT = 2;
const FETCH_TIMEOUT_MS = 8_000;
const MIN_QUERY_LENGTH = 2;
const PAGE_SIZE = 8;

type CacheEntry = {
	results: RawgGame[];
	expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<RawgGame[]>>();

let activeRequests = 0;
const waitQueue: Array<() => void> = [];

let requestCount = 0;
let cacheHits = 0;
let cacheMisses = 0;

export function hasRawgApiKey(): boolean {
	return Boolean(env.RAWG_API_KEY?.trim());
}

function normalizeQuery(query: string): string {
	return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getCached(key: string): RawgGame[] | null {
	const entry = cache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		cache.delete(key);
		return null;
	}
	return entry.results;
}

function setCached(key: string, results: RawgGame[]): void {
	if (cache.size >= MAX_CACHE_ENTRIES) {
		const oldest = cache.keys().next().value;
		if (oldest) cache.delete(oldest);
	}
	cache.set(key, { results, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function withConcurrency<T>(task: () => Promise<T>): Promise<T> {
	if (activeRequests >= MAX_CONCURRENT) {
		await new Promise<void>((resolve) => waitQueue.push(resolve));
	}

	activeRequests += 1;
	try {
		return await task();
	} finally {
		activeRequests -= 1;
		const next = waitQueue.shift();
		if (next) next();
	}
}

async function fetchRawgGames(params: URLSearchParams): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		return await fetch(`${RAWG_BASE}/games?${params}`, {
			signal: controller.signal,
			headers: { Accept: 'application/json' }
		});
	} finally {
		clearTimeout(timer);
	}
}

type RawgStoreRow = { storeId: number; url: string };

const storesCache = new Map<number, { links: RawgStoreRow[]; expiresAt: number }>();

/**
 * Fetch store URLs for a RAWG game (Steam, Epic, GOG, …).
 * Cached 15 min; one request per rawgId.
 */
export async function fetchGameStoreLinks(rawgId: number): Promise<RawgStoreRow[]> {
	if (!hasRawgApiKey() || !Number.isFinite(rawgId)) return [];

	const cached = storesCache.get(rawgId);
	if (cached && Date.now() < cached.expiresAt) return cached.links;

	return withConcurrency(async () => {
		requestCount += 1;
		const params = new URLSearchParams({ key: env.RAWG_API_KEY!.trim() });
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		try {
			const response = await fetch(`${RAWG_BASE}/games/${rawgId}/stores?${params}`, {
				signal: controller.signal,
				headers: { Accept: 'application/json' }
			});

			if (!response.ok) {
				if (response.status !== 404) {
					console.warn('RAWG stores failed:', response.status);
				}
				return [];
			}

			const data = (await response.json()) as {
				results?: Array<{ store_id?: number; url?: string }>;
			};

			const links: RawgStoreRow[] = (data.results ?? [])
				.map((r) => ({
					storeId: Number(r.store_id),
					url: String(r.url ?? '').trim()
				}))
				.filter((r) => Number.isFinite(r.storeId) && r.url);

			storesCache.set(rawgId, { links, expiresAt: Date.now() + CACHE_TTL_MS });
			return links;
		} finally {
			clearTimeout(timer);
		}
	});
}

async function requestSearch(normalized: string): Promise<RawgGame[]> {
	const params = new URLSearchParams({
		search: normalized,
		page_size: String(PAGE_SIZE),
		key: env.RAWG_API_KEY!.trim()
	});

	return withConcurrency(async () => {
		requestCount += 1;
		const response = await fetchRawgGames(params);

		if (response.status === 429) {
			console.warn('RAWG rate limited (429)');
			return [];
		}

		if (!response.ok) {
			console.error('RAWG search failed:', response.status);
			return [];
		}

		const data = (await response.json()) as { results?: RawgGame[] };
		const results = (data.results ?? []).map((game) => ({
			id: game.id,
			name: game.name,
			background_image: game.background_image,
			released: game.released
		}));

		setCached(normalized, results);
		return results;
	});
}

/**
 * Search games via RAWG.
 * Dedupes in-flight queries and caches results for 15 minutes.
 */
export async function searchGames(query: string): Promise<RawgGame[]> {
	const normalized = normalizeQuery(query);
	if (normalized.length < MIN_QUERY_LENGTH) return [];

	if (!hasRawgApiKey()) {
		console.warn('RAWG_API_KEY is not configured — game search disabled');
		return [];
	}

	const cached = getCached(normalized);
	if (cached) {
		cacheHits += 1;
		return cached;
	}

	const pending = inFlight.get(normalized);
	if (pending) {
		cacheHits += 1;
		return pending;
	}

	cacheMisses += 1;
	const promise = requestSearch(normalized).finally(() => {
		inFlight.delete(normalized);
	});
	inFlight.set(normalized, promise);
	return promise;
}

export function getRawgStats() {
	return {
		enabled: hasRawgApiKey(),
		cacheSize: cache.size,
		cacheHits,
		cacheMisses,
		outboundRequests: requestCount,
		activeRequests,
		queued: waitQueue.length,
		cacheTtlMinutes: CACHE_TTL_MS / 60_000,
		maxConcurrent: MAX_CONCURRENT
	};
}

/** Health: key presence only — never burns RAWG quota on probes. */
export async function verifyRawgConnection(): Promise<{ ok: boolean; message: string }> {
	if (!hasRawgApiKey()) {
		return { ok: false, message: 'RAWG_API_KEY is not configured' };
	}

	const stats = getRawgStats();
	return {
		ok: true,
		message: `configured · cache ${stats.cacheSize} · out ${stats.outboundRequests}`
	};
}
