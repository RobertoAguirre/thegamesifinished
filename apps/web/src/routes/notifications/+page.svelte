<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { localizeHref } from '$lib/paraglide/runtime.js';

	let { data } = $props();

	function timeAgo(iso: string): string {
		const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
		if (seconds < 60) return m.time_just_now();
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return m.time_minutes_ago({ n: minutes });
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return m.time_hours_ago({ n: hours });
		const days = Math.floor(hours / 24);
		return m.time_days_ago({ n: days });
	}
</script>

<svelte:head>
	<title>{m.notifications_title()} — {m.brand_name()}</title>
</svelte:head>

<section class="mx-auto max-w-2xl">
	<h1 class="text-2xl font-bold tracking-tight">{m.notifications_title()}</h1>

	{#if data.notifications.length === 0}
		<p class="mt-6 rounded-2xl border border-border bg-surface px-5 py-8 text-center text-muted">
			{m.notifications_empty()}
		</p>
	{:else}
		<ul class="mt-6 space-y-2">
			{#each data.notifications as n (n.id)}
				<li>
					<a
						href={localizeHref(`/completion/${n.completionId}`)}
						class="block rounded-2xl border px-5 py-4 transition-colors hover:border-accent {n.read
							? 'border-border bg-surface'
							: 'border-accent/40 bg-accent/5'}"
					>
						<p class="text-sm">
							{#if n.type === 'comment'}
								{m.notification_comment({ actorName: n.actorName, gameTitle: n.gameTitle })}
							{:else}
								{m.notification_reaction({
									actorName: n.actorName,
									gameTitle: n.gameTitle,
									emoji: n.preview ?? '🔥'
								})}
							{/if}
						</p>
						{#if n.type === 'comment' && n.preview}
							<p class="mt-1 text-sm text-muted">“{n.preview}”</p>
						{/if}
						<p class="mt-2 text-xs text-muted">{timeAgo(n.createdAt)}</p>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
