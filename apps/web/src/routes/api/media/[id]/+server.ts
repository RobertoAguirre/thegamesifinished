import { error } from '@sveltejs/kit';
import { mediaContentType, openMediaStream } from '$lib/server/media';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!params.id) error(400, 'Missing media id');

	const stream = openMediaStream(params.id);
	if (!stream) error(404, 'Media not found');

	const headers = new Headers();
	headers.set('Content-Type', mediaContentType(params.id));
	headers.set('Cache-Control', 'public, max-age=31536000, immutable');

	return new Response(stream as unknown as ReadableStream, { headers });
};
