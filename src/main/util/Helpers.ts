import fs from "fs";
import xml2js from "xml2js";
import { join, resolve } from "path";
import { download } from "electron-dl";
import extract from "extract-zip";
import { exec, execFile, execSync } from "child_process";
import semver from "semver/preload";
import * as http from "http";
import * as https from "https";
import { app, BrowserWindow } from "electron"; //use for production hosting server

interface AppEntry {
    type: string
    id: string
    name: string
    autostart: boolean
}

/**
 * A class that initiates electron IPC controls that handle application downloads, extractions, configurations
 * and launching.
 */
export default class Helpers {
    ipcMain: Electron.IpcMain;
    mainWindow: Electron.BrowserWindow;
    appDirectory: string;

    constructor(ipcMain: Electron.IpcMain, mainWindow: Electron.BrowserWindow) {
        this.ipcMain = ipcMain;
        this.mainWindow = mainWindow;
        this.appDirectory = join(__dirname, '../../../../..', 'leadme_apps');
    }

    /**
     * Initiate all the helper functions, the functions each use a different IpcMain listener handle to respond to
     * different events that the frontend requires.
     */
    startup(): void {
        this.downloadApplication();
        this.configureSteamCMD();
        this.setManifestAutoStart();
        this.installedApplications();
        this.launchApplication();
        this.deleteApplication();
        this.configApplication();
        this.createTaskSchedulerItem();
    }

