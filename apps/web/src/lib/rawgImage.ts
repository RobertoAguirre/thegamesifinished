/** Same-origin proxy so portadas RAWG no fallen por CDN/SSL/red del cliente. */
const RAWG_MEDIA = /^https:\/\/media\.rawg\.io\/media\//i;

export function isRawgMediaUrl(url: string | null | undefined): url is string {
	return Boolean(url && RAWG_MEDIA.test(url));
}

/** Inserta crop de RAWG: /media/games/... → /media/crop/W/H/games/... */
export function cropRawgImage(url: string, width: number, height: number): string {
	if (!isRawgMediaUrl(url) || url.includes('/media/crop/')) return url;
	return url.replace('/media/', `/media/crop/${width}/${height}/`);
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

	const width = opts?.width ?? 600;
	const height = opts?.height ?? 400;
	const cropped = cropRawgImage(url, width, height);
	return `/api/images/rawg?u=${encodeURIComponent(cropped)}`;
}
