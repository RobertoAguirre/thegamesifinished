<script lang="ts">
	import CompletionCard from '$lib/components/CompletionCard.svelte';

	let { data } = $props();
</script>

<section class="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
	<div class="flex items-center gap-4">
		{#if data.user.avatarUrl}
			<img src={data.user.avatarUrl} alt="" class="h-16 w-16 rounded-full border border-border" />
		{:else}
			<div class="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-2xl">🎮</div>
		{/if}
		<div>
			<h1 class="text-2xl font-bold">{data.user.displayName}</h1>
			<p class="text-muted">@{data.user.username}</p>
		</div>
	</div>

	<div class="flex items-center gap-4">
		<div class="rounded-2xl border border-border bg-surface px-6 py-4 text-center">
			<p class="text-3xl font-bold text-accent">{data.totalGames}</p>
			<p class="text-sm text-muted">games finished</p>
		</div>
		<a
			href="/add"
			class="rounded-full bg-accent px-6 py-3 font-medium hover:bg-accent-hover transition-colors"
		>
			Log another win
		</a>
	</div>
</section>

<section>
	<h2 class="mb-6 text-xl font-semibold">Your completions</h2>

	{#if data.completions.length === 0}
		<div class="rounded-2xl border border-dashed border-border p-12 text-center">
			<p class="mb-4 text-muted">You haven't logged any games yet.</p>
			<a href="/add" class="text-accent hover:underline">Log your first completion →</a>
		</div>
	{:else}
		<div class="grid gap-6 sm:grid-cols-2">
			{#each data.completions as completion (completion.id)}
				<CompletionCard {completion} />
			{/each}
		</div>
	{/if}
</section>

<p class="mt-8 text-center text-sm text-muted">
	<a href="/u/{data.user.username}" class="hover:text-accent">View public profile →</a>
</p>
