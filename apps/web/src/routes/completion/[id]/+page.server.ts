import { error, fail } from '@sveltejs/kit';
import {
	addPlatformsToCompletion,
	ensureOgCard,
	getCompletionById,
	serializeCompletion
} from '$lib/server/completions';
import {
	addComment,
	getCommentsByCompletion,
	serializeComment
} from '$lib/server/comments';
import { m } from '$lib/paraglide/messages.js';
import { getClerkEmail, sendCommentEmail } from '$lib/server/email';
import { createNotification } from '$lib/server/notifications';
import { getSiteOrigin } from '$lib/server/origin';
import {
	emptyReactionCounts,
	getReactionsForTargets,
	REACTION_EMOJI,
	toggleReaction
} from '$lib/server/reactions';
import { getRecommendationsForCompletion } from '$lib/server/recommendations';
import { getUserByClerkId } from '$lib/server/users';
import { ensureBadgesSeeded, listActiveBadges } from '$lib/server/progression/badges';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	let completion = await getCompletionById(params.id);
	if (!completion) error(404, m.error_completion_not_found());

	// Regenera la PNG OG (con portada) si es una victoria creada con el diseño viejo.
	completion = await ensureOgCard(completion);

	const comments = await getCommentsByCompletion(params.id);
	const { userId } = locals.auth();
	const sessionUser = userId ? await getUserByClerkId(userId) : null;
	const isOwner = Boolean(userId && completion.clerkId === userId);

	const siteOrigin = getSiteOrigin(url);
	const serialized = serializeCompletion(completion);
	const ogVersion = serialized.ogCardVersion ?? 1;
	const ogImage = serialized.ogImageKey
		? `${siteOrigin}/api/media/${serialized.ogImageKey}?v=${ogVersion}`
		: serialized.mediaKey
			? `${siteOrigin}/api/media/${serialized.mediaKey}`
			: serialized.gameImageUrl;

	const recommendations = await getRecommendationsForCompletion({
		gameTitle: completion.gameTitle,
		rawgId: completion.rawgId,
		platforms: completion.platforms,
		limit: 4
	});

	const reactionTargets = [
		{ targetType: 'completion' as const, targetId: serialized.id },
		...comments.map((c) => ({
			targetType: 'comment' as const,
			targetId: c._id.toString()
		}))
	];
	const reactions = await getReactionsForTargets(reactionTargets, userId);

	let celebration: {
		badges: Array<{ slug: string; name: string; description: string; iconEmoji: string }>;
		rankUp: string | null;
		xpGained: number;
	} | null = null;

	if (url.searchParams.get('celebrate') === '1') {
		await ensureBadgesSeeded();
		const badgeSlugs = (url.searchParams.get('badges') ?? '')
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		const allBadges = await listActiveBadges();
		const unlocked = allBadges
			.filter((b) => badgeSlugs.includes(b.slug))
			.map((b) => ({
				slug: b.slug,
				name: b.name,
				description: b.description,
				iconEmoji: b.iconEmoji
			}));
		celebration = {
			badges: unlocked,
			rankUp: url.searchParams.get('rankUp'),
			xpGained: Number(url.searchParams.get('xp') ?? 0) || 0
		};
	}

	return {
		completion: serialized,
		comments: comments.map((comment) => {
			const id = comment._id.toString();
			return {
				...serializeComment(comment),
				reactions: reactions.counts[id] ?? emptyReactionCounts(),
				viewerReaction: reactions.viewer[id] ?? null
			};
		}),
		completionReactions: {
			counts: reactions.counts[serialized.id] ?? emptyReactionCounts(),
			viewerReaction: reactions.viewer[serialized.id] ?? null
		},
		canReact: Boolean(userId),
		recommendations,
		siteOrigin,
		canonicalUrl: `${siteOrigin}/completion/${serialized.id}`,
		ogImage,
		sessionName: sessionUser?.displayName ?? null,
		isOwner,
		celebration,
		// Recién registrada por su dueño → abrir modal de compartir.
		isNew: isOwner && url.searchParams.get('new') === '1'
	};
};

