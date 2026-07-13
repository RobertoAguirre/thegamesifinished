<script lang="ts">
	import { Show, SignInButton, SignUpButton, UserButton } from 'svelte-clerk';
</script>

<header class="sticky top-0 z-50 border-b border-border/60 bg-bg/80 backdrop-blur-xl">
	<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
		<a href="/" class="group flex items-center gap-2">
			<span class="text-xl">🎮</span>
			<span class="font-semibold tracking-tight group-hover:text-accent transition-colors">
				The Games I Finished
			</span>
		</a>

		<nav class="flex items-center gap-3 text-sm">
			<a href="/" class="hidden sm:inline text-muted hover:text-white transition-colors">Feed</a>

			<Show when="signed-in">
				<a href="/dashboard" class="hidden sm:inline text-muted hover:text-white transition-colors">
					My profile
				</a>
				<a
					href="/add"
					class="rounded-full bg-accent px-4 py-2 font-medium text-white hover:bg-accent-hover transition-colors"
				>
					Log a win
				</a>
				<UserButton afterSignOutUrl="/" />
			</Show>

			<Show when="signed-out">
				<SignInButton mode="modal">
					<button class="text-muted hover:text-white transition-colors">Sign in</button>
				</SignInButton>
				<SignUpButton mode="modal">
					<button
						class="rounded-full border border-border px-4 py-2 font-medium hover:border-accent hover:text-accent transition-colors"
					>
						Join free
					</button>
				</SignUpButton>
			</Show>
		</nav>
	</div>
</header>
