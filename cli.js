#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import inquirer from 'inquirer';

import {
  TASKS_FILE,
  readTasks,
  mutateTasks,
  buildTask,
  validateTask,
  completeTask
} from './data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const command = args[0];

const API_PORT = Number(process.env.OMNITASK_PORT) || 3001;
const API_BASE = `http://127.0.0.1:${API_PORT}`;

// The CLI writes todos.json directly rather than going through the API, so the
// app doesn't need to be running for `omni add` to work. Both paths share
// data.js, which is what keeps the task shape and the recurrence rules
// identical between them.

async function runInteractiveMenu() {
  const tasks = readTasks();
  const pendingTasks = tasks.filter((t) => t.status === 'pending');

  if (pendingTasks.length === 0) {
    console.log('✨ All caught up! No pending tasks to manage.');
    process.exit(0);
  }

  const choices = pendingTasks.map((t) => ({
    name: `[${t.project}] ${t.title} ${t.priority === 'high' ? '🔴' : ''}`,
    value: t.id
  }));

  choices.push(new inquirer.Separator());
  choices.push({ name: 'Exit', value: 'exit' });

  const { selectedTaskId } = await inquirer.prompt([
    {
      type: 'select',
      name: 'selectedTaskId',
      message: 'Select a task to manage:',
      choices: choices,
      pageSize: 10
    }
  ]);

  if (selectedTaskId === 'exit') {
    process.exit(0);
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const { action } = await inquirer.prompt([
    {
      type: 'select',
      name: 'action',
      message: `What would you like to do with "${selectedTask.title}"?`,
      choices: [
        { name: '✅ Mark as Complete', value: 'complete' },
        { name: '❌ Delete Task', value: 'delete' },
        { name: '↩️  Go Back', value: 'back' }
      ]
    }
  ]);

  if (action === 'complete') {
    const result = mutateTasks((current) => completeTask(current, selectedTaskId));
    console.log(`✅ Marked "${selectedTask.title}" as complete!`);
    if (result?.nextOccurrence) {
      console.log(`   ↻ Next occurrence scheduled for ${result.nextOccurrence.dueDate}`);
    }
  } else if (action === 'delete') {
    mutateTasks((current) => {
      const index = current.findIndex((t) => t.id === selectedTaskId);
      if (index !== -1) current.splice(index, 1);
    });
    console.log(`❌ Deleted "${selectedTask.title}".`);
  }

  if (action === 'back' || action === 'complete' || action === 'delete') {
    console.log('\n');
    await runInteractiveMenu();
  }
}

// Starts the Express API in the foreground so the dashboard, the MCP server and
// any other local client can reach it without the desktop app being open.
async function runServe() {
  let alreadyRunning;
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(1500) });
    alreadyRunning = res.ok;
  } catch {
    alreadyRunning = false;
  }

  if (alreadyRunning) {
    console.log(`ℹ️  OmniTask API is already running on ${API_BASE}`);
    console.log('   Nothing to do — another instance (or the desktop app) owns the port.');
    process.exit(0);
  }

  console.log(`🚀 Starting OmniTask API on ${API_BASE} (loopback only)`);
  console.log('   Press Ctrl+C to stop.\n');

  const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    stdio: 'inherit',
    env: process.env
  });

  child.on('exit', (code) => process.exit(code ?? 0));
  process.on('SIGINT', () => child.kill('SIGINT'));
}

