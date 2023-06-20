import semver from "semver/preload";
import fs from "fs";
import { autoUpdater, UpdateCheckResult } from 'electron-updater';
import { join } from 'path';
import Helpers, { collectFeedURL } from "./util/Helpers";
import Migrator from "./util/Migrator";

const { app, BrowserWindow, ipcMain, Menu, nativeImage, session, shell, Tray, protocol } = require('electron');

autoUpdater.autoDownload = true;
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://electronlauncher.herokuapp.com/static/electron-launcher'
})

// Offline
// url: 'http://localhost:8088/static/electron-launcher'
// Redirection
// url: 'https://leadmelabs-redirect-server.herokuapp.com/electron-launcher'
// Local
// url: 'http://localhost:8082/electron-launcher'
// Production
// url: 'https://electronlauncher.herokuapp.com/static/electron-launcher'

// Listen for update download progress events
autoUpdater.on('update-downloaded', () => {
  if(mainWindow) {
    mainWindow.webContents.send('backend_message', {
      channelType: "update_ready",
      name: "UPDATE DOWNLOADED, close any open applications"
    });
  }

  if(downloadWindow) {
    //Setting progress above 1 turns the bar into an indeterminate loading bar while waiting for restart
    downloadWindow.setProgressBar(2);
  }

  //Wait for any open applications to close
  setTimeout(() => {
    //Close the download window?

    const isSilent = true
    const isForceRunAfter = true
    autoUpdater.quitAndInstall(isSilent, isForceRunAfter)
  }, 4000);
})

autoUpdater.on('download-progress', (progressObj) => {
  if(!downloadWindow) {
    createDownloadWindow();
  }

  // Calculate download progress percentage
  const progress = Math.floor(progressObj.percent)/100;

  if(downloadWindow) {
    downloadWindow.setProgressBar(progress);
  }

  if(mainWindow) {
    mainWindow.webContents.send('backend_message', {
      channelType: "update_downloading",
      progress
    });
  }
})

let downloadWindow;
function createDownloadWindow() {
  downloadWindow = new BrowserWindow({
    width: 400,
    height: 150,
    show: false,
    resizable: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  downloadWindow.setMenu(null);

  downloadWindow.on('ready-to-show', () => {
    downloadWindow.show();
  });

  downloadWindow.webContents.setWindowOpenHandler((details) => {
    console.log('inside set window open handler')
    void shell.openExternal(details.url)
    return { action: 'deny' }
  });

  downloadWindow.loadFile(join(app.getAppPath(), 'static', 'download.html'));
}

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
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }

    if (process.env.NODE_ENV !== 'development') {
      autoUpdater.checkForUpdates().then((result) => {
        updateCheck(result);
      }).catch(handleUpdateCheckError);
    } else {
      mainWindow.webContents.send('backend_message', {
        channelType: "autostart_active"
      });
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    console.log('inside set window open handler')
    void shell.openExternal(details.url)
    return { action: 'deny' }
  });

  if (process.env.NODE_ENV === 'development') {
    const rendererPort = process.argv[2];
    mainWindow.loadURL(`http://localhost:${rendererPort}`);
  }
  else {
    mainWindow.loadFile(join(app.getAppPath(), 'renderer', 'index.html'));
  }
}

/**
 * If retrieving the Live update does not work attempt to contact the offline installer
 * server.
 * @param error An object that details what has gone wrong in the connection process.
 */
async function handleUpdateCheckError(error) {
  mainWindow.webContents.send('backend_message', {
    channelType: "update_check",
    name: "LIVE UPDATE",
    data: error
  });

  const feedUrl = await collectFeedURL();

  if(feedUrl == null) {
    mainWindow.webContents.send('backend_message', {
      channelType: "autostart_active"
    });

    return;
  }

  // Set a new FeedURL as the offline backup
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: `http://${feedUrl}:8088/static/electron-launcher`
  });

  autoUpdater.checkForUpdates().then((result) => {
    updateCheck(result);
  }).catch((error) => {
    mainWindow.webContents.send('backend_message', {
      channelType: "update_check",
      name: "OFFLINE UPDATE",
      data: error
    });

    mainWindow.webContents.send('backend_message', {
      channelType: "autostart_active"
    });
  });
}

/**
 * Check the result of the autoUpdate feed and fall back to the offline one if the
 * original FeedUrl does not work.
 * @param result
 */
function updateCheck(result: UpdateCheckResult|null) {
  if (result === null) {
    mainWindow.webContents.send('backend_message', {
      channelType: "update_check",
      name: "UPDATE",
      data: "RESULT NULL"
    });

    mainWindow.webContents.send('backend_message', {
      channelType: "autostart_active"
    });

    return;
  }

  mainWindow.webContents.send('backend_message', {
    channelType: "update_check",
    name: "UPDATE",
    data: result,
    hosting: "Hosting version: " + result.updateInfo.version,
    version: "Current version: " + app.getVersion()
  });

  //Detect if there is an update, if not send the auto start command
  if(!semver.gt(result.updateInfo.version, app.getVersion())) {
    mainWindow.webContents.send('backend_message', {
      channelType: "autostart_active"
    });
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

/**
 * Ignore certificate errors.
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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
