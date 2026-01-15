<script lang="ts">
	import { getContext, createEventDispatcher } from 'svelte';
	const i18n = getContext('i18n');
	const dispatch = createEventDispatcher();

	import Dropdown from '$lib/components/common/Dropdown.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import EllipsisHorizontal from '$lib/components/icons/EllipsisHorizontal.svelte';

	let show = false;
</script>

<Dropdown bind:show>
	<Tooltip content={$i18n.t('More')}>
		<button
			class="self-center hover:bg-black/5 dark:hover:bg-white/5 dark:text-gray-300 rounded-md"
			on:click={() => {
				show = !show;
			}}
		>
			<EllipsisHorizontal className="size-5" />
		</button>
	</Tooltip>

	<div slot="content">
		<div
			class="min-w-[140px] text-sm font-medium z-50 bg-white dark:bg-gray-850 rounded-lg shadow-lg border border-gray-100 dark:border-gray-800"
		>
			<!-- TODO: Add menu items (Edit, Delete) when functionality is needed -->
			<div class="px-3 py-2 text-xs text-gray-500">
				{$i18n.t('No actions available')}
			</div>
		</div>
	</div>
</Dropdown>
