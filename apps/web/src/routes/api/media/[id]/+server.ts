import { error } from '@sveltejs/kit';
import { getMediaMetadata, getMediaStream } from '$lib/server/completions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!params.id) error(400, 'Missing media id');

	const metadata = await getMediaMetadata(params.id);
	if (!metadata) error(404, 'Media not found');

	const stream = await getMediaStream(params.id);
	const contentType =
		(metadata.metadata as { contentType?: string } | undefined)?.contentType ??
		'application/octet-stream';

	const headers = new Headers();
	headers.set('Content-Type', contentType);
	headers.set('Cache-Control', 'public, max-age=31536000, immutable');

	return new Response(stream as unknown as ReadableStream, { headers });
};
