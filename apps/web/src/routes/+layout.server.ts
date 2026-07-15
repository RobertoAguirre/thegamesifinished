import { buildClerkProps } from 'svelte-clerk/server';
import { hasRawgApiKey } from '$lib/server/rawg';
import { getUnreadCount } from '$lib/server/notifications';
import { getSiteOrigin } from '$lib/server/origin';
import { getUserByClerkId } from '$lib/server/users';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const auth = locals.auth();

	let unreadNotifications = 0;
	if (auth.userId) {
		try {
			const user = await getUserByClerkId(auth.userId);
			if (user) unreadNotifications = await getUnreadCount(user._id);
		} catch {
			// la campana no debe tumbar el layout
		}
	}

	return {
		...buildClerkProps(auth),
		siteOrigin: getSiteOrigin(url),
		rawgEnabled: hasRawgApiKey(),
		unreadNotifications
	};
};
