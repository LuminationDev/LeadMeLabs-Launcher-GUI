import fs from "fs";
import path from "path";
import Encryption from "../encryption/Encryption";
import { join, resolve } from "path";
import { download } from "electron-dl";
import extract from "extract-zip";
import { exec, execSync, spawn, spawnSync } from "child_process";
import semver from "semver/preload";
import * as http from "http";
import * as https from "https"; //Use for production hosting server
import { app, BrowserWindow, shell } from "electron";
import IpcMainEvent = Electron.IpcMainEvent;
import * as Sentry from "@sentry/electron";
import {
    checkFileAvailability,
    collectFeedURL,
    collectLocation,
    getInternalMac
} from "../util/Utilities";
import { taskSchedulerItem } from "../util/TaskScheduler";
import ManifestController from "./ManifestController";
import ConfigController from "./ConfigController";

Sentry.init({
    dsn: "https://09dcce9f43346e4d8cadf213c0a0f082@o1294571.ingest.sentry.io/4505666781380608",
});
const net = require('net');

/**
 * A class that initiates electron IPC controls that handle application downloads, extractions, configurations
 * and launching.
 */
export default class MainController {
    manifestController: ManifestController;
    configController: ConfigController;
    ipcMain: Electron.IpcMain;
    mainWindow: Electron.BrowserWindow;
    downloading: boolean = false;
    appDirectory: string;
    host: string = "";
    offlineHost: string = "http://localhost:8088"; //Changes if on NUC (localhost) or Station (NUC IP address)
    FIREBASE_BASE_URL: string = 'https://leadme-labs-default-rtdb.asia-southeast1.firebasedatabase.app/lab_remote_config/'

    constructor(ipcMain: Electron.IpcMain, mainWindow: Electron.BrowserWindow) {
        this.manifestController = new ManifestController(ipcMain, mainWindow);
        this.configController = new ConfigController(ipcMain, mainWindow);
        this.ipcMain = ipcMain;
        this.mainWindow = mainWindow;
        this.appDirectory = process.env.APPDATA + '/leadme_apps';

        var PIPE_NAME = "LeadMeLauncher";
        var PIPE_PATH = "\\\\.\\pipe\\" + PIPE_NAME;
        var server = net.createServer((stream) => {
            stream.on('data', (c) => {
                if (c.toString().includes("checkIfDownloading")) {
                    stream.write("" + this.downloading)
                }
            });
        });
        server.listen(PIPE_PATH)
    }

    /**
     * Initiate the helper listener, each function uses a different channel handle to respond to
     * different events that the frontend requires.
     */
    startup(): void {
        this.helperListenerDelegate();
    }

    /**
     * Create a listeners that will delegate actions between the helper functions depending on what channel type has
     * been sent. This allows just one listener to be active rather than individual function ones.
     */
    helperListenerDelegate(): void {
        this.ipcMain.on('helper_function', (_event, info) => {
            switch(info.channelType) {
                case "query_installed_applications":
                    void this.manifestController.installedApplications();
                    break;
                case "import_application":
                    void this.manifestController.importApplication(_event, info);
                    break;
                case "scan_manifest":
                    void this.manifestController.scanForManifestApps(_event, info);
                    break;
                case "launch_parameters":
                    void this.manifestController.setManifestAppParameters(_event, info);
                    break;
                case "parameter_application":
                    void this.manifestController.setManifestParameter(info);
                    break;
                case "edit_vr_manifest":
                    void this.manifestController.updateVRManifest(info.name, info.id, info.altPath, info.add);
                    void this.manifestController.setManifestAppParameters(_event, info);
                    break;
                case "query_manifest_app":
                    void this.manifestController.getLaunchParameters(_event, info);
                    break;

                case "set_config_application":
                    void this.configController.configApplication(_event, info);
                    break;
                case "set_remote_config":
                    void this.configController.setRemoteConfig(_event, info);
                    break;
                case "get_config_application":
                    void this.configController.getApplicationConfig(_event, info);
                    break;
                case "check_remote_config":
                    void this.configController.checkIfRemoteConfigIsEnabled(_event, info);
                    break;

                case "set_application_image":
                    void this.setApplicationImage(_event, info);
                    break;
                case "download_application":
                    void this.downloadApplication(_event, info);
                    break;
                case "config_steamcmd":
                    void this.configureSteamCMD(_event, info);
                    break;
                case "delete_application":
                    void this.deleteApplication(_event, info);
                    break;
                case "launch_application":
                    void this.launchApplication(_event, info);
                    break;
                case "stop_application":
                    void this.killAProcess(info.name, info.altPath, false);
                    break;
                case "schedule_application":
                    void taskSchedulerItem(this.mainWindow, info, this.appDirectory);
                    break;

                default:
                    break;
            }
        });
    }

