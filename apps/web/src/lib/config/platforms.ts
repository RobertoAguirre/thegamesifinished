/** Hardware platforms (not digital stores like Steam / Epic / GOG). */
export const GAME_PLATFORMS = [
	'PC',
	'Steam Deck',
	'PlayStation 5',
	'PlayStation 4',
	'PlayStation 3',
	'PlayStation 2',
	'PlayStation 1',
	'Xbox Series X|S',
	'Xbox One',
	'Xbox 360',
	'Nintendo Switch',
	'Mobile',
	'Other'
] as const;

export type GamePlatform = (typeof GAME_PLATFORMS)[number];

const ALLOWED = new Set<string>(GAME_PLATFORMS);

export function normalizePlatforms(raw: string[]): GamePlatform[] {
	const seen = new Set<string>();
	const out: GamePlatform[] = [];
	for (const value of raw) {
		const trimmed = value.trim();
		if (!ALLOWED.has(trimmed) || seen.has(trimmed)) continue;
		seen.add(trimmed);
		out.push(trimmed as GamePlatform);
	}
	return out;
}

/** Prefer `platforms[]`; fall back to legacy single `platform`. */
export function platformsOf(completion: {
	platform?: string;
	platforms?: string[];
}): string[] {
	if (completion.platforms?.length) return completion.platforms;
	if (completion.platform?.trim()) return [completion.platform.trim()];
	return [];
}
