<script lang="ts">
	import { onMount, getContext, tick } from 'svelte';
	const i18n = getContext('i18n');

	import { goto } from '$app/navigation';
	import { WEBUI_NAME, user } from '$lib/stores';
	import { memoryBlocks } from '$lib/stores/memory';
	import { getBlocks } from '$lib/apis/memory';

	import Badge from '../common/Badge.svelte';
	import Search from '../icons/Search.svelte';
	import Plus from '../icons/Plus.svelte';
	import Spinner from '../common/Spinner.svelte';
	import Tooltip from '../common/Tooltip.svelte';
	import XMark from '../icons/XMark.svelte';
	import ViewSelector from './common/ViewSelector.svelte';
	import EllipsisHorizontal from '../icons/EllipsisHorizontal.svelte';
	// TODO(menu): Re-enable when BlockMenu has actions (Edit, Delete)
	// import BlockMenu from './Profile/BlockMenu.svelte';

	let loaded = false;
	let loading = false;

	let query = '';
	let viewOption = '';

	let items: Array<{ label: string; pendingDiffs: number }> | null = null;

	onMount(async () => {
		viewOption = localStorage?.workspaceViewOption || '';
		loaded = true;
		await loadBlocks();
	});

	async function loadBlocks() {
		if (!$user) return;

		loading = true;
		try {
			const blocks = await getBlocks($user.id, localStorage.token);
			items = blocks.map((b) => ({ label: b.label, pendingDiffs: b.pendingDiffs ?? 0 }));
			memoryBlocks.set(items);
		} catch (e) {
			console.error('Failed to load memory blocks:', e);
			items = [];
		}
		loading = false;
	}

	// Convert snake_case to Title Case for display
	function formatLabel(label: string): string {
		return label
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}

	// TODO(search): Implement search filtering when backend supports it
	// For now, search box is visible but non-functional
	$: filteredItems = items;

	// Reactive reload when viewOption changes (for future use)
	$: if (loaded && viewOption !== undefined) {
		// TODO(filter): Implement view filtering when blocks support sharing
	}
</script>

<svelte:head>
	<title>
		{$i18n.t('Profile')} • {$WEBUI_NAME}
	</title>
</svelte:head>

