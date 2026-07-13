import { sequence } from '@sveltejs/kit/hooks';
import { withClerkHandler } from 'svelte-clerk/server';
import type { Handle } from '@sveltejs/kit';
import { syncUserFromClerk } from '$lib/server/users';

const clerkHandle = withClerkHandler({
	signInUrl: '/sign-in',
	signUpUrl: '/sign-up'
});

const syncUserHandle: Handle = async ({ event, resolve }) => {
	const auth = event.locals.auth();
	if (auth.userId) {
		try {
			await syncUserFromClerk(auth);
		} catch (error) {
			console.error('Failed to sync user:', error);
		}
	}
	return resolve(event);
};

export const handle = sequence(clerkHandle, syncUserHandle);
