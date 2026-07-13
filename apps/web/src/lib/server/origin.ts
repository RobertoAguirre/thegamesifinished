import { env } from '$env/dynamic/private';

/** Canonical production domain (www redirects here in Render). */
export const PRODUCTION_ORIGIN = 'https://gamesifinished.com';

/** Preview / staging on Render before custom domain is primary. */
export const RENDER_ORIGIN = 'https://thegamesifinished.onrender.com';

const KNOWN_HOSTS = new Set([
	'gamesifinished.com',
	'www.gamesifinished.com',
	'thegamesifinished.onrender.com'
]);

/**
 * Public site URL for Open Graph / share links / canonical absolute URLs.
 * Priority: ORIGIN env → request host (known domains) → RENDER_EXTERNAL_URL → production.
 */
export function getSiteOrigin(requestUrl: URL): string {
	const configured = env.ORIGIN?.trim().replace(/\/$/, '');
	if (configured) return configured;

	const host = requestUrl.hostname.toLowerCase();
	if (host === 'gamesifinished.com' || host === 'www.gamesifinished.com') {
		return PRODUCTION_ORIGIN;
	}
	if (host === 'thegamesifinished.onrender.com' || host.endsWith('.onrender.com')) {
		return requestUrl.origin.replace(/\/$/, '');
	}

	const renderUrl = env.RENDER_EXTERNAL_URL?.trim().replace(/\/$/, '');
	if (renderUrl) return renderUrl;

	if (env.NODE_ENV === 'production') {
		return PRODUCTION_ORIGIN;
	}

	if (KNOWN_HOSTS.has(host)) {
		return requestUrl.origin.replace(/\/$/, '');
	}

	return requestUrl.origin.replace(/\/$/, '');
}
