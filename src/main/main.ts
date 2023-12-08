import semver from "semver/preload";
import fs from "fs";
import { autoUpdater, UpdateCheckResult } from 'electron-updater';
import { join } from 'path';
import Helpers from "./util/Helpers";
import { collectFeedURL, collectLocation, getLauncherManifestParameter, handleIpc, getInternalMac } from "./util/Utilities";
import { ManifestMigrator } from "./util/SoftwareMigrator";
import * as Sentry from '@sentry/electron'
import net from "net";

const { app, BrowserWindow, ipcMain, Menu, nativeImage, session, shell, Tray, protocol } = require('electron');

Sentry.init({
  dsn: "https://09dcce9f43346e4d8cadf213c0a0f082@o1294571.ingest.sentry.io/4505666781380608",
});

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
  if (helpers) {
    helpers.downloading = false
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

  try {
    collectLocation().then(location => {
      Sentry.captureMessage(`Updated launcher to ${app.getVersion()} at site ${location}`)
    })
  } catch (error) {
    Sentry.captureException(error)
  }

})

autoUpdater.on('download-progress', (progressObj) => {
  console.log('updating', progressObj)
  if (helpers) {
    helpers.downloading = true
  }
  if(!downloadWindow) {
    createDownloadWindow();
  }

  // Calculate download progress percentage
  const progress = Math.floor(progressObj.percent)/100;

  if(downloadWindow) {
    downloadWindow.webContents.executeJavaScript(`
        try {
            const dynamicTextElement = document.getElementById('update-message');
            dynamicTextElement.innerText = 'Downloading launcher update, ${(progressObj.percent).toFixed(2)} %';
        } catch (error) {
            console.error('Error in executeJavaScript:', error);
        }
    `);
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
  mainWindow.on('ready-to-show', async () => {
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }

    // Send through the current version number
    void sendLauncherDetails();

    getLauncherManifestParameter('mode').then(mode => {
      if (mode === 'development') {
        autoUpdater.setFeedURL({
          provider: 'generic',
          url: 'https://leadme-launcher-development-92514d5e709f.herokuapp.com/static/electron-launcher'
        })
      }

      if (mode === 'offline') {
        handleUpdateCheckError("In offline mode");
      }

      if (process.env.NODE_ENV !== 'development' && mode !== 'offline') {
        autoUpdater.checkForUpdates().then((result) => {
          updateCheck(result);
        }).catch(handleUpdateCheckError);
      } else {
        sendAutoStart();
      }
    });
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
    sendAutoStart();

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

    sendAutoStart();
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

    sendAutoStart();

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
    sendAutoStart();
  } else {
    try {
      collectLocation().then(location => {
        Sentry.captureMessage(`Updating launcher from ${result.updateInfo.version} to ${app.getVersion()} at site ${location} with MAC address ${getInternalMac()}`)
      })
    } catch (error) {
      Sentry.captureException(error)
    }
  }
}

/**
 * Send the auto start command after a set delay to ensure that the application list has already been loaded.
 */
function sendAutoStart(): void {
  setTimeout(() =>
          mainWindow.webContents.send('backend_message', {
            channelType: "autostart_active"
          }),
      3000)
}

/**
 * Collect details about the launcher to display on the frontend.
 */
async function sendLauncherDetails(): Promise<void> {
  // Send through the current version number
  mainWindow.webContents.send('backend_message', {
    channelType: "launcher_settings",
    version: app.getVersion(),
    location: await collectLocation()
  });
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

  // Handle double-click event on the tray icon
  appIcon.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore(); // If the window is minimized, restore it
      } else {
        mainWindow.show(); // If the window is not minimized, just bring it to focus
      }
    }
  });

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

var helpers: Helpers

app.whenReady().then(async () => {
  protocol.interceptFileProtocol('media-loader', (request, callback) => {
    const url = request.url.replace("media-loader://", "");
    // @ts-ignore
    callback(fs.existsSync(url) ? url : null);
  });

  //Check if the customapps.vrmanifest has been created.
  await new ManifestMigrator().RunMigration();

  createWindow();
  setupTrayIcon();

  console.log("Starting electron application");

  //Load in all the helper functions
  helpers = new Helpers(ipcMain, mainWindow)
  helpers.startup()

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