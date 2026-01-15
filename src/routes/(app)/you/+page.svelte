<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/workspace/profile', { replaceState: true });
	});
</script>

<!-- Redirect to /workspace/profile -->
<div class="w-full h-full flex justify-center items-center">
	<div class="animate-spin size-4 border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300 rounded-full"></div>
</div>
