<script lang="ts">
	interface GameResult {
		id: number;
		name: string;
		background_image?: string;
	}

	interface Props {
		name?: string;
		value?: string;
		rawgId?: number | null;
		gameImageUrl?: string | null;
		onselect?: (game: { title: string; rawgId?: number; gameImageUrl?: string }) => void;
	}

	let {
		name = 'gameTitle',
		value = $bindable(''),
		rawgId = $bindable(null),
		gameImageUrl = $bindable(null),
		onselect
	}: Props = $props();

	let query = $state('');
	let results = $state<GameResult[]>([]);
	let loading = $state(false);
	let manualMode = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;

	async function searchGames(q: string) {
		if (q.length < 2) {
			results = [];
			return;
		}

		loading = true;
		try {
			const response = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`);
			const data = (await response.json()) as { results: GameResult[] };
			results = data.results ?? [];
		} catch {
			results = [];
		} finally {
			loading = false;
		}
	}

	function onInput(event: Event) {
		const target = event.target as HTMLInputElement;
		query = target.value;
		value = target.value;
		rawgId = null;
		gameImageUrl = null;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => searchGames(query), 300);
	}

	function selectGame(game: GameResult) {
		value = game.name;
		rawgId = game.id;
		gameImageUrl = game.background_image ?? null;
		query = game.name;
		results = [];
		onselect?.({ title: game.name, rawgId: game.id, gameImageUrl: game.background_image });
	}

	function useManual() {
		manualMode = true;
		results = [];
	}
</script>

<div class="space-y-2">
	<label for="game-search" class="block text-sm font-medium">Game title</label>

	<div class="relative">
		<input
			id="game-search"
			{name}
			type="text"
			required
			placeholder="Search for a game..."
			value={query || value}
			oninput={onInput}
			class="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
		/>

		{#if loading}
			<span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">Searching...</span>
		{/if}

		{#if results.length > 0}
			<ul
				class="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-surface shadow-xl"
			>
				{#each results as game (game.id)}
					<li>
						<button
							type="button"
							onclick={() => selectGame(game)}
							class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover"
						>
							{#if game.background_image}
								<img src={game.background_image} alt="" class="h-10 w-10 rounded-lg object-cover" />
							{/if}
							<span>{game.name}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if !manualMode}
		<button type="button" onclick={useManual} class="text-xs text-muted hover:text-accent">
			Can't find your game? Enter it manually
		</button>
	{/if}
</div>
