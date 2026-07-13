<script lang="ts">
	import { Show, SignInButton, SignUpButton, UserButton } from 'svelte-clerk';
	import LocaleSwitcher from '$lib/components/LocaleSwitcher.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { localizeHref } from '$lib/paraglide/runtime.js';
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
