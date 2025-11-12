<script lang="ts">
	import { isDevMode } from '$lib/utils/test-data';
	import PrescriptionForm from '$lib/components/PrescriptionForm.svelte';
	import DevPrescriptionForm from '$lib/components/DevPrescriptionForm.svelte';
	import ResultsDisplay from '$lib/components/ResultsDisplay.svelte';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';
	import type { PrescriptionInput, CalculationResult } from '$lib/types';

	const devMode = isDevMode();

	let result: CalculationResult | null = null;
	let error: string | null = null;
	let actionable: string | undefined = undefined;
	let loading = false;

	async function handleSubmit(input: PrescriptionInput) {
		loading = true;
		error = null;
		actionable = undefined;
		result = null;

		try {
			const response = await fetch('/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.error || 'An error occurred';
				actionable = data.actionable;
				return;
			}

			result = data;
		} catch (err) {
			error = 'Unable to connect to the server. Please try again.';
			actionable = 'Check your internet connection and try again.';
			console.error(err);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>NDC Calculator</title>
	<meta
		name="description"
		content="NDC Packaging & Quantity Calculator for pharmacy professionals"
	/>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<h1 class="mb-6 text-3xl font-bold">NDC Packaging & Quantity Calculator</h1>

	<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
		{#if devMode}
			<DevPrescriptionForm onSubmit={handleSubmit} {loading} />
		{:else}
			<PrescriptionForm onSubmit={handleSubmit} {loading} />
		{/if}
	</div>

	{#if error}
		<div class="mb-6">
			<ErrorMessage
				{error}
				{actionable}
				onRetry={() => {
					error = null;
					result = null;
				}}
			/>
		</div>
	{/if}

	{#if result}
		<div class="rounded-lg bg-white p-6 shadow-md">
			<ResultsDisplay {result} />
		</div>
	{/if}
</div>
