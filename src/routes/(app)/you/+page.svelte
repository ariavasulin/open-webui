<script lang="ts">
	import { getContext, onMount } from 'svelte';

	const i18n = getContext('i18n');

	import { mobile, showArchivedChats, showSidebar, user } from '$lib/stores';
	import { memoryBlocks, pendingDiffsCount } from '$lib/stores/memory';
	import { getBlocks } from '$lib/apis/memory';

	import UserMenu from '$lib/components/layout/Sidebar/UserMenu.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import Sidebar from '$lib/components/icons/Sidebar.svelte';
	import User from '$lib/components/icons/User.svelte';
	import { WEBUI_API_BASE_URL } from '$lib/constants';

	import BlockCard from '$lib/components/you/BlockCard.svelte';
	import BlockDetailModal from '$lib/components/you/BlockDetailModal.svelte';
	import AgentsTab from '$lib/components/you/AgentsTab.svelte';

	let loaded = false;
	let loading = true;
	let selectedLabel: string | null = null;
	let selectedTab: 'profile' | 'agents' = 'profile';

	onMount(async () => {
		loaded = true;
		await loadBlocks();
	});

	// Mock data for development when backend is not available
	const MOCK_BLOCKS = [
		{ label: 'student', pendingDiffs: 1 },
		{ label: 'engagement_strategy', pendingDiffs: 1 },
		{ label: 'journey', pendingDiffs: 1 }
	];

	async function loadBlocks() {
		if (!$user) return;

		loading = true;
		try {
			const blocks = await getBlocks($user.id, localStorage.token);
			memoryBlocks.set(blocks);
		} catch (e) {
			console.error('Failed to load blocks, using mock data:', e);
			// Use mock data when API is not available
			memoryBlocks.set(MOCK_BLOCKS);
		}
		loading = false;
	}

	function openBlock(label: string) {
		selectedLabel = label;
	}

	function closeModal() {
		selectedLabel = null;
		// Reload blocks to refresh pending diff counts
		loadBlocks();
	}
</script>

{#if loaded}
	<div
		class=" flex flex-col w-full h-screen max-h-[100dvh] transition-width duration-200 ease-in-out {$showSidebar
			? 'md:max-w-[calc(100%-var(--sidebar-width))]'
			: ''} max-w-full"
	>
		<nav class="px-2 pt-1.5 backdrop-blur-xl w-full drag-region">
			<div class=" flex items-center">
				{#if $mobile}
					<div class="{$showSidebar ? 'md:hidden' : ''} flex flex-none items-center">
						<Tooltip
							content={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
							interactive={true}
						>
							<button
								id="sidebar-toggle-button"
								class=" cursor-pointer flex rounded-lg hover:bg-gray-100 dark:hover:bg-gray-850 transition"
								on:click={() => {
									showSidebar.set(!$showSidebar);
								}}
							>
								<div class=" self-center p-1.5">
									<Sidebar />
								</div>
							</button>
						</Tooltip>
					</div>
				{/if}

				<div class="ml-2 py-0.5 self-center flex items-center justify-between w-full">
					<div class="">
						<div
							class="flex gap-1 scrollbar-none overflow-x-auto w-fit text-center text-sm font-medium bg-transparent py-1 touch-auto pointer-events-auto"
						>
							<a class="min-w-fit transition" href="/you">
								{$i18n.t('You')}
							</a>
						</div>
					</div>

					<div class=" self-center flex items-center gap-1">
						{#if $user !== undefined && $user !== null}
							<UserMenu
								className="max-w-[240px]"
								role={$user?.role}
								help={true}
								on:show={(e) => {
									if (e.detail === 'archived-chat') {
										showArchivedChats.set(true);
									}
								}}
							>
								<button
									class="select-none flex rounded-xl p-1.5 w-full hover:bg-gray-50 dark:hover:bg-gray-850 transition"
									aria-label="User Menu"
								>
									<div class=" self-center">
										<img
											src={`${WEBUI_API_BASE_URL}/users/${$user?.id}/profile/image`}
											class="size-6 object-cover rounded-full"
											alt="User profile"
											draggable="false"
										/>
									</div>
								</button>
							</UserMenu>
						{/if}
					</div>
				</div>
			</div>
		</nav>

		<div class=" flex-1 max-h-full overflow-y-auto @container">
			<div class="max-w-4xl mx-auto px-4 py-4">
				<!-- Tab bar -->
				<div class="flex gap-2 mb-4">
					<button
						class="px-3 py-1.5 rounded-lg flex items-center gap-2 transition text-sm font-medium
							{selectedTab === 'profile'
							? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
							: 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
						on:click={() => (selectedTab = 'profile')}
					>
						<User className="size-4" />
						<span>{$i18n.t('Profile')}</span>
					</button>
					<button
						class="px-3 py-1.5 rounded-lg flex items-center gap-2 transition text-sm font-medium
							{selectedTab === 'agents'
							? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
							: 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
						on:click={() => (selectedTab = 'agents')}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-4"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
							/>
						</svg>
						<span>{$i18n.t('Agents')}</span>
					</button>
				</div>

				<!-- Tab content -->
				{#if selectedTab === 'profile'}
					{#if loading}
						<div class="flex justify-center py-8">
							<div
								class="animate-spin size-6 border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300 rounded-full"
							/>
						</div>
					{:else if $memoryBlocks.length === 0}
						<div class="text-center text-gray-500 py-8">
							{$i18n.t('No memory blocks found. Start a conversation to begin building your profile.')}
						</div>
					{:else}
						<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{#each $memoryBlocks as block (block.label)}
								<BlockCard
									label={block.label}
									pendingDiffs={block.pendingDiffs}
									on:click={() => openBlock(block.label)}
								/>
							{/each}
						</div>
					{/if}
				{:else if selectedTab === 'agents'}
					<AgentsTab />
				{/if}
			</div>
		</div>
	</div>

	{#if selectedLabel}
		<BlockDetailModal label={selectedLabel} on:close={closeModal} />
	{/if}
{/if}
