/** Same-origin proxy so portadas RAWG no fallen por CDN/SSL/red del cliente. */
const RAWG_MEDIA_HOSTS = new Set(['media.rawg.io', 'api.rawg.io']);

export function isRawgMediaUrl(url: string | null | undefined): url is string {
	if (!url) return false;
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== 'https:') return false;
		if (!RAWG_MEDIA_HOSTS.has(parsed.hostname)) return false;
		return parsed.pathname.startsWith('/media/');
	} catch {
		return false;
	}
}

/** Normaliza a la imagen original en media.rawg.io (sin crop/resize). */
function originalMediaUrl(url: string): string {
	try {
		const parsed = new URL(url);
		parsed.hostname = 'media.rawg.io';
		parsed.pathname = parsed.pathname
			.replace(/^\/media\/crop\/\d+\/\d+\//, '/media/')
			.replace(/^\/media\/resize\/\d+\/-\//, '/media/');
		return parsed.toString();
	} catch {
		return url;
	}
}

/**
 * Miniatura vía resize de RAWG (crop está roto / 404).
 * /media/games/... → /media/resize/{width}/-/games/...
 */
export function sizedRawgImage(url: string, width: number): string {
	if (!isRawgMediaUrl(url)) return url;
	const original = originalMediaUrl(url);
	return original.replace('/media/', `/media/resize/${Math.max(40, Math.round(width))}/-/`);
}

/**
 * URL para <img>: proxificada vía /api/images/rawg.
 * Guarda la URL original de RAWG en DB; solo reescribe al renderizar.
 */
export function rawgImageSrc(
	url: string | null | undefined,
	opts?: { width?: number; height?: number }
): string | undefined {
	if (!url) return undefined;
	if (!isRawgMediaUrl(url)) return url;

	const width = opts?.width ?? 640;
	const sized = sizedRawgImage(url, width);
	return `/api/images/rawg?u=${encodeURIComponent(sized)}`;
}
