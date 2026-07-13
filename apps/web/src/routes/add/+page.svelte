<script lang="ts">
	import GameSearch from '$lib/components/GameSearch.svelte';
	import { enhance } from '$app/forms';

	let { form, data } = $props();

	let gameTitle = $state('');
	let rawgId = $state<number | null>(null);
	let gameImageUrl = $state<string | null>(null);
	let submitting = $state(false);
	let difficulty = $state('3');

	const today = new Date().toISOString().split('T')[0];
</script>

<section class="mx-auto max-w-xl">
	<h1 class="mb-2 text-3xl font-bold">Log a completed game</h1>
	<p class="mb-8 text-muted">Add proof, pick the date you finished, and share your win.</p>

	{#if form?.error}
		<div class="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
			{form.error}
		</div>
	{/if}

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
		class="space-y-6"
	>
		<GameSearch bind:value={gameTitle} bind:rawgId bind:gameImageUrl rawgEnabled={data.rawgEnabled} />

		<input type="hidden" name="rawgId" value={rawgId ?? ''} />
		<input type="hidden" name="gameImageUrl" value={gameImageUrl ?? ''} />

		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label for="completedAt" class="mb-2 block text-sm font-medium">Date finished</label>
				<input
					id="completedAt"
					name="completedAt"
					type="date"
					max={today}
					value={today}
					required
					class="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
				/>
			</div>
			<div>
				<label for="startedAt" class="mb-2 block text-sm font-medium">Date started (optional)</label>
				<input
					id="startedAt"
					name="startedAt"
					type="date"
					max={today}
					class="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
				/>
			</div>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label for="platform" class="mb-2 block text-sm font-medium">Platform (optional)</label>
				<input
					id="platform"
					name="platform"
					type="text"
					placeholder="PC, Switch, Steam Deck..."
					class="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
				/>
			</div>
			<div>
				<label for="hoursPlayed" class="mb-2 block text-sm font-medium">Hours played (optional)</label>
				<input
					id="hoursPlayed"
					name="hoursPlayed"
					type="number"
					min="0"
					step="0.5"
					placeholder="12"
					class="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
				/>
			</div>
		</div>

		<div>
			<label for="difficultyRating" class="mb-2 block text-sm font-medium"
				>How hard was it? (1 easy → 5 extreme)</label
			>
			<select
				id="difficultyRating"
				name="difficultyRating"
				bind:value={difficulty}
				class="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
			>
				<option value="1">1 — Easy</option>
				<option value="2">2 — Mild</option>
				<option value="3">3 — Medium</option>
				<option value="4">4 — Hard</option>
				<option value="5">5 — Extreme</option>
			</select>
		</div>

		<div>
			<label for="media" class="mb-2 block text-sm font-medium">
				Proof (screenshot or short clip)
			</label>
			<input
				id="media"
				name="media"
				type="file"
				accept="image/*,video/mp4,video/webm,video/quicktime"
				class="w-full rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-white"
			/>
			<p class="mt-2 text-xs text-muted">Images up to 10MB · Videos up to 25MB</p>
		</div>

		<div>
			<label for="notes" class="mb-2 block text-sm font-medium">Notes (optional)</label>
			<textarea
				id="notes"
				name="notes"
				rows="3"
				placeholder="How was the ending? Any highlights?"
				class="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
			></textarea>
		</div>

		<button
			type="submit"
			disabled={submitting || !gameTitle.trim()}
			class="w-full rounded-xl bg-accent py-3.5 font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors"
		>
			{submitting ? 'Saving...' : 'Save & share'}
		</button>
	</form>
</section>
