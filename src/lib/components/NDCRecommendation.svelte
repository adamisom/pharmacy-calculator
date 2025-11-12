<script lang="ts">
	import type { NDCRecommendation } from '$lib/types';
	import { CALCULATION_THRESHOLDS } from '$lib/config';
	import WarningBadge from './WarningBadge.svelte';

	export let recommendation: NDCRecommendation;
	export let isBest: boolean = false;
</script>

<div class="rounded-lg border p-4 {isBest ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}">
	<div class="mb-2 flex items-start justify-between">
		<div>
			<h3 class="text-lg font-semibold">NDC: {recommendation.ndc}</h3>
			{#if isBest}
				<span class="text-xs font-medium text-blue-600">Recommended</span>
			{/if}
		</div>
		<div class="flex gap-2">
			{#if !recommendation.packageDetails.isActive}
				<WarningBadge type="inactive" message="This NDC is inactive" />
			{/if}
			{#if recommendation.overfill > CALCULATION_THRESHOLDS.OVERFILL_WARNING}
				<WarningBadge type="overfill" message={`${recommendation.overfill.toFixed(1)}%`} />
			{/if}
		</div>
	</div>

	<div class="mt-4 grid grid-cols-2 gap-4 text-sm">
		<div>
			<span class="text-gray-600">Packages Needed:</span>
			<span class="ml-2 font-medium">{recommendation.packagesNeeded}</span>
		</div>
		<div>
			<span class="text-gray-600">Total Units:</span>
			<span class="ml-2 font-medium">{recommendation.totalUnits}</span>
		</div>
		<div>
			<span class="text-gray-600">Package Size:</span>
			<span class="ml-2 font-medium"
				>{recommendation.packageDetails.packageSize}
				{recommendation.packageDetails.packageType}</span
			>
		</div>
		<div>
			<span class="text-gray-600">Manufacturer:</span>
			<span class="ml-2 font-medium">{recommendation.packageDetails.manufacturer}</span>
		</div>
	</div>
</div>
