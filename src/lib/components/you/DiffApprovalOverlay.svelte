<script lang="ts">
	import { createEventDispatcher, getContext, onDestroy, onMount } from 'svelte';
	import type { PendingDiff } from '$lib/apis/memory';
	import { approveDiff, rejectDiff } from '$lib/apis/memory';
	import { user } from '$lib/stores';

	import CheckCircle from '$lib/components/icons/CheckCircle.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import ChevronRight from '$lib/components/icons/ChevronRight.svelte';

	const i18n = getContext('i18n');
	const dispatch = createEventDispatcher();

	export let label: string;
	export let diffs: PendingDiff[] = [];
	export let currentContent: string = '';

	// Navigation state
	let currentDiffIndex = 0;
	let processing = false;

	// Computed
	$: currentDiff = diffs.length > 0 ? diffs[currentDiffIndex] : null;
	$: hasMultipleDiffs = diffs.length > 1;
	$: canGoPrev = currentDiffIndex > 0;
	$: canGoNext = currentDiffIndex < diffs.length - 1;

	// Confidence badge colors
	function getConfidenceBadge(confidence: string): { bg: string; text: string; label: string } {
		switch (confidence) {
			case 'high':
				return {
					bg: 'bg-green-100 dark:bg-green-900/30',
					text: 'text-green-700 dark:text-green-300',
					label: 'High'
				};
			case 'medium':
				return {
					bg: 'bg-blue-100 dark:bg-blue-900/30',
					text: 'text-blue-700 dark:text-blue-300',
					label: 'Medium'
				};
			case 'low':
				return {
					bg: 'bg-amber-100 dark:bg-amber-900/30',
					text: 'text-amber-700 dark:text-amber-300',
					label: 'Low'
				};
			default:
				return {
					bg: 'bg-gray-100 dark:bg-gray-800',
					text: 'text-gray-700 dark:text-gray-300',
					label: confidence
				};
		}
	}

	// Build diff lines for visualization
	interface DiffLine {
		type: 'context' | 'deletion' | 'addition';
		content: string;
		lineNum?: number;
	}

	function buildDiffLines(diff: PendingDiff | null, content: string): DiffLine[] {
		if (!diff) return [];

		const lines: DiffLine[] = [];
		const contentLines = content.split('\n');

		// Find where the old value appears in content
		const oldValue = diff.oldValue || '';
		const newValue = diff.newValue || '';

		// Simple approach: show context around the change
		let foundIndex = -1;
		if (oldValue) {
			for (let i = 0; i < contentLines.length; i++) {
				if (contentLines[i].includes(oldValue.trim())) {
					foundIndex = i;
					break;
				}
			}
		}

		// Show 2 lines of context before
		const startContext = Math.max(0, foundIndex - 2);
		const endContext = Math.min(contentLines.length - 1, foundIndex + 2);

		for (let i = startContext; i <= endContext; i++) {
			if (i === foundIndex && oldValue) {
				// Deletion line
				lines.push({ type: 'deletion', content: oldValue, lineNum: i + 1 });
				// Addition line
				if (newValue) {
					lines.push({ type: 'addition', content: newValue });
				}
			} else if (i >= 0 && i < contentLines.length) {
				lines.push({ type: 'context', content: contentLines[i], lineNum: i + 1 });
			}
		}

		// If we couldn't find context, just show old/new directly
		if (lines.length === 0) {
			if (oldValue) {
				lines.push({ type: 'deletion', content: oldValue });
			}
			if (newValue) {
				lines.push({ type: 'addition', content: newValue });
			}
		}

		return lines;
	}

	$: diffLines = buildDiffLines(currentDiff, currentContent);
	$: confidenceBadge = currentDiff ? getConfidenceBadge(currentDiff.confidence) : null;

	// Navigation
	function prevDiff() {
		if (canGoPrev) currentDiffIndex--;
	}

	function nextDiff() {
		if (canGoNext) currentDiffIndex++;
	}

	// Actions
	async function handleApprove() {
		if (!currentDiff || processing) return;

		processing = true;
		try {
			await approveDiff($user.id, label, currentDiff.id, localStorage.token);
			dispatch('approved', { diffId: currentDiff.id });

			// Adjust index if needed
			if (currentDiffIndex >= diffs.length - 1 && currentDiffIndex > 0) {
				currentDiffIndex--;
			}
		} catch (e) {
			console.error('Approve failed:', e);
			dispatch('error', { message: `${e}` });
		} finally {
			processing = false;
		}
	}

	async function handleReject() {
		if (!currentDiff || processing) return;

		processing = true;
		try {
			await rejectDiff($user.id, label, currentDiff.id, localStorage.token);
			dispatch('rejected', { diffId: currentDiff.id });

			// Adjust index if needed
			if (currentDiffIndex >= diffs.length - 1 && currentDiffIndex > 0) {
				currentDiffIndex--;
			}
		} catch (e) {
			console.error('Reject failed:', e);
			dispatch('error', { message: `${e}` });
		} finally {
			processing = false;
		}
	}

	function handleDismiss() {
		dispatch('dismiss');
	}

	// Keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if (processing) return;

		// Ignore if typing in input
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			return;
		}

		switch (event.key.toLowerCase()) {
			case 'a':
				event.preventDefault();
				handleApprove();
				break;
			case 'r':
				event.preventDefault();
				handleReject();
				break;
			case 'arrowleft':
			case 'arrowup':
				event.preventDefault();
				prevDiff();
				break;
			case 'arrowright':
			case 'arrowdown':
				event.preventDefault();
				nextDiff();
				break;
			case 'escape':
			case 'e':
				event.preventDefault();
				handleDismiss();
				break;
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
	});

	// Reset index when diffs change
	$: if (diffs) {
		currentDiffIndex = Math.min(currentDiffIndex, Math.max(0, diffs.length - 1));
	}
