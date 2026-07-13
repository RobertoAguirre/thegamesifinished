import type { Completion, User } from '@tgif/db';
import { ObjectId, GridFSBucket } from 'mongodb';
import { getDb } from './db';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export async function uploadMedia(
	file: File
): Promise<{ mediaId: ObjectId; mediaType: 'image' | 'video' }> {
	const isVideo = file.type.startsWith('video/');
	const isImage = file.type.startsWith('image/');

	if (!isVideo && !isImage) {
		throw new Error('Only images and videos are allowed');
	}

	const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
	if (file.size > maxSize) {
		throw new Error(`File too large. Max ${isVideo ? '25MB' : '10MB'}.`);
	}

	const db = await getDb();
	const bucket = new GridFSBucket(db, { bucketName: 'media' });
	const buffer = Buffer.from(await file.arrayBuffer());

	return new Promise((resolve, reject) => {
		const uploadStream = bucket.openUploadStream(file.name, {
			metadata: { contentType: file.type, originalName: file.name, size: file.size }
		});

		uploadStream.on('error', reject);
		uploadStream.on('finish', () => {
			resolve({
				mediaId: uploadStream.id as ObjectId,
				mediaType: isVideo ? 'video' : 'image'
			});
		});

		uploadStream.end(buffer);
	});
}

export async function getMediaStream(id: string) {
	const db = await getDb();
	const bucket = new GridFSBucket(db, { bucketName: 'media' });
	return bucket.openDownloadStream(new ObjectId(id));
}

export async function getMediaMetadata(id: string) {
	const db = await getDb();
	const bucket = new GridFSBucket(db, { bucketName: 'media' });
	const files = await bucket.find({ _id: new ObjectId(id) }).toArray();
	return files[0] ?? null;
}

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

	let mediaId: ObjectId | undefined;
	let mediaType: 'image' | 'video' | undefined;

	if (input.mediaFile && input.mediaFile.size > 0) {
		const uploaded = await uploadMedia(input.mediaFile);
		mediaId = uploaded.mediaId;
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
		mediaId,
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
		mediaId: completion.mediaId?.toString(),
		mediaType: completion.mediaType,
		createdAt: completion.createdAt.toISOString()
	};
}
