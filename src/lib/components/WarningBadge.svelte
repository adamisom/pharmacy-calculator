<script lang="ts">
	export let type: 'inactive' | 'overfill' | 'underfill';
	export let message: string = '';
</script>

{#if type === 'inactive'}
	<span
		class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
		title={message}
	>
		Inactive
	</span>
{:else if type === 'overfill'}
	<span
		class="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800"
		title={message}
	>
		Overfill: {message}
	</span>
{:else if type === 'underfill'}
	<span
		class="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800"
		title={message}
	>
		Underfill: {message}
	</span>
{/if}
