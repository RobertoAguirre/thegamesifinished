import { error } from '@sveltejs/kit';
import { isRawgMediaUrl, originalMediaUrl } from '$lib/rawgImage';
import type { RequestHandler } from './$types';

const MAX_BYTES = 8 * 1024 * 1024;

async function fetchRawgImage(fetchFn: typeof fetch, target: string): Promise<Response> {
	const headers = {
		Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
		'User-Agent': 'TheGamesIFinished/1.0 (+https://gamesifinished.com)'
	};

	let remote = await fetchFn(target, { headers, redirect: 'follow' });

	// Si el resize no existe, cae a la imagen original que sí sirve la API/CDN.
	if (!remote.ok && /\/media\/resize\/\d+\/-\//.test(target)) {
		const original = originalMediaUrl(target);
		if (original !== target) {
			remote = await fetchFn(original, { headers, redirect: 'follow' });
		}
	}

	return remote;
}

export const GET: RequestHandler = async ({ url, fetch }) => {
	const target = url.searchParams.get('u');
	if (!target || !isRawgMediaUrl(target)) {
		error(400, 'Invalid image URL');
	}

	let remote: Response;
	try {
		remote = await fetchRawgImage(fetch, target);
	} catch {
		error(502, 'Failed to fetch image');
	}

	if (!remote.ok) {
		error(remote.status === 404 ? 404 : 502, 'Image unavailable');
	}

	const finalUrl = remote.url || target;
	if (finalUrl && !isRawgMediaUrl(finalUrl)) {
		error(502, 'Unexpected redirect');
	}

	const contentType = remote.headers.get('content-type') ?? 'image/jpeg';
	if (!contentType.startsWith('image/')) {
		error(502, 'Not an image');
	}

	const contentLength = Number(remote.headers.get('content-length') ?? 0);
	if (contentLength > MAX_BYTES) {
		error(413, 'Image too large');
	}

	const headers = new Headers();
	headers.set('Content-Type', contentType);
	headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
	if (contentLength > 0) headers.set('Content-Length', String(contentLength));

	return new Response(remote.body, { headers });
};
