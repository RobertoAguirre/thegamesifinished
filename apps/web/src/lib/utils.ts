export function formatDate(date: string | Date): string {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(typeof date === 'string' ? new Date(date) : date);
}

export function shareText(gameTitle: string, displayName: string): string {
	return `I just finished ${gameTitle}! 🎮 — ${displayName} on The Games I Finished`;
}

export function absoluteUrl(path: string, origin: string): string {
	return new URL(path, origin).toString();
}
