<script lang="ts">
	import CompletionCard from '$lib/components/CompletionCard.svelte';
	import { SignUpButton } from 'svelte-clerk';

	let { data } = $props();
</script>

<section class="mb-16 text-center">
	<div class="mx-auto max-w-2xl">
		<p class="mb-4 text-sm font-medium uppercase tracking-widest text-accent">Your gaming trophy case</p>
		<h1 class="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
			Finished a game?<br />
			<span class="text-accent">Show the world.</span>
		</h1>
		<p class="mb-8 text-lg text-muted">
			Upload screenshots or clips as proof, track every game you've beaten, and share your wins on
			social media.
		</p>
		<SignUpButton mode="modal">
			<button class="rounded-full bg-accent px-8 py-3.5 text-base font-semibold hover:bg-accent-hover transition-colors">
				Start your profile — it's free
			</button>
		</SignUpButton>
	</div>
</section>

<section>
	<div class="mb-8 flex items-end justify-between">
		<div>
			<h2 class="text-2xl font-semibold">Recent wins</h2>
			<p class="text-sm text-muted">Games recently finished by the community</p>
		</div>
	</div>

	{#if data.completions.length === 0}
		<div class="rounded-2xl border border-dashed border-border p-12 text-center">
			<p class="text-muted">No completions yet. Be the first to log a win!</p>
		</div>
	{:else}
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.completions as completion (completion.id)}
				<CompletionCard {completion} />
			{/each}
		</div>
	{/if}
</section>
