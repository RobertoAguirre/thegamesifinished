<script lang="ts">
	import { AD_SLOT_CONFIG, FEATURE_FLAGS } from '$lib/config/flags';

	interface Props {
		/** Slot id — must match AD_SLOT_CONFIG keys */
		position: string;
		/**
		 * When ads are off: false = render nothing (no layout shift),
		 * true = invisible reserved height for future activation.
		 */
		reserveHeight?: boolean;
	}

	let { position, reserveHeight = false }: Props = $props();

	const slotAllowed = $derived(AD_SLOT_CONFIG[position] !== false);
	const active = $derived(FEATURE_FLAGS.adsEnabled && slotAllowed);

	/**
	 * Future provider mount point — keep markup stable.
	 * When adsEnabled flips on, inject AdSense/Ezoic here by `position`.
	 */
</script>

{#if active}
	<!-- Provider integration goes here later -->
	<div
		class="ad-slot ad-slot--active"
		data-ad-position={position}
		aria-hidden="true"
	></div>
{:else if reserveHeight && slotAllowed}
	<div
		class="ad-slot ad-slot--reserved"
		data-ad-position={position}
		aria-hidden="true"
		style="display: none; height: 0; overflow: hidden;"
	></div>
{/if}
