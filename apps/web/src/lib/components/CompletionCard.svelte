<script lang="ts">
	import { formatDate } from '$lib/utils';

	interface Props {
		completion: {
			id: string;
			username: string;
			displayName: string;
			gameTitle: string;
			gameImageUrl?: string;
			completedAt: string;
			notes?: string;
			mediaKey?: string;
			mediaType?: 'image' | 'video';
		};
	}

	let { completion }: Props = $props();
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
						alt="Proof for {completion.gameTitle}"
						class="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
					/>
				{/if}
			</div>
		{:else if completion.gameImageUrl}
			<div class="aspect-video overflow-hidden bg-black/40">
				<img
					src={completion.gameImageUrl}
					alt={completion.gameTitle}
					class="h-full w-full object-cover"
				/>
			</div>
		{/if}

		<div class="p-5">
			<div class="mb-2 flex items-start justify-between gap-3">
				<h3 class="text-lg font-semibold leading-snug">{completion.gameTitle}</h3>
				<span class="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
					Done
				</span>
			</div>

			<p class="text-sm text-muted">
				<span class="hover:text-accent">{completion.displayName}</span>
				· finished {formatDate(completion.completedAt)}
			</p>

			{#if completion.notes}
				<p class="mt-3 line-clamp-2 text-sm text-white/80">{completion.notes}</p>
			{/if}
		</div>
	</a>

	<p class="px-5 pb-5 text-xs text-muted">
		<a href="/u/{completion.username}" class="hover:text-accent transition-colors">
			View @{completion.username}'s profile
		</a>
	</p>
</article>