    /**
     * This function allow takes a path that the user has chosen for an image and then copies that image into the folder
     * of the supplied application. This allows the image to be used as the header image for the launcher and on the
     * LeadMe labs tablet.
     */
    async setApplicationImage(_event: IpcMainEvent, info: any): Promise<void> {
        const parentFolder = join(this.appDirectory, info.name);
        const localFile = `${join(this.appDirectory, info.name)}\\header.jpg`;

        //Create the folder if it does not exist
        if(!fs.existsSync(parentFolder)) {
            fs.mkdirSync(parentFolder);
        }

        // File header.jpg will be created or overwritten by default.
        fs.copyFile(info.imagePath, localFile, (err) => {
            if (err) throw err;
            console.log(`${info.imagePath} was copied to ${localFile}`);
        });
    }

    /**
     * This function handles the downloading of a file from a given URL to a preset application folder. Periodically it will
     * send the progress information back to the renderer for user feedback.
     */
    async downloadApplication(_event: IpcMainEvent, info: any): Promise<void> {
        this.downloading = true;
        let downloadWindow = new BrowserWindow({
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
            void shell.openExternal(details.url)
            this.downloading = false;
            return { action: 'deny' }
        });

        downloadWindow.loadFile(join(app.getAppPath(), 'static', 'download.html'));

        downloadWindow.webContents.on('did-finish-load', () => {
            downloadWindow.webContents.executeJavaScript(`
                const dynamicTextElement = document.getElementById('update-message');
                dynamicTextElement.innerText = 'Downloading ${info.name} update, please wait...';`
            );
        });

        this.host = info.host;
        let url = this.host + info.url;

        console.log(this.host);

        //Need to back up from the main file that is being run
        const directoryPath = join(this.appDirectory, info.name)
        this.mainWindow.webContents.send('status_update', {
            name: info.name,
            message: `Initiating download: ${directoryPath}`
        })

        //Create the main directory to hold the application
        fs.mkdirSync(directoryPath, {recursive: true})

        //Override the incoming directory path
        info.properties.directory = directoryPath;

        //Maintain a trace on the download progress
        info.properties.onProgress = (status): void => {
            console.log('status', status)
            this.mainWindow.webContents.send('download_progress', status.percent)

            if(downloadWindow) {
                downloadWindow.webContents.executeJavaScript(`
                    try {
                        const dynamicTextElement = document.getElementById('update-message');
                        dynamicTextElement.innerText = 'Downloading ${info.name}, ${(status.percent * 100).toFixed(2)} %';
                    } catch (error) {
                        console.error('Error in executeJavaScript:', error);
                    }
                `);
                downloadWindow.setProgressBar(status.percent * 100);
            }
        }

        //Check if the server is online
        if(!await checkFileAvailability(url)) {
            const feedUrl = await collectFeedURL();
            if(feedUrl == null) {
                this.downloading = false;
                return;
            }
            this.offlineHost = `http://${feedUrl}:8088`;

            this.mainWindow.webContents.send('status_update', {
                name: info.name,
                message: `Hosting server offline: ${this.host}. Checking offline backup: ${this.offlineHost}.`
            });

            //Check if offline line mode is available
            url = this.offlineHost + info.url;
            if(!await checkFileAvailability(url)) {
                this.mainWindow.webContents.send('status_update', {
                    name: info.name,
                    message: 'Server offline'
                });
                this.downloading = false;
                return;
            } else {
                url = "";
            }
        }

        // @ts-ignore
        download(BrowserWindow.fromId(this.mainWindow.id), url, info.properties).then((dl) => {
            downloadWindow.setProgressBar(2)
            downloadWindow.webContents.executeJavaScript(`
                const dynamicTextElement = document.getElementById('update-message');
                dynamicTextElement.innerText = 'Download completed, installing update';`
            );
            this.mainWindow.webContents.send('status_update', {
                name: info.name,
                message: `Download complete, now extracting. ${dl.getSavePath()}`
            })

            //Unzip the project and add it to the local installation folder
            extract(dl.getSavePath(), {dir: directoryPath}).then(() => {
                this.mainWindow.webContents.send('status_update', {
                    name: info.name,
                    message: 'Extracting complete, cleaning up.'
                })

                //Delete the downloaded zip folder
                fs.rmSync(dl.getSavePath(), {recursive: true, force: true})
                this.mainWindow.webContents.send('status_update', {
                    name: info.name,
                    message: 'Clean up complete'
                })

                //Update the config.env file or the app manifest depending on the application
                if (info.name === 'Station' || info.name === 'NUC') {
                    this.manifestController.updateAppManifest(info.name, "LeadMe", null, null);
                    this.extraDownloadCriteria(info.name, directoryPath);
                } else {
                    this.manifestController.updateAppManifest(info.name, "Custom", null, null);
                }
            });
            downloadWindow.destroy()
            this.downloading = false;
        });
    }

