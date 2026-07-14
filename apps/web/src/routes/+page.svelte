<script lang="ts">
	import AdSlot from '$lib/components/AdSlot.svelte';
	import CompletionCard from '$lib/components/CompletionCard.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { localizeHref } from '$lib/paraglide/runtime.js';
	import { Show, SignUpButton } from 'svelte-clerk';

	let { data } = $props();

	const FEED_AD_EVERY = 6;
</script>

<section class="mb-16 text-center">
	<div class="mx-auto max-w-2xl">
		<p class="mb-4 text-sm font-medium uppercase tracking-widest text-accent">{m.home_eyebrow()}</p>
		<h1 class="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
			{m.home_headline_line1()}<br />
			<span class="text-accent">{m.home_headline_accent()}</span>
		</h1>
		<p class="mb-8 text-lg text-muted">
			{m.home_subhead()}
		</p>
		<Show when="signed-out">
			<SignUpButton mode="modal">
				<button class="rounded-full bg-accent px-8 py-3.5 text-base font-semibold hover:bg-accent-hover transition-colors">
					{m.home_cta()}
				</button>
			</SignUpButton>
		</Show>
		<Show when="signed-in">
			<a
				href={localizeHref('/add')}
				class="inline-block rounded-full bg-accent px-8 py-3.5 text-base font-semibold hover:bg-accent-hover transition-colors"
			>
				{m.nav_log_a_win()}
			</a>
		</Show>
	</div>
</section>

<section>
	<div class="mb-8 flex items-end justify-between">
		<div>
			<h2 class="text-2xl font-semibold">{m.home_recent_wins()}</h2>
			<p class="text-sm text-muted">{m.home_recent_wins_sub()}</p>
		</div>
	</div>

	{#if data.completions.length === 0}
		<div class="rounded-2xl border border-dashed border-border p-12 text-center">
			<p class="text-muted">{m.home_empty()}</p>
		</div>
	{:else}
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.completions as completion, i (completion.id)}
				<CompletionCard {completion} />
				{#if (i + 1) % FEED_AD_EVERY === 0}
					<div class="col-span-full">
						<AdSlot position="feed-inline" />
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</section>
