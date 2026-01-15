/**
 * Notes-compatible API client for YouLab memory blocks.
 *
 * Uses the same interface as OpenWebUI's notes API but routes
 * to YouLab's git-backed storage adapter at /api/you/notes/.
 */

import { YOULAB_API_BASE_URL } from '$lib/constants';

export type NoteContent = {
	json: object | null;
	html: string;
	md: string;
};

export type NoteVersion = {
	json: object | null;
	html: string;
	md: string;
	sha: string;
	message: string;
	timestamp: string;
};

export type NoteData = {
	content: NoteContent;
	versions: NoteVersion[];
	files: object[] | null;
};

export type NoteModel = {
	id: string;
	user_id: string;
	title: string;
	data: NoteData;
	meta: object | null;
	access_control: object | null;
	created_at: number;
	updated_at: number;
	write_access?: boolean;
};

export type NoteItem = {
	id: string;
	title: string;
	data: object | null;
	updated_at: number;
	created_at: number;
};

export type NoteForm = {
	title: string;
	data?: {
		content?: {
			md?: string;
		};
		files?: object[];
	};
	meta?: object | null;
	access_control?: object | null;
};

/**
 * Get all memory blocks as notes.
 */
export async function getMemoryNotes(token: string, userId: string): Promise<NoteItem[]> {
	const res = await fetch(`${YOULAB_API_BASE_URL}/api/you/notes/`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
			'X-User-Id': userId
		}
	});

	if (!res.ok) {
		const error = await res.json().catch(() => ({ detail: res.statusText }));
		throw new Error(error.detail || 'Failed to fetch memory notes');
	}

	return res.json();
}

/**
 * Get a single memory block as a note.
 */
export async function getMemoryNoteById(
	token: string,
	userId: string,
	noteId: string
): Promise<NoteModel> {
	const res = await fetch(`${YOULAB_API_BASE_URL}/api/you/notes/${noteId}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
			'X-User-Id': userId
		}
	});

	if (!res.ok) {
		const error = await res.json().catch(() => ({ detail: res.statusText }));
		throw new Error(error.detail || 'Note not found');
	}

	return res.json();
}

/**
 * Update a memory block via notes API.
 */
export async function updateMemoryNoteById(
	token: string,
	userId: string,
	noteId: string,
	note: NoteForm
): Promise<NoteModel> {
	const res = await fetch(`${YOULAB_API_BASE_URL}/api/you/notes/${noteId}/update`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
			'X-User-Id': userId
		},
		body: JSON.stringify(note)
	});

	if (!res.ok) {
		const error = await res.json().catch(() => ({ detail: res.statusText }));
		throw new Error(error.detail || 'Failed to update note');
	}

	return res.json();
}
