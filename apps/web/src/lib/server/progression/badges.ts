import type { Badge, BadgeRule, Completion, DifficultyTier, User, UserBadge } from '@tgif/db';
import { ObjectId } from 'mongodb';
import { platformsOf } from '$lib/config/platforms';
import { getDb } from '../db';
import { buildUserGameTier, enrichCompletionTier } from './difficulty';
import { getRankTiers, rankForXp } from './ranks';

const DEFAULT_BADGES: Array<Omit<Badge, '_id' | 'createdAt' | 'updatedAt'>> = [
	{
		slug: 'first-finish',
		name: 'First Finish',
		description: 'Log your first completed game.',
		iconEmoji: '🏁',
		category: 'milestone',
		rule: { type: 'count', threshold: 1 },
		isActive: true
	},
	{
		slug: 'ten-club',
		name: 'Ten Club',
		description: 'Finish 10 games.',
		iconEmoji: '🔟',
		category: 'milestone',
		rule: { type: 'count', threshold: 10 },
		isActive: true
	},
	{
		slug: 'iron-will',
		name: 'Iron Will',
		description: 'Finish a community-rated extreme game.',
		iconEmoji: '🗡️',
		category: 'difficulty',
		rule: { type: 'count', threshold: 1, filter: { difficultyTier: 'extreme' } },
		isActive: true
	},
	{
		slug: 'platform-hopper',
		name: 'Platform Hopper',
		description: 'Finish games on 3 different platforms.',
		iconEmoji: '🕹️',
		category: 'variety',
		rule: { type: 'distinct', field: 'platform', threshold: 3 },
		isActive: true
	},
	{
		slug: 'steady-pace',
		name: 'Steady Pace',
		description: 'Finish at least one game across 3 consecutive months.',
		iconEmoji: '📅',
		category: 'consistency',
		rule: { type: 'streak', unit: 'month', threshold: 3 },
		isActive: true
	},
	{
		slug: 'weekend-warrior',
		name: 'Weekend Warrior',
		description: 'Start and finish a game on the same day.',
		iconEmoji: '⚡',
		category: 'speed',
		rule: { type: 'speedFinish', sameDay: true },
		isActive: true
	}
];

export async function ensureBadgesSeeded(): Promise<void> {
	const db = await getDb();
	const badges = db.collection<Badge>('badges');
	const count = await badges.countDocuments();
	if (count > 0) return;
	const now = new Date();
	await badges.insertMany(
		DEFAULT_BADGES.map((b) => ({
			...b,
			createdAt: now,
			updatedAt: now
		})) as Badge[]
	);
}

