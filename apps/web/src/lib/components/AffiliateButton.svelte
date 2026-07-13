<script lang="ts">
	import { track } from '$lib/analytics/client';
	import { AnalyticsEvents } from '$lib/analytics/events';
	import { resolveAffiliateTarget } from '$lib/config/affiliate';
	import type { StoreLink } from '@tgif/db';

	interface Props {
		gameTitle: string;
		completionId?: string;
		storeLinks?: StoreLink[];
		storeUrl?: string;
		class?: string;
	}

	let {
		gameTitle,
		completionId,
		storeLinks,
		storeUrl,
		class: className = ''
	}: Props = $props();

	const target = $derived(resolveAffiliateTarget(gameTitle, storeLinks, storeUrl));

	function onClick() {
		if (!target) return;
		void track(AnalyticsEvents.affiliateClick, {
			store: target.store,
			game_title: gameTitle,
			completion_id: completionId ?? null,
			href: target.href
		});
	}
</script>

{#if target}
	<a
		href={target.href}
		target="_blank"
		rel="noopener noreferrer sponsored"
		onclick={onClick}
		class="inline-flex items-center text-sm text-muted underline-offset-4 hover:text-accent hover:underline transition-colors {className}"
	>
		{target.label}
	</a>
{/if}
