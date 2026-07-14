<script lang="ts">
	import AdSlot from '$lib/components/AdSlot.svelte';
	import AffiliateButton from '$lib/components/AffiliateButton.svelte';
	import CelebrationModal from '$lib/components/CelebrationModal.svelte';
	import Recommendations from '$lib/components/Recommendations.svelte';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import { track, trackCompletionPageview } from '$lib/analytics/client';
	import { AnalyticsEvents } from '$lib/analytics/events';
	import { GAME_PLATFORMS } from '$lib/config/platforms';
	import { m } from '$lib/paraglide/messages.js';
	import { rawgImageSrc } from '$lib/rawgImage';
	import { formatDate, shareText } from '$lib/utils';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';

	let { data, form } = $props();

	const shareDescription = $derived(
		shareText(data.completion.gameTitle, data.completion.displayName)
	);

	const ogTitle = $derived(
		m.og_finished_title({
			displayName: data.completion.displayName,
			gameTitle: data.completion.gameTitle
		})
	);

	const ogJustFinished = $derived(
		m.og_just_finished_title({
			displayName: data.completion.displayName,
			gameTitle: data.completion.gameTitle
		})
	);

	const availablePlatforms = $derived(
		GAME_PLATFORMS.filter((p) => !(data.completion.platforms ?? []).includes(p))
	);

	function timeAgo(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const minutes = Math.floor(diff / 60_000);
		if (minutes < 1) return m.time_just_now();
		if (minutes < 60) return m.time_minutes_ago({ n: minutes });
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return m.time_hours_ago({ n: hours });
		const days = Math.floor(hours / 24);
		if (days < 30) return m.time_days_ago({ n: days });
		return formatDate(iso);
	}

	let submitting = $state(false);
	let addingPlatforms = $state(false);

	onMount(() => {
		void trackCompletionPageview({
			completionId: data.completion.id,
			gameTitle: data.completion.gameTitle,
			username: data.completion.username
		});
	});
</script>

