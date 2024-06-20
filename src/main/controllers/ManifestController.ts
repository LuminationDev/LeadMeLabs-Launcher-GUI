import fs from "fs";
import IpcMainEvent = Electron.IpcMainEvent;
import { join } from "path";
import { AppEntry, VREntry } from "../interfaces/appEntry";
import { findExecutable, generateUniqueId, readObjects, writeObjects } from "../util/Utilities";
import { ConfigFile } from "../interfaces/config";
import * as CONSTANT from "../../renderer/src/assets/constants";

export default class ManifestController {
    ipcMain: Electron.IpcMain;
    mainWindow: Electron.BrowserWindow;
    appDirectory: string;
    toolDirectory: string;

    constructor(ipcMain: Electron.IpcMain, mainWindow: Electron.BrowserWindow) {
        this.ipcMain = ipcMain;
        this.mainWindow = mainWindow;
        this.appDirectory = process.env.APPDATA + '\\leadme_apps';
        this.toolDirectory = process.env.APPDATA + '\\leadme_apps\\Tools';
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
                const installed: Array<AppEntry> = await readObjects(filePath);
                this.mainWindow.webContents.send('backend_message',
                    {
                        channelType: "applications_installed",
                        appDirectory: this.appDirectory,
                        toolDirectory: this.toolDirectory,
                        content: installed
                    }
                );
                return;
            } catch (err) {
                this.mainWindow.webContents.send('status_message', {
                    channelType: "status_update",
                    name: 'Manifest',
                    message: 'Manifest file read failed.'
                });

                this.mainWindow.webContents.send('status_message', {
                    channelType: "status_update",
                    name: 'Manifest',
                    message: 'Manifest file read failed.'
                });
            }
        } else {
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
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
     * Update the local app manifest with the details of the newly installed application. This manifest is used by the
     * Station software to see what Custom experiences are installed.
     * @param appName A string of the experience name being added.
     * @param appAlias A string of the executable name if different from the name.
     * @param type A string of the type of experience being added, i.e. Steam, Custom, Vive, etc.
     * @param altPath A string of the absolute path of an executable, used for imported experiences.
     * @param mode A string of what environment mode the application is in.
     * @param setup A boolean which shows if an electron tool has been installed correctly.
     */
    async updateAppManifest(appName: string, appAlias: string, type: string, altPath: string|null, mode: string|null, setup: boolean|null): Promise<string> {
        const filePath = join(this.appDirectory, 'manifest.json');

        //Create the application entry for the json
        const appJSON: AppEntry = {
            type: type,
            id: "",
            name: appName,
            alias: appAlias,
            autostart: false, //default on installation
            altPath: altPath,
            parameters: {},
            mode: mode,
            setup: setup
        }

        //Check if the file exists
        const exists = fs.existsSync(filePath);

        if (exists) {
            try {
                let objects: Array<AppEntry> = await readObjects(filePath);
                appJSON.id = generateUniqueId(appName);

                //Remove an old entry if there is one present.
                objects = objects.filter((obj) => obj.id !== appJSON.id);

                objects.push(appJSON);

                let result: string = await writeObjects(filePath, objects);
                this.mainWindow.webContents.send('status_message', {
                    channelType: "status_update",
                    name: 'Manifest',
                    message: result
                });
            } catch (err) {
                this.mainWindow.webContents.send('status_message', {
                    channelType: "status_update",
                    name: 'Manifest',
                    message: 'Manifest file updated failed.'
                });
            }

            return appJSON.id;
        }

        console.log("Manifest does not exist");

        const objects: Array<AppEntry> = [];
        appJSON.id = generateUniqueId(appName);

        objects.push(appJSON);
        let result: string = await writeObjects(filePath, objects);
        this.mainWindow.webContents.send('status_message', {
            channelType: "status_update",
            name: 'Manifest',
            message: result
        });

        return appJSON.id;
    }

    /**
     * Update the values of a manifest entry that matches the supplied entry name.
     * @param info
     */
    async modifyAppManifest(info: any) {
        const filePath = join(this.appDirectory, 'manifest.json');

        //Check if the file exists
        const exists = fs.existsSync(filePath);
        if (!exists) {
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: 'Manifest',
                message: `Manifest file does not exist.`
            });
            return;
        }

        let [jsonArray, entry] = await this.collectManifestEntry(filePath, info.name);
        if ((jsonArray === undefined || entry === undefined)) return;

        entry[info.parameterKey] = info.parameterValue;
        let result: string = await writeObjects(filePath, jsonArray);

        this.mainWindow.webContents.send('status_message', {
            channelType: "status_update",
            name: 'Manifest',
            message: result
        });
    }

    /**
     * This function allows a user to import an executable into the launcher library, the executable path is recorded
     * along with the name within the local manifest but the original files are not moved at all. The idea is to simple
     * point to the file wherever that may be on the hard drive.
     */
    async importApplication(_event: IpcMainEvent, info: any): Promise<void> {
        let AppId = await this.updateAppManifest(info.name, info.name, "Custom", info.altPath, null, null);

        // Update the manifests if the application is VR (set by user)
        if (info.isVr) {
            await this.updateVRManifest(info.name, AppId, info.altPath, true);
            info.value = JSON.stringify({[CONSTANT.MODEL_KEY.KEY_VR_MANIFEST]: true});
            await this.setManifestAppParameters(_event, info);
        }

        //Send back the new application and its assigned ID
        this.mainWindow.webContents.send('backend_message', {
            channelType: "application_imported",
            id: AppId,
            name: info.name,
            altPath: info.altPath,
            action: "import",
            message: `Imported application added: ${info.name}`
        });

        //Send back the new update list of applications
        await this.installedApplications();
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

        //Check for any qa tools
        const qaToolExists = fs.existsSync(join(this.toolDirectory, 'QA Tool', 'leadme-tools-qa', 'leadme-tools-qa.exe'));
        const networkToolExists = fs.existsSync(join(this.appDirectory, 'Network Tool', 'leadme-network', 'leadme-network.exe'));

        //TODO find out what the executables are called
        // const experienceToolExists = fs.existsSync(join(this.appDirectory, 'Experience Tool', ''));

        const objects: Array<AppEntry> = [];

        //TODO add in the rest of the Embedded applications & Tools eventually
        const appEntries = [
            { exists: nucExists, type: "LeadMe", name: "NUC", alias: 'NUC', setup: null },
            { exists: stationExists, type: "LeadMe", name: "Station", alias: 'Station', setup: null },
            { exists: qaToolExists, type: "Tool", name: "QA Tool", alias: 'leadme-tools-qa', setup: true},
            { exists: networkToolExists, type: "Tool", name: "Network Tool", alias: 'leadme-network', setup: true},
            // { exists: experienceToolExists, type: "Tool", name: "Experience Tool", alias: '', setup: true},
        ];

        appEntries.forEach(entry => {
            entry.exists ? this.createAppEntry(entry.type, entry.name, entry.alias, objects, info.mode, entry.setup) : null;
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
        let result: string = await writeObjects(filePath, objects);
        this.mainWindow.webContents.send('status_message', {
            channelType: "status_update",
            name: 'Manifest',
            message: result
        });

        this.mainWindow.webContents.send('backend_message',
            {
                channelType: "applications_installed",
                directory: this.appDirectory,
                content: objects
            }
        );

        let message: string = "";
        appEntries.forEach(entry => {
            message += `${entry.name} added: ${entry.exists}`;
        });

        //Send back confirmation to the user
        this.mainWindow.webContents.send('backend_message', {
            channelType: "manifest_scanned",
            title: "Operation successful",
            message: `Scanned for files. ${message}`,
        });
    }

    /**
     * Create an App entry object with an assigned unique ID.
     * @param type
     * @param name
     * @param alias
     * @param objects
     * @param mode
     * @param setup
     */
    createAppEntry(type: string, name: string, alias: string, objects: AppEntry[], mode: string|null, setup: boolean|null) {
        //Create the application entry for the json
        const appJSON: AppEntry = {
            type: type,
            id: "",
            name: name,
            alias: alias,
            autostart: false, //default on installation
            altPath: "",
            parameters: {},
            mode: mode,
            setup: setup
        }

        appJSON.id = generateUniqueId(name);

        objects.push(appJSON);
    }

    /**
     * Update an applications entry in the manifest file with the supplied launch parameters, these can be login
     * credentials or start up parameters etc.
     */
    async setManifestAppParameters(_event: IpcMainEvent, info: any): Promise<void> {
        const filePath = join(this.appDirectory, 'manifest.json');

        //Check if the file exists
        const exists = fs.existsSync(filePath);
        if (!exists) {
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: 'Manifest',
                message: `Manifest file does not exist.`
            });
            return;
        }

        try {
            const [jsonArray, entry] = await this.checkLauncherManifestEntry(info, filePath);
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

                //Copy the saved information or create a new object.
                if (entry.parameters === null) {
                    entry.parameters = {};
                }

                for(const key in data) {
                    entry.parameters[key] = data[key];
                }
            }

            let result: string = await writeObjects(filePath, jsonArray);
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: 'Manifest',
                message: result
            });
        } catch (err) {
            console.log(err);
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: 'Manifest',
                message: 'Manifest file is updated failed.'
            });
        }
    }

    /**
     * Update an applications entry in the manifest file to indirect that it should autostart when the launcher is
     * opened.
     */
    async setManifestParameter(info: any): Promise<void> {
        const filePath = join(this.appDirectory, 'manifest.json');

        //Check if the file exists
        const exists = fs.existsSync(filePath);
        if (!exists) {
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: 'Manifest',
                message: `Manifest file does not exist.`
            });
            return;
        }

        try {
            const [jsonArray, entry] = await this.checkLauncherManifestEntry(info, filePath);
            if(jsonArray === undefined || entry === undefined) return;

            //Update the entry
            entry[info.parameterKey] = info.parameterValue;

            let result: string = await writeObjects(filePath, jsonArray);
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: 'Manifest',
                message: result
            });
        } catch (err) {
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: 'Manifest',
                message: 'Manifest file is updated failed.'
            });
        }
    }

    /**
     * Check the local manifest.json for the a specific application entry or the leadme_launcher entry, this contains
     * the current download mode as well as any custom settings for the launcher (i.e. pin)
     * @param info An object holding the entry name to search for.
     * @param filePath A string of the path to the manifest.
     */
    async checkLauncherManifestEntry(info: any, filePath: string): Promise<readonly [Array<AppEntry> | undefined, AppEntry | undefined]> {
        let [jsonArray, entry] = await this.collectManifestEntry(filePath, info.name);
        if ((jsonArray === undefined || entry === undefined) && info.name !== "leadme_launcher") {
            return [jsonArray, entry] as const;
        } else if (entry === undefined && info.name === "leadme_launcher") {
            await this.createConfigLauncher(info);
            await new Promise(resolve => setTimeout(resolve, 1000)); //Wait for the file to finish writing
        }

        [jsonArray, entry] = await this.collectManifestEntry(filePath, info.name);
        return [jsonArray, entry] as const;
    }

    /**
     * Collect a specific application entry from the manifest. This returns the full array of applications as well as
     * the application that was searched for.
     * @param filePath A string of the path to the manifest.
     * @param name A string of the application name to be searched for.
     */
    async collectManifestEntry(filePath: string, name: string): Promise<readonly [Array<AppEntry> | undefined, AppEntry | undefined]> {
        const jsonArray: Array<AppEntry> = await readObjects(filePath);

        //Find the application
        const entry: AppEntry | undefined = jsonArray.find(entry => entry.name === name);

        if(entry === undefined) {
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: name,
                message: `${name} does not exist in the manifest.`
            });
            return [undefined, undefined];
        }

        return [jsonArray, entry] as const;
    }

    /**
     * This function creates the Launcher configuration on the local device.
     */
    async createConfigLauncher(info: any): Promise<void> {
        await this.updateAppManifest(info.name, info.name, "Launcher", null, "production", null); //Default mode is production
    }

    /**
     * Update or create the customapps.vrmanifest. This file is used by OpenVR to track VR applications, the application
     * supplied must be a VR application.
     * @param appName A string of the application name.
     * @param appId A string of the application ID.
     * @param altPath A string of the alternate path to the .exe, if empty the path to the leadme_apps is used
     * @param add A boolean for if the application should be added to the manifest
     */
    async updateVRManifest(appName: string, appId: string, altPath: string|null, add: boolean): Promise<void> {
        const filePath = join(this.appDirectory, 'customapps.vrmanifest');

        //Create the application entry for the json
        const newEntry: VREntry = {
            app_key: `custom.app.${appId}`,
            launch_type: "binary",
            binary_path_windows: altPath ?? join(this.appDirectory, appName, `${appName}.exe`),
            is_dashboard_overlay: true,
            strings: {
                en_us: {
                    name: appName
                }
            }
        }

        try {
            let config: ConfigFile = { source: 'custom', applications: [] };

            if (fs.existsSync(filePath)) {
                const configFileContent = fs.readFileSync(filePath, 'utf-8');
                config = JSON.parse(configFileContent);
            }

            // Remove existing entry with the same app_key, if any
            config.applications = config.applications.filter(
                (entry) => entry.app_key !== newEntry.app_key
            );

            if(add) {
                config.applications.push(newEntry);
            }

            fs.writeFileSync(filePath, JSON.stringify(config, null, 4));
        } catch (err) {
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: 'Manifest',
                message: 'customapps.vrmanifest file updated failed.'
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
        const objects: Array<AppEntry> = await readObjects(filePath);

        return objects.find(obj => obj.name == appName);
    }

    /**
     * Remove an entry from the customapps.vrmanifest, rewriting the file afterwards.
     * @param appName A string of the application's name that is to be removed.
     */
    async removeVREntry(appName: string) {
        const filePath = join(this.appDirectory, 'customapps.vrmanifest');

        if (fs.existsSync(filePath)) {
            const configFileContent = fs.readFileSync(filePath, 'utf-8');
            const config: ConfigFile = JSON.parse(configFileContent);

            config.applications = config.applications.filter(
                (entry) => entry.strings.en_us.name !== appName
            );

            fs.writeFileSync(filePath, JSON.stringify(config, null, 4));
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
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: 'Manifest',
                message: 'Manifest file does not exist.'
            });
        }

        try {
            let jsonArray: Array<AppEntry> = await readObjects(filePath);

            //Remove the entry from the list
            jsonArray = jsonArray.filter(entry => entry.name !== appName)

            let result: string = await writeObjects(filePath, jsonArray);
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: 'Manifest',
                message: result
            });
        } catch (err) {
            this.mainWindow.webContents.send('status_message', {
                channelType: "status_update",
                name: 'Manifest',
                message: 'Manifest file is updated failed.'
            });
        }
    }

    /**
     * Check if an electron application has been setup in the correct location by looking for the executable that is
     * created after the electron setup wizard.
     * @param info
     */
    async isElectronSetup(info: any) {
        //Check that the .exe exists after the setup
        let directoryPath: string = this.toolDirectory;

        // Search the tool directory to see if there is an executable with Setup in the name
        const toolDirectory: string = join(directoryPath, `${info.name}`, `${info.alias}`);
        const executableExists: boolean = await findExecutable(toolDirectory, info.alias);

        if (executableExists) {
            info.parameterKey = "setup";
            info.parameterValue = true;

            //Update the app manifest
            await this.modifyAppManifest(info);

            //Update the front end that the program is setup
            this.mainWindow.webContents.send('backend_message',
                {
                    channelType: "update_application_entry",
                    applicationName: info.name,
                    parameterKey: info.parameterKey,
                    parameterValue: info.parameterValue
                }
            );
            return;
        }

        //Notify the user?
        this.mainWindow.webContents.send('backend_message',
            {
                channelType: "error_message",
                message: "Executable not found, setup not complete.",
            }
        );
    }
}
