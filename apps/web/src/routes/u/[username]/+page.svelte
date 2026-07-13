<script lang="ts">
	import CompletionCard from '$lib/components/CompletionCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.user.displayName} — The Games I Finished</title>
	<meta
		name="description"
		content="{data.user.displayName} has finished {data.totalGames} games on The Games I Finished."
	/>
	<meta property="og:url" content="{data.siteOrigin}/u/{data.user.username}" />
	<meta property="og:title" content="{data.user.displayName} — The Games I Finished" />
	<meta property="og:description" content="{data.user.displayName} has finished {data.totalGames} games." />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<section class="mb-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
	{#if data.user.avatarUrl}
		<img src={data.user.avatarUrl} alt="" class="h-20 w-20 rounded-full border border-border" />
	{:else}
		<div class="flex h-20 w-20 items-center justify-center rounded-full bg-accent/20 text-3xl">🎮</div>
	{/if}

	<div class="flex-1">
		<h1 class="text-3xl font-bold">{data.user.displayName}</h1>
		<p class="text-muted">@{data.user.username}</p>
	</div>

	<div class="rounded-2xl border border-border bg-surface px-8 py-4 text-center">
		<p class="text-4xl font-bold text-accent">{data.totalGames}</p>
		<p class="text-sm text-muted">games finished</p>
	</div>
</section>

{#if data.completions.length === 0}
	<div class="rounded-2xl border border-dashed border-border p-12 text-center text-muted">
		No public completions yet.
	</div>
{:else}
	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.completions as completion (completion.id)}
			<CompletionCard {completion} />
		{/each}
	</div>
{/if}
