import { error } from '@sveltejs/kit';
import {
	getCompletionsByUser,
	serializeCompletion
} from '$lib/server/completions';
import { getCompletionCount, getUserByUsername } from '$lib/server/users';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const user = await getUserByUsername(params.username);
	if (!user) error(404, 'Player not found');

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
