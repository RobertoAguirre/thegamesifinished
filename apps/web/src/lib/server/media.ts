import { createHash, randomUUID } from 'node:crypto';
import { accessSync, constants, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { env } from '$env/dynamic/private';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_VIDEO = new Set(['video/mp4', 'video/webm']);

function preferredUploadDir(): string {
	return env.UPLOAD_DIR?.trim() || resolve('uploads');
}

function tryEnsureWritable(dir: string): boolean {
	try {
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true, mode: 0o755 });
		}
		accessSync(dir, constants.W_OK);
		const probe = join(dir, `.write-probe-${process.pid}`);
		writeFileSync(probe, 'ok');
		unlinkSync(probe);
		return true;
	} catch {
		return false;
	}
}

/** Resolved once per process after first successful probe. */
let cachedUploadDir: string | null = null;

/**
 * Ensures a writable upload directory.
 * Falls back if UPLOAD_DIR (e.g. /var/data/uploads) is not writable —
 * common when Render disk is missing or mis-mounted.
 */
export function ensureUploadDir(): string {
	if (cachedUploadDir && tryEnsureWritable(cachedUploadDir)) {
		return cachedUploadDir;
	}

	const candidates = [
		preferredUploadDir(),
		resolve('uploads'),
		'/tmp/tgif-uploads'
	].filter((dir, index, all) => all.indexOf(dir) === index);

	for (const dir of candidates) {
		if (tryEnsureWritable(dir)) {
			if (dir !== preferredUploadDir()) {
				console.error(
					`[media] UPLOAD_DIR not writable (${preferredUploadDir()}). Using fallback: ${dir}`
				);
			}
			cachedUploadDir = dir;
			return dir;
		}
	}

	throw new Error(
		`No se pudo escribir en el directorio de uploads (${preferredUploadDir()}). ` +
			'En Render: monta un Persistent Disk en /var/data y define UPLOAD_DIR=/var/data/uploads.'
	);
}

/** Health / diagnostics: can we write files? */
export function getUploadDirStatus(): { ok: boolean; path: string; message: string } {
	const preferred = preferredUploadDir();
	try {
		const path = ensureUploadDir();
		const usingFallback = path !== preferred;
		return {
			ok: true,
			path,
			message: usingFallback
				? `writable (fallback; preferred ${preferred} failed)`
				: 'writable'
		};
	} catch (error) {
		return {
			ok: false,
			path: preferred,
			message: error instanceof Error ? error.message : 'not writable'
		};
	}
}

export async function saveMedia(
	file: File
): Promise<{ mediaKey: string; mediaType: 'image' | 'video'; sha256: string }> {
	const type = file.type;
	const isImage = ALLOWED_IMAGE.has(type);
	const isVideo = ALLOWED_VIDEO.has(type);

	if (!isImage && !isVideo) {
		throw new Error('Unsupported media type. Use JPEG, PNG, WebP, GIF, MP4, or WebM.');
	}

	const max = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
	if (file.size > max) {
		throw new Error(`File too large. Max ${isImage ? '10MB' : '50MB'}.`);
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const sha256 = createHash('sha256').update(buffer).digest('hex');
	const ext = type.split('/')[1] === 'jpeg' ? 'jpg' : type.split('/')[1];
	const mediaKey = `${randomUUID()}.${ext}`;

	const dir = ensureUploadDir();
	writeFileSync(join(dir, mediaKey), buffer);

	return {
		mediaKey,
		mediaType: isImage ? 'image' : 'video',
		sha256
	};
}

export function resolveMediaPath(mediaKey: string): string {
	return join(ensureUploadDir(), mediaKey);
}

export function deleteMediaFile(mediaKey: string | undefined): void {
	if (!mediaKey) return;
	try {
		unlinkSync(resolveMediaPath(mediaKey));
	} catch {
		// Missing file is fine — best effort cleanup.
	}
}