function monthKey(date: Date): string {
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function longestMonthStreak(completions: Completion[]): number {
	const months = new Set(completions.map((c) => monthKey(c.completedAt)));
	if (months.size === 0) return 0;

	const sorted = [...months].sort();
	let best = 1;
	let current = 1;

	for (let i = 1; i < sorted.length; i++) {
		const [py, pm] = sorted[i - 1].split('-').map(Number);
		const [cy, cm] = sorted[i].split('-').map(Number);
		const prevIndex = py * 12 + (pm - 1);
		const currIndex = cy * 12 + (cm - 1);
		if (currIndex === prevIndex + 1) {
			current += 1;
			best = Math.max(best, current);
		} else {
			current = 1;
		}
	}
	return best;
}

function hoursBetween(start: Date, end: Date): number {
	return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

function sameUtcDay(a: Date, b: Date): boolean {
	return (
		a.getUTCFullYear() === b.getUTCFullYear() &&
		a.getUTCMonth() === b.getUTCMonth() &&
		a.getUTCDate() === b.getUTCDate()
	);
}

function evaluateRule(
	rule: BadgeRule,
	completions: Completion[],
	tierByGame: Map<string, DifficultyTier>
): boolean {
	switch (rule.type) {
		case 'count': {
			const list = completions.filter((c) => {
				if (!rule.filter?.difficultyTier) return true;
				return enrichCompletionTier(c, tierByGame) === rule.filter.difficultyTier;
			});
			return list.length >= rule.threshold;
		}
		case 'distinct': {
			const values = new Set<string>();
			for (const c of completions) {
				if (rule.field === 'platform') {
					for (const p of platformsOf(c)) values.add(p.trim().toLowerCase());
				} else {
					values.add(c.gameTitle.trim().toLowerCase());
				}
			}
			return values.size >= rule.threshold;
		}
		case 'streak': {
			if (rule.unit !== 'month') return false;
			return longestMonthStreak(completions) >= rule.threshold;
		}
		case 'speedFinish': {
			return completions.some((c) => {
				const start = c.startedAt ?? c.completedAt;
				const end = c.completedAt;
				if (rule.sameDay && !sameUtcDay(start, end)) return false;
				if (rule.maxHours != null) {
					const fromDates = hoursBetween(start, end);
					const fromHours = c.hoursPlayed;
					const hours = fromHours != null ? Math.min(fromHours, fromDates || fromHours) : fromDates;
					if (hours > rule.maxHours) return false;
					if (!c.startedAt && fromHours == null && !rule.sameDay) return false;
				}
				return rule.sameDay || rule.maxHours != null;
			});
		}
		default:
			return false;
	}
}

export interface ProgressResult {
	unlockedBadges: Array<{ slug: string; name: string; description: string; iconEmoji: string }>;
	previousRank: string;
	newRank: string;
	rankUp: boolean;
	totalXp: number;
	xpGained: number;
}

export async function evaluateBadgesForUser(
	user: User,
	opts?: { xpGained?: number }
): Promise<ProgressResult> {
	await ensureBadgesSeeded();
	await getRankTiers();

	const db = await getDb();
	const completions = await db
		.collection<Completion>('completions')
		.find({ userId: user._id })
		.toArray();

	const tierByGame = await buildUserGameTier(completions);
	const owned = await db
		.collection<UserBadge>('userBadges')
		.find({ userId: user._id })
		.toArray();
	const ownedIds = new Set(owned.map((b) => b.badgeId.toString()));

	const badges = await db.collection<Badge>('badges').find({ isActive: true }).toArray();
	const unlockedBadges: ProgressResult['unlockedBadges'] = [];

	for (const badge of badges) {
		if (ownedIds.has(badge._id.toString())) continue;
		if (!evaluateRule(badge.rule, completions, tierByGame)) continue;

		try {
			await db.collection('userBadges').insertOne({
				userId: user._id,
				badgeId: badge._id,
				badgeSlug: badge.slug,
				unlockedAt: new Date()
			});
			unlockedBadges.push({
				slug: badge.slug,
				name: badge.name,
				description: badge.description,
				iconEmoji: badge.iconEmoji
			});
		} catch {
			// duplicate unlock race — ignore
		}
	}

	const xpGained = opts?.xpGained ?? 0;
	const previousXp = user.totalXp ?? 0;
	const totalXp = previousXp + xpGained;
	const previousRank = await rankForXp(previousXp);
	const newRank = await rankForXp(totalXp);

	if (xpGained > 0) {
		await db.collection<User>('users').updateOne(
			{ _id: user._id },
			{ $set: { totalXp, updatedAt: new Date() } }
		);
	}

	return {
		unlockedBadges,
		previousRank: previousRank.name,
		newRank: newRank.name,
		rankUp: newRank.slug !== previousRank.slug && totalXp > previousXp,
		totalXp,
		xpGained
	};
}

export async function getUserBadges(userId: ObjectId) {
	await ensureBadgesSeeded();
	const db = await getDb();
	const owned = await db.collection<UserBadge>('userBadges').find({ userId }).toArray();
	if (owned.length === 0) return [];
	const badgeIds = owned.map((o) => o.badgeId);
	const badges = await db
		.collection<Badge>('badges')
		.find({ _id: { $in: badgeIds } })
		.toArray();
	const byId = new Map(badges.map((b) => [b._id.toString(), b]));
	return owned
		.map((o) => {
			const badge = byId.get(o.badgeId.toString());
			if (!badge) return null;
			return {
				slug: badge.slug,
				name: badge.name,
				description: badge.description,
				iconEmoji: badge.iconEmoji,
				unlockedAt: o.unlockedAt.toISOString()
			};
		})
		.filter(Boolean);
}

export async function listActiveBadges() {
	await ensureBadgesSeeded();
	const db = await getDb();
	return db.collection<Badge>('badges').find({}).sort({ createdAt: 1 }).toArray();
}

export async function createBadge(input: {
	slug: string;
	name: string;
	description: string;
	iconEmoji: string;
	category: string;
	rule: BadgeRule;
}) {
	const db = await getDb();
	const now = new Date();
	const doc: Omit<Badge, '_id'> = {
		...input,
		slug: input.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
		isActive: true,
		createdAt: now,
		updatedAt: now
	};
	const result = await db.collection<Badge>('badges').insertOne(doc as Badge);
	return { ...doc, _id: result.insertedId };
}

export async function updateBadge(
	id: string,
	patch: Partial<Pick<Badge, 'name' | 'description' | 'iconEmoji' | 'category' | 'rule' | 'isActive'>>
) {
	if (!ObjectId.isValid(id)) return null;
	const db = await getDb();
	await db.collection<Badge>('badges').updateOne(
		{ _id: new ObjectId(id) },
		{ $set: { ...patch, updatedAt: new Date() } }
	);
	return db.collection<Badge>('badges').findOne({ _id: new ObjectId(id) });
}
