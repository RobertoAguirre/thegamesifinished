<script lang="ts">
	interface Props {
		class?: string;
		size?: 'sm' | 'md';
	}

	let { class: className = '', size = 'sm' }: Props = $props();

	const dim = $derived(size === 'md' ? 'size-5 border-[2.5px]' : 'size-4 border-2');
</script>

<span
	class="inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent {dim} {className}"
	aria-hidden="true"
></span>
