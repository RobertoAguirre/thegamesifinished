export type TrafficSource = 'instagram' | 'facebook' | 'tiktok' | 'direct' | 'other';

/** Classify referrer for share-loop measurement. */
export function classifyReferrer(referrer: string | null | undefined): TrafficSource {
	if (!referrer) return 'direct';

	let host: string;
	try {
		host = new URL(referrer).hostname.toLowerCase();
	} catch {
		return 'other';
	}

	if (host.includes('instagram.') || host === 'l.instagram.com') return 'instagram';
	if (host.includes('facebook.') || host.includes('fb.') || host === 'lm.facebook.com') {
		return 'facebook';
	}
	if (host.includes('tiktok.') || host.includes('tiktokv.')) return 'tiktok';

	return 'other';
}
