# 🚀 OmniTask

OmniTask is a powerful, centralized, and developer-focused task manager designed to keep track of your to-dos across multiple projects. It features a beautiful React-based desktop dashboard built with Electron, and a comprehensive global CLI, allowing you to seamlessly manage your tasks without ever leaving your terminal or IDE.

## ✨ Features

- **Native Desktop App**: Built with Electron, runs seamlessly as a standalone desktop application.
- **Global CLI Integration**: Manage tasks instantly from any directory using the `omni` command.
- **Advanced UI Dashboard**: A sleek, dark-themed glassmorphism interface built with React.
- **Drag & Drop Kanban**: Visually reorganize tasks and move them between project columns natively.
- **Click-to-Edit Everything**: Instantly edit task descriptions, deadlines (with a dark-mode native calendar), and project tags directly on the task cards.
- **Smart Project Grouping**: Fuzzy matching automatically groups tasks together regardless of spaces or capitalization (e.g., "Omni Task" and "omniTask" merge seamlessly).
- **Chronological History**: Completed tasks are automatically grouped by the exact date they were finished, keeping your history meticulously organized.
- **Strict Deadline Validation**: Calendar pickers dynamically prevent you from selecting past dates for task deadlines.
- **Single Instance Lock**: Ensures only one unified desktop app window opens, even if launched repeatedly via CLI.
- **Productivity Tools**: Built-in Pomodoro timer to help you focus and execute tasks efficiently.
- **Analytics Dashboard**: Interactive charts tracking your completed tasks and productivity over time.
- **Smart Notifications**: Desktop notifications for tasks due today and overdue alerts.
- **Background Sync**: Both the UI and CLI read from the same `~/.omnitask/todos.json` file in real-time.
- **Local REST API**: A filterable HTTP API on `127.0.0.1:3001`, bound to loopback only, so nothing on your network can reach it.
- **Manage Tasks From Claude**: An MCP server lets a local Claude session create, filter, complete and delete tasks during a conversation.

## 🛠️ Tech Stack

- **Desktop Framework**: Electron
- **Frontend**: React 19, Vite, Vanilla CSS
- **Backend API**: Express.js (Local File System API)
- **Data Persistence**: Local JSON files (No database required!)
- **CLI**: Node.js & Inquirer.js
- **Icons**: Lucide React

## 🚀 Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/VSDeadShot/OmniTask.git
   cd OmniTask
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Link the CLI globally (so you can use the `omni` command anywhere):
   ```bash
   npm link
   ```

### Building the Desktop App

To compile and build the `.exe` installer for OmniTask:

```bash
npm run electron:build
```
This will output a setup executable in the `release/` folder.

### Development Mode

To run the app locally with hot-reloading:

```bash
npm run electron:dev
```

## 💻 Using the CLI

Once you've run `npm link` (or installed the app), you can interact with OmniTask directly from your terminal, no matter what folder you are in! The CLI instantly synchronizes with the desktop app.

| Command | Description |
| :--- | :--- |
| `omni add`<br>`<title>` | Instantly adds a new generic task. (e.g. `omni add "Buy coffee"`) |
| `omni add`<br>`<title> -p <project> --priority <level>` | Adds a task to a specific project with priority. (e.g. `omni add "Emergency hotfix" -p "WebApp" --priority high`) |
| `omni list` | Quickly prints out a clean, color-coded list of all your currently pending tasks. |
| `omni open` | Launches an interactive terminal UI to mark tasks as complete or delete them using your arrow keys. |
| `omni start` | Instantly launches the OmniTask desktop GUI directly from your terminal. |
| `omni stats` | Prints out a quick text summary of your productivity (Pending, Completed, Overdue). |
| `omni today` | Filters and displays only the tasks that are due today or are overdue. |
| `omni clear` | Permanently deletes all tasks marked as "completed" to clean up your data file. |
| `omni serve` | Runs the local API in the foreground so the dashboard and MCP clients can reach it while the desktop app is closed. |
| `omni undo` | Acts as an "Undo" button to instantly restore your entire task history to the exact state it was before you cleared it! |


## 🔌 Local REST API

The Express API runs on `http://127.0.0.1:3001`. It starts with the desktop app,
or on its own with `omni serve` (equivalently `npm run server`) if you want it
available while the app is closed.

