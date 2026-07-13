import { fail, redirect } from '@sveltejs/kit';
import {
	deleteCompletion,
	getCompletionsByUser,
	serializeCompletion
} from '$lib/server/completions';
import { getCompletionCount, getUserByClerkId } from '$lib/server/users';
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
	delete: async ({ request, locals }) => {
		const { userId } = locals.auth();
		if (!userId) return fail(401, { error: 'You must be signed in.' });

		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Missing completion id.' });

		const deleted = await deleteCompletion(id, userId);
		if (!deleted) return fail(404, { error: 'Completion not found.' });

		return { success: true };
	}
};
