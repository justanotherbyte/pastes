import hljs from 'highlight.js/lib/core';
import type { LanguageFn } from 'highlight.js';
import { PLAIN_TEXT } from '../lib/languages';

// One lazy chunk per grammar; only the ones actually picked get downloaded.
// (`*.js.js` are CDN wrappers of the same grammars.)
const grammars = import.meta.glob<LanguageFn>(
	['/node_modules/highlight.js/es/languages/*.js', '!/node_modules/highlight.js/es/languages/*.js.js'],
	{ import: 'default' },
);
const loaders = new Map(Object.entries(grammars).map(([path, load]) => [path.match(/([^/]+)\.js$/)![1], load]));

const pending = new Map<string, Promise<void>>();

/** Resolves once `id` is registered with highlight.js. */
export function loadLanguage(id: string): Promise<void> {
	if (id === PLAIN_TEXT.id || hljs.getLanguage(id)) return Promise.resolve();
	let promise = pending.get(id);
	if (!promise) {
		const load = loaders.get(id);
		promise = load
			? load().then((grammar) => hljs.registerLanguage(id, grammar))
			: Promise.reject(new Error(`Unknown language: ${id}`));
		pending.set(id, promise);
	}
	return promise;
}

export function isLoaded(id: string): boolean {
	return id === PLAIN_TEXT.id || hljs.getLanguage(id) !== undefined;
}

export function escapeHtml(text: string): string {
	return text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
}

/** HTML for `text` in `id`; the grammar must already be loaded. */
export function toHtml(text: string, id: string): string {
	if (id === PLAIN_TEXT.id || !hljs.getLanguage(id)) return escapeHtml(text);
	return hljs.highlight(text, { language: id, ignoreIllegals: true }).value;
}
