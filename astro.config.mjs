// @ts-check
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import hljs from 'highlight.js';

// Pull the language list straight out of highlight.js at build time so the
// dropdown always matches whatever version is installed. Only the list is
// inlined; the grammars themselves are lazy-loaded per language on the client.
const languages = hljs
	.listLanguages()
	.map((id) => {
		const lang = hljs.getLanguage(id);
		return { id, name: lang?.name ?? id, aliases: lang?.aliases ?? [] };
	})
	.sort((a, b) => a.name.localeCompare(b.name));

// https://astro.build/config
export default defineConfig({
	// No images or sessions here, so skip the IMAGES / SESSION bindings the adapter would provision.
	adapter: cloudflare({ imageService: 'passthrough' }),
	session: false,
	vite: {
		plugins: [tailwindcss()],
		// Pre-bundle up front; discovering it late leaves stale dep-cache hashes after dev restarts.
		optimizeDeps: { include: ['highlight.js/lib/core'] },
		define: {
			__HLJS_LANGUAGES__: JSON.stringify(languages),
		},
	},
	fonts: [
		{
			provider: fontProviders.google(),
			name: 'JetBrains Mono',
			cssVariable: '--font-jetbrains',
			weights: [400, 500, 700],
			styles: ['normal', 'italic'],
			subsets: ['latin'],
			fallbacks: ['monospace'],
		},
	],
});
