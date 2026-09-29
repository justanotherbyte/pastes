import { PLAIN_TEXT } from '../lib/languages';
import { isLoaded, loadLanguage, toHtml } from './highlight';
import { createLanguagePicker, languageName } from './language-picker';

const app = document.getElementById('app')!;
const editor = document.getElementById('editor')!;
const input = document.getElementById('paste-input') as HTMLTextAreaElement;
const code = document.getElementById('highlight-code')!;
const password = document.getElementById('paste-password') as HTMLInputElement;
const saveButton = document.getElementById('save-paste') as HTMLButtonElement;
const status = document.getElementById('status')!;
const meta = document.getElementById('meta')!;

const state = {
	/** Id of the paste in the editor once it's saved; saved pastes are read-only. */
	savedId: app.dataset.pasteId ?? null,
	saving: false,
};

const picker = createLanguagePicker({
	initial: app.dataset.language ?? PLAIN_TEXT.id,
	onChange: scheduleRender,
});

// --- Rendering -------------------------------------------------------------

let frame = 0;
function scheduleRender() {
	cancelAnimationFrame(frame);
	frame = requestAnimationFrame(render);
}

function render() {
	const language = picker.value;
	const text = input.value;
	if (!isLoaded(language)) {
		// Show plain text while the grammar downloads, then re-render.
		code.innerHTML = toHtml(text, PLAIN_TEXT.id);
		loadLanguage(language).then(scheduleRender, () => setStatus(`Couldn't load ${languageName(language)} highlighting.`));
	} else {
		// A trailing newline needs something after it, or the <pre> collapses that last line.
		code.innerHTML = toHtml(text, language) + (text.endsWith('\n') ? ' ' : '');
	}
	const lines = text === '' ? 0 : text.split('\n').length;
	meta.textContent = `${languageName(language)} · ${lines} ${lines === 1 ? 'line' : 'lines'} · ${text.length} chars`;
}

// --- Status ------------------------------------------------------------------

function setStatus(message: string, link?: string) {
	status.textContent = message;
	if (link) {
		const a = document.createElement('a');
		a.href = link;
		a.textContent = new URL(link, location.href).href;
		a.className = 'font-semibold text-blue-500 underline duration-200 hover:text-blue-700';
		status.append(' ');
		status.appendChild(a);
	}
}

/** Saved pastes can't be edited; only New Paste stays usable. */
function lockEditor() {
	input.readOnly = true;
	saveButton.disabled = true;
	password.disabled = true;
	picker.disable();
}

// --- Saving ------------------------------------------------------------------

async function copyLink(url: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(url);
		return true;
	} catch {
		return false;
	}
}

async function save() {
	if (state.saving) return;
	if (state.savedId) {
		const url = `${location.origin}/${state.savedId}`;
		setStatus((await copyLink(url)) ? 'Pastes can’t be edited — link copied:' : 'Pastes can’t be edited:', `/${state.savedId}`);
		return;
	}
	const content = input.value;
	if (content.trim() === '') {
		setStatus('Nothing to save — the paste is empty.');
		return;
	}

	state.saving = true;
	saveButton.disabled = true;
	setStatus('Saving…');
	try {
		const res = await fetch('/api/pastes', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ content, language: picker.value, password: password.value || undefined }),
		});
		const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
		if (!res.ok || !body.id) throw new Error(body.error ?? `Save failed (${res.status})`);

		state.savedId = body.id;
		lockEditor();
		history.pushState(null, '', `/${body.id}`);
		document.title = `Pastes · ${body.id}`;
		const copied = await copyLink(`${location.origin}/${body.id}`);
		setStatus(copied ? 'Saved — link copied:' : 'Saved:', `/${body.id}`);
	} catch (err) {
		setStatus(err instanceof Error ? err.message : 'Save failed.');
	} finally {
		state.saving = false;
		saveButton.disabled = state.savedId !== null;
	}
}

// --- Unlocking ---------------------------------------------------------------

const lockedId = app.dataset.pasteId;
const unlockForm = document.getElementById('unlock-form') as HTMLFormElement | null;
unlockForm?.addEventListener('submit', async (e) => {
	e.preventDefault();
	const field = document.getElementById('unlock-password') as HTMLInputElement;
	const error = document.getElementById('unlock-error')!;
	const submit = unlockForm.querySelector('button')!;
	submit.disabled = true;
	error.hidden = true;
	try {
		const res = await fetch(`/api/pastes/${lockedId}/unlock`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ password: field.value }),
		});
		const body = (await res.json().catch(() => ({}))) as { content?: string; language?: string; error?: string };
		if (!res.ok || body.content === undefined) throw new Error(body.error ?? `Unlock failed (${res.status})`);

		input.value = body.content;
		picker.set(body.language ?? PLAIN_TEXT.id);
		document.getElementById('gate')!.remove();
		editor.hidden = false;
		render();
		input.focus();
		input.setSelectionRange(0, 0);
	} catch (err) {
		error.textContent = err instanceof Error ? err.message : 'Unlock failed.';
		error.hidden = false;
		field.select();
	} finally {
		submit.disabled = false;
	}
});

// --- Wiring ------------------------------------------------------------------

input.addEventListener('input', scheduleRender);
saveButton.addEventListener('click', save);

window.addEventListener('keydown', (e) => {
	if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
		e.preventDefault();
		save();
	}
});

window.addEventListener('beforeunload', (e) => {
	if (!state.savedId && input.value.trim() !== '') e.preventDefault();
});

// Saving pushes a URL without reloading; let back/forward load the real page.
window.addEventListener('popstate', () => location.reload());

if (!editor.hidden) {
	render();
	input.setSelectionRange(0, 0);
}
