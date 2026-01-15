<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	import { marked } from 'marked';

	import { PaneGroup, Pane, PaneResizer } from 'paneforge';
	import { WEBUI_BASE_URL } from '$lib/constants';
	import { chatCompletion } from '$lib/apis/openai';
	import { uploadFile, getFileById } from '$lib/apis/files';

	import {
		config,
		settings,
		user,
		WEBUI_NAME
	} from '$lib/stores';
	import { selectedBlock, blockHistory } from '$lib/stores/memory';
	import {
		getBlock,
		updateBlock,
		getBlockHistory,
		getBlockDiffs,
		type PendingDiff
	} from '$lib/apis/memory';

	import RichTextInput from '$lib/components/common/RichTextInput.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import ArrowUturnLeft from '$lib/components/icons/ArrowUturnLeft.svelte';
	import ArrowUturnRight from '$lib/components/icons/ArrowUturnRight.svelte';
	import SparklesSolid from '$lib/components/icons/SparklesSolid.svelte';
	import EllipsisHorizontal from '$lib/components/icons/EllipsisHorizontal.svelte';
	import AiMenu from '$lib/components/notes/AIMenu.svelte';
	import BlockEditorPanel from './BlockEditorPanel.svelte';
	import DiffBadge from './DiffBadge.svelte';
	import DiffApprovalOverlay from './DiffApprovalOverlay.svelte';

	const i18n = getContext('i18n');

	export let label: string;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let editor: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let inputElement: any = null;
	let loading = true;

	// Block data
	// TODO(ARI-82): Update to use 'body' when Phase 1 storage format migration completes
	let markdownContent = '';
	let displayName = '';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let files: any[] = [];
	let pendingDiffs: PendingDiff[] = [];

	// Editor state
	let wordCount = 0;
	let charCount = 0;
	let editing = false;
	let streaming = false;
	let stopResponseFlag = false;

	// UI state
	let showPanel = false;
	let selectedPanel: 'settings' | 'chat' = 'settings';
	let selectedModelId = '';

	// Diff approval UI state
	let showDiffOverlay = true; // Show by default when diffs exist

	// Autosave
	let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastSavedContent = '';
	let autosaveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';

	$: displayName = label
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());

	// Reset diff overlay when diffs change
	$: if (pendingDiffs.length > 0) {
		showDiffOverlay = true;
	}

	// Generate UUID for file tracking
	const generateUUID = () => {
		return crypto.randomUUID();
	};

	// File upload handling
	const uploadFileHandler = async (file: File) => {
		const tempItemId = generateUUID();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const fileItem: any = {
			type: 'file',
			file: '',
			id: null,
			url: '',
			name: file.name,
			status: 'uploading',
			size: file.size,
			error: '',
			itemId: tempItemId
		};

		if (fileItem.size === 0) {
			toast.error($i18n.t('You cannot upload an empty file.'));
			return null;
		}

		files = [...files, fileItem];

		try {
			const uploadedFile = await uploadFile(localStorage.token, file, null);

			if (uploadedFile) {
				if (uploadedFile.error) {
					toast.warning(uploadedFile.error);
				}

				fileItem.status = 'uploaded';
				fileItem.file = await getFileById(localStorage.token, uploadedFile.id);
				fileItem.id = uploadedFile.id;
				fileItem.url = `${uploadedFile.id}`;
				files = files;
			} else {
				files = files.filter((item) => item?.itemId !== tempItemId);
			}
		} catch (e) {
			toast.error(`${e}`);
			files = files.filter((item) => item?.itemId !== tempItemId);
		}

		return fileItem;
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const inputFileHandler = async (file: File): Promise<any> => {
		if (file.type.startsWith('image/')) {
			const reader = new FileReader();
			return new Promise((resolve) => {
				reader.onload = async (event) => {
					const imageUrl = event.target?.result as string;
					const fileId = generateUUID();
					const fileItem = {
						id: fileId,
						type: 'image',
						url: imageUrl
					};
					files = [...files, fileItem];
					resolve(fileItem);
				};
				reader.readAsDataURL(file);
			});
		} else {
			return await uploadFileHandler(file);
		}
	};

	const init = async () => {
		loading = true;
		try {
			const block = await getBlock($user.id, label, localStorage.token);
			selectedBlock.set(block);
			// TODO(ARI-82): Update to use block.body when Phase 1 completes
			markdownContent = block.contentMarkdown;
			lastSavedContent = markdownContent;

			const history = await getBlockHistory($user.id, label, localStorage.token);
			blockHistory.set(history);

			const diffs = await getBlockDiffs($user.id, label, localStorage.token);
			console.log('[BlockEditor] Fetched diffs:', diffs, 'for user:', $user.id, 'label:', label);
			pendingDiffs = diffs;
		} catch (e) {
			toast.error($i18n.t('Failed to load block'));
			console.error(e);
			goto('/you');
			return;
		}
		loading = false;
	};

	// Autosave handler
	const scheduleAutosave = () => {
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
		}

		debounceTimeout = setTimeout(async () => {
			if (markdownContent !== lastSavedContent && markdownContent.trim()) {
				autosaveStatus = 'saving';
				try {
					await updateBlock(
						$user.id,
						label,
						markdownContent,
						localStorage.token,
						'markdown',
						`Autosave ${label}`
					);
					lastSavedContent = markdownContent;
					autosaveStatus = 'saved';
					setTimeout(() => {
						autosaveStatus = 'idle';
					}, 2000);
				} catch (e) {
					autosaveStatus = 'error';
					console.error('Autosave failed:', e);
				}
			}
		}, 200);
	};

	// AI content enhancement
	const enhanceContentHandler = async () => {
		if (!selectedModelId) {
			toast.error($i18n.t('Please select a model'));
			return;
		}

		editing = true;
		streaming = true;
		stopResponseFlag = false;

		const systemPrompt = `Enhance the memory block content while preserving its structure and key information.
Improve clarity, add relevant details, and fix any grammar issues.
Return only the enhanced markdown content.`;

		try {
			const [res, controller] = await chatCompletion(
				localStorage.token,
				{
					model: selectedModelId,
					stream: true,
					messages: [
						{ role: 'system', content: systemPrompt },
						{ role: 'user', content: markdownContent }
					]
				},
				`${WEBUI_BASE_URL}/api`
			);

			if (res && res.ok && res.body) {
				let enhancedContent = '';
				const reader = res.body
					.pipeThrough(new TextDecoderStream())
					.getReader();

				// eslint-disable-next-line no-constant-condition
				while (true) {
					const { value, done } = await reader.read();
					if (done || stopResponseFlag) {
						if (stopResponseFlag) controller.abort();
						break;
					}

					const lines = value.split('\n');
					for (const line of lines) {
						if (line.startsWith('data: ') && line !== 'data: [DONE]') {
							try {
								const data = JSON.parse(line.slice(6));
								if (data.choices?.[0]?.delta?.content) {
									enhancedContent += data.choices[0].delta.content;
									markdownContent = enhancedContent;
								}
							} catch {
								// Ignore parse errors for incomplete chunks
							}
						}
					}
				}
			}
		} catch {
			toast.error($i18n.t('Enhancement failed'));
		}

		editing = false;
		streaming = false;
		if (editor) {
			editor.commands.setContent(marked.parse(markdownContent));
		}
	};

	const stopResponseHandler = () => {
		stopResponseFlag = true;
	};

	const handleBack = () => {
		goto('/you');
	};

	// Diff approval handlers
	async function handleDiffApproved(event: CustomEvent<{ diffId: string }>) {
		toast.success($i18n.t('Change approved'));
		await init(); // Reload block and diffs
	}

	async function handleDiffRejected(event: CustomEvent<{ diffId: string }>) {
		toast.success($i18n.t('Change rejected'));
		await init(); // Reload block and diffs
	}

	async function handleDiffError(event: CustomEvent<{ message: string }>) {
		toast.error(event.detail.message);
	}

	function handleDiffDismiss() {
		showDiffOverlay = false;
	}

	onMount(async () => {
		if ($settings?.models) {
			selectedModelId = $settings.models[0];
		} else if ($config?.default_models) {
			selectedModelId = $config.default_models.split(',')[0];
		}

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
	<title>{displayName} - {$WEBUI_NAME}</title>
</svelte:head>

<PaneGroup direction="horizontal" class="w-full h-full">
	<Pane defaultSize={70} minSize={30} class="h-full flex flex-col w-full relative">
		<div class="relative flex-1 w-full h-full flex justify-center pt-3" id="block-editor">
			{#if loading}
				<div class="absolute inset-0 flex">
					<div class="m-auto">
						<Spinner className="size-5" />
					</div>
				</div>
			{:else}
				<div class="w-full flex flex-col">
					<!-- Header -->
					<div class="shrink-0 w-full flex justify-between items-center px-3.5 mb-2">
						<div class="flex items-center gap-2">
							<Tooltip content={$i18n.t('Back')}>
								<button
									class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
									on:click={handleBack}
								>
									<ArrowLeft className="size-5" />
								</button>
							</Tooltip>

							<h1 class="text-xl font-medium">{displayName}</h1>
						</div>

						<div class="flex items-center gap-1">
							<!-- Review changes button (when diffs exist and overlay is hidden) -->
							{#if pendingDiffs.length > 0 && !showDiffOverlay}
								<button
									class="px-2 py-1 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition"
									on:click={() => (showDiffOverlay = true)}
								>
									{$i18n.t('Review Changes')}
								</button>
							{/if}

							<!-- Autosave status -->
							{#if autosaveStatus === 'saving'}
								<span class="text-xs text-gray-400">{$i18n.t('Saving...')}</span>
							{:else if autosaveStatus === 'saved'}
								<span class="text-xs text-green-500">{$i18n.t('Saved')}</span>
							{:else if autosaveStatus === 'error'}
								<span class="text-xs text-red-500">{$i18n.t('Save failed')}</span>
							{/if}

							<!-- Undo/Redo -->
							{#if editor}
								<button
									class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-30"
									on:click={() => editor.chain().focus().undo().run()}
									disabled={!editor.can().undo()}
								>
									<ArrowUturnLeft className="size-4" />
								</button>
								<button
									class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-30"
									on:click={() => editor.chain().focus().redo().run()}
									disabled={!editor.can().redo()}
								>
									<ArrowUturnRight className="size-4" />
								</button>
							{/if}

							<!-- Settings panel toggle -->
							<Tooltip content={$i18n.t('Settings')}>
								<button
									class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
									on:click={() => {
										showPanel = !showPanel;
										selectedPanel = 'settings';
									}}
								>
									<EllipsisHorizontal className="size-5" />
								</button>
							</Tooltip>
						</div>
					</div>

					<!-- Metadata bar -->
					<div class="px-4 flex items-center gap-2 text-xs text-gray-500 mb-2">
						<span>{$i18n.t('Memory Block')}</span>
						{#if editor}
							<span>|</span>
							<span>{$i18n.t('{{COUNT}} words', { COUNT: wordCount })}</span>
							<span>{$i18n.t('{{COUNT}} characters', { COUNT: charCount })}</span>
						{/if}
					</div>

					<!-- Editor -->
					<div class="flex-1 w-full h-full overflow-auto px-3.5 relative" id="block-content-container">
						{#if editing}
							<div
								class="w-full h-full fixed top-0 left-0 {streaming
									? ''
									: 'backdrop-blur-xs bg-white/10 dark:bg-gray-900/10'} flex items-center justify-center z-10"
							></div>
						{/if}

						<RichTextInput
							bind:this={inputElement}
							bind:editor
							id={`block-${label}`}
							className="input-prose-sm px-0.5 h-[calc(100%-2rem)] {pendingDiffs.length > 0 && showDiffOverlay
								? 'opacity-30 pointer-events-none'
								: ''}"
							html={marked.parse(markdownContent)}
							placeholder={$i18n.t('Start writing...')}
							editable={!editing && !(pendingDiffs.length > 0 && showDiffOverlay)}
							fileHandler={true}
							image={true}
							{files}
							onFileDrop={(currentEditor, droppedFiles, pos) => {
								droppedFiles.forEach(async (file: File) => {
									const fileItem = await inputFileHandler(file);
									if (fileItem?.type === 'image') {
										currentEditor
											.chain()
											.insertContentAt(pos, {
												type: 'image',
												attrs: { src: `data://${fileItem.id}` }
											})
											.focus()
											.run();
									}
								});
							}}
							onChange={(content) => {
								markdownContent = content.md;

								if (editor) {
									wordCount = editor.storage.characterCount.words();
									charCount = editor.storage.characterCount.characters();
								}

								scheduleAutosave();
							}}
						/>

						<!-- Diff Approval Overlay -->
						{#if pendingDiffs.length > 0 && showDiffOverlay}
							<DiffApprovalOverlay
								{label}
								diffs={pendingDiffs}
								currentContent={markdownContent}
								on:approved={handleDiffApproved}
								on:rejected={handleDiffRejected}
								on:error={handleDiffError}
								on:dismiss={handleDiffDismiss}
							/>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- AI FAB -->
		<div class="absolute z-50 bottom-0 right-0 p-3.5 flex select-none">
			{#if editing}
				<button
					class="p-2.5 flex rounded-full bg-white dark:bg-gray-850 hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-xl"
					on:click={stopResponseHandler}
				>
					<Spinner className="size-5" />
				</button>
			{:else}
				<AiMenu
					onEdit={enhanceContentHandler}
					onChat={() => {
						showPanel = true;
						selectedPanel = 'chat';
					}}
				>
					<div
						class="cursor-pointer p-2.5 flex rounded-full border border-gray-50 bg-white dark:border-none dark:bg-gray-850 hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-xl"
					>
						<SparklesSolid />
					</div>
				</AiMenu>
			{/if}
		</div>
	</Pane>

	<!-- Side Panel -->
	{#if showPanel}
		<PaneResizer class="w-1 bg-gray-100 dark:bg-gray-800" />
		<Pane defaultSize={30} minSize={20}>
			<BlockEditorPanel
				bind:show={showPanel}
				bind:selectedModelId
				{selectedPanel}
				{files}
				{label}
				{pendingDiffs}
				on:showDiffOverlay={() => {
					showDiffOverlay = true;
					showPanel = false;
				}}
			/>
		</Pane>
	{/if}
</PaneGroup>
