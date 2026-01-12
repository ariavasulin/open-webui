<script lang="ts">
	import { chatId, mobile, models, showSidebar } from '$lib/stores';
	import ModuleItem from './ModuleItem.svelte';

	// YouLab module metadata extension (not in base ModelMeta type)
	type YouLabMeta = {
		youlab_module?: {
			status?: 'locked' | 'available' | 'in_progress' | 'completed';
			module_index?: number;
		};
		description?: string;
	};

	type Module = {
		id: string;
		name: string;
		description?: string;
		status: 'locked' | 'available' | 'in_progress' | 'completed';
		module_index: number;
	};

	// Demo modules for development/testing (remove in production)
	const demoModules: Module[] = [
		{
			id: 'college-essay-intro',
			name: 'First Impressions',
			description: 'Craft a compelling opening',
			status: 'completed',
			module_index: 0
		},
		{
			id: 'college-essay-story',
			name: 'Your Story',
			description: 'Find your unique narrative',
			status: 'in_progress',
			module_index: 1
		},
		{
			id: 'college-essay-voice',
			name: 'Finding Your Voice',
			description: 'Develop authentic tone',
			status: 'available',
			module_index: 2
		},
		{
			id: 'college-essay-polish',
			name: 'Polish & Refine',
			description: 'Final edits and review',
			status: 'locked',
			module_index: 3
		}
	];

	// Filter models that are YouLab modules (identified by youlab_module metadata)
	$: realModules = $models
		.filter((model) => (model.info?.meta as YouLabMeta)?.youlab_module)
		.map((model) => {
			const meta = model.info?.meta as YouLabMeta;
			return {
				id: model.id,
				name: model.name,
				description: meta?.description,
				status: meta?.youlab_module?.status ?? 'available',
				module_index: meta?.youlab_module?.module_index ?? 0
			};
		})
		.sort((a, b) => a.module_index - b.module_index);

	// Use real modules if available, otherwise show demo modules
	$: modules = realModules.length > 0 ? realModules : demoModules;
</script>

<div class="mt-0.5 pb-1.5" id="module-list">
	{#each modules as module (module.id)}
		<ModuleItem
			{module}
			onClick={() => {
				chatId.set('');
				if ($mobile) {
					showSidebar.set(false);
				}
			}}
		/>
	{/each}

	{#if modules.length === 0}
		<div class="px-2.5 py-2 text-sm text-gray-500 dark:text-gray-400">
			No modules available
		</div>
	{/if}
</div>
