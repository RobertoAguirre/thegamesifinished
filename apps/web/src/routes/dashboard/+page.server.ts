import { redirect } from '@sveltejs/kit';
import {
	getCompletionsByUser,
	serializeCompletion
} from '$lib/server/completions';
import { getCompletionCount, getUserByClerkId } from '$lib/server/users';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();
	if (!userId) redirect(307, '/sign-in');

	const user = await getUserByClerkId(userId);
	if (!user) redirect(307, '/sign-in');

	const [completions, totalGames] = await Promise.all([
		getCompletionsByUser(user._id),
		getCompletionCount(user._id)
	]);

	return {
		user: {
			username: user.username,
			displayName: user.displayName,
			avatarUrl: user.avatarUrl
		},
		totalGames,
		completions: completions.map(serializeCompletion)
	};
};
