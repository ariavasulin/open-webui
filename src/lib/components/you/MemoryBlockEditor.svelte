<script lang="ts">
	/**
	 * MemoryBlockEditor - Edit memory blocks using the Notes adapter API.
	 *
	 * Features:
	 * - Rich text editing via TipTap (RichTextInput)
	 * - Git-based version history navigation (undo/redo through commits)
	 * - 200ms autosave debounce
	 * - Title editing persisted to frontmatter
	 */
	import { getContext, onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { marked } from 'marked';

	import { user, WEBUI_NAME } from '$lib/stores';
	import RichTextInput from '$lib/components/common/RichTextInput.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import ArrowUturnLeft from '$lib/components/icons/ArrowUturnLeft.svelte';
	import ArrowUturnRight from '$lib/components/icons/ArrowUturnRight.svelte';

	import {
		getMemoryNoteById,
		updateMemoryNoteById,
		type NoteModel,
		type NoteVersion
	} from '$lib/apis/memory/notes';
	import { getBlockDiffs, type PendingDiff } from '$lib/apis/memory';
	import DiffApprovalOverlay from './DiffApprovalOverlay.svelte';
	import DiffBadge from './DiffBadge.svelte';

	const i18n = getContext('i18n');

	export let label: string;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let editor: any = null;
	let loading = true;

	// Note data
	let note: NoteModel | null = null;
	let title = '';
	let versions: NoteVersion[] = [];

	// Content tracking
	let currentContent = {
		html: '',
		md: ''
	};
	let lastSavedContent = '';

	// Version navigation state
	// null = current (working) state, 0 = most recent commit, 1 = one commit older, etc.
	let versionIdx: number | null = null;

	// Autosave state
	let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
	let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';

	// Editor metrics
	let wordCount = 0;
	let charCount = 0;

	// Pending diffs
	// TODO(bug): Refreshing this page auto-rejects pending diffs - investigate cause
	let pendingDiffs: PendingDiff[] = [];
	let showDiffOverlay = true;

	async function init() {
		loading = true;
		try {
			note = await getMemoryNoteById(localStorage.token, $user.id, label);
			if (note) {
				title = note.title;
				currentContent = {
					html: note.data.content.html,
					md: note.data.content.md
				};
				lastSavedContent = note.data.content.md;
				versions = note.data.versions || [];
			}

			// Fetch pending diffs
			const diffs = await getBlockDiffs($user.id, label, localStorage.token);
			console.log('[MemoryBlockEditor] Fetched diffs:', diffs);
			pendingDiffs = diffs;
			showDiffOverlay = diffs.length > 0;
		} catch (e) {
			toast.error($i18n.t('Failed to load block'));
			console.error(e);
			goto('/you');
			return;
		}
		loading = false;
	}

	// Autosave with 200ms debounce
	function scheduleAutosave() {
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
		}

		debounceTimeout = setTimeout(async () => {
			// Don't save when viewing historical version
			if (versionIdx !== null) return;
			// Don't save if content hasn't changed
			if (currentContent.md === lastSavedContent) return;
			// Don't save empty content
			if (!currentContent.md.trim()) return;

			saveStatus = 'saving';
			try {
				const updated = await updateMemoryNoteById(localStorage.token, $user.id, label, {
					title: title,
					data: {
						content: {
							md: currentContent.md
						}
					}
				});

				note = updated;
				lastSavedContent = currentContent.md;
				versions = updated.data.versions || [];
				saveStatus = 'saved';

				setTimeout(() => {
					if (saveStatus === 'saved') saveStatus = 'idle';
				}, 2000);
			} catch (e) {
				saveStatus = 'error';
				console.error('Autosave failed:', e);
				toast.error($i18n.t('Autosave failed'));
			}
		}, 200);
	}

	// Git-based undo - navigate to previous version
	function undo() {
		if (versions.length === 0) return;

		if (versionIdx === null) {
			// Currently at working state, go to most recent commit
			versionIdx = 0;
		} else if (versionIdx < versions.length - 1) {
			// Go to older commit
			versionIdx++;
		}

		const version = versions[versionIdx];
		if (version && editor) {
			currentContent = { html: version.html, md: version.md };
			editor.commands.setContent(marked.parse(version.md));
		}
	}

	// Git-based redo - navigate to newer version
	function redo() {
		if (versionIdx === null) return;

		if (versionIdx === 0) {
			// Back to current (working) state
			versionIdx = null;
			if (note && editor) {
				currentContent = {
					html: note.data.content.html,
					md: note.data.content.md
				};
				editor.commands.setContent(marked.parse(note.data.content.md));
			}
		} else {
			// Go to newer commit
			versionIdx--;
			const version = versions[versionIdx];
			if (version && editor) {
				currentContent = { html: version.html, md: version.md };
				editor.commands.setContent(marked.parse(version.md));
			}
		}
	}

	// Restore a specific version (creates new commit)
	async function restoreVersion() {
		if (versionIdx === null || !note) return;

		const version = versions[versionIdx];
		if (!version) return;

		try {
			saveStatus = 'saving';
			const updated = await updateMemoryNoteById(localStorage.token, $user.id, label, {
				title: title,
				data: {
					content: {
						md: version.md
					}
				}
			});

			note = updated;
			currentContent = {
				html: updated.data.content.html,
				md: updated.data.content.md
			};
			lastSavedContent = updated.data.content.md;
			versions = updated.data.versions || [];
			versionIdx = null;
			saveStatus = 'saved';

			if (editor) {
				editor.commands.setContent(marked.parse(updated.data.content.md));
			}

			toast.success($i18n.t('Version restored'));

			setTimeout(() => {
				if (saveStatus === 'saved') saveStatus = 'idle';
			}, 2000);
		} catch (e) {
			saveStatus = 'error';
			toast.error($i18n.t('Failed to restore version'));
			console.error(e);
		}
	}

	// Title change handler
	function handleTitleBlur() {
		if (note && title !== note.title) {
			scheduleAutosave();
		}
	}

	function handleBack() {
		goto('/you');
	}

	// Diff approval handlers
	async function handleDiffApproved() {
		toast.success($i18n.t('Change approved'));
		await init();
	}

	async function handleDiffRejected() {
		toast.success($i18n.t('Change rejected'));
		await init();
	}

	function handleDiffError(event: CustomEvent<{ message: string }>) {
		toast.error(event.detail.message);
	}

	function handleDiffDismiss() {
		showDiffOverlay = false;
	}

	$: canUndo = versions.length > 0 && (versionIdx === null || versionIdx < versions.length - 1);
	$: canRedo = versionIdx !== null;
	$: isViewingHistory = versionIdx !== null;

	onMount(async () => {
		if (label) {
			await init();
		}
	});

	onDestroy(() => {
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
		}
	});