export const actions: Actions = {
	comment: async ({ request, params, getClientAddress, locals, url }) => {
		const completion = await getCompletionById(params.id);
		if (!completion) {
			return fail(404, { commentError: m.error_comment_not_found(), authorName: '', body: '' });
		}

		const form = await request.formData();
		const { userId } = locals.auth();
		const sessionUser = userId ? await getUserByClerkId(userId) : null;

		const authorName = sessionUser?.displayName || String(form.get('authorName') ?? '');
		const body = String(form.get('body') ?? '');

		const result = await addComment({
			completionId: params.id,
			authorName,
			body,
			ip: getClientAddress()
		});

		if (!result.ok) {
			return fail(400, {
				commentError: result.error,
				authorName,
				body
			});
		}

		// Avisa al dueño (campana + correo) sin bloquear la respuesta; nunca a sí mismo.
		const isOwnComment = Boolean(userId && completion.clerkId === userId);
		if (!isOwnComment) {
			const siteOrigin = getSiteOrigin(url);
			const completionUrl = `${siteOrigin}/completion/${completion._id.toString()}`;
			void (async () => {
				try {
					await createNotification({
						userId: completion.userId,
						type: 'comment',
						completionId: completion._id,
						gameTitle: completion.gameTitle,
						actorName: result.comment.authorName,
						preview: result.comment.body.slice(0, 120)
					});
					const toEmail = await getClerkEmail(completion.clerkId);
					if (toEmail) {
						await sendCommentEmail({
							toEmail,
							ownerName: completion.displayName,
							actorName: result.comment.authorName,
							gameTitle: completion.gameTitle,
							commentBody: result.comment.body,
							completionUrl
						});
					}
				} catch (error) {
					console.warn('Comment notification failed:', error);
				}
			})();
		}

		return { commentSuccess: true, authorName: '', body: '' };
	},

	react: async ({ request, params, locals }) => {
		const { userId } = locals.auth();
		if (!userId) return fail(401, { reactionError: m.error_signed_in() });

		const form = await request.formData();
		const targetId = String(form.get('targetId') ?? '');
		const targetType = String(form.get('targetType') ?? '');
		const kind = String(form.get('kind') ?? '');
		const result = await toggleReaction({
			targetType,
			targetId,
			kind,
			clerkId: userId
		});

		if (!result.ok) {
			return fail(400, { reactionError: result.error });
		}

		// Campana para el dueño solo en reacciones nuevas a su victoria (no comentarios ni al quitar).
		if (result.action === 'added' && targetType === 'completion') {
			void (async () => {
				try {
					const completion = await getCompletionById(params.id);
					if (!completion || completion.clerkId === userId) return;
					await createNotification({
						userId: completion.userId,
						type: 'reaction',
						completionId: completion._id,
						gameTitle: completion.gameTitle,
						actorName: result.actorName,
						preview: REACTION_EMOJI[kind as keyof typeof REACTION_EMOJI]
					});
				} catch (error) {
					console.warn('Reaction notification failed:', error);
				}
			})();
		}

		return {
			reactionSuccess: true,
			reactionTargetId: targetId,
			reactionCounts: result.counts,
			viewerReaction: result.viewerReaction
		};
	},

	addPlatforms: async ({ request, params, locals }) => {
		const { userId } = locals.auth();
		if (!userId) return fail(401, { platformError: m.error_signed_in() });

		const form = await request.formData();
		const platforms = form.getAll('platforms').map((v) => String(v));
		if (platforms.length === 0) {
			return fail(400, { platformError: m.error_select_platform() });
		}

		const result = await addPlatformsToCompletion(params.id, userId, platforms);
		if (!result) return fail(403, { platformError: m.error_owner_only_platforms() });

		return { platformSuccess: true };
	}
};
