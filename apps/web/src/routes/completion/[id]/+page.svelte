<script lang="ts">
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import { formatDate, shareText } from '$lib/utils';

	let { data } = $props();

	const shareDescription = $derived(shareText(data.completion.gameTitle, data.completion.displayName));
	const ogImage = $derived(
		data.completion.mediaKey
			? `${data.siteOrigin}/api/media/${data.completion.mediaKey}`
			: data.completion.gameImageUrl
	);
</script>

<svelte:head>
	<title>{data.completion.displayName} finished {data.completion.gameTitle}</title>
	<meta name="description" content={shareDescription} />
	<meta property="og:title" content="{data.completion.displayName} finished {data.completion.gameTitle}" />
	<meta property="og:description" content={shareDescription} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="{data.siteOrigin}/completion/{data.completion.id}" />
	{#if ogImage}
		<meta property="og:image" content={ogImage} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<article class="mx-auto max-w-2xl">
	<div class="mb-6 overflow-hidden rounded-2xl border border-border bg-surface">
		{#if data.completion.mediaKey}
			<div class="bg-black">
				{#if data.completion.mediaType === 'video'}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video
						src="/api/media/{data.completion.mediaKey}"
						controls
						class="max-h-[480px] w-full object-contain"
					></video>
				{:else}
					<img
						src="/api/media/{data.completion.mediaKey}"
						alt="Proof for {data.completion.gameTitle}"
						class="max-h-[480px] w-full object-contain"
					/>
				{/if}
			</div>
		{:else if data.completion.gameImageUrl}
			<img
				src={data.completion.gameImageUrl}
				alt={data.completion.gameTitle}
				class="aspect-video w-full object-cover"
			/>
		{/if}

		<div class="p-6 sm:p-8">
			<p class="mb-2 text-sm font-medium uppercase tracking-widest text-success">Game completed</p>
			<h1 class="mb-2 text-3xl font-bold">{data.completion.gameTitle}</h1>
			<p class="text-muted">
				<a href="/u/{data.completion.username}" class="hover:text-accent transition-colors">
					{data.completion.displayName}
				</a>
				· {formatDate(data.completion.completedAt)}
			</p>

			{#if data.completion.notes}
				<p class="mt-4 text-white/85">{data.completion.notes}</p>
			{/if}
		</div>
	</div>

	<section class="rounded-2xl border border-border bg-surface p-6">
		<h2 class="mb-4 text-lg font-semibold">Share this win</h2>
		<ShareButtons
			gameTitle={data.completion.gameTitle}
			displayName={data.completion.displayName}
			completionPath="/completion/{data.completion.id}"
			origin={data.siteOrigin}
		/>
	</section>
</article>
