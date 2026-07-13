import { env } from '$env/dynamic/public';
import type { StoreId, StoreLink } from '@tgif/db';
import { FEATURE_FLAGS } from './flags';

export type AffiliateTarget = {
	href: string;
	label: string;
	store: StoreId;
};

function instantGamingAffiliateId(): string | undefined {
	const id = env.PUBLIC_INSTANT_GAMING_AFFILIATE_ID?.trim();
	return id || undefined;
}

/** Append Instant Gaming `igr` partner tag when configured. */
export function withInstantGamingAffiliate(url: string): string {
	const id = instantGamingAffiliateId();
	if (!id) return url;
	try {
		const u = new URL(url);
		u.searchParams.set('igr', id);
		return u.toString();
	} catch {
		const sep = url.includes('?') ? '&' : '?';
		return `${url}${sep}igr=${encodeURIComponent(id)}`;
	}
}

export function steamSearchUrl(gameTitle: string): string {
	return `https://store.steampowered.com/search/?term=${encodeURIComponent(gameTitle)}`;
}

export function instantGamingSearchUrl(gameTitle: string): string {
	return withInstantGamingAffiliate(
		`https://www.instant-gaming.com/en/search/?q=${encodeURIComponent(gameTitle)}`
	);
}

function pickLink(links: StoreLink[] | undefined, store: StoreId): string | undefined {
	return links?.find((l) => l.store === store)?.url;
}

/**
 * Build the primary utility CTA. Prefer Instant Gaming when an affiliate id
 * is set (open program, works for MX/LatAm); otherwise Steam store or search.
 * Steam itself has no simple individual affiliate program.
 */
export function resolveAffiliateTarget(
	gameTitle: string,
	storeLinks?: StoreLink[],
	storeUrl?: string
): AffiliateTarget | null {
	if (!FEATURE_FLAGS.affiliateLinksEnabled) return null;

	const steam =
		pickLink(storeLinks, 'steam') ||
		(storeUrl?.includes('steampowered.com') ? storeUrl : undefined);
	const ig = pickLink(storeLinks, 'instant_gaming');
	const affiliateId = instantGamingAffiliateId();

	if (affiliateId) {
		return {
			store: 'instant_gaming',
			label: 'Get this game',
			href: ig ? withInstantGamingAffiliate(ig) : instantGamingSearchUrl(gameTitle)
		};
	}

	if (steam) {
		return {
			store: 'steam',
			label: 'Get this game on Steam',
			href: steam
		};
	}

	return {
		store: 'steam',
		label: 'Get this game on Steam',
		href: steamSearchUrl(gameTitle)
	};
}
