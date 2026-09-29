export interface Language {
	id: string;
	name: string;
	aliases: string[];
}

/** Every highlight.js language, sorted by display name (injected by astro.config.mjs). */
export const LANGUAGES: Language[] = __HLJS_LANGUAGES__;

/** Sentinel language: stored as-is and rendered without highlighting. */
export const PLAIN_TEXT: Language = { id: 'text', name: 'Plain Text', aliases: ['txt', 'plain'] };

const known = new Set(LANGUAGES.map((l) => l.id));

export function isValidLanguage(id: string): boolean {
	return id === PLAIN_TEXT.id || known.has(id);
}
