import { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let tray = null;
let apiProcess = null;

const dataDir = path.join(os.homedir(), '.omnitask');
const settingsFile = path.join(dataDir, 'settings.json');

function checkSettings() {
  if (fs.existsSync(settingsFile)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
      app.setLoginItemSettings({
        openAtLogin: settings.openAtLogin || false,
        path: app.getPath('exe')
      });
    } catch (e) {
      console.error('Settings parse error:', e);
    }
  }
}

function startApiServer() {
  // Spawn the Express API server
  const serverPath = path.join(__dirname, 'server.js');
  apiProcess = fork(serverPath);
  
  apiProcess.on('error', (err) => {
    console.error('API Process Error:', err);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show until ready
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'public/favicon.svg')
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    // Prevent app from quitting when closing the window
    // Instead, hide it to the tray
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  // Using an empty icon or the favicon if supported
  const icon = nativeImage.createEmpty(); 
  tray = new Tray(icon);
  tray.setToolTip('OmniTask');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    { label: 'Quit', click: () => {
      app.isQuiting = true;
      app.quit();
    }}
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

app.whenReady().then(() => {
  startApiServer();
  createWindow();
  createTray();

  checkSettings();

  if (fs.existsSync(dataDir)) {
    fs.watchFile(settingsFile, () => checkSettings());
  }

  // Global shortcut to summon the app
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  // Unregister shortcuts
  globalShortcut.unregisterAll();
  // Kill API server
  if (apiProcess) apiProcess.kill();
});

app.on('window-all-closed', () => {
  // Keep app running in tray on windows
});
