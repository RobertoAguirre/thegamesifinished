import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { FEATURE_FLAGS } from '$lib/config/flags';
import type { AnalyticsEvent } from './events';

type Props = Record<string, string | number | boolean | null | undefined>;

let client: import('posthog-node').PostHog | null = null;

function projectKey(): string | undefined {
	return (
		privateEnv.POSTHOG_API_KEY?.trim() ||
		publicEnv.PUBLIC_POSTHOG_KEY?.trim() ||
		undefined
	);
}

async function getClient(): Promise<import('posthog-node').PostHog | null> {
	if (!FEATURE_FLAGS.analyticsEnabled) return null;
	const key = projectKey();
	if (!key) return null;

	if (!client) {
		const { PostHog } = await import('posthog-node');
		client = new PostHog(key, {
			host: publicEnv.PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com',
			flushAt: 1,
			flushInterval: 0
		});
	}
	return client;
}

/** Fire-and-forget server capture (badges, 2nd completion). Never throws to callers. */
export async function trackServer(
	distinctId: string,
	event: AnalyticsEvent,
	properties?: Props
): Promise<void> {
	try {
		const ph = await getClient();
		if (!ph) return;
		ph.capture({
			distinctId,
			event,
			properties: { ...properties, source: 'server' }
		});
		await ph.flush();
	} catch (err) {
		console.warn('PostHog server capture failed:', err);
	}
}