    /**
     * There are extra download criteria associated with the Station and NUC software. This function handles the downloading
     * and folder creation required for installation.
     */
    async extraDownloadCriteria(appName: string, directoryPath: string): Promise<void> {
        //If installing the Station or NUC software edit the .env file with the time created
        await Encryption.encryptFile(`TIME_CREATED=${new Date()}`, join(directoryPath, '_config/config.env'));

        if (appName !== 'Station') return;

        this.downloadSetVol(directoryPath);
    }

    /**
     * Download and extract the SetVol program into the ~/Station/external/SetVol location, if the location does not exist
     * it will be created. After extraction the downloadSteamCMD is triggered.
     * @param directoryPath A string representing the working directory of the LeadMeLauncher program.
     */
    downloadSetVol(directoryPath: string) {
        //Create a directory to hold the external applications of SetVol
        const setVolDirectory = join(directoryPath, 'external', 'SetVol');
        fs.mkdirSync(setVolDirectory, {recursive: true});

        let setVolInfo = {
            url: `${this.host}/program-setvol`,
            properties: {
                directory: setVolDirectory
            }
        }

        //Download/Extra/Clean up SetVol
        // @ts-ignore
        download(BrowserWindow.fromId(this.mainWindow.id), setVolInfo.url, setVolInfo.properties).then((dl) => {
            extract(dl.getSavePath(), {dir: setVolDirectory}).then(() => {
                //Delete the downloaded zip folder
                fs.rmSync(dl.getSavePath(), {recursive: true, force: true})
            });

            this.mainWindow.webContents.send('status_update', {
                name: 'SetVol',
                message: 'SetVol installed successfully'
            });

            this.downloadSteamCMD(directoryPath);
        });
    }

    /**
     * Download and extract the SteamCMD program into the ~/Station/external/steamcmd location, if the location does not
     * exist it will be created.
     * @param directoryPath A string representing the working directory of the LeadMeLauncher program.
     */
    downloadSteamCMD(directoryPath: string) {
        //Create a directory to hold the external applications of SteamCMD
        const steamCMDDirectory = join(directoryPath, 'external', 'steamcmd');
        fs.mkdirSync(steamCMDDirectory, {recursive: true});

        let steamCMDInfo = {
            url: `${this.host}/program-steamcmd`,
            properties: {
                directory: steamCMDDirectory
            }
        }

        //Download/Extra/Clean up SteamCMD
        // @ts-ignore
        download(BrowserWindow.fromId(this.mainWindow.id), steamCMDInfo.url, steamCMDInfo.properties).then((dl) => {
            extract(dl.getSavePath(), {dir: steamCMDDirectory}).then(() => {
                //Delete the downloaded zip folder
                fs.rmSync(dl.getSavePath(), {recursive: true, force: true})

                this.mainWindow.webContents.send('status_update', {
                    name: 'SteamCMD',
                    message: 'SteamCMD installed successfully'
                });
            });
        });
    }

