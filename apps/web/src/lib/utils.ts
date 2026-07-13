import { m } from '$lib/paraglide/messages.js';
import { getLocale } from '$lib/paraglide/runtime.js';

export function formatDate(date: string | Date): string {
	return new Intl.DateTimeFormat(getLocale(), {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(typeof date === 'string' ? new Date(date) : date);
}

/** Share caption. Game titles and brand stay as provided (typically English). */
export function shareText(gameTitle: string, displayName: string): string {
	return m.share_text({ displayName, gameTitle });
}

export function absoluteUrl(path: string, origin: string): string {
	return new URL(path, origin).toString();
}
