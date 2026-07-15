import { error } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages.js';
import {
	listNotifications,
	markAllRead,
	serializeNotification
} from '$lib/server/notifications';
import { getUserByClerkId } from '$lib/server/users';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();
	if (!userId) error(401, m.error_signed_in());

	const user = await getUserByClerkId(userId);
	if (!user) error(401, m.error_user_not_found());

	const notifications = await listNotifications(user._id);
	// Al abrir la lista todo queda leído (la campana vuelve a cero).
	await markAllRead(user._id);

	return {
		notifications: notifications.map(serializeNotification)
	};
};
