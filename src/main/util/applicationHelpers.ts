// import fs from "fs";
// import { BrowserWindow } from "electron";
// import { join, resolve } from "path";
// import { download } from "electron-dl";
// import extract from "extract-zip";
// import { execFile, spawn } from "child_process";
//
// interface AppEntry {
//     type: string
//     id: string
//     name: string
// }
//
// module.exports = (ipcMain, mainWindow) => {
//     /**
//      * This function handles the downloading of a file from a given URL to a preset application folder. Periodically it will
//      * send the progress information back to the renderer for user feedback.
//      */
//     function downloadApplication(): void {
//         //This step downloads a file to a specified directory while updating progress on the rendered side.
//         ipcMain.on('download_application', (_event, info) => {
//             console.log(_event)
//             console.log(info)
//
//             //Need to back up from the main file that is being run
//             const directoryPath = join(__dirname, '../../../..', `leadme_apps/${info.name}`)
//             mainWindow.webContents.send('status_update', {
//                 name: info.name,
//                 message: `Initiating download: ${directoryPath}`
//             })
//
//             //Create the main directory to hold the application
//             fs.mkdirSync(directoryPath, {recursive: true})
//
//             //Override the incoming directory path
//             info.properties.directory = directoryPath;
//
//             //Maintain a trace on the download progress
//             info.properties.onProgress = (status): number => {
//                 console.log(status)
//                 return mainWindow.webContents.send('download_progress', status)
//             }
//
//             // @ts-ignore
//             download(BrowserWindow.getFocusedWindow(), info.url, info.properties).then((dl) => {
//                 mainWindow.webContents.send('status_update', {
//                     name: info.name,
//                     message: `Download complete, now extracting. ${dl.getSavePath()}`
//                 })
//
//                 //Unzip the project and add it to the local installation folder
//                 extract(dl.getSavePath(), {dir: directoryPath}).then(() => {
//                     mainWindow.webContents.send('status_update', {
//                         name: info.name,
//                         message: 'Extracting complete, cleaning up.'
//                     })
//
//                     //Delete the downloaded zip folder
//                     fs.rmSync(dl.getSavePath(), {recursive: true, force: true})
//                     mainWindow.webContents.send('status_update', {
//                         name: info.name,
//                         message: 'Clean up complete'
//                     })
//
//                     //Update the config.env file or the app manifest depending on the application
//                     if (info.name === 'Station' || info.name === 'NUC') {
//                         extraDownloadCriteria(info.name, directoryPath);
//                     } else {
//                         updateAppManifest(info.name);
//                     }
//                 })
//             })
//         })
//     }
//
//     /**
//      * There are extra download criteria associated with the Station and NUC software. This function handles the downloading
//      * and folder creation required for installation.
//      */
//     function extraDownloadCriteria(appName: string, directoryPath: string): void {
//         //If installing the Station or NUC software edit the .env file with the time created
//         fs.writeFile(join(directoryPath, '_config/config.env'), `TIME_CREATED=${new Date()}`, function (err) {
//             if (err) throw err;
//             console.log('Config file is updated successfully.');
//         });
//
//         if (appName !== 'Station') return;
//
//         downloadSetVol(directoryPath);
//     }
//
//     /**
//      * Download and extract the SetVol program into the ~/Station/external/SetVol location, if the location does not exist
//      * it will be created. After extraction the downloadSteamCMD is triggered.
//      * @param directoryPath A string representing the working directory of the LeadMeLauncher program.
//      */
//     function downloadSetVol(directoryPath: string) {
//         //Create a directory to hold the external applications of SetVol
//         const setVolDirectory = join(directoryPath, 'external', 'SetVol');
//         fs.mkdirSync(setVolDirectory, {recursive: true});
//
//         let setVolInfo = {
//             url: "http://localhost:8082/program-setvol",
//             properties: {
//                 directory: setVolDirectory
//             }
//         }
//
//         //Download/Extra/Clean up SetVol
//         // @ts-ignore
//         download(BrowserWindow.getFocusedWindow(), setVolInfo.url, setVolInfo.properties).then((dl) => {
//             extract(dl.getSavePath(), {dir: setVolDirectory}).then(() => {
//                 //Delete the downloaded zip folder
//                 fs.rmSync(dl.getSavePath(), {recursive: true, force: true})
//             });
//
//             mainWindow.webContents.send('status_update', {
//                 name: 'SetVol',
//                 message: 'SetVol installed successfully'
//             });
//
//             downloadSteamCMD(directoryPath);
//         });
//     }
//
//     /**
//      * Download and extract the SteamCMD program into the ~/Station/external/steamcmd location, if the location does not
//      * exist it will be created.
//      * @param directoryPath A string representing the working directory of the LeadMeLauncher program.
//      */
//     function downloadSteamCMD(directoryPath: string) {
//         //Create a directory to hold the external applications of SteamCMD
//         const steamCMDDirectory = join(directoryPath, 'external', 'steamcmd');
//         fs.mkdirSync(steamCMDDirectory, {recursive: true});
//
//         let steamCMDInfo = {
//             url: "http://localhost:8082/program-steamcmd",
//             properties: {
//                 directory: steamCMDDirectory
//             }
//         }
//
//         console.log(steamCMDInfo)
//         //Download/Extra/Clean up SteamCMD
//         // @ts-ignore
//         download(BrowserWindow.getFocusedWindow(), steamCMDInfo.url, steamCMDInfo.properties).then((dl) => {
//             extract(dl.getSavePath(), {dir: steamCMDDirectory}).then(() => {
//                 //Delete the downloaded zip folder
//                 fs.rmSync(dl.getSavePath(), {recursive: true, force: true})
//
//                 mainWindow.webContents.send('status_update', {
//                     name: 'SteamCMD',
//                     message: 'SteamCMD installed successfully'
//                 });
//
//                 //Find the local steam variables
//                 const config = join(__dirname, '../../../..', `leadme_apps/Station/_config/config.env`)
//
//                 //Read the file and remove any previous entries for the same item
//                 const data = fs.readFileSync(config, {encoding: 'utf-8'});
//
//                 let dataArray = data.split('\n'); // convert file data in an array
//
//                 const usernameKeyword = "SteamUserName"; // looking for a line that contains a key word in the file
//                 const steamUserName: string = dataArray.filter(line => !line.startsWith(usernameKeyword))[0];
//
//                 const passwordKeyword = "SteamPassword";
//                 const steamPassword: string = dataArray.filter(line => !line.startsWith(passwordKeyword))[0];
//
//
//                 if (steamUserName === null || steamPassword === null) {
//                     mainWindow.webContents.send('status_update', {
//                         name: 'SteamCMD',
//                         message: 'Steam password or Login not found in Station config.env'
//                     });
//                     return;
//                 }
//
//                 const args = `+force_install_dir \\"C:/Program Files (x86)/Steam\\" +login ${steamUserName} ${steamPassword}`;
//
//                 //Open SteamCMD for first time installation/update
//                 spawn(resolve(steamCMDDirectory, 'steamcmd.exe'), [args]);
//             });
//         });
//     }
//
//     /**
//      * Open up SteamCMD for the first time, installing and updating the components and passing the default Steam experience
//      * location and the login parameters, this will pause on the Steam Guard step.
//      */
//     function configureSteamCMD() {
//         ipcMain.on('config_steamcmd', (_event, info) => {
//             //The launcher directory path
//             const directoryPath = join(__dirname, '../../../..', `leadme_apps/Station`)
//
//             //Create a directory to hold the external applications of SteamCMD
//             const steamCMDDirectory = join(directoryPath, 'external', 'steamcmd');
//             fs.mkdirSync(steamCMDDirectory, {recursive: true});
//
//             //Find the local steam variables
//             const config = join(__dirname, '../../../..', `leadme_apps/Station/_config/config.env`);
//
//             //Read the file and remove any previous entries for the same item
//             const data = fs.readFileSync(config, {encoding: 'utf-8'});
//
//             let dataArray = data.split('\n'); // convert file data in an array
//
//             const usernameKeyword = "SteamUserName"; // looking for a line that contains a key word in the file
//             const steamUserName: string = dataArray.filter(line => !line.startsWith(usernameKeyword))[0];
//
//             const passwordKeyword = "SteamPassword";
//             const steamPassword: string = dataArray.filter(line => !line.startsWith(passwordKeyword))[0];
//
//
//             if (steamUserName === null || steamPassword === null) {
//                 mainWindow.webContents.send('status_update', {
//                     name: 'SteamCMD',
//                     message: 'Steam password or Login not found in Station config.env'
//                 });
//                 return;
//             }
//
//             const args = `+force_install_dir \\"C:/Program Files (x86)/Steam\\" +login ${steamUserName} ${steamPassword}`;
//
//             //Open SteamCMD for first time installation/update
//             spawn(resolve(steamCMDDirectory, 'steamcmd.exe'), [args]);
//         });
//     }
//
//     /**
//      * Update the local app manifest with the details of the newly installed application. This manifest is used by the
//      * Station software to see what Custom experiences are installed.
//      * @param appName
//      */
//     function updateAppManifest(appName: string) {
//         const filePath = join(__dirname, '../../../..', `leadme_apps/manifest.json`);
//
//         const apps: Array<AppEntry> = [];
//
//         //Create the application entry for the json
//         const appJSON: AppEntry = {
//             type: "Custom",
//             id: "",
//             name: appName
//         }
//
//         //Check if the file exists
//         const exists = fs.existsSync(filePath);
//
//         if (exists) {
//             //Check if the application exists
//             try {
//                 const data = fs.readFileSync(filePath);
//                 const jsonArray: Array<AppEntry> = JSON.parse(data.toString());
//
//                 console.log(jsonArray);
//
//                 //Assign the new id
//                 appJSON.id = String(jsonArray.length + 1);
//                 jsonArray.push(appJSON);
//
//                 //Create the file and write the new application entry in
//                 fs.writeFile(filePath, JSON.stringify(jsonArray), function (err) {
//                     if (err) throw err;
//
//                     mainWindow.webContents.send('status_update', {
//                         name: 'Manifest',
//                         message: 'Manifest file is updated successfully.'
//                     });
//                 });
//
//             } catch (err) {
//                 mainWindow.webContents.send('status_update', {
//                     name: 'Manifest',
//                     message: 'Manifest file is updated failed.'
//                 });
//             }
//
//             return;
//         }
//
//         //No apps exist yet can assign first ID
//         appJSON.id = "1";
//         apps.push(appJSON);
//
//         //Create the file and write the new application entry in
//         fs.writeFile(filePath, JSON.stringify(apps), function (err) {
//             if (err) throw err;
//
//             mainWindow.webContents.send('status_update', {
//                 name: 'Manifest',
//                 message: 'Manifest file is created successfully.'
//             });
//         });
//     }
//
//     /**
//      * On start up detect what Applications are currently installed on the local machine.
//      */
//     function installedApplications(): void {
//         ipcMain.on('installed_applications', (_event, info) => {
//             console.log(_event)
//             console.log(info)
//
//             //Get the application directory
//             const directoryPath = join(__dirname, '../../../..', `leadme_apps`)
//
//             //Hard coded for now
//             const installed = {
//                 'Station': fs.existsSync(`${directoryPath}/Station/station.exe`),
//                 'NUC': fs.existsSync(`${directoryPath}/NUC/nuc.exe`)
//             }
//
//             mainWindow.webContents.send('applications_installed', installed)
//         })
//     }
//
//     /**
//      * Launch a requested application.
//      */
//     function launchApplication(): void {
//         ipcMain.on('launch_application', (_event, info) => {
//             const exePath = join(__dirname, '../../../..', `leadme_apps/${info.name}/${info.name}.exe`)
//
//             execFile(exePath, function (err, data) {
//                 console.log(err)
//                 console.log(data.toString());
//             });
//         })
//     }
// }