</script>

<svelte:head>
	<title>{title || 'Memory Block'} - {$WEBUI_NAME}</title>
</svelte:head>

<div class="h-full flex flex-col">
	<!-- Header -->
	<div class="shrink-0 flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
		<div class="flex items-center gap-3">
			<Tooltip content={$i18n.t('Back')}>
				<button
					class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
					on:click={handleBack}
				>
					<ArrowLeft className="size-5" />
				</button>
			</Tooltip>

			{#if note}
				<input
					type="text"
					class="text-xl font-medium bg-transparent border-none focus:outline-none focus:ring-0 min-w-0"
					bind:value={title}
					on:blur={handleTitleBlur}
					disabled={isViewingHistory}
					placeholder={$i18n.t('Untitled')}
				/>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<!-- Review changes button (when diffs exist and overlay is hidden) -->
			{#if pendingDiffs.length > 0 && !showDiffOverlay}
				<button
					class="px-2 py-1 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition"
					on:click={() => (showDiffOverlay = true)}
				>
					{$i18n.t('Review Changes')}
				</button>
			{/if}

			<!-- Save status -->
			<span class="text-xs text-gray-500">
				{#if saveStatus === 'saving'}
					{$i18n.t('Saving...')}
				{:else if saveStatus === 'saved'}
					<span class="text-green-500">{$i18n.t('Saved')}</span>
				{:else if saveStatus === 'error'}
					<span class="text-red-500">{$i18n.t('Error')}</span>
				{/if}
			</span>

			<!-- Undo/Redo (git-based) -->
			<div class="flex items-center gap-1">
				<Tooltip content={$i18n.t('Previous version')}>
					<button
						class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
						disabled={!canUndo}
						on:click={undo}
					>
						<ArrowUturnLeft className="size-4" />
					</button>
				</Tooltip>
				<Tooltip content={$i18n.t('Next version')}>
					<button
						class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
						disabled={!canRedo}
						on:click={redo}
					>
						<ArrowUturnRight className="size-4" />
					</button>
				</Tooltip>
			</div>

			<!-- Version indicator and restore button -->
			{#if isViewingHistory && versionIdx !== null}
				<span class="text-sm text-yellow-600 dark:text-yellow-400">
					{$i18n.t('Version {{N}} of {{TOTAL}}', { N: versionIdx + 1, TOTAL: versions.length })}
				</span>
				<button
					class="px-2 py-1 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded transition"
					on:click={restoreVersion}
				>
					{$i18n.t('Restore')}
				</button>
			{/if}
		</div>
	</div>

	<!-- Metadata bar -->
	<div class="px-4 py-2 flex items-center gap-2 text-xs text-gray-500 border-b border-gray-50 dark:border-gray-850">
		<span>{$i18n.t('Memory Block')}</span>
		{#if editor}
			<span>|</span>
			<span>{$i18n.t('{{COUNT}} words', { COUNT: wordCount })}</span>
			<span>{$i18n.t('{{COUNT}} characters', { COUNT: charCount })}</span>
		{/if}
	</div>

	<!-- Editor -->
	<div class="flex-1 overflow-auto p-4 relative">
		{#if loading}
			<div class="flex items-center justify-center h-full">
				<Spinner className="size-8" />
			</div>
		{:else if note && currentContent.md}
			<RichTextInput
				bind:editor
				id={`memory-block-${label}`}
				className="input-prose-sm px-0.5 h-[calc(100%-2rem)]"
				value={null}
				html={marked.parse(currentContent.md)}
				placeholder={$i18n.t('Start writing...')}
				editable={!isViewingHistory}
				onChange={(content) => {
					if (!isViewingHistory) {
						// Don't overwrite loaded content with empty initial state
						if (!content.md && currentContent.md) {
							return;
						}
						currentContent = {
							html: content.html,
							md: content.md
						};

						if (editor) {
							wordCount = editor.storage.characterCount?.words?.() || 0;
							charCount = editor.storage.characterCount?.characters?.() || 0;
						}

						scheduleAutosave();
					}
				}}
			/>

			<!-- Diff Approval Overlay -->
			{#if pendingDiffs.length > 0 && showDiffOverlay}
				<DiffApprovalOverlay
					{label}
					diffs={pendingDiffs}
					currentContent={currentContent.md}
					on:approved={handleDiffApproved}
					on:rejected={handleDiffRejected}
					on:error={handleDiffError}
					on:dismiss={handleDiffDismiss}
				/>
			{/if}
		{/if}
	</div>
</div>
