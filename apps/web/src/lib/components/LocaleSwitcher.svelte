<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale, locales, setLocale } from '$lib/paraglide/runtime.js';
	import type { Locale } from '$lib/paraglide/runtime.js';

	const localeLabels: Record<string, () => string> = {
		es: () => m.locale_name_es(),
		en: () => m.locale_name_en()
	};

	const shortLabels: Record<string, string> = {
		es: 'ES',
		en: 'EN'
	};

	function switchLocale(locale: Locale) {
		if (locale === getLocale()) return;
		// Persists cookie + navigates to localized URL (required with preferredLanguage).
		setLocale(locale);
	}
</script>

<nav
	class="flex items-center rounded-full border border-border/70 p-0.5 text-xs font-medium"
	aria-label={m.language_switcher_label()}
>
	{#each locales as locale}
		<button
			type="button"
			onclick={() => switchLocale(locale)}
			title={localeLabels[locale]?.() ?? locale}
			class="rounded-full px-2.5 py-1 transition-colors {getLocale() === locale
				? 'bg-accent text-white'
				: 'text-muted hover:text-white'}"
			aria-pressed={getLocale() === locale}
		>
			{shortLabels[locale] ?? locale.toUpperCase()}
		</button>
	{/each}
</nav>
