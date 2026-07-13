import type { Game, StoreId, StoreLink } from '@tgif/db';
import { getDb } from './db';
import { fetchGameStoreLinks } from './rawg';

function slugify(title: string): string {
	return title
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 120);
}

/** Map RAWG store_id → our StoreId (see RAWG /stores). */
const RAWG_STORE_MAP: Record<number, StoreId> = {
	1: 'steam',
	3: 'other', // PlayStation Store
	5: 'gog',
	6: 'other', // Nintendo
	11: 'epic'
};

function mapRawgStore(storeId: number, url: string): StoreLink | null {
	const store = RAWG_STORE_MAP[storeId] ?? 'other';
	if (!url) return null;
	return { store, url };
}

/**
 * Upsert Game catalog row and return denormalized store fields for Completions.
 * Best-effort — never fails the completion flow.
 */
export async function resolveGameStoreData(input: {
	gameTitle: string;
	rawgId?: number;
	gameImageUrl?: string;
}): Promise<{ storeUrl?: string; storeLinks?: StoreLink[] }> {
	try {
		const rawLinks =
			input.rawgId != null ? await fetchGameStoreLinks(input.rawgId) : [];

		const storeLinks: StoreLink[] = [];
		for (const row of rawLinks) {
			const mapped = mapRawgStore(row.storeId, row.url);
			if (mapped && !storeLinks.some((l) => l.store === mapped.store)) {
				storeLinks.push(mapped);
			}
		}

		const storeUrl = storeLinks.find((l) => l.store === 'steam')?.url ?? storeLinks[0]?.url;
		const slug = slugify(input.gameTitle);
		const now = new Date();

		const db = await getDb();
		const games = db.collection<Game>('games');

		const filter =
			input.rawgId != null ? { rawgId: input.rawgId } : { slug };

		await games.updateOne(
			filter,
			{
				$set: {
					title: input.gameTitle.trim(),
					slug,
					rawgId: input.rawgId,
					imageUrl: input.gameImageUrl,
					storeUrl,
					storeLinks,
					updatedAt: now
				},
				$setOnInsert: { createdAt: now }
			},
			{ upsert: true }
		);

		return {
			storeUrl: storeUrl || undefined,
			storeLinks: storeLinks.length ? storeLinks : undefined
		};
	} catch (err) {
		console.warn('resolveGameStoreData failed:', err);
		return {};
	}
}
