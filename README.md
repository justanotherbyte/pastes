# Pastes

A small pastebin on Astro + Cloudflare Workers + D1, with highlight.js syntax highlighting.

## Setup

```sh
npm install
npm run db:migrate:local   # create the pastes table in the local D1 database
npm run dev
```

## Deploying

```sh
npx wrangler d1 create pastes      # copy the printed database_id into wrangler.jsonc
npm run db:migrate:remote
npm run deploy
```

## How it works

- `POST /api/pastes` `{ content, language, password? }` → `{ id }` (6-char alphanumeric id).
- `GET /:id` renders the paste, or a password prompt if it's protected.
- `POST /api/pastes/:id/unlock` `{ password }` → `{ content, language }`.
- Passwords are hashed with PBKDF2-SHA256 (100k iterations, 16-byte random salt).
- The language list comes from highlight.js at build time (`astro.config.mjs`); grammars are lazy-loaded per language in the browser.
- Pastes are immutable: saving an edited paste creates a new one.
