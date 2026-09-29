import { env } from 'cloudflare:workers';
import { generatePasteId, hashPassword } from './crypto';

export interface PasteRow {
	paste_id: string;
	content: string;
	language: string;
	password_hash: string | null;
	password_salt: string | null;
}

/** D1 caps a single value at 2 MB; stay comfortably under it. */
export const MAX_CONTENT_BYTES = 1024 * 1024;

export async function getPaste(id: string): Promise<PasteRow | null> {
	return env.DB.prepare(
		'SELECT paste_id, content, language, password_hash, password_salt FROM pastes WHERE paste_id = ?',
	)
		.bind(id)
		.first<PasteRow>();
}

export async function createPaste(content: string, language: string, password: string | null): Promise<string> {
	const { hash, salt } = password ? await hashPassword(password) : { hash: null, salt: null };

	// 62^6 ids makes collisions rare, but retry a few times rather than fail.
	for (let attempt = 0; attempt < 5; attempt++) {
		const id = generatePasteId();
		try {
			await env.DB.prepare(
				'INSERT INTO pastes (paste_id, content, language, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)',
			)
				.bind(id, content, language, hash, salt)
				.run();
			return id;
		} catch (err) {
			if (!String(err).includes('UNIQUE constraint failed')) throw err;
		}
	}
	throw new Error('Could not allocate a unique paste id');
}
