<script lang="ts">
	import type { CalculationResult } from '$lib/types';

	export let result: CalculationResult;
	let expanded = false;
</script>

<div class="mt-4">
	<button
		on:click={() => (expanded = !expanded)}
		class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
	>
		<span>{expanded ? '▼' : '▶'}</span>
		<span>JSON Output</span>
	</button>

	{#if expanded}
		<pre class="mt-2 overflow-auto rounded bg-gray-100 p-4 text-xs">{JSON.stringify(
				result,
				null,
				2
			)}</pre>
	{/if}
</div>
