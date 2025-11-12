<script lang="ts">
	import { onMount } from 'svelte';
	import type { PrescriptionInput } from '$lib/types';
	import LoadingSpinner from './LoadingSpinner.svelte';

	export let onSubmit: (input: PrescriptionInput) => Promise<void>;
	export let loading: boolean = false;

	export let drugNameOrNDC: string = '';
	export let sig: string = '';
	export let daysSupply: number | '' = '';
	export let totalQuantity: number | '' = '';
	export let manualDosesPerDay: number | '' = '';

	let errors: string[] = [];
	let loadingMessage = 'Calculating...';
	let loadingTimeout: ReturnType<typeof setTimeout> | null = null;

	function updateLoadingMessage(isLoading: boolean) {
		if (isLoading) {
			loadingMessage = 'Calculating...';
			if (loadingTimeout) clearTimeout(loadingTimeout);
			loadingTimeout = setTimeout(() => {
				loadingMessage = 'Calculating... just a few more seconds please...';
			}, 2500);
		} else {
			if (loadingTimeout) {
				clearTimeout(loadingTimeout);
				loadingTimeout = null;
			}
		}
	}

	$: updateLoadingMessage(loading);

	onMount(() => {
		return () => {
			if (loadingTimeout) clearTimeout(loadingTimeout);
		};
	});

	async function handleSubmit() {
		errors = [];

		// Validation
		if (!drugNameOrNDC.trim()) {
			errors.push('Drug name or NDC is required');
		}
		if (!sig.trim()) {
			errors.push('Prescription instructions are required');
		}
		if (daysSupply === '' && totalQuantity === '') {
			errors.push('Either days supply or total quantity must be provided');
		}

		if (errors.length > 0) return;

		const input: PrescriptionInput = {
			drugNameOrNDC: drugNameOrNDC.trim(),
			sig: sig.trim(),
			daysSupply: daysSupply === '' ? null : Number(daysSupply),
			totalQuantity: totalQuantity === '' ? undefined : Number(totalQuantity),
			manualDosesPerDay: manualDosesPerDay === '' ? undefined : Number(manualDosesPerDay)
		};

		await onSubmit(input);
	}
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4">
	<div>
		<label for="drug" class="mb-1 block text-sm font-medium text-gray-700">
			Drug Name or NDC *
		</label>
		<input
			id="drug"
			type="text"
			bind:value={drugNameOrNDC}
			disabled={loading}
			class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
			placeholder="e.g., Aspirin or 12345-678-90"
		/>
	</div>

	<div>
		<label for="sig" class="mb-1 block text-sm font-medium text-gray-700">
			Prescription Instructions (SIG) *
		</label>
		<textarea
			id="sig"
			bind:value={sig}
			disabled={loading}
			rows="3"
			class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
			placeholder="e.g., 1 tablet twice daily"
		></textarea>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<div>
			<label for="daysSupply" class="mb-1 block text-sm font-medium text-gray-700">
				Days Supply
			</label>
			<input
				id="daysSupply"
				type="number"
				bind:value={daysSupply}
				disabled={loading}
				min="1"
				max="365"
				class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				placeholder="e.g., 30"
			/>
		</div>

		<div>
			<label for="totalQuantity" class="mb-1 block text-sm font-medium text-gray-700">
				Total Quantity (for reverse calculation)
			</label>
			<input
				id="totalQuantity"
				type="number"
				bind:value={totalQuantity}
				disabled={loading}
				min="1"
				class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				placeholder="e.g., 60"
			/>
		</div>
	</div>

	<div>
		<label for="manualDoses" class="mb-1 block text-sm font-medium text-gray-700">
			Manual Override: Doses Per Day (optional)
		</label>
		<input
			id="manualDoses"
			type="number"
			bind:value={manualDosesPerDay}
			disabled={loading}
			min="1"
			class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
			placeholder="Use if SIG parsing fails"
		/>
		<p class="mt-1 text-sm text-gray-500">
			Use this if the system cannot parse your prescription instructions
		</p>
	</div>

	{#if errors.length > 0}
		<div class="rounded-md border border-red-200 bg-red-50 p-3">
			<ul class="list-inside list-disc text-sm text-red-800">
				{#each errors as error (error)}
					<li>{error}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<button
		type="submit"
		disabled={loading}
		class="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-base font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-blue-600"
	>
		{#if loading}
			<LoadingSpinner loading={true} size="small" />
			<span>{loadingMessage}</span>
		{:else}
			Calculate
		{/if}
	</button>
</form>
