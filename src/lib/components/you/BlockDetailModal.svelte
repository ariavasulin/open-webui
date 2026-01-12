<script lang="ts">
	import { createEventDispatcher, getContext, onMount } from 'svelte';
	import { user } from '$lib/stores';
	import { selectedBlock, blockHistory } from '$lib/stores/memory';
	import { getBlock, updateBlock, getBlockHistory, restoreVersion } from '$lib/apis/memory';

	import Modal from '$lib/components/common/Modal.svelte';
	import Textarea from '$lib/components/common/Textarea.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';

	const i18n = getContext('i18n');
	const dispatch = createEventDispatcher();

	export let label: string;

	let loading = true;
	let saving = false;
	let content = '';
	let showHistory = false;
	let error = '';

	// Mock data for development when backend is not available
	const MOCK_CONTENT: Record<string, string> = {
		student: `# Student Profile

## Identity
- **Name**: Ari
- **Pronouns**: he/him

## Academic
- **Grade**: Senior
- **School Type**: Public High School
- **Intended Major**: Computer Science
- **GPA**: 3.8
- **Strengths**: writing, problem-solving, creativity
- **Areas for Growth**: time management, asking for help

## College Goals
- **Target Schools**: MIT, Stanford, Berkeley, Carnegie Mellon
- **Early Decision**: MIT
- **Essay Theme**: passion for open source and community building

## Communication
- **Preferred Style**: direct and casual
- **Feedback Preference**: specific and actionable
- **Best Time to Work**: evening`,

		engagement_strategy: `# Engagement Strategy

## Approach
- **Tone**: encouraging but challenging
- **Pacing**: student-led with gentle nudges
- **Autonomy Level**: high

## Motivators
### Intrinsic
- curiosity
- mastery
- impact

### Extrinsic
- college admission
- family pride

### Avoid
- generic praise
- condescension

## Session Structure
- **Ideal Length**: 30 minutes
- **Break Frequency**: every 25 minutes
- **Warmup Style**: quick check-in
- **Closure Style**: recap and next steps`,

		journey: `# Learning Journey

## Current State
- **Module**: Module 2: Finding Your Voice
- **Step**: Step 3: Core Values Exercise
- **Status**: in_progress
- **Started**: December 15, 2025

## Completed Modules
- ✅ **Module 1**: Introduction to College Essays (excellent)

## Essay Drafts
- **Count**: 2
- **Current Draft**: draft_2
- **Themes Explored**: open source journey, mentorship impact, building communities

## Key Moments
1. **Dec 18**: Realized the open source story connects to desire to democratize education
2. **Dec 22**: Found unique angle: from consumer to creator to community builder

## Struggles
- **Vulnerability**: working on - tends to stay surface-level
- **Word Count**: resolved - initially wrote too much, now more concise

## Next Steps
- [ ] Complete core values exercise
- [ ] Draft personal statement intro
- [ ] Review Common App prompts`
	};

	const MOCK_HISTORY = [
		{ sha: 'abc123', message: 'Add learning journey block', author: 'YouLab System', timestamp: '2026-01-10T10:00:00Z', isCurrent: true },
		{ sha: 'def456', message: 'Update progress status', author: 'YouLab System', timestamp: '2026-01-08T14:30:00Z', isCurrent: false },
		{ sha: 'ghi789', message: 'Initial block creation', author: 'YouLab System', timestamp: '2026-01-05T09:00:00Z', isCurrent: false }
	];

	onMount(async () => {
		await loadBlock();
	});

	async function loadBlock() {
		if (!$user) return;

		loading = true;
		error = '';
		try {
			const block = await getBlock($user.id, label, localStorage.token);
			selectedBlock.set(block);
			content = block.contentMarkdown;

			const history = await getBlockHistory($user.id, label, localStorage.token);
			blockHistory.set(history);
		} catch (e) {
			console.error('Failed to load block, using mock data:', e);
			// Use mock data when API is not available
			content = MOCK_CONTENT[label] || `# ${label}\n\nNo content available.`;
			blockHistory.set(MOCK_HISTORY);
		}
		loading = false;
	}

	async function save() {
		if (!$user) return;

		saving = true;
		error = '';
		try {
			await updateBlock($user.id, label, content, localStorage.token);
			await loadBlock();
		} catch (e) {
			error = $i18n.t('Failed to save');
			console.error(e);
		}
		saving = false;
	}

	async function restore(sha: string) {
		if (!$user) return;
		if (!confirm($i18n.t('Restore this version? Current content will be replaced.'))) return;

		saving = true;
		try {
			await restoreVersion($user.id, label, sha, localStorage.token);
			await loadBlock();
		} catch (e) {
			error = $i18n.t('Failed to restore');
			console.error(e);
		}
		saving = false;
	}

	// Convert snake_case to Title Case
	$: displayName = label
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());

	function formatDate(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<Modal size="lg" on:close={() => dispatch('close')}>
	<div class="p-6">
		<!-- Header -->
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{displayName}</h2>
			<div class="flex gap-2">
				<button
					class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
					on:click={() => (showHistory = !showHistory)}
				>
					{showHistory ? $i18n.t('Hide History') : $i18n.t('Show History')}
				</button>
			</div>
		</div>

		{#if loading}
			<div class="flex justify-center py-8">
				<Spinner className="size-6" />
			</div>
		{:else}
			{#if error}
				<div class="text-red-500 mb-4 text-sm">{error}</div>
			{/if}

			<div class="flex gap-4">
				<!-- Editor -->
				<div class="flex-1">
					<Textarea
						bind:value={content}
						placeholder={$i18n.t('Memory block content (Markdown)...')}
						className="w-full rounded-lg px-3.5 py-2 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-hidden font-mono min-h-[300px]"
					/>

					<div class="mt-4 flex justify-end gap-2">
						<button
							class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
							on:click={() => dispatch('close')}
						>
							{$i18n.t('Cancel')}
						</button>
						<button
							class="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg disabled:opacity-50 transition hover:bg-gray-800 dark:hover:bg-gray-200"
							disabled={saving}
							on:click={save}
						>
							{saving ? $i18n.t('Saving...') : $i18n.t('Save')}
						</button>
					</div>
				</div>

				<!-- History Sidebar -->
				{#if showHistory}
					<div class="w-64 border-l border-gray-200 dark:border-gray-800 pl-4">
						<h3 class="font-medium text-gray-900 dark:text-gray-100 mb-2">
							{$i18n.t('Version History')}
						</h3>
						<div class="space-y-2 max-h-96 overflow-y-auto">
							{#each $blockHistory as version (version.sha)}
								<div
									class="text-sm p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-850 transition"
								>
									<div class="font-medium text-gray-900 dark:text-gray-100 truncate">
										{version.message}
									</div>
									<div class="text-gray-500 text-xs">
										{version.author} · {formatDate(version.timestamp)}
									</div>
									{#if !version.isCurrent}
										<button
											class="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
											on:click={() => restore(version.sha)}
										>
											{$i18n.t('Restore')}
										</button>
									{:else}
										<span class="text-xs text-gray-400">{$i18n.t('Current')}</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</Modal>
