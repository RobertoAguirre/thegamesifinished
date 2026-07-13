import { json } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { getDb } from '$lib/server/db';
import { getSiteOrigin } from '$lib/server/origin';
import { getRawgStats, verifyRawgConnection } from '$lib/server/rawg';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const checks: Record<string, { ok: boolean; message?: string }> = {};

	try {
		const db = await getDb();
		const ping = await db.command({ ping: 1 });
		checks.mongodb = { ok: ping.ok === 1, message: db.databaseName };
	} catch (error) {
		checks.mongodb = {
			ok: false,
			message: error instanceof Error ? error.message : 'MongoDB connection failed'
		};
	}

	const publishableKey = publicEnv.PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
	const secretKey = privateEnv.CLERK_SECRET_KEY ?? '';

	checks.clerk = {
		ok: publishableKey.startsWith('pk_') && secretKey.startsWith('sk_'),
		message: 'Clerk keys configured'
	};

	checks.uploads = {
		ok: Boolean(privateEnv.UPLOAD_DIR),
		message: privateEnv.UPLOAD_DIR ?? 'UPLOAD_DIR not set'
	};

	checks.origin = {
		ok: true,
		message: privateEnv.ORIGIN?.trim() || privateEnv.RENDER_EXTERNAL_URL?.trim() || getSiteOrigin(url)
	};

	const rawg = await verifyRawgConnection();
	checks.rawg = rawg;

	const coreOk = checks.mongodb.ok && checks.clerk.ok && checks.uploads.ok;

	return json(
		{ ok: coreOk, checks, rawgStats: getRawgStats() },
		{ status: coreOk ? 200 : 503 }
	);
};
