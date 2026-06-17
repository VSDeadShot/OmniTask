#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const homeDir = os.homedir();
const dataDir = path.join(homeDir, '.omnitask');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
const DATA_FILE = path.join(dataDir, 'todos.json');

const args = process.argv.slice(2);
const command = args[0];

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

async function runInteractiveMenu() {
    let tasks = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    let pendingTasks = tasks.filter(t => t.status === 'pending');
    
    if (pendingTasks.length === 0) {
        console.log("✨ All caught up! No pending tasks to manage.");
        process.exit(0);
    }

    const choices = pendingTasks.map(t => ({
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

    const selectedTask = tasks.find(t => t.id === selectedTaskId);

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
        selectedTask.status = 'completed';
        fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
        console.log(`✅ Marked "${selectedTask.title}" as complete!`);
    } else if (action === 'delete') {
        tasks = tasks.filter(t => t.id !== selectedTaskId);
        fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
        console.log(`❌ Deleted "${selectedTask.title}".`);
    }

    if (action === 'back' || action === 'complete' || action === 'delete') {
        console.log("\n");
        await runInteractiveMenu();
    }
}

if (command === 'add') {
    const title = args[1];
    let project = 'General';
    const pIndex = args.indexOf('-p');
    if (pIndex !== -1 && args[pIndex + 1]) project = args[pIndex + 1];

    let priority = 'medium';
    const prioIndex = args.indexOf('--priority');
    if (prioIndex !== -1 && args[prioIndex + 1]) priority = args[prioIndex + 1];

    if (!title) {
        console.error("❌ Please provide a task title.\nUsage: omni add \"Fix bug\" -p \"Project Name\"");
        process.exit(1);
    }

    const tasks = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    tasks.push({
        id: Date.now().toString(),
        project: project,
        title: title,
        description: '',
        status: 'pending',
        priority: priority,
        dueDate: null,
        tags: [],
        createdAt: new Date().toISOString()
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
    
    console.log(`✅ Task Added! Title: ${title} | Project: ${project} | Priority: ${priority}`);
} else if (command === 'list') {
    const tasks = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    
    if (pendingTasks.length === 0) {
        console.log("✨ All caught up! No pending tasks.");
        process.exit(0);
    }
    console.log("\n🚀 OmniTask - Pending Tasks\n");
    pendingTasks.forEach(t => {
        const priorityIcon = t.priority === 'high' ? '🔴' : t.priority === 'low' ? '🔵' : '🟡';
        console.log(`${priorityIcon} [${t.project}] ${t.title}`);
    });
    console.log("");
} else if (command === 'open') {
    runInteractiveMenu();
} else if (command === 'clear') {
    let tasks = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const initialCount = tasks.length;
    tasks = tasks.filter(t => t.status !== 'completed');
    const removed = initialCount - tasks.length;
    fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
    console.log(`🧹 Cleared ${removed} completed task(s)!`);
} else if (command === 'start') {
    import('child_process').then(({ spawn }) => {
        const appPath = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'todoapp', 'OmniTask.exe');
        if (fs.existsSync(appPath)) {
            const child = spawn(appPath, [], {
                detached: true,
                stdio: 'ignore'
            });
            child.unref();
            console.log("🚀 Launching OmniTask...");
            process.exit(0);
        } else {
            console.error("❌ Could not find OmniTask.exe in the default installation path.");
            process.exit(1);
        }
    });
} else if (command === 'stats') {
    const tasks = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const pending = tasks.filter(t => t.status === 'pending');
    const completed = tasks.filter(t => t.status === 'completed');
    const today = new Date().setHours(0,0,0,0);
    const overdue = pending.filter(t => t.dueDate && new Date(t.dueDate).setHours(0,0,0,0) < today);
    console.log("\n📊 OmniTask Productivity Stats");
    console.log("------------------------------");
    console.log(`📌 Pending:   ${pending.length}`);
    console.log(`✅ Completed: ${completed.length}`);
    console.log(`⚠️  Overdue:   ${overdue.length}`);
    console.log("");
} else if (command === 'today') {
    const tasks = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const today = new Date().setHours(0,0,0,0);
    const pending = tasks.filter(t => t.status === 'pending');
    const dueToday = pending.filter(t => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate).setHours(0,0,0,0);
        return d <= today;
    });
    
    if (dueToday.length === 0) {
        console.log("✨ Nothing due today! You're all clear.");
    } else {
        console.log("\n📅 Due Today & Overdue\n");
        dueToday.forEach(t => {
            const priorityIcon = t.priority === 'high' ? '🔴' : t.priority === 'low' ? '🔵' : '🟡';
            const d = new Date(t.dueDate).setHours(0,0,0,0);
            const statusStr = d < today ? " (⚠️ OVERDUE)" : "";
            console.log(`${priorityIcon} [${t.project}] ${t.title}${statusStr}`);
        });
        console.log("");
    }
} else {
    console.log(`
OmniTask CLI
------------
Usage:
  omni add "Task Name" [-p "Project"] [--priority high]  Adds a new task
  omni list                                            Lists pending tasks
  omni open                                            Opens the interactive terminal menu
  omni clear                                           Deletes all completed tasks
  omni start                                           Launches the OmniTask desktop app
  omni stats                                           Shows productivity statistics
  omni today                                           Shows tasks due today or overdue
    `);
}
