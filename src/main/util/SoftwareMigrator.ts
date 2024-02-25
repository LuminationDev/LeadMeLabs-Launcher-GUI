import fs from "fs-extra";
import { join } from "path";
import Encryption from "../encryption/Encryption";
import { AppEntry, VREntry } from "../interfaces/appEntry";
import { ConfigFile } from "../interfaces/config";

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
            //Attempt to read in utf16le - if this is not correct it will throw an exception in the decryption method.
            const decryptedData = await Encryption.detectFileEncryption(filename);
            if(decryptedData === null || decryptedData.length === 0) {
                return [];
            }

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