/** Stable event names for PostHog dashboards / insights. */
export const AnalyticsEvents = {
	completionPageview: 'completion_pageview',
	secondCompletion: 'second_completion',
	shareClick: 'share_click',
	commentPosted: 'comment_posted',
	badgeUnlocked: 'badge_unlocked',
	rankUnlocked: 'rank_unlocked',
	reactionPosted: 'reaction_posted',
	affiliateClick: 'affiliate_click'
} as const;

export type AnalyticsEvent = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];
