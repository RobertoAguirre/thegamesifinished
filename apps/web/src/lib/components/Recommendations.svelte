<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { rawgImageSrc } from '$lib/rawgImage';

	interface Rec {
		id: number;
		name: string;
		backgroundImage?: string;
		released?: string;
		reason: string;
	}

	interface Props {
		finishedTitle: string;
		recommendations: Rec[];
	}

	let { finishedTitle, recommendations }: Props = $props();

	function reasonLabel(reason: string): string {
		if (reason === 'series') return m.rec_reason_series();
		if (reason === 'genre') return m.rec_reason_genre();
		if (reason === 'platform') return m.rec_reason_platform();
		if (reason === 'community') return m.rec_reason_community();
		return m.rec_reason_similar();
	}
</script>

{#if recommendations.length > 0}
	<section class="mb-6 rounded-2xl border border-border bg-surface p-6">
		<h2 class="mb-1 text-lg font-semibold">{m.rec_section_title()}</h2>
		<p class="mb-5 text-sm text-muted">
			{m.rec_section_lead({ gameTitle: finishedTitle })}
		</p>

		<ul class="grid gap-3 sm:grid-cols-2">
			{#each recommendations as game (game.id)}
				<li>
					<a
						href="https://rawg.io/games/{game.id}"
						target="_blank"
						rel="noopener noreferrer"
						class="flex gap-3 rounded-xl border border-border bg-bg p-3 transition-colors hover:border-accent/40"
					>
						{#if game.backgroundImage}
							<img
								src={rawgImageSrc(game.backgroundImage, { width: 200 })}
								alt=""
								class="h-16 w-16 shrink-0 rounded-lg object-cover"
								loading="lazy"
							/>
						{:else}
							<div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-xl">
								🎮
							</div>
						{/if}
						<div class="min-w-0">
							<p class="truncate font-medium text-white">{game.name}</p>
							<p class="mt-1 text-xs text-muted">{reasonLabel(game.reason)}</p>
							{#if game.released}
								<p class="text-xs text-muted/80">{game.released.slice(0, 4)}</p>
							{/if}
						</div>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}
