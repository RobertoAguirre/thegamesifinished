import type { Completion, DifficultyTier } from '@tgif/db';
import { getDb } from '../db';

const XP_MULTIPLIER: Record<DifficultyTier, number> = {
	easy: 1.0,
	medium: 1.3,
	hard: 1.6,
	extreme: 2.0
};

export function ratingToTier(rating: number): DifficultyTier {
	if (rating <= 1.75) return 'easy';
	if (rating <= 2.75) return 'medium';
	if (rating <= 3.75) return 'hard';
	return 'extreme';
}

/** Community tier for a game. <3 ratings → neutral medium. */
export async function getCommunityDifficultyTier(
	gameKey: { rawgId?: number; gameTitle: string }
): Promise<{ tier: DifficultyTier; avg: number | null; sampleSize: number }> {
	const db = await getDb();
	const match =
		gameKey.rawgId != null
			? { rawgId: gameKey.rawgId, difficultyRating: { $gte: 1, $lte: 5 } }
			: {
					gameTitle: gameKey.gameTitle,
					difficultyRating: { $gte: 1, $lte: 5 }
				};

	const rows = await db
		.collection<Completion>('completions')
		.find(match, { projection: { difficultyRating: 1 } })
		.toArray();

	const ratings = rows
		.map((r: Completion) => r.difficultyRating)
		.filter((n: number | undefined): n is number => typeof n === 'number');

	if (ratings.length < 3) {
		return { tier: 'medium', avg: null, sampleSize: ratings.length };
	}

	const avg = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
	return { tier: ratingToTier(avg), avg, sampleSize: ratings.length };
}

export function xpForTier(tier: DifficultyTier): number {
	return Math.round(100 * XP_MULTIPLIER[tier]);
}

export function enrichCompletionTier(
	completion: Completion,
	tierByGameKey: Map<string, DifficultyTier>
): DifficultyTier {
	const key =
		completion.rawgId != null
			? `id:${completion.rawgId}`
			: `title:${completion.gameTitle.toLowerCase()}`;
	return tierByGameKey.get(key) ?? 'medium';
}

export async function buildUserGameTier(
	completions: Completion[]
): Promise<Map<string, DifficultyTier>> {
	const map = new Map<string, DifficultyTier>();
	const unique = new Map<string, { rawgId?: number; gameTitle: string }>();

	for (const c of completions) {
		const key = c.rawgId != null ? `id:${c.rawgId}` : `title:${c.gameTitle.toLowerCase()}`;
		if (!unique.has(key)) {
			unique.set(key, { rawgId: c.rawgId, gameTitle: c.gameTitle });
		}
	}

	await Promise.all(
		[...unique.entries()].map(async ([key, game]) => {
			const { tier } = await getCommunityDifficultyTier(game);
			map.set(key, tier);
		})
	);

	return map;
}
