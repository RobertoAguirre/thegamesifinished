<script lang="ts">
	import { track } from '$lib/analytics/client';
	import { AnalyticsEvents } from '$lib/analytics/events';
	import { m } from '$lib/paraglide/messages.js';
	import { absoluteUrl, shareText } from '$lib/utils';

	interface Props {
		gameTitle: string;
		displayName: string;
		completionPath: string;
		origin: string;
		completionId?: string;
	}

	let { gameTitle, displayName, completionPath, origin, completionId }: Props = $props();

	const url = $derived(absoluteUrl(completionPath, origin));
	const text = $derived(shareText(gameTitle, displayName));
	const encodedUrl = $derived(encodeURIComponent(url));
	const encodedText = $derived(encodeURIComponent(text));

	let copied = $state(false);
	let canNativeShare = $state(false);

	$effect(() => {
		canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
	});

	function trackShare(channel: string) {
		void track(AnalyticsEvents.shareClick, {
			channel,
			game_title: gameTitle,
			completion_id: completionId ?? null
		});
	}

	async function copyLink() {
		trackShare('copy_link');
		await navigator.clipboard.writeText(url);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function copyCaption(channel: string) {
		trackShare(channel);
		await navigator.clipboard.writeText(`${text}\n\n${url}`);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function nativeShare() {
		trackShare('native');
		try {
			await navigator.share({ title: text, text, url });
		} catch {
			// user cancelled — ignore
		}
	}
</script>

<div class="space-y-4">
	<p class="text-sm text-muted">{m.share_intro()}</p>

	{#if canNativeShare}
		<button
			type="button"
			onclick={nativeShare}
			class="w-full rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold hover:bg-accent-hover transition-colors"
		>
			{m.share_button()}
		</button>
	{/if}

	<div class="grid gap-2 sm:grid-cols-2">
		<a
			href="https://www.facebook.com/sharer/sharer.php?u={encodedUrl}"
			target="_blank"
			rel="noopener noreferrer"
			onclick={() => trackShare('facebook')}
			class="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-[#1877f2] hover:text-[#1877f2] transition-colors"
		>
			Facebook
		</a>

		<a
			href="https://twitter.com/intent/tweet?url={encodedUrl}&text={encodedText}"
			target="_blank"
			rel="noopener noreferrer"
			onclick={() => trackShare('x')}
			class="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-white hover:text-white transition-colors"
		>
			X / Twitter
		</a>

		<button
			type="button"
			onclick={() => copyCaption('instagram')}
			class="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-[#e1306c] hover:text-[#e1306c] transition-colors"
		>
			{m.share_copy_instagram()}
		</button>

		<button
			type="button"
			onclick={() => copyCaption('tiktok')}
			class="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-[#69c9d0] hover:text-[#69c9d0] transition-colors"
		>
			{m.share_copy_tiktok()}
		</button>
	</div>

	<button
		type="button"
		onclick={copyLink}
		class="w-full rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted hover:border-accent hover:text-accent transition-colors"
	>
		{copied ? m.share_copied() : m.share_copy_link()}
	</button>

	<p class="text-xs text-muted">{m.share_hint()}</p>
</div>
