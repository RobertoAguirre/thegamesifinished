<script lang="ts">
	import GameSearch from '$lib/components/GameSearch.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { GAME_PLATFORMS } from '$lib/config/platforms';
	import { m } from '$lib/paraglide/messages.js';
	import { enhance } from '$app/forms';

	let { form, data } = $props();

	let gameTitle = $state('');
	let rawgId = $state<number | null>(null);
	let gameImageUrl = $state<string | null>(null);
	let isFighting = $state(false);
	let character = $state('');
	let submitting = $state(false);
	let difficulty = $state('3');

	const today = new Date().toISOString().split('T')[0];
	const canSubmit = $derived(
		Boolean(gameTitle.trim()) && (!isFighting || Boolean(character.trim()))
	);
</script>

<section class="mx-auto max-w-xl">
	<h1 class="mb-2 text-3xl font-bold">{m.add_title()}</h1>
	<p class="mb-8 text-muted">{m.add_subtitle()}</p>

	{#if form?.error}
		<div class="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
			{form.error}
		</div>
	{/if}

	<form
		method="POST"
		enctype="multipart/form-data"
		aria-busy={submitting}
		use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				await update();
				if (result.type !== 'redirect') submitting = false;
			};
		}}
		class="relative space-y-6"
	>
		<div class="space-y-6 {submitting ? 'pointer-events-none opacity-70' : ''}">
		<GameSearch
			bind:value={gameTitle}
			bind:rawgId
			bind:gameImageUrl
			bind:isFighting
			rawgEnabled={data.rawgEnabled}
		/>

		<input type="hidden" name="rawgId" value={rawgId ?? ''} />
		<input type="hidden" name="gameImageUrl" value={gameImageUrl ?? ''} />
		<input type="hidden" name="isFighting" value={isFighting ? '1' : ''} />

		{#if !rawgId}
			<label class="flex cursor-pointer items-center gap-2 text-sm text-muted">
				<input
					type="checkbox"
					checked={isFighting}
					onchange={(e) => {
						isFighting = e.currentTarget.checked;
						if (!isFighting) character = '';
					}}
					class="size-4 accent-accent"
				/>
				<span>{m.add_fighting_toggle()}</span>
			</label>
		{/if}

		{#if isFighting}
			<div>
				<label for="character" class="mb-2 block text-sm font-medium">{m.add_character()}</label>
				<input
					id="character"
					name="character"
					type="text"
					required
					bind:value={character}
					placeholder={m.add_character_placeholder()}
					maxlength="60"
					class="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
				/>
				<p class="mt-2 text-xs text-muted">{m.add_character_hint()}</p>
			</div>
		{/if}

		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label for="completedAt" class="mb-2 block text-sm font-medium">{m.add_date_finished()}</label>
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
				<label for="startedAt" class="mb-2 block text-sm font-medium">{m.add_date_started()}</label>
				<input
					id="startedAt"
					name="startedAt"
					type="date"
					max={today}
					class="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
				/>
			</div>
		</div>

		<div>
			<p class="mb-1 text-sm font-medium">{m.add_platforms()}</p>
			<p class="mb-3 text-xs text-muted">{m.add_platforms_hint()}</p>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each GAME_PLATFORMS as platform}
					<label
						class="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm hover:border-accent/40"
					>
						<input type="checkbox" name="platforms" value={platform} class="size-4 accent-accent" />
						<span>{platform}</span>
					</label>
				{/each}
			</div>
		</div>

		<div>
			<label for="hoursPlayed" class="mb-2 block text-sm font-medium">{m.add_hours()}</label>
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

		<div>
			<label for="difficultyRating" class="mb-2 block text-sm font-medium">{m.add_difficulty()}</label>
			<select
				id="difficultyRating"
				name="difficultyRating"
				bind:value={difficulty}
				class="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
			>
				<option value="1">{m.difficulty_1()}</option>
				<option value="2">{m.difficulty_2()}</option>
				<option value="3">{m.difficulty_3()}</option>
				<option value="4">{m.difficulty_4()}</option>
				<option value="5">{m.difficulty_5()}</option>
			</select>
		</div>

		<div>
			<label for="media" class="mb-2 block text-sm font-medium">{m.add_media()}</label>
			<input
				id="media"
				name="media"
				type="file"
				accept="image/*,video/mp4,video/webm,video/quicktime"
				class="w-full rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-white"
			/>
			<p class="mt-2 text-xs text-muted">{m.add_media_hint()}</p>
		</div>

		<div>
			<label for="notes" class="mb-2 block text-sm font-medium">{m.add_notes()}</label>
			<textarea
				id="notes"
				name="notes"
				rows="3"
				placeholder={m.add_notes_placeholder()}
				class="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
			></textarea>
		</div>
		</div>

		<button
			type="submit"
			disabled={submitting || !canSubmit}
			class="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors"
		>
			{#if submitting}
				<Spinner />
			{/if}
			{submitting ? m.add_saving() : m.add_save()}
		</button>
	</form>
</section>
