# 🚀 OmniTask

OmniTask is a powerful, centralized, and developer-focused task manager designed to keep track of your to-dos across multiple projects. It features a beautiful React-based desktop dashboard built with Electron, and a comprehensive global CLI, allowing you to seamlessly manage your tasks without ever leaving your terminal or IDE.

## ✨ Features

- **Native Desktop App**: Built with Electron, runs seamlessly as a standalone desktop application.
- **Global CLI Integration**: Manage tasks instantly from any directory using the `omni` command.
- **Advanced UI Dashboard**: A sleek, dark-themed glassmorphism interface built with React.
- **Drag & Drop Kanban**: Visually reorganize tasks and move them between project columns natively.
- **Click-to-Edit Everything**: Instantly edit task descriptions, deadlines (with a dark-mode native calendar), and project tags directly on the task cards.
- **Smart Project Grouping**: Fuzzy matching automatically groups tasks together regardless of spaces or capitalization (e.g., "Omni Task" and "omniTask" merge seamlessly).
- **Single Instance Lock**: Ensures only one unified desktop app window opens, even if launched repeatedly via CLI.
- **Productivity Tools**: Built-in Pomodoro timer to help you focus and execute tasks efficiently.
- **Analytics Dashboard**: Interactive charts tracking your completed tasks and productivity over time.
- **Smart Notifications**: Desktop notifications for tasks due today and overdue alerts.
- **Background Sync**: Both the UI and CLI read from the same `~/.omnitask/todos.json` file in real-time.

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

### Core Commands

- **Add a generic task:**
  ```bash
  omni add "Buy coffee"
  ```
- **Add a task to a specific project with priority:**
  ```bash
  omni add "Emergency hotfix" -p "WebApp" --priority high
  ```
- **List pending tasks:**
  ```bash
  omni list
  ```
- **Interactive Menu:**
  Launch an interactive terminal UI to mark tasks as complete or delete them using your arrow keys.
  ```bash
  omni open
  ```

### Productivity & Management Commands

- **Launch the App:**
  Instantly launch the OmniTask desktop GUI directly from your terminal.
  ```bash
  omni start
  ```
- **View Stats:**
  Print out a quick text summary of your productivity (Pending, Completed, Overdue).
  ```bash
  omni stats
  ```
- **Today's Agenda:**
  Filter and view only the tasks that are due today or are overdue.
  ```bash
  omni today
  ```
- **Clear Junk:**
  Permanently delete all tasks marked as "completed" to clean up your data file.
  ```bash
  omni clear
  ```
- **Safety Net / Undo:**
  Accidentally ran `omni clear`? Restore your entire task history to the exact state it was before you cleared it!
  ```bash
  omni undo
  ```
