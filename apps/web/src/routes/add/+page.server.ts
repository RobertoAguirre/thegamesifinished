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
		const startedAtRaw = String(form.get('startedAt') ?? '');
		const notes = String(form.get('notes') ?? '').trim();
		const platform = String(form.get('platform') ?? '').trim();
		const hoursRaw = String(form.get('hoursPlayed') ?? '');
		const difficultyRaw = String(form.get('difficultyRating') ?? '3');
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

		const startedAt = startedAtRaw ? new Date(startedAtRaw) : undefined;
		if (startedAt && Number.isNaN(startedAt.getTime())) {
			return fail(400, { error: 'Invalid start date.' });
		}

		const hoursPlayed = hoursRaw ? Number(hoursRaw) : undefined;
		if (hoursPlayed != null && (!Number.isFinite(hoursPlayed) || hoursPlayed < 0)) {
			return fail(400, { error: 'Invalid hours played.' });
		}

		const difficultyRating = Number(difficultyRaw);
		if (!Number.isFinite(difficultyRating) || difficultyRating < 1 || difficultyRating > 5) {
			return fail(400, { error: 'Difficulty must be 1–5.' });
		}

		const rawgId = rawgIdRaw ? Number(rawgIdRaw) : undefined;

		try {
			const { completion, progress } = await createCompletion({
				user,
				gameTitle,
				rawgId: Number.isFinite(rawgId) ? rawgId : undefined,
				gameImageUrl,
				platform: platform || undefined,
				hoursPlayed,
				startedAt,
				completedAt,
				difficultyRating,
				notes: notes || undefined,
				mediaFile: mediaFile && mediaFile.size > 0 ? mediaFile : undefined
			});

			const params = new URLSearchParams();
			if (progress.unlockedBadges.length || progress.rankUp) {
				params.set('celebrate', '1');
				if (progress.unlockedBadges.length) {
					params.set('badges', progress.unlockedBadges.map((b) => b.slug).join(','));
				}
				if (progress.rankUp) {
					params.set('rankUp', progress.newRank);
				}
				params.set('xp', String(progress.xpGained));
			}

			const qs = params.toString();
			throw redirect(
				303,
				`/completion/${completion._id.toString()}${qs ? `?${qs}` : ''}`
			);
		} catch (error) {
			if (isRedirect(error)) throw error;
			const message = error instanceof Error ? error.message : 'Failed to save completion.';
			return fail(400, { error: message });
		}
	}
};
