import { env } from '$env/dynamic/private';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

const MIME_EXTENSIONS: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'image/gif': '.gif',
	'video/mp4': '.mp4',
	'video/webm': '.webm',
	'video/quicktime': '.mov'
};

export function getUploadDir(): string {
	const dir = env.UPLOAD_DIR ?? './uploads';
	return resolve(dir);
}

export function ensureUploadDir(): string {
	const dir = getUploadDir();
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	return dir;
}

export async function saveMedia(
	file: File
): Promise<{ mediaKey: string; mediaType: 'image' | 'video' }> {
	const isVideo = file.type.startsWith('video/');
	const isImage = file.type.startsWith('image/');

	if (!isVideo && !isImage) {
		throw new Error('Only images and videos are allowed');
	}

	const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
	if (file.size > maxSize) {
		throw new Error(`File too large. Max ${isVideo ? '25MB' : '10MB'}.`);
	}

	const extension =
		MIME_EXTENSIONS[file.type] ?? extname(file.name).toLowerCase() ?? (isVideo ? '.mp4' : '.jpg');

	const mediaKey = `${randomUUID()}${extension}`;
	const filePath = join(ensureUploadDir(), mediaKey);
	const buffer = Buffer.from(await file.arrayBuffer());
	await import('node:fs/promises').then((fs) => fs.writeFile(filePath, buffer));

	return { mediaKey, mediaType: isVideo ? 'video' : 'image' };
}

export function getMediaPath(mediaKey: string): string | null {
	const safeKey = mediaKey.replace(/[/\\]/g, '');
	const filePath = join(getUploadDir(), safeKey);
	return existsSync(filePath) ? filePath : null;
}

export async function getMediaInfo(mediaKey: string) {
	const filePath = getMediaPath(mediaKey);
	if (!filePath) return null;

	const fileStat = await stat(filePath);
	const ext = extname(filePath).toLowerCase();
	const videoExtensions = new Set(['.mp4', '.webm', '.mov']);

	return {
		filePath,
		size: fileStat.size,
		mediaType: videoExtensions.has(ext) ? ('video' as const) : ('image' as const)
	};
}

export function openMediaStream(mediaKey: string) {
	const filePath = getMediaPath(mediaKey);
	if (!filePath) return null;
	return createReadStream(filePath);
}

export function mediaContentType(mediaKey: string): string {
	const ext = extname(mediaKey).toLowerCase();
	const map: Record<string, string> = {
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.png': 'image/png',
		'.webp': 'image/webp',
		'.gif': 'image/gif',
		'.mp4': 'video/mp4',
		'.webm': 'video/webm',
		'.mov': 'video/quicktime'
	};
	return map[ext] ?? 'application/octet-stream';
}
