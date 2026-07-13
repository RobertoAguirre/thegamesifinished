import { error, fail } from '@sveltejs/kit';
import {
	addPlatformsToCompletion,
	getCompletionById,
	serializeCompletion
} from '$lib/server/completions';
import {
	addComment,
	getCommentsByCompletion,
	serializeComment
} from '$lib/server/comments';
import { m } from '$lib/paraglide/messages.js';
import { getSiteOrigin } from '$lib/server/origin';
import { getUserByClerkId } from '$lib/server/users';
import { ensureBadgesSeeded, listActiveBadges } from '$lib/server/progression/badges';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const completion = await getCompletionById(params.id);
	if (!completion) error(404, m.error_completion_not_found());

	const comments = await getCommentsByCompletion(params.id);
	const { userId } = locals.auth();
	const sessionUser = userId ? await getUserByClerkId(userId) : null;
	const isOwner = Boolean(userId && completion.clerkId === userId);

	const siteOrigin = getSiteOrigin(url);
	const serialized = serializeCompletion(completion);
	const ogImage = serialized.ogImageKey
		? `${siteOrigin}/api/media/${serialized.ogImageKey}`
		: serialized.mediaKey
			? `${siteOrigin}/api/media/${serialized.mediaKey}`
			: serialized.gameImageUrl;

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
		comments: comments.map(serializeComment),
		siteOrigin,
		canonicalUrl: `${siteOrigin}/completion/${serialized.id}`,
		ogImage,
		sessionName: sessionUser?.displayName ?? null,
		isOwner,
		celebration
	};
};

export const actions: Actions = {
	comment: async ({ request, params, getClientAddress, locals }) => {
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

		return { commentSuccess: true, authorName: '', body: '' };
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
