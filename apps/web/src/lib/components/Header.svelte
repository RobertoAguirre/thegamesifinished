<script lang="ts">
	import { Show, SignInButton, SignUpButton, UserButton } from 'svelte-clerk';
	import LocaleSwitcher from '$lib/components/LocaleSwitcher.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { localizeHref } from '$lib/paraglide/runtime.js';

	interface Props {
		unreadNotifications?: number;
	}

	let { unreadNotifications = 0 }: Props = $props();
</script>

<header class="sticky top-0 z-50 border-b border-border/60 bg-bg/80 backdrop-blur-xl">
	<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
		<a href={localizeHref('/')} class="group flex items-center gap-2">
			<span class="text-xl">🎮</span>
			<span class="font-semibold tracking-tight group-hover:text-accent transition-colors">
				{m.brand_name()}
			</span>
		</a>

		<nav class="flex items-center gap-3 text-sm">
			<a
				href={localizeHref('/')}
				class="hidden sm:inline text-muted hover:text-white transition-colors"
			>
				{m.nav_feed()}
			</a>

			<Show when="signed-in">
				<a
					href={localizeHref('/dashboard')}
					class="hidden sm:inline text-muted hover:text-white transition-colors"
				>
					{m.nav_my_profile()}
				</a>
				<a
					href={localizeHref('/notifications')}
					class="relative rounded-full p-2 text-muted hover:text-white transition-colors"
					aria-label={m.nav_notifications()}
				>
					<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke-linecap="round" stroke-linejoin="round" />
						<path d="M13.73 21a2 2 0 0 1-3.46 0" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					{#if unreadNotifications > 0}
						<span
							class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white"
						>
							{unreadNotifications > 9 ? '9+' : unreadNotifications}
						</span>
					{/if}
				</a>
				<a
					href={localizeHref('/add')}
					class="rounded-full bg-accent px-4 py-2 font-medium text-white hover:bg-accent-hover transition-colors"
				>
					{m.nav_log_a_win()}
				</a>
				<UserButton afterSignOutUrl={localizeHref('/')} />
			</Show>

			<Show when="signed-out">
				<LocaleSwitcher />
				<SignInButton mode="modal">
					<button class="text-muted hover:text-white transition-colors">{m.nav_sign_in()}</button>
				</SignInButton>
				<SignUpButton mode="modal">
					<button
						class="rounded-full border border-border px-4 py-2 font-medium hover:border-accent hover:text-accent transition-colors"
					>
						{m.nav_join_free()}
					</button>
				</SignUpButton>
			</Show>

			<Show when="signed-in">
				<LocaleSwitcher />
			</Show>
		</nav>
	</div>
</header>
