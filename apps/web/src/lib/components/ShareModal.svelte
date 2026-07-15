<script lang="ts">
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		gameTitle: string;
		displayName: string;
		completionPath: string;
		origin: string;
		completionId?: string;
		imageUrl?: string | null;
		onclose: () => void;
	}

	let {
		gameTitle,
		displayName,
		completionPath,
		origin,
		completionId,
		imageUrl = null,
		onclose
	}: Props = $props();
</script>

<div class="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
	<div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl">
		<p class="mb-2 text-3xl">🏆</p>
		<h2 class="mb-1 text-2xl font-bold">{m.share_modal_title()}</h2>
		<p class="mb-5 text-sm text-muted">{m.share_modal_subtitle()}</p>

		<ShareButtons
			{gameTitle}
			{displayName}
			{completionPath}
			{origin}
			{completionId}
			{imageUrl}
		/>

		<button
			type="button"
			onclick={onclose}
			class="mt-3 w-full rounded-xl px-4 py-3 text-sm text-muted hover:text-white transition-colors"
		>
			{m.share_modal_close()}
		</button>
	</div>
</div>
