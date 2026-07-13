import adapter from '@sveltejs/adapter-node';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vite';

/** cookie → manual override; preferredLanguage → auto from browser; url → /en/... SEO */
const localeStrategy = ['cookie', 'preferredLanguage', 'url', 'baseLocale'] as const;

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			csrf: {
				trustedOrigins: [
					'https://gamesifinished.com',
					'https://www.gamesifinished.com',
					'https://thegamesifinished.onrender.com'
				]
			}
		}),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: [...localeStrategy],
			routeStrategies: [{ match: '/api/:path(.*)?', exclude: true }]
		})
	],
	// mongodb is CJS; bundling it into the ESM server build causes
	// "require is not defined" in production (adapter-node).
	ssr: {
		external: ['mongodb']
	}
});
