import { buildClerkProps } from 'svelte-clerk/server';
import { hasRawgApiKey } from '$lib/server/rawg';
import { getSiteOrigin } from '$lib/server/origin';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	return {
		...buildClerkProps(locals.auth()),
		siteOrigin: getSiteOrigin(url),
		rawgEnabled: hasRawgApiKey()
	};
};
