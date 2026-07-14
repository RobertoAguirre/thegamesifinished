import type { ObjectId } from 'mongodb';

export type DifficultyTier = 'easy' | 'medium' | 'hard' | 'extreme';

export type BadgeRule =
	| { type: 'count'; threshold: number; filter?: { difficultyTier?: DifficultyTier } }
	| { type: 'distinct'; field: 'platform' | 'gameTitle'; threshold: number }
	| { type: 'streak'; unit: 'month'; threshold: number }
	| { type: 'speedFinish'; maxHours?: number; sameDay?: boolean };

export interface User {
	_id: ObjectId;
	clerkId: string;
	username: string;
	displayName: string;
	avatarUrl?: string;
	totalXp?: number;
	createdAt: Date;
	updatedAt: Date;
}

export type StoreId = 'steam' | 'instant_gaming' | 'epic' | 'gog' | 'other';

export interface StoreLink {
	store: StoreId;
	url: string;
}

/** Catalog entry keyed by RAWG id (or title slug) for store / affiliate URLs. */
export interface Game {
	_id: ObjectId;
	rawgId?: number;
	slug: string;
	title: string;
	imageUrl?: string;
	/** Primary store URL (usually Steam). */
	storeUrl?: string;
	storeLinks: StoreLink[];
	createdAt: Date;
	updatedAt: Date;
}

export interface Completion {
	_id: ObjectId;
	userId: ObjectId;
	clerkId: string;
	username: string;
	displayName: string;
	gameTitle: string;
	rawgId?: number;
	gameImageUrl?: string;
	/** Denormalized from Game for public pages without an extra join. */
	storeUrl?: string;
	storeLinks?: StoreLink[];
	/** @deprecated Prefer `platforms`. Kept for older completions. */
	platform?: string;
	/** Hardware platforms where this game was finished (Xbox, PS5, PC, … — not stores). */
	platforms?: string[];
	/** Character used to finish (required for fighting games). */
	character?: string;
	/** Genres snapshot (e.g. Fighting) for display / rules. */
	genres?: string[];
	hoursPlayed?: number;
	startedAt?: Date;
	/** Alias of finished moment — kept as completedAt for compatibility */
	completedAt: Date;
	difficultyRating?: number;
	notes?: string;
	mediaKey?: string;
	mediaType?: 'image' | 'video';
	ogImageKey?: string;
	createdAt: Date;
}

export interface Comment {
	_id: ObjectId;
	completionId: ObjectId;
	authorName: string;
	body: string;
	createdAt: Date;
}

export interface Badge {
	_id: ObjectId;
	slug: string;
	name: string;
	description: string;
	iconEmoji: string;
	category: string;
	rule: BadgeRule;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface UserBadge {
	_id: ObjectId;
	userId: ObjectId;
	badgeId: ObjectId;
	badgeSlug: string;
	unlockedAt: Date;
}

export interface RankTier {
	_id: ObjectId;
	slug: string;
	name: string;
	minXp: number;
	order: number;
}

export interface RawgGame {
	id: number;
	name: string;
	background_image?: string;
	released?: string;
	genres?: Array<{ id?: number; name: string; slug?: string }>;
}
