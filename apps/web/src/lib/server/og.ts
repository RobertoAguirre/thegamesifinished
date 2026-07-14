import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { isRawgMediaUrl, sizedRawgImage } from '$lib/rawgImage';
import { ensureUploadDir } from './media';

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const IMAGE_PANEL_WIDTH = 440;
const FETCH_TIMEOUT_MS = 6_000;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/** Formats que resvg puede rasterizar embebidos (webp/avif no). */
const EMBEDDABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif']);

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function truncate(value: string, max: number): string {
	const trimmed = value.trim();
	if (trimmed.length <= max) return trimmed;
	return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/** Ancho aproximado por carácter para DejaVu Sans bold. */
const BOLD_CHAR_RATIO = 0.62;

function wrapWords(text: string, maxChars: number): string[] {
	const words = text.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let current = '';

	for (const word of words) {
		const candidate = current ? `${current} ${word}` : word;
		if (candidate.length <= maxChars) {
			current = candidate;
			continue;
		}
		if (current) lines.push(current);
		// Palabra más larga que la línea: corte duro.
		current = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word;
	}
	if (current) lines.push(current);
	return lines;
}

/**
 * Elige el tamaño de fuente más grande cuyo wrap quepa en <=3 líneas
 * dentro del ancho disponible; si ni el menor alcanza, trunca la 3ª línea.
 */
function fitTitle(title: string, maxWidth: number): { fontSize: number; lines: string[] } {
	const sizes = [64, 56, 48, 42, 36];

	for (const fontSize of sizes) {
		const maxChars = Math.floor(maxWidth / (fontSize * BOLD_CHAR_RATIO));
		const lines = wrapWords(title, maxChars);
		if (lines.length <= 3) return { fontSize, lines };
	}

	const fontSize = sizes[sizes.length - 1];
	const maxChars = Math.floor(maxWidth / (fontSize * BOLD_CHAR_RATIO));
	const lines = wrapWords(title, maxChars).slice(0, 3);
	lines[2] = truncate(`${lines[2]}…`, maxChars);
	return { fontSize, lines };
}

/** Descarga la portada y la devuelve como data URI embebible, o null. */
async function fetchCoverDataUri(imageUrl: string): Promise<string | null> {
	const source = isRawgMediaUrl(imageUrl) ? sizedRawgImage(imageUrl, 640) : imageUrl;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const response = await fetch(source, {
			signal: controller.signal,
			headers: { Accept: 'image/jpeg,image/png,image/gif,image/*;q=0.8' }
		});
		if (!response.ok) return null;

		const type = (response.headers.get('content-type') ?? '').split(';')[0].trim();
		if (!EMBEDDABLE_TYPES.has(type)) return null;

		const buffer = Buffer.from(await response.arrayBuffer());
		if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) return null;

		return `data:${type};base64,${buffer.toString('base64')}`;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Generates a 1200×630 share card once at completion time (standard OG size,
 * so it renders well on Facebook, X, WhatsApp, Telegram, etc.).
 * Failures are non-fatal — callers should keep the existing OG fallback.
 */
export async function generateOgCard(input: {
	displayName: string;
	gameTitle: string;
	gameImageUrl?: string;
}): Promise<string | null> {
	try {
		const cover = input.gameImageUrl ? await fetchCoverDataUri(input.gameImageUrl) : null;

		const textWidth = cover ? CARD_WIDTH - IMAGE_PANEL_WIDTH - 72 - 48 : CARD_WIDTH - 72 - 96;
		const name = escapeXml(truncate(input.displayName, 36));
		const { fontSize, lines } = fitTitle(input.gameTitle.trim(), textWidth);

		const lineHeight = Math.round(fontSize * 1.25);
		const titleTop = 190 + Math.round(fontSize * 1.15);
		const titleSvg = lines
			.map(
				(line, i) =>
					`<text x="72" y="${titleTop + i * lineHeight}" fill="#ffffff" font-size="${fontSize}" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">${escapeXml(line)}</text>`
			)
			.join('\n  ');

		const byY = titleTop + (lines.length - 1) * lineHeight + 58;
		const buttonY = Math.min(byY + 36, CARD_HEIGHT - 56 - 40);

		const imageX = CARD_WIDTH - IMAGE_PANEL_WIDTH;
		const coverSvg = cover
			? `<image x="${imageX}" y="0" width="${IMAGE_PANEL_WIDTH}" height="${CARD_HEIGHT}" preserveAspectRatio="xMidYMid slice" href="${cover}"/>
  <rect x="${imageX}" y="0" width="${IMAGE_PANEL_WIDTH}" height="${CARD_HEIGHT}" fill="url(#fade)"/>`
			: `<circle cx="1080" cy="-40" r="260" fill="#7c5cff" fill-opacity="0.18"/>`;

		const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0b14"/>
      <stop offset="55%" stop-color="#12121f"/>
      <stop offset="100%" stop-color="#1a1030"/>
    </linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0b0b14" stop-opacity="1"/>
      <stop offset="35%" stop-color="#0b0b14" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#0b0b14" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bg)"/>
  ${coverSvg}
  <circle cx="80" cy="680" r="220" fill="#34d399" fill-opacity="0.10"/>
  <text x="72" y="96" fill="#9278ff" font-size="28" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" letter-spacing="3">THE GAMES I FINISHED</text>
  <text x="72" y="190" fill="#34d399" font-size="34" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">JUST FINISHED</text>
  ${titleSvg}
  <text x="72" y="${byY}" fill="#c4c4d6" font-size="34" font-family="DejaVu Sans, Arial, sans-serif">by ${name}</text>
  <rect x="72" y="${buttonY}" width="220" height="56" rx="28" fill="#7c5cff"/>
  <text x="182" y="${buttonY + 36}" text-anchor="middle" fill="#ffffff" font-size="24" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">See the proof</text>
</svg>`;

		const resvg = new Resvg(svg, {
			fitTo: { mode: 'width', value: CARD_WIDTH }
		});
		const png = resvg.render().asPng();
		const key = `og-${randomUUID()}.png`;
		await writeFile(join(ensureUploadDir(), key), png);
		return key;
	} catch (error) {
		console.error('OG card generation failed:', error);
		return null;
	}
}
