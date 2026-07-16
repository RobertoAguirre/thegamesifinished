import { fail, redirect } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages.js';
import {
	deleteCompletion,
	getCompletionsByUser,
	serializeCompletion
} from '$lib/server/completions';
import { getCompletionCount, getUserByClerkId, updateDisplayName } from '$lib/server/users';
import { getUserBadges } from '$lib/server/progression/badges';
import { rankForXp } from '$lib/server/progression/ranks';
import { isAdmin } from '$lib/server/admin';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();
	if (!userId) redirect(307, '/sign-in');

	const user = await getUserByClerkId(userId);
	if (!user) redirect(307, '/sign-in');

	const [completions, totalGames, badges, rank] = await Promise.all([
		getCompletionsByUser(user._id),
		getCompletionCount(user._id),
		getUserBadges(user._id),
		rankForXp(user.totalXp ?? 0)
	]);

	return {
		user: {
			username: user.username,
			displayName: user.displayName,
			avatarUrl: user.avatarUrl,
			totalXp: user.totalXp ?? 0
		},
		rank: { name: rank.name, slug: rank.slug, minXp: rank.minXp },
		badges,
		totalGames,
		completions: completions.map(serializeCompletion),
		isAdmin: isAdmin(userId)
	};
};

export const actions: Actions = {
	updateName: async ({ request, locals }) => {
		const { userId } = locals.auth();
		if (!userId) return fail(401, { nameError: m.error_signed_in() });

		const form = await request.formData();
		const displayName = String(form.get('displayName') ?? '');

		const ok = await updateDisplayName(userId, displayName);
		if (!ok) return fail(400, { nameError: m.error_display_name_invalid() });

		return { nameSuccess: true };
	},

	delete: async ({ request, locals }) => {
		const { userId } = locals.auth();
		if (!userId) return fail(401, { error: m.error_signed_in() });

		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { error: m.error_missing_completion_id() });

		const deleted = await deleteCompletion(id, userId);
		if (!deleted) return fail(404, { error: m.error_completion_not_found() });

		return { success: true };
	}
};