    /**
     * Open up SteamCMD for the first time, installing and updating the components and passing the default Steam experience
     * location and the login parameters, this will pause on the Steam Guard step.
     */
    async configureSteamCMD(_event: IpcMainEvent, info: any) {
        //The launcher directory path
        const directoryPath = join(this.appDirectory, 'Station')

        //Create a directory to hold the external applications of SteamCMD
        const steamCMDDirectory = join(directoryPath, 'external', 'steamcmd');
        fs.mkdirSync(steamCMDDirectory, {recursive: true});

        let steamUserName: string;
        let steamPassword: string

        //Use the provided variables or use the locally saved ones
        if(info.username !== undefined && info.password !== undefined) {
            steamUserName = info.username;
            steamPassword = info.password;
        } else {
            //Find the local steam variables
            const config = join(this.appDirectory, 'Station/_config/config.env');

            const decryptedData = await Encryption.detectFileEncryption(config);
            if(decryptedData == null) {
                this.mainWindow.webContents.send('status_update', {
                    name: 'SteamCMD',
                    message: 'Steam password or Login not found in Station config.env'
                });
                return;
            }
            let dataArray = decryptedData.split('\n'); // convert file data in an array

            // looking for a line that contains the Steam username and password, split the line to get the value.
            const usernameKeyword = "SteamUserName";
            steamUserName = dataArray.filter(line => line.startsWith(usernameKeyword))[0].split("=")[1];

            const passwordKeyword = "SteamPassword";
            steamPassword = dataArray.filter(line => line.startsWith(passwordKeyword))[0].split("=")[1];
        }

        if (steamUserName === null || steamPassword === null) {
            this.mainWindow.webContents.send('status_update', {
                name: 'SteamCMD',
                message: 'Steam password or Login not found in Station config.env'
            });
            return;
        }

        const args = ` +force_install_dir \\"C:/Program Files (x86)/Steam\\" +login ${steamUserName} ${steamPassword}`;

        //Open SteamCMD for first time installation/update
        exec("start cmd @cmd /k " + resolve(steamCMDDirectory, 'steamcmd.exe') + args);
    }

    /**
     * Delete an application, including all sub folders and saved data.
     */
    async deleteApplication(_event: IpcMainEvent, info: any): Promise<void> {
        const directoryPath = join(this.appDirectory, info.name)

        await this.killAProcess(info.name, info.altPath, true);

        //Remove the app's directory, this may be a custom folder with a header image as well
        if(fs.existsSync(directoryPath)) {
            fs.rmSync(directoryPath, {recursive: true, force: true});
        }

        await this.manifestController.removeFromAppManifest(info.name);
        await this.manifestController.removeVREntry(info.name);

        //If true the application is an imported one
        if(info.altPath != '') {
            //Send back the new application and its assigned ID
            this.mainWindow.webContents.send('backend_message', {
                channelType: "application_imported",
                name: info.name,
                altPath: info.altPath,
                action: "removed",
                message: `Imported application removed: ${info.name}`
            });
        } else {
            this.mainWindow.webContents.send('status_update', {
                name: info.name,
                message: `${info.name} removed.`
            });
        }
    }

    /**
     * Launch a requested application.
     */
    async launchApplication(_event: IpcMainEvent, info: any): Promise<void> {
        const remote = this.configController.checkIfRemoteConfigIsEnabled(_event, { applicationType: info.name })
        this.host = info.host;
        if (remote) {
            const idTokenResponse = await this.configController.generateIdTokenFromRemoteConfigFile(info.name)
            await this.configController.downloadAndUpdateLocalConfig(info.name, idTokenResponse)
            if (info.name == 'NUC') {
                await this.configController.compareJsonFileAndUpdate('appliance_list', idTokenResponse)
                await this.configController.compareJsonFileAndUpdate('station_list', idTokenResponse)
            }
        }

        await this.killAProcess(info.name, info.path, true);

        if(info.name == "Station" || info.name == "NUC") {
            await this.updateLeadMeApplication(info.name);
        }

        //Load from the local leadme_apps folder or the supplied absolute path
        let exePath = info.path == '' ? join(this.appDirectory, `${info.name}/${info.name}.exe`) : info.path;

        //Read any launch parameters that the manifest may have
        const params = await this.manifestController.getLaunchParameterValues(info.name);
        spawn(exePath, params, {
            detached: true
        });
    }

