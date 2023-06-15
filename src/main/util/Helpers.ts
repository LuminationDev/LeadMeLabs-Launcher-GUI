import fs from "fs";
import path from "path";
import xml2js from "xml2js";
import Encryption from "./Encryption";
import { join, resolve } from "path";
import { download } from "electron-dl";
import extract from "extract-zip";
import {exec, execSync, spawn, spawnSync} from "child_process";
import semver from "semver/preload";
import * as http from "http";
import * as https from "https"; //Use for production hosting server
import { app, BrowserWindow, net } from "electron";
import IpcMainEvent = Electron.IpcMainEvent;

interface AppEntry {
    type: string
    id: string
    name: string
    autostart: boolean
    altPath: string|null
    parameters: {}
    mode: string|null
}

/**
 * A class that initiates electron IPC controls that handle application downloads, extractions, configurations
 * and launching.
 */
export default class Helpers {
    ipcMain: Electron.IpcMain;
    mainWindow: Electron.BrowserWindow;
    appDirectory: string;
    host: string = "";
    offlineHost: string = "http://localhost:8088";

    constructor(ipcMain: Electron.IpcMain, mainWindow: Electron.BrowserWindow) {
        this.ipcMain = ipcMain;
        this.mainWindow = mainWindow;
        this.appDirectory = process.env.APPDATA + '/leadme_apps';
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
                case "configure_launcher":
                    void this.configLauncher(_event, info);
                    break;
                case "import_application":
                    void this.importApplication(_event, info);
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
                case "launch_parameters":
                    void this.setManifestAppParameters(_event, info);
                    break;
                case "autostart_application":
                    void this.setManifestAutoStart(_event, info);
                    break;
                case "query_installed_applications":
                    void this.installedApplications();
                    break;
                case "scan_manifest":
                    void this.scanForManifestApps(_event, info);
                    break;
                case "query_manifest_app":
                    void this.getLaunchParameters(_event, info);
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
                case "set_config_application":
                    void this.configApplication(_event, info);
                    break;
                case "get_config_application":
                    this.getApplicationConfig(_event, info);
                    break;
                case "schedule_application":
                    this.createTaskSchedulerItem(_event, info);
                    break;

                default:
                    break;
            }
        });
    }

    /**
     * This function allows the Launcher configuration and settings to be saved on the local device. Currently, the only
     * setting is for development mode but can be expanded on in the future with user configurations.
     */
    async configLauncher(_event: IpcMainEvent, info: any): Promise<void> {
        console.log(info);
        await this.updateAppManifest(info.name, "Launcher", null, info.mode);
    }

    /**
     * This function allows a user to import an executable into the launcher library, the executable path is recorded
     * along with the name within the local manifest but the original files are not moved at all. The idea is to simple
     * point to the file wherever that may be on the hard drive.
     */
    async importApplication(_event: IpcMainEvent, info: any): Promise<void> {
        let AppId = await this.updateAppManifest(info.name, "Custom", info.altPath, null);

        //Send back the new application and its assigned ID
        this.mainWindow.webContents.send('backend_message', {
            channelType: "application_imported",
            id: AppId,
            name: info.name,
            altPath: info.altPath,
            action: "import",
            message: `Imported application added: ${info.name}`
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
            this.mainWindow.webContents.send('download_progress', status)
        }

        //Check if the server is online
        if(!await this.checkFileAvailability(url)) {
            this.mainWindow.webContents.send('status_update', {
                name: info.name,
                message: `Hosting server offline: ${this.host}. Checking offline backup: ${this.offlineHost}.`
            });

            //Check if offline line mode is available
            url = this.offlineHost + info.url;
            if(!await this.checkFileAvailability(url)) {
                this.mainWindow.webContents.send('status_update', {
                    name: info.name,
                    message: 'Server offline'
                });

                return;
            } else {
                url = "";
            }
        }

        // @ts-ignore
        download(BrowserWindow.fromId(this.mainWindow.id), url, info.properties).then((dl) => {
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
                    this.updateAppManifest(info.name, "LeadMe", null, null);
                    this.extraDownloadCriteria(info.name, directoryPath);
                } else {
                    this.updateAppManifest(info.name, "Custom", null, null);
                }
            });
        });
    }

    /**
     * Check if an online resource is available.
     * @param url A string of the resource to check for.
     */
    async checkFileAvailability(url): Promise<boolean> {
        const request_call = new Promise((resolve, reject) => {
            const request = net.request(url);

            request.on('response', (response) => {
                if (response.statusCode === 200) {
                    resolve(true);
                } else {
                    console.log(`Failed to fetch ${url}: status code ${response.statusCode}`);
                    reject(false);
                }
            });

            request.on('error', (error) => {
                console.log(`Failed to fetch ${url}: ${error}`);
                reject(false);
            });

            request.end();
        }).catch(error => {
            console.log(error);
        });

        return <boolean>await request_call;
    }

    /**
     * There are extra download criteria associated with the Station and NUC software. This function handles the downloading
     * and folder creation required for installation.
     */
    async extraDownloadCriteria(appName: string, directoryPath: string): Promise<void> {
        const encryptedData = await Encryption.encryptData(`TIME_CREATED=${new Date()}`);

        //If installing the Station or NUC software edit the .env file with the time created
        fs.writeFile(join(directoryPath, '_config/config.env'), encryptedData, function (err) {
            if (err) throw err;
            console.log('Config file is updated successfully.');
        });

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

            const data = fs.readFileSync(config, {encoding: 'utf-8'});
            const decryptedData = await Encryption.decryptData(data);
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
     * Update the local app manifest with the details of the newly installed application. This manifest is used by the
     * Station software to see what Custom experiences are installed.
     * @param appName A string of the experience name being added.
     * @param type A string of the type of experience being added, i.e. Steam, Custom, Vive, etc.
     * @param altPath A string of the absolute path of an executable, used for imported experiences.
     * @param mode A boolean of whether the application is in development mode or not.
     */
    async updateAppManifest(appName: string, type: string, altPath: string|null, mode: string|null): Promise<string> {
        const filePath = join(this.appDirectory, 'manifest.json');

        //Create the application entry for the json
        const appJSON: AppEntry = {
            type: type,
            id: "",
            name: appName,
            autostart: false, //default on installation
            altPath: altPath,
            parameters: {},
            mode: mode
        }

        //Check if the file exists
        const exists = fs.existsSync(filePath);

        if (exists) {
            try {
                let objects: Array<AppEntry> = await this.readObjects(filePath);
                appJSON.id = this.generateUniqueId(appName);

                //Remove an old entry if there is one present.
                objects = objects.filter((obj) => obj.id !== appJSON.id);

                objects.push(appJSON);

                await this.writeObjects(filePath, objects);
            } catch (err) {
                this.mainWindow.webContents.send('status_update', {
                    name: 'Manifest',
                    message: 'Manifest file is updated failed.'
                });
            }

            return appJSON.id;
        }

        console.log("Manifest does not exist");

        const objects: Array<AppEntry> = [];
        appJSON.id = this.generateUniqueId(appName);

        objects.push(appJSON);
        await this.writeObjects(filePath, objects);

        return appJSON.id;
    }

    /**
     * Function to generate a unique ID for each object.
     * @param name
     */
    generateUniqueId = (name: string) => {
        const allowedChars = 'abcdefghijklmnopqrstuvwxyz0123456789 ~`!@#$%^&*()-_=+[{]}\\|;:\'",<.>/?';

        let id = name
            .toLowerCase()
            .split('')
            .map((char) => {
                const index = allowedChars.indexOf(char);
                if (index >= 0) {
                    return (index + 11).toString();
                } else {
                    return '';
                }
            })
            .join('');

        console.log(id);

        return id;
    }

    /**
     * Function to read the objects from a JSON file.
     */
    readObjects = async (filename: string): Promise<Array<AppEntry>> => {
        if (fs.existsSync(filename)) {
            const data = fs.readFileSync(filename, 'utf-8');
            if(data.length === 0) {
                return [];
            }

            const decryptedData = await Encryption.decryptData(data);
            return JSON.parse(decryptedData);
        }
        return [];
    }

    /**
     * Function to write the objects to a JSON file
     */
    writeObjects = async (filename: string, jsonArray: Array<AppEntry>) => {
        const encryptedData = await Encryption.encryptData(JSON.stringify(jsonArray));

        //Create the file and write the new application entry in
        fs.writeFile(filename, encryptedData, (err) => {
            if (err) throw err;

            this.mainWindow.webContents.send('status_update', {
                name: 'Manifest',
                message: 'Manifest file is updated successfully.'
            });
        });
    }

    /**
     * Check whether a file exists given the file path, if it does not, send a message to the front end notifying
     * what file could not be found.
     * @param filePath A string representing the path to a particular file.
     * @param fileName A string of the file name, this will appear on the front end message.
     */
    checkFileExists(filePath: string, fileName: string): boolean {
        //Check if the file exists
        const exists = fs.existsSync(filePath);

        if (!exists) {
            this.mainWindow.webContents.send('status_update', {
                name: fileName,
                message: `${fileName} file does not exist.`
            });
        }

        return exists;
    }

    /**
     * Collect a specific application entry from the manifest. This returns the full array of applications as well as
     * the application that was searched for.
     * @param filePath A string of the path to the manifest.
     * @param name A string of the application name to be searched for.
     */
    async collectManifestEntry(filePath: string, name: string): Promise<readonly [Array<AppEntry> | undefined, AppEntry | undefined]> {
        const jsonArray: Array<AppEntry> = await this.readObjects(filePath);

        //Find the application
        const entry: AppEntry | undefined = jsonArray.find(entry => entry.name === name);

        if(entry === undefined) {
            this.mainWindow.webContents.send('status_update', {
                name: name,
                message: `${name} does not exist in the manifest.`
            });
            return [undefined, undefined];
        }

        return [jsonArray, entry] as const;
    }

    /**
     * Update an applications entry in the manifest file with the supplied launch parameters, these can be login
     * credentials or start up parameters etc.
     */
    async setManifestAppParameters(_event: IpcMainEvent, info: any): Promise<void> {
        const filePath = join(this.appDirectory, 'manifest.json');
        if(!this.checkFileExists(filePath, 'Manifest')) { return }

        try {
            const [jsonArray, entry] = await this.collectManifestEntry(filePath, info.name);
            if(jsonArray === undefined || entry === undefined) return;

            //Update the entry or remove them
            if(info.action === "clear") {
                entry.parameters = {};

                this.mainWindow.webContents.send('backend_message', {
                    channelType: "app_manifest_query",
                    name: info.applicationName,
                    params: entry.parameters
                });
            } else {
                const data = JSON.parse(info.value);

                //Overwrite the saved information
                entry.parameters = {};

                for(const key in data) {
                    entry.parameters[key] = data[key];
                }
            }

            await this.writeObjects(filePath, jsonArray);
        } catch (err) {
            this.mainWindow.webContents.send('status_update', {
                name: 'Manifest',
                message: 'Manifest file is updated failed.'
            });
        }
    }

    /**
     * Update an applications entry in the manifest file to indirect that it should autostart when the launcher is
     * opened.
     */
    async setManifestAutoStart(_event: IpcMainEvent, info: any): Promise<void> {
        const filePath = join(this.appDirectory, 'manifest.json');
        if(!this.checkFileExists(filePath, 'Manifest')) { return }

        try {
            const [jsonArray, entry] = await this.collectManifestEntry(filePath, info.name);
            if(jsonArray === undefined || entry === undefined) return;

            //Update the entry
            entry.autostart = info.autostart;

            await this.writeObjects(filePath, jsonArray);
        } catch (err) {
            this.mainWindow.webContents.send('status_update', {
                name: 'Manifest',
                message: 'Manifest file is updated failed.'
            });
        }
    }

    /**
     * Get the launch parameters values that may be assigned to an application from the manifest file.
     * @param appName A string of the experience name being searched for.
     */
    async getLaunchParameterValues(appName: string): Promise<string[]> {
        let params: string[] = [];

        const app = await this.getManifestDetails(appName);
        if(app === undefined) return params;
        if(app.parameters === undefined || app.parameters === null) return params;

        for (const [_, value] of Object.entries<string>(app.parameters)) {
            params.push(value);
        }

        return params;
    }

    /**
     * Scan the local leadme_apps directory for either the NUC or Station folder. If present, either write or re-write
     * the manifest as per the local encryption key.
     * @param _event
     * @param info
     */
    async scanForManifestApps(_event: IpcMainEvent, info: any): Promise<void> {
        //Check if the leadme_apps folder exists, if not create it
        const manifestExists = fs.existsSync(this.appDirectory);

        console.log(manifestExists);

        //Create the main directory to hold the application
        if(!manifestExists) {
            fs.mkdirSync(this.appDirectory, {recursive: true})

            //No folders found, send back the file path and alert the user
            this.mainWindow.webContents.send('backend_message', {
                channelType: "manifest_scanned",
                title: "Operation failure",
                message: `leadme_apps not found but created, no sub-folders exist. Please move the Station or NUC 
                folder into the following location ${process.env.APPDATA}\\leadme_apps\\[SOFTWARE NAME]`
            });
            return;
        }

        //Check if the nuc or station exist with an exe in them
        const nucExists = fs.existsSync(join(this.appDirectory, 'NUC', 'NUC.exe'));
        const stationExists = fs.existsSync(join(this.appDirectory, 'Station', 'Station.exe'));

        const objects: Array<AppEntry> = [];

        const appEntries = [
            { exists: nucExists, name: "NUC" },
            { exists: stationExists, name: "Station" }
        ];

        appEntries.forEach(entry => {
            entry.exists ? this.createAppEntry(entry.name, objects, info.mode) : null;
        });

        if (objects.length === 0) {
            //No folders found, send back the file path and alert the user
            this.mainWindow.webContents.send('backend_message', {
                channelType: "manifest_scanned",
                title: "Operation failure",
                message: `No sub folders found in leadme_apps. Please move the Station or NUC folder into the 
                following location ${process.env.APPDATA}\\leadme_apps\\[SOFTWARE NAME]`,
            });
            return;
        }

        //Check if there is a manifest, re-write what is there
        const filePath = join(this.appDirectory, 'manifest.json');

        //Write the objects array for the manifest
        await this.writeObjects(filePath, objects);

        this.mainWindow.webContents.send('backend_message',
            {
                channelType: "applications_installed",
                directory: this.appDirectory,
                content: objects
            }
        );

        //Send back confirmation to the user
        this.mainWindow.webContents.send('backend_message', {
            channelType: "manifest_scanned",
            title: "Operation successful",
            message: `Scanned for files. NUC added: ${nucExists}, Station added: ${stationExists}.`,
        });
    }

    /**
     * Create an App entry object with an assigned unique ID.
     * @param name
     * @param objects
     * @param mode
     */
    createAppEntry(name: string, objects: AppEntry[], mode: string|null) {
        //Create the application entry for the json
        const appJSON: AppEntry = {
            type: "LeadMe",
            id: "",
            name: name,
            autostart: false, //default on installation
            altPath: "",
            parameters: {},
            mode: mode
        }

        appJSON.id = this.generateUniqueId(name);

        objects.push(appJSON);
    }

    /**
     * Get the launch parameters that may be assigned to an application from the manifest file. Sending the information
     * back to the front end for a live update.
     */
    async getLaunchParameters(_event: IpcMainEvent, info: any): Promise<void> {
        let params = {};

        const app = await this.getManifestDetails(info.applicationName);
        if(app === undefined) return;
        if(app.parameters === undefined || app.parameters === null) return;

        for (const [key, value] of Object.entries<string>(app.parameters)) {
            params[key] = value;
        }

        this.mainWindow.webContents.send('backend_message', {
            channelType: "app_manifest_query",
            name: info.applicationName,
            params
        });
    }

    /**
     * Get the manifest details for a specific application.
     * @param appName A string of the experience name being searched for.
     */
    async getManifestDetails(appName: string): Promise<AppEntry | undefined> {
        const filePath = join(this.appDirectory, 'manifest.json');
        const objects: Array<AppEntry> = await this.readObjects(filePath);

        return objects.find(obj => obj.name == appName);
    }

    /**
     * On start up detect what Applications are currently installed on the local machine.
     */
    async installedApplications(): Promise<void> {
        const filePath = join(this.appDirectory, 'manifest.json');

        //Check if the file exists
        const exists = fs.existsSync(filePath);

        //Search the local manifest for installed experiences
        if(exists) {
            try {
                const installed: Array<AppEntry> = await this.readObjects(filePath);

                this.mainWindow.webContents.send('backend_message',
                {
                        channelType: "applications_installed",
                        directory: this.appDirectory,
                        content: installed
                    }
                );
                return;
            } catch (err) {
                this.mainWindow.webContents.send('status_update', {
                    name: 'Manifest',
                    message: 'Manifest file read failed.'
                });
            }
        } else {
            this.mainWindow.webContents.send('status_update', {
                name: 'Manifest',
                message: 'Manifest file does not exist.'
            });
        }

        this.mainWindow.webContents.send('backend_message', {
            channelType: "applications_installed",
            content: []
        });
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

        await this.removeFromAppManifest(info.name);

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
     * Remove an entry from the manifest, this may occur when an application has been deleted or moved.
     * @param appName A string of the experience name being removed from the manifest.
     */
    async removeFromAppManifest(appName: string): Promise<void> {
        const filePath = join(this.appDirectory, 'manifest.json');

        //Check if the file exists
        const exists = fs.existsSync(filePath);

        if (!exists) {
            this.mainWindow.webContents.send('status_update', {
                name: 'Manifest',
                message: 'Manifest file does not exist.'
            });
        }

        try {
            let jsonArray: Array<AppEntry> = await this.readObjects(filePath);

            //Remove the entry from the list
            jsonArray = jsonArray.filter(entry => entry.name !== appName)

            await this.writeObjects(filePath, jsonArray);
        } catch (err) {
            this.mainWindow.webContents.send('status_update', {
                name: 'Manifest',
                message: 'Manifest file is updated failed.'
            });
        }
    }

    /**
     * Launch a requested application.
     */
    async launchApplication(_event: IpcMainEvent, info: any): Promise<void> {
        this.host = info.host;
        console.log(info);

        await this.killAProcess(info.name, info.path, true);

        if(info.name == "Station" || info.name == "NUC") {
            await this.updateLeadMeApplication(info.name);
        }

        //Load from the local leadme_apps folder or the supplied absolute path
        let exePath = info.path == '' ? join(this.appDirectory, `${info.name}/${info.name}.exe`) : info.path;

        //Read any launch parameters that the manifest may have
        const params = await this.getLaunchParameterValues(info.name);

        //Add the launch params and the required basic commands together
        const basic = ['/c', 'start', exePath];
        const args = basic.concat(params);

        spawn('cmd.exe', args, {
            detached: true
        });
    }

    /**
     * Check for an update for either the Station or NUC software, if there is one download and extract the update, do
     * not download files such as steamcmd or override config.env
     */
    async updateLeadMeApplication(appName: string): Promise<void> {
        const directoryPath = join(this.appDirectory, appName);

        const stationUrl = '/program-nuc-version';
        const nucUrl = '/program-station-version';

        let url;

        if(appName === "NUC") {
            url = this.host + nucUrl;
        } else if(appName === "Station") {
            url = this.host + stationUrl;
        } else {
            return;
        }

        //Check if the server is online
        if(!await this.checkFileAvailability(url)) {
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
                return;
            }

            if(!await this.checkFileAvailability(url)) {
                this.mainWindow.webContents.send('status_update', {
                    name: appName,
                    message: 'Server offline'
                });

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
        let onlineVersion: string = <string>await request_call;

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
            return;
        }
        const localVersion = fs.readFileSync(versionPath, 'utf8')

        //Compare the versions
        console.log("Online version: " + onlineVersion);
        console.log("Local version: " + localVersion);
        const newVersionAvailable = semver.gte(onlineVersion, localVersion)

        console.log("Difference: " + newVersionAvailable);

        if(newVersionAvailable == null || !newVersionAvailable) {
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

        //Maintain a trace on the download progress
        // @ts-ignore
        info.properties.onProgress = (status): void => {
            console.log(status)
            this.mainWindow.webContents.send('download_progress', status)
        }

        const download_call = new Promise((resolve, reject) => {
            // @ts-ignore
            download(BrowserWindow.fromId(this.mainWindow.id), info.url, info.properties).then((dl) => {
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

                    //Delete the downloaded zip folder
                    fs.rmSync(dl.getSavePath(), {recursive: true, force: true})
                    this.mainWindow.webContents.send('status_update', {
                        name: appName,
                        message: 'Update clean up complete'
                    })

                    resolve("Download Complete");
                }).catch(err => {
                    reject(err);
                })
            })
        });

        await download_call;
    }

    /**
     * Update an env file that is associated with the Station or NUC applications. If there is a previous entry for a value
     * with the same key override that key/value pair.
     */
    async configApplication(_event: IpcMainEvent, info: any): Promise<void> {
        const config = join(this.appDirectory, `${info.name}/_config/config.env`)
        const data = JSON.parse(info.value);

        const newDataArray: string[] = [];

        for(const key in data) {
            newDataArray.push(`${key}=${data[key]}`)
        }

        const encryptedData = await Encryption.encryptData(newDataArray.join('\n'));

        fs.writeFile(config, encryptedData, (err) => {
            if (err) throw err;
            console.log ('Successfully updated the file data');
        });
    }

    /**
     * Gets the application configuration details.
     */
    getApplicationConfig(_event: IpcMainEvent, info: any): void {
        const config = join(this.appDirectory, `${info.name}/_config/config.env`);

        //Read the file and remove any previous entries for the same item
        fs.readFile(config, {encoding: 'utf-8'}, async (err, data) => {
            const decryptedData = await Encryption.decryptData(data);

            let dataArray = decryptedData.split('\n'); // convert file data in an array

            //Send the data array back to the front end.
            this.mainWindow.webContents.send('backend_message', {
                channelType: "application_config",
                name: info.name,
                data: dataArray
            });
        });
    }

    /**
     * Interacting with the windows task scheduler, create, pause or destroy a task that actively monitors that the
     * supplied application is running. The task runs on start up once a user is logged in and when there is an
     * internet connection and then every 5 minutes onwards.
     */
    createTaskSchedulerItem(_event: IpcMainEvent, info: any): void {
        const taskFolder: string = "LeadMe\\Software_Checker";
        let args: string = "";

        //Check the type - list is the only function that does not require Admin privilege
        switch (info.type) {
            case "list":
                args = `SCHTASKS /QUERY /TN ${taskFolder} /fo LIST`;
                exec(`${args}`, (error, stdout) => {
                    //Send the output back to the user
                    this.mainWindow.webContents.send('scheduler_update', {
                        message: stdout,
                        type: info.type
                    });
                });
                return;

            case "create":
                const outputPath = join(this.appDirectory, 'Software_Checker.xml');

                //Edit the static XML with the necessary details
                this.modifyDefaultXML(taskFolder, info.name, outputPath)

                //Use the supplied XML to create the command
                args = `SCHTASKS /CREATE /TN ${taskFolder} /XML ${outputPath}`;
                break;

            case "enable":
                args = `SCHTASKS /CHANGE /TN ${taskFolder} /Enable`;
                break;

            case "disable":
                args = `SCHTASKS /CHANGE /TN ${taskFolder} /Disable`;
                break;

            case "delete":
                args = `SCHTASKS /DELETE /TN ${taskFolder}`;
                break;

            default:
                return;
        }

        exec(`Start-Process cmd -Verb RunAs -ArgumentList '@cmd /k ${args}'`, {'shell':'powershell.exe'}, (error, stdout)=> {
            this.mainWindow.webContents.send('scheduler_update', {
                message: stdout,
                type: info.type
            });
        });
    }

    /**
     * Modify the default software checker xml with the details necessary for either the NUC or Station software. As an
     * XML we can set far more than a command line interface and add different triggers and conditions.
     */
    modifyDefaultXML(taskFolder: string, appName: string, outputPath: string): void {
        const exePath = join(__dirname, '../../../../..', '_batch/LeadMeLabs-SoftwareChecker.exe');

        const filePath = join(app.getAppPath(), 'static', 'template.xml');
        const data = fs.readFileSync(filePath, "utf16le")

        // we then pass the data to our method here
        xml2js.parseString(data, function(err, result) {
            if (err) console.log("FILE ERROR: " + err);

            let json = result;

            //Edit the following variables for the newly created task
            //Date - get the current date, remove the milliseconds and the zulu marker 'Z'
            json.Task.RegistrationInfo[0].Date = new Date().toISOString().slice(0,-5);

            //URI
            json.Task.RegistrationInfo[0].URI = taskFolder;

            //Main Action
            json.Task.Actions[0].Exec[0].Command = exePath;

            //Write the changes to the new temporary file
            //Create a new builder object and then convert the json back to xml.
            const builder = new xml2js.Builder({'xmldec': {'encoding': 'UTF-16'}});
            const xml = builder.buildObject(json);

            fs.writeFile(outputPath, xml, (err) => {
                if (err) console.log(err);

                console.log("Successfully written update xml to file");
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
                    await spawnSync('powershell.exe', ['-command', powershellCmd]);
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