{#if loaded}
	<!-- Header section -->
	<div class="flex flex-col gap-1 px-1 mt-1.5 mb-3">
		<div class="flex justify-between items-center">
			<div class="flex items-center md:self-center text-xl font-medium px-0.5 gap-2 shrink-0">
				<div>
					{$i18n.t('Profile')}
				</div>

				<div class="text-lg font-medium text-gray-500 dark:text-gray-500">
					{items?.length ?? ''}
				</div>
			</div>

			<div class="flex w-full justify-end gap-1.5">
				<!-- TODO(create): Wire up to create memory block flow -->
				<button
					class="px-2 py-1.5 rounded-xl bg-black text-white dark:bg-white dark:text-black transition font-medium text-sm flex items-center opacity-50 cursor-not-allowed"
					disabled
					title="Coming soon"
				>
					<Plus className="size-3" strokeWidth="2.5" />
					<div class="hidden md:block md:ml-1 text-xs">{$i18n.t('New Memory Block')}</div>
				</button>
			</div>
		</div>
	</div>

	<!-- Search and filter container -->
	<div
		class="py-2 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100/30 dark:border-gray-850/30"
	>
		<!-- Search box -->
		<div class="flex w-full space-x-2 py-0.5 px-3.5 pb-2">
			<div class="flex flex-1">
				<div class="self-center ml-1 mr-3">
					<Search className="size-3.5" />
				</div>
				<input
					class="w-full text-sm py-1 rounded-r-xl outline-hidden bg-transparent"
					bind:value={query}
					placeholder={$i18n.t('Search Profile')}
					disabled
					title="Search coming soon"
				/>
				{#if query}
					<div class="self-center pl-1.5 translate-y-[0.5px] rounded-l-xl bg-transparent">
						<button
							class="p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition"
							on:click={() => {
								query = '';
							}}
						>
							<XMark className="size-3" strokeWidth="2" />
						</button>
					</div>
				{/if}
			</div>
		</div>

		<!-- View selector -->
		<div
			class="px-3 flex w-full bg-transparent overflow-x-auto scrollbar-none -mx-1"
			on:wheel={(e) => {
				if (e.deltaY !== 0) {
					e.preventDefault();
					e.currentTarget.scrollLeft += e.deltaY;
				}
			}}
		>
			<div class="flex gap-0.5 w-fit text-center text-sm rounded-full bg-transparent px-1.5 whitespace-nowrap">
				<ViewSelector
					bind:value={viewOption}
					onChange={async (value) => {
						localStorage.workspaceViewOption = value;
						await tick();
					}}
				/>
			</div>
		</div>

		<!-- Items grid -->
		{#if items !== null}
			{#if (filteredItems ?? []).length !== 0}
				<div class="my-2 px-3 grid grid-cols-1 lg:grid-cols-2 gap-2">
					{#each filteredItems as item (item.label)}
						<button
							class="flex space-x-4 cursor-pointer text-left w-full px-3 py-2.5 dark:hover:bg-gray-850/50 hover:bg-gray-50 transition rounded-2xl"
							on:click={() => {
								goto(`/you/blocks/${item.label}`);
							}}
						>
							<div class="w-full">
								<div class="self-center flex-1 justify-between">
									<!-- Badge row -->
									<div class="flex items-center justify-between -my-1 h-8">
										<div class="flex gap-2 items-center">
											<Badge type="muted" content={$i18n.t('Memory Block')} />
											{#if item.pendingDiffs > 0}
												<Badge type="warning" content="{item.pendingDiffs} {$i18n.t('pending')}" />
											{/if}
										</div>

										<div class="flex items-center gap-2">
											<div class="flex self-center">
												<!-- TODO(menu): Wire up dropdown with Edit/Delete actions -->
												<Tooltip content={$i18n.t('More')}>
													<button
														class="self-center hover:bg-black/5 dark:hover:bg-white/5 dark:text-gray-300 rounded-md p-0.5"
														on:click|stopPropagation={() => {
															// TODO(menu): Open BlockMenu dropdown
														}}
													>
														<EllipsisHorizontal className="size-5" />
													</button>
												</Tooltip>
											</div>
										</div>
									</div>

									<!-- Content row -->
									<div class="flex items-center gap-1 justify-between px-1.5">
										<Tooltip content={item.label}>
											<div class="flex items-center gap-2">
												<div class="text-sm font-medium line-clamp-1 capitalize">
													{formatLabel(item.label)}
												</div>
											</div>
										</Tooltip>

										<div class="flex items-center gap-2 shrink-0">
											<!-- TODO(timestamps): Add updated_at to blocks API response -->
											<div class="text-xs text-gray-500 shrink-0">
												<Tooltip
													content={$user?.email ?? ''}
													className="flex shrink-0"
													placement="top-start"
												>
													{$i18n.t('By {{name}}', {
														name: $user?.name ?? $user?.email ?? 'Me'
													})}
												</Tooltip>
											</div>
										</div>
									</div>
								</div>
							</div>
						</button>
					{/each}
				</div>
			{:else}
				<!-- Empty state -->
				<div class="w-full h-full flex flex-col justify-center items-center my-16 mb-24">
					<div class="max-w-md text-center">
						<div class="text-3xl mb-3">😕</div>
						<div class="text-lg font-medium mb-1">{$i18n.t('No memory blocks found')}</div>
						<div class="text-gray-500 text-center text-xs">
							{$i18n.t('Start a conversation to begin building your profile.')}
						</div>
					</div>
				</div>
			{/if}
		{:else if loading}
			<!-- Loading state -->
			<div class="w-full h-full flex justify-center items-center py-10">
				<Spinner className="size-4" />
			</div>
		{/if}
	</div>
{:else}
	<div class="w-full h-full flex justify-center items-center">
		<Spinner className="size-5" />
	</div>
{/if}
