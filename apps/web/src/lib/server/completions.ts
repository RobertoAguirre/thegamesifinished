import type { Completion, User } from '@tgif/db';
import { ObjectId } from 'mongodb';
import { trackServer } from '$lib/analytics/server';
import { AnalyticsEvents } from '$lib/analytics/events';
import { normalizePlatforms, platformsOf } from '$lib/config/platforms';
import { getDb } from './db';
import { resolveGameStoreData } from './games';
import { deleteMediaFile, saveMedia } from './media';
import { generateOgCard } from './og';
import { deleteReactionsForCompletion } from './reactions';
import { getCommunityDifficultyTier, xpForTier } from './progression/difficulty';
import { evaluateBadgesForUser, type ProgressResult } from './progression/badges';

/** Subir cuando cambie el layout OG (p. ej. portada del juego) para regenerar PNGs viejos. */
export const OG_CARD_VERSION = 2;

export interface CreateCompletionInput {
	user: User;
	gameTitle: string;
	rawgId?: number;
	gameImageUrl?: string;
	/** @deprecated Prefer `platforms`. */
	platform?: string;
	platforms?: string[];
	character?: string;
	genres?: string[];
	hoursPlayed?: number;
	startedAt?: Date;
	completedAt: Date;
	difficultyRating?: number;
	notes?: string;
	mediaFile?: File;
}

export { platformsOf };

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
			gameTitle,
			gameImageUrl: input.gameImageUrl
		})) ?? undefined;

	const { storeUrl, storeLinks } = await resolveGameStoreData({
		gameTitle,
		rawgId: input.rawgId,
		gameImageUrl: input.gameImageUrl
	});

	const platforms = normalizePlatforms([
		...(input.platforms ?? []),
		...(input.platform ? [input.platform] : [])
	]);

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
		platforms: platforms.length ? platforms : undefined,
		// Keep legacy single field in sync for older readers.
		platform: platforms[0],
		character: input.character?.trim() || undefined,
		genres: input.genres?.length ? input.genres : undefined,
		hoursPlayed: input.hoursPlayed,
		startedAt: input.startedAt,
		completedAt: input.completedAt,
		difficultyRating,
		notes: input.notes?.trim() || undefined,
		mediaKey,
		mediaType,
		ogImageKey,
		ogCardVersion: ogImageKey ? OG_CARD_VERSION : undefined,
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

/**
 * Regenera la tarjeta OG si el diseño cambió (versión) o aún no existe.
 * Así WhatsApp/Facebook ven la portada del juego en victorias antiguas tras el deploy.
 */
export async function ensureOgCard(completion: Completion): Promise<Completion> {
	const needs =
		!completion.ogImageKey ||
		(completion.ogCardVersion ?? 1) < OG_CARD_VERSION;
	if (!needs) return completion;

	const key = await generateOgCard({
		displayName: completion.displayName,
		gameTitle: completion.gameTitle,
		gameImageUrl: completion.gameImageUrl
	});
	if (!key) return completion;

	const previous = completion.ogImageKey;
	const db = await getDb();
	await db.collection<Completion>('completions').updateOne(
		{ _id: completion._id },
		{ $set: { ogImageKey: key, ogCardVersion: OG_CARD_VERSION } }
	);
	if (previous && previous !== key) {
		await deleteMediaFile(previous);
	}

	return { ...completion, ogImageKey: key, ogCardVersion: OG_CARD_VERSION };
}

/** Deletes a completion owned by `clerkId`. Returns false if missing or not owned. */
export async function deleteCompletion(id: string, clerkId: string): Promise<boolean> {
	const completion = await getCompletionById(id);
	if (!completion || completion.clerkId !== clerkId) return false;

	const db = await getDb();
	await deleteReactionsForCompletion(completion._id);
	await db.collection('completions').deleteOne({ _id: completion._id });
	await db.collection('comments').deleteMany({ completionId: completion._id });

	await deleteMediaFile(completion.mediaKey);
	await deleteMediaFile(completion.ogImageKey);

	return true;
}

/** Append platforms to an owned completion. Returns updated platforms or null if forbidden. */
export async function addPlatformsToCompletion(
	id: string,
	clerkId: string,
	rawPlatforms: string[]
): Promise<{ platforms: string[]; progress: ProgressResult } | null> {
	const completion = await getCompletionById(id);
	if (!completion || completion.clerkId !== clerkId) return null;

	const incoming = normalizePlatforms(rawPlatforms);
	if (incoming.length === 0) {
		return { platforms: platformsOf(completion), progress: emptyProgress() };
	}

	const platforms = normalizePlatforms([...platformsOf(completion), ...incoming]);
	const db = await getDb();
	await db.collection<Completion>('completions').updateOne(
		{ _id: completion._id },
		{ $set: { platforms, platform: platforms[0] } }
	);

	const user = await db.collection<User>('users').findOne({ clerkId });
	const progress = user
		? await evaluateBadgesForUser(user)
		: emptyProgress();

	return { platforms, progress };
}

function emptyProgress(): ProgressResult {
	return {
		unlockedBadges: [],
		previousRank: '',
		newRank: '',
		rankUp: false,
		totalXp: 0,
		xpGained: 0
	};
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
	const platforms = platformsOf(completion);
	return {
		id: completion._id.toString(),
		username: completion.username,
		displayName: completion.displayName,
		gameTitle: completion.gameTitle,
		rawgId: completion.rawgId,
		gameImageUrl: completion.gameImageUrl,
		storeUrl: completion.storeUrl,
		storeLinks: completion.storeLinks,
		platform: platforms[0],
		platforms,
		character: completion.character,
		genres: completion.genres,
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
		ogCardVersion: completion.ogCardVersion,
		createdAt: completion.createdAt.toISOString()
	};
}
