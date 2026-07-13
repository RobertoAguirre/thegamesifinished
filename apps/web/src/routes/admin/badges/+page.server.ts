import { fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/admin';
import { createBadge, listActiveBadges, updateBadge } from '$lib/server/progression/badges';
import type { BadgeRule } from '@tgif/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();
	if (!userId || !isAdmin(userId)) redirect(307, '/dashboard');

	const badges = await listActiveBadges();
	return {
		badges: badges.map((b) => ({
			id: b._id.toString(),
			slug: b.slug,
			name: b.name,
			description: b.description,
			iconEmoji: b.iconEmoji,
			category: b.category,
			rule: b.rule,
			isActive: b.isActive
		}))
	};
};

function ruleFromForm(form: FormData): BadgeRule | null {
	const type = String(form.get('ruleType') ?? '');
	if (type === 'count') {
		const threshold = Number(form.get('threshold'));
		const difficultyTier = String(form.get('difficultyTier') ?? '');
		if (!Number.isFinite(threshold) || threshold < 1) return null;
		return {
			type: 'count',
			threshold,
			...(difficultyTier
				? { filter: { difficultyTier: difficultyTier as 'easy' | 'medium' | 'hard' | 'extreme' } }
				: {})
		};
	}
	if (type === 'distinct') {
		const threshold = Number(form.get('threshold'));
		const field = String(form.get('field') ?? 'platform');
		if (!Number.isFinite(threshold) || threshold < 1) return null;
		return {
			type: 'distinct',
			field: field === 'gameTitle' ? 'gameTitle' : 'platform',
			threshold
		};
	}
	if (type === 'streak') {
		const threshold = Number(form.get('threshold'));
		if (!Number.isFinite(threshold) || threshold < 1) return null;
		return { type: 'streak', unit: 'month', threshold };
	}
	if (type === 'speedFinish') {
		const sameDay = form.get('sameDay') === 'on';
		const maxHoursRaw = String(form.get('maxHours') ?? '');
		const maxHours = maxHoursRaw ? Number(maxHoursRaw) : undefined;
		if (!sameDay && (maxHours == null || !Number.isFinite(maxHours))) return null;
		return {
			type: 'speedFinish',
			...(sameDay ? { sameDay: true } : {}),
			...(maxHours != null ? { maxHours } : {})
		};
	}
	return null;
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { userId } = locals.auth();
		if (!userId || !isAdmin(userId)) return fail(403, { error: 'Forbidden' });

		const form = await request.formData();
		const rule = ruleFromForm(form);
		if (!rule) return fail(400, { error: 'Invalid rule' });

		const slug = String(form.get('slug') ?? '').trim();
		const name = String(form.get('name') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const iconEmoji = String(form.get('iconEmoji') ?? '🏅').trim() || '🏅';
		const category = String(form.get('category') ?? 'custom').trim() || 'custom';

		if (!slug || !name || !description) {
			return fail(400, { error: 'Slug, name and description are required.' });
		}

		try {
			await createBadge({ slug, name, description, iconEmoji, category, rule });
			return { success: true };
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Could not create badge'
			});
		}
	},
	toggle: async ({ request, locals }) => {
		const { userId } = locals.auth();
		if (!userId || !isAdmin(userId)) return fail(403, { error: 'Forbidden' });

		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const isActive = String(form.get('isActive') ?? '') === 'true';
		await updateBadge(id, { isActive: !isActive });
		return { success: true };
	}
};