{#if data.celebration && (data.celebration.badges.length > 0 || data.celebration.rankUp)}
	<CelebrationModal
		badges={data.celebration.badges}
		rankUp={data.celebration.rankUp}
		xpGained={data.celebration.xpGained}
		shareUrl={data.canonicalUrl}
		displayName={data.completion.displayName}
	/>
{/if}

<svelte:head>
	<title>{ogTitle}</title>
	<meta name="description" content={shareDescription} />
	<meta property="og:title" content={ogJustFinished} />
	<meta property="og:description" content={shareDescription} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={data.canonicalUrl} />
	{#if data.ogImage}
		<meta property="og:image" content={data.ogImage} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={ogJustFinished} />
	<meta name="twitter:description" content={shareDescription} />
	{#if data.ogImage}
		<meta name="twitter:image" content={data.ogImage} />
	{/if}
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
						alt={data.completion.gameTitle}
						class="max-h-[480px] w-full object-contain"
					/>
				{/if}
			</div>
		{:else if data.completion.gameImageUrl}
			<img
				src={rawgImageSrc(data.completion.gameImageUrl) ?? data.completion.gameImageUrl}
				alt={data.completion.gameTitle}
				class="aspect-video w-full object-cover"
			/>
		{/if}

		<div class="p-6 sm:p-8">
			<p class="mb-2 text-sm font-medium uppercase tracking-widest text-success">{m.completion_label()}</p>
			<h1 class="mb-2 text-3xl font-bold">{data.completion.gameTitle}</h1>
			<p class="text-muted">
				<a href="/u/{data.completion.username}" class="hover:text-accent transition-colors">
					{data.completion.displayName}
				</a>
				· {formatDate(data.completion.completedAt)}
			</p>

			{#if data.completion.platforms?.length}
				<p class="mt-3 text-sm text-muted">
					{m.completion_finished_on({ platforms: data.completion.platforms.join(', ') })}
				</p>
			{/if}

			{#if data.completion.character}
				<p class="mt-2 text-sm text-muted">
					{m.completion_character({ character: data.completion.character })}
				</p>
			{/if}

			{#if data.completion.notes}
				<p class="mt-4 text-white/85">{data.completion.notes}</p>
			{/if}

			<div class="mt-4">
				<AffiliateButton
					gameTitle={data.completion.gameTitle}
					completionId={data.completion.id}
					storeLinks={data.completion.storeLinks}
					storeUrl={data.completion.storeUrl}
				/>
			</div>
		</div>
	</div>

	<Recommendations
		finishedTitle={data.completion.gameTitle}
		recommendations={data.recommendations}
	/>

	{#if data.isOwner && availablePlatforms.length > 0}
		<section class="mb-6 rounded-2xl border border-border bg-surface p-6">
			<h2 class="mb-1 text-lg font-semibold">{m.completion_add_platform_title()}</h2>
			<p class="mb-4 text-sm text-muted">{m.completion_add_platform_hint()}</p>

			{#if form?.platformError}
				<p class="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
					{form.platformError}
				</p>
			{/if}

			<form
				method="POST"
				action="?/addPlatforms"
				use:enhance={() => {
					addingPlatforms = true;
					return async ({ update }) => {
						addingPlatforms = false;
						await update();
					};
				}}
				class="space-y-4"
			>
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{#each availablePlatforms as platform}
						<label
							class="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm hover:border-accent/40"
						>
							<input type="checkbox" name="platforms" value={platform} class="size-4 accent-accent" />
							<span>{platform}</span>
						</label>
					{/each}
				</div>
				<button
					type="submit"
					disabled={addingPlatforms}
					class="rounded-full bg-accent px-5 py-2.5 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
				>
					{addingPlatforms ? m.completion_adding_platforms() : m.completion_add_platforms_btn()}
				</button>
			</form>
		</section>
	{/if}

	<section class="mb-6 rounded-2xl border border-border bg-surface p-6">
		<h2 class="mb-4 text-lg font-semibold">{m.completion_share_title()}</h2>
		<ShareButtons
			gameTitle={data.completion.gameTitle}
			displayName={data.completion.displayName}
			completionPath="/completion/{data.completion.id}"
			origin={data.siteOrigin}
			completionId={data.completion.id}
		/>
	</section>

	<section class="rounded-2xl border border-border bg-surface p-6">
		<h2 class="mb-4 text-lg font-semibold">{m.completion_comments()}</h2>

		{#if form?.commentError}
			<p class="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
				{form.commentError}
			</p>
		{/if}

		<form
			method="POST"
			action="?/comment"
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					submitting = false;
					if (result.type === 'success') {
						void track(AnalyticsEvents.commentPosted, {
							completion_id: data.completion.id,
							game_title: data.completion.gameTitle
						});
					}
					await update({ reset: true });
				};
			}}
			class="mb-8 space-y-3"
		>
			{#if data.sessionName}
				<p class="text-sm text-muted">
					{m.completion_commenting_as()} <span class="text-white">{data.sessionName}</span>
				</p>
			{:else}
				<input
					name="authorName"
					type="text"
					required
					maxlength="40"
					placeholder={m.completion_author_placeholder()}
					value={form?.authorName ?? ''}
					class="w-full rounded-xl border border-border bg-bg px-4 py-3 outline-none focus:border-accent"
				/>
			{/if}

			<textarea
				name="body"
				required
				maxlength="280"
				rows="3"
				placeholder={m.completion_comment_placeholder()}
				class="w-full rounded-xl border border-border bg-bg px-4 py-3 outline-none focus:border-accent"
			>{form?.body ?? ''}</textarea>

			<button
				type="submit"
				disabled={submitting}
				class="rounded-full bg-accent px-5 py-2.5 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
			>
				{submitting ? m.completion_posting() : m.completion_post_comment()}
			</button>
		</form>

		{#if data.comments.length === 0}
			<p class="text-sm text-muted">{m.completion_no_comments()}</p>
		{:else}
			<ul class="space-y-4">
				{#each data.comments as comment (comment.id)}
					<li class="border-t border-border/60 pt-4 first:border-0 first:pt-0">
						<div class="mb-1 flex items-baseline justify-between gap-3">
							<span class="font-medium">{comment.authorName}</span>
							<span class="text-xs text-muted">{timeAgo(comment.createdAt)}</span>
						</div>
						<p class="text-sm text-white/85 whitespace-pre-wrap">{comment.body}</p>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<div class="mt-6">
		<AdSlot position="completion-below-comments" />
	</div>
</article>
