import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { ensureUploadDir } from './media';

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

/**
 * Generates a 1200×630 share card once at completion time.
 * Failures are non-fatal — callers should keep the existing OG fallback.
 */
export async function generateOgCard(input: {
	displayName: string;
	gameTitle: string;
}): Promise<string | null> {
	try {
		const name = escapeXml(truncate(input.displayName, 36));
		const game = escapeXml(truncate(input.gameTitle, 48));

		const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0b14"/>
      <stop offset="55%" stop-color="#12121f"/>
      <stop offset="100%" stop-color="#1a1030"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1080" cy="-40" r="260" fill="#7c5cff" fill-opacity="0.18"/>
  <circle cx="80" cy="680" r="220" fill="#34d399" fill-opacity="0.10"/>
  <text x="72" y="96" fill="#9278ff" font-size="28" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" letter-spacing="3">THE GAMES I FINISHED</text>
  <text x="72" y="250" fill="#34d399" font-size="34" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">JUST FINISHED</text>
  <text x="72" y="340" fill="#ffffff" font-size="64" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">${game}</text>
  <text x="72" y="430" fill="#c4c4d6" font-size="36" font-family="DejaVu Sans, Arial, sans-serif">by ${name}</text>
  <rect x="72" y="500" width="220" height="56" rx="28" fill="#7c5cff"/>
  <text x="182" y="536" text-anchor="middle" fill="#ffffff" font-size="24" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">See the proof</text>
</svg>`;

		const resvg = new Resvg(svg, {
			fitTo: { mode: 'width', value: 1200 }
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
