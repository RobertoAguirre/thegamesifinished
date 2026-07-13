export function formatDate(date: string | Date): string {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(typeof date === 'string' ? new Date(date) : date);
}

export function shareText(gameTitle: string, displayName: string): string {
	return `${displayName} just finished ${gameTitle} — see the proof on The Games I Finished`;
}

export function absoluteUrl(path: string, origin: string): string {
	return new URL(path, origin).toString();
}
