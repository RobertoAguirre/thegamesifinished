import type { Completion, User } from '@tgif/db';
import { ObjectId } from 'mongodb';
import { getDb } from './db';
import { saveMedia } from './media';

export interface CreateCompletionInput {
	user: User;
	gameTitle: string;
	rawgId?: number;
	gameImageUrl?: string;
	completedAt: Date;
	notes?: string;
	mediaFile?: File;
}

export async function createCompletion(input: CreateCompletionInput): Promise<Completion> {
	const db = await getDb();
	const completions = db.collection<Omit<Completion, '_id'>>('completions');

	let mediaKey: string | undefined;
	let mediaType: 'image' | 'video' | undefined;

	if (input.mediaFile && input.mediaFile.size > 0) {
		const uploaded = await saveMedia(input.mediaFile);
		mediaKey = uploaded.mediaKey;
		mediaType = uploaded.mediaType;
	}

	const doc: Omit<Completion, '_id'> = {
		userId: input.user._id,
		clerkId: input.user.clerkId,
		username: input.user.username,
		displayName: input.user.displayName,
		gameTitle: input.gameTitle.trim(),
		rawgId: input.rawgId,
		gameImageUrl: input.gameImageUrl,
		completedAt: input.completedAt,
		notes: input.notes?.trim() || undefined,
		mediaKey,
		mediaType,
		createdAt: new Date()
	};

	const result = await completions.insertOne(doc as Completion);
	return { _id: result.insertedId, ...doc };
}

export async function getCompletionById(id: string): Promise<Completion | null> {
	if (!ObjectId.isValid(id)) return null;
	const db = await getDb();
	return db.collection<Completion>('completions').findOne({ _id: new ObjectId(id) });
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
		completedAt: completion.completedAt.toISOString(),
		notes: completion.notes,
		mediaKey: completion.mediaKey ?? (completion as { mediaId?: { toString(): string } }).mediaId?.toString(),
		mediaType: completion.mediaType,
		createdAt: completion.createdAt.toISOString()
	};
}
