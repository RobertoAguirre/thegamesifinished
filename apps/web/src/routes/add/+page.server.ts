import { fail, isRedirect, redirect } from '@sveltejs/kit';
import { isFightingGenre } from '$lib/config/genres';
import { m } from '$lib/paraglide/messages.js';
import { createCompletion } from '$lib/server/completions';
import { fetchGameGenres, hasRawgApiKey } from '$lib/server/rawg';
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
		if (!userId) return fail(401, { error: m.error_signed_in() });

		const user = await getUserByClerkId(userId);
		if (!user) return fail(401, { error: m.error_user_not_found() });

		const form = await request.formData();
		const gameTitle = String(form.get('gameTitle') ?? '').trim();
		const completedAtRaw = String(form.get('completedAt') ?? '');
		const startedAtRaw = String(form.get('startedAt') ?? '');
		const notes = String(form.get('notes') ?? '').trim();
		const platform = String(form.get('platform') ?? '').trim();
		const platforms = form.getAll('platforms').map((v) => String(v));
		const hoursRaw = String(form.get('hoursPlayed') ?? '');
		const difficultyRaw = String(form.get('difficultyRating') ?? '3');
		const rawgIdRaw = String(form.get('rawgId') ?? '');
		const gameImageUrl = String(form.get('gameImageUrl') ?? '').trim() || undefined;
		const character = String(form.get('character') ?? '').trim();
		const fightingFlag = String(form.get('isFighting') ?? '') === '1';
		const mediaFile = form.get('media') as File | null;

		if (!gameTitle) {
			return fail(400, { error: m.error_game_title_required() });
		}

		const completedAt = completedAtRaw ? new Date(completedAtRaw) : new Date();
		if (Number.isNaN(completedAt.getTime())) {
			return fail(400, { error: m.error_invalid_completion_date() });
		}

		const startedAt = startedAtRaw ? new Date(startedAtRaw) : undefined;
		if (startedAt && Number.isNaN(startedAt.getTime())) {
			return fail(400, { error: m.error_invalid_start_date() });
		}

		const hoursPlayed = hoursRaw ? Number(hoursRaw) : undefined;
		if (hoursPlayed != null && (!Number.isFinite(hoursPlayed) || hoursPlayed < 0)) {
			return fail(400, { error: m.error_invalid_hours() });
		}

		const difficultyRating = Number(difficultyRaw);
		if (!Number.isFinite(difficultyRating) || difficultyRating < 1 || difficultyRating > 5) {
			return fail(400, { error: m.error_difficulty_range() });
		}

		const rawgId = rawgIdRaw ? Number(rawgIdRaw) : undefined;
		const resolvedRawgId = Number.isFinite(rawgId) ? rawgId : undefined;

		let genres: string[] | undefined;
		let fighting = fightingFlag;
		if (resolvedRawgId != null) {
			const rawgGenres = await fetchGameGenres(resolvedRawgId);
			genres = rawgGenres.map((g) => g.name);
			fighting = fighting || isFightingGenre(rawgGenres);
		}

		if (fighting && character.length < 1) {
			return fail(400, { error: m.error_character_required() });
		}

		try {
			const { completion, progress } = await createCompletion({
				user,
				gameTitle,
				rawgId: resolvedRawgId,
				gameImageUrl,
				platforms,
				platform: platform || undefined,
				character: character || undefined,
				genres,
				hoursPlayed,
				startedAt,
				completedAt,
				difficultyRating,
				notes: notes || undefined,
				mediaFile: mediaFile && mediaFile.size > 0 ? mediaFile : undefined
			});

			const params = new URLSearchParams();
			// Marca la llegada desde el registro para abrir el modal de compartir.
			params.set('new', '1');
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
			const message = error instanceof Error ? error.message : m.error_save_failed();
			return fail(400, { error: message });
		}
	}
};
