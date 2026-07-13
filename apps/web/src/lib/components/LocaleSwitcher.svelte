<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale, locales, localizeHref } from '$lib/paraglide/runtime.js';

	const localeLabels: Record<string, () => string> = {
		es: () => m.locale_name_es(),
		en: () => m.locale_name_en()
	};

	const shortLabels: Record<string, string> = {
		es: 'ES',
		en: 'EN'
	};
</script>

<nav
	class="flex items-center rounded-full border border-border/70 p-0.5 text-xs font-medium"
	aria-label={m.language_switcher_label()}
>
	{#each locales as locale}
		<a
			href={localizeHref(page.url.pathname, { locale })}
			data-sveltekit-reload
			hreflang={locale}
			title={localeLabels[locale]?.() ?? locale}
			class="rounded-full px-2.5 py-1 transition-colors {getLocale() === locale
				? 'bg-accent text-white'
				: 'text-muted hover:text-white'}"
			aria-current={getLocale() === locale ? 'page' : undefined}
		>
			{shortLabels[locale] ?? locale.toUpperCase()}
		</a>
	{/each}
</nav>
