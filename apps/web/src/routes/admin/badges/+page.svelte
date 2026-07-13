<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let ruleType = $state('count');
</script>

<section class="mx-auto max-w-3xl">
	<div class="mb-8 flex items-center justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold">Badge admin</h1>
			<p class="text-muted">Create patches without redeploying.</p>
		</div>
		<a href="/dashboard" class="text-sm text-muted hover:text-accent">← Dashboard</a>
	</div>

	{#if form?.error}
		<p class="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
			{form.error}
		</p>
	{/if}
	{#if form?.success}
		<p class="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
			Saved.
		</p>
	{/if}

	<form method="POST" action="?/create" use:enhance class="mb-12 space-y-4 rounded-2xl border border-border bg-surface p-6">
		<div class="grid gap-4 sm:grid-cols-2">
			<input name="slug" required placeholder="slug-iron-will" class="rounded-xl border border-border bg-bg px-4 py-3" />
			<input name="name" required placeholder="Display name" class="rounded-xl border border-border bg-bg px-4 py-3" />
		</div>
		<input name="description" required placeholder="Description" class="w-full rounded-xl border border-border bg-bg px-4 py-3" />
		<div class="grid gap-4 sm:grid-cols-2">
			<input name="iconEmoji" placeholder="🏅" class="rounded-xl border border-border bg-bg px-4 py-3" />
			<input name="category" placeholder="category" value="custom" class="rounded-xl border border-border bg-bg px-4 py-3" />
		</div>

		<label for="ruleType" class="block text-sm font-medium">Rule type</label>
		<select id="ruleType" name="ruleType" bind:value={ruleType} class="w-full rounded-xl border border-border bg-bg px-4 py-3">
			<option value="count">count</option>
			<option value="distinct">distinct</option>
			<option value="streak">streak (months)</option>
			<option value="speedFinish">speedFinish</option>
		</select>

		{#if ruleType === 'count'}
			<div class="grid gap-4 sm:grid-cols-2">
				<input name="threshold" type="number" min="1" value="1" required class="rounded-xl border border-border bg-bg px-4 py-3" />
				<select name="difficultyTier" class="rounded-xl border border-border bg-bg px-4 py-3">
					<option value="">Any difficulty</option>
					<option value="easy">easy</option>
					<option value="medium">medium</option>
					<option value="hard">hard</option>
					<option value="extreme">extreme</option>
				</select>
			</div>
		{:else if ruleType === 'distinct'}
			<div class="grid gap-4 sm:grid-cols-2">
				<select name="field" class="rounded-xl border border-border bg-bg px-4 py-3">
					<option value="platform">platform</option>
					<option value="gameTitle">gameTitle</option>
				</select>
				<input name="threshold" type="number" min="1" value="3" required class="rounded-xl border border-border bg-bg px-4 py-3" />
			</div>
		{:else if ruleType === 'streak'}
			<input name="threshold" type="number" min="1" value="3" required class="w-full rounded-xl border border-border bg-bg px-4 py-3" />
		{:else}
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" name="sameDay" /> Same day start/finish
			</label>
			<input name="maxHours" type="number" min="1" placeholder="Max hours (optional)" class="w-full rounded-xl border border-border bg-bg px-4 py-3" />
		{/if}

		<button type="submit" class="rounded-xl bg-accent px-5 py-3 font-medium hover:bg-accent-hover">Create badge</button>
	</form>

	<ul class="space-y-3">
		{#each data.badges as badge (badge.id)}
			<li class="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-4">
				<div>
					<p class="font-semibold">{badge.iconEmoji} {badge.name} <span class="text-xs text-muted">({badge.slug})</span></p>
					<p class="text-sm text-muted">{badge.description}</p>
					<pre class="mt-2 overflow-x-auto text-xs text-white/60">{JSON.stringify(badge.rule)}</pre>
				</div>
				<form method="POST" action="?/toggle" use:enhance>
					<input type="hidden" name="id" value={badge.id} />
					<input type="hidden" name="isActive" value={String(badge.isActive)} />
					<button type="submit" class="text-sm text-muted hover:text-accent">
						{badge.isActive ? 'Disable' : 'Enable'}
					</button>
				</form>
			</li>
		{/each}
	</ul>
</section>
