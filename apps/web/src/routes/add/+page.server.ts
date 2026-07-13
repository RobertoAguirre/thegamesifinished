import { fail, isRedirect, redirect } from '@sveltejs/kit';
import { createCompletion } from '$lib/server/completions';
import { hasRawgApiKey } from '$lib/server/rawg';
import { getUserByClerkId } from '$lib/server/users';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();
	if (!userId) redirect(307, '/sign-in');
	return { rawgEnabled: hasRawgApiKey() };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { userId } = locals.auth();
		if (!userId) return fail(401, { error: 'You must be signed in.' });

		const user = await getUserByClerkId(userId);
		if (!user) return fail(401, { error: 'User not found.' });

		const form = await request.formData();
		const gameTitle = String(form.get('gameTitle') ?? '').trim();
		const completedAtRaw = String(form.get('completedAt') ?? '');
		const notes = String(form.get('notes') ?? '').trim();
		const rawgIdRaw = String(form.get('rawgId') ?? '');
		const gameImageUrl = String(form.get('gameImageUrl') ?? '').trim() || undefined;
		const mediaFile = form.get('media') as File | null;

		if (!gameTitle) {
			return fail(400, { error: 'Game title is required.' });
		}

		const completedAt = completedAtRaw ? new Date(completedAtRaw) : new Date();
		if (Number.isNaN(completedAt.getTime())) {
			return fail(400, { error: 'Invalid completion date.' });
		}

		const rawgId = rawgIdRaw ? Number(rawgIdRaw) : undefined;

		try {
			const completion = await createCompletion({
				user,
				gameTitle,
				rawgId: Number.isFinite(rawgId) ? rawgId : undefined,
				gameImageUrl,
				completedAt,
				notes: notes || undefined,
				mediaFile: mediaFile && mediaFile.size > 0 ? mediaFile : undefined
			});

			throw redirect(303, `/completion/${completion._id.toString()}`);
		} catch (error) {
			if (isRedirect(error)) throw error;
			const message = error instanceof Error ? error.message : 'Failed to save completion.';
			return fail(400, { error: message });
		}
	}
};
