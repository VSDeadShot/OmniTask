# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OmniTask — a local-first task manager with three runtime pieces sharing one JSON data file: a React dashboard, an Express API, and a global `omni` CLI. Packaged as a Windows Electron desktop app. No backend database, no cloud sync — everything lives in `~/.omnitask/`.

## Commands

| Task | Command |
| :--- | :--- |
| Run frontend only (Vite dev server) | `npm run dev` |
| Run full desktop app in dev mode (Vite + Electron together) | `npm run electron:dev` |
| Build frontend for production | `npm run build` |
| Build the Windows installer/exe | `npm run electron:build` (outputs to `release/`) |
| Lint | `npm run lint` |
| Link the `omni` CLI globally for local testing | `npm link` |

There is no test suite/framework configured in this repo currently.

## Architecture

**Three independent processes, one shared data file.** Everything reads/writes `~/.omnitask/todos.json` (and `~/.omnitask/settings.json`):

- `server.js` — Express API (port 3001) with REST endpoints for tasks (`/api/tasks`) and settings (`/api/settings`). This is what the React frontend talks to.
- `main.js` — Electron main process. On startup it `fork()`s `server.js` as a child process, then loads either `http://localhost:5173` (dev, unpackaged) or `dist/index.html` (packaged build). Also owns the system tray, global shortcut (`CommandOrControl+Shift+T`), single-instance lock, and its own independent `setInterval` loop that reads `todos.json` directly (not via the API) to fire due/overdue desktop notifications.
- `cli.js` (installed as the `omni` bin via `npm link`) — reads/writes `todos.json` **directly via `fs`**, completely bypassing the Express API. It does not go through `server.js` at all.

Because the CLI and the API both read/write the same file independently, **any change to the task object shape (fields, defaults) must be updated in both `server.js` and `cli.js`** — there's no shared schema/model between them.

Task object shape: `{ id, project, title, description, status, priority, dueDate, tags, createdAt, completedAt }`.

**Frontend (`src/`)** is plain React 19 + Vite, no router. `App.jsx` holds all task state and API calls (fetch-based, no state library) and polls `GET /api/tasks` every 5s via `setInterval` so it stays in sync with changes made through the CLI. View switching (Dashboard / Completed / Analytics / Focus) is a single `activeTab` string in `App.jsx`, rendered inline rather than via routes.

**Project grouping uses fuzzy matching**: project names are normalized by lowercasing and stripping whitespace to merge variants like "Omni Task" / "omniTask" into one column/bucket. This normalization logic is duplicated separately in `App.jsx` (dashboard grouping) and `Analytics.jsx` (chart grouping) — keep both in sync if the matching rule changes. Display-side, occurrences of "omni task" (any spacing/case) are regex-replaced to "OmniTask" in `TaskCard.jsx` and `App.jsx`'s completed view.

**Settings** (`openAtLogin`, Pomodoro timings) live server-side in `~/.omnitask/settings.json` via `/api/settings`. `Settings.jsx` and `Pomodoro.jsx` each fetch their own copy independently on mount — there's no shared settings context/store, so if you add a new setting, wire the fetch/update into each component that needs it.

**Drag and drop** between project columns uses native HTML5 drag events (`draggable`, `onDragStart`/`onDragOver`/`onDrop`) implemented directly in `App.jsx`/`ProjectColumn.jsx`/`TaskCard.jsx`. `@dnd-kit/*` is listed in `package.json` dependencies but is **not actually used anywhere** — don't assume it's wired up.

**Styling** is vanilla CSS (`App.css`, `index.css`), dark glassmorphism theme. Components frequently use inline `style={{...}}` objects for one-off/dynamic styling rather than new CSS classes — match this pattern for small tweaks rather than introducing a CSS-in-JS library.

**Packaging**: `electron-builder` config is inlined in `package.json` (`build` key), targeting `nsis` + `portable` for Windows, output to `release/`.

## Repo notes

- `todos.json` and `ROADMAP.md` at the repo root are gitignored (stray/local files) — the real data file is `~/.omnitask/todos.json`, not the one in the repo root.
- `omnitask_icon_preview.jpg` and `remove_bg.py` are one-off asset-prep artifacts from icon creation, not part of the app itself.

## Workflow rules

- Propose one change at a time and wait for local review before moving to the next. Only `git commit`/`git push` after I explicitly approve.
- Never commit or push notes, handoff, or scratch files to the repo.
