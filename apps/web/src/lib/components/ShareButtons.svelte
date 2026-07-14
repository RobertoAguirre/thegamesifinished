<script lang="ts">
	import ShareBrandIcon from '$lib/components/ShareBrandIcon.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { track } from '$lib/analytics/client';
	import { AnalyticsEvents } from '$lib/analytics/events';
	import { m } from '$lib/paraglide/messages.js';
	import { absoluteUrl, shareText } from '$lib/utils';

	interface Props {
		gameTitle: string;
		displayName: string;
		completionPath: string;
		origin: string;
		completionId?: string;
		/** Imagen de la victoria (OG / media / portada) solo para Instagram/TikTok. */
		imageUrl?: string | null;
	}

	let {
		gameTitle,
		displayName,
		completionPath,
		origin,
		completionId,
		imageUrl = null
	}: Props = $props();

	const url = $derived(absoluteUrl(completionPath, origin));
	const text = $derived(shareText(gameTitle, displayName));
	const caption = $derived(`${text}\n\n${url}`);
	const encodedUrl = $derived(encodeURIComponent(url));
	const encodedText = $derived(encodeURIComponent(text));
	const encodedCaption = $derived(encodeURIComponent(caption));

	let status = $state('');
	/** Solo bloquea Instagram/TikTok/compartir rápido; Facebook, X y WhatsApp no. */
	let visualBusy = $state(false);
	let canNativeShare = $state(false);
	let canShareFiles = $state(false);
	let cachedFile = $state<File | null>(null);

	$effect(() => {
		canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
		canShareFiles = false;
		if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return;
		try {
			const probe = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'probe.jpg', {
				type: 'image/jpeg'
			});
			canShareFiles = navigator.canShare({ files: [probe] });
		} catch {
			canShareFiles = false;
		}
	});

	// Precarga la imagen para que Instagram/TikTok respondan al primer toque.
	$effect(() => {
		cachedFile = null;
		if (!imageUrl) return;
		let cancelled = false;
		void (async () => {
			try {
				const file = await fetchShareFile(imageUrl);
				if (!cancelled) cachedFile = file;
			} catch {
				// ignore preload errors
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	function trackShare(channel: string) {
		void track(AnalyticsEvents.shareClick, {
			channel,
			game_title: gameTitle,
			completion_id: completionId ?? null
		});
	}

	function flash(message: string) {
		status = message;
		setTimeout(() => {
			if (status === message) status = '';
		}, 4500);
	}

	async function fetchShareFile(src: string): Promise<File | null> {
		const response = await fetch(src);
		if (!response.ok) return null;
		const blob = await response.blob();
		const type = blob.type.startsWith('image/')
			? blob.type
			: blob.type.startsWith('video/')
				? blob.type
				: 'image/jpeg';
		const ext = type.includes('png')
			? 'png'
			: type.includes('webp')
				? 'webp'
				: type.includes('mp4')
					? 'mp4'
					: type.includes('webm')
						? 'webm'
						: 'jpg';
		return new File([blob], `victoria-${completionId ?? 'share'}.${ext}`, { type });
	}

	async function getShareFile(): Promise<File | null> {
		if (cachedFile) return cachedFile;
		if (!imageUrl) return null;
		const file = await fetchShareFile(imageUrl);
		cachedFile = file;
		return file;
	}

	function downloadFile(file: File) {
		const objectUrl = URL.createObjectURL(file);
		const a = document.createElement('a');
		a.href = objectUrl;
		a.download = file.name;
		a.rel = 'noopener';
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(objectUrl);
	}

	/**
	 * Solo Instagram / TikTok.
	 * Móvil: compartir archivo (Feed/Historia). Escritorio: descarga + pie de foto copiado.
	 */
	async function shareToVisualApp(channel: 'instagram' | 'tiktok') {
		if (visualBusy) return;
		visualBusy = true;
		trackShare(channel);
		try {
			await navigator.clipboard.writeText(caption);
			const file = await getShareFile();

			if (file && canShareFiles) {
				try {
					await navigator.share({
						files: [file],
						title: text,
						text: caption
					});
					flash(m.share_ready_visual());
					return;
				} catch (error) {
					if (error instanceof DOMException && error.name === 'AbortError') return;
				}
			}

			if (file) {
				downloadFile(file);
				flash(
					channel === 'instagram' ? m.share_instagram_ready() : m.share_tiktok_ready()
				);
				return;
			}

			flash(m.share_caption_only());
		} catch {
			flash(m.share_failed());
		} finally {
			visualBusy = false;
		}
	}

	/**
	 * Un toque en el celular: abre el menú del sistema con imagen + texto + enlace.
	 * Desde ahí la gente elige WhatsApp (chats o Estados), Instagram, TikTok, etc.
	 */
	async function quickShare() {
		if (visualBusy) return;
		visualBusy = true;
		trackShare('native');
		try {
			const file = await getShareFile();
			if (file && canShareFiles) {
				try {
					await navigator.share({ files: [file], title: text, text: caption });
					return;
				} catch (error) {
					if (error instanceof DOMException && error.name === 'AbortError') return;
				}
			}
			await navigator.share({ title: text, text, url });
		} catch {
			// cancelado o no soportado — los botones por red siguen disponibles
		} finally {
			visualBusy = false;
		}
	}

	async function copyLink() {
		trackShare('copy_link');
		await navigator.clipboard.writeText(url);
		flash(m.share_copied());
	}
</script>

<div class="space-y-4">
	<p class="text-sm text-muted">{m.share_intro()}</p>

	{#if canNativeShare}
		<!-- Camino más rápido en celular: un toque y eliges la app (incluye Estados de WhatsApp). -->
		<button
			type="button"
			onclick={quickShare}
			disabled={visualBusy}
			class="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60 transition-opacity"
		>
			{#if visualBusy}
				<Spinner class="text-black" />
			{:else}
				<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" stroke-linecap="round" />
					<path d="M12 15V3m0 0L8 7m4-4 4 4" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			{/if}
			{m.share_quick()}
		</button>
	{/if}

	<div class="grid gap-2 sm:grid-cols-2">
		<!-- WhatsApp: enlace oficial, funciona en celular y WhatsApp Web. -->
		<a
			href="https://wa.me/?text={encodedCaption}"
			target="_blank"
			rel="noopener noreferrer"
			onclick={() => trackShare('whatsapp')}
			class="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-[#25D366] hover:text-[#25D366] transition-colors"
		>
			<ShareBrandIcon name="whatsapp" class="size-4 text-[#25D366]" />
			WhatsApp
		</a>

		<!-- Facebook: sin cambios de comportamiento (sharer oficial). -->
		<a
			href="https://www.facebook.com/sharer/sharer.php?u={encodedUrl}"
			target="_blank"
			rel="noopener noreferrer"
			onclick={() => trackShare('facebook')}
			class="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-[#1877F2] hover:text-[#1877F2] transition-colors"
		>
			<ShareBrandIcon name="facebook" class="size-4 text-[#1877F2]" />
			Facebook
		</a>

		<!-- X / Twitter: sin cambios de comportamiento (intent oficial). -->
		<a
			href="https://twitter.com/intent/tweet?url={encodedUrl}&text={encodedText}"
			target="_blank"
			rel="noopener noreferrer"
			onclick={() => trackShare('x')}
			class="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-white hover:text-white transition-colors"
		>
			<ShareBrandIcon name="x" class="size-4" />
			X / Twitter
		</a>

		<button
			type="button"
			onclick={() => shareToVisualApp('instagram')}
			disabled={visualBusy}
			class="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-[#E4405F] hover:text-[#E4405F] disabled:opacity-60 transition-colors"
		>
			{#if visualBusy}
				<Spinner class="text-[#E4405F]" />
			{:else}
				<ShareBrandIcon name="instagram" class="size-4 text-[#E4405F]" />
			{/if}
			{m.share_instagram()}
		</button>

		<button
			type="button"
			onclick={() => shareToVisualApp('tiktok')}
			disabled={visualBusy}
			class="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-[#69C9D0] hover:text-[#69C9D0] disabled:opacity-60 transition-colors"
		>
			{#if visualBusy}
				<Spinner class="text-[#69C9D0]" />
			{:else}
				<ShareBrandIcon name="tiktok" class="size-4" />
			{/if}
			{m.share_tiktok()}
		</button>
	</div>

	<button
		type="button"
		onclick={copyLink}
		class="w-full rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted hover:border-accent hover:text-accent transition-colors"
	>
		{m.share_copy_link()}
	</button>

	{#if status}
		<p
			class="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-white/90"
			aria-live="polite"
		>
			{status}
		</p>
	{/if}

	<p class="text-xs text-muted">{m.share_hint()}</p>
</div>
