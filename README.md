# 🚀 OmniTask

OmniTask is a centralized, developer-focused task manager designed to keep track of your to-dos across multiple projects. It features a beautiful React-based dashboard and a global CLI, allowing you to seamlessly manage your tasks without ever leaving your terminal or IDE.

## ✨ Features

- **Multi-Project Organization**: Group your tasks by project buckets.
- **Global CLI Integration**: Add or view tasks from any directory on your computer using the `omni` command.
- **Drag and Drop**: Reorganize tasks or move them between projects seamlessly using HTML5 native drag-and-drop.
- **Power User Tools**: Support for task priority levels (High, Medium, Low), Due Dates, and Tags (e.g., `#bug`, `#frontend`).
- **Premium UI**: Built with React, featuring a sleek dark mode, glassmorphism design, and smooth animations.
- **Local Data Storage**: All your data is safely stored in a local `todos.json` file. No database setup required!

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Vanilla CSS
- **Backend**: Express.js (Local File System API)
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

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

### Running the App

To spin up both the React dashboard and the local API backend simultaneously, run:

```bash
npm run dev
```

Your dashboard will be available at `http://localhost:5173`.

## 💻 Using the CLI

Once you've run `npm link`, you can interact with OmniTask directly from your terminal, no matter what folder you are in!

**Add a generic task:**
```bash
omni add "Buy coffee"
```

**Add a task to a specific project:**
```bash
omni add "Fix database schema" -p "BackendApp"
```

**Add a high-priority task:**
```bash
omni add "Emergency hotfix" -p "WebApp" --priority high
```

**List all pending tasks:**
```bash
omni list
```


