import { app, dialog } from "electron";
import fs from "fs-extra";
import { join } from "path";
import Encryption from "./Encryption";
import { execSync } from "child_process";

interface AppEntry {
    type: string
    id: string
    name: string
    autostart: boolean
    altPath: string|null
    parameters: {}
}

/**
 * The purpose of this class is to handle the migration of LeadMe Labs V1 to V2. It is required to:
 *  1. Move the Station or NUC software into the leadme_apps internal folder.
 *  2. Add the moved software into the manifest.json
 *      2a. Set the auto start feature to enabled within the manifest.json
 */
export class SoftwareMigrator {
    software: string;
    directory: string;
    appDirectory: string = process.env.APPDATA + '/leadme_apps';
    attemptLimit: number = 10;
    attempt: number = 0;

    constructor(software: string, directory: string) {
        this.software = software;
        this.directory = directory;
    }

    /**
     * Create the source link from the provided arguments, check if the path exists and perform the directory
     * transfer.
     */
    async RunMigration(): Promise<void> {
        this.attempt++;

        //Move the station folder into the leadme_apps
        const source = `C:\\Users\\${this.directory}\\${this.software}`;
        const destination = `${this.appDirectory}\\${this.software}`;

        //Check to see if it has already been moved
        if (fs.existsSync(destination)) return;

        //Check if the software folder exists
        if (!fs.existsSync(source)) return;

        try {
            // Use `taskkill` on Windows
            const killCommand = 'taskkill /F /FI';

            //Execute the command to find and kill the process by its name - it will not move the directory
            //if the process is still running.
            execSync(`${killCommand} "imagename eq ${this.software}*"`);
            execSync(`${killCommand} "imagename eq Launcher.exe"`);
        } catch (error) {
            // @ts-ignore
            console.log(error.toString());
        }

        //Wait for the program to exit
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log("Moving folders");
        this.Move(source, destination);

        await new Promise(resolve => setTimeout(resolve, 5000));

        //Check that the folder has been moved (source deleted, destination created), if not try again.
        if ((!fs.existsSync(source) && fs.existsSync(destination)) || this.attempt >= this.attemptLimit) {
            //Restart the application - removing the current command arguments
            app.commandLine.removeSwitch("software");
            app.commandLine.removeSwitch("directory");
            app.relaunch();
            app.exit();
        } else {
            await this.RunMigration();
        }
    }

    /**
     * Move a folder from the source path to the destination path.
     * @param source
     * @param destination
     */
    Move(source, destination) {
        //fs.move creates any required parent directories
        fs.move(source, destination, { overwrite: true }, async (err) => {
            if (err) {
                dialog.showErrorBox(
                    "Migration Error",
                    `${this.software} was unable to be moved to the leadme_apps folder on attempt number: ${this.attempt}`);
                return;
            }
            console.log(`Folder ${this.software} moved successfully`);

            await this.UpdateManifest();
        });
    }

    /**
     * Add the new software to the manifest.json. The modified AppEntry sets the autostart feature to true.
     */
    async UpdateManifest(): Promise<void> {
        const filePath = join(this.appDirectory, 'manifest.json');

        //Create the application entry for the json
        const appJSON: AppEntry = {
            type: "LeadMe",
            id: "",
            name: this.software,
            autostart: true,
            altPath: null,
            parameters: {},
        }

        //Check if the file exists
        const exists = fs.existsSync(filePath);

        if (exists) {
            try {
                const objects: Array<AppEntry> = await this.readObjects(filePath);

                appJSON.id = this.generateUniqueId(appJSON.name);

                objects.push(appJSON);

                await this.writeObjects(filePath, objects);

            } catch (err) {
                console.log("Error: " + err);
            }
        } else {
            const objects: Array<AppEntry> = [];
            appJSON.id = this.generateUniqueId(appJSON.name);

            objects.push(appJSON);
            await this.writeObjects(filePath, objects);
        }
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
        });
    }
}

interface VREntry {
    app_key: string
    launch_type: string
    binary_path_windows: string
    is_dashboard_overlay: boolean
    strings: {
        [language: string]: {
            name: string
        }
    }
}

interface ConfigFile {
    source: string;
    applications: VREntry[];
}

/**
 * The purpose of this class is to handle the migration of imported LeadMe applications, creating an
 * entry within the customapps.vrmanifest.
 * This class will only run if the customapps.vrmanifest does not exist.
 */
export class ManifestMigrator {
    appDirectory: string = process.env.APPDATA + '/leadme_apps';
    vrManifestFile: string = this.appDirectory + '/customapps.vrmanifest';
    manifestFile: string = join(this.appDirectory, 'manifest.json');

    async RunMigration(): Promise<void> {
        //Check to see if the customapps.vrmanifest has been created.
        if (fs.existsSync(this.vrManifestFile)) return;

        //Read the manifest
        const objects: Array<AppEntry> = await this.readObjects(this.manifestFile);

        for (const app of objects) {
            if(app.type !== "LeadMe" && app.type !== "Launcher") {
                await this.updateVRManifest(app.name, app.id, app.altPath, true);
            }
        }
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
            console.log("Error: " + err);
        }
    }
}