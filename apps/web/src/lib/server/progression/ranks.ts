import type { RankTier } from '@tgif/db';
import { getDb } from '../db';

const DEFAULT_RANKS: Array<Omit<RankTier, '_id'>> = [
	{ slug: 'recruit', name: 'Recruit', minXp: 0, order: 1 },
	{ slug: 'soldier', name: 'Soldier', minXp: 300, order: 2 },
	{ slug: 'corporal', name: 'Corporal', minXp: 700, order: 3 },
	{ slug: 'sergeant', name: 'Sergeant', minXp: 1200, order: 4 },
	{ slug: 'lieutenant', name: 'Lieutenant', minXp: 2000, order: 5 },
	{ slug: 'captain', name: 'Captain', minXp: 3200, order: 6 },
	{ slug: 'commander', name: 'Commander', minXp: 4800, order: 7 },
	{ slug: 'general', name: 'General', minXp: 7000, order: 8 },
	{ slug: 'legend', name: 'Legend', minXp: 10000, order: 9 }
];

export async function ensureRanksSeeded(): Promise<void> {
	const db = await getDb();
	const ranks = db.collection<RankTier>('ranks');
	const count = await ranks.countDocuments();
	if (count > 0) return;
	await ranks.insertMany(DEFAULT_RANKS as RankTier[]);
}

export async function getRankTiers(): Promise<RankTier[]> {
	await ensureRanksSeeded();
	const db = await getDb();
	return db.collection<RankTier>('ranks').find({}).sort({ order: 1 }).toArray();
}

export async function rankForXp(xp: number): Promise<RankTier> {
	const tiers = await getRankTiers();
	let current = tiers[0];
	for (const tier of tiers) {
		if (xp >= tier.minXp) current = tier;
	}
	return current;
}
