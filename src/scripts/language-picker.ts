import { LANGUAGES, PLAIN_TEXT, type Language } from '../lib/languages';

const ALL: Language[] = [PLAIN_TEXT, ...LANGUAGES];
const byId = new Map(ALL.map((l) => [l.id, l]));

export function languageName(id: string): string {
	return byId.get(id)?.name ?? id;
}

/** Name/id/alias match, ranked exact > prefix > substring. */
function search(query: string): Language[] {
	const q = query.trim().toLowerCase();
	if (!q) return ALL;
	const scored: [number, Language][] = [];
	for (const lang of ALL) {
		const keys = [lang.name.toLowerCase(), lang.id, ...lang.aliases];
		if (keys.includes(q)) scored.push([0, lang]);
		else if (keys.some((k) => k.startsWith(q))) scored.push([1, lang]);
		else if (keys.some((k) => k.includes(q))) scored.push([2, lang]);
	}
	return scored.sort((a, b) => a[0] - b[0]).map(([, lang]) => lang);
}

interface PickerOptions {
	initial: string;
	onChange: (id: string) => void;
}

export function createLanguagePicker({ initial, onChange }: PickerOptions) {
	const root = document.getElementById('language-picker')!;
	const button = document.getElementById('language-button') as HTMLButtonElement;
	const label = document.getElementById('language-label')!;
	const panel = document.getElementById('language-panel')!;
	const input = document.getElementById('language-search') as HTMLInputElement;
	const list = document.getElementById('language-list')!;

	let selected = byId.has(initial) ? initial : PLAIN_TEXT.id;
	let results: Language[] = [];
	let active = 0;

	function render() {
		list.replaceChildren(
			...results.map((lang, i) => {
				const li = document.createElement('li');
				li.id = `language-option-${i}`;
				li.setAttribute('role', 'option');
				li.dataset.index = String(i);
				li.setAttribute('aria-selected', String(lang.id === selected));
				li.className =
					'flex cursor-pointer justify-between gap-2 px-3 py-1.5 ' +
					(i === active ? 'bg-zinc-200 dark:bg-zinc-700 ' : '') +
					(lang.id === selected ? 'text-blue-600 dark:text-blue-500' : 'dark:text-white');
				li.innerHTML = `<span class="truncate"></span><span class="text-xs text-zinc-400"></span>`;
				li.children[0].textContent = lang.name;
				li.children[1].textContent = lang.id;
				return li;
			}),
		);
		if (results.length === 0) {
			const empty = document.createElement('li');
			empty.className = 'px-3 py-1.5 text-zinc-500 italic';
			empty.textContent = 'No matches';
			list.appendChild(empty);
			input.removeAttribute('aria-activedescendant');
		} else {
			input.setAttribute('aria-activedescendant', `language-option-${active}`);
		}
	}

	function setActive(index: number) {
		if (results.length === 0) return;
		active = (index + results.length) % results.length;
		render();
		document.getElementById(`language-option-${active}`)?.scrollIntoView({ block: 'nearest' });
	}

	function filter() {
		results = search(input.value);
		active = Math.max(0, results.findIndex((l) => l.id === selected));
		render();
	}

	function open() {
		panel.hidden = false;
		button.setAttribute('aria-expanded', 'true');
		input.value = '';
		filter();
		input.focus();
		document.getElementById(`language-option-${active}`)?.scrollIntoView({ block: 'center' });
	}

	function close(restoreFocus = true) {
		if (panel.hidden) return;
		panel.hidden = true;
		button.setAttribute('aria-expanded', 'false');
		if (restoreFocus) button.focus();
	}

	function set(id: string) {
		selected = byId.has(id) ? id : PLAIN_TEXT.id;
		label.textContent = languageName(selected);
	}

	function choose(index: number) {
		const lang = results[index];
		if (!lang) return;
		close();
		if (lang.id !== selected) {
			set(lang.id);
			onChange(lang.id);
		}
	}

	button.addEventListener('click', () => (panel.hidden ? open() : close()));
	input.addEventListener('input', filter);
	input.addEventListener('keydown', (e) => {
		const handlers: Record<string, () => void> = {
			ArrowDown: () => setActive(active + 1),
			ArrowUp: () => setActive(active - 1),
			PageDown: () => setActive(Math.min(active + 8, results.length - 1)),
			PageUp: () => setActive(Math.max(active - 8, 0)),
			Enter: () => choose(active),
			Escape: () => close(),
		};
		const handler = handlers[e.key];
		if (handler) {
			e.preventDefault();
			handler();
		}
	});
	list.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the search box
	list.addEventListener('click', (e) => {
		const option = (e.target as Element).closest<HTMLElement>('[role=option]');
		if (option) choose(Number(option.dataset.index));
	});
	document.addEventListener('pointerdown', (e) => {
		if (!root.contains(e.target as Node)) close(false);
	});
	root.addEventListener('focusout', (e) => {
		if (!root.contains(e.relatedTarget as Node | null)) close(false);
	});

	set(selected);
	return {
		get value() {
			return selected;
		},
		set,
		disable() {
			close(false);
			button.disabled = true;
		},
	};
}
