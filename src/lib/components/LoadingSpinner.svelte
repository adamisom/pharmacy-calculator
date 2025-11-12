<script lang="ts">
	export let loading: boolean = false;
	export let size: 'small' | 'large' = 'large';
</script>

{#if loading}
	<div
		class="flex items-center justify-center {size === 'small' ? 'p-0' : 'p-8'}"
		role="status"
		aria-label="Loading"
	>
		<div
			class="animate-spin rounded-full border-b-2 border-current {size === 'small'
				? 'h-4 w-4'
				: 'h-8 w-8'}"
		></div>
		<span class="sr-only">Loading...</span>
	</div>
{/if}
