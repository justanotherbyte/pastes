const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 6;

// Workers caps PBKDF2 at 100k iterations.
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

/** Random 6-character alphanumeric id, using rejection sampling to avoid modulo bias. */
export function generatePasteId(): string {
	// 248 is the largest multiple of 62 that fits in a byte.
	const limit = 256 - (256 % ID_ALPHABET.length);
	let id = '';
	while (id.length < ID_LENGTH) {
		for (const byte of crypto.getRandomValues(new Uint8Array(ID_LENGTH * 2))) {
			if (byte < limit) id += ID_ALPHABET[byte % ID_ALPHABET.length];
			if (id.length === ID_LENGTH) break;
		}
	}
	return id;
}

export function isPasteId(value: string): boolean {
	return /^[A-Za-z0-9]{6}$/.test(value);
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) => new Uint8Array(hex.match(/../g)!.map((h) => parseInt(h, 16)));

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
		key,
		HASH_BITS,
	);
	return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	return { hash: toHex(await pbkdf2(password, salt)), salt: toHex(salt) };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
	const actual = await pbkdf2(password, fromHex(salt));
	const expected = fromHex(hash);
	if (actual.length !== expected.length) return false;
	// Constant-time comparison.
	let diff = 0;
	for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
	return diff === 0;
}
