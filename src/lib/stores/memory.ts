import { writable, derived } from 'svelte/store';

export interface MemoryBlock {
	label: string;
	pendingDiffs: number;
}

export interface BlockDetail {
	label: string;
	contentToml: string;
	contentMarkdown: string;
	pendingDiffs: number;
}

export interface VersionInfo {
	sha: string;
	message: string;
	author: string;
	timestamp: string;
	isCurrent: boolean;
}

export interface PendingDiff {
	id: string;
	block: string;
	field: string | null;
	operation: string;
	reasoning: string;
	confidence: string;
	createdAt: string;
}

// Store for all blocks
export const memoryBlocks = writable<MemoryBlock[]>([]);

// Derived store for total pending diffs
export const pendingDiffsCount = derived(memoryBlocks, ($blocks) =>
	$blocks.reduce((sum, b) => sum + b.pendingDiffs, 0)
);

// Currently selected block
export const selectedBlock = writable<BlockDetail | null>(null);

// Version history for selected block
export const blockHistory = writable<VersionInfo[]>([]);
