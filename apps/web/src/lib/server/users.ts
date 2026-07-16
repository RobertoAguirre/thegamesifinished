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
	// A custom name set in the dashboard wins over Clerk-derived values.
	const displayName = existing?.displayNameLocked
		? existing.displayName
		: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
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

/**
 * Set a custom display name. Never touches username / clerkId / ObjectIds.
 * Also refreshes the denormalized displayName on the user's completions
 * so public cards show the new name.
 */
export async function updateDisplayName(clerkId: string, displayName: string): Promise<boolean> {
	const name = displayName.trim().replace(/\s+/g, ' ');
	if (name.length < 2 || name.length > 40) return false;

	const db = await getDb();
	const users = db.collection<User>('users');
	const user = await users.findOne({ clerkId });
	if (!user) return false;

	const now = new Date();
	await users.updateOne(
		{ clerkId },
		{ $set: { displayName: name, displayNameLocked: true, updatedAt: now } }
	);
	await db
		.collection('completions')
		.updateMany({ userId: user._id }, { $set: { displayName: name } });

	return true;
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
