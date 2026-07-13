import type { Completion, User } from '@tgif/db';
import { ObjectId } from 'mongodb';
import { trackServer } from '$lib/analytics/server';
import { AnalyticsEvents } from '$lib/analytics/events';
import { getDb } from './db';
import { resolveGameStoreData } from './games';
import { deleteMediaFile, saveMedia } from './media';
import { generateOgCard } from './og';
import { getCommunityDifficultyTier, xpForTier } from './progression/difficulty';
import { evaluateBadgesForUser, type ProgressResult } from './progression/badges';

export interface CreateCompletionInput {
	user: User;
	gameTitle: string;
	rawgId?: number;
	gameImageUrl?: string;
	platform?: string;
	hoursPlayed?: number;
	startedAt?: Date;
	completedAt: Date;
	difficultyRating?: number;
	notes?: string;
	mediaFile?: File;
}

export async function createCompletion(
	input: CreateCompletionInput
): Promise<{ completion: Completion; progress: ProgressResult }> {
	const db = await getDb();
	const completions = db.collection<Omit<Completion, '_id'>>('completions');

	let mediaKey: string | undefined;
	let mediaType: 'image' | 'video' | undefined;

	if (input.mediaFile && input.mediaFile.size > 0) {
		const uploaded = await saveMedia(input.mediaFile);
		mediaKey = uploaded.mediaKey;
		mediaType = uploaded.mediaType;
	}

	const gameTitle = input.gameTitle.trim();
	const difficultyRating =
		input.difficultyRating != null && input.difficultyRating >= 1 && input.difficultyRating <= 5
			? Math.round(input.difficultyRating)
			: 3;

	const ogImageKey =
		(await generateOgCard({
			displayName: input.user.displayName,
			gameTitle
		})) ?? undefined;

	const { storeUrl, storeLinks } = await resolveGameStoreData({
		gameTitle,
		rawgId: input.rawgId,
		gameImageUrl: input.gameImageUrl
	});

	const doc: Omit<Completion, '_id'> = {
		userId: input.user._id,
		clerkId: input.user.clerkId,
		username: input.user.username,
		displayName: input.user.displayName,
		gameTitle,
		rawgId: input.rawgId,
		gameImageUrl: input.gameImageUrl,
		storeUrl,
		storeLinks,
		platform: input.platform?.trim() || undefined,
		hoursPlayed: input.hoursPlayed,
		startedAt: input.startedAt,
		completedAt: input.completedAt,
		difficultyRating,
		notes: input.notes?.trim() || undefined,
		mediaKey,
		mediaType,
		ogImageKey,
		createdAt: new Date()
	};

	const result = await completions.insertOne(doc as Completion);
	const completion = { _id: result.insertedId, ...doc };

	const priorCount = await completions.countDocuments({ userId: input.user._id });
	if (priorCount === 2) {
		void trackServer(input.user.clerkId, AnalyticsEvents.secondCompletion, {
			completion_id: completion._id.toString(),
			game_title: gameTitle,
			username: input.user.username
		});
	}

	const { tier } = await getCommunityDifficultyTier({
		rawgId: input.rawgId,
		gameTitle
	});
	const xpGained = xpForTier(tier);
	const progress = await evaluateBadgesForUser(input.user, { xpGained });

	for (const badge of progress.unlockedBadges) {
		void trackServer(input.user.clerkId, AnalyticsEvents.badgeUnlocked, {
			badge_slug: badge.slug,
			badge_name: badge.name,
			completion_id: completion._id.toString()
		});
	}
	if (progress.rankUp) {
		void trackServer(input.user.clerkId, AnalyticsEvents.rankUnlocked, {
			rank: progress.newRank,
			completion_id: completion._id.toString(),
			xp_gained: progress.xpGained
		});
	}

	return { completion, progress };
}

export async function getCompletionById(id: string): Promise<Completion | null> {
	if (!ObjectId.isValid(id)) return null;
	const db = await getDb();
	return db.collection<Completion>('completions').findOne({ _id: new ObjectId(id) });
}

/** Deletes a completion owned by `clerkId`. Returns false if missing or not owned. */
export async function deleteCompletion(id: string, clerkId: string): Promise<boolean> {
	const completion = await getCompletionById(id);
	if (!completion || completion.clerkId !== clerkId) return false;

	const db = await getDb();
	await db.collection('completions').deleteOne({ _id: completion._id });
	await db.collection('comments').deleteMany({ completionId: completion._id });

	await deleteMediaFile(completion.mediaKey);
	await deleteMediaFile(completion.ogImageKey);

	return true;
}

export async function getCompletionsByUser(userId: User['_id'], limit = 50): Promise<Completion[]> {
	const db = await getDb();
	return db
		.collection<Completion>('completions')
		.find({ userId })
		.sort({ completedAt: -1 })
		.limit(limit)
		.toArray();
}

export async function getRecentCompletions(limit = 12): Promise<Completion[]> {
	const db = await getDb();
	return db
		.collection<Completion>('completions')
		.find({})
		.sort({ createdAt: -1 })
		.limit(limit)
		.toArray();
}

export function serializeCompletion(completion: Completion) {
	return {
		id: completion._id.toString(),
		username: completion.username,
		displayName: completion.displayName,
		gameTitle: completion.gameTitle,
		rawgId: completion.rawgId,
		gameImageUrl: completion.gameImageUrl,
		storeUrl: completion.storeUrl,
		storeLinks: completion.storeLinks,
		platform: completion.platform,
		hoursPlayed: completion.hoursPlayed,
		startedAt: completion.startedAt?.toISOString(),
		completedAt: completion.completedAt.toISOString(),
		difficultyRating: completion.difficultyRating,
		notes: completion.notes,
		mediaKey:
			completion.mediaKey ??
			(completion as { mediaId?: { toString(): string } }).mediaId?.toString(),
		mediaType: completion.mediaType,
		ogImageKey: completion.ogImageKey,
		createdAt: completion.createdAt.toISOString()
	};
}
