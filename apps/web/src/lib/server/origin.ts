import { env } from '$env/dynamic/private';

/**
 * Temporary testing URL (Render).
 * When DNS for www.gamesifinished.com is linked, set ORIGIN to that domain.
 */
export const PRODUCTION_ORIGIN = 'https://thegamesifinished.onrender.com';

/**
 * Public site URL for Open Graph / share links.
 * Priority: ORIGIN → RENDER_EXTERNAL_URL → production default → request origin.
 */
export function getSiteOrigin(requestUrl: URL): string {
	const configured = env.ORIGIN?.trim().replace(/\/$/, '');
	if (configured) return configured;

	const renderUrl = env.RENDER_EXTERNAL_URL?.trim().replace(/\/$/, '');
	if (renderUrl) return renderUrl;

	if (env.NODE_ENV === 'production') {
		return PRODUCTION_ORIGIN;
	}

	return requestUrl.origin;
}
