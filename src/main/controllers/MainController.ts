import fs from "fs";
import path from "path";
import Encryption from "../encryption/Encryption";
import IpcMainEvent = Electron.IpcMainEvent;
import fetch from 'node-fetch';
import * as Sentry from "@sentry/electron";
import * as CONSTANT from "../assets/constants";
import ManifestController from "./ManifestController";
import ConfigController from "./ConfigController";
import DownloadController from "./DownloadController";
import VideoController from "./VideoController";
import { join, resolve } from "path";
import { exec, execSync, spawn, spawnSync } from "child_process";
import { findExecutableWithNameSetup } from "../util/Utilities";
import { taskSchedulerItem } from "../util/TaskScheduler";

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
    downloadController: DownloadController;
    videoController: VideoController;
    ipcMain: Electron.IpcMain;
    mainWindow: Electron.BrowserWindow;
    appDirectory: string;
    embeddedDirectory: string;
    toolDirectory: string;
    offlineHost: string = "http://localhost:8088"; //Changes if on NUC (localhost) or Station (NUC IP address)
    FIREBASE_BASE_URL: string = 'https://leadme-labs-default-rtdb.asia-southeast1.firebasedatabase.app/lab_remote_config/'

    constructor(ipcMain: Electron.IpcMain, mainWindow: Electron.BrowserWindow) {
        this.manifestController = new ManifestController(ipcMain, mainWindow);
        this.configController = new ConfigController(ipcMain, mainWindow);
        this.downloadController = new DownloadController(ipcMain, mainWindow, this.manifestController);
        this.videoController = new VideoController(ipcMain, mainWindow);
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
                    stream.write("" + this.downloadController.downloading)
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
                //Manifest functions
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

                //Config functions
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

                case "download_application":
                    void this.downloadController.downloadApplication(_event, info);
                    break;
                case "update_application":
                    void this.downloadController.updateApplication(_event, info);
                    break;

                // Video functions
                case "query_installed_videos":
                    void this.videoController.collectVideos();
                    break;
                case "import_video":
                case "move_video":
                    void this.videoController.moveVideo(info);
                    break;
                case "delete_video":
                    void this.videoController.deleteVideo(info);
                    break;

                //Scheduler functions
                case "schedule_application":
                    void taskSchedulerItem(this.mainWindow, info, this.appDirectory);
                    break;

                case "set_application_image":
                    void this.setApplicationImage(_event, info);
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
                case "stop_application":
                    void this.killAProcess(info.name, info.altPath, false);
                    break;
                case "electron_setup":
                    void this.setupElectronApplication(_event, info);
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
            await this.downloadController.updateApplication(_event, info);
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

            if (info.wrapperType === CONSTANT.APPLICATION_TYPE.APPLICATION_LEADME) {
                setTimeout(async () => {
                    try {
                        var fileName = `${new Date().toISOString().split("T")[0].replace(/-/g, "_")}_log`
                        var fileNameWithPath = `${process.env.APPDATA}\\leadme_apps\\${info.alias ?? info.name}\\_logs\\${fileName}`
                        var fileNameWithExtension = `${fileNameWithPath}.txt`
                        fs.readFile(fileNameWithExtension, async (err, data) => {
                            if (err) {
                                console.log('File reading error', err)
                                return
                            }
                            if (this.configController.config.length === 0) {
                                await this.configController.getApplicationConfig(null, info)
                            }
                            var deviceId = ""
                            var site = ""
                            if (this.configController.config.length > 0) {
                                var deviceIdEnv = this.configController.config.find(element => element.startsWith("StationId"))
                                if (deviceIdEnv) {
                                    deviceId = deviceIdEnv.split("=").length > 1 ? deviceIdEnv.split("=")[1] : ""
                                }
                                var siteEnv = this.configController.config.find(element => element.startsWith("LabLocation"))
                                if (siteEnv) {
                                    site = siteEnv.split("=").length > 1 ? siteEnv.split("=")[1] : ""
                                }
                            }
                            const response = await fetch("https://us-central1-leadme-labs.cloudfunctions.net/anonymousLogUpload", {
                                method: "POST",
                                body: data,
                                headers: {
                                    site,
                                    device: info.name + deviceId,
                                    fileName,
                                    "Content-Type": "text/plain"
                                }
                            })
                            console.log(response)
                        })
                    } catch (e) {
                        Sentry.captureException(e)
                    }
                }, 1000 * 60 * 2)
            }

            //Read any launch parameters that the manifest may have
            const params = await this.manifestController.getLaunchParameterValues(info.name);
            spawn(exePath, params, {
                detached: true
            });
        }
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
