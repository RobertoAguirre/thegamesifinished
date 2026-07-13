import { error } from '@sveltejs/kit';
import { getCompletionById, serializeCompletion } from '$lib/server/completions';
import { getSiteOrigin } from '$lib/server/origin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const completion = await getCompletionById(params.id);
	if (!completion) error(404, 'Completion not found');

	return {
		completion: serializeCompletion(completion),
		siteOrigin: getSiteOrigin(url)
	};
};