</script>

<div
	class="absolute inset-0 flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg z-20 overflow-hidden"
>
	<!-- Header -->
	<div
		class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850"
	>
		<div class="flex items-center gap-3">
			<span class="text-sm font-medium">
				{diffs.length}
				{diffs.length === 1 ? $i18n.t('pending change') : $i18n.t('pending changes')}
			</span>

			{#if hasMultipleDiffs}
				<div class="flex items-center gap-1">
					<button
						class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition"
						disabled={!canGoPrev}
						on:click={prevDiff}
						title={$i18n.t('Previous')}
					>
						<ChevronLeft className="size-4" />
					</button>
					<span class="text-xs text-gray-500 min-w-[3rem] text-center">
						{currentDiffIndex + 1} / {diffs.length}
					</span>
					<button
						class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition"
						disabled={!canGoNext}
						on:click={nextDiff}
						title={$i18n.t('Next')}
					>
						<ChevronRight className="size-4" />
					</button>
				</div>
			{/if}
		</div>

		<button
			class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
			on:click={handleDismiss}
		>
			{$i18n.t('Edit Directly')} (E)
		</button>
	</div>

	<!-- Diff Content -->
	<div class="flex-1 overflow-auto">
		{#if currentDiff}
			<!-- Confidence and reasoning -->
			<div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
				<div class="flex items-center gap-2 mb-2">
					{#if confidenceBadge}
						<span
							class="px-2 py-0.5 rounded text-xs font-medium {confidenceBadge.bg} {confidenceBadge.text}"
						>
							{confidenceBadge.label} confidence
						</span>
					{/if}
					<span class="text-xs text-gray-500">{currentDiff.operation}</span>
				</div>
				<p class="text-sm text-gray-600 dark:text-gray-400 italic">
					"{currentDiff.reasoning}"
				</p>
			</div>

			<!-- Diff lines -->
			<div class="font-mono text-sm">
				{#each diffLines as line}
					{#if line.type === 'context'}
						<div class="px-4 py-0.5 flex text-gray-600 dark:text-gray-400">
							<span class="w-8 text-right mr-3 text-gray-400 select-none">{line.lineNum || ''}</span>
							<span class="flex-1 whitespace-pre-wrap">{line.content}</span>
						</div>
					{:else if line.type === 'deletion'}
						<div
							class="px-4 py-0.5 flex bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
						>
							<span class="w-8 text-right mr-3 text-red-400 select-none"
								>{line.lineNum || ''}</span
							>
							<span class="w-4 text-center text-red-500 select-none">-</span>
							<span class="flex-1 whitespace-pre-wrap">{line.content}</span>
						</div>
					{:else if line.type === 'addition'}
						<div
							class="px-4 py-0.5 flex bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
						>
							<span class="w-8 text-right mr-3 text-green-400 select-none"></span>
							<span class="w-4 text-center text-green-500 select-none">+</span>
							<span class="flex-1 whitespace-pre-wrap">{line.content}</span>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>

	<!-- Action buttons -->
	<div
		class="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850"
	>
		<div class="text-xs text-gray-400">
			<kbd class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">A</kbd> approve ·
			<kbd class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">R</kbd> reject ·
			<kbd class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">←</kbd><kbd
				class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">→</kbd
			> navigate
		</div>

		<div class="flex items-center gap-2">
			<button
				class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition disabled:opacity-50"
				disabled={processing}
				on:click={handleReject}
			>
				<XMark className="size-4" />
				{$i18n.t('Reject')}
			</button>
			<button
				class="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition disabled:opacity-50"
				disabled={processing}
				on:click={handleApprove}
			>
				<CheckCircle className="size-4" />
				{$i18n.t('Approve')}
			</button>
		</div>
	</div>
</div>
