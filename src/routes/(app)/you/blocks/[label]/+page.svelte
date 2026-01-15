<script lang="ts">
	import { page } from '$app/stores';
	import { showSidebar } from '$lib/stores';

	import MemoryBlockEditor from '$lib/components/you/MemoryBlockEditor.svelte';

	$: label = $page.params.label;
</script>

<svelte:head>
	<title>Edit Memory Block</title>
</svelte:head>

{#if label}
	<div
		id="block-editor-container"
		class="w-full h-full {$showSidebar ? 'md:max-w-[calc(100%-var(--sidebar-width))]' : ''}"
	>
		<MemoryBlockEditor {label} />
	</div>
{/if}
