<script lang="ts">
	import { localizeBadge, localizeRankName } from '$lib/i18n/labels';
	import { m } from '$lib/paraglide/messages.js';

	interface BadgeInfo {
		slug: string;
		name: string;
		description: string;
		iconEmoji: string;
	}

	interface Props {
		badges: BadgeInfo[];
		rankUp?: string | null;
		xpGained?: number;
		shareUrl: string;
		displayName: string;
		/** Se llama al cerrar — permite encadenar el modal de compartir. */
		onclose?: () => void;
	}

	let { badges, rankUp = null, xpGained = 0, shareUrl, displayName, onclose }: Props = $props();

	let open = $state(true);
	let copied = $state(false);
	let canNativeShare = $state(false);

	$effect(() => {
		canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
	});

	const localizedBadges = $derived(badges.map(localizeBadge));
	const localizedRank = $derived(
		rankUp ? localizeRankName(rankUp.toLowerCase(), rankUp) : null
	);

	const headline = $derived(
		localizedRank
			? m.celebration_rank_up({ displayName, rank: localizedRank })
			: localizedBadges[0]
				? m.celebration_unlocked({ displayName, badge: localizedBadges[0].name })
				: m.celebration_fallback()
	);

	async function copyShare() {
		const lines = [
			headline,
			...localizedBadges.map((b) => `${b.iconEmoji} ${b.name}: ${b.description}`),
			shareUrl
		];
		await navigator.clipboard.writeText(lines.join('\n'));
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function nativeShare() {
		try {
			await navigator.share({ title: headline, text: headline, url: shareUrl });
		} catch {
			// cancelled
		}
	}
</script>

{#if open && (localizedBadges.length > 0 || localizedRank)}
	<div class="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
		<div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
			<p class="mb-2 text-xs font-medium uppercase tracking-widest text-accent">{m.celebration_progress()}</p>
			<h2 class="mb-4 text-2xl font-bold">{headline}</h2>

			{#if xpGained > 0}
				<p class="mb-4 text-sm text-success">{m.xp_gained({ xp: xpGained })}</p>
			{/if}

			{#if localizedBadges.length}
				<ul class="mb-6 space-y-3">
					{#each localizedBadges as badge (badge.slug)}
						<li class="rounded-xl border border-border/80 bg-bg px-4 py-3">
							<p class="font-semibold">{badge.iconEmoji} {badge.name}</p>
							<p class="text-sm text-muted">{badge.description}</p>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="flex flex-col gap-2">
				{#if canNativeShare}
					<button
						type="button"
						onclick={nativeShare}
						class="rounded-xl bg-accent px-4 py-3 text-sm font-semibold hover:bg-accent-hover"
					>
						{m.celebration_share_unlock()}
					</button>
				{/if}
				<button
					type="button"
					onclick={copyShare}
					class="rounded-xl border border-border px-4 py-3 text-sm hover:border-accent"
				>
					{copied ? m.share_copied() : m.celebration_copy()}
				</button>
				<button
					type="button"
					onclick={() => {
						open = false;
						onclose?.();
					}}
					class="rounded-xl px-4 py-3 text-sm text-muted hover:text-white"
				>
					{m.celebration_continue()}
				</button>
			</div>
		</div>
	</div>
{/if}
