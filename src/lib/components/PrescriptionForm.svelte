<script lang="ts">
	import { onMount } from 'svelte';
	import type { PrescriptionInput } from '$lib/types';
	import LoadingSpinner from './LoadingSpinner.svelte';
	import { TEST_SIGS, TEST_DAYS_SUPPLY, TEST_QUANTITIES } from '$lib/utils/test-data';

	export let onSubmit: (input: PrescriptionInput) => Promise<void>;
	export let loading: boolean = false;

	export let drugNameOrNDC: string = '';
	export let sig: string = '';
	export let daysSupply: number | '' = '';
	export let totalQuantity: number | '' = '';
	export let manualDosesPerDay: number | '' = '';

	const DRUG_STORAGE_KEY = 'ndc-calculator-drug-history';
	let drugHistory: string[] = [];

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

	function loadDrugHistory() {
		if (typeof window === 'undefined') return;
		try {
			const stored = localStorage.getItem(DRUG_STORAGE_KEY);
			if (stored) {
				drugHistory = JSON.parse(stored);
			}
		} catch {
			// Ignore storage errors
		}
	}

	function saveDrugToHistory(drug: string) {
		if (typeof window === 'undefined' || !drug.trim()) return;
		try {
			const trimmed = drug.trim();
			// Remove if already exists, then add to front
			drugHistory = [trimmed, ...drugHistory.filter((d) => d !== trimmed)].slice(0, 20); // Keep last 20
			localStorage.setItem(DRUG_STORAGE_KEY, JSON.stringify(drugHistory));
		} catch {
			// Ignore storage errors
		}
	}

	onMount(() => {
		loadDrugHistory();
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

		// Check if daysSupply has a value (not empty, not 0, not null, not NaN)
		const hasDaysSupply =
			daysSupply !== '' &&
			daysSupply !== null &&
			daysSupply !== undefined &&
			daysSupply !== 0 &&
			!isNaN(Number(daysSupply));
		// Check if totalQuantity has a value (not empty, not 0, not null, not NaN)
		const hasTotalQuantity =
			totalQuantity !== '' &&
			totalQuantity !== null &&
			totalQuantity !== undefined &&
			totalQuantity !== 0 &&
			!isNaN(Number(totalQuantity));

		if (!hasDaysSupply && !hasTotalQuantity) {
			errors.push('Either days supply or total quantity must be provided');
		}
		if (hasDaysSupply && hasTotalQuantity) {
			errors.push('Please provide either days supply OR total quantity, not both');
		}

		if (errors.length > 0) return;

		// Save drug to history
		saveDrugToHistory(drugNameOrNDC);

		const input: PrescriptionInput = {
			drugNameOrNDC: drugNameOrNDC.trim(),
			sig: sig.trim(),
			// Treat empty string or 0 as null for daysSupply (allows reverse calculation)
			daysSupply: daysSupply === '' || daysSupply === 0 ? null : Number(daysSupply),
			totalQuantity: totalQuantity === '' ? undefined : Number(totalQuantity),
			manualDosesPerDay:
				manualDosesPerDay === '' || manualDosesPerDay === 0 ? undefined : Number(manualDosesPerDay)
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
			list="drug-list"
			class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
			placeholder="e.g., Aspirin or 12345-678-90"
		/>
		<datalist id="drug-list">
			{#each drugHistory as drug (drug)}
				<option value={drug}></option>
			{/each}
		</datalist>
	</div>

	<div>
		<div class="mb-1 flex items-center gap-2">
			<label for="sig" class="block text-sm font-medium text-gray-700">
				Prescription Instructions (SIG) *
			</label>
			<select
				on:change={(e) => {
					if (e.currentTarget.value) {
						sig = e.currentTarget.value;
					}
				}}
				disabled={loading}
				class="ml-3 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="">-- Common prescription instructions --</option>
				{#each TEST_SIGS as testSig (testSig)}
					<option value={testSig}>{testSig}</option>
				{/each}
			</select>
		</div>
		<textarea
			id="sig"
			bind:value={sig}
			disabled={loading}
			rows="2"
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
				list="days-supply-list"
				class="no-spinner w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				placeholder="e.g., 30"
			/>
			<datalist id="days-supply-list">
				{#each TEST_DAYS_SUPPLY as days (days)}
					<option value={days}></option>
				{/each}
			</datalist>
		</div>

		<div>
			<label for="totalQuantity" class="mb-1 block text-sm font-medium text-gray-700">
				Total Quantity <span class="italic">(use this OR Days Supply)</span>
			</label>
			<input
				id="totalQuantity"
				type="number"
				bind:value={totalQuantity}
				disabled={loading}
				min="1"
				list="total-quantity-list"
				class="no-spinner w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				placeholder="e.g., 60"
			/>
			<datalist id="total-quantity-list">
				{#each TEST_QUANTITIES as qty (qty)}
					<option value={qty}></option>
				{/each}
			</datalist>
		</div>
	</div>

	<div>
		<div class="mb-1 flex items-center gap-2">
			<label for="manualDoses" class="block text-sm font-medium text-gray-700">
				Manual Override: Doses Per Day (optional)
			</label>
			<p class="ml-auto text-xs text-gray-500">
				Use this if the system cannot parse your prescription instructions
			</p>
		</div>
		<input
			id="manualDoses"
			type="number"
			bind:value={manualDosesPerDay}
			disabled={loading}
			min="1"
			class="no-spinner w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
			placeholder="Use if SIG parsing fails"
		/>
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

<style>
	/* Hide spinner arrows on number inputs */
	.no-spinner::-webkit-inner-spin-button,
	.no-spinner::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.no-spinner {
		-moz-appearance: textfield;
	}
</style>