    /**
     * This function handles the downloading of a file from a given URL to a preset application folder. Periodically it will
     * send the progress information back to the renderer for user feedback.
     */
    downloadApplication(): void {
        //This step downloads a file to a specified directory while updating progress on the rendered side.
        this.ipcMain.on('download_application', (_event, info) => {
            //console.log(_event)
            console.log(info)

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
                console.log(status)
                this.mainWindow.webContents.send('download_progress', status)
            }

            // @ts-ignore
            download(BrowserWindow.getFocusedWindow(), info.url, info.properties).then((dl) => {
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
                        this.updateAppManifest(info.name, "LeadMe");
                        this.extraDownloadCriteria(info.name, directoryPath);
                    } else {
                        this.updateAppManifest(info.name, "Custom");
                    }
                })
            })
        })
    }

    /**
     * There are extra download criteria associated with the Station and NUC software. This function handles the downloading
     * and folder creation required for installation.
     */
    extraDownloadCriteria(appName: string, directoryPath: string): void {
        //If installing the Station or NUC software edit the .env file with the time created
        fs.writeFile(join(directoryPath, '_config/config.env'), `TIME_CREATED=${new Date()}`, function (err) {
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
            url: "http://localhost:8082/program-setvol",
            properties: {
                directory: setVolDirectory
            }
        }

        //Download/Extra/Clean up SetVol
        // @ts-ignore
        download(BrowserWindow.getFocusedWindow(), setVolInfo.url, setVolInfo.properties).then((dl) => {
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
            url: "http://localhost:8082/program-steamcmd",
            properties: {
                directory: steamCMDDirectory
            }
        }

        console.log(steamCMDInfo)
        //Download/Extra/Clean up SteamCMD
        // @ts-ignore
        download(BrowserWindow.getFocusedWindow(), steamCMDInfo.url, steamCMDInfo.properties).then((dl) => {
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
    configureSteamCMD() {
        this.ipcMain.on('config_steamcmd', (_event) => {
            //The launcher directory path
            const directoryPath = join(this.appDirectory, 'Station')

            //Create a directory to hold the external applications of SteamCMD
            const steamCMDDirectory = join(directoryPath, 'external', 'steamcmd');
            fs.mkdirSync(steamCMDDirectory, {recursive: true});

            //Find the local steam variables
            const config = join(this.appDirectory, 'Station/_config/config.env');

            //Read the file and remove any previous entries for the same item
            const data = fs.readFileSync(config, {encoding: 'utf-8'});

            let dataArray = data.split('\n'); // convert file data in an array

            // looking for a line that contains the Steam username and password, split the line to get the value.
            const usernameKeyword = "SteamUserName";
            const steamUserName: string = dataArray.filter(line => line.startsWith(usernameKeyword))[0].split("=")[1];

            const passwordKeyword = "SteamPassword";
            const steamPassword: string = dataArray.filter(line => line.startsWith(passwordKeyword))[0].split("=")[1];


            if (steamUserName === null || steamPassword === null) {
                this.mainWindow.webContents.send('status_update', {
                    name: 'SteamCMD',
                    message: 'Steam password or Login not found in Station config.env'
                });
                return;
            }

            //TODO this is create a 'program' folder - fix this...  I think?
            const args = ` +force_install_dir \\"C:/Program Files (x86)/Steam\\" +login ${steamUserName} ${steamPassword}`;

            //Open SteamCMD for first time installation/update
            exec("start cmd @cmd /k " + resolve(steamCMDDirectory, 'steamcmd.exe') + args);
        });
    }

    /**
     * Update the local app manifest with the details of the newly installed application. This manifest is used by the
     * Station software to see what Custom experiences are installed.
     * @param appName A string of the experience name being added.
     * @param type A string of the type of experience being added, i.e. Steam, Custom, Vive, etc.
     */
    updateAppManifest(appName: string, type: string): void {
        const filePath = join(this.appDirectory, 'manifest.json');

        //Create the application entry for the json
        const appJSON: AppEntry = {
            type: type,
            id: "",
            name: appName,
            autostart: false //default on installation
        }

        //Check if the file exists
        const exists = fs.existsSync(filePath);

        if (exists) {
            try {
                const data = fs.readFileSync(filePath);
                const jsonArray: Array<AppEntry> = JSON.parse(data.toString());

                //Check if the application exists?
                console.log(jsonArray);

                //Assign the new id
                appJSON.id = String(jsonArray.length + 1);
                jsonArray.push(appJSON);

                //Create the file and write the new application entry in
                fs.writeFile(filePath, JSON.stringify(jsonArray), (err) => {
                    if (err) throw err;

                    this.mainWindow.webContents.send('status_update', {
                        name: 'Manifest',
                        message: 'Manifest file is updated successfully.'
                    });
                });

            } catch (err) {
                this.mainWindow.webContents.send('status_update', {
                    name: 'Manifest',
                    message: 'Manifest file is updated failed.'
                });
            }

            return;
        }

        const apps: Array<AppEntry> = [];

        //No apps exist yet can assign first ID
        appJSON.id = "1";
        apps.push(appJSON);

        //Create the file and write the new application entry in
        fs.writeFile(filePath, JSON.stringify(apps), (err) => {
            if (err) throw err;

            this.mainWindow.webContents.send('status_update', {
                name: 'Manifest',
                message: 'Manifest file is created successfully.'
            });
        });
    }

    /**
     * Update an applications entry in the manifest file to indirect that it should autostart when the launcher is
     * opened.
     */
    setManifestAutoStart(): void {
        this.ipcMain.on("autostart_application", (_event, info) => {
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
                const data = fs.readFileSync(filePath);
                const jsonArray: Array<AppEntry> = JSON.parse(data.toString());

                //Check if the application exists
                console.log(jsonArray);

                //Find the application
                const entry: AppEntry | undefined = jsonArray.find(entry => entry.name === info.name);

                if(entry === undefined) {
                    this.mainWindow.webContents.send('status_update', {
                        name: info.name,
                        message: `${info.name} does not exist in the manifest.`
                    });
                    return;
                }

                //Update the entry
                entry.autostart = info.autostart;

                //Create the file and write the new application entry in
                fs.writeFile(filePath, JSON.stringify(jsonArray), (err) => {
                    if (err) throw err;

                    this.mainWindow.webContents.send('status_update', {
                        name: 'Manifest',
                        message: 'Manifest file is updated successfully.'
                    });
                });

            } catch (err) {
                this.mainWindow.webContents.send('status_update', {
                    name: 'Manifest',
                    message: 'Manifest file is updated failed.'
                });
            }
        });
    }

    /**
     * On start up detect what Applications are currently installed on the local machine.
     */
    installedApplications(): void {
        this.ipcMain.on('installed_applications', (_event) => {

            const filePath = join(this.appDirectory, 'manifest.json');

            //Check if the file exists
            const exists = fs.existsSync(filePath);

            //Search the local manifest for installed experiences
            if(exists) {
                try {
                    const data = fs.readFileSync(filePath);
                    const installed: Array<AppEntry> = JSON.parse(data.toString());

                    this.mainWindow.webContents.send('applications_installed', installed);
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

            this.mainWindow.webContents.send('applications_installed', []);
        });
    }

    /**
     * Delete an application, including all sub folders and saved data.
     */
    deleteApplication(): void {
        this.ipcMain.on('delete_application', (_event, info) => {
            const directoryPath = join(this.appDirectory, info.name)

            fs.rmSync(directoryPath, { recursive: true, force: true });

            this.removeFromAppManifest(info.name);

            this.mainWindow.webContents.send('status_update', {
                name: info.name,
                message: `${info.name} removed.`
            });
        })
    }

    /**
     * Remove an entry from the manifest, this may occur when an application has been deleted or moved.
     */
    removeFromAppManifest(appName: string): void {
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
            const data = fs.readFileSync(filePath);
            let jsonArray: Array<AppEntry> = JSON.parse(data.toString());

            //Check if the application exists
            console.log(jsonArray);

            //Remove the entry from the list
            jsonArray = jsonArray.filter(entry => entry.name !== appName)

            //Create the file and write the new application entry in
            fs.writeFile(filePath, JSON.stringify(jsonArray), (err) => {
                if (err) throw err;

                this.mainWindow.webContents.send('status_update', {
                    name: 'Manifest',
                    message: 'Manifest file is updated successfully.'
                });
            });

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
    launchApplication(): void {
        this.ipcMain.on('launch_application', async (_event, info) => {
            if(info.name == "Station" || info.name == "NUC") {
                await this.updateLeadMeApplication(info.name);
            }

            const exePath = join(this.appDirectory, `${info.name}/${info.name}.exe`)

            execFile(exePath, function (err, data) {
                console.log(err)
                console.log(data.toString());
            });
        })
    }

    /**
     * Check for an update for either the Station or NUC software, if there is one download and extract the update, do
     * not download files such as steamcmd or override config.env
     */
    async updateLeadMeApplication(appName: string): Promise<void> {
        const directoryPath = join(this.appDirectory, appName);

        let path;

        if(appName === "NUC") {
            path = "http://localhost:8082/program-nuc-version";
        } else if(appName === "Station") {
            path = "http://localhost:8082/program-station-version";
        } else {
            return;
        }

        const request_call = new Promise((resolve, reject) => {
            http.get(path, (response) => {
                let chunks_of_data = "";

                response.on('data', (chunk) => {
                    chunks_of_data += chunk;
                });

                response.on('end', () => {
                    let response_body = chunks_of_data.split(" ")[0];
                    // promise resolved on success
                    resolve(response_body.toString());
                });

                response.on('error', (error) => {
                    // promise rejected on error
                    reject(error);
                });
            });
        });

        //Online version number
        let onlineVersion: string = <string>await request_call;

        //Write out and then get the local version
        const args = ` writeversion`;

        try {
            execSync(resolve(directoryPath, `${appName}.exe`) + args);
        } catch (error) {
            // @ts-ignore
            console.log(error.toString());
        }

        const versionPath = join(this.appDirectory, `${appName}/_logs/version.txt`);

        if(!fs.existsSync(versionPath)) {
            console.log("Cannot find file path.");
        }
        const localVersion = fs.readFileSync(versionPath, 'utf8')

        //Compare the versions
        console.log("Online version: " + onlineVersion);
        console.log("Local version: " + localVersion);
        const difference = semver.diff(localVersion, onlineVersion)

        console.log("Difference: " + difference);

        if(difference == null) {
            return;
        }

        //Tell the user there is an update
        this.mainWindow.webContents.send('status_update', {
            name: appName,
            message: `${appName} requires an update. Update type ${difference}`
        });

        //Create the url path
        let baseUrl = path.replace("-version", "");

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
            download(BrowserWindow.getFocusedWindow(), info.url, info.properties).then((dl) => {
                this.mainWindow.webContents.send('status_update', {
                    name: appName,
                    message: `Download complete, now extracting. ${dl.getSavePath()}`
                })

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
                        message: 'Clean up complete'
                    })

                    resolve("Download Complete");
                }).catch(err => {
                    reject(err);
                })
            })
        });

        const result = await download_call;
        console.log(result);
    }

    /**
     * Update an env file that is associated with the Station or NUC applications. If there is a previous entry for a value
     * with the same key override that key/value pair.
     */
    configApplication(): void {
        this.ipcMain.on('config_application', (_event, info) => {
            const config = join(this.appDirectory, `${info.name}/_config/config.env`)

            //Read the file and remove any previous entries for the same item
            fs.readFile(config, {encoding: 'utf-8'}, function(err, data) {
                let dataArray = data.split('\n'); // convert file data in an array
                const searchKeyword = info.key; // looking for a line that contains a key word in the file

                // Delete all instances of the old key
                let newDataArray = dataArray.filter(line => !line.startsWith(searchKeyword))

                // Add the new key
                newDataArray.push(info.key + info.value)

                // UPDATE FILE WITH NEW DATA
                const updatedData = newDataArray.join('\n');
                fs.writeFile(config, updatedData, (err) => {
                    if (err) throw err;
                    console.log ('Successfully updated the file data');
                });
            });
        })
    }

    /**
     * Interacting with the windows task scheduler, create, pause or destroy a task that actively monitors that the
     * supplied application is running. The task runs on start up once a user is logged in and when there is an
     * internet connection and then every 5 minutes onwards.
     */
    createTaskSchedulerItem(): void {
        this.ipcMain.on('schedule_application', (_event, info) => {
            const taskFolder: string = "LeadMe\\Software_Checker";
            let args: string = "";

            //Check the type - list is the only function that does not require Admin privilege
            switch (info.type) {
                case "list":
                    args = `SCHTASKS /QUERY /TN ${taskFolder} /fo LIST`;
                    exec(`${args}`, (error, stdout, stderr) => {
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

            exec(`Start-Process cmd -Verb RunAs -ArgumentList '@cmd /k ${args}'`, {'shell':'powershell.exe'}, (error, stdout, stderr)=> {
                this.mainWindow.webContents.send('scheduler_update', {
                    message: stdout,
                    type: info.type
                });
            })
        });
    }

    /**
     * Modify the default software checker xml with the details necessary for either the NUC or Station software. As an
     * XML we can set far more than a command line interface and add different triggers and conditions.
     */
    modifyDefaultXML(taskFolder: string, appName: string, outputPath: string): void {
        const exePath = join(this.appDirectory, `${appName}/_batch/LeadMeLabs-SoftwareChecker.exe`)

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
}
