import type { Comment } from '@tgif/db';
import { ObjectId } from 'mongodb';
import { getDb } from './db';

const commentCooldown = new Map<string, number>();
const COOLDOWN_MS = 30_000;
const MAX_NAME = 40;
const MAX_BODY = 280;

function cleanText(value: string, max: number): string {
	return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

export async function getCommentsByCompletion(completionId: string): Promise<Comment[]> {
	if (!ObjectId.isValid(completionId)) return [];
	const db = await getDb();
	return db
		.collection<Comment>('comments')
		.find({ completionId: new ObjectId(completionId) })
		.sort({ createdAt: 1 })
		.limit(100)
		.toArray();
}

export async function addComment(input: {
	completionId: string;
	authorName: string;
	body: string;
	ip: string;
}): Promise<{ ok: true; comment: Comment } | { ok: false; error: string }> {
	if (!ObjectId.isValid(input.completionId)) {
		return { ok: false, error: 'Invalid completion.' };
	}

	const now = Date.now();
	const last = commentCooldown.get(input.ip) ?? 0;
	if (now - last < COOLDOWN_MS) {
		return { ok: false, error: 'Please wait a few seconds before commenting again.' };
	}

	const authorName = cleanText(input.authorName, MAX_NAME);
	const body = cleanText(input.body, MAX_BODY);

	if (authorName.length < 2) return { ok: false, error: 'Name is required.' };
	if (body.length < 2) return { ok: false, error: 'Comment is too short.' };

	const doc: Omit<Comment, '_id'> = {
		completionId: new ObjectId(input.completionId),
		authorName,
		body,
		createdAt: new Date()
	};

	const db = await getDb();
	const result = await db.collection<Omit<Comment, '_id'>>('comments').insertOne(doc as Comment);
	commentCooldown.set(input.ip, now);

	return { ok: true, comment: { _id: result.insertedId, ...doc } };
}

export function serializeComment(comment: Comment) {
	return {
		id: comment._id.toString(),
		authorName: comment.authorName,
		body: comment.body,
		createdAt: comment.createdAt.toISOString()
	};
}
