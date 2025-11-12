<script lang="ts">
	import type { CalculationResult } from '$lib/types';
	import NDCRecommendation from './NDCRecommendation.svelte';
	import JSONOutput from './JSONOutput.svelte';

	export let result: CalculationResult;
</script>

<div class="space-y-4">
	<div>
		<h2 class="mb-2 text-2xl font-bold">{result.drugName}</h2>
		<p class="text-sm text-gray-600">RxCUI: {result.rxcui}</p>
	</div>

	<div class="grid grid-cols-2 gap-4">
		<div>
			<span class="text-gray-600">Total Quantity Needed:</span>
			<span class="ml-2 font-medium">{result.totalQuantityNeeded} units</span>
		</div>
		<div>
			<span class="text-gray-600">Days Supply:</span>
			<span class="ml-2 font-medium">{result.daysSupply} days</span>
		</div>
	</div>

	{#if result.warnings.length > 0}
		<div class="rounded-md border border-yellow-200 bg-yellow-50 p-4">
			<h3 class="mb-2 font-semibold text-yellow-800">Warnings</h3>
			<ul class="list-inside list-disc text-sm text-yellow-700">
				{#each result.warnings as warning (warning)}
					<li>{warning}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if result.recommendedNDCs.length > 0}
		<div>
			<h3 class="mb-4 text-xl font-semibold">Recommended NDCs</h3>
			<div class="space-y-4">
				{#each result.recommendedNDCs as rec, index (rec.ndc)}
					<NDCRecommendation recommendation={rec} isBest={index === 0} />
				{/each}
			</div>
		</div>
	{:else}
		<div class="rounded-md border border-gray-200 bg-gray-50 p-4">
			<p class="text-gray-700">No suitable NDC recommendations found.</p>
		</div>
	{/if}

	<JSONOutput {result} />
</div>
