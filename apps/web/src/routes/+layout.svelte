<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import { initAnalytics } from '$lib/analytics/client';
	import { m } from '$lib/paraglide/messages.js';
	import { locales, localizeHref } from '$lib/paraglide/runtime.js';
	import { ClerkProvider } from 'svelte-clerk';
	import { navigating, page } from '$app/state';
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
	{#if navigating.to}
		<div
			class="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-accent/20"
			aria-hidden="true"
		>
			<div class="nav-progress-bar h-full w-1/3 rounded-full bg-accent"></div>
		</div>
	{/if}
	<div class="flex min-h-screen flex-col">
		<Header unreadNotifications={data.unreadNotifications} />
		<main class="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
			{@render children()}
		</main>
		<footer class="border-t border-border/60 py-8 text-center text-sm text-muted">
			<p class="text-base font-medium tracking-tight text-white/90 sm:text-lg">
				{m.footer_tagline()}
			</p>
			<p class="mt-3">{m.footer_copyright({ year: new Date().getFullYear() })}</p>
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
