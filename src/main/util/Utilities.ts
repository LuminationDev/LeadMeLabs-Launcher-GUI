import fs from "fs";
import { join } from "path";
import { net as electronNet } from "electron";
import Encryption from "../encryption/Encryption";
import * as Sentry from "@sentry/electron";
import os from "os";
import {AppEntry} from "../interfaces/appEntry";

/**
 * Check if an online resource is available.
 * @param url A string of the resource to check for.
 */
export async function checkFileAvailability(url: string): Promise<boolean> {
    const request_call = new Promise((resolve, reject) => {
        const request = electronNet.request(url);
        const timeoutId = setTimeout(() => {
            request.abort(); // Abort the request if it takes too long
            console.log(`Request timed out ${url}`);
            resolve(false);
        }, 5000);

        request.on('response', (response) => {
            clearTimeout(timeoutId);
            if (response.statusCode === 200) {
                resolve(true);
            } else {
                console.log(`Failed to fetch ${url}: status code ${response.statusCode}`);
                reject(false);
            }
        });

        request.on('error', (error) => {
            clearTimeout(timeoutId);
            console.log(`Failed to fetch ${url}: ${error}`);
            reject(false);
        });

        request.end();
    }).catch(error => {
        console.log(error);
    });

    try {
        return <boolean>await request_call;
    } catch (e: any) {
        Sentry.captureMessage(`Unable to contact server at ${await collectLocation()}.` + e.toString());
        return false;
    }
}

/**
 * Check if just the Station is locally installed, if so get the NUC address that is set within
 * the config file, otherwise return localhost.
 */
export async function collectFeedURL(): Promise<string | null> {
    const stationConfig = join(process.env.APPDATA + '/leadme_apps', `Station/_config/config.env`);
    const NUCConfig = join(process.env.APPDATA + '/leadme_apps', `NUC/_config/config.env`);

    // We are updating the NUC software, bail out here
    if(!fs.existsSync(stationConfig) || fs.existsSync(NUCConfig)) {
        return "localhost";
    }

    try {
        const decryptedData = await Encryption.detectFileEncryption(stationConfig);
        if (decryptedData == null) {
            return null;
        }

        let dataArray = decryptedData.split('\n'); // convert file data into an array
        const nucAddress = dataArray.find(item => item.startsWith('NucAddress='));
        if (nucAddress) {
            return nucAddress.split('=')[1];
        }
    } catch (err) {
        console.error(err);
    }

    return null;
}

/**
 * Collects and returns the location information from relevant configuration files.
 * @returns The location string if found, otherwise "Unknown".
 */
export async function collectLocation(): Promise<string | null> {
    let path = '';

    const stationConfig = join(process.env.APPDATA + '/leadme_apps', 'Station/_config/config.env');
    const stationExists = fs.existsSync(stationConfig);
    const stationConfigBackup = join(process.env.APPDATA + '/leadme_apps', 'Station/_config/config_backup.env');
    const stationBackupExists = fs.existsSync(stationConfigBackup);

    const NUCConfig = join(process.env.APPDATA + '/leadme_apps', 'NUC/_config/config.env');
    const NUCConfigBackup = join(process.env.APPDATA + '/leadme_apps', 'NUC/_config/config_backup.env');

    // Check if any of the files exist
    if (!stationExists && !fs.existsSync(NUCConfig) && !stationBackupExists && !fs.existsSync(NUCConfigBackup)) {
        return "Unknown";
    }

    // Determine the path based on the available files
    path = (stationExists || stationBackupExists) ? stationConfig : NUCConfig;

    try {
        const decryptedData = await Encryption.detectFileEncryption(path);

        if (decryptedData === null || decryptedData.length === 0) {
            return "Unknown";
        }

        const dataArray = decryptedData.split('\n'); // Convert file data into an array
        const location = dataArray.find(item => item.startsWith('LabLocation='));

        if (location) {
            return location.split('=')[1];
        }
    } catch (err) {
        console.error(err);
    }

    return "Unknown";
}

/**
 * Update an applications entry in the manifest file to indirect that it should autostart when the launcher is
 * opened.
 */
export async function getLauncherManifestParameter(parameter: string): Promise<string> {
    const filePath = join(process.env.APPDATA + '/leadme_apps', 'manifest.json');
    let mode = "Unknown"
    if(!fs.existsSync(filePath) && !fs.existsSync(filePath)) {
        return Promise.resolve(mode)
    }
    try {
        const decryptedData = await Encryption.detectFileEncryption(filePath);
        if(decryptedData === null || decryptedData.length === 0) {
            return "Unknown";
        }
        JSON.parse(decryptedData).forEach((element: { [x: string]: any; type: string; }) => {
            if (element.type === 'Launcher') {
                mode = element[parameter]
                return Promise.resolve(element[parameter])
            }
            return Promise.resolve(mode)
        })
    } catch (error) {
        return Promise.resolve(mode)
    }
    return mode
}

export function handleIpc(connection) {
    connection.setEncoding('utf8')
    connection.on('data', (line) => {
        let args = line.split(' ')
        if (args[0] === 'checkIsDownloading') {
            connection.write('true')
        }
        connection.end()
    })
}

export function getInternalMac() {
    let internalMac: string = "";
    try {
        const networkInterfaces = os.networkInterfaces();

        // Assuming you want the MAC address of the first non-internal network interface
        for (const key in networkInterfaces) {
            const networkInterface = networkInterfaces[key];

            if (networkInterface == null) continue;

            for (const iface of networkInterface) {
                if (!iface.internal) {
                    internalMac = iface.mac;
                    break;
                }
            }
        }
    } catch (e) {
        console.log(e)
    }
    return internalMac
}

/**
 * Function to generate a unique ID for each object.
 * @param name
 */
export function generateUniqueId(name: string) {
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
export async function readObjects(filename: string): Promise<Array<AppEntry>> {
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
 * Function to write the objects to a JSON file
 */
export async function writeObjects (filename: string, jsonArray: Array<AppEntry>): Promise<string> {
    const success = await Encryption.encryptFile(JSON.stringify(jsonArray), filename);

    //Create the file and write the new application entry in
    if (success) {
        return 'Manifest file is updated successfully.';
    }

    return 'Manifest file was not updated.'
}
