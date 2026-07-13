import type { User } from '@tgif/db';
import { clerkClient } from 'svelte-clerk/server';
import { getDb } from './db';

export async function syncUserFromClerk(auth: { userId: string | null }): Promise<User | null> {
	if (!auth.userId) return null;

	const clerkUser = await clerkClient.users.getUser(auth.userId);
	const db = await getDb();
	const users = db.collection<User>('users');
	const existing = await users.findOne({ clerkId: auth.userId });

	const username = (
		clerkUser.username ??
		existing?.username ??
		`player-${auth.userId.slice(-8)}`
	).toLowerCase();
	const displayName =
		[clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
		clerkUser.username ||
		existing?.displayName ||
		username;
	const avatarUrl = clerkUser.imageUrl ?? existing?.avatarUrl;
	const now = new Date();

	if (existing) {
		await users.updateOne(
			{ clerkId: auth.userId },
			{
				$set: {
					username,
					displayName,
					avatarUrl,
					updatedAt: now
				}
			}
		);
		return { ...existing, username, displayName, avatarUrl, updatedAt: now };
	}

	const doc: Omit<User, '_id'> = {
		clerkId: auth.userId,
		username,
		displayName,
		avatarUrl,
		createdAt: now,
		updatedAt: now
	};

	const result = await users.insertOne(doc as User);
	return { _id: result.insertedId, ...doc };
}

export async function getUserByClerkId(clerkId: string): Promise<User | null> {
	const db = await getDb();
	return db.collection<User>('users').findOne({ clerkId });
}

export async function getUserByUsername(username: string): Promise<User | null> {
	const db = await getDb();
	return db.collection<User>('users').findOne({ username: username.toLowerCase() });
}

export async function getCompletionCount(userId: User['_id']): Promise<number> {
	const db = await getDb();
	return db.collection('completions').countDocuments({ userId });
}
