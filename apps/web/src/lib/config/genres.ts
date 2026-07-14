/**
 * Detect fighting / versus fighter genres from RAWG genre names/slugs.
 */
export function isFightingGenre(
	genres: Array<{ name?: string; slug?: string } | string> | undefined | null
): boolean {
	if (!genres?.length) return false;
	return genres.some((g) => {
		const name = (typeof g === 'string' ? g : g.name ?? '').toLowerCase().trim();
		const slug = (typeof g === 'string' ? '' : g.slug ?? '').toLowerCase().trim();
		return (
			slug === 'fighting' ||
			name === 'fighting' ||
			name.includes('fighting') ||
			name.includes('fighter') ||
			name.includes('pelea') ||
			slug.includes('fighting')
		);
	});
}
