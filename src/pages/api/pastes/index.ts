import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isValidLanguage } from '../../../lib/languages';
import { createPaste, MAX_CONTENT_BYTES } from '../../../lib/pastes';

export const prerender = false;

const MAX_PASSWORD_LENGTH = 256;

/** Create a paste. Body: { content, language, password? } → { id } */
export const POST: APIRoute = async ({ request }) => {
	// Pastes are anonymous, so the client IP is the only key available.
	const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
	const { success } = await env.CREATE_RATE_LIMITER.limit({ key: ip });
	if (!success) {
		return Response.json(
			{ error: 'Too many pastes — try again in a minute' },
			{ status: 429, headers: { 'Retry-After': '60' } },
		);
	}

	let body: { content?: unknown; language?: unknown; password?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { content, language = 'text', password } = body;
	if (typeof content !== 'string' || content.trim() === '') {
		return Response.json({ error: 'Paste is empty' }, { status: 400 });
	}
	if (new TextEncoder().encode(content).byteLength > MAX_CONTENT_BYTES) {
		return Response.json({ error: 'Paste is larger than 1 MB' }, { status: 413 });
	}
	if (typeof language !== 'string' || !isValidLanguage(language)) {
		return Response.json({ error: 'Unknown language' }, { status: 400 });
	}
	if (password != null && (typeof password !== 'string' || password.length > MAX_PASSWORD_LENGTH)) {
		return Response.json({ error: 'Invalid password' }, { status: 400 });
	}

	const id = await createPaste(content, language, password || null);
	return Response.json({ id }, { status: 201 });
};
