<script lang="ts">
	import Spinner from '$lib/components/Spinner.svelte';
	import { enhance } from '$app/forms';
	import { m } from '$lib/paraglide/messages.js';
	import { localizeHref } from '$lib/paraglide/runtime.js';
	import type { ReactionKind } from '@tgif/db';

	export type ReactionCounts = Record<ReactionKind, number>;

	interface Props {
		targetType: 'completion' | 'comment';
		targetId: string;
		counts: ReactionCounts;
		viewerReaction?: ReactionKind | null;
		canReact: boolean;
	}

	const kinds: Array<{ kind: ReactionKind; emoji: string }> = [
		{ kind: 'fire', emoji: '🔥' },
		{ kind: 'heart', emoji: '❤️' },
		{ kind: 'clap', emoji: '👏' },
		{ kind: 'joy', emoji: '😂' }
	];

	let {
		targetType,
		targetId,
		counts = $bindable(),
		viewerReaction = $bindable(null),
		canReact
	}: Props = $props();

	let pending = $state<ReactionKind | null>(null);
</script>

<div class="flex flex-wrap items-center gap-2" role="group" aria-label={m.reactions_label()}>
	{#each kinds as { kind, emoji } (kind)}
		{#if canReact}
			<form
				method="POST"
				action="?/react"
				use:enhance={() => {
					pending = kind;
					return async ({ result, update }) => {
						if (result.type === 'success' && result.data && typeof result.data === 'object') {
							const data = result.data as {
								reactionTargetId?: string;
								reactionCounts?: ReactionCounts;
								viewerReaction?: ReactionKind | null;
							};
							if (data.reactionTargetId === targetId && data.reactionCounts) {
								counts = data.reactionCounts;
								viewerReaction = data.viewerReaction ?? null;
								pending = null;
								return;
							}
						}
						pending = null;
						await update();
					};
				}}
			>
				<input type="hidden" name="targetType" value={targetType} />
				<input type="hidden" name="targetId" value={targetId} />
				<input type="hidden" name="kind" value={kind} />
				<button
					type="submit"
					disabled={pending !== null}
					title={m.reactions_toggle()}
					aria-pressed={viewerReaction === kind}
					class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors
						{viewerReaction === kind
						? 'border-accent/50 bg-accent/15 text-white'
						: 'border-border bg-bg text-muted hover:border-accent/40 hover:text-white'}
						disabled:opacity-60"
				>
					{#if pending === kind}
						<Spinner class="size-3.5" />
					{:else}
						<span aria-hidden="true">{emoji}</span>
					{/if}
					{#if counts[kind] > 0}
						<span class="tabular-nums">{counts[kind]}</span>
					{/if}
				</button>
			</form>
		{:else}
			<a
				href={localizeHref('/sign-in')}
				title={m.reactions_sign_in()}
				class="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg px-2.5 py-1 text-sm text-muted hover:border-accent/40 hover:text-white transition-colors"
			>
				<span aria-hidden="true">{emoji}</span>
				{#if counts[kind] > 0}
					<span class="tabular-nums">{counts[kind]}</span>
				{/if}
			</a>
		{/if}
	{/each}
</div>
