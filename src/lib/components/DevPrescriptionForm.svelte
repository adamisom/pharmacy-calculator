<script lang="ts">
	import { onMount } from 'svelte';
	import type { PrescriptionInput } from '$lib/types';
	import PrescriptionForm from './PrescriptionForm.svelte';
	import {
		TEST_DRUGS,
		TEST_SIGS,
		TEST_DAYS_SUPPLY,
		TEST_QUANTITIES,
		TEST_MANUAL_DOSES
	} from '$lib/utils/test-data';

	export let onSubmit: (input: PrescriptionInput) => Promise<void>;
	export let loading: boolean = false;

	const STORAGE_KEY = 'ndc-calculator-test-values';

	let drugNameOrNDC = '';
	let sig = '';
	let daysSupply: number | '' = '';
	let totalQuantity: number | '' = '';
	let manualDosesPerDay: number | '' = '';

	function loadFromStorage() {
		if (typeof window === 'undefined') return;
		try {
			const stored = sessionStorage.getItem(STORAGE_KEY);
			if (stored) {
				const data = JSON.parse(stored);
				drugNameOrNDC = data.drugNameOrNDC || '';
				sig = data.sig || '';
				daysSupply = data.daysSupply ?? '';
				totalQuantity = data.totalQuantity ?? '';
				manualDosesPerDay = data.manualDosesPerDay ?? '';
			}
		} catch {
			// Ignore storage errors
		}
	}

	function saveToStorage() {
		if (typeof window === 'undefined') return;
		try {
			sessionStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					drugNameOrNDC,
					sig,
					daysSupply,
					totalQuantity,
					manualDosesPerDay
				})
			);
		} catch {
			// Ignore storage errors
		}
	}

	// Sync dev form values to PrescriptionForm
	$: formDrugNameOrNDC = drugNameOrNDC;
	$: formSig = sig;
	$: formDaysSupply = daysSupply;
	$: formTotalQuantity = totalQuantity;
	$: formManualDosesPerDay = manualDosesPerDay;

	// Save to storage when values change
	$: if (drugNameOrNDC || sig || daysSupply || totalQuantity || manualDosesPerDay) {
		saveToStorage();
	}

	onMount(() => {
		loadFromStorage();
	});
</script>

<div class="space-y-4">
	<div>
		<label for="dev-drug" class="mb-1 block text-xs font-medium text-gray-500">
			[DEV] Drug Name or NDC
		</label>
		<input
			id="dev-drug"
			type="text"
			bind:value={drugNameOrNDC}
			on:input={saveToStorage}
			disabled={loading}
			list="dev-drug-list"
			class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			placeholder="Select or type..."
		/>
		<datalist id="dev-drug-list">
			{#each TEST_DRUGS as drug (drug)}
				<option value={drug}></option>
			{/each}
		</datalist>
	</div>

	<div>
		<label for="dev-sig" class="mb-1 block text-xs font-medium text-gray-500">
			[DEV] Prescription Instructions (SIG)
		</label>
		<textarea
			id="dev-sig"
			bind:value={sig}
			on:input={saveToStorage}
			disabled={loading}
			rows="2"
			class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			placeholder="Type or select below..."
		></textarea>
		<select
			on:change={(e) => {
				sig = e.currentTarget.value;
				saveToStorage();
			}}
			class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600"
		>
			<option value="">-- Select test SIG --</option>
			{#each TEST_SIGS as testSig (testSig)}
				<option value={testSig}>{testSig}</option>
			{/each}
		</select>
	</div>

	<div class="grid grid-cols-2 gap-4">
		<div>
			<label for="dev-days" class="mb-1 block text-xs font-medium text-gray-500">
				[DEV] Days Supply
			</label>
			<input
				id="dev-days"
				type="number"
				bind:value={daysSupply}
				on:input={saveToStorage}
				disabled={loading}
				min="1"
				max="365"
				list="dev-days-list"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
			<datalist id="dev-days-list">
				{#each TEST_DAYS_SUPPLY as days (days)}
					<option value={days}></option>
				{/each}
			</datalist>
		</div>

		<div>
			<label for="dev-qty" class="mb-1 block text-xs font-medium text-gray-500">
				[DEV] Total Quantity
			</label>
			<input
				id="dev-qty"
				type="number"
				bind:value={totalQuantity}
				on:input={saveToStorage}
				disabled={loading}
				min="1"
				list="dev-qty-list"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
			<datalist id="dev-qty-list">
				{#each TEST_QUANTITIES as qty (qty)}
					<option value={qty}></option>
				{/each}
			</datalist>
		</div>
	</div>

	<div>
		<label for="dev-doses" class="mb-1 block text-xs font-medium text-gray-500">
			[DEV] Manual Doses Per Day
		</label>
		<input
			id="dev-doses"
			type="number"
			bind:value={manualDosesPerDay}
			on:input={saveToStorage}
			disabled={loading}
			min="1"
			list="dev-doses-list"
			class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
		/>
		<datalist id="dev-doses-list">
			{#each TEST_MANUAL_DOSES as doses (doses)}
				<option value={doses}></option>
			{/each}
		</datalist>
	</div>

	<div class="rounded-md border-2 border-yellow-300 bg-yellow-50 p-3">
		<p class="text-xs font-semibold text-yellow-800">[DEV MODE]</p>
		<p class="text-xs text-yellow-700">
			Values above are synced to the form below via sessionStorage
		</p>
	</div>

	<PrescriptionForm
		{onSubmit}
		{loading}
		drugNameOrNDC={formDrugNameOrNDC}
		sig={formSig}
		daysSupply={formDaysSupply}
		totalQuantity={formTotalQuantity}
		manualDosesPerDay={formManualDosesPerDay}
	/>
</div>
