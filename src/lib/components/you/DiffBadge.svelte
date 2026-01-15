<script lang="ts">
	import { getContext } from 'svelte';
	import Badge from '$lib/components/common/Badge.svelte';

	const i18n = getContext('i18n');

	export let count: number;
	// eslint-disable-next-line svelte/valid-compile
	export let label: string; // Reserved for linking to specific block diff view
</script>

<a href="/you" class="inline-block">
	<Badge type="warning" content="{count} {$i18n.t('pending')}" />
</a>
