<script lang="ts">
	import { getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import Badge from '$lib/components/common/Badge.svelte';

	const i18n = getContext('i18n');

	export let label: string;
	export let pendingDiffs: number = 0;

	// Convert snake_case to Title Case
	$: displayName = label
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());

	function handleClick() {
		goto(`/you/blocks/${label}`);
	}
</script>

<button
	class="flex space-x-4 cursor-pointer text-left w-full px-3 py-2.5
		   hover:bg-gray-50 dark:hover:bg-gray-850/50 transition rounded-2xl"
	on:click={handleClick}
>
	<div class="flex flex-col flex-1 min-w-0">
		<!-- Badge row - fixed height -->
		<div class="flex items-center justify-between h-6 mb-1">
			<Badge type="muted" content={$i18n.t('Memory Block')} />
			{#if pendingDiffs > 0}
				<Badge type="warning" content="{pendingDiffs} {$i18n.t('pending')}" />
			{/if}
		</div>

		<!-- Content row -->
		<div class="flex items-center">
			<span class="text-sm font-medium line-clamp-1 text-gray-900 dark:text-gray-100">
				{displayName}
			</span>
		</div>
	</div>
</button>
