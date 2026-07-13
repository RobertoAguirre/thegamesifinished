/**
 * Central feature flags — flip values here (or wire to env later)
 * without rewriting page markup.
 */
export const FEATURE_FLAGS = {
	/** AdSlot renders reserved space / future provider only when true */
	adsEnabled: false,
	/** Affiliate “get this game” buttons */
	affiliateLinksEnabled: true,
	/** Future sponsored challenge placements */
	sponsoredChallengesEnabled: false,
	/**
	 * Client + server product analytics.
	 * Still no-ops unless PUBLIC_POSTHOG_KEY is set.
	 */
	analyticsEnabled: true
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/** Which AdSlot positions may activate when adsEnabled is true */
export const AD_SLOT_CONFIG: Record<string, boolean> = {
	'feed-inline': true,
	'sidebar': true,
	'completion-below-comments': true
};
