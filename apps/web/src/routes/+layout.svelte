<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import { initAnalytics } from '$lib/analytics/client';
	import { ClerkProvider } from 'svelte-clerk';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	onMount(() => {
		void initAnalytics();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>The Games I Finished</title>
	<meta
		name="description"
		content="Show off the games you've completed. Upload proof, build your profile, and share your wins."
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
			<p>Built for gamers who finish what they start.</p>
			{#if data.rawgEnabled}
				<p class="mt-2">
					Game data by
					<a href="https://rawg.io/" class="hover:text-accent" target="_blank" rel="noopener noreferrer">
						RAWG.io
					</a>
				</p>
			{/if}
		</footer>
	</div>
</ClerkProvider>