    /**
     * Check for an update for either the Station or NUC software, if there is one download and extract the update, do
     * not download files such as steamcmd or override config.env
     */
    async updateLeadMeApplication(appName: string): Promise<void> {
        this.downloading = true;
        const directoryPath = join(this.appDirectory, appName);

        const nucUrl = '/program-nuc-version';
        const stationUrl = '/program-station-version';

        let url: string;
        if(appName === "NUC") {
            url = this.host + nucUrl;
        } else if(appName === "Station") {
            url = this.host + stationUrl;
        } else {
            this.downloading = false;
            return;
        }

        let downloadWindow = new BrowserWindow({
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
            this.downloading = false;
            downloadWindow.destroy();
            return { action: 'deny' }
        });

        downloadWindow.loadFile(join(app.getAppPath(), 'static', 'download.html'));

        downloadWindow.webContents.on('did-finish-load', () => {
            downloadWindow.webContents.executeJavaScript(`
                const dynamicTextElement = document.getElementById('update-message');
                dynamicTextElement.innerText = 'Checking for ${appName} update, please wait...';`
            );
        });

        //Check if the server is online
        if(!await checkFileAvailability(url)) {
            const feedUrl = await collectFeedURL();
            if(feedUrl == null) {
                this.downloading = false;
                downloadWindow.destroy();
                return;
            }
            this.offlineHost = `http://${feedUrl}:8088`;

            this.mainWindow.webContents.send('status_update', {
                name: appName,
                message: `Hosting server offline: ${this.host}. Checking offline backup: ${this.offlineHost}.`
            });

            //Check if offline line mode is available
            if(appName === "NUC") {
                url = this.offlineHost + nucUrl;
            } else if(appName === "Station") {
                url = this.offlineHost + stationUrl;
            } else {
                this.downloading = false;
                downloadWindow.destroy();
                return;
            }

            if(!await checkFileAvailability(url)) {
                this.mainWindow.webContents.send('status_update', {
                    name: appName,
                    message: 'Server offline'
                });

                this.downloading = false;
                downloadWindow.destroy();
                return;
            }
        }

        const request_call = new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;

            const request = protocol.get(url, (response) => {
                let chunks_of_data = '';

                response.on('data', (chunk) => {
                    chunks_of_data += chunk;
                });

                response.on('end', () => {
                    let response_body = chunks_of_data.split(' ')[0];
                    // Promise resolved on success
                    resolve(response_body.toString());
                });

                response.on('error', (error) => {
                    console.log(error);
                    // Promise rejected on error
                    reject(error);
                });
            });

            request.on('error', (error) => {
                console.log(error);
                // Promise rejected on error
                reject(error);
            });
        });

        //Online version number
        let onlineVersion: string;
        try {
            onlineVersion = <string>await request_call;
        } catch {
            console.log("Unable to establish connection to server.");
            return;
        }

        //Write out and then get the local version
        const args = `writeversion`;

        try {
            // Replace "program.exe" with the path to your program
            const program = spawnSync(resolve(directoryPath, `${appName}.exe`), [args]);

            console.log(`Program exited with status: ${program.status}`);
        } catch (error) {
            // @ts-ignore
            console.log(error.toString());
        }

        const versionPath = join(this.appDirectory, `${appName}/_logs/version.txt`);

        if(!fs.existsSync(versionPath)) {
            console.log("Cannot find version file path.");
            this.downloading = false;
            return;
        }
        const localVersion = fs.readFileSync(versionPath, 'utf8')

        //Compare the versions
        console.log("Online version: " + onlineVersion);
        console.log("Local version: " + localVersion);
        const newVersionAvailable = semver.gt(onlineVersion, localVersion)

        console.log("Difference: " + newVersionAvailable);

        if(newVersionAvailable == null || !newVersionAvailable) {
            this.downloading = false;
            downloadWindow.destroy();
            return;
        }

        //Check what type of update is required (I.e. patch, minor, major) can
        //handle these differently in the future.
        const difference = semver.diff(onlineVersion, localVersion);

        //Tell the user there is an update
        this.mainWindow.webContents.send('status_update', {
            name: appName,
            message: `${appName} requires an update. Update type ${difference}`
        });

        //Create the url path
        let baseUrl = url.replace("-version", "");

        //Create the new info packet for the download function
        let info = {
            url: baseUrl,
            properties: {
                directory: directoryPath,
                onProgress: undefined
            }
        }

        const location = await collectLocation()
        try {
            Sentry.captureMessage(`Updating ${appName} from ${localVersion} to ${onlineVersion} at site ${location} at MAC address ${getInternalMac()}`)
        } catch (e) {
            Sentry.captureException(e)
        }

        //Maintain a trace on the download progress
        // @ts-ignore
        info.properties.onProgress = (status): void => {
            console.log(status)

            try {
                downloadWindow.webContents.executeJavaScript(`
                    try {
                        const dynamicTextElement = document.getElementById('update-message');
                        dynamicTextElement.innerText = 'Downloading ${appName} update, ${(status.percent * 100).toFixed(2)} %';
                    } catch (error) {
                        console.error('Error in executeJavaScript:', error);
                    }
                `);
            } catch (e) {
                console.log(e);
            }
        }

        const download_call = new Promise((resolve, reject) => {
            // @ts-ignore
            download(BrowserWindow.fromId(this.mainWindow.id), info.url, info.properties).then((dl) => {
                console.log("Download complete")
                downloadWindow.setProgressBar(2)
                downloadWindow.webContents.executeJavaScript(`
                    const dynamicTextElement = document.getElementById('update-message');
                    dynamicTextElement.innerText = 'Download completed, installing update';`
                );
                this.mainWindow.webContents.send('status_update', {
                    name: appName,
                    message: `Download complete, now extracting. ${dl.getSavePath()}`
                });

                //Unzip the project and add it to the local installation folder
                extract(dl.getSavePath(), {dir: directoryPath}).then(() => {
                    this.mainWindow.webContents.send('status_update', {
                        name: appName,
                        message: 'Extracting complete, cleaning up.'
                    })
                    console.log("Extracting complete")

                    //Delete the downloaded zip folder
                    fs.rmSync(dl.getSavePath(), {recursive: true, force: true})
                    this.mainWindow.webContents.send('status_update', {
                        name: appName,
                        message: 'Update clean up complete'
                    })
                    console.log("Update clean up complete")

                    try {
                        Sentry.captureMessage(`Completed ${appName} update from ${localVersion} to ${onlineVersion} at site ${location} with MAC address ${getInternalMac()}`)
                    } catch (e) {
                        Sentry.captureException(e)
                    }

                    resolve("Download Complete");
                }).catch(err => {
                    reject(err);
                })
                downloadWindow.destroy()
                this.downloading = false;
            })
        });

        try {
            await download_call;
        } catch {
            console.log("Download failed.");
        }
    }

    /**
     * Stop a running process on the local machine.
     * @param appName A string of the process to stop.
     * @param filePath A string of the alternate file path, this is to stop imported applications.
     * @param backend A boolean for if this was triggered from the frontend of backend.
     */
    async killAProcess(appName: string, filePath: string, backend: boolean): Promise<void> {
        try {
            if(filePath != null && filePath !== "") {
                const parentPath = path.dirname(filePath);

                // Usage
                const powershellCmd = `Get-Process | Where-Object {$_.Path -Like "${parentPath}*"} | Select-Object -ExpandProperty ID | ForEach-Object { Stop-Process -Id $_ }`;
                try {
                    spawnSync('powershell.exe', ['-command', powershellCmd]);
                } catch (error) {
                    console.error(`Error executing command: ${error}`);
                }
            } else {
                const isWindows = process.platform === 'win32';

                // Use `taskkill` on Windows, `pkill` otherwise
                const killCommand = isWindows ? 'taskkill /F /FI' : 'pkill';

                //Execute the command to find and kill the process by its name - it will not remove the directory
                //if the process is still running.
                const result = execSync(`${killCommand} "imagename eq ${appName}*"`).toString();
                console.log(result);
            }
        }
        catch (error) {
            // @ts-ignore
            console.log(error.toString());
        }
        finally {
            if (!backend) {
                this.mainWindow.webContents.send('backend_message', {
                    channelType: "stop_application",
                    name: appName
                });
            }
        }
    }
}
