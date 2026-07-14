<script lang="ts">
	import AffiliateButton from '$lib/components/AffiliateButton.svelte';
	import { enhance } from '$app/forms';
	import { m } from '$lib/paraglide/messages.js';
	import { rawgImageSrc } from '$lib/rawgImage';
	import { formatDate } from '$lib/utils';
	import type { StoreLink } from '@tgif/db';

	interface Props {
		completion: {
			id: string;
			username: string;
			displayName: string;
			gameTitle: string;
			gameImageUrl?: string;
			storeUrl?: string;
			storeLinks?: StoreLink[];
			platforms?: string[];
			character?: string;
			completedAt: string;
			notes?: string;
			mediaKey?: string;
			mediaType?: 'image' | 'video';
		};
		canDelete?: boolean;
	}

	let { completion, canDelete = false }: Props = $props();
	let deleting = $state(false);
</script>

<article
	class="group overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:border-accent/40 hover:bg-surface-hover"
>
	<a href="/completion/{completion.id}" class="block">
		{#if completion.mediaKey}
			<div class="aspect-video overflow-hidden bg-black/40">
				{#if completion.mediaType === 'video'}
					<video
						src="/api/media/{completion.mediaKey}"
						class="h-full w-full object-cover"
						muted
						preload="metadata"
					></video>
				{:else}
					<img
						src="/api/media/{completion.mediaKey}"
						alt={completion.gameTitle}
						class="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
					/>
				{/if}
			</div>
		{:else if completion.gameImageUrl}
			<div class="aspect-video overflow-hidden bg-black/40">
				<img
					src={rawgImageSrc(completion.gameImageUrl) ?? completion.gameImageUrl}
					alt={completion.gameTitle}
					class="h-full w-full object-cover"
					loading="lazy"
				/>
			</div>
		{/if}

		<div class="p-5">
			<div class="mb-2 flex items-start justify-between gap-3">
				<h3 class="text-lg font-semibold leading-snug">{completion.gameTitle}</h3>
				<span class="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
					{m.done_badge()}
				</span>
			</div>

			<p class="text-sm text-muted">
				<span class="hover:text-accent">{completion.displayName}</span>
				· {m.finished_on_date({ date: formatDate(completion.completedAt) })}
			</p>

			{#if completion.platforms?.length}
				<p class="mt-2 text-xs text-muted">{completion.platforms.join(' · ')}</p>
			{/if}

			{#if completion.character}
				<p class="mt-1 text-xs text-muted">{m.card_character({ character: completion.character })}</p>
			{/if}

			{#if completion.notes}
				<p class="mt-3 line-clamp-2 text-sm text-white/80">{completion.notes}</p>
			{/if}
		</div>
	</a>

	<div class="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pb-5 text-xs text-muted">
		<a href="/u/{completion.username}" class="hover:text-accent transition-colors">
			{m.view_profile({ username: completion.username })}
		</a>
		<AffiliateButton
			gameTitle={completion.gameTitle}
			completionId={completion.id}
			storeLinks={completion.storeLinks}
			storeUrl={completion.storeUrl}
		/>
		{#if canDelete}
			<form
				method="POST"
				action="?/delete"
				class="ml-auto"
				use:enhance={({ cancel }) => {
					const ok = confirm(m.delete_confirm({ gameTitle: completion.gameTitle }));
					if (!ok) {
						cancel();
						return;
					}
					deleting = true;
					return async ({ update }) => {
						deleting = false;
						await update();
					};
				}}
			>
				<input type="hidden" name="id" value={completion.id} />
				<button
					type="submit"
					disabled={deleting}
					class="text-red-400/80 hover:text-red-300 disabled:opacity-50 transition-colors"
				>
					{deleting ? m.deleting() : m.delete()}
				</button>
			</form>
		{/if}
	</div>
</article>
