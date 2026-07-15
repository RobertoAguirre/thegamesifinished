import type {
	Reaction,
	ReactionKind,
	ReactionTargetType
} from '@tgif/db';
import { ObjectId } from 'mongodb';
import { m } from '$lib/paraglide/messages.js';
import { getDb } from './db';
import { getUserByClerkId } from './users';

export const REACTION_KINDS = ['fire', 'heart', 'clap', 'joy'] as const satisfies ReactionKind[];

export const REACTION_EMOJI: Record<ReactionKind, string> = {
	fire: '🔥',
	heart: '❤️',
	clap: '👏',
	joy: '😂'
};

export type ReactionCounts = Record<ReactionKind, number>;

export function emptyReactionCounts(): ReactionCounts {
	return { fire: 0, heart: 0, clap: 0, joy: 0 };
}

function isReactionKind(value: string): value is ReactionKind {
	return (REACTION_KINDS as readonly string[]).includes(value);
}

function isTargetType(value: string): value is ReactionTargetType {
	return value === 'completion' || value === 'comment';
}

let indexesReady: Promise<void> | null = null;

async function ensureReactionIndexes(): Promise<void> {
	if (!indexesReady) {
		indexesReady = (async () => {
			const db = await getDb();
			await db.collection('reactions').createIndexes([
				{
					key: { targetType: 1, targetId: 1, clerkId: 1 },
					unique: true,
					name: 'target_clerk_unique'
				},
				{ key: { targetType: 1, targetId: 1, kind: 1 }, name: 'target_kind' }
			]);
		})().catch((error) => {
			indexesReady = null;
			throw error;
		});
	}
	await indexesReady;
}

export async function getReactionsForTargets(
	targets: Array<{ targetType: ReactionTargetType; targetId: string }>,
	viewerClerkId?: string | null
): Promise<{
	counts: Record<string, ReactionCounts>;
	viewer: Record<string, ReactionKind | null>;
}> {
	const counts: Record<string, ReactionCounts> = {};
	const viewer: Record<string, ReactionKind | null> = {};

	const valid = targets.filter((t) => ObjectId.isValid(t.targetId));
	for (const t of valid) {
		counts[t.targetId] = emptyReactionCounts();
		viewer[t.targetId] = null;
	}
	if (valid.length === 0) return { counts, viewer };

	const db = await getDb();
	const or = valid.map((t) => ({
		targetType: t.targetType,
		targetId: new ObjectId(t.targetId)
	}));

	const rows = await db
		.collection<Reaction>('reactions')
		.find({ $or: or })
		.toArray();

	for (const row of rows) {
		const id = row.targetId.toString();
		if (!counts[id]) counts[id] = emptyReactionCounts();
		counts[id][row.kind] += 1;
		if (viewerClerkId && row.clerkId === viewerClerkId) {
			viewer[id] = row.kind;
		}
	}

	return { counts, viewer };
}

export async function toggleReaction(input: {
	targetType: string;
	targetId: string;
	kind: string;
	clerkId: string;
}): Promise<
	| {
			ok: true;
			counts: ReactionCounts;
			viewerReaction: ReactionKind | null;
			/** 'added' solo en reacción nueva — para avisos sin spam al alternar. */
			action: 'added' | 'changed' | 'removed';
			actorName: string;
	  }
	| { ok: false; error: string }
> {
	if (!isTargetType(input.targetType)) {
		return { ok: false, error: m.error_reaction_invalid() };
	}
	if (!isReactionKind(input.kind)) {
		return { ok: false, error: m.error_reaction_invalid() };
	}
	if (!ObjectId.isValid(input.targetId)) {
		return { ok: false, error: m.error_reaction_invalid() };
	}

	const user = await getUserByClerkId(input.clerkId);
	if (!user) return { ok: false, error: m.error_user_not_found() };

	await ensureReactionIndexes();
	const db = await getDb();
	const reactions = db.collection<Reaction>('reactions');
	const targetId = new ObjectId(input.targetId);
	const targetType = input.targetType;
	const kind = input.kind;

	if (targetType === 'completion') {
		const exists = await db.collection('completions').findOne({ _id: targetId }, { projection: { _id: 1 } });
		if (!exists) return { ok: false, error: m.error_completion_not_found() };
	} else {
		const exists = await db.collection('comments').findOne({ _id: targetId }, { projection: { _id: 1 } });
		if (!exists) return { ok: false, error: m.error_reaction_target_missing() };
	}

	const existing = await reactions.findOne({ targetType, targetId, clerkId: input.clerkId });

	let action: 'added' | 'changed' | 'removed';
	if (existing && existing.kind === kind) {
		await reactions.deleteOne({ _id: existing._id });
		action = 'removed';
	} else if (existing) {
		await reactions.updateOne(
			{ _id: existing._id },
			{ $set: { kind, createdAt: new Date() } }
		);
		action = 'changed';
	} else {
		await reactions.insertOne({
			targetType,
			targetId,
			clerkId: input.clerkId,
			userId: user._id,
			kind,
			createdAt: new Date()
		} as Reaction);
		action = 'added';
	}

	const snapshot = await getReactionsForTargets(
		[{ targetType, targetId: input.targetId }],
		input.clerkId
	);

	return {
		ok: true,
		counts: snapshot.counts[input.targetId] ?? emptyReactionCounts(),
		viewerReaction: snapshot.viewer[input.targetId] ?? null,
		action,
		actorName: user.displayName
	};
}

export async function deleteReactionsForCompletion(completionId: ObjectId): Promise<void> {
	const db = await getDb();
	const comments = await db
		.collection('comments')
		.find({ completionId }, { projection: { _id: 1 } })
		.toArray();
	const commentIds = comments.map((c) => c._id);

	await db.collection('reactions').deleteMany({
		$or: [
			{ targetType: 'completion', targetId: completionId },
			{ targetType: 'comment', targetId: { $in: commentIds } }
		]
	});
}
