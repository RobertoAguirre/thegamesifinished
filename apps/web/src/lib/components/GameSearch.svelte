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
		rawgEnabled?: boolean;
		onselect?: (game: { title: string; rawgId?: number; gameImageUrl?: string }) => void;
	}

	let {
		name = 'gameTitle',
		value = $bindable(''),
		rawgId = $bindable(null),
		gameImageUrl = $bindable(null),
		rawgEnabled = true,
		onselect
	}: Props = $props();

	let query = $state('');
	let results = $state<GameResult[]>([]);
	let loading = $state(false);
	let manualMode = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;
	let abortController: AbortController | null = null;

	const searchMode = $derived(rawgEnabled && !manualMode);

	$effect(() => {
		if (!rawgEnabled) manualMode = true;
	});

	async function searchGames(q: string) {
		if (!rawgEnabled || q.length < 2) {
			results = [];
			return;
		}

		abortController?.abort();
		abortController = new AbortController();
		const { signal } = abortController;

		loading = true;
		try {
			const response = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`, { signal });
			const data = (await response.json()) as { results: GameResult[]; enabled?: boolean };
			if (signal.aborted) return;
			results = data.results ?? [];
			if (data.enabled === false) manualMode = true;
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') return;
			results = [];
		} finally {
			if (!signal.aborted) loading = false;
		}
	}

	function onInput(event: Event) {
		const target = event.target as HTMLInputElement;
		query = target.value;

		if (searchMode) {
			// Keep form title empty until a result is picked (or manual mode).
			value = '';
			rawgId = null;
			gameImageUrl = null;
		} else {
			value = target.value;
			rawgId = null;
			gameImageUrl = null;
		}

		if (!rawgEnabled) return;

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => searchGames(query), 450);
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
		value = query;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;
		// Never let Enter submit the parent form from this field.
		event.preventDefault();
		if (searchMode && results.length > 0) {
			selectGame(results[0]);
		}
	}
</script>

<div class="space-y-2">
	<label for="game-search" class="block text-sm font-medium">Game title</label>

	{#if !rawgEnabled}
		<p class="text-xs text-muted">
			Game search is off — enter the title manually. Add <code class="text-accent">RAWG_API_KEY</code> to enable autocomplete.
		</p>
	{/if}

	<div class="relative">
		{#if searchMode}
			<input type="hidden" {name} value={value} />
		{/if}
		<input
			id="game-search"
			name={searchMode ? undefined : name}
			type="text"
			required={!searchMode}
			placeholder={rawgEnabled ? 'Search for a game...' : 'Enter game title...'}
			value={query || value}
			oninput={onInput}
			onkeydown={onKeydown}
			autocomplete="off"
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

	{#if searchMode && query.trim() && !value}
		<p class="text-xs text-muted">Pick a game from the list (Enter selects the first result).</p>
	{/if}

	{#if rawgEnabled && !manualMode}
		<button type="button" onclick={useManual} class="text-xs text-muted hover:text-accent">
			Can't find your game? Enter it manually
		</button>
	{/if}
</div>
