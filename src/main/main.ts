const { app, BrowserWindow, ipcMain, Menu, nativeImage, session, shell, Tray, protocol } = require('electron');
import fs from "fs";
import { autoUpdater, UpdateCheckResult } from 'electron-updater';
import { join } from 'path';
import Helpers from "./util/Helpers";
import Migrator from "./util/Migrator";

autoUpdater.autoDownload = true;
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://electronlauncher.herokuapp.com/static/electron-launcher'
})

// Listen for update download progress events
autoUpdater.on('update-downloaded', () => {
  if(mainWindow) {
    mainWindow.webContents.send('backend_message', {
      channelType: "update_ready",
      name: "UPDATE DOWNLOADED"
    });
  }

  const isSilent = true
  const isForceRunAfter = true
  autoUpdater.quitAndInstall(isSilent, isForceRunAfter)
})

autoUpdater.on('download-progress', (progressObj) => {
  // Calculate download progress percentage
  const progress = Math.floor(progressObj.percent);

  if(mainWindow) {
    mainWindow.webContents.send('backend_message', {
      channelType: "update_downloading",
      progress
    });
  }
})

//Maintain a reference to the window
let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Show the main window and check for application updates
  mainWindow.on('ready-to-show', () => {
    // if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    // }

    if (process.env.NODE_ENV !== 'development') {
      autoUpdater.checkForUpdates().then((result: UpdateCheckResult|null) => {
        if (result === null) return;

        mainWindow.webContents.send('backend_message', {
          channelType: "update_ready",
          name: "UPDATE",
          data: result,
          hosting: "Hosting version: " + result.updateInfo.version,
          version: "Current version: " + app.getVersion()
        });
      })
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    console.log('inside set window open handler')
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.NODE_ENV === 'development') {
    const rendererPort = process.argv[2];
    mainWindow.loadURL(`http://localhost:${rendererPort}`);
  }
  else {
    mainWindow.loadFile(join(app.getAppPath(), 'renderer', 'index.html'));
  }
}

/**
 * The following function creates the tray icon and subsequent menu when the application is minimised. Achieved by
 * overriding the base functionality for closing the window.
 * */
function setupTrayIcon(): void {
  // Setup tray icon and context menu
  mainWindow.setMenu(null)

  const iconPath = join(app.getAppPath(), 'static', 'icon.ico')
  const appIcon = new Tray(nativeImage.createFromPath(iconPath))
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: function (): void {
        mainWindow.show()
      }
    },
    {
      label: 'Quit',
      click: function (): void {
        mainWindow.destroy()
        app.quit()
      }
    }
  ])
  appIcon.setToolTip('LeadMe')
  appIcon.setContextMenu(contextMenu)

  // Manage window minimising and tray icon
  mainWindow.on('minimize', function (event) {
    event.preventDefault()
    mainWindow.hide()
  })

  mainWindow.on('close', function (event) {
    event.preventDefault()
    mainWindow.hide()
  })
}

app.whenReady().then(async () => {
  protocol.interceptFileProtocol('media-loader', (request, callback) => {
    const url = request.url.replace("media-loader://", "");
    // @ts-ignore
    callback(fs.existsSync(url) ? url : null);
  });

  let software = app.commandLine.getSwitchValue("software");
  let directory = app.commandLine.getSwitchValue("directory");

  //If the Station or NUC is passed as the command line argument then attempt to perform the migration
  if (["Station", "NUC"].includes(software)) {
    const migrate = new Migrator(software, directory);
    await migrate.RunMigration();
  }

  createWindow();
  setupTrayIcon();

  console.log("Starting electron application");

  //Load in all the helper functions
  new Helpers(ipcMain, mainWindow).startup();

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['script-src \'self\'']
      }
    })
  })

  app.on('activate', function () {
    // On macOS, it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
});
