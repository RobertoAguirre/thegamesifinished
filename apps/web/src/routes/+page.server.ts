import { getRecentCompletions, serializeCompletion } from '$lib/server/completions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const completions = await getRecentCompletions(12);
		return {
			completions: completions.map(serializeCompletion)
		};
	} catch {
		return { completions: [] };
	}
};
