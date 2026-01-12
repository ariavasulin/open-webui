<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import Document from '$lib/components/icons/Document.svelte';

	const i18n = getContext('i18n');
	const dispatch = createEventDispatcher();

	export let label: string;
	export let pendingDiffs: number = 0;

	// Convert snake_case to Title Case
	$: displayName = label
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
</script>

<button
	class="text-left w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800
		   hover:bg-gray-50 dark:hover:bg-gray-850 transition cursor-pointer"
	on:click={() => dispatch('click')}
>
	<div class="flex items-start justify-between">
		<div class="flex items-center gap-2">
			<div class="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
				<Document className="size-4 text-gray-600 dark:text-gray-400" />
			</div>
			<span class="font-medium text-gray-900 dark:text-gray-100">{displayName}</span>
		</div>
		{#if pendingDiffs > 0}
			<Badge type="warning" content="{pendingDiffs} {$i18n.t('pending')}" />
		{/if}
	</div>
</button>
