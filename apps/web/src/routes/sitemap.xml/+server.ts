import { getDb } from '$lib/server/db';
import { getSiteOrigin } from '$lib/server/origin';
import type { RequestHandler } from './$types';

const MAX_URLS = 5000;

function xmlEscape(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export const GET: RequestHandler = async ({ url }) => {
	const origin = getSiteOrigin(url);
	const db = await getDb();

	const completions = await db
		.collection('completions')
		.find({}, { projection: { _id: 1, createdAt: 1 } })
		.sort({ createdAt: -1 })
		.limit(MAX_URLS)
		.toArray();

	const users = await db
		.collection('users')
		.find({}, { projection: { username: 1, updatedAt: 1 } })
		.limit(MAX_URLS)
		.toArray();

	const entries: Array<{ loc: string; lastmod?: Date; priority: string }> = [
		{ loc: `${origin}/`, priority: '1.0' },
		{ loc: `${origin}/en`, priority: '0.8' }
	];

	for (const c of completions) {
		entries.push({
			loc: `${origin}/completion/${c._id.toString()}`,
			lastmod: c.createdAt as Date | undefined,
			priority: '0.8'
		});
	}
	for (const u of users) {
		if (!u.username) continue;
		entries.push({
			loc: `${origin}/u/${encodeURIComponent(String(u.username))}`,
			lastmod: u.updatedAt as Date | undefined,
			priority: '0.6'
		});
	}

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
	.map(
		(e) =>
			`  <url><loc>${xmlEscape(e.loc)}</loc>${
				e.lastmod ? `<lastmod>${e.lastmod.toISOString().slice(0, 10)}</lastmod>` : ''
			}<priority>${e.priority}</priority></url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
