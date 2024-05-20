import fs from "fs";
import path from "path";
import Encryption from "../encryption/Encryption";
import { join, resolve } from "path";
import { download } from "electron-dl";
import extract from "extract-zip";
import { exec, execSync, spawn, spawnSync } from "child_process";
import semver from "semver/preload";
import * as http from "http";
import * as https from "https";
import { BrowserWindow } from "electron";
import IpcMainEvent = Electron.IpcMainEvent;
import * as Sentry from "@sentry/electron";
import {
    checkFileAvailability, checkForElectronVersion,
    collectFeedURL,
    collectLocation, createDownloadWindow, findExecutableWithNameSetup,
    getInternalMac
} from "../util/Utilities";
import { taskSchedulerItem } from "../util/TaskScheduler";
import * as CONSTANT from "../assets/constants";
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
    embeddedDirectory: string;
    toolDirectory: string;
    host: string = "";
    offlineHost: string = "http://localhost:8088"; //Changes if on NUC (localhost) or Station (NUC IP address)
    FIREBASE_BASE_URL: string = 'https://leadme-labs-default-rtdb.asia-southeast1.firebasedatabase.app/lab_remote_config/'

    constructor(ipcMain: Electron.IpcMain, mainWindow: Electron.BrowserWindow) {
        this.manifestController = new ManifestController(ipcMain, mainWindow);
        this.configController = new ConfigController(ipcMain, mainWindow);
        this.ipcMain = ipcMain;
        this.mainWindow = mainWindow;
        this.appDirectory = process.env.APPDATA + '/leadme_apps';
        this.embeddedDirectory = process.env.APPDATA + '/leadme_apps/Embedded';
        this.toolDirectory = process.env.APPDATA + '/leadme_apps/Tools';

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
                case "modify_app_manifest":
                    void this.manifestController.modifyAppManifest(info);
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
                case "electron_check_setup":
                    void this.manifestController.isElectronSetup(info);
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
                case "update_application":
                    void this.updateApplication(_event, info);
                    break;
                case "stop_application":
                    void this.killAProcess(info.name, info.altPath, false);
                    break;
                case "electron_setup":
                    void this.setupElectronApplication(_event, info);
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
        const downloadWindow = createDownloadWindow(`Downloading ${info.name} update, please wait...`);

        console.log(info);

        this.host = info.host;
        let url = this.generateVersionURL(info, info.name);

        //Set the directory for installation
        let directoryPath: string;
        switch (info.wrapperType) {
            case CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED:
                directoryPath = join(this.embeddedDirectory, "/", info.name);
                break;

            case CONSTANT.APPLICATION_TYPE.APPLICATION_TOOL:
                let version: string = await checkForElectronVersion(url);
                if (version === "" || version === null) {
                    downloadWindow.destroy();
                    this.mainWindow.webContents.send('status_message', {
                        channelType: "status_update",
                        name: info.name,
                        message: `Server offline`
                    });
                    return;
                }

                url = this.host + `/${version}`;
                directoryPath = join(this.toolDirectory, info.name);
                break;

            case CONSTANT.APPLICATION_TYPE.APPLICATION_LEADME:
            default:
                directoryPath = join(this.appDirectory, info.name);
                break;
        }

        this.mainWindow.webContents.send('status_message', {
            channelType: "status_update",
            name: info.name,
            message: `Initiating download: ${directoryPath}`
        });

        //Create the main directory to hold the application
        fs.mkdirSync(directoryPath, {recursive: true})

        //Override the incoming directory path
        info.properties.directory = directoryPath;

        //Maintain a trace on the download progress
        info.properties.onProgress = (status): void => {
            console.log('status', status)
            this.mainWindow.webContents.send('status_message', {
                channelType: "download_progress",
                applicationName: info.name,
                downloadProgress: status.percent
            });

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
        console.log(url)
        if(!await checkFileAvailability(url, 10000)) {
            //Server is offline
            const feedUrl = await collectFeedURL();
            if(feedUrl == null) {
                this.downloading = false;
                return;
            }
            this.offlineHost = `http://${feedUrl}:8088`;

            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: info.name,
                message: `Hosting server offline: ${this.host}. Checking offline backup: ${this.offlineHost}.`
            });

            //Check if offline line mode is available
            url = this.offlineHost + info.url + info.url + ".zip";
            console.log(url);
            if(!await checkFileAvailability(url, 10000)) {
                console.log("Checking backup routes");

                //Check the older route
                if(info.name === "NUC") {
                    url = this.offlineHost + '/program-nuc';
                } else if(info.name === "Station") {
                    url = this.offlineHost + '/program-station';
                }

                if (!await checkFileAvailability(url, 10000)) {
                    downloadWindow.destroy();
                    this.mainWindow.webContents.send('status_message', {
                        channelType: "status_update",
                        name: info.name,
                        message: 'Server offline'
                    });
                    this.downloading = false;
                    return;
                }
            }
        } else {
            //Server is online
            if (this.host.includes("vultrobjects")) {
                if(info.name === "NUC") {
                    url = this.host + "NUC/NUC.zip";
                } else if(info.name === "Station") {
                    url = this.host + "Station/Station.zip";
                } else if (info.wrapperType === "embedded") {
                    url = this.host + "application.zip"
                } else {
                    this.downloading = false;
                    return;
                }
            } else if (this.host.includes("herokuapp")) {
                if(info.name === "NUC") {
                    url = this.host + '/program-nuc';
                } else if(info.name === "Station") {
                    url = this.host + '/program-station';
                } else {
                    this.downloading = false;
                    return;
                }
            } else if (this.host.includes("localhost")) {
                // todo
                url = ''
            }
        }

        // @ts-ignore
        download(BrowserWindow.fromId(this.mainWindow.id), url, info.properties).then((dl) => {
            downloadWindow.setProgressBar(2)
            downloadWindow.webContents.executeJavaScript(`
                const dynamicTextElement = document.getElementById('update-message');
                dynamicTextElement.innerText = 'Download completed, installing update';`
            );
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: info.name,
                message: `Download complete, now extracting. ${dl.getSavePath()}`
            })

            //Update the config.env file or the app manifest depending on the application
            switch (info.wrapperType) {
                case CONSTANT.APPLICATION_TYPE.APPLICATION_LEADME:
                    //Unzip the project and add it to the local installation folder
                    extract(dl.getSavePath(), {dir: directoryPath}).then(() => {
                        this.mainWindow.webContents.send('status_message', {
                            channelType: "status_update",
                            name: info.name,
                            message: 'Extracting complete, cleaning up.'
                        })

                        //Delete the downloaded zip folder
                        fs.rmSync(dl.getSavePath(), {recursive: true, force: true})
                    }).then(async () => {
                        await this.manifestController.updateAppManifest(info.name, info.alias, "LeadMe", null, null, null);
                        await this.extraDownloadCriteria(info.name, directoryPath);
                    });
                    break;

                case CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED:
                    //Unzip the project and add it to the local installation folder
                    extract(dl.getSavePath(), {dir: directoryPath}).then(() => {
                        this.mainWindow.webContents.send('status_message', {
                            channelType: "status_update",
                            name: info.name,
                            message: 'Extracting complete, cleaning up.'
                        })

                        //Delete the downloaded zip folder
                        fs.rmSync(dl.getSavePath(), {recursive: true, force: true})
                    }).then(() => {
                        this.manifestController.updateAppManifest(info.name, info.alias, "Embedded", null, null, null);
                    });
                    break;

                case CONSTANT.APPLICATION_TYPE.APPLICATION_TOOL:
                    this.manifestController.updateAppManifest(info.name, info.alias, "Tool", null, null, false);
                    break;

                case CONSTANT.APPLICATION_TYPE.APPLICATION_IMPORTED:
                default:
                    this.manifestController.updateAppManifest(info.name, info.alias, "Custom", null, null, null);
            }

            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: info.name,
                message: 'Clean up complete'
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

        await this.downloadSteamCMD(directoryPath);
    }

    /**
     * Download and extract the SteamCMD program into the ~/Station/external/steamcmd location, if the location does not
     * exist it will be created.
     * @param directoryPath A string representing the working directory of the LeadMeLauncher program.
     */
    async downloadSteamCMD(directoryPath: string) {
        //Create a directory to hold the external applications of SteamCMD
        const steamCMDDirectory = join(directoryPath, 'external', 'steamcmd');
        fs.mkdirSync(steamCMDDirectory, {recursive: true});

        var url = this.host.includes("vultrobjects") ? `${this.host}/steamcmd/steamcmd.zip` : `${this.host}/program-steamcmd`

        let steamCMDInfo = {
            url,
            properties: {
                directory: steamCMDDirectory
            }
        }

        //Download/Extra/Clean up SteamCMD
        // @ts-ignore
        await download(BrowserWindow.fromId(this.mainWindow.id), steamCMDInfo.url, steamCMDInfo.properties).then((dl) => {
            extract(dl.getSavePath(), {dir: steamCMDDirectory}).then(() => {
                //Delete the downloaded zip folder
                fs.rmSync(dl.getSavePath(), {recursive: true, force: true})

                this.mainWindow.webContents.send('status_message', {
                    channelType: "status_update",
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
                this.mainWindow.webContents.send('status_message', {
                    channelType: "status_update",
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
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
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
        let directoryPath: string;
        switch (info.wrapperType) {
            case CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED:
                directoryPath = join(this.embeddedDirectory, info.name);
                break;

            case CONSTANT.APPLICATION_TYPE.APPLICATION_TOOL:
                directoryPath = join(this.toolDirectory, info.name);
                break;

            case CONSTANT.APPLICATION_TYPE.APPLICATION_LEADME:
            default:
                directoryPath = join(this.appDirectory, info.name);
                break;
        }

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
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: info.name,
                message: `${info.name} removed.`
            });
        }
    }

    /**
     * Launch the electron application's setup wizard.
     * @param _event
     * @param info
     */
    async setupElectronApplication(_event: IpcMainEvent, info: any): Promise<void> {
        let directoryPath: string = this.toolDirectory;

        // Search the tool directory to see if there is an executable with Setup in the name
        const toolDirectory: string = join(directoryPath, `${info.name}`);
        const executable = await findExecutableWithNameSetup(toolDirectory);
        const exePath: string = join(directoryPath, `${info.name}/${executable}`);

        // Construct the PowerShell command to start the executable without cmd
        const powershellCommand = `Start-Process -FilePath "${exePath}" -Verb RunAs`;

        // Execute the PowerShell command
        exec(powershellCommand, { shell: 'powershell.exe' }, (err, stdout, stderr) => {
            if (err)  console.error('Error:', err);
            if (stdout) console.log('stdout:', stdout);
            if (stderr) console.error('stderr:', stderr);
        });
    }

    /**
     * Launch a requested application.
     */
    async launchApplication(_event: IpcMainEvent, info: any): Promise<void> {
        const remote = this.configController.checkIfRemoteConfigIsEnabled(_event, { applicationType: info.name })
        this.host = info.host;
        if (!info.path || info.path === "") {
            if (info.wrapperType === CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED) {
                info.path = process.env.APPDATA + '\\leadme_apps\\Embedded\\' + info.name
            }
        }
        if (remote) {
            const idTokenResponse = await this.configController.generateIdTokenFromRemoteConfigFile(info.name)
            await this.configController.downloadAndUpdateLocalConfig(info.name, idTokenResponse)
            if (info.name == 'NUC') {
                await this.configController.compareJsonFileAndUpdate('appliance_list', idTokenResponse)
                await this.configController.compareJsonFileAndUpdate('station_list', idTokenResponse)
            }
        }

        await this.killAProcess(info.name, info.path, true);

        if(info.wrapperType === CONSTANT.APPLICATION_TYPE.APPLICATION_LEADME || info.wrapperType === CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED) {
            await this.updateApplication(_event, info);
        }

        //Load from the local leadme_apps folder or the supplied absolute path
        let directoryPath: string;
        switch (info.wrapperType) {
            case CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED:
                directoryPath = this.embeddedDirectory;
                break;

            case CONSTANT.APPLICATION_TYPE.APPLICATION_TOOL:
                directoryPath = this.toolDirectory;
                break;

            case CONSTANT.APPLICATION_TYPE.APPLICATION_LEADME:
            default:
                directoryPath = this.appDirectory;
                break;
        }

        if (info.wrapperType === CONSTANT.APPLICATION_TYPE.APPLICATION_TOOL) {
            const exePath = info.path == '' ? join(directoryPath, `${info.name}/${info.alias}/${info.alias}.exe`) : info.path;

            // Construct the PowerShell command to start the executable without cmd
            const powershellCommand = `Start-Process -FilePath "${exePath}" -Verb RunAs`;

            // Execute the PowerShell command
            exec(powershellCommand, { shell: 'powershell.exe' }, (err, stdout, stderr) => {
                if (err)  console.error('Error:', err);
                if (stdout) console.log('stdout:', stdout);
                if (stderr) console.error('stderr:', stderr);
            });
        } else {
            const exePath = info.path == '' ? join(directoryPath, `${info.name}/${info.alias ?? info.name}.exe`) : info.path;

            //Read any launch parameters that the manifest may have
            const params = await this.manifestController.getLaunchParameterValues(info.name);
            spawn(exePath, params, {
                detached: true
            });
        }
    }

    /**
     * Check for an update for either the Station or NUC software, if there is one download and extract the update, do
     * not download files such as steamcmd or override config.env
     */
    async updateApplication(_event: IpcMainEvent, details: any): Promise<void> {
        const appName = details.name;
        this.downloading = true;
        const directoryPath = details.wrapperType === CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED ? join(this.appDirectory, "Embedded\\" , appName) : join(this.appDirectory, appName);

        //Generate the correct URL
        let url: string = this.generateVersionURL(details, appName);

        //Create the download window
        let downloadWindow = createDownloadWindow(`Checking for ${appName} update, please wait...`);

        //Check if the main server is online
        const { offline, backupUrl } = await this.checkServerStatus(details, appName);
        if (backupUrl.length > 0) {
            url = backupUrl;
        }

        //Online version number
        let onlineVersion: string;
        try {
            onlineVersion = await this.fetchOnlineVersion(url);
        } catch {
            console.log("Unable to establish connection to server.");
            return;
        }

        //Write out and then get the local version
        const localVersion = this.getLocalVersion(details, appName, directoryPath);

        //Compare the versions
        const isUpdateAvailable = this.checkAndUpdateVersion(onlineVersion, localVersion, details, appName);
        if (!isUpdateAvailable) {
            downloadWindow.destroy();
            return;
        }

        //Generate the download URL
        const baseUrl: string = this.generateBaseUrl(details, appName, offline);

        //Create the new info packet for the download function
        let info = {
            url: baseUrl,
            properties: {
                directory: directoryPath,
                onProgress: undefined
            }
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

        //Download the application
        try {
            await this.performDownload(info, appName, details, directoryPath, downloadWindow, localVersion, onlineVersion);
        } catch {
            console.log("Download failed.");
        }
    }

    /**
     * Generates the version URL based on the provided details and application name.
     * @param details Object containing host and wrapperType information.
     * @param appName Name of the application.
     * @returns The version URL if it can be generated, otherwise an empty string.
     */
    generateVersionURL(details: any, appName: string): string {
        let url: string = "";

        if (details.host.includes("vultrobjects")) {
            if (appName === "NUC") {
                url = `${details.host}NUC/version`;
            } else if (appName === "Station") {
                url = `${details.host}Station/version`;
            } else if (details.wrapperType === "embedded") {
                url = `${details.host}version`;
            } else {
                return "";
            }
        } else if (details.host.includes("herokuapp")) {
            if (appName === "NUC") {
                url = `${details.host}/program-nuc-version`;
            } else if (appName === "Station") {
                url = `${details.host}/program-station-version`;
            } else {
                return "";
            }
        } else if (details.host.includes("localhost")) {
            // todo
            url = '';
        }

        return url;
    }

    /**
     * Checks the server status and returns the offline status and backup URL if applicable.
     * @param details Object containing host information.
     * @param appName Name of the application.
     * @returns An object containing the offline status and backup URL.
     */
    async checkServerStatus(details: any, appName: string): Promise<{ offline: string, backupUrl: string }> {
        let offline = "";
        let backupUrl = "";

        if (!await checkFileAvailability(backupUrl, 5000)) {
            offline = "original";
            const feedUrl = await collectFeedURL();

            if (feedUrl == null) {
                return { offline: "", backupUrl: "" };
            }

            this.offlineHost = `http://${feedUrl}:8088`;

            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: appName,
                message: `Hosting server offline: ${details.host}. Checking offline backup: ${this.offlineHost}.`
            });

            if (appName === "NUC" || appName === "Station") {
                backupUrl = `${this.offlineHost}/${appName}/version`;
            } else {
                return { offline: "", backupUrl: "" };
            }

            if (!await checkFileAvailability(backupUrl, 5000)) {
                offline = "backup";
                backupUrl = `${this.offlineHost}/program-${appName.toLowerCase()}-version`;

                if (!await checkFileAvailability(backupUrl, 10000)) {
                    this.mainWindow.webContents.send('status_message', {
                        channelType: "status_update",
                        name: appName,
                        message: 'Server offline'
                    });
                    return { offline: "", backupUrl: "" };
                }
            }
        }

        return { offline, backupUrl };
    }

    /**
     * Fetches the online version from the provided URL.
     * @param url The URL from which to fetch the online version.
     * @returns A promise that resolves with the online version string.
     */
    async fetchOnlineVersion(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
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
    }

    /**
     * Retrieves the local version of the application based on the provided details.
     * @param details Object containing wrapperType information.
     * @param appName Name of the application.
     * @param directoryPath Path to the directory containing the application files.
     * @returns The local version of the application.
     */
    getLocalVersion(details: any, appName: string, directoryPath: string): string {
        let localVersion = "";

        if (details.wrapperType === CONSTANT.APPLICATION_TYPE.APPLICATION_LEADME) {
            const args = `writeversion`;

            try {
                const program = spawnSync(resolve(directoryPath, `${appName}.exe`), [args]);
                console.log(`Program exited with status: ${program.status}`);
            } catch (error: any) {
                console.log(error.toString());
            }

            const versionPath = join(this.appDirectory, `${appName}/_logs/version.txt`);

            if (!fs.existsSync(versionPath)) {
                console.log("Cannot find version file path.");
                return localVersion;
            }
            localVersion = fs.readFileSync(versionPath, 'utf8');
        }

        if (details.wrapperType === CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED) {
            const versionPath = join(directoryPath, `\\version.txt`);

            if (!fs.existsSync(versionPath)) {
                console.log("Cannot find version file path.");
                return localVersion;
            }
            localVersion = fs.readFileSync(versionPath, 'utf8');
        }

        return localVersion;
    }

    /**
     * Checks if there is a new version available and updates the application status accordingly.
     * @param onlineVersion The online version of the application.
     * @param localVersion The local version of the application.
     * @param details Object containing updateOnly information.
     * @param appName Name of the application.
     * @returns A boolean indicating whether there is a new version available.
     */
    checkAndUpdateVersion(onlineVersion: string, localVersion: string, details: any, appName: string): boolean {
        console.log("Online version: " + onlineVersion);
        console.log("Local version: " + localVersion);
        const newVersionAvailable = semver.gt(onlineVersion, localVersion);

        console.log("Difference: " + newVersionAvailable);

        if (newVersionAvailable === null || !newVersionAvailable) {
            this.downloading = false;
            if (details.updateOnly) {
                this.mainWindow.webContents.send('status_message', {
                    channelType: "status_update",
                    name: appName,
                    message: 'Clean up complete'
                });
            }
            return false;
        }

        const difference = semver.diff(onlineVersion, localVersion);

        this.mainWindow.webContents.send('status_message', {
            channelType: "status_update",
            name: appName,
            message: `${appName} requires an update. Update type ${difference}`
        });

        return true;
    }

    /**
     * Generates the base URL for downloading the application based on the host and application name.
     * @param details Object containing host and wrapperType information.
     * @param appName Name of the application.
     * @param offline Indicates if the server is offline.
     * @returns The base URL for downloading the application.
     */
    generateBaseUrl(details: any, appName: string, offline: string): string {
        let baseUrl: string = "";

        if (offline.length > 0) {
            if (offline === "original") {
                if (appName === "NUC") {
                    baseUrl = details.host + "/NUC/NUC.zip";
                } else if (appName === "Station") {
                    baseUrl = details.host + "/Station/Station.zip";
                }
            } else if (offline === "backup") {
                if (appName === "NUC") {
                    baseUrl = details.host + '/program-nuc';
                } else if (appName === "Station") {
                    baseUrl = details.host + '/program-station';
                }
            }
        } else if (details.host.includes("vultrobjects")) {
            if (appName === "NUC") {
                baseUrl = details.host + "NUC/NUC.zip";
            } else if (appName === "Station") {
                baseUrl = details.host + "Station/Station.zip";
            } else if (details.wrapperType === CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED) {
                baseUrl = details.host + "application.zip";
            }
        } else if (details.host.includes("herokuapp")) {
            if (appName === "NUC") {
                baseUrl = details.host + '/program-nuc';
            } else if (appName === "Station") {
                baseUrl = details.host + '/program-station';
            }
        } else if (details.host.includes("localhost")) {
            // todo
            baseUrl = "todo";
        }

        return baseUrl;
    }

    /**
     * Performs the download and installation of the application update.
     * @param info Information about the update.
     * @param appName Name of the application.
     * @param details Details of the application.
     * @param directoryPath Path to the directory where the application is installed.
     * @param downloadWindow Reference to the download window.
     * @param localVersion Local version of the application.
     * @param onlineVersion Online version of the application.
     * @returns A promise that resolves once the download and installation is complete.
     */
    async performDownload(info: any, appName: string, details: any, directoryPath: string, downloadWindow: any, localVersion: string, onlineVersion: string): Promise<void> {
        const location = await collectLocation()
        try {
            Sentry.captureMessage(`Updating ${appName} from ${localVersion} to ${onlineVersion} at site ${location} at MAC address ${getInternalMac()}`)
        } catch (e) {
            Sentry.captureException(e)
        }

        return new Promise((resolve, reject) => {
            // @ts-ignore
            download(BrowserWindow.fromId(this.mainWindow.id), info.url, info.properties).then((dl) => {
                console.log("Download complete");
                downloadWindow.setProgressBar(2);
                downloadWindow.webContents.executeJavaScript(`
                const dynamicTextElement = document.getElementById('update-message');
                dynamicTextElement.innerText = 'Download completed, installing update';`
                );
                this.mainWindow.webContents.send('status_message', {
                    channelType: "status_update",
                    name: appName,
                    message: `Download complete, now extracting. ${dl.getSavePath()}`
                });

                extract(dl.getSavePath(), { dir: directoryPath }).then(() => {
                    this.mainWindow.webContents.send('status_message', {
                        channelType: "status_update",
                        name: appName,
                        message: 'Extracting complete, cleaning up.'
                    });
                    console.log("Extracting complete");

                    fs.rmSync(dl.getSavePath(), { recursive: true, force: true });
                    if (details.updateOnly) {
                        this.mainWindow.webContents.send('status_message', {
                            channelType: "status_update",
                            name: details.name,
                            message: 'Clean up complete'
                        });
                    } else {
                        this.mainWindow.webContents.send('status_message', {
                            channelType: "status_update",
                            name: details.name,
                            message: 'Update clean up complete'
                        });
                    }
                    console.log("Update clean up complete");

                    try {
                        Sentry.captureMessage(`Completed ${appName} update from ${localVersion} to ${onlineVersion} at site ${location ?? "unknown"} with MAC address ${getInternalMac()}`);
                    } catch (e) {
                        Sentry.captureException(e);
                    }

                    resolve();
                }).catch(err => {
                    reject(err);
                });
                downloadWindow.destroy();
                this.downloading = false;
            }).catch(err => {
                reject(err);
            });
        });
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
