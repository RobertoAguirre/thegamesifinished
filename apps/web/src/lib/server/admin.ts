import { env } from '$env/dynamic/private';

export function isAdmin(clerkId: string | null | undefined): boolean {
	if (!clerkId) return false;
	const raw = env.ADMIN_CLERK_IDS ?? '';
	const ids = raw
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);
	return ids.includes(clerkId);
}
