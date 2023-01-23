export default class AutoUpdate {
    ipcMain: Electron.IpcMain;
    mainWindow: Electron.BrowserWindow;
    autoUpdater: Electron.AutoUpdater;

    constructor(ipcMain: Electron.IpcMain, mainWindow: Electron.BrowserWindow, autoUpdater: Electron.AutoUpdater) {
        this.ipcMain = ipcMain;
        this.mainWindow = mainWindow;
        this.autoUpdater = autoUpdater;
    }

    /**
     * Listen for updates that may become available, handle restarting the application through a message from the front
     * end.
     */
    listenForUpdates(): void {
        //Listen for available updates
        this.autoUpdater.on('update-available', () => {
            this.mainWindow.webContents.send('update_available');
        });
        this.autoUpdater.on('update-downloaded', () => {
            this.mainWindow.webContents.send('update_downloaded');
        });

        this.ipcMain.on('restart_app', () => {
            this.autoUpdater.quitAndInstall();
        });
    }
}
