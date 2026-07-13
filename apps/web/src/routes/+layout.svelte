<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import { initAnalytics } from '$lib/analytics/client';
	import { m } from '$lib/paraglide/messages.js';
	import { locales, localizeHref } from '$lib/paraglide/runtime.js';
	import { ClerkProvider } from 'svelte-clerk';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	onMount(() => {
		void initAnalytics();
	});

	const canonicalPath = $derived(page.url.pathname + page.url.search);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{m.brand_name()}</title>
	<meta name="description" content={m.meta_description_home()} />
	{#each locales as locale}
		<link
			rel="alternate"
			hreflang={locale}
			href={`${page.url.origin}${localizeHref(canonicalPath, { locale })}`}
		/>
	{/each}
	<link
		rel="alternate"
		hreflang="x-default"
		href={`${page.url.origin}${localizeHref(canonicalPath, { locale: 'es' })}`}
	/>
</svelte:head>

<ClerkProvider
	{...data}
	appearance={{
		variables: {
			colorPrimary: '#7c5cff',
			colorBackground: '#11111a',
			colorInputBackground: '#11111a',
			colorText: '#ffffff'
		}
	}}
>
	<div class="flex min-h-screen flex-col">
		<Header />
		<main class="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
			{@render children()}
		</main>
		<footer class="border-t border-border/60 py-8 text-center text-sm text-muted">
			<p>{m.footer_tagline()}</p>
			{#if data.rawgEnabled}
				<p class="mt-2">
					{m.footer_game_data_by()}
					<a href="https://rawg.io/" class="hover:text-accent" target="_blank" rel="noopener noreferrer">
						RAWG.io
					</a>
				</p>
			{/if}
		</footer>
	</div>
</ClerkProvider>