It is **bound to loopback only** — nothing on your network can reach it. There is
no authentication, and that is only safe because of that binding, plus a Host
header check and a CORS origin allowlist. Don't put it behind a tunnel without
adding auth first.

### Tasks

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Liveness check plus task counts. |
| `GET` | `/api/tasks` | All tasks, or a filtered subset (see below). |
| `GET` | `/api/tasks/:id` | A single task; `404` if it doesn't exist. |
| `POST` | `/api/tasks` | Create a task. Only `title` is required; `400` with per-field errors otherwise. |
| `PUT` / `PATCH` | `/api/tasks/:id` | Merge changes into a task. |
| `POST` | `/api/tasks/:id/complete` | Mark done. Returns `{ task, nextOccurrence }` — recurring tasks spawn their next occurrence. |
| `POST` | `/api/tasks/:id/uncomplete` | Move a completed task back to pending. |
| `DELETE` | `/api/tasks/:id` | Delete a task; `404` if it doesn't exist. |
| `GET` / `POST` | `/api/settings` | Read or merge settings. |

`GET /api/tasks` always returns a bare array. Filters combine:

| Parameter | Values | Notes |
| :--- | :--- | :--- |
| `status` | `pending`, `completed` | |
| `project` | any name | Matched loosely, so `omnitask` matches "Omni Task". |
| `priority` | `low`, `medium`, `high` | |
| `tag` | any tag | Case-insensitive. |
| `q` | any text | Substring search over title and description. |
| `due` | `today`, `overdue`, `week`, `none` | `overdue` excludes completed tasks. |
| `dueBefore` / `dueAfter` | `YYYY-MM-DD` | |
| `sort` | `dueDate`, `priority`, `createdAt` | Unsorted (file order) by default. |
| `limit` | a positive integer | |

```bash
# Everything still pending, most urgent first
curl "http://127.0.0.1:3001/api/tasks?status=pending&sort=priority"

# Add one
curl -X POST http://127.0.0.1:3001/api/tasks   -H "Content-Type: application/json"   -d '{"title":"Ship the release","project":"OmniTask","priority":"high"}'
```

## 🤖 Managing Tasks From Claude (MCP)

`mcp-server.js` exposes OmniTask to a Claude session as tools: `list_tasks`,
`get_task`, `create_task`, `update_task`, `complete_task`, `uncomplete_task` and
`delete_task`. It talks to the local API over loopback, so everything stays on
your machine.

Because the API is loopback-only, the Claude client has to be **running on this
machine** — Claude Code or the Claude desktop app. A claude.ai conversation in a
browser runs in the cloud and cannot reach `127.0.0.1` on your PC.

### Claude Code

```bash
claude mcp add omnitask -- node C:/Users/vedan/Desktop/VSDeadShot/Projects/ToDoApp/mcp-server.js
```

### Claude Desktop

Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "omnitask": {
      "command": "node",
      "args": ["C:/Users/vedan/Desktop/VSDeadShot/Projects/ToDoApp/mcp-server.js"]
    }
  }
}
```

Use an absolute path in both cases, and make sure the API is running (open
OmniTask, or run `omni serve`) — if it isn't, the tools say so and tell you how
to start it.

## 🗃️ Data

Everything lives in `~/.omnitask/`:

| File | Contents |
| :--- | :--- |
| `todos.json` | A flat array of tasks. |
| `settings.json` | `openAtLogin` and Pomodoro timings. |
| `todos.json.lock` | Transient. Held briefly while a task is written. |

A task looks like this:

```json
{
  "id": "9f1c8e6a-5b2d-4a71-9c3e-1d7f0b4a2e88",
  "project": "OmniTask",
  "title": "Ship the release",
  "description": "",
  "status": "pending",
  "priority": "high",
  "dueDate": "2026-09-30",
  "tags": ["release"],
  "recurrence": null,
  "createdAt": "2026-09-04T10:12:00.000Z",
  "updatedAt": "2026-09-04T10:12:00.000Z",
  "completedAt": null
}
```

The dashboard, the CLI and the MCP server all write through `data.js`, which
takes a lock for the read-modify-write and swaps the file in atomically. That is
what keeps three processes writing the same file from losing each other's
changes. Tasks created before `updatedAt` existed are read fine without it; there
is no migration.
