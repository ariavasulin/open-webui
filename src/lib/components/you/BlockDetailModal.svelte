<script lang="ts">
	import { createEventDispatcher, getContext, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/stores';
	import { selectedBlock, blockHistory } from '$lib/stores/memory';
	import {
		getBlock,
		updateBlock,
		getBlockHistory,
		restoreVersion,
		getBlockDiffs,
		approveDiff,
		rejectDiff,
		type PendingDiff
	} from '$lib/apis/memory';

	import Modal from '$lib/components/common/Modal.svelte';
	import Textarea from '$lib/components/common/Textarea.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';

	const i18n = getContext('i18n');
	const dispatch = createEventDispatcher();

	export let label: string;

	let loading = true;
	let saving = false;
	let processing = false;
	let tomlContent = '';  // For diff view (diffs are TOML-based)
	let markdownContent = '';  // For manual editing
	let showHistory = false;
	let editMode = false;
	let error = '';
	let pendingDiffs: PendingDiff[] = [];

	// Extended diff type with old/new values for inline display
	interface DiffWithValues extends PendingDiff {
		oldValue?: string;
		newValue?: string;
		lineNumber?: number; // Line where diff applies
	}

	let diffsWithValues: DiffWithValues[] = [];


	// Build a unified diff view structure
	interface DiffLine {
		type: 'context' | 'deletion' | 'addition';
		content: string;
		lineNum?: number;
		diffId?: string;
		diff?: DiffWithValues;
		isLastInDiff?: boolean;
	}

	let diffLines: DiffLine[] = [];

	function buildDiffView() {
		if (diffsWithValues.length === 0 || editMode) {
			diffLines = [];
			return;
		}

		const lines = tomlContent.split('\n');
		const result: DiffLine[] = [];

		// Create a map of line numbers to diffs
		const diffsByLine: Map<number, DiffWithValues> = new Map();
		for (const diff of diffsWithValues) {
			if (diff.lineNumber !== undefined) {
				diffsByLine.set(diff.lineNumber, diff);
			} else if (diff.oldValue) {
				// Find the line number by matching content
				const lineIdx = lines.findIndex(line => line.trim() === diff.oldValue?.trim());
				if (lineIdx >= 0) {
					diff.lineNumber = lineIdx;
					diffsByLine.set(lineIdx, diff);
				}
			}
		}

		// Build the unified view
		for (let i = 0; i < lines.length; i++) {
			const diff = diffsByLine.get(i);
			if (diff) {
				// This line has a diff - show deletion then addition
				if (diff.oldValue) {
					result.push({
						type: 'deletion',
						content: diff.oldValue,
						lineNum: i + 1,
						diffId: diff.id,
						diff: diff
					});
				}
				if (diff.newValue) {
					result.push({
						type: 'addition',
						content: diff.newValue,
						diffId: diff.id,
						diff: diff,
						isLastInDiff: true
					});
				}
			} else {
				// Regular context line
				result.push({
					type: 'context',
					content: lines[i],
					lineNum: i + 1
				});
			}
		}

		diffLines = result;
	}

	$: if (tomlContent && diffsWithValues) {
		buildDiffView();
	}

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
			// TOML for diff view (diffs are TOML-based), markdown for editing
			tomlContent = block.contentToml;
			markdownContent = block.contentMarkdown;

			const history = await getBlockHistory($user.id, label, localStorage.token);
			blockHistory.set(history);

			const diffs = await getBlockDiffs($user.id, label, localStorage.token);
			pendingDiffs = diffs;
			diffsWithValues = diffs as DiffWithValues[];
		} catch (e) {
			console.error('Failed to load block:', e);
			error = $i18n.t('Failed to load block');
		}
		loading = false;
	}

	async function save() {
		if (!$user) return;

		saving = true;
		error = '';
		try {
			await updateBlock($user.id, label, markdownContent, localStorage.token, 'markdown');
			editMode = false;
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

	async function handleApprove(diffId: string) {
		if (!$user || processing) return;
		processing = true;

		try {
			await approveDiff($user.id, label, diffId, localStorage.token);
			toast.success($i18n.t('Change approved'));
			await loadBlock();
		} catch (e: any) {
			toast.error(e.message || $i18n.t('Failed to approve'));
			console.error(e);
		} finally {
			processing = false;
		}
	}

	async function handleReject(diffId: string) {
		if (!$user || processing) return;
		processing = true;

		try {
			await rejectDiff($user.id, label, diffId, localStorage.token);
			toast.success($i18n.t('Change rejected'));
			await loadBlock();
		} catch (e: any) {
			toast.error(e.message || $i18n.t('Failed to reject'));
			console.error(e);
		} finally {
			processing = false;
		}
	}

	$: displayName = label
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());

	$: hasDiffs = diffsWithValues.length > 0;
	$: showDiffView = hasDiffs && !editMode;

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
				{#if hasDiffs}
					<button
						class="text-sm transition {editMode
							? 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
							: 'text-amber-600 dark:text-amber-400'}"
						on:click={() => (editMode = !editMode)}
					>
						{editMode ? $i18n.t('View Changes') : $i18n.t('Edit')}
					</button>
				{/if}
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
				<div class="flex-1 min-w-0">
					{#if showDiffView}
						<!-- Unified Diff View -->
						<div class="border border-gray-200 dark:border-gray-700 overflow-hidden w-full">
							<div class="bg-gray-50 dark:bg-gray-850 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
								<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
									{diffsWithValues.length} {$i18n.t('pending')} {diffsWithValues.length === 1 ? $i18n.t('change') : $i18n.t('changes')}
								</span>
							</div>
							<div class="font-mono text-sm overflow-auto max-h-[400px]">
								{#each diffLines as line, idx (idx)}
									{#if line.type === 'context'}
										<div class="px-3 py-0.5 text-gray-700 dark:text-gray-300 flex">
											<span class="w-8 text-gray-400 dark:text-gray-600 text-right pr-2 select-none shrink-0">{line.lineNum}</span>
											<span class="whitespace-pre-wrap break-all">{line.content || ' '}</span>
										</div>
									{:else if line.type === 'deletion'}
										<div class="px-3 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 flex">
											<span class="w-8 text-red-400 dark:text-red-500 text-right pr-2 select-none shrink-0">−</span>
											<span class="whitespace-pre-wrap break-all flex-1">{line.content}</span>
										</div>
									{:else if line.type === 'addition'}
										<div class="bg-green-100 dark:bg-green-900/30">
											<div class="px-3 py-0.5 text-green-800 dark:text-green-200 flex">
												<span class="w-8 text-green-400 dark:text-green-500 text-right pr-2 select-none shrink-0">+</span>
												<span class="whitespace-pre-wrap break-all flex-1">{line.content}</span>
											</div>
											{#if line.isLastInDiff && line.diff}
												<div class="px-3 py-1.5 border-t border-green-200 dark:border-green-800/50 flex items-center justify-between gap-2 bg-green-50 dark:bg-green-900/20">
													<span class="text-xs text-green-700 dark:text-green-300 italic truncate">
														{line.diff.reasoning}
													</span>
													<div class="flex gap-1.5 shrink-0">
														<button
															class="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition disabled:opacity-50"
															on:click={() => handleApprove(line.diff?.id || '')}
															disabled={processing}
														>
															{$i18n.t('Approve')}
														</button>
														<button
															class="px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs transition disabled:opacity-50"
															on:click={() => handleReject(line.diff?.id || '')}
															disabled={processing}
														>
															{$i18n.t('Reject')}
														</button>
													</div>
												</div>
											{/if}
										</div>
									{/if}
								{/each}
							</div>
						</div>
					{:else}
						<!-- Edit Mode -->
						<Textarea
							bind:value={markdownContent}
							placeholder={$i18n.t('Memory block content (Markdown)...')}
							className="w-full rounded-lg px-3.5 py-2 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-hidden font-mono min-h-[300px]"
						/>
					{/if}

					<div class="mt-4 flex justify-end gap-2">
						<button
							class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
							on:click={() => dispatch('close')}
						>
							{$i18n.t('Cancel')}
						</button>
						{#if editMode || !hasDiffs}
							<button
								class="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg disabled:opacity-50 transition hover:bg-gray-800 dark:hover:bg-gray-200"
								disabled={saving}
								on:click={save}
							>
								{saving ? $i18n.t('Saving...') : $i18n.t('Save')}
							</button>
						{/if}
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
