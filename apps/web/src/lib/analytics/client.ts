import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { FEATURE_FLAGS } from '$lib/config/flags';
import type { AnalyticsEvent } from './events';
import { classifyReferrer, type TrafficSource } from './referrer';

type Props = Record<string, string | number | boolean | null | undefined>;

let initialized = false;
let posthog: typeof import('posthog-js').default | null = null;

function canTrack(): boolean {
	return (
		browser &&
		FEATURE_FLAGS.analyticsEnabled &&
		Boolean(env.PUBLIC_POSTHOG_KEY?.trim())
	);
}

/** Lazy-load PostHog only when a project key is configured (keeps share pages light otherwise). */
export async function initAnalytics(): Promise<void> {
	if (!canTrack() || initialized) return;
	initialized = true;

	const mod = await import('posthog-js');
	posthog = mod.default;
	posthog.init(env.PUBLIC_POSTHOG_KEY!.trim(), {
		api_host: env.PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com',
		capture_pageview: false,
		capture_pageleave: false,
		persistence: 'memory',
		disable_session_recording: true
	});
}

export async function track(event: AnalyticsEvent, properties?: Props): Promise<void> {
	if (!canTrack()) return;
	await initAnalytics();
	posthog?.capture(event, properties);
}

export function currentTrafficSource(): TrafficSource {
	if (!browser) return 'direct';
	return classifyReferrer(document.referrer);
}

export async function trackCompletionPageview(props: {
	completionId: string;
	gameTitle: string;
	username: string;
}): Promise<void> {
	await track('completion_pageview', {
		...props,
		traffic_source: currentTrafficSource(),
		referrer: browser ? document.referrer || null : null
	});
}
