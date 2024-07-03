import fs from "fs";
import path, {join} from 'path';
import semver from "semver/preload";
import { app, BrowserWindow, net as electronNet, shell } from "electron";
import fetch from 'node-fetch';
import yaml from 'js-yaml';
import Encryption from "../encryption/Encryption";
import * as Sentry from "@sentry/electron";
import os from "os";
import { AppEntry } from "../interfaces/appEntry";

/**
 * Create a generic download window.
 * @param initialContent A string of content to display to the user.
 */
export function createDownloadWindow(initialContent: string): BrowserWindow {
    const downloadWindow = new BrowserWindow({
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
        return { action: 'deny' }
    });

    downloadWindow.loadFile(join(app.getAppPath(), 'static', 'download.html'));

    downloadWindow.webContents.on('did-finish-load', () => {
        downloadWindow.webContents.executeJavaScript(`
                const dynamicTextElement = document.getElementById('update-message');
                dynamicTextElement.innerText = '${initialContent}';`
        );
    });

    return downloadWindow;
}

/**
 * Check if an online resource is available.
 * @param url A string of the resource to check for.
 * @param timeout
 */
export async function checkFileAvailability(url: string, timeout: number): Promise<boolean> {
    const request_call = new Promise((resolve, reject) => {
        const request = electronNet.request(url);
        const timeoutId = setTimeout(() => {
            request.abort(); // Abort the request if it takes too long
            console.log(`Request timed out ${url}`);
            resolve(false);
        }, timeout);

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
 * Check the url for the latest.yml, extracting the current version of the tool.
 * @param url
 */
export async function checkForElectronVersion(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.log(`Failed to fetch ${url}: ${response.statusText}`);
            return "";
        }
        const text = await response.text();

        try {
            // Parse YAML text
            const data = yaml.load(text);

            // Extract URL
            const url = data.files[0].url;

            if (url != undefined) {
                return url;
            }
        } catch (error) {
            console.error("Error parsing YAML:", error);
        }
    } catch (error) {
        console.error(error);
    }

    return "";
}

/**
 * Check if just the Station is locally installed, if so get the NUC address that is set within
 * the config file, otherwise return localhost.
 */
export async function collectFeedURL(): Promise<string | null> {
    const stationConfig = join(process.env.APPDATA + '/leadme_apps', `Station/_config/config.env`);

    // NOTE: The Station cannot be installed using the offline launcher when it is running on the NUC. This is because
    //       it has no way of knowing the ip address of the NUC. The offline launcher can run on a Station and install
    //       a station 'locally' instead.

    // If there is no Station config we are updating the NUC software, bail out here
    if(!fs.existsSync(stationConfig)) {
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

    // Return as a last resort
    return "localhost";
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

/**
 * Function to search for the first executable with 'Setup' in the name.
 * @param directoryPath
 */
export async function findExecutableWithNameSetup(directoryPath: string) {
    return new Promise((resolve, reject) => {
        fs.readdir(directoryPath, (err, files) => {
            if (err) {
                reject(err);
                return;
            }

            const setupExecutable = files.find(file => {
                // Check if file name contains 'Setup' (case-insensitive) and ends with '.exe'
                return file.toLowerCase().includes('setup') && path.extname(file).toLowerCase() === '.exe';
            });

            resolve(setupExecutable);
        });
    });
}

/**
 * Function to search an executable of the supplied name in the supplied directory.
 * @param directoryPath
 * @param exeName
 */
export async function findExecutable(directoryPath: string, exeName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        fs.readdir(directoryPath, (err, files) => {
            if (err) {
                reject(err);
                return;
            }

            const setupExecutable = files.find(file => {
                // Check if file name contains 'Setup' (case-insensitive) and ends with '.exe'
                return file.toLowerCase().includes(exeName) && path.extname(file).toLowerCase() === '.exe';
            });

            resolve(setupExecutable != undefined);
        });
    });
}

/**
 * Generates the version URL based on the provided details object.
 * @param details Object containing host, name and wrapperType information.
 * @param isVersionUrl A boolean of whether to get the version url (true) or the download url (false).
 * @returns The version URL if it can be generated, otherwise an empty string.
 */
export function generateURL(details: any, isVersionUrl: boolean): string {
    let host: string;
    if (details.host.includes("vultrobjects")) {
        host = "vultr";
    } else if (details.host.includes("herokuapp")) {
        host = "heroku";
    } else if (details.host.includes("localhost")) {
        host = "localhost";
    } else {
        return "";
    }

    switch (details.wrapperType) {
        case "leadme":
            if (host === "heroku") {
                return `${details.host}/program-${details.name.toLowerCase()}${isVersionUrl ? '-version' : ''}`;
            } else {
                return generateMostRecentDotnetUrl(details, isVersionUrl);
            }

        case "embedded":
            return `${details.host}${isVersionUrl ? 'version' : 'application.zip'}`;

        case "tool":
            return `${details.host}/latest.yml`;

        default:
            return "";
    }
}

/**
 * Check the local dotnet version to determine what Vultr URL to generate.
 *
 * NOTE: dotnet 8.0 is backwards compatible with 6.0, so a WPF project targeting net6.0-windows will work on dotnet 8.0
 * however targeting net8.0-windows will not work on a computer with only dotnet 6.0 installed.
 * @param details
 * @param isVersionUrl
 */
function generateMostRecentDotnetUrl(details: any, isVersionUrl: boolean): string {
    //Check the most recent dotnet version
    let dotnet = getMostRecentRuntimeMajorVersion();

    //determine the major version number
    switch (dotnet) {
        case "8":
            //add the extra sub folder
            return `${details.host}net8.0-windows/${details.name}/${isVersionUrl ? 'version' : (details.name + '.zip')}`;

        case "6":
        case "":
        default:
            return `${details.host}${details.name}/${isVersionUrl ? 'version' : (details.name + '.zip')}`;
    }
}

/**
 * Retrieves the major version number of the most recent .NET runtime version.
 * The function checks for the existence of runtime directories, reads their contents
 * to find valid version numbers, and determines the most recent version.
 *
 * It currently only checks the path for Microsoft Windows Desktop runtime:
 * 'C:\\Program Files\\dotnet\\shared\\Microsoft.WindowsDesktop.App'
 *
 * The major version number of the most recent runtime version is returned. If no
 * valid versions are found, an empty string is returned.
 *
 * @returns string The major version number of the most recent .NET runtime
 *                 version, or an empty string if no valid versions are found.
 *
 * @example
 * // Assuming the most recent version is 6.1.2
 * console.log(getMostRecentRuntimeMajorVersion()); // Output: '6'
 */
function getMostRecentRuntimeMajorVersion(): string {
    // Paths to check for runtime versions
    const runtimePaths = [
        // 'C:\\Program Files\\dotnet\\shared\\Microsoft.NETCore.App',
        // 'C:\\Program Files\\dotnet\\shared\\Microsoft.AspNetCore.App',
        'C:\\Program Files\\dotnet\\shared\\Microsoft.WindowsDesktop.App' // only require this one
    ];

    let mostRecentVersion: string|null = null;

    for (const dirPath of runtimePaths) {
        if (!fs.existsSync(dirPath)) continue;

        // Read the directory contents, filter valid versions, and sort in descending order
        const versions = fs.readdirSync(dirPath)
            .filter(version => semver.valid(version))
            .sort((a, b) => semver.rcompare(a, b));

        if (versions.length === 0) continue;

        const latestVersion = versions[0];

        if (!mostRecentVersion || semver.gt(latestVersion, mostRecentVersion)) {
            mostRecentVersion = latestVersion;
        }
    }

    return mostRecentVersion ? semver.major(mostRecentVersion).toString() : '';
}
