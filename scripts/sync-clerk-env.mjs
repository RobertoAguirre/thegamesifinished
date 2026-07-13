import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve('apps/web/.env');
if (!existsSync(envPath)) {
	console.error('Missing apps/web/.env — run clerk env pull first.');
	process.exit(1);
}

const lines = readFileSync(envPath, 'utf8').split('\n');
const values = new Map();

for (const line of lines) {
	const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
	if (match) values.set(match[1], match[2]);
}

const publishable =
	values.get('PUBLIC_CLERK_PUBLISHABLE_KEY') ??
	values.get('VITE_CLERK_PUBLISHABLE_KEY') ??
	values.get('CLERK_PUBLISHABLE_KEY');

const secret = values.get('CLERK_SECRET_KEY');

if (!publishable || !secret) {
	console.error('Clerk keys not found in apps/web/.env');
	process.exit(1);
}

const defaults = {
	PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
	PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
	PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: '/dashboard',
	PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: '/dashboard'
};

const mongodb = values.get('MONGODB_URI') ?? '';
const rawg = values.get('RAWG_API_KEY') ?? '';
const origin = values.get('ORIGIN') ?? 'http://localhost:5173';
const uploadDir = values.get('UPLOAD_DIR') ?? './uploads';

const output = [
	'# Clerk — synced from Clerk CLI',
	`PUBLIC_CLERK_PUBLISHABLE_KEY=${publishable}`,
	`CLERK_SECRET_KEY=${secret}`,
	'',
	`PUBLIC_CLERK_SIGN_IN_URL=${values.get('PUBLIC_CLERK_SIGN_IN_URL') ?? defaults.PUBLIC_CLERK_SIGN_IN_URL}`,
	`PUBLIC_CLERK_SIGN_UP_URL=${values.get('PUBLIC_CLERK_SIGN_UP_URL') ?? defaults.PUBLIC_CLERK_SIGN_UP_URL}`,
	`PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=${values.get('PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL') ?? defaults.PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL}`,
	`PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=${values.get('PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL') ?? defaults.PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL}`,
	'',
	'# MongoDB',
	mongodb ? `MONGODB_URI=${mongodb}` : '# MONGODB_URI=',
	'',
	'# File uploads',
	`UPLOAD_DIR=${uploadDir}`,
	'',
	'# Site URL',
	`ORIGIN=${origin}`,
	'',
	'# RAWG (optional)',
	rawg ? `RAWG_API_KEY=${rawg}` : 'RAWG_API_KEY=',
	''
].join('\n');

writeFileSync(envPath, output);
console.log('Clerk env synced for SvelteKit → apps/web/.env');
