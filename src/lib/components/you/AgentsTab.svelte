<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { user } from '$lib/stores';
	import { getBackgroundAgents, type BackgroundAgent } from '$lib/apis/memory';

	import Badge from '$lib/components/common/Badge.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';

	const i18n = getContext('i18n');

	let loading = true;
	let agents: BackgroundAgent[] = [];
	let expandedAgents: Set<string> = new Set();

	// Mock data for development when backend is not available
	const MOCK_AGENTS: BackgroundAgent[] = [
		{
			name: 'Essay Coach',
			pendingDiffs: 2,
			threads: [
				{ id: 'thread_001', chatId: 'chat_abc123', date: '2026-01-10T14:30:00Z', displayDate: 'Jan 10 - Reviewed draft opening' },
				{ id: 'thread_002', chatId: 'chat_def456', date: '2026-01-11T09:15:00Z', displayDate: 'Jan 11 - Explored family story' }
			]
		},
		{
			name: 'Learning Optimizer',
			pendingDiffs: 1,
			threads: [
				{ id: 'thread_001', chatId: 'chat_ghi789', date: '2026-01-12T08:00:00Z', displayDate: 'Jan 12 - Analyzed engagement' }
			]
		}
	];

	onMount(async () => {
		await loadAgents();
	});

	async function loadAgents() {
		if (!$user) return;

		loading = true;
		try {
			agents = await getBackgroundAgents($user.id, localStorage.token);
		} catch (e) {
			console.error('Failed to load agents, using mock data:', e);
			// Use mock data when API is not available
			agents = MOCK_AGENTS;
		}
		loading = false;
	}

	function toggleAgent(name: string) {
		if (expandedAgents.has(name)) {
			expandedAgents.delete(name);
		} else {
			expandedAgents.add(name);
		}
		expandedAgents = expandedAgents;
	}
</script>

{#if loading}
	<div class="flex justify-center py-8">
		<Spinner className="size-6" />
	</div>
{:else if agents.length === 0}
	<div class="text-center text-gray-500 py-8">
		{$i18n.t('No background agents found.')}
	</div>
{:else}
	<div class="space-y-3">
		{#each agents as agent (agent.name)}
			<div
				class="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
			>
				<!-- Agent Header -->
				<button
					class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-850 transition text-left"
					on:click={() => toggleAgent(agent.name)}
				>
					<div class="flex items-center gap-3">
						<div class="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="size-4 text-gray-600 dark:text-gray-400"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
								/>
							</svg>
						</div>
						<span class="font-medium text-gray-900 dark:text-gray-100">{agent.name}</span>
						{#if agent.pendingDiffs > 0}
							<Badge type="warning" content="{agent.pendingDiffs} {$i18n.t('pending')}" />
						{/if}
					</div>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="size-4 text-gray-400 transition {expandedAgents.has(agent.name) ? 'rotate-180' : ''}"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
					</svg>
				</button>

				<!-- Agent Threads -->
				{#if expandedAgents.has(agent.name)}
					<div class="border-t border-gray-100 dark:border-gray-800 px-4 py-2 bg-gray-50/50 dark:bg-gray-850/50">
						{#if agent.threads.length === 0}
							<div class="text-sm text-gray-500 py-2">{$i18n.t('No recent runs')}</div>
						{:else}
							<div class="space-y-1">
								{#each agent.threads as thread (thread.id)}
									<a
										href="/?chat={thread.chatId}"
										class="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 py-1 transition"
									>
										{thread.displayDate}
									</a>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
