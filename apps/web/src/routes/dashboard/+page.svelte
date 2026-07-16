<script lang="ts">
	import CompletionCard from '$lib/components/CompletionCard.svelte';
	import { enhance } from '$app/forms';
	import { localizeBadge, localizeRankName } from '$lib/i18n/labels';
	import { m } from '$lib/paraglide/messages.js';

	let { data, form } = $props();

	const rankName = $derived(localizeRankName(data.rank.slug, data.rank.name));
	const badges = $derived(data.badges.map((badge) => (badge ? localizeBadge(badge) : badge)));

	let editingName = $state(false);
	let savingName = $state(false);
</script>

<section class="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
	<div class="flex items-center gap-4">
		{#if data.user.avatarUrl}
			<img src={data.user.avatarUrl} alt="" class="h-16 w-16 rounded-full border border-border" />
		{:else}
			<div class="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-2xl">🎮</div>
		{/if}
		<div>
			{#if editingName}
				<form
					method="POST"
					action="?/updateName"
					class="space-y-2"
					use:enhance={() => {
						savingName = true;
						return async ({ result, update }) => {
							savingName = false;
							if (result.type === 'success') editingName = false;
							await update();
						};
					}}
				>
					<label class="block text-xs text-muted" for="displayName">{m.edit_name_label()}</label>
					<div class="flex flex-wrap items-center gap-2">
						<input
							id="displayName"
							name="displayName"
							type="text"
							required
							minlength="2"
							maxlength="40"
							value={data.user.displayName}
							class="rounded-xl border border-border bg-bg px-3 py-2 text-lg font-semibold outline-none focus:border-accent"
						/>
						<button
							type="submit"
							disabled={savingName}
							class="rounded-full bg-accent px-4 py-2 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
						>
							{savingName ? m.edit_name_saving() : m.edit_name_save()}
						</button>
						<button
							type="button"
							onclick={() => (editingName = false)}
							class="text-sm text-muted hover:text-white transition-colors"
						>
							{m.edit_name_cancel()}
						</button>
					</div>
					<p class="text-xs text-muted">{m.edit_name_hint()}</p>
					{#if form?.nameError}
						<p class="text-xs text-red-400">{form.nameError}</p>
					{/if}
				</form>
			{:else}
				<h1 class="flex items-center gap-2 text-2xl font-bold">
					{data.user.displayName}
					<button
						type="button"
						onclick={() => (editingName = true)}
						class="text-xs font-normal text-muted hover:text-accent transition-colors"
					>
						{m.edit_name()}
					</button>
				</h1>
				{#if form?.nameSuccess}
					<p class="text-xs text-success">{m.edit_name_saved()}</p>
				{/if}
			{/if}
			<p class="text-muted">@{data.user.username}</p>
			<p class="mt-1 text-sm text-accent">
				{m.rank_xp_line({ rank: rankName, xp: data.user.totalXp })}
			</p>
		</div>
	</div>

	<div class="flex items-center gap-4">
		<div class="rounded-2xl border border-border bg-surface px-6 py-4 text-center">
			<p class="text-3xl font-bold text-accent">{data.totalGames}</p>
			<p class="text-sm text-muted">{m.dashboard_games_finished()}</p>
		</div>
		<a
			href="/add"
			class="rounded-full bg-accent px-6 py-3 font-medium hover:bg-accent-hover transition-colors"
		>
			{m.dashboard_log_another()}
		</a>
	</div>
</section>

{#if badges.length > 0}
	<section class="mb-10">
		<h2 class="mb-4 text-xl font-semibold">{m.dashboard_patches()}</h2>
		<div class="flex flex-wrap gap-3">
			{#each badges as badge}
				{#if badge}
					<div class="rounded-xl border border-border bg-surface px-4 py-3">
						<p class="font-medium">{badge.iconEmoji} {badge.name}</p>
						<p class="text-xs text-muted">{badge.description}</p>
					</div>
				{/if}
			{/each}
		</div>
	</section>
{/if}

<section>
	<h2 class="mb-6 text-xl font-semibold">{m.dashboard_your_completions()}</h2>

	{#if data.completions.length === 0}
		<div class="rounded-2xl border border-dashed border-border p-12 text-center">
			<p class="mb-4 text-muted">{m.dashboard_empty()}</p>
			<a href="/add" class="text-accent hover:underline">{m.dashboard_empty_cta()}</a>
		</div>
	{:else}
		<div class="grid gap-6 sm:grid-cols-2">
			{#each data.completions as completion (completion.id)}
				<CompletionCard {completion} canDelete />
			{/each}
		</div>
	{/if}
</section>

<p class="mt-8 text-center text-sm text-muted">
	<a href="/u/{data.user.username}" class="hover:text-accent">{m.dashboard_view_public()}</a>
	{#if data.isAdmin}
		· <a href="/admin/badges" class="hover:text-accent">{m.dashboard_admin_badges()}</a>
	{/if}
</p>
