/**
 * Folder management utilities for YouLab chat organization.
 *
 * Provides functions to ensure module and agent folders exist,
 * and to find the most recent thread in a folder.
 */

import { createNewFolder, getFolders } from '$lib/apis/folders';
import { getChatListByFolderId } from '$lib/apis/chats';

// Cache of folder IDs by name to prevent repeated API calls
let folderCache: Record<string, string> = {};

/**
 * Ensure a folder exists for a module. Creates it if it doesn't exist.
 *
 * @param token - Auth token
 * @param moduleId - The module model ID
 * @param moduleName - Display name for the folder
 * @returns The folder ID
 */
export async function ensureModuleFolder(
	token: string,
	moduleId: string,
	moduleName: string
): Promise<string> {
	const folderName = moduleName; // No emoji prefix

	// Check cache first
	if (folderCache[folderName]) {
		return folderCache[folderName];
	}

	// Fetch existing folders
	const folders = await getFolders(token);
	const existing = folders?.find((f: { name: string; id: string }) => f.name === folderName);

	if (existing) {
		folderCache[folderName] = existing.id;
		return existing.id;
	}

	// Create new folder
	const newFolder = await createNewFolder(token, {
		name: folderName,
		meta: {
			type: 'module',
			moduleId: moduleId
		}
	});

	folderCache[folderName] = newFolder.id;
	return newFolder.id;
}

/**
 * Ensure a folder exists for a background agent. Creates it if it doesn't exist.
 *
 * @param token - Auth token
 * @param agentId - The agent ID
 * @param agentName - Display name for the folder
 * @returns The folder ID
 */
export async function ensureAgentFolder(
	token: string,
	agentId: string,
	agentName: string
): Promise<string> {
	const folderName = agentName; // No emoji prefix

	if (folderCache[folderName]) {
		return folderCache[folderName];
	}

	const folders = await getFolders(token);
	const existing = folders?.find((f: { name: string; id: string }) => f.name === folderName);

	if (existing) {
		folderCache[folderName] = existing.id;
		return existing.id;
	}

	const newFolder = await createNewFolder(token, {
		name: folderName,
		meta: {
			type: 'background_agent',
			agentId: agentId
		}
	});

	folderCache[folderName] = newFolder.id;
	return newFolder.id;
}

/**
 * Get the most recent thread (chat) ID in a folder.
 *
 * @param token - Auth token
 * @param folderId - The folder ID to search
 * @returns The chat ID of the most recent thread, or null if empty
 */
export async function getMostRecentThreadInFolder(
	token: string,
	folderId: string
): Promise<string | null> {
	// Get chats in folder, sorted by updated_at desc (default behavior)
	const chats = await getChatListByFolderId(token, folderId);
	if (chats && chats.length > 0) {
		return chats[0].id; // Most recent
	}
	return null;
}

/**
 * Clear the folder cache. Call this when folders might have changed externally.
 */
export function clearFolderCache() {
	folderCache = {};
}
