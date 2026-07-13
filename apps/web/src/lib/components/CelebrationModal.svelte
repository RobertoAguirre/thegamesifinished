<script lang="ts">
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
	}

	let { badges, rankUp = null, xpGained = 0, shareUrl, displayName }: Props = $props();

	let open = $state(true);
	let copied = $state(false);
	let canNativeShare = $state(false);

	$effect(() => {
		canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
	});

	const headline = $derived(
		rankUp
			? `${displayName} ranked up to ${rankUp}!`
			: badges[0]
				? `${displayName} unlocked ${badges[0].name}`
				: 'Progress unlocked'
	);

	async function copyShare() {
		const lines = [
			headline,
			...badges.map((b) => `${b.iconEmoji} ${b.name}: ${b.description}`),
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

{#if open && (badges.length > 0 || rankUp)}
	<div class="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
		<div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
			<p class="mb-2 text-xs font-medium uppercase tracking-widest text-accent">Progress</p>
			<h2 class="mb-4 text-2xl font-bold">{headline}</h2>

			{#if xpGained > 0}
				<p class="mb-4 text-sm text-success">+{xpGained} XP</p>
			{/if}

			{#if badges.length}
				<ul class="mb-6 space-y-3">
					{#each badges as badge (badge.slug)}
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
						Share this unlock
					</button>
				{/if}
				<button
					type="button"
					onclick={copyShare}
					class="rounded-xl border border-border px-4 py-3 text-sm hover:border-accent"
				>
					{copied ? 'Copied!' : 'Copy celebration text'}
				</button>
				<button
					type="button"
					onclick={() => (open = false)}
					class="rounded-xl px-4 py-3 text-sm text-muted hover:text-white"
				>
					Continue to share your win
				</button>
			</div>
		</div>
	</div>
{/if}
