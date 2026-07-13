import { redirect } from '@sveltejs/kit';
import {
	getCompletionsByUser,
	serializeCompletion
} from '$lib/server/completions';
import { getCompletionCount, getUserByClerkId } from '$lib/server/users';
import { getUserBadges } from '$lib/server/progression/badges';
import { rankForXp } from '$lib/server/progression/ranks';
import { isAdmin } from '$lib/server/admin';
import type { PageServerLoad } from './$types';

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
