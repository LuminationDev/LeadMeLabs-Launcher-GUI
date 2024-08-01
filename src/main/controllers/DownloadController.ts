import * as CONSTANT from "../assets/constants";
import semver from "semver/preload";
import * as Sentry from "@sentry/electron";
import { join, resolve } from "path";
import {
    checkFileAvailability,
    checkForElectronVersion,
    collectFeedURL, collectLocation,
    createDownloadWindow,
    generateURL, getInternalMac
} from "../util/Utilities";
import * as http from "http";
import * as https from "https";
import {BrowserWindow} from "electron";
import extract from "extract-zip";
import fs from "fs";
import { download } from "electron-dl";
import Encryption from "../encryption/Encryption";
import IpcMainEvent = Electron.IpcMainEvent;
import { spawnSync } from "child_process";
import ManifestController from "./ManifestController";

export default class DownloadController {
    ipcMain: Electron.IpcMain;
    mainWindow: Electron.BrowserWindow;
    host: string = "";
    appDirectory: string;
    embeddedDirectory: string;
    toolDirectory: string;
    offlineHost: string = "http://localhost:8088";
    downloading: boolean = false;
    manifestController: ManifestController;

    constructor(ipcMain: Electron.IpcMain, mainWindow: Electron.BrowserWindow, manifestController: ManifestController) {
        this.ipcMain = ipcMain;
        this.mainWindow = mainWindow;
        this.manifestController = manifestController;
        this.appDirectory = process.env.APPDATA + '\\leadme_apps';
        this.embeddedDirectory = process.env.APPDATA + '/leadme_apps/Embedded';
        this.toolDirectory = process.env.APPDATA + '\\leadme_apps\\Tools';
    }

    //region Download Functions
    /**
     * This function handles the downloading of a file from a given URL to a preset application folder. Periodically it will
     * send the progress information back to the renderer for user feedback.
     */
    async downloadApplication(_event: IpcMainEvent, info: any): Promise<void> {
        switch (info.wrapperType) {
            case CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED:
                await this.downloadEmbeddedApplication(info);
                break;

            case CONSTANT.APPLICATION_TYPE.APPLICATION_TOOL:
                await this.downloadToolApplication(info);
                break;

            case CONSTANT.APPLICATION_TYPE.APPLICATION_LEADME:
            default:
                await this.downloadLeadMeApplication(info);
                break;
        }
    }

    /**
     * Download an embedded application, these are in-house built applications such as WebXR Viewer, OpenBrush etc..
     * @param info An object containing the basic details of the application, including name, alias, wrapper type, host
     *              & url extension
     */
    async downloadEmbeddedApplication(info: any) {
        let [downloadWindow, url] = this.setupDownloadVariables(info);
        const directoryPath = join(this.embeddedDirectory, "/", info.name);
        this.setupDownloadDisplay(downloadWindow, directoryPath, info);

        //Check if the server is online - there is no back up for the embedded applications
        if (!await checkFileAvailability(url, 10000)) {
            this.handleServerOffline(downloadWindow, info.name);
            return;
        }

        let uploadingUrl = generateURL(info, 'uploading')
        if (await checkFileAvailability(uploadingUrl, 10000)) {
            // currently uploading, let's bail
            this.handleApplicationBeingUploaded(downloadWindow, info.name)
            return;
        }

        //Create the url to download from vultr
        url = this.host + "application.zip"

        // Usage with simple extraction
        this.handleDownload(downloadWindow, url, info, async (dl, info, finalCallback) => {
            await this.handleSoftwareExtraction(directoryPath, dl.getSavePath(), info);
            finalCallback();
        });
    }

    /**
     * Download a LeadMe suite Tool application, these are currently all built using electron and use the /latest.yml
     * to check what the current version is.
     * @param info An object containing the basic details of the application, including name, alias, wrapper type, host
     *              & url extension
     */
    async downloadToolApplication(info: any) {
        let [downloadWindow, url] = this.setupDownloadVariables(info);

        let uploadingUrl = generateURL(info, 'uploading')
        if (await checkFileAvailability(uploadingUrl, 10000)) {
            // currently uploading, let's bail
            this.handleApplicationBeingUploaded(downloadWindow, info.name)
            return;
        }

        let version: string = await checkForElectronVersion(url);
        if (version === "" || version === null) {
            this.handleServerOffline(downloadWindow, info.name);
            return;
        }

        //Create the download link for an electron application
        url = this.host + `/${version}`;
        const directoryPath = join(this.toolDirectory, info.name);
        this.setupDownloadDisplay(downloadWindow, directoryPath, info);

        //Check if the server is online - there is no back up for the Tools
        if (!await checkFileAvailability(url, 10000)) {
            this.handleServerOffline(downloadWindow, info.name);
            return;
        }

        // Usage with manifest update
        this.handleDownload(downloadWindow, url, info, (dl, info, finalCallback) => {
            this.manifestController.updateAppManifest(info.name, info.alias, "Tool", null, null, false);
            finalCallback();
        });
    }

