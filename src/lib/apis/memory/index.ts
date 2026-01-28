import { YOULAB_API_BASE_URL } from '$lib/constants';
import type { MemoryBlock, BlockDetail, VersionInfo } from '$lib/stores/memory';

// Transform snake_case API response to camelCase for frontend
function transformBlock(data: any): MemoryBlock {
	return {
		label: data.label,
		pendingDiffs: data.pending_diffs ?? 0
	};
}

function transformBlockDetail(data: any): BlockDetail {
	// The new Dolt-backed API returns 'body' (markdown) directly.
	// Legacy API returned 'content_toml' and 'content_markdown'.
	const body = data.body ?? data.content_markdown ?? '';
	return {
		label: data.label,
		contentToml: data.content_toml ?? body, // Fallback to body for TOML too
		contentMarkdown: body,
		pendingDiffs: data.pending_diffs ?? 0
	};
}

function transformVersion(data: any): VersionInfo {
	return {
		sha: data.sha,
		message: data.message,
		author: data.author,
		timestamp: data.timestamp,
		isCurrent: data.is_current
	};
}

export async function getBlocks(userId: string, token: string): Promise<MemoryBlock[]> {
	let error = null;

	const res = await fetch(`${YOULAB_API_BASE_URL}/users/${userId}/blocks`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { Authorization: `Bearer ${token}` })
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err;
			console.error('Failed to fetch blocks:', err);
			return null;
		});

	if (error) throw error;
	return (res ?? []).map(transformBlock);
}

export async function getBlock(
	userId: string,
	label: string,
	token: string
): Promise<BlockDetail> {
	let error = null;

	const res = await fetch(`${YOULAB_API_BASE_URL}/users/${userId}/blocks/${label}`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { Authorization: `Bearer ${token}` })
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err;
			console.error('Failed to fetch block:', err);
			return null;
		});

	if (error) throw error;
	return transformBlockDetail(res);
}

export async function updateBlock(
	userId: string,
	label: string,
	content: string,
	token: string,
	format: 'markdown' | 'toml' = 'markdown',
	message?: string
): Promise<{ commitSha: string; label: string }> {
	let error = null;

	const res = await fetch(`${YOULAB_API_BASE_URL}/users/${userId}/blocks/${label}`, {
		method: 'PUT',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { Authorization: `Bearer ${token}` })
		},
		body: JSON.stringify({ content, format, message })
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err;
			console.error('Failed to update block:', err);
			return null;
		});

	if (error) throw error;
	return { commitSha: res.commit_sha, label: res.label };
}

export async function getBlockHistory(
	userId: string,
	label: string,
	token: string,
	limit: number = 20
): Promise<VersionInfo[]> {
	let error = null;

	const res = await fetch(
		`${YOULAB_API_BASE_URL}/users/${userId}/blocks/${label}/history?limit=${limit}`,
		{
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...(token && { Authorization: `Bearer ${token}` })
			}
		}
	)
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err;
			console.error('Failed to fetch history:', err);
			return null;
		});

	if (error) throw error;
	return (res ?? []).map(transformVersion);
}

export interface PendingDiff {
	id: string;
	block: string;
	field: string | null;
	operation: string;
	reasoning: string;
	confidence: string;
	createdAt: string;
	agentId: string;
	oldValue?: string;
	newValue?: string;
}

export async function getBlockDiffs(
	userId: string,
	label: string,
	token: string
): Promise<PendingDiff[]> {
	let error = null;

	const res = await fetch(`${YOULAB_API_BASE_URL}/users/${userId}/blocks/${label}/diffs`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { Authorization: `Bearer ${token}` })
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err;
			console.error('Failed to fetch diffs:', err);
			return null;
		});

	if (error) throw error;

	// Transform snake_case to camelCase
	return (res ?? []).map((d: any) => ({
		id: d.id,
		block: d.block,
		field: d.field,
		operation: d.operation,
		reasoning: d.reasoning,
		confidence: d.confidence,
		createdAt: d.created_at,
		agentId: d.agent_id,
		oldValue: d.old_value,
		newValue: d.new_value
	}));
}

export async function getBlockVersion(
	userId: string,
	label: string,
	commitSha: string,
	token: string
): Promise<{ content: string; sha: string }> {
	let error = null;

	const res = await fetch(
		`${YOULAB_API_BASE_URL}/users/${userId}/blocks/${label}/versions/${commitSha}`,
		{
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...(token && { Authorization: `Bearer ${token}` })
			}
		}
	)
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err;
			console.error('Failed to fetch version:', err);
			return null;
		});

	if (error) throw error;
	return res;
}

export async function restoreVersion(
	userId: string,
	label: string,
	commitSha: string,
	token: string
): Promise<{ commitSha: string; label: string }> {
	let error = null;

	const res = await fetch(`${YOULAB_API_BASE_URL}/users/${userId}/blocks/${label}/restore`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { Authorization: `Bearer ${token}` })
		},
		body: JSON.stringify({ commit_sha: commitSha })
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err;
			console.error('Failed to restore version:', err);
			return null;
		});

	if (error) throw error;
	return { commitSha: res.commit_sha, label: res.label };
}

export async function approveDiff(
	userId: string,
	label: string,
	diffId: string,
	token: string
): Promise<{ diffId: string; commitSha: string }> {
	let error = null;

	const res = await fetch(
		`${YOULAB_API_BASE_URL}/users/${userId}/blocks/${label}/diffs/${diffId}/approve`,
		{
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...(token && { Authorization: `Bearer ${token}` })
			}
		}
	)
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err;
			console.error('Failed to approve diff:', err);
			return null;
		});

	if (error) throw error;
	return { diffId: res.diff_id, commitSha: res.commit_sha };
}

export async function rejectDiff(
	userId: string,
	label: string,
	diffId: string,
	token: string,
	reason?: string
): Promise<{ status: string; diffId: string }> {
	let error = null;

	const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
	const res = await fetch(
		`${YOULAB_API_BASE_URL}/users/${userId}/blocks/${label}/diffs/${diffId}/reject${params}`,
		{
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...(token && { Authorization: `Bearer ${token}` })
			}
		}
	)
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err;
			console.error('Failed to reject diff:', err);
			return null;
		});

	if (error) throw error;
	return { status: res.status, diffId: res.diff_id };
}

// Background agents API
export interface ThreadRun {
	id: string;
	chatId: string;
	date: string;
	displayDate: string;
}

export interface BackgroundAgent {
	name: string;
	pendingDiffs: number;
	threads: ThreadRun[];
}

export async function getBackgroundAgents(
	userId: string,
	token: string
): Promise<BackgroundAgent[]> {
	let error = null;

	const res = await fetch(`${YOULAB_API_BASE_URL}/users/${userId}/agents`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { Authorization: `Bearer ${token}` })
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err;
			console.error('Failed to fetch background agents:', err);
			return null;
		});

	if (error) throw error;

	// Transform snake_case to camelCase
	return (res ?? []).map((agent: any) => ({
		name: agent.name,
		pendingDiffs: agent.pending_diffs,
		threads: (agent.threads ?? []).map((t: any) => ({
			id: t.id,
			chatId: t.chat_id,
			date: t.date,
			displayDate: t.display_date
		}))
	}));
}
