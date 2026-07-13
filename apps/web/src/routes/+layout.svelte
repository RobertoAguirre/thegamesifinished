<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import { ClerkProvider } from 'svelte-clerk';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>The Games I Finished</title>
	<meta
		name="description"
		content="Show off the games you've completed. Upload proof, build your profile, and share your wins."
	/>
</svelte:head>

<ClerkProvider {...data}>
	<div class="flex min-h-screen flex-col">
		<Header />
		<main class="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
			{@render children()}
		</main>
		<footer class="border-t border-border/60 py-8 text-center text-sm text-muted">
			Built for gamers who finish what they start.
		</footer>
	</div>
</ClerkProvider>
