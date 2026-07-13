<script lang="ts">
	import { absoluteUrl, shareText } from '$lib/utils';

	interface Props {
		gameTitle: string;
		displayName: string;
		completionPath: string;
		origin: string;
	}

	let { gameTitle, displayName, completionPath, origin }: Props = $props();

	const url = $derived(absoluteUrl(completionPath, origin));
	const text = $derived(shareText(gameTitle, displayName));
	const encodedUrl = $derived(encodeURIComponent(url));
	const encodedText = $derived(encodeURIComponent(text));

	let copied = $state(false);

	async function copyLink() {
		await navigator.clipboard.writeText(url);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function copyCaption() {
		await navigator.clipboard.writeText(text + '\n\n' + url);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="space-y-4">
	<p class="text-sm text-muted">Share your win and invite friends to show off theirs.</p>

	<div class="grid gap-2 sm:grid-cols-2">
		<a
			href="https://www.facebook.com/sharer/sharer.php?u={encodedUrl}"
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-[#1877f2] hover:text-[#1877f2] transition-colors"
		>
			Facebook
		</a>

		<a
			href="https://twitter.com/intent/tweet?url={encodedUrl}&text={encodedText}"
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-white hover:text-white transition-colors"
		>
			X / Twitter
		</a>

		<button
			type="button"
			onclick={copyCaption}
			class="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-[#e1306c] hover:text-[#e1306c] transition-colors"
		>
			Copy for Instagram
		</button>

		<button
			type="button"
			onclick={copyCaption}
			class="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-[#69c9d0] hover:text-[#69c9d0] transition-colors"
		>
			Copy for TikTok
		</button>
	</div>

	<button
		type="button"
		onclick={copyLink}
		class="w-full rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted hover:border-accent hover:text-accent transition-colors"
	>
		{copied ? 'Copied!' : 'Copy link'}
	</button>

	<p class="text-xs text-muted">
		Instagram and TikTok don't support direct web sharing — copy the caption and paste it in your story or post.
	</p>
</div>
