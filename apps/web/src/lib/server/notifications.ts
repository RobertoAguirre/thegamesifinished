import type { Notification, NotificationType } from '@tgif/db';
import { ObjectId } from 'mongodb';
import { getDb } from './db';

const MAX_LIST = 30;

let indexesReady: Promise<void> | null = null;

async function ensureIndexes(): Promise<void> {
	if (!indexesReady) {
		indexesReady = (async () => {
			const db = await getDb();
			await db.collection('notifications').createIndexes([
				{ key: { userId: 1, createdAt: -1 }, name: 'user_recent' },
				{ key: { userId: 1, readAt: 1 }, name: 'user_unread' }
			]);
		})().catch((error) => {
			indexesReady = null;
			throw error;
		});
	}
	await indexesReady;
}

export async function createNotification(input: {
	userId: ObjectId;
	type: NotificationType;
	completionId: ObjectId;
	gameTitle: string;
	actorName: string;
	preview?: string;
}): Promise<void> {
	await ensureIndexes();
	const db = await getDb();
	await db.collection<Omit<Notification, '_id'>>('notifications').insertOne({
		userId: input.userId,
		type: input.type,
		completionId: input.completionId,
		gameTitle: input.gameTitle,
		actorName: input.actorName,
		preview: input.preview,
		createdAt: new Date()
	} as Notification);
}

export async function getUnreadCount(userId: ObjectId): Promise<number> {
	const db = await getDb();
	return db
		.collection('notifications')
		.countDocuments({ userId, readAt: { $exists: false } }, { limit: 99 });
}

export async function listNotifications(userId: ObjectId): Promise<Notification[]> {
	const db = await getDb();
	return db
		.collection<Notification>('notifications')
		.find({ userId })
		.sort({ createdAt: -1 })
		.limit(MAX_LIST)
		.toArray();
}

export async function markAllRead(userId: ObjectId): Promise<void> {
	const db = await getDb();
	await db
		.collection('notifications')
		.updateMany({ userId, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
}

export function serializeNotification(n: Notification) {
	return {
		id: n._id.toString(),
		type: n.type,
		completionId: n.completionId.toString(),
		gameTitle: n.gameTitle,
		actorName: n.actorName,
		preview: n.preview,
		read: Boolean(n.readAt),
		createdAt: n.createdAt.toISOString()
	};
}
