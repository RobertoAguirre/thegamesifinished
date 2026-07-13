import { m } from '$lib/paraglide/messages.js';

const badgeBySlug: Record<string, { name: () => string; description: () => string }> = {
	'first-finish': {
		name: () => m.badge_first_finish_name(),
		description: () => m.badge_first_finish_description()
	},
	'ten-club': {
		name: () => m.badge_ten_club_name(),
		description: () => m.badge_ten_club_description()
	},
	'iron-will': {
		name: () => m.badge_iron_will_name(),
		description: () => m.badge_iron_will_description()
	},
	'platform-hopper': {
		name: () => m.badge_platform_hopper_name(),
		description: () => m.badge_platform_hopper_description()
	},
	'steady-pace': {
		name: () => m.badge_steady_pace_name(),
		description: () => m.badge_steady_pace_description()
	},
	'weekend-warrior': {
		name: () => m.badge_weekend_warrior_name(),
		description: () => m.badge_weekend_warrior_description()
	}
};

const rankBySlug: Record<string, () => string> = {
	recruit: () => m.rank_recruit(),
	soldier: () => m.rank_soldier(),
	corporal: () => m.rank_corporal(),
	sergeant: () => m.rank_sergeant(),
	lieutenant: () => m.rank_lieutenant(),
	captain: () => m.rank_captain(),
	commander: () => m.rank_commander(),
	general: () => m.rank_general(),
	legend: () => m.rank_legend()
};

/** Localize badge copy by slug; keep DB values as fallback (and never rewrite user/admin custom badges). */
export function localizeBadge<T extends { slug: string; name: string; description: string }>(
	badge: T
): T {
	const entry = badgeBySlug[badge.slug];
	if (!entry) return badge;
	return { ...badge, name: entry.name(), description: entry.description() };
}

/** Localize rank name by slug; fallback to stored English name. */
export function localizeRankName(slug: string | undefined, fallback: string): string {
	if (!slug) return fallback;
	return rankBySlug[slug]?.() ?? fallback;
}
