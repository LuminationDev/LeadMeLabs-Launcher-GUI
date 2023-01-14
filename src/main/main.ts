import {app, BrowserWindow, ipcMain, Menu, nativeImage, session, shell, Tray} from 'electron';
import {join} from 'path';
import path from 'path';
import fs from 'fs';
import extract from "extract-zip";
import { download } from 'electron-dl';

let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Show the main window
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.webContents.openDevTools()
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

  const iconPath = path.join(__dirname, '../../build/icon.ico')
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
 * This function handles the downloading of a file from a given URL to a preset application folder. Periodically it will
 * send the progress information back to the renderer for user feedback.
 */
function downloadApplication(): void {
  //This step downloads a file to a specified directory while updating progress on the rendered side.
  ipcMain.on('download_application', (_event, info) => {
    console.log(_event)
    console.log(info)

    //Create the application directory and parent folder if necessary
    const directoryPath = path.join(__dirname, `leadme_apps/${info.name}`)
    fs.mkdirSync(directoryPath, { recursive: true })

    info.properties.onProgress = (status): number => {
        return mainWindow.webContents.send('download progress', status)
    }

    // @ts-ignore
    download(BrowserWindow.getFocusedWindow(), info.url, directoryPath).then((dl) => {
        mainWindow.webContents.send('download complete', dl.getSavePath())

        //Unzip the project and add it to the local folder
        // fs.createReadStream(dl.getSavePath()).pipe(
            void extract(dl.getSavePath(), { dir: path.join(__dirname, `leadme_apps/${info.name}`)})
        // )

        //Delete the downloaded zip folder
        //fs.rmSync(`../leadme_apps/${info.name}/${info.name}.zip`, { recursive: true, force: true })
    })
  })
}

app.whenReady().then(() => {
  createWindow();
  setupTrayIcon();
  downloadApplication();

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['script-src \'self\'']
      }
    })
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
});

ipcMain.on('message', (event, message) => {
  console.log(message);
})