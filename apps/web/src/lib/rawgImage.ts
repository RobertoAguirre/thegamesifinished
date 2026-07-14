/** Same-origin proxy so portadas RAWG no fallen por CDN/SSL/red del cliente. */
const RAWG_MEDIA_HOSTS = new Set(['media.rawg.io', 'api.rawg.io']);

/**
 * Anchos que el CDN de RAWG responde con 200.
 * Otros valores (p. ej. 120, 160) redirigen a api.rawg.io y terminan en 404.
 * No está documentado formalmente en https://api.rawg.io/docs/; se valida empíricamente.
 */
const RAWG_RESIZE_WIDTHS = [80, 200, 420, 600, 640, 1280] as const;

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
export function originalMediaUrl(url: string): string {
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

/** Elige el ancho de resize soportado más cercano (hacia arriba). */
export function nearestRawgResizeWidth(width: number): number {
	const target = Math.max(1, Math.round(width));
	const fit = RAWG_RESIZE_WIDTHS.find((w) => w >= target);
	return fit ?? RAWG_RESIZE_WIDTHS[RAWG_RESIZE_WIDTHS.length - 1];
}

/**
 * Miniatura vía resize de RAWG.
 * /media/games/... → /media/resize/{width}/-/games/...
 */
export function sizedRawgImage(url: string, width: number): string {
	if (!isRawgMediaUrl(url)) return url;
	const original = originalMediaUrl(url);
	const w = nearestRawgResizeWidth(width);
	return original.replace('/media/', `/media/resize/${w}/-/`);
}

/**
 * URL para <img>: proxificada vía /api/images/rawg.
 * La API entrega `background_image` completa; nosotros solo reescribimos al mostrar.
 * @see https://api.rawg.io/docs/
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
