<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import { models } from '$lib/stores';
	import type { PendingDiff } from '$lib/apis/memory';

	import XMark from '$lib/components/icons/XMark.svelte';

	const i18n = getContext('i18n');
	const dispatch = createEventDispatcher();

	export let show = false;
	export let selectedModelId = '';
	export let selectedPanel: 'settings' | 'chat' = 'settings';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export let files: any[] = [];
	// eslint-disable-next-line svelte/valid-compile
	export let label: string; // Reserved for future use
	export let pendingDiffs: PendingDiff[] = [];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	$: visibleModels = $models.filter((m: any) => !(m?.info?.meta?.hidden ?? false));
</script>

<div class="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
	<div class="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
		<span class="font-medium">
			{selectedPanel === 'settings' ? $i18n.t('Settings') : $i18n.t('Chat')}
		</span>
		<button
			class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
			on:click={() => (show = false)}
		>
			<XMark className="size-5" />
		</button>
	</div>

	<div class="flex-1 overflow-y-auto p-4">
		{#if selectedPanel === 'settings'}
			<!-- Model selector -->
			<div class="mb-4">
				<span class="block text-sm font-medium mb-1">{$i18n.t('AI Model')}</span>
				<select
					bind:value={selectedModelId}
					class="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent"
				>
					{#each visibleModels as model}
						<option value={model.id}>{model.name}</option>
					{/each}
				</select>
			</div>

			<!-- Pending diffs -->
			{#if pendingDiffs.length > 0}
				<div class="mb-4">
					<span class="block text-sm font-medium mb-2">{$i18n.t('Pending Changes')}</span>
					<div class="space-y-2">
						{#each pendingDiffs as diff}
							<div class="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm">
								<div class="font-medium text-amber-700 dark:text-amber-300">
									{diff.operation}
								</div>
								<div class="text-amber-600 dark:text-amber-400 text-xs mt-1">
									{diff.reasoning}
								</div>
							</div>
						{/each}
					</div>
					<button
						class="block w-full text-center text-sm text-blue-600 dark:text-blue-400 mt-2 hover:underline"
						on:click={() => dispatch('showDiffOverlay')}
					>
						{$i18n.t('Review Changes')}
					</button>
				</div>
			{/if}

			<!-- Attached files -->
			{#if files.length > 0}
				<div>
					<span class="block text-sm font-medium mb-2">{$i18n.t('Attached Files')}</span>
					<div class="space-y-1">
						{#each files as file}
							<div class="text-sm text-gray-600 dark:text-gray-400 truncate">
								{file.name}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{:else}
			<!-- Chat panel placeholder -->
			<div class="text-center text-gray-500 py-8">
				{$i18n.t('AI chat coming soon')}
			</div>
		{/if}
	</div>
</div>
