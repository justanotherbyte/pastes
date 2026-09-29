import type { APIRoute } from 'astro';
import { isPasteId, verifyPassword } from '../../../../lib/crypto';
import { getPaste } from '../../../../lib/pastes';

export const prerender = false;

/** Unlock a password-protected paste. Body: { password } → { content, language } */
export const POST: APIRoute = async ({ params, request }) => {
	const id = params.id ?? '';
	const paste = isPasteId(id) ? await getPaste(id) : null;
	if (!paste) return Response.json({ error: 'Paste not found' }, { status: 404 });

	let password: unknown;
	try {
		({ password } = (await request.json()) as { password?: unknown });
	} catch {
		return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const unlocked =
		!paste.password_hash ||
		(typeof password === 'string' && (await verifyPassword(password, paste.password_hash, paste.password_salt!)));
	if (!unlocked) return Response.json({ error: 'Wrong password' }, { status: 401 });

	return Response.json({ content: paste.content, language: paste.language });
};
