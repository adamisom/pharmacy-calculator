<script lang="ts">
	export let loading: boolean = false;
</script>

{#if loading}
	<div class="flex items-center justify-center p-8" role="status" aria-label="Loading">
		<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
		<span class="sr-only">Loading...</span>
	</div>
{/if}
