<script lang="ts">
	import { getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { WEBUI_API_BASE_URL } from '$lib/constants';
	import CheckCircle from '$lib/components/icons/CheckCircle.svelte';
	import LockClosed from '$lib/components/icons/LockClosed.svelte';
	import { ensureModuleFolder, getMostRecentThreadInFolder } from '$lib/utils/folders';
	import { selectedFolder } from '$lib/stores';
	import { getFolderById } from '$lib/apis/folders';

	const i18n = getContext('i18n');

	export let module: {
		id: string;
		name: string;
		description?: string;
		status?: 'locked' | 'available' | 'in_progress' | 'completed';
	};
	export let onClick = () => {};

	$: statusColor = {
		locked: 'text-gray-400',
		available: 'text-blue-500',
		in_progress: 'text-yellow-500',
		completed: 'text-green-500'
	}[module.status ?? 'available'];

	async function handleModuleClick(e: Event) {
		e.preventDefault();

		// Ensure folder exists for this module
		const folderId = await ensureModuleFolder(localStorage.token, module.id, module.name);

		// Set the selected folder so new chats go into it
		const folder = await getFolderById(localStorage.token, folderId);
		if (folder) {
			selectedFolder.set(folder);
		}

		// Find most recent thread in the folder
		const threadId = await getMostRecentThreadInFolder(localStorage.token, folderId);

		if (threadId) {
			// Navigate to existing thread
			goto(`/c/${threadId}`);
		} else {
			// No existing thread - create new chat with this model
			goto(`/?model=${module.id}`);
		}

		onClick();
	}
</script>

{#if module}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="flex justify-center text-gray-800 dark:text-gray-200 cursor-pointer relative group"
		data-id={module.id}
	>
		<a
			class="grow flex items-center space-x-2.5 rounded-xl px-2.5 py-[7px] group-hover:bg-gray-100 dark:group-hover:bg-gray-900 transition"
			href="/?model={module.id}"
			on:click={handleModuleClick}
			draggable="false"
		>
			<div class="self-center shrink-0">
				<img
					src={`${WEBUI_API_BASE_URL}/models/model/profile/image?id=${module.id}&lang=${$i18n.language}`}
					class="size-5 rounded-full -translate-x-[0.5px]"
					alt={module.name}
				/>
			</div>

			<div class="flex flex-col flex-1 min-w-0">
				<div class="self-start text-sm font-primary line-clamp-1">
					{module.name}
				</div>
				{#if module.description}
					<div class="text-xs text-gray-500 line-clamp-1">
						{module.description}
					</div>
				{/if}
			</div>

			<!-- Status indicator -->
			<div class="self-center shrink-0 {statusColor}">
				{#if module.status === 'completed'}
					<CheckCircle className="size-4" />
				{:else if module.status === 'in_progress'}
					<!-- Simple clock icon for in-progress -->
					<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
					</svg>
				{:else if module.status === 'locked'}
					<LockClosed className="size-4" />
				{/if}
			</div>
		</a>
	</div>
{/if}
