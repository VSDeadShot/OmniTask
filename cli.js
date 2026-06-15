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
} else {
    console.log(`
OmniTask CLI
------------
Usage:
  omni add "Task Name" [-p "Project"] [--priority high]  Adds a new task
  omni list                                            Lists pending tasks
  omni open                                            Opens the interactive terminal menu
    `);
}