    /**
     * Download a LeadMe related application, currently this is the NUC or Station software.
     * @param info An object containing the basic details of the application, including name, alias, wrapper type, host
     *              & url extension
     */
    async downloadLeadMeApplication(info: any) {
        let [downloadWindow, url] = this.setupDownloadVariables(info);
        const directoryPath = join(this.appDirectory, info.name);
        this.setupDownloadDisplay(downloadWindow, directoryPath, info);

        //Check if the server is online
        if (await checkFileAvailability(url, 10000)) {
            // file is available, now let's check if a new one is being uploaded and we should try again later
            let uploadingUrl = generateURL(info, 'uploading')
            if (await checkFileAvailability(uploadingUrl, 10000)) {
                // currently uploading, let's bail
                this.handleApplicationBeingUploaded(downloadWindow, info.name)
                return;
            }

            url = generateURL(info, 'application');
            if (url.length === 0) {
                this.downloading = false;
                return;
            }
        } else {
            //Server is offline
            const feedUrl = await collectFeedURL();
            if (feedUrl == null) {
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
            if (!await checkFileAvailability(url, 10000)) {
                console.log("Checking backup routes");

                //Check the older route
                if (info.name === "NUC") {
                    url = this.offlineHost + '/program-nuc';
                } else if (info.name === "Station") {
                    url = this.offlineHost + '/program-station';
                }

                if (!await checkFileAvailability(url, 10000)) {
                    this.handleServerOffline(downloadWindow, info.name);
                    return;
                }
            }
        }

        // Usage with complex extraction and additional criteria
        this.handleDownload(downloadWindow, url, info, async (dl, info, finalCallback) => {
            await this.handleSoftwareExtraction(directoryPath, dl.getSavePath(), info);
            await this.extraDownloadCriteria(info.name, directoryPath);
            finalCallback();
        });
    }

    /**
     * Set up the basic variables for downloading, including the download browser window and the version url to check.
     * @param info
     */
    setupDownloadVariables(info: any): [downloadWindow: BrowserWindow, url: string] {
        this.downloading = true;
        const downloadWindow = createDownloadWindow(`Downloading ${info.name} update, please wait...`);

        this.host = info.host;
        let url: string = generateURL(info, 'version');

        return [downloadWindow, url];
    }

    /**
     * Extract a downloaded .zip folder to the supplied directory path.
     * @param directoryPath A string of the path to extract the folder to.
     * @param savePath A string of the path to the .zip folder.
     * @param info An object containing information about the downloaded folder.
     */
    async handleSoftwareExtraction(directoryPath: string, savePath: string, info: any) {
        await extract(savePath, {dir: directoryPath})
        this.mainWindow.webContents.send('status_message', {
            channelType: "status_update",
            name: info.name,
            message: 'Extracting complete, cleaning up.'
        });

        // Delete the downloaded zip folder
        fs.rmSync(savePath, {recursive: true, force: true});
        await this.manifestController.updateAppManifest(info.name, info.alias, info.type, null, null, null);
    }

    /**
     * Handles the case when the server is offline during a download.
     * @param downloadWindow - The window displaying the download progress.
     * @param name - The name of the download being affected by the server offline status.
     *                        This is used in the status message sent to the main window.
     */
    handleServerOffline(downloadWindow: BrowserWindow, name: string) {
        // Destroys the download window
        downloadWindow.destroy();
        // Sends a status message to the main window indicating server offline
        this.mainWindow.webContents.send('status_message', {
            channelType: "status_update",
            name: name,
            message: 'Server offline'
        });
        // Marks the downloading process as complete
        this.downloading = false;
    }

    /**
     * Handles the case when the server is offline during a download.
     * @param downloadWindow - The window displaying the download progress.
     * @param name - The name of the download being affected by the server offline status.
     *                        This is used in the status message sent to the main window.
     */
    handleApplicationBeingUploaded(downloadWindow: BrowserWindow, name: string) {
        void downloadWindow.webContents.executeJavaScript(`
                    try {
                        const dynamicTextElement = document.getElementById('update-message');
                        dynamicTextElement.innerText = 'A new version is currently being uploaded. Please try again later.';
                    } catch (error) {
                        console.error('Error in executeJavaScript:', error);
                    }
                `);

        setTimeout(() => {
            // Destroys the download window
            downloadWindow.destroy();
            // Sends a status message to the main window indicating server offline
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: name,
                message: 'Server offline'
            });
            // Marks the downloading process as complete
            this.downloading = false;
        }, 5000)
    }

    /**
     * Create the new download directory and set up the download window to show the current status.
     * @param downloadWindow
     * @param directoryPath
     * @param info
     */
    setupDownloadDisplay(downloadWindow: BrowserWindow, directoryPath: string, info: any) {
        //Create the main directory to hold the application
        fs.mkdirSync(directoryPath, {recursive: true})

        //Override the incoming directory path
        info.properties.directory = directoryPath;

        //Maintain a trace on the download progress
        info.properties.onProgress = (status): void => {
            this.mainWindow.webContents.send('status_message', {
                channelType: "download_progress",
                applicationName: info.name,
                downloadProgress: status.percent
            });

            if (downloadWindow) {
                void downloadWindow.webContents.executeJavaScript(`
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
    }

    /**
     * Downloads a file from the provided URL and executes a callback function upon completion.
     * @param downloadWindow - The window displaying the download progress.
     * @param url - The URL of the file to download.
     * @param info - Additional information related to the download.
     * @param callback - The callback function to execute after the download completes.
     *                               This function receives the downloaded file, info, mainWindow,
     *                               and a final callback to perform cleanup tasks.
     */
    handleDownload(downloadWindow: BrowserWindow, url: string, info: any, callback: Function) {
        // @ts-ignore
        download(BrowserWindow.fromId(this.mainWindow.id), url, info.properties).then((dl) => {
            downloadWindow.setProgressBar(2);
            void downloadWindow.webContents.executeJavaScript(`
                const dynamicTextElement = document.getElementById('update-message');
                dynamicTextElement.innerText = 'Download completed, installing update';
            `);

            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: info.name,
                message: `Download complete, now extracting. ${dl.getSavePath()}`
            });

            // Callback for post-download processing
            callback(dl, info, () => {
                this.mainWindow.webContents.send('status_message', {
                    channelType: "status_update",
                    name: info.name,
                    message: 'Clean up complete'
                });

                downloadWindow.destroy();
                this.downloading = false;
            });
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

        var url = this.host.includes("vultrobjects") ? `${this.host}steamcmd/steamcmd.zip` : `${this.host}/program-steamcmd`

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
    //endregion


    //region Update Applications
    /**
     * Check for an update for either the Station or NUC software, if there is one download and extract the update, do
     * not download files such as steamcmd or override config.env
     */
    async updateApplication(_event: IpcMainEvent, details: any): Promise<void> {
        //this.host = details.host;
        const appName = details.name;
        this.downloading = true;
        const directoryPath = details.wrapperType === CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED ? join(this.appDirectory, "Embedded\\" , appName) : join(this.appDirectory, appName);

        //Generate the correct URL
        let url: string = generateURL(details, 'version');

        //Create the download window
        let downloadWindow = createDownloadWindow(`Checking for ${appName} update, please wait...`);

        //Check if the main server is online
        const { offline, backupUrl } = await this.checkServerStatus(url, details, appName);
        if (backupUrl.length > 0) {
            url = backupUrl;
        }

        //Online version number
        let onlineVersion: string;
        try {
            onlineVersion = await this.fetchOnlineVersion(url);
        } catch {
            downloadWindow.destroy();
            this.downloading = false;
            console.log("Unable to establish connection to server.");
            return;
        }

        //Write out and then get the local version
        const localVersion = this.getLocalVersion(details, appName, directoryPath);

        //Compare the versions
        const isUpdateAvailable = this.checkAndUpdateVersion(onlineVersion, localVersion, details, appName);
        if (!isUpdateAvailable) {
            downloadWindow.destroy();
            this.downloading = false;
            return;
        }

        //Generate the download URL
        const baseUrl: string = await this.generateBaseUrl(details, appName, offline);

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
     * Checks the server status and returns the offline status and backup URL if applicable.
     * @param url A string of the online url to test the initial connection with.
     * @param details Object containing host information.
     * @param appName Name of the application.
     * @returns An object containing the offline status and backup URL.
     */
    async checkServerStatus(url: string, details: any, appName: string): Promise<{ offline: string, backupUrl: string }> {
        let offline = "";
        let backupUrl = "";

        if (!await checkFileAvailability(url, 5000)) {
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
    async generateBaseUrl(details: any, appName: string, offline: string): Promise<string> {
        let baseUrl: string = "";

        if (offline.length > 0) {
            if (offline === "original") {
                if (appName === "NUC") {
                    baseUrl = details.host + "NUC/NUC.zip";
                } else if (appName === "Station") {
                    const feedUrl = await collectFeedURL();
                    baseUrl = `http://${feedUrl}:8088/` + "Station/Station.zip";
                }
            } else if (offline === "backup") {
                if (appName === "NUC") {
                    baseUrl = details.host + '/program-nuc';
                } else if (appName === "Station") {
                    const feedUrl = await collectFeedURL();
                    baseUrl = `http://${feedUrl}:8088` + '/program-station';
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
            if (appName === "NUC") {
                baseUrl = details.host + "NUC/NUC.zip";
            } else if (appName === "Station") {
                baseUrl = details.host + "Station/Station.zip";
            }
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
            // Usage with complex extraction and additional criteria
            this.handleDownload(downloadWindow, info.url, info, async (dl, info, finalCallback) => {
                extract(dl.getSavePath(), { dir: directoryPath }).then(() => {
                    this.mainWindow.webContents.send('status_message', {
                        channelType: "status_update",
                        name: appName,
                        message: 'Extracting complete, cleaning up.'
                    });

                    fs.rmSync(dl.getSavePath(), { recursive: true, force: true });
                    this.mainWindow.webContents.send('status_message', {
                        channelType: "status_update",
                        name: details.name,
                        message: details.updateOnly ? 'Clean up complete' : 'Update clean up complete'
                    });

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
                finalCallback();
            });
        });
    }
    //endregion
}