if (command === 'add') {
  const title = args[1];

  let project = 'General';
  const pIndex = args.indexOf('-p');
  if (pIndex !== -1 && args[pIndex + 1]) project = args[pIndex + 1];

  let priority = 'medium';
  const prioIndex = args.indexOf('--priority');
  if (prioIndex !== -1 && args[prioIndex + 1]) priority = args[prioIndex + 1];

  let dueDate = null;
  const dueIndex = args.indexOf('--due');
  if (dueIndex !== -1 && args[dueIndex + 1]) dueDate = args[dueIndex + 1];

  if (!title) {
    console.error('❌ Please provide a task title.\nUsage: omni add "Fix bug" -p "Project Name"');
    process.exit(1);
  }

  // Same validation the API applies, so a task added here can't be shaped
  // differently from one added through the dashboard or by an agent.
  const { ok, errors } = validateTask({ title, project, priority, dueDate });
  if (!ok) {
    console.error('❌ Could not add task:');
    errors.forEach((e) => console.error(`   • ${e.message}`));
    process.exit(1);
  }

  const task = buildTask({ title, project, priority, dueDate });
  mutateTasks((tasks) => {
    tasks.push(task);
  });

  console.log(`✅ Task Added! Title: ${task.title} | Project: ${task.project} | Priority: ${task.priority}`);
} else if (command === 'list') {
  const pendingTasks = readTasks().filter((t) => t.status === 'pending');

  if (pendingTasks.length === 0) {
    console.log('✨ All caught up! No pending tasks.');
    process.exit(0);
  }
  console.log('\n🚀 OmniTask - Pending Tasks\n');
  pendingTasks.forEach((t) => {
    const priorityIcon = t.priority === 'high' ? '🔴' : t.priority === 'low' ? '🔵' : '🟡';
    console.log(`${priorityIcon} [${t.project}] ${t.title}`);
  });
  console.log('');
} else if (command === 'open') {
  runInteractiveMenu();
} else if (command === 'serve') {
  runServe();
} else if (command === 'clear') {
  const removed = mutateTasks((tasks) => {
    // Back up inside the lock so the snapshot matches exactly what gets cleared.
    fs.writeFileSync(`${TASKS_FILE}.backup`, JSON.stringify(tasks, null, 2));

    const before = tasks.length;
    const kept = tasks.filter((t) => t.status !== 'completed');
    tasks.length = 0;
    tasks.push(...kept);
    return before - tasks.length;
  });

  console.log(`🧹 Cleared ${removed} completed task(s)! (Run 'omni undo' if this was a mistake)`);
} else if (command === 'undo') {
  const backupFile = `${TASKS_FILE}.backup`;
  if (fs.existsSync(backupFile)) {
    const restored = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    mutateTasks((tasks) => {
      tasks.length = 0;
      tasks.push(...restored);
    });
    fs.unlinkSync(backupFile);
    console.log('↩️  Undo successful! Restored your tasks to exactly how they were before clearing.');
  } else {
    console.error('❌ No recent clear action found to undo.');
  }
} else if (command === 'start') {
  const appPath = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'todoapp', 'OmniTask.exe');
  if (fs.existsSync(appPath)) {
    const child = spawn(appPath, [], { detached: true, stdio: 'ignore' });
    child.unref();
    console.log('🚀 Launching OmniTask...');
    process.exit(0);
  } else {
    console.error('❌ Could not find OmniTask.exe in the default installation path.');
    process.exit(1);
  }
} else if (command === 'stats') {
  const tasks = readTasks();
  const pending = tasks.filter((t) => t.status === 'pending');
  const completed = tasks.filter((t) => t.status === 'completed');
  const today = new Date().setHours(0, 0, 0, 0);
  const overdue = pending.filter((t) => t.dueDate && new Date(t.dueDate).setHours(0, 0, 0, 0) < today);
  console.log('\n📊 OmniTask Productivity Stats');
  console.log('------------------------------');
  console.log(`📌 Pending:   ${pending.length}`);
  console.log(`✅ Completed: ${completed.length}`);
  console.log(`⚠️  Overdue:   ${overdue.length}`);
  console.log('');
} else if (command === 'today') {
  const today = new Date().setHours(0, 0, 0, 0);
  const pending = readTasks().filter((t) => t.status === 'pending');
  const dueToday = pending.filter((t) => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate).setHours(0, 0, 0, 0) <= today;
  });

  if (dueToday.length === 0) {
    console.log("✨ Nothing due today! You're all clear.");
  } else {
    console.log('\n📅 Due Today & Overdue\n');
    dueToday.forEach((t) => {
      const priorityIcon = t.priority === 'high' ? '🔴' : t.priority === 'low' ? '🔵' : '🟡';
      const d = new Date(t.dueDate).setHours(0, 0, 0, 0);
      const statusStr = d < today ? ' (⚠️ OVERDUE)' : '';
      console.log(`${priorityIcon} [${t.project}] ${t.title}${statusStr}`);
    });
    console.log('');
  }
} else {
  console.log(`
OmniTask CLI
------------
Usage:
  omni add "Task Name" [-p "Project"] [--priority high] [--due 2026-09-10]
                                                       Adds a new task
  omni list                                            Lists pending tasks
  omni open                                            Opens the interactive terminal menu
  omni serve                                           Runs the local API (loopback only) so the
                                                       dashboard and agent clients can reach it
  omni clear                                           Deletes all completed tasks
  omni undo                                            Restores tasks accidentally cleared
  omni start                                           Launches the OmniTask desktop app
  omni stats                                           Shows productivity statistics
  omni today                                           Shows tasks due today or overdue
    `);
}